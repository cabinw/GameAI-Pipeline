import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv, { type ValidateFunction } from "ajv";

import {
  SemanticEventErrorCode,
  sortSemanticEventDiagnostics,
  type SemanticEventDiagnostic,
  type SemanticEventResult,
} from "./diagnostics";
import type {
  CharacterSemanticEventContract,
  SemanticEventValidationContext,
} from "./types";
import {
  mapSchemaErrors,
  validateCharacterSemanticEvents,
} from "./validator";

const localSchema = resolve(
  __dirname,
  "schemas/character-semantic-events.schema.json",
);
const builtSchema = resolve(
  __dirname,
  "../../dist/schemas/character-semantic-events.schema.json",
);

export const characterSemanticEventsSchema = JSON.parse(
  readFileSync(existsSync(localSchema) ? localSchema : builtSchema, "utf8"),
) as Record<string, unknown>;

const ajv = new Ajv({ allErrors: true, strict: true });
const validateShape = ajv.compile<CharacterSemanticEventContract>(
  characterSemanticEventsSchema,
) as ValidateFunction<CharacterSemanticEventContract>;

const validationContextSchema = {
  type: "object",
  additionalProperties: false,
  required: ["clips", "rigLayout"],
  properties: {
    clips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clipId", "durationSeconds"],
        properties: {
          clipId: { type: "string", minLength: 1 },
          durationSeconds: { type: "number", exclusiveMinimum: 0 },
        },
      },
    },
    rigLayout: {
      type: "object",
      required: ["layoutId", "schemaVersion"],
      properties: {
        layoutId: { type: "string", minLength: 1 },
        schemaVersion: { type: "string", minLength: 1 },
        sockets: {
          type: "array",
          items: {
            type: "object",
            required: ["socketId", "parentPartId"],
            properties: {
              socketId: { type: "string", minLength: 1 },
              parentPartId: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
} as const;

const validateContext = ajv.compile<SemanticEventValidationContext>(
  validationContextSchema,
) as ValidateFunction<SemanticEventValidationContext>;

function contextSchemaErrors(): SemanticEventDiagnostic[] {
  return sortSemanticEventDiagnostics(
    (validateContext.errors ?? []).map((error) => ({
      code: SemanticEventErrorCode.SCHEMA_VALIDATION_ERROR,
      path: `/context${error.instancePath}`,
      message: `Semantic-event validation context ${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
      details: { keyword: error.keyword, params: error.params },
    })),
  );
}

export function validateCharacterSemanticEventInput(
  value: unknown,
  context: unknown,
): SemanticEventResult<CharacterSemanticEventContract> {
  if (!validateShape(value)) {
    return { ok: false, errors: mapSchemaErrors(validateShape.errors) };
  }
  if (!validateContext(context)) {
    return { ok: false, errors: contextSchemaErrors() };
  }
  const errors = validateCharacterSemanticEvents(value, context);
  return errors.length === 0
    ? { ok: true, value, errors: [] }
    : { ok: false, errors };
}

export function parseCharacterSemanticEvents(
  text: string,
  context: unknown,
): SemanticEventResult<CharacterSemanticEventContract> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: SemanticEventErrorCode.JSON_PARSE_ERROR,
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return validateCharacterSemanticEventInput(value, context);
}

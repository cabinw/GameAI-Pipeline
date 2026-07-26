import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv, { type ValidateFunction } from "ajv";

import {
  SemanticEventErrorCode,
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

export function parseCharacterSemanticEvents(
  text: string,
  context: SemanticEventValidationContext,
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
  if (!validateShape(value)) {
    return { ok: false, errors: mapSchemaErrors(validateShape.errors) };
  }
  const errors = validateCharacterSemanticEvents(value, context);
  return errors.length === 0
    ? { ok: true, value, errors: [] }
    : { ok: false, errors };
}

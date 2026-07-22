import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

import {
  ValidationErrorCode,
  sortIssues,
  type ContractDocument,
  type ValidationIssue,
  type ValidationResult,
} from "./errors";
import { characterRigSchema, rigLayoutSchema } from "./schema-loader";
import {
  validateCharacterContractSemantics,
  validateCharacterRigSemantics,
  validateRigLayoutSemantics,
} from "./semantic-validator";
import type { CharacterContract, CharacterRig, RigLayout } from "./types";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateCharacterRigShape = ajv.compile<CharacterRig>(characterRigSchema);
const validateRigLayoutShape = ajv.compile<RigLayout>(rigLayoutSchema);

function parseJson(text: string, document: ContractDocument): ValidationResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown, errors: [] };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: ValidationErrorCode.JSON_PARSE_ERROR,
          document,
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
}

function errorPath(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missingProperty = String(error.params.missingProperty);
    return `${error.instancePath}/${missingProperty}`;
  }
  if (error.keyword === "additionalProperties") {
    const additionalProperty = String(error.params.additionalProperty);
    return `${error.instancePath}/${additionalProperty}`;
  }
  return error.instancePath;
}

function schemaErrorCode(path: string): ValidationIssue["code"] {
  if (path.includes("/anchor/")) {
    return ValidationErrorCode.INVALID_NORMALIZED_ANCHOR;
  }
  if (
    path.includes("/originalRect/") ||
    path.includes("/trimOffset/") ||
    path.includes("/sourceCanvas/") ||
    path.includes("/shape/width") ||
    path.includes("/shape/height") ||
    path.includes("/shape/radius")
  ) {
    return ValidationErrorCode.INVALID_RECTANGLE;
  }
  if (path.endsWith("/file") || path.endsWith("/rigLayoutFile")) {
    return ValidationErrorCode.INVALID_FILE_PATH;
  }
  return ValidationErrorCode.SCHEMA_VALIDATION_ERROR;
}

function mapSchemaErrors(
  errors: readonly ErrorObject[] | null | undefined,
  document: Exclude<ContractDocument, "contract">,
): ValidationIssue[] {
  return sortIssues(
    (errors ?? []).map((error) => {
      const path = errorPath(error);
      return {
        code: schemaErrorCode(path),
        document,
        path,
        message: `Schema ${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
        details: { keyword: error.keyword, params: error.params },
      };
    }),
  );
}

function validateShape<T>(
  value: unknown,
  validator: ValidateFunction<T>,
  document: Exclude<ContractDocument, "contract">,
): ValidationResult<T> {
  if (!validator(value)) {
    return { ok: false, errors: mapSchemaErrors(validator.errors, document) };
  }
  return { ok: true, value, errors: [] };
}

export function parseCharacterRig(text: string): ValidationResult<CharacterRig> {
  const parsed = parseJson(text, "characterRig");
  if (!parsed.ok) {
    return parsed;
  }

  const shaped = validateShape(parsed.value, validateCharacterRigShape, "characterRig");
  if (!shaped.ok) {
    return shaped;
  }

  const errors = validateCharacterRigSemantics(shaped.value);
  return errors.length === 0
    ? { ok: true, value: shaped.value, errors: [] }
    : { ok: false, errors };
}

export function parseRigLayout(text: string): ValidationResult<RigLayout> {
  const parsed = parseJson(text, "rigLayout");
  if (!parsed.ok) {
    return parsed;
  }

  const shaped = validateShape(parsed.value, validateRigLayoutShape, "rigLayout");
  if (!shaped.ok) {
    return shaped;
  }

  const errors = validateRigLayoutSemantics(shaped.value);
  return errors.length === 0
    ? { ok: true, value: shaped.value, errors: [] }
    : { ok: false, errors };
}

export function parseCharacterContract(
  characterRigText: string,
  rigLayoutText: string,
): ValidationResult<CharacterContract> {
  const characterRig = parseCharacterRig(characterRigText);
  const rigLayout = parseRigLayout(rigLayoutText);

  if (!characterRig.ok || !rigLayout.ok) {
    return {
      ok: false,
      errors: sortIssues([
        ...(characterRig.ok ? [] : characterRig.errors),
        ...(rigLayout.ok ? [] : rigLayout.errors),
      ]),
    };
  }

  const errors = validateCharacterContractSemantics(characterRig.value, rigLayout.value);
  return errors.length === 0
    ? {
        ok: true,
        value: { characterRig: characterRig.value, rigLayout: rigLayout.value },
        errors: [],
      }
    : { ok: false, errors };
}

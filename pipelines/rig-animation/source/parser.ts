import Ajv, { type ValidateFunction } from "ajv";

import {
  RigAnimationErrorCode,
  type RigAnimationResult,
} from "./diagnostics";
import { rigAnimationSchema } from "./schema";
import type {
  RigAnimation,
  RigAnimationValidationContext,
} from "./types";
import {
  mapSchemaErrors,
  validateRigAnimationSemantics,
} from "./validator";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateShape =
  ajv.compile<RigAnimation>(rigAnimationSchema) as ValidateFunction<RigAnimation>;

export function parseRigAnimation(
  text: string,
  context?: RigAnimationValidationContext,
): RigAnimationResult<RigAnimation> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: RigAnimationErrorCode.JSON_PARSE_ERROR,
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  if (!validateShape(value)) {
    return { ok: false, errors: mapSchemaErrors(validateShape.errors) };
  }
  const errors = validateRigAnimationSemantics(value, context);
  return errors.length === 0
    ? { ok: true, value, errors: [] }
    : { ok: false, errors };
}

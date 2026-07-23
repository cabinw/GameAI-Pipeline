import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

import { RigLayoutDiagnosticCode, type RigLayoutDiagnostic } from "./diagnostics";
import { skeletonTemplateSchema, sourceCanvasAnnotationSchema } from "./schema-loader";
import type { SkeletonTemplate, SourceCanvasAnnotation } from "./types";

const ajv = new Ajv({ allErrors: true, strict: true });
const validateAnnotation = ajv.compile<SourceCanvasAnnotation>(sourceCanvasAnnotationSchema);
const validateTemplate = ajv.compile<SkeletonTemplate>(skeletonTemplateSchema);

export type ParseGeneratorContractResult<T> =
  | { ok: true; value: T; diagnostics: readonly [] }
  | { ok: false; diagnostics: readonly RigLayoutDiagnostic[] };

function errorPath(error: ErrorObject): string {
  if (error.keyword === "required") {
    return `${error.instancePath}/${String(error.params.missingProperty)}`;
  }
  return error.instancePath;
}

function parseContract<T>(
  value: unknown,
  validator: ValidateFunction<T>,
  code: RigLayoutDiagnostic["code"],
): ParseGeneratorContractResult<T> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch (error) {
      return {
        ok: false,
        diagnostics: [{
          code,
          severity: "error",
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        }],
      };
    }
  }
  if (!validator(value)) {
    return {
      ok: false,
      diagnostics: (validator.errors ?? []).map((error) => ({
        code,
        severity: "error",
        path: errorPath(error),
        message: `Schema ${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
        details: { keyword: error.keyword, params: error.params },
      })),
    };
  }
  return { ok: true, value, diagnostics: [] };
}

export function parseSourceCanvasAnnotation(
  value: unknown,
): ParseGeneratorContractResult<SourceCanvasAnnotation> {
  return parseContract(
    value,
    validateAnnotation,
    RigLayoutDiagnosticCode.ANNOTATION_SCHEMA_INVALID,
  );
}

export function parseSkeletonTemplate(
  value: unknown,
): ParseGeneratorContractResult<SkeletonTemplate> {
  return parseContract(value, validateTemplate, RigLayoutDiagnosticCode.TEMPLATE_SCHEMA_INVALID);
}

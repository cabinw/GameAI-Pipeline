import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";

import { sortReviewDiagnostics } from "./diagnostics";
import { validateAnimationReviewDocument } from "./parser";
import {
  animationReviewPatchSchema,
  animationReviewSessionSchema,
  animationReviewValidationSchema,
  animationReviewDiagnosisSchema,
} from "./schema";
import {
  ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION,
  ANIMATION_REVIEW_PATCH_SCHEMA_VERSION,
  ANIMATION_REVIEW_SESSION_LIMITS,
  ANIMATION_REVIEW_SESSION_SCHEMA_VERSION,
  ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION,
  type AnimationReviewDiagnosis,
  type AnimationReviewPatchDocument,
  type AnimationReviewSessionDocument,
  type AnimationReviewValidationResult,
  type ParseAnimationReviewDiagnosisResult,
  type ParseAnimationReviewPatchResult,
  type ParseAnimationReviewSessionResult,
  type ParseAnimationReviewValidationResult,
} from "./session-types";
import type { AnimationReviewDiagnostic } from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePatchShape = ajv.compile<AnimationReviewPatchDocument>(
  animationReviewPatchSchema,
) as ValidateFunction<AnimationReviewPatchDocument>;
const validateSessionShape = ajv.compile<AnimationReviewSessionDocument>(
  animationReviewSessionSchema,
) as ValidateFunction<AnimationReviewSessionDocument>;
const validateValidationShape = ajv.compile<AnimationReviewValidationResult>(
  animationReviewValidationSchema,
) as ValidateFunction<AnimationReviewValidationResult>;
const validateDiagnosisShape = ajv.compile<AnimationReviewDiagnosis>(
  animationReviewDiagnosisSchema,
) as ValidateFunction<AnimationReviewDiagnosis>;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function schemaDiagnostics(
  code:
    | "PATCH_SCHEMA_VALIDATION_ERROR"
    | "SESSION_SCHEMA_VALIDATION_ERROR"
    | "VALIDATION_SCHEMA_VALIDATION_ERROR"
    | "DIAGNOSIS_SCHEMA_VALIDATION_ERROR",
  errors: readonly ErrorObject[] | null | undefined,
): readonly AnimationReviewDiagnostic[] {
  return sortReviewDiagnostics(
    (errors ?? []).map((error) => ({
      code,
      path: error.instancePath,
      message: `${error.keyword} validation failed${
        error.message === undefined ? "." : `: ${error.message}.`
      }`,
    })),
  );
}

export function validateAnimationReviewPatch(
  value: unknown,
): ParseAnimationReviewPatchResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !==
      ANIMATION_REVIEW_PATCH_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "PATCH_UNSUPPORTED_SCHEMA_VERSION",
          path: "/schemaVersion",
          message: `Only Animation Review Patch ${ANIMATION_REVIEW_PATCH_SCHEMA_VERSION} is supported.`,
        },
      ],
    };
  }
  if (!validatePatchShape(value)) {
    return {
      ok: false,
      diagnostics: schemaDiagnostics(
        "PATCH_SCHEMA_VALIDATION_ERROR",
        validatePatchShape.errors,
      ),
    };
  }
  return { ok: true, value: deepFreeze(value), diagnostics: [] };
}

export function parseAnimationReviewPatch(
  text: string,
): ParseAnimationReviewPatchResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "PATCH_JSON_PARSE_ERROR",
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return validateAnimationReviewPatch(value);
}

export function validateAnimationReviewValidation(
  value: unknown,
): ParseAnimationReviewValidationResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !==
      ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [{
        code: "VALIDATION_UNSUPPORTED_SCHEMA_VERSION",
        path: "/schemaVersion",
        message: `Only Animation Review Validation ${ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION} is supported.`,
      }],
    };
  }
  if (!validateValidationShape(value)) {
    return {
      ok: false,
      diagnostics: schemaDiagnostics(
        "VALIDATION_SCHEMA_VALIDATION_ERROR",
        validateValidationShape.errors,
      ),
    };
  }
  const hasDecision = value.decidedBy !== undefined || value.decidedAt !== undefined;
  if (
    (value.decidedBy === undefined) !== (value.decidedAt === undefined) ||
    (value.status === "unresolved" && hasDecision)
  ) {
    return {
      ok: false,
      diagnostics: [{
        code: "VALIDATION_TRANSITION_INVALID",
        path: "",
        message: "Validation decision provenance is inconsistent with its status.",
      }],
    };
  }
  return { ok: true, value: deepFreeze(value), diagnostics: [] };
}

export function parseAnimationReviewValidation(
  text: string,
): ParseAnimationReviewValidationResult {
  try {
    return validateAnimationReviewValidation(JSON.parse(text) as unknown);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [{
        code: "VALIDATION_JSON_PARSE_ERROR",
        path: "",
        message: error instanceof Error ? error.message : "Invalid JSON.",
      }],
    };
  }
}

export function validateAnimationReviewDiagnosis(
  value: unknown,
): ParseAnimationReviewDiagnosisResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !==
      ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [{
        code: "DIAGNOSIS_UNSUPPORTED_SCHEMA_VERSION",
        path: "/schemaVersion",
        message: `Only Animation Review Diagnosis ${ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION} is supported.`,
      }],
    };
  }
  if (!validateDiagnosisShape(value)) {
    return {
      ok: false,
      diagnostics: schemaDiagnostics(
        "DIAGNOSIS_SCHEMA_VALIDATION_ERROR",
        validateDiagnosisShape.errors,
      ),
    };
  }
  if (
    value.timeRange !== undefined &&
    value.timeRange.end < value.timeRange.start
  ) {
    return {
      ok: false,
      diagnostics: [{
        code: "DIAGNOSIS_SCHEMA_VALIDATION_ERROR",
        path: "/timeRange",
        message: "Diagnosis timeRange end cannot precede start.",
      }],
    };
  }
  return { ok: true, value: deepFreeze(value), diagnostics: [] };
}

export function parseAnimationReviewDiagnosis(
  text: string,
): ParseAnimationReviewDiagnosisResult {
  try {
    return validateAnimationReviewDiagnosis(JSON.parse(text) as unknown);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [{
        code: "DIAGNOSIS_JSON_PARSE_ERROR",
        path: "",
        message: error instanceof Error ? error.message : "Invalid JSON.",
      }],
    };
  }
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found].sort();
}

function documentDiagnostics(
  document: AnimationReviewSessionDocument,
): readonly AnimationReviewDiagnostic[] {
  const diagnostics: AnimationReviewDiagnostic[] = [];
  const reviewValues = [
    { path: "/review", value: document.review },
    ...document.history.flatMap((entry, index) => [
      { path: `/history/${index}/beforeReview`, value: entry.beforeReview },
      { path: `/history/${index}/afterReview`, value: entry.afterReview },
    ]),
  ];
  for (const review of reviewValues) {
    const parsed = validateAnimationReviewDocument(review.value);
    if (!parsed.ok) {
      diagnostics.push(
        ...parsed.diagnostics.map((diagnostic) => ({
          code: "SESSION_SEMANTIC_VALIDATION_ERROR" as const,
          path: `${review.path}${diagnostic.path ?? ""}`,
          message: diagnostic.message,
        })),
      );
    }
  }
  for (const [index, patch] of document.patches.entries()) {
    const parsed = validateAnimationReviewPatch(patch);
    if (!parsed.ok) {
      diagnostics.push(
        ...parsed.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          path: `/patches/${index}${diagnostic.path ?? ""}`,
          message: diagnostic.message,
        })),
      );
    }
  }
  for (const patchId of duplicates(document.patches.map((patch) => patch.patchId))) {
    diagnostics.push({
      code: "PATCH_DUPLICATE_ID",
      path: "/patches",
      message: `Patch ID ${patchId} occurs more than once.`,
    });
  }
  for (const [index, validation] of document.validation.entries()) {
    const parsed = validateAnimationReviewValidation(validation);
    if (!parsed.ok) {
      diagnostics.push(
        ...parsed.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          path: `/validation/${index}${diagnostic.path ?? ""}`,
          message: diagnostic.message,
        })),
      );
    }
  }
  for (const [index, diagnosis] of document.diagnoses.entries()) {
    const parsed = validateAnimationReviewDiagnosis(diagnosis);
    if (!parsed.ok) {
      diagnostics.push(
        ...parsed.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          path: `/diagnoses/${index}${diagnostic.path ?? ""}`,
          message: diagnostic.message,
        })),
      );
    }
  }
  const patchById = new Map(
    document.patches.map((patch) => [patch.patchId, patch]),
  );
  if (document.historyCursor > document.history.length) {
    diagnostics.push({
      code: "PATCH_HISTORY_INVALID",
      path: "/historyCursor",
      message: "History cursor cannot exceed the history length.",
    });
  }
  for (const [index, entry] of document.history.entries()) {
    if (!patchById.has(entry.patchId)) {
      diagnostics.push({
        code: "PATCH_HISTORY_INVALID",
        path: `/history/${index}/patchId`,
        message: `History references unknown patch ${entry.patchId}.`,
      });
    }
  }
  if (document.preview !== null) {
    const patch = patchById.get(document.preview.patchId);
    if (patch?.status !== "PREVIEWED") {
      diagnostics.push({
        code: "PATCH_HISTORY_INVALID",
        path: "/preview/patchId",
        message: "Preview must reference the unique PREVIEWED patch.",
      });
    }
  }
  for (const patch of document.patches) {
    if (
      patch.expectedRevision > document.revision ||
      (patch.status === "AI_PROPOSED" && patch.source !== "ai")
    ) {
      diagnostics.push({
        code: "SESSION_SEMANTIC_VALIDATION_ERROR",
        path: `/patches/${patch.patchId}`,
        message: "Patch revision/source semantics are invalid.",
      });
    }
  }
  const states = [
    document.sourceState,
    document.authoritativeState,
    ...(document.preview === null ? [] : [document.preview.state]),
    ...document.history.flatMap((entry) => [
      entry.beforeState,
      entry.afterState,
    ]),
  ];
  for (const [index, state] of states.entries()) {
    if (
      state.animation.rigId !== document.rigId ||
      state.animation.animationId !== document.sourceState.animation.animationId ||
      duplicates(state.parts.map((part) => part.partId)).length > 0 ||
      state.parts.length > ANIMATION_REVIEW_SESSION_LIMITS.maxParts
    ) {
      diagnostics.push({
        code: "SESSION_SEMANTIC_VALIDATION_ERROR",
        path: `/state/${index}`,
        message: "Editable state identity or presentation parts are invalid.",
      });
    }
  }
  for (const revision of document.auditTrail.map((entry) => entry.revision)) {
    if (revision > document.revision) {
      diagnostics.push({
        code: "SESSION_REVISION_INVALID",
        path: "/auditTrail",
        message: "Audit revisions cannot exceed the Session revision.",
      });
      break;
    }
  }
  for (const ruleId of duplicates(document.validation.map((rule) => rule.ruleId))) {
    diagnostics.push({
      code: "SESSION_SEMANTIC_VALIDATION_ERROR",
      path: "/validation",
      message: `Validation rule ID ${ruleId} occurs more than once.`,
    });
  }
  const findingIds = new Set(document.review.findings.map((finding) => finding.findingId));
  for (const [index, diagnosis] of document.diagnoses.entries()) {
    if (!findingIds.has(diagnosis.findingId)) {
      diagnostics.push({
        code: "SESSION_SEMANTIC_VALIDATION_ERROR",
        path: `/diagnoses/${index}/findingId`,
        message: `Diagnosis references unknown finding ${diagnosis.findingId}.`,
      });
    }
  }
  return sortReviewDiagnostics(diagnostics);
}

export function validateAnimationReviewSession(
  value: unknown,
): ParseAnimationReviewSessionResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !==
      ANIMATION_REVIEW_SESSION_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "SESSION_UNSUPPORTED_SCHEMA_VERSION",
          path: "/schemaVersion",
          message: `Only Animation Review Session ${ANIMATION_REVIEW_SESSION_SCHEMA_VERSION} is supported.`,
        },
      ],
    };
  }
  if (!validateSessionShape(value)) {
    return {
      ok: false,
      diagnostics: schemaDiagnostics(
        "SESSION_SCHEMA_VALIDATION_ERROR",
        validateSessionShape.errors,
      ),
    };
  }
  const serialized = JSON.stringify(value);
  if (
    serialized.length >
    ANIMATION_REVIEW_SESSION_LIMITS.maxSerializedCharacters
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "SESSION_BUDGET_EXCEEDED",
          path: "",
          message: "Serialized Session exceeds the configured character budget.",
        },
      ],
    };
  }
  const diagnostics = documentDiagnostics(value);
  return diagnostics.length === 0
    ? { ok: true, value: deepFreeze(value), diagnostics: [] }
    : { ok: false, diagnostics };
}

export function parseAnimationReviewSession(
  text: string,
): ParseAnimationReviewSessionResult {
  if (
    text.length >
    ANIMATION_REVIEW_SESSION_LIMITS.maxSerializedCharacters
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "SESSION_BUDGET_EXCEEDED",
          path: "",
          message: "Serialized Session exceeds the configured character budget.",
        },
      ],
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "SESSION_JSON_PARSE_ERROR",
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return validateAnimationReviewSession(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function serializeValidated<T>(
  value: T,
  validate: (value: unknown) =>
    | { readonly ok: true }
    | { readonly ok: false; readonly diagnostics: readonly AnimationReviewDiagnostic[] },
): string {
  const parsed = validate(value);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0]!;
    throw new Error(`${diagnostic.code}: ${diagnostic.message}`);
  }
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function serializeAnimationReviewPatch(
  document: AnimationReviewPatchDocument,
): string {
  return serializeValidated(document, validateAnimationReviewPatch);
}

export function serializeAnimationReviewValidation(
  document: AnimationReviewValidationResult,
): string {
  return serializeValidated(document, validateAnimationReviewValidation);
}

export function serializeAnimationReviewDiagnosis(
  document: AnimationReviewDiagnosis,
): string {
  return serializeValidated(document, validateAnimationReviewDiagnosis);
}

export function serializeAnimationReviewSession(
  document: AnimationReviewSessionDocument,
): string {
  const parsed = validateAnimationReviewSession(document);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0]!;
    throw new Error(`${diagnostic.code}: ${diagnostic.message}`);
  }
  const serialized = `${JSON.stringify(canonicalize(document), null, 2)}\n`;
  if (
    serialized.length >
    ANIMATION_REVIEW_SESSION_LIMITS.maxSerializedCharacters
  ) {
    throw new Error("SESSION_BUDGET_EXCEEDED: serialized Session is too large.");
  }
  return serialized;
}

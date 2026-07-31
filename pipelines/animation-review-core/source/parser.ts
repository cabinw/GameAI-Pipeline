import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";

import { sortReviewDiagnostics } from "./diagnostics";
import { animationReviewSchema } from "./schema";
import {
  ANIMATION_REVIEW_SCHEMA_VERSION,
  type AnimationReviewDiagnostic,
  type AnimationReviewDocument,
  type ParseAnimationReviewResult,
} from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile<AnimationReviewDocument>(
  animationReviewSchema,
) as ValidateFunction<AnimationReviewDocument>;

function mapSchemaErrors(
  errors: readonly ErrorObject[] | null | undefined,
): readonly AnimationReviewDiagnostic[] {
  return sortReviewDiagnostics(
    (errors ?? []).map((error) => ({
      code: "REVIEW_SCHEMA_VALIDATION_ERROR",
      path: error.instancePath,
      message: `${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
    })),
  );
}

function duplicateIds(
  values: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function semanticDiagnostics(
  document: AnimationReviewDocument,
): readonly AnimationReviewDiagnostic[] {
  const diagnostics: AnimationReviewDiagnostic[] = [];
  for (const findingId of duplicateIds(
    document.findings.map((finding) => finding.findingId),
  )) {
    diagnostics.push({
      code: "REVIEW_DUPLICATE_FINDING_ID",
      path: "/findings",
      message: `Finding ID ${findingId} occurs more than once.`,
    });
  }
  for (const checkId of duplicateIds(
    document.checklist.map((item) => item.checkId),
  )) {
    diagnostics.push({
      code: "REVIEW_DUPLICATE_CHECKLIST_ID",
      path: "/checklist",
      message: `Checklist ID ${checkId} occurs more than once.`,
    });
  }
  const findingIds = new Set(document.findings.map((finding) => finding.findingId));
  const references: Array<{ path: string; findingId: string }> = [
    ...document.checklist.flatMap((item, itemIndex) =>
      item.relatedFindingIds.map((findingId, referenceIndex) => ({
        path: `/checklist/${itemIndex}/relatedFindingIds/${referenceIndex}`,
        findingId,
      })),
    ),
    ...document.decisions.map((decision, index) => ({
      path: `/decisions/${index}/findingId`,
      findingId: decision.findingId,
    })),
    ...document.adjustments.map((adjustment, index) => ({
      path: `/adjustments/${index}/findingId`,
      findingId: adjustment.findingId,
    })),
  ];
  for (const reference of references) {
    if (!findingIds.has(reference.findingId)) {
      diagnostics.push({
        code: "REVIEW_UNKNOWN_FINDING_REFERENCE",
        path: reference.path,
        message: `Unknown finding reference ${reference.findingId}.`,
      });
    }
  }
  const revisionValues = [
    ...document.decisions.map((decision) => decision.revision),
    ...document.adjustments.map((adjustment) => adjustment.revision),
    ...document.auditTrail.map((entry) => entry.revision),
  ];
  if (
    revisionValues.some(
      (revision) => !Number.isInteger(revision) || revision > document.revision,
    )
  ) {
    diagnostics.push({
      code: "REVIEW_REVISION_INVALID",
      path: "/revision",
      message: "Child revisions must be integers no greater than the document revision.",
    });
  }
  for (const [index, adjustment] of document.adjustments.entries()) {
    if (
      !Number.isFinite(adjustment.previousValue) ||
      !Number.isFinite(adjustment.nextValue) ||
      adjustment.previousValue === adjustment.nextValue
    ) {
      diagnostics.push({
        code: "REVIEW_ADJUSTMENT_INVALID",
        path: `/adjustments/${index}`,
        message: "Adjustment values must be finite and must change the value.",
      });
    }
  }
  return sortReviewDiagnostics(diagnostics);
}

export function validateAnimationReviewDocument(
  value: unknown,
): ParseAnimationReviewResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    (value as { schemaVersion?: unknown }).schemaVersion !==
      ANIMATION_REVIEW_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "REVIEW_UNSUPPORTED_SCHEMA_VERSION",
          path: "/schemaVersion",
          message: `Only Animation Review ${ANIMATION_REVIEW_SCHEMA_VERSION} is supported.`,
        },
      ],
    };
  }
  if (!validateShape(value)) {
    return { ok: false, diagnostics: mapSchemaErrors(validateShape.errors) };
  }
  const diagnostics = semanticDiagnostics(value);
  return diagnostics.length === 0
    ? { ok: true, value, diagnostics: [] }
    : { ok: false, diagnostics };
}

export function parseAnimationReviewDocument(
  text: string,
): ParseAnimationReviewResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "REVIEW_JSON_PARSE_ERROR",
          message: error instanceof Error ? error.message : "Invalid JSON.",
          path: "",
        },
      ],
    };
  }
  return validateAnimationReviewDocument(value);
}

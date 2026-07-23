export const RigAnimationErrorCode = {
  JSON_PARSE_ERROR: "ANIMATION_JSON_PARSE_ERROR",
  SCHEMA_VALIDATION_ERROR: "ANIMATION_SCHEMA_VALIDATION_ERROR",
  UNSUPPORTED_SCHEMA_VERSION: "UNSUPPORTED_ANIMATION_SCHEMA_VERSION",
  INCOMPATIBLE_RIG_VERSION: "INCOMPATIBLE_ANIMATION_RIG_VERSION",
  MISSING_JOINT_TARGET: "ANIMATION_JOINT_TARGET_MISSING",
  DUPLICATE_TRACK: "DUPLICATE_ANIMATION_TRACK",
  INVALID_DURATION: "INVALID_ANIMATION_DURATION",
  KEYFRAME_OUTSIDE_DURATION: "KEYFRAME_OUTSIDE_ANIMATION_DURATION",
  NON_MONOTONIC_KEYFRAME_TIME: "NON_MONOTONIC_KEYFRAME_TIME",
  NON_FINITE_VALUE: "NON_FINITE_ANIMATION_VALUE",
  INVALID_INTERPOLATION: "INVALID_ANIMATION_INTERPOLATION",
  INVALID_EASING: "INVALID_ANIMATION_EASING",
  MALFORMED_VECTOR_VALUE: "MALFORMED_ANIMATION_VECTOR",
  LOOP_DISCONTINUITY: "ANIMATION_LOOP_DISCONTINUITY",
} as const;

export type RigAnimationErrorCode =
  (typeof RigAnimationErrorCode)[keyof typeof RigAnimationErrorCode];

export interface RigAnimationDiagnostic {
  code: RigAnimationErrorCode;
  path: string;
  message: string;
  jointId?: string;
  details?: Readonly<Record<string, unknown>>;
}

export type RigAnimationResult<T> =
  | { ok: true; value: T; errors: readonly [] }
  | { ok: false; errors: readonly RigAnimationDiagnostic[] };

export function sortAnimationDiagnostics(
  values: readonly RigAnimationDiagnostic[],
): RigAnimationDiagnostic[] {
  return [...values].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  );
}

import type {
  AnimationReviewDiagnostic,
  AnimationReviewDiagnosticCode,
} from "./types";

export class AnimationReviewError extends Error {
  readonly diagnostics: readonly AnimationReviewDiagnostic[];

  constructor(
    code: AnimationReviewDiagnosticCode,
    message: string,
    path?: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AnimationReviewError";
    this.diagnostics = Object.freeze([
      Object.freeze({
        code,
        message,
        ...(path === undefined ? {} : { path }),
      }),
    ]);
  }
}

export function sortReviewDiagnostics(
  diagnostics: readonly AnimationReviewDiagnostic[],
): readonly AnimationReviewDiagnostic[] {
  return Object.freeze(
    [...diagnostics].sort(
      (left, right) =>
        left.code.localeCompare(right.code) ||
        (left.path ?? "").localeCompare(right.path ?? "") ||
        left.message.localeCompare(right.message),
    ),
  );
}

import type { ValidationErrorCodeValue } from "@gameai/character-contracts";

export const AssetDiagnosticCode = {
  ASSET_FILE_NOT_FOUND: "ASSET_FILE_NOT_FOUND",
  ASSET_PATH_OUTSIDE_ROOT: "ASSET_PATH_OUTSIDE_ROOT",
  UNSUPPORTED_IMAGE_FORMAT: "UNSUPPORTED_IMAGE_FORMAT",
  IMAGE_DECODE_ERROR: "IMAGE_DECODE_ERROR",
  IMAGE_DIMENSION_MISMATCH: "IMAGE_DIMENSION_MISMATCH",
  TRIM_RECT_OUT_OF_BOUNDS: "TRIM_RECT_OUT_OF_BOUNDS",
  IMAGE_HAS_NO_ALPHA: "IMAGE_HAS_NO_ALPHA",
  IMAGE_FULLY_TRANSPARENT: "IMAGE_FULLY_TRANSPARENT",
  IMAGE_EMPTY_CONTENT_BOUNDS: "IMAGE_EMPTY_CONTENT_BOUNDS",
  DUPLICATE_ASSET_REFERENCE: "DUPLICATE_ASSET_REFERENCE",
} as const;

export type AssetDiagnosticCode =
  (typeof AssetDiagnosticCode)[keyof typeof AssetDiagnosticCode];

export type CharacterAssetDiagnosticCode = AssetDiagnosticCode | ValidationErrorCodeValue;

export type DiagnosticStage = "path" | "read" | "contract" | "image" | "geometry";

export interface CharacterAssetDiagnostic {
  code: CharacterAssetDiagnosticCode;
  stage: DiagnosticStage;
  path: string;
  message: string;
  partId?: string;
  details?: Readonly<Record<string, unknown>>;
}

export function sortDiagnostics(
  diagnostics: readonly CharacterAssetDiagnostic[],
): CharacterAssetDiagnostic[] {
  return [...diagnostics].sort((left, right) =>
    [left.path, left.partId ?? "", left.code, left.message]
      .join("\u0000")
      .localeCompare([right.path, right.partId ?? "", right.code, right.message].join("\u0000")),
  );
}

import type {
  CharacterRig,
  HitShape,
  NormalizedAnchor,
  RestPose,
  RigHitArea,
  RigSocket,
  RigLayout,
} from "@gameai/character-contracts";

import type { CharacterAssetDiagnostic } from "./diagnostics";

export type SupportedImageFormat = "png" | "jpeg" | "webp";

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedAssetPath {
  sourceRelativePath: string;
  resolvedPath: string;
}

export interface CharacterAssetPart extends NormalizedAssetPath {
  partId: string;
  parentId: string | null;
  imageFormat: SupportedImageFormat;
  width: number;
  height: number;
  hasAlpha: boolean;
  hasTransparency: boolean;
  transparentPixelCount: number;
  contentBounds: PixelBounds | null;
  originalRect: PixelBounds;
  trimOffset: { x: number; y: number };
  anchor: NormalizedAnchor;
  restPose: RestPose;
  drawOrder: number;
}

export interface CharacterAssetManifest {
  characterId: string;
  schemaVersions: {
    characterRig: string;
    rigLayout: string;
  };
  sourceRoot: string;
  characterRig: NormalizedAssetPath;
  rigLayout: NormalizedAssetPath;
  sourceCanvas: { width: number; height: number };
  referenceScale: number;
  drawOrderPolicy: "unique" | "shared";
  visualPlacementMode: "trimmed-pixels" | "source-canvas-rect";
  parts: readonly CharacterAssetPart[];
  sockets: readonly RigSocket[];
  hitAreas: readonly RigHitArea[];
}

export interface CharacterAssetIntakeOptions {
  sourceRoot: string;
  characterRigFile?: string;
}

export interface CharacterAssetDocumentIntakeOptions {
  sourceRoot: string;
  characterRig: CharacterRig;
  rigLayout: RigLayout;
  characterRigPath?: string;
  rigLayoutPath?: string;
}

export type CharacterAssetIntakeResult =
  | {
      ok: true;
      manifest: CharacterAssetManifest;
      diagnostics: readonly [];
    }
  | {
      ok: false;
      manifest: null;
      diagnostics: readonly CharacterAssetDiagnostic[];
    };

export type { HitShape };

import type {
  AnimationTarget,
  CharacterRig,
  RigHitArea,
  RigLayout,
  RigSocket,
} from "@gameai/character-contracts";
import type { CharacterAssetManifest } from "@gameai/character-asset-intake";

import type { RigLayoutDiagnostic } from "./diagnostics";

export interface Point {
  x: number;
  y: number;
}

export interface SourceRect extends Point {
  width: number;
  height: number;
}

export interface TrimMetadata {
  offset: Point;
  size: { width: number; height: number };
}

export interface AnnotationPartOverrides {
  parentId?: string | null;
  drawOrder?: number;
  rotationDegrees?: number;
  scale?: Point;
  opacity?: number;
}

export interface ChildAttachment {
  attachmentId: string;
  childPartId: string;
  position: Point;
}

interface AnnotationPartBase {
  partId: string;
  file: string;
  /** Proximal animation pivot used to attach this part to its parent. */
  joint: Point;
  /** Named distal attachment points owned by this part, in source-canvas coordinates. */
  childAttachments?: ChildAttachment[];
  visualCenter?: Point;
  overrides?: AnnotationPartOverrides;
}

export type SourceAnnotationPart = AnnotationPartBase &
  ({ sourceRect: SourceRect; originalRect?: never } | { sourceRect?: never; originalRect: SourceRect }) &
  ({ trimmedRect: SourceRect; trim?: never } | { trimmedRect?: never; trim: TrimMetadata });

export interface SourceCanvasAnnotation {
  schemaVersion: string;
  annotationId: string;
  characterId: string;
  layoutId: string;
  sourceCanvas: { width: number; height: number };
  overrides?: {
    referenceScale?: number;
    sourceRectOverlapPolicy?: "allow" | "warn";
  };
  parts: SourceAnnotationPart[];
}

export interface SkeletonTemplatePart {
  partId: string;
  parentId: string | null;
  drawOrder: number;
}

export interface SkeletonTemplateSocket {
  socketId: string;
  parentPartId: string;
  normalizedPosition: Point;
  rotationDegrees: number;
}

export interface NormalizedRectShape extends SourceRect {
  type: "rect";
}

export interface NormalizedCircleShape extends Point {
  type: "circle";
  radius: number;
}

export interface SkeletonTemplateHitArea {
  hitAreaId: string;
  parentPartId: string;
  normalizedShape: NormalizedRectShape | NormalizedCircleShape;
}

export interface SkeletonTemplate {
  schemaVersion: string;
  templateId: string;
  referenceScale: number;
  drawOrderPolicy: "unique" | "shared";
  additionalPartPolicy: "reject" | "allow-with-overrides";
  requiredParts: string[];
  parts: SkeletonTemplatePart[];
  sockets?: SkeletonTemplateSocket[];
  hitAreas?: SkeletonTemplateHitArea[];
  animationTargets: AnimationTarget[];
}

export interface GenerateRigLayoutOptions {
  annotation: unknown;
  template: unknown;
  characterRig: CharacterRig;
  sourceRoot: string;
  characterRigPath?: string;
  rigLayoutPath?: string;
}

export type RigLayoutGenerationResult =
  | {
      ok: true;
      rigLayout: RigLayout;
      manifest: CharacterAssetManifest;
      animationTargets: readonly AnimationTarget[];
      diagnostics: readonly RigLayoutDiagnostic[];
    }
  | {
      ok: false;
      rigLayout: null;
      manifest: null;
      animationTargets: readonly [];
      diagnostics: readonly RigLayoutDiagnostic[];
    };

export interface DerivedTemplateGeometry {
  sockets: RigSocket[];
  hitAreas: RigHitArea[];
}

import { AssetDiagnosticCode, type CharacterAssetDiagnostic } from "./diagnostics";
import type {
  CharacterAssetManifest,
  CharacterAssetPart,
  PixelBounds,
} from "./types";

export interface ReferencePoint {
  x: number;
  y: number;
}

export interface ReconstructedPartPlacement {
  partId: string;
  jointSourcePosition: ReferencePoint;
  jointWorldPosition: ReferencePoint;
  jointLocalPosition: ReferencePoint;
  visualSourceCenter: ReferencePoint;
  visualWorldPosition: ReferencePoint;
  visualLocalPosition: ReferencePoint;
  visualSize: { width: number; height: number };
}

function round(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

export function sourcePointToReference(
  point: ReferencePoint,
  sourceCanvas: { width: number; height: number },
  referenceScale: number,
): ReferencePoint {
  return {
    x: round((point.x - sourceCanvas.width / 2) * referenceScale),
    y: round((sourceCanvas.height / 2 - point.y) * referenceScale),
  };
}

export function sourceRectCenter(rect: PixelBounds): ReferencePoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function partJointSourcePosition(part: CharacterAssetPart): ReferencePoint {
  return {
    x: round(part.originalRect.x + part.anchor.x * part.originalRect.width),
    y: round(part.originalRect.y + part.anchor.y * part.originalRect.height),
  };
}

function visualSourceCenter(
  manifest: CharacterAssetManifest,
  part: CharacterAssetPart,
): ReferencePoint {
  if (manifest.visualPlacementMode === "source-canvas-rect") {
    return sourceRectCenter(part.originalRect);
  }
  return {
    x: part.originalRect.x + part.trimOffset.x + part.width / 2,
    y: part.originalRect.y + part.trimOffset.y + part.height / 2,
  };
}

export function reconstructPartPlacement(
  manifest: CharacterAssetManifest,
  part: CharacterAssetPart,
  parent: CharacterAssetPart | undefined,
): ReconstructedPartPlacement {
  const jointSource = partJointSourcePosition(part);
  const jointWorld = sourcePointToReference(
    jointSource,
    manifest.sourceCanvas,
    manifest.referenceScale,
  );
  const parentWorld =
    parent === undefined
      ? { x: 0, y: 0 }
      : sourcePointToReference(
          partJointSourcePosition(parent),
          manifest.sourceCanvas,
          manifest.referenceScale,
        );
  const center = visualSourceCenter(manifest, part);
  const visualWorld = sourcePointToReference(
    center,
    manifest.sourceCanvas,
    manifest.referenceScale,
  );
  const visualWidth =
    manifest.visualPlacementMode === "source-canvas-rect"
      ? part.originalRect.width
      : part.width;
  const visualHeight =
    manifest.visualPlacementMode === "source-canvas-rect"
      ? part.originalRect.height
      : part.height;
  return {
    partId: part.partId,
    jointSourcePosition: jointSource,
    jointWorldPosition: jointWorld,
    jointLocalPosition: {
      x: round(jointWorld.x - parentWorld.x),
      y: round(jointWorld.y - parentWorld.y),
    },
    visualSourceCenter: center,
    visualWorldPosition: visualWorld,
    visualLocalPosition: {
      x: round(visualWorld.x - jointWorld.x),
      y: round(visualWorld.y - jointWorld.y),
    },
    visualSize: {
      width: round(visualWidth * manifest.referenceScale),
      height: round(visualHeight * manifest.referenceScale),
    },
  };
}

export function reconstructManifestPlacements(
  manifest: CharacterAssetManifest,
): readonly ReconstructedPartPlacement[] {
  const byPartId = new Map(manifest.parts.map((part) => [part.partId, part]));
  return manifest.parts.map((part) =>
    reconstructPartPlacement(
      manifest,
      part,
      part.parentId === null ? undefined : byPartId.get(part.parentId),
    ),
  );
}

export function validateSourceCanvasReconstruction(
  manifest: CharacterAssetManifest,
): readonly CharacterAssetDiagnostic[] {
  const diagnostics: CharacterAssetDiagnostic[] = [];
  for (const part of manifest.parts) {
    const rect = part.originalRect;
    if (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > manifest.sourceCanvas.width ||
      rect.y + rect.height > manifest.sourceCanvas.height
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.SOURCE_CANVAS_METADATA_INCONSISTENT,
        stage: "geometry",
        path: part.sourceRelativePath,
        partId: part.partId,
        message: `Part ${part.partId} does not fit inside the declared sourceCanvas.`,
      });
    }
    if (
      manifest.visualPlacementMode === "source-canvas-rect" &&
      (part.trimOffset.x !== 0 || part.trimOffset.y !== 0)
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.TRIM_METADATA_INCONSISTENT,
        stage: "geometry",
        path: part.sourceRelativePath,
        partId: part.partId,
        message:
          "source-canvas-rect placement requires zero trimOffset so crop placement is not applied twice.",
        details: { trimOffset: part.trimOffset },
      });
    }
  }
  return diagnostics;
}

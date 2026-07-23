import type {
  CocosScenePartPlan,
  CocosSceneRigPlan,
  ManifestPart,
  ScenePlanInput,
} from "./types";
import {
  reconstructManifestPlacements,
  type ReconstructedPartPlacement,
} from "@gameai/character-asset-intake";

function round(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

function safeCharacterToken(characterId: string): string {
  const token = characterId.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (token.length === 0) {
    throw new Error(`Character ID ${JSON.stringify(characterId)} cannot form a Cocos node name.`);
  }
  return token;
}

function scenePart(
  part: ManifestPart,
  placement: ReconstructedPartPlacement,
  visualPlacementMode: "trimmed-pixels" | "source-canvas-rect",
  sortingOrder: number,
  spriteFrameUuid: string,
  assetUrl: string,
): CocosScenePartPlan {
  return {
    partId: part.partId,
    parentId: part.parentId,
    jointName: `Joint_${part.partId}`,
    visualName: `Visual_${part.partId}`,
    jointPosition: {
      x:
        visualPlacementMode === "source-canvas-rect"
          ? placement.jointLocalPosition.x
          : round(part.restPose.position.x),
      y:
        visualPlacementMode === "source-canvas-rect"
          ? placement.jointLocalPosition.y
          : round(part.restPose.position.y),
    },
    jointRotationDegrees: round(part.restPose.rotationDegrees),
    jointScale: {
      x: round(part.restPose.scale.x),
      y: round(part.restPose.scale.y),
    },
    visualOffset: {
      x: placement.visualLocalPosition.x,
      y: placement.visualLocalPosition.y,
    },
    visualSize: {
      width: placement.visualSize.width,
      height: placement.visualSize.height,
    },
    visualAnchor: { x: 0.5, y: 0.5 },
    opacity: round(part.restPose.opacity),
    sourceDrawOrder: part.drawOrder,
    sortingOrder,
    spriteFrameUuid,
    assetUrl,
  };
}

export function buildCocosSceneRigPlan(input: ScenePlanInput): CocosSceneRigPlan {
  const references = new Map(input.assetReferences.map((value) => [value.partId, value]));
  const placements = new Map(
    reconstructManifestPlacements(input.manifest).map((value) => [
      value.partId,
      value,
    ]),
  );
  const orderedForRendering = [...input.manifest.parts].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder || left.partId.localeCompare(right.partId),
  );
  const sortingOrder = new Map(
    orderedForRendering.map((part, index) => [part.partId, index]),
  );

  const parts = input.manifest.parts.map((part) => {
    const reference = references.get(part.partId);
    if (reference === undefined) {
      throw new Error(`No AssetDB SpriteFrame reference was supplied for ${part.partId}.`);
    }
    const placement = placements.get(part.partId);
    if (placement === undefined) {
      throw new Error(`No source-canvas reconstruction exists for ${part.partId}.`);
    }
    return scenePart(
      part,
      placement,
      input.manifest.visualPlacementMode,
      sortingOrder.get(part.partId) ?? 0,
      reference.spriteFrameUuid,
      reference.assetUrl,
    );
  });

  return {
    planVersion: "1.3.0",
    correlationId: input.correlationId,
    characterId: input.manifest.characterId,
    characterRootName: `CHR_${safeCharacterToken(input.manifest.characterId)}`,
    rigRootName: "RigRoot",
    generatedMarkerName: "__GameAI_Generated__",
    renderLayer: "UI_3D",
    schemaVersions: { ...input.manifest.schemaVersions },
    sourceCanvas: { ...input.manifest.sourceCanvas },
    referenceScale: input.manifest.referenceScale,
    visualPlacementMode: input.manifest.visualPlacementMode,
    parts,
    sockets: input.manifest.sockets.map((socket) => ({
      ...socket,
      position: { ...socket.position },
    })),
    hitAreas: input.manifest.hitAreas.map((hitArea) => ({
      ...hitArea,
      shape: { ...hitArea.shape },
    })),
    animation: input.animation ?? null,
  };
}

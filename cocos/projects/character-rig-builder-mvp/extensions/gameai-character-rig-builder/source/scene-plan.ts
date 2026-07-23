import type {
  CocosScenePartPlan,
  CocosSceneRigPlan,
  ManifestPart,
  ScenePlanInput,
} from "./types";

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

function jointSourcePosition(part: ManifestPart): { x: number; y: number } {
  return {
    x: part.originalRect.x + part.anchor.x * part.originalRect.width,
    y: part.originalRect.y + part.anchor.y * part.originalRect.height,
  };
}

function scenePart(
  part: ManifestPart,
  sortingOrder: number,
  referenceScale: number,
  spriteFrameUuid: string,
  assetUrl: string,
): CocosScenePartPlan {
  const joint = jointSourcePosition(part);
  const trimmedCenter = {
    x: part.originalRect.x + part.trimOffset.x + part.width / 2,
    y: part.originalRect.y + part.trimOffset.y + part.height / 2,
  };
  return {
    partId: part.partId,
    parentId: part.parentId,
    jointName: `Joint_${part.partId}`,
    visualName: `Visual_${part.partId}`,
    jointPosition: {
      x: round(part.restPose.position.x),
      y: round(part.restPose.position.y),
    },
    jointRotationDegrees: round(part.restPose.rotationDegrees),
    jointScale: {
      x: round(part.restPose.scale.x),
      y: round(part.restPose.scale.y),
    },
    visualOffset: {
      x: round((trimmedCenter.x - joint.x) * referenceScale),
      y: round((joint.y - trimmedCenter.y) * referenceScale),
    },
    visualSize: {
      width: round(part.width * referenceScale),
      height: round(part.height * referenceScale),
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
    return scenePart(
      part,
      sortingOrder.get(part.partId) ?? 0,
      input.manifest.referenceScale,
      reference.spriteFrameUuid,
      reference.assetUrl,
    );
  });

  return {
    planVersion: "1.0.0",
    correlationId: input.correlationId,
    characterId: input.manifest.characterId,
    characterRootName: `CHR_${safeCharacterToken(input.manifest.characterId)}`,
    rigRootName: "RigRoot",
    generatedMarkerName: "__GameAI_Generated__",
    schemaVersions: { ...input.manifest.schemaVersions },
    referenceScale: input.manifest.referenceScale,
    parts,
    sockets: input.manifest.sockets.map((socket) => ({
      ...socket,
      position: { ...socket.position },
    })),
    hitAreas: input.manifest.hitAreas.map((hitArea) => ({
      ...hitArea,
      shape: { ...hitArea.shape },
    })),
  };
}

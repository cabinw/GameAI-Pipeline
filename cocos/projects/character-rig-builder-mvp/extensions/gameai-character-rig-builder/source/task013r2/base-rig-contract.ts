export const BASE_RIG_REST_CLIP_ID = "production-lite-rest-idle";
export const BASE_RIG_WAVE_CLIP_ID = "production-lite-arm-wave";
export const BASE_RIG_STRESS_CLIP_ID =
  "production-lite-articulation-stress";

export const BASE_RIG_REQUIRED_CLIP_IDS = Object.freeze([
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_WAVE_CLIP_ID,
  BASE_RIG_STRESS_CLIP_ID,
]);

export interface BaseRigVector2 {
  readonly x: number;
  readonly y: number;
}

export interface BaseRigRestPose {
  readonly position: BaseRigVector2;
  readonly rotationDegrees: number;
  readonly scale: BaseRigVector2;
}

export interface BaseRigPart {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly resourcePath: string;
  readonly drawOrder: number;
  readonly restPose: BaseRigRestPose;
  readonly visualOffset: BaseRigVector2;
  readonly visualSize: Readonly<{ width: number; height: number }>;
}

export interface BaseRigClipTrack {
  readonly jointId: string;
  readonly property: string;
  readonly keyframes: readonly unknown[];
}

export interface BaseRigClip {
  readonly animationId: string;
  readonly duration: number;
  readonly loop: boolean;
  readonly tracks: readonly BaseRigClipTrack[];
}

export interface BaseRigBridgePlan {
  readonly planVersion: string;
  readonly rigId: string;
  readonly parts: readonly BaseRigPart[];
  readonly clips: readonly BaseRigClip[];
}

export interface BaseRigValidationSnapshot {
  readonly rigId: string;
  readonly rootJointId: string;
  readonly partCount: number;
  readonly jointCount: number;
  readonly skeletonSegmentCount: number;
  readonly clipIds: readonly string[];
}

function requireFiniteVector(
  value: BaseRigVector2,
  diagnostic: string,
): void {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new Error(`TASK_013R2_NON_FINITE_TRANSFORM: ${diagnostic}`);
  }
}

export function validateBaseRigBridgePlan(
  plan: BaseRigBridgePlan,
): BaseRigValidationSnapshot {
  if (
    plan.planVersion !== "1.0.0" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(plan.rigId) ||
    plan.parts.length === 0
  ) {
    throw new Error("TASK_013R2_PLAN_INVALID");
  }

  const jointIds = new Set<string>();
  const resourcePaths = new Set<string>();
  const drawOrders = new Set<number>();
  for (const part of plan.parts) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(part.jointId) ||
      jointIds.has(part.jointId)
    ) {
      throw new Error(`TASK_013R2_DUPLICATE_OR_INVALID_JOINT: ${part.jointId}`);
    }
    if (
      !/^[A-Za-z0-9]+(?:[/-][A-Za-z0-9]+)*$/u.test(part.resourcePath) ||
      resourcePaths.has(part.resourcePath)
    ) {
      throw new Error(
        `TASK_013R2_DUPLICATE_OR_INVALID_RESOURCE: ${part.resourcePath}`,
      );
    }
    if (
      !Number.isInteger(part.drawOrder) ||
      part.drawOrder < 0 ||
      drawOrders.has(part.drawOrder)
    ) {
      throw new Error(
        `TASK_013R2_DUPLICATE_OR_INVALID_DRAW_ORDER: ${part.drawOrder}`,
      );
    }
    requireFiniteVector(part.restPose.position, `${part.jointId}.position`);
    requireFiniteVector(part.restPose.scale, `${part.jointId}.scale`);
    requireFiniteVector(part.visualOffset, `${part.jointId}.visualOffset`);
    if (
      !Number.isFinite(part.restPose.rotationDegrees) ||
      part.restPose.scale.x === 0 ||
      part.restPose.scale.y === 0 ||
      !Number.isFinite(part.visualSize.width) ||
      !Number.isFinite(part.visualSize.height) ||
      part.visualSize.width <= 0 ||
      part.visualSize.height <= 0
    ) {
      throw new Error(`TASK_013R2_INVALID_PART_TRANSFORM: ${part.jointId}`);
    }
    jointIds.add(part.jointId);
    resourcePaths.add(part.resourcePath);
    drawOrders.add(part.drawOrder);
  }

  const roots = plan.parts.filter((part) => part.parentId === null);
  if (roots.length !== 1) {
    throw new Error(`TASK_013R2_INVALID_ROOT_COUNT: ${roots.length}`);
  }
  for (const part of plan.parts) {
    if (part.parentId !== null && !jointIds.has(part.parentId)) {
      throw new Error(
        `TASK_013R2_UNKNOWN_PARENT: ${part.jointId}->${part.parentId}`,
      );
    }
    const visited = new Set<string>([part.jointId]);
    let cursor = part.parentId;
    while (cursor !== null) {
      if (visited.has(cursor)) {
        throw new Error(`TASK_013R2_PARENT_CYCLE: ${part.jointId}`);
      }
      visited.add(cursor);
      cursor =
        plan.parts.find((candidate) => candidate.jointId === cursor)
          ?.parentId ?? null;
    }
  }

  const clipIds = new Set<string>();
  for (const clip of plan.clips) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(clip.animationId) ||
      clipIds.has(clip.animationId) ||
      !Number.isFinite(clip.duration) ||
      clip.duration <= 0
    ) {
      throw new Error(
        `TASK_013R2_DUPLICATE_OR_INVALID_CLIP: ${clip.animationId}`,
      );
    }
    for (const track of clip.tracks) {
      if (!jointIds.has(track.jointId)) {
        throw new Error(
          `TASK_013R2_UNKNOWN_CLIP_JOINT: ${clip.animationId}->${track.jointId}`,
        );
      }
    }
    clipIds.add(clip.animationId);
  }
  for (const requiredClipId of BASE_RIG_REQUIRED_CLIP_IDS) {
    if (!clipIds.has(requiredClipId)) {
      throw new Error(`TASK_013R2_REQUIRED_CLIP_MISSING: ${requiredClipId}`);
    }
  }

  return Object.freeze({
    rigId: plan.rigId,
    rootJointId: roots[0]!.jointId,
    partCount: plan.parts.length,
    jointCount: jointIds.size,
    skeletonSegmentCount: plan.parts.length - 1,
    clipIds: Object.freeze([...clipIds].sort()),
  });
}

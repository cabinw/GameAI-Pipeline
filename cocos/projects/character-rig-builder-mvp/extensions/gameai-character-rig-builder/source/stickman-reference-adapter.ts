import type {
  NormalizedRigAnimation,
  RigAnimation,
  RigHierarchyJoint,
} from "@gameai/rig-animation";
import {
  normalizeRigAnimation,
  validateRigHierarchy,
  validateRigAnimationSemantics,
} from "@gameai/rig-animation";

interface RigLayoutLike {
  readonly schemaVersion: string;
  readonly layoutId: string;
  readonly drawOrderPolicy: "unique" | "shared";
  readonly parts: readonly {
    readonly partId: string;
    readonly parentId: string | null;
    readonly drawOrder: number;
    readonly restPose: RigHierarchyJoint["restPose"] & {
      readonly opacity: number;
    };
  }[];
}

export interface StickmanSegmentVisual {
  readonly partId: string;
  readonly kind: "segment";
  readonly from: Readonly<{ x: number; y: number }>;
  readonly to: Readonly<{ x: number; y: number }>;
  readonly color: string;
}

export interface StickmanCircleVisual {
  readonly partId: string;
  readonly kind: "circle";
  readonly center: Readonly<{ x: number; y: number }>;
  readonly radius: number;
  readonly color: string;
}

export type StickmanVisual = StickmanSegmentVisual | StickmanCircleVisual;

interface StickmanVisualDocument {
  readonly rigId: string;
  readonly lineWidth: number;
  readonly jointMarkerRadius: number;
  readonly parts: readonly StickmanVisual[];
  readonly mirrorPairs: readonly (readonly [string, string])[];
}

export interface CocosStickmanPartPlan {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly drawOrder: number;
  readonly restPose: RigHierarchyJoint["restPose"];
  readonly visual: StickmanVisual;
}

export interface CocosStickmanReferencePlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly parts: readonly CocosStickmanPartPlan[];
  readonly clips: readonly NormalizedRigAnimation[];
  readonly lineWidth: number;
  readonly jointMarkerRadius: number;
  readonly mirrorPairs: readonly (readonly [string, string])[];
}

export function buildCocosStickmanReferencePlan(
  layout: RigLayoutLike,
  visuals: StickmanVisualDocument,
  clips: readonly RigAnimation[],
): CocosStickmanReferencePlan {
  const hierarchy: RigHierarchyJoint[] = layout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: {
      position: { ...part.restPose.position },
      rotationDegrees: part.restPose.rotationDegrees,
      scale: { ...part.restPose.scale },
    },
  }));
  const hierarchyErrors = validateRigHierarchy(hierarchy);
  if (hierarchyErrors.length > 0) {
    throw new Error(JSON.stringify(hierarchyErrors));
  }
  if (visuals.rigId !== layout.layoutId) {
    throw new Error(
      `STICKMAN_VISUAL_RIG_MISMATCH: ${visuals.rigId} does not match ${layout.layoutId}.`,
    );
  }
  const visualsById = new Map(
    visuals.parts.map((visual) => [visual.partId, visual] as const),
  );
  const partIds = new Set(hierarchy.map((joint) => joint.jointId));
  if (
    visuals.parts.length !== layout.parts.length ||
    layout.parts.some((part) => !visualsById.has(part.partId))
  ) {
    throw new Error(
      "STICKMAN_VISUAL_PART_MISMATCH: every rig part requires exactly one primitive visual.",
    );
  }
  const context = {
    rigId: layout.layoutId,
    rigSchemaVersion: layout.schemaVersion,
    jointIds: partIds,
  };
  for (const clip of clips) {
    const errors = validateRigAnimationSemantics(clip, context);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
  }

  return Object.freeze({
    planVersion: "1.0.0",
    rigId: layout.layoutId,
    parts: Object.freeze(
      [...layout.parts]
        .sort(
          (left, right) =>
            left.drawOrder - right.drawOrder ||
            left.partId.localeCompare(right.partId),
        )
        .map((part) =>
          Object.freeze({
            jointId: part.partId,
            parentId: part.parentId,
            drawOrder: part.drawOrder,
            restPose: hierarchy.find(
              (joint) => joint.jointId === part.partId,
            )!.restPose,
            visual: visualsById.get(part.partId)!,
          }),
        ),
    ),
    clips: Object.freeze(
      clips
        .map(normalizeRigAnimation)
        .sort((left, right) => left.animationId.localeCompare(right.animationId)),
    ),
    lineWidth: visuals.lineWidth,
    jointMarkerRadius: visuals.jointMarkerRadius,
    mirrorPairs: Object.freeze(
      visuals.mirrorPairs.map((pair) => Object.freeze([...pair] as const)),
    ),
  });
}

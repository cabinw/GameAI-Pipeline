import type {
  NormalizedRigAnimation,
  RigAnimation,
  RigHierarchyJoint,
} from "@gameai/rig-animation";
import {
  normalizeRigAnimation,
  validateRigAnimationSemantics,
  validateRigHierarchy,
} from "@gameai/rig-animation";

interface SimpleSpriteLayout {
  readonly schemaVersion: string;
  readonly layoutId: string;
  readonly sourceCanvas: { readonly width: number; readonly height: number };
  readonly referenceScale: number;
  readonly visualPlacementMode?: string;
  readonly drawOrderPolicy: "unique" | "shared";
  readonly parts: readonly {
    readonly partId: string;
    readonly file: string;
    readonly parentId: string | null;
    readonly originalRect: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
    readonly trimOffset: { readonly x: number; readonly y: number };
    readonly anchor: { readonly x: number; readonly y: number };
    readonly restPose: RigHierarchyJoint["restPose"] & {
      readonly opacity: number;
    };
    readonly drawOrder: number;
  }[];
}

export interface CocosSimpleSpritePartPlan {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly resourcePath: string;
  readonly drawOrder: number;
  readonly restPose: RigHierarchyJoint["restPose"];
  readonly visualOffset: Readonly<{ x: number; y: number }>;
  readonly visualSize: Readonly<{ width: number; height: number }>;
  readonly anchor: Readonly<{ x: number; y: number }>;
}

export interface CocosSimpleSpriteCharacterPlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly sourceCanvas: Readonly<{ width: number; height: number }>;
  readonly referenceScale: number;
  readonly parts: readonly CocosSimpleSpritePartPlan[];
  readonly clips: readonly NormalizedRigAnimation[];
}

export function buildCocosSimpleSpriteCharacterPlan(
  layout: SimpleSpriteLayout,
  clips: readonly RigAnimation[],
): CocosSimpleSpriteCharacterPlan {
  if (layout.visualPlacementMode !== "source-canvas-rect") {
    throw new Error("SIMPLE_SPRITE_SOURCE_CANVAS_PLACEMENT_REQUIRED");
  }
  if (layout.drawOrderPolicy !== "unique") {
    throw new Error("SIMPLE_SPRITE_UNIQUE_DRAW_ORDER_REQUIRED");
  }
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
  if (hierarchyErrors.length > 0) throw new Error(JSON.stringify(hierarchyErrors));

  const orders = new Set(layout.parts.map((part) => part.drawOrder));
  if (orders.size !== layout.parts.length) {
    throw new Error("SIMPLE_SPRITE_DUPLICATE_DRAW_ORDER");
  }
  const jointIds = new Set(layout.parts.map((part) => part.partId));
  const context = {
    rigId: layout.layoutId,
    rigSchemaVersion: layout.schemaVersion,
    jointIds,
  };
  for (const clip of clips) {
    const errors = validateRigAnimationSemantics(clip, context);
    if (errors.length > 0) throw new Error(JSON.stringify(errors));
  }

  return Object.freeze({
    planVersion: "1.0.0",
    rigId: layout.layoutId,
    sourceCanvas: Object.freeze({ ...layout.sourceCanvas }),
    referenceScale: layout.referenceScale,
    parts: Object.freeze(
      [...layout.parts]
        .sort(
          (left, right) =>
            left.drawOrder - right.drawOrder ||
            left.partId.localeCompare(right.partId),
        )
        .map((part) => {
          const jointX =
            part.originalRect.x + part.anchor.x * part.originalRect.width;
          const jointY =
            part.originalRect.y + part.anchor.y * part.originalRect.height;
          const centerX = part.originalRect.x + part.originalRect.width / 2;
          const centerY = part.originalRect.y + part.originalRect.height / 2;
          return Object.freeze({
            jointId: part.partId,
            parentId: part.parentId,
            resourcePath:
              `simple-sprite-character/${part.file.replace(/\.png$/, "")}/spriteFrame`,
            drawOrder: part.drawOrder,
            restPose: hierarchy.find(
              (joint) => joint.jointId === part.partId,
            )!.restPose,
            visualOffset: Object.freeze({
              x: (centerX - jointX) * layout.referenceScale,
              y: (jointY - centerY) * layout.referenceScale,
            }),
            visualSize: Object.freeze({
              width: part.originalRect.width * layout.referenceScale,
              height: part.originalRect.height * layout.referenceScale,
            }),
            anchor: Object.freeze({ ...part.anchor }),
          });
        }),
    ),
    clips: Object.freeze(
      clips
        .map(normalizeRigAnimation)
        .sort((left, right) => left.animationId.localeCompare(right.animationId)),
    ),
  });
}

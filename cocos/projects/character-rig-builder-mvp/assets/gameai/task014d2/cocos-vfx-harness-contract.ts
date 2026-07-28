// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.
import type {
  VfxBlendRole,
  VfxPrimitive,
  VfxResourceRecipeKind,
} from "./d1/index";

import type { CocosVfxResourceRecipe } from "./cocos-vfx-render-descriptor";

export const TASK014D2_RESOURCE_REGISTRY: readonly CocosVfxResourceRecipe[] =
  Object.freeze([
    recipe("vfx.aura-glow", "textured-sprite", ["sprite-quad"]),
    recipe("vfx.aura-ring", "procedural-ring", ["ring"]),
    recipe("vfx.dust-soft", "textured-sprite", ["burst-particles"]),
    recipe("vfx.ribbon-core", "procedural-ribbon", ["ribbon"]),
    recipe("vfx.ring-soft", "procedural-ring", ["ring"]),
    recipe("vfx.spark", "textured-sprite", ["burst-particles"]),
  ]);

function recipe(
  resourceId: string,
  recipeKind: VfxResourceRecipeKind,
  compatiblePrimitives: readonly VfxPrimitive[],
): CocosVfxResourceRecipe {
  return Object.freeze({
    resourceId,
    recipeKind,
    compatiblePrimitives,
    compatibleBlendRoles: [
      "alpha",
      "additive",
      "multiply",
      "screen",
    ] as readonly VfxBlendRole[],
  });
}

export type Task014D2InputAction =
  | "one-shot"
  | "looping"
  | "persistent"
  | "combined"
  | "pause"
  | "stress"
  | "rebuild"
  | "debug"
  | "reset";

export const TASK014D2_INPUT_REGISTRY = Object.freeze([
  { key: "1", label: "One-shot", action: "one-shot" },
  { key: "2", label: "Looping", action: "looping" },
  { key: "3", label: "Persistent", action: "persistent" },
  { key: "4", label: "Combined", action: "combined" },
  { key: "Space", label: "Pause/Resume", action: "pause" },
  { key: "X", label: "Transform Stress", action: "stress" },
  { key: "B", label: "Lifecycle Rebuild", action: "rebuild" },
  { key: "D", label: "Debug", action: "debug" },
  { key: "Escape", label: "Exact Reset", action: "reset" },
] as const satisfies readonly {
  readonly key: string;
  readonly label: string;
  readonly action: Task014D2InputAction;
}[]);

export const TASK014D2_SORTING = Object.freeze({
  vfxBase: 1000,
  vfxMaximum: 1100,
  debug: 2000,
  hud: 3000,
});

export const TASK014D2_SPATIAL = Object.freeze({
  designWidth: 1280,
  designHeight: 720,
  safeInset: 32,
  positionTolerancePx: 0.5,
  rotationToleranceDegrees: 0.25,
});

export interface Task014D2Affine {
  readonly x: number;
  readonly y: number;
  readonly rotationDegrees: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export function composeTask014D2Affine(
  parent: Task014D2Affine,
  local: Task014D2Affine,
): Task014D2Affine {
  const radians = (parent.rotationDegrees * Math.PI) / 180;
  const scaledX = local.x * parent.scaleX;
  const scaledY = local.y * parent.scaleY;
  return {
    x:
      parent.x +
      scaledX * Math.cos(radians) -
      scaledY * Math.sin(radians),
    y:
      parent.y +
      scaledX * Math.sin(radians) +
      scaledY * Math.cos(radians),
    rotationDegrees: parent.rotationDegrees + local.rotationDegrees,
    scaleX: parent.scaleX * local.scaleX,
    scaleY: parent.scaleY * local.scaleY,
  };
}

export function projectTask014D2WorldToOverlay(
  world: Readonly<{ x: number; y: number }>,
  overlay: Task014D2Affine,
): Readonly<{ x: number; y: number }> {
  const dx = world.x - overlay.x;
  const dy = world.y - overlay.y;
  const radians = (-overlay.rotationDegrees * Math.PI) / 180;
  return {
    x:
      (dx * Math.cos(radians) - dy * Math.sin(radians)) /
      overlay.scaleX,
    y:
      (dx * Math.sin(radians) + dy * Math.cos(radians)) /
      overlay.scaleY,
  };
}

export function task014d2PointInsideSafeViewport(
  point: Readonly<{ x: number; y: number }>,
): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Math.abs(point.x) <=
      TASK014D2_SPATIAL.designWidth / 2 - TASK014D2_SPATIAL.safeInset &&
    Math.abs(point.y) <=
      TASK014D2_SPATIAL.designHeight / 2 - TASK014D2_SPATIAL.safeInset
  );
}

// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.
import type {
  VfxBlendRole,
  VfxPrimitive,
  VfxResourceRecipeKind,
} from "./d1/index";

import {
  COCOS_VFX_SORTING,
  type CocosVfxResourceRecipe,
} from "./cocos-vfx-render-descriptor";

export const TASK014D2_RESOURCE_REGISTRY: readonly CocosVfxResourceRecipe[] =
  Object.freeze([
    recipe("vfx.aura-glow", "textured-sprite", ["sprite-quad"], ["additive"]),
    recipe("vfx.aura-ring", "procedural-ring", ["ring"], ["screen"]),
    recipe("vfx.dust-soft", "textured-sprite", ["burst-particles"], ["alpha"]),
    recipe("vfx.ribbon-core", "procedural-ribbon", ["ribbon"], ["additive", "screen"]),
    recipe("vfx.ring-soft", "procedural-ring", ["ring"], ["alpha"]),
    recipe("vfx.spark", "textured-sprite", ["burst-particles"], ["additive"]),
  ]);

function recipe(
  resourceId: string,
  recipeKind: VfxResourceRecipeKind,
  compatiblePrimitives: readonly VfxPrimitive[],
  compatibleBlendRoles: readonly VfxBlendRole[],
): CocosVfxResourceRecipe {
  return Object.freeze({
    resourceId,
    recipeKind,
    compatiblePrimitives,
    compatibleBlendRoles,
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

export const TASK014D2_SORTING = COCOS_VFX_SORTING;

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

export interface Task014D2Bounds {
  readonly minimumX: number;
  readonly minimumY: number;
  readonly maximumX: number;
  readonly maximumY: number;
}

export interface Task014D2RuntimeDiagnostics {
  setupCount: number;
  teardownCount: number;
  rebuildCount: number;
  lastAction: string;
  persistentStartAttempts: number;
  acceptedPersistentStarts: number;
  coalescedPersistentStarts: number;
  activeInstances: number;
  activeRenderers: number;
  missingRenderers: number;
  extraRenderers: number;
  mismatchedRenderers: number;
  staleRenderers: number;
  runtimeRoots: number;
  inputHandlers: number;
  activeRecipeBlendSummary: string;
  maximumPositionErrorPx: number;
  maximumRotationErrorDegrees: number;
  maximumAabbOverflowPx: number;
  terminalError: string;
}

export function createTask014D2RuntimeDiagnostics():
Task014D2RuntimeDiagnostics {
  return {
    setupCount: 0,
    teardownCount: 0,
    rebuildCount: 0,
    lastAction: "Initial Reset",
    persistentStartAttempts: 0,
    acceptedPersistentStarts: 0,
    coalescedPersistentStarts: 0,
    activeInstances: 0,
    activeRenderers: 0,
    missingRenderers: 0,
    extraRenderers: 0,
    mismatchedRenderers: 0,
    staleRenderers: 0,
    runtimeRoots: 0,
    inputHandlers: 0,
    activeRecipeBlendSummary: "none",
    maximumPositionErrorPx: 0,
    maximumRotationErrorDegrees: 0,
    maximumAabbOverflowPx: 0,
    terminalError: "",
  };
}

export function formatTask014D2Diagnostics(
  diagnostics: Readonly<Task014D2RuntimeDiagnostics>,
  state: Readonly<{
    ready: boolean;
    playing: boolean;
    elapsedSeconds: number;
    stress: boolean;
    debug: boolean;
  }>,
): string {
  return [
    "TASK-014D2 · Generic Cocos Render Plan Adapter",
    `Gate ${state.ready ? "PASS" : "WAIT"} · ${state.playing ? "PLAYING" : "STOPPED"} ${state.elapsedSeconds.toFixed(2)}s · Stress ${state.stress ? "ON" : "OFF"} · Debug ${state.debug ? "ON" : "OFF"}`,
    `Setup ${diagnostics.setupCount} · Teardown ${diagnostics.teardownCount} · Rebuild ${diagnostics.rebuildCount} · Last ${diagnostics.lastAction}`,
    `Persistent attempts ${diagnostics.persistentStartAttempts} · accepted ${diagnostics.acceptedPersistentStarts} · coalesced ${diagnostics.coalescedPersistentStarts}`,
    `Instances ${diagnostics.activeInstances} · Renderers ${diagnostics.activeRenderers} · Missing ${diagnostics.missingRenderers} · Extra ${diagnostics.extraRenderers} · Mismatch ${diagnostics.mismatchedRenderers} · Stale ${diagnostics.staleRenderers}`,
    `Root ${diagnostics.runtimeRoots} · Input ${diagnostics.inputHandlers} · Active ${diagnostics.activeRecipeBlendSummary}`,
    `Max position ${diagnostics.maximumPositionErrorPx.toFixed(3)}px · rotation ${diagnostics.maximumRotationErrorDegrees.toFixed(3)}° · AABB overflow ${diagnostics.maximumAabbOverflowPx.toFixed(3)}px`,
    diagnostics.terminalError || "No errors",
  ].join("\n");
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

export function transformTask014D2Bounds(
  bounds: Task014D2Bounds,
  transform: Task014D2Affine,
): Task014D2Bounds {
  const radians = (transform.rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const points = [
    [bounds.minimumX, bounds.minimumY],
    [bounds.minimumX, bounds.maximumY],
    [bounds.maximumX, bounds.minimumY],
    [bounds.maximumX, bounds.maximumY],
  ].map(([x, y]) => ({
    x: transform.x + (x as number) * transform.scaleX * cosine -
      (y as number) * transform.scaleY * sine,
    y: transform.y + (x as number) * transform.scaleX * sine +
      (y as number) * transform.scaleY * cosine,
  }));
  return {
    minimumX: Math.min(...points.map((point) => point.x)),
    minimumY: Math.min(...points.map((point) => point.y)),
    maximumX: Math.max(...points.map((point) => point.x)),
    maximumY: Math.max(...points.map((point) => point.y)),
  };
}

export function task014d2BoundsOverflowPx(bounds: Task014D2Bounds): number {
  const horizontal = TASK014D2_SPATIAL.designWidth / 2 -
    TASK014D2_SPATIAL.safeInset;
  const vertical = TASK014D2_SPATIAL.designHeight / 2 -
    TASK014D2_SPATIAL.safeInset;
  if (
    ![
      bounds.minimumX,
      bounds.minimumY,
      bounds.maximumX,
      bounds.maximumY,
    ].every(Number.isFinite)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    0,
    -horizontal - bounds.minimumX,
    bounds.maximumX - horizontal,
    -vertical - bounds.minimumY,
    bounds.maximumY - vertical,
  );
}

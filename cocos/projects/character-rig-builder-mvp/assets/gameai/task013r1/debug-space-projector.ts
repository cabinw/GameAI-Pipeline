import { Node, UITransform, Vec3 } from "cc";

import { harnessDistance, type HarnessPoint } from "./harness-spatial";

export interface ProjectedDebugPoint {
  readonly world: HarnessPoint;
  readonly overlayLocal: HarnessPoint;
  readonly roundTripWorld: HarnessPoint;
  readonly error: number;
}

export function runtimeWorldPoint(
  node: Node,
  diagnosticPrefix = "TASK_013R1",
): HarnessPoint {
  const world = node.getWorldPosition(new Vec3());
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
    throw new Error(`${diagnosticPrefix}_RUNTIME_WORLD_POSITION_NON_FINITE`);
  }
  return Object.freeze({ x: world.x, y: world.y });
}

export function projectNodeToOverlayLocal(
  target: Node,
  overlayRoot: Node,
  diagnosticPrefix = "TASK_013R1",
): ProjectedDebugPoint {
  const transform = overlayRoot.getComponent(UITransform);
  if (transform === null) {
    throw new Error(`${diagnosticPrefix}_OVERLAY_TRANSFORM_MISSING`);
  }
  const world = runtimeWorldPoint(target, diagnosticPrefix);
  const local = transform.convertToNodeSpaceAR(
    new Vec3(world.x, world.y, 0),
  );
  const roundTrip = transform.convertToWorldSpaceAR(
    new Vec3(local.x, local.y, 0),
  );
  const overlayLocal = Object.freeze({ x: local.x, y: local.y });
  const roundTripWorld = Object.freeze({
    x: roundTrip.x,
    y: roundTrip.y,
  });
  return Object.freeze({
    world,
    overlayLocal,
    roundTripWorld,
    error: harnessDistance(world, roundTripWorld),
  });
}

// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.
export interface HarnessPoint {
  readonly x: number;
  readonly y: number;
}

export interface HarnessBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface HarnessSpatialMeasurement {
  readonly markerError: number;
  readonly skeletonRootError: number;
  readonly skeletonChildError: number;
  readonly gripError: number;
  readonly characterBounds: HarnessBounds;
  readonly debugBounds: HarnessBounds;
}

export interface HierarchySpatialMeasurement {
  readonly markerErrors: readonly number[];
  readonly skeletonEndpointErrors: readonly number[];
  readonly characterBounds: HarnessBounds;
  readonly debugBounds: HarnessBounds;
  readonly unknownParentCount: number;
  readonly parentCycleCount: number;
  readonly nonFinitePositionCount: number;
  readonly sortingViolationCount: number;
}

export const HARNESS_SPATIAL_TOLERANCE_PX = 0.5;

export function harnessDistance(
  left: HarnessPoint,
  right: HarnessPoint,
): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function harnessBounds(
  points: readonly HarnessPoint[],
  padding = 0,
): HarnessBounds {
  if (points.length === 0 || !Number.isFinite(padding) || padding < 0) {
    throw new Error("TASK_013R1_SPATIAL_BOUNDS_INVALID");
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  if ([...xs, ...ys].some((value) => !Number.isFinite(value))) {
    throw new Error("TASK_013R1_SPATIAL_NON_FINITE");
  }
  return Object.freeze({
    left: Math.min(...xs) - padding,
    right: Math.max(...xs) + padding,
    top: Math.max(...ys) + padding,
    bottom: Math.min(...ys) - padding,
  });
}

export function harnessBoundsIntersect(
  left: HarnessBounds,
  right: HarnessBounds,
): boolean {
  return !(
    left.right < right.left ||
    left.left > right.right ||
    left.top < right.bottom ||
    left.bottom > right.top
  );
}

export function harnessBoundsContain(
  outer: HarnessBounds,
  inner: HarnessBounds,
): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.bottom >= outer.bottom &&
    inner.top <= outer.top
  );
}

export function validateHierarchySpatialMeasurement(
  measurement: HierarchySpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  const errors = [
    ...measurement.markerErrors,
    ...measurement.skeletonEndpointErrors,
  ];
  if (
    errors.length === 0 ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    errors.some((error) => !Number.isFinite(error)) ||
    measurement.nonFinitePositionCount !== 0
  ) {
    throw new Error("TASK_013R2_SPATIAL_NON_FINITE");
  }
  const maximum = Math.max(...errors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R2_SPATIAL_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    measurement.unknownParentCount !== 0 ||
    measurement.parentCycleCount !== 0
  ) {
    throw new Error("TASK_013R2_SPATIAL_HIERARCHY_INVALID");
  }
  if (measurement.sortingViolationCount !== 0) {
    throw new Error("TASK_013R2_SPATIAL_SORTING_INVALID");
  }
  if (
    !harnessBoundsIntersect(
      measurement.characterBounds,
      measurement.debugBounds,
    ) ||
    !harnessBoundsContain(
      measurement.characterBounds,
      measurement.debugBounds,
    )
  ) {
    throw new Error("TASK_013R2_SPATIAL_DEBUG_OUTSIDE_CHARACTER");
  }
}

export function validateHarnessSpatialMeasurement(
  measurement: HarnessSpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  const errors = [
    measurement.markerError,
    measurement.skeletonRootError,
    measurement.skeletonChildError,
    measurement.gripError,
  ];
  if (
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    errors.some((error) => !Number.isFinite(error))
  ) {
    throw new Error("TASK_013R1_SPATIAL_NON_FINITE");
  }
  const maximum = Math.max(...errors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R1_SPATIAL_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    !harnessBoundsIntersect(
      measurement.characterBounds,
      measurement.debugBounds,
    )
  ) {
    throw new Error("TASK_013R1_SPATIAL_BOUNDS_DISJOINT");
  }
}

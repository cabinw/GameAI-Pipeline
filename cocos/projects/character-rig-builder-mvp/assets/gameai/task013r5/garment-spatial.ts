// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.
import {
  HARNESS_SPATIAL_TOLERANCE_PX,
  validateHierarchySpatialMeasurement,
  type HierarchySpatialMeasurement,
} from "../task013r1/harness-spatial";

export interface GarmentWorldBounds {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
}

export interface GarmentSpatialMeasurement
  extends HierarchySpatialMeasurement {
  readonly accessorySocketToAnchorErrors: readonly number[];
  readonly garmentSeamErrors: readonly number[];
  readonly unknownSlotCount: number;
  readonly duplicateActiveGarmentCount: number;
  readonly duplicateActiveAccessoryCount: number;
  readonly frontBackRoleViolationCount: number;
}

export function garmentSeamOverlap(
  first: GarmentWorldBounds,
  second: GarmentWorldBounds,
): number {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) -
      Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.top, second.top) -
      Math.max(first.bottom, second.bottom),
  );
  return Math.min(width, height);
}

export function garmentSeamError(
  first: GarmentWorldBounds,
  second: GarmentWorldBounds,
  minimumOverlap: number,
): number {
  if (!Number.isFinite(minimumOverlap) || minimumOverlap <= 0) {
    throw new Error("TASK_013R5_SEAM_MINIMUM_INVALID");
  }
  const values = [
    first.left,
    first.right,
    first.bottom,
    first.top,
    second.left,
    second.right,
    second.bottom,
    second.top,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("TASK_013R5_SEAM_SPATIAL_NON_FINITE");
  }
  return Math.max(0, minimumOverlap - garmentSeamOverlap(first, second));
}

export function validateGarmentSpatialMeasurement(
  measurement: GarmentSpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  validateHierarchySpatialMeasurement(measurement, tolerance);
  const spatialErrors = [
    ...measurement.accessorySocketToAnchorErrors,
    ...measurement.garmentSeamErrors,
  ];
  if (spatialErrors.some((error) => !Number.isFinite(error))) {
    throw new Error("TASK_013R5_SPATIAL_NON_FINITE");
  }
  const maximum =
    spatialErrors.length === 0 ? 0 : Math.max(...spatialErrors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R5_SPATIAL_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    measurement.unknownSlotCount !== 0 ||
    measurement.duplicateActiveGarmentCount !== 0 ||
    measurement.duplicateActiveAccessoryCount !== 0 ||
    measurement.frontBackRoleViolationCount !== 0
  ) {
    throw new Error("TASK_013R5_RUNTIME_INVALID");
  }
}

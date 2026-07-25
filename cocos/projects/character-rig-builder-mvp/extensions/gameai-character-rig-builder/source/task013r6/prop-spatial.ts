import {
  HARNESS_SPATIAL_TOLERANCE_PX,
} from "../task013r1/harness-spatial.js";
import {
  validateGarmentSpatialMeasurement,
  type GarmentSpatialMeasurement,
} from "../task013r5/garment-spatial.js";

export interface PropSpatialMeasurement
  extends GarmentSpatialMeasurement {
  readonly propSocketToGripErrors: readonly number[];
  readonly unknownHandSocketCount: number;
  readonly duplicateActivePropCount: number;
  readonly activePrimaryPropCount: number;
  readonly expectedPrimaryPropCount: number;
}

export function validatePropSpatialMeasurement(
  measurement: PropSpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  validateGarmentSpatialMeasurement(measurement, tolerance);
  if (
    measurement.propSocketToGripErrors.some(
      (error) => !Number.isFinite(error),
    )
  ) {
    throw new Error("TASK_013R6_GRIP_SPATIAL_NON_FINITE");
  }
  const maximum =
    measurement.propSocketToGripErrors.length === 0
      ? 0
      : Math.max(...measurement.propSocketToGripErrors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R6_GRIP_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    measurement.unknownHandSocketCount !== 0 ||
    measurement.duplicateActivePropCount !== 0 ||
    measurement.activePrimaryPropCount !==
      measurement.expectedPrimaryPropCount
  ) {
    throw new Error("TASK_013R6_PROP_RUNTIME_INVALID");
  }
}

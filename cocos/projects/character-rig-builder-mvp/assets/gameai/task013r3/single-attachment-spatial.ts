// Generated from the tested TASK-013R3 single-attachment boundary. Do not hand-edit.
import {
  HARNESS_SPATIAL_TOLERANCE_PX,
  validateHierarchySpatialMeasurement,
  type HierarchySpatialMeasurement,
} from "../task013r1/harness-spatial";

export interface SingleAttachmentSpatialMeasurement
  extends HierarchySpatialMeasurement {
  readonly socketToAnchorErrors: readonly number[];
  readonly unknownSlotCount: number;
  readonly duplicateAttachmentNodeCount: number;
}

export function validateSingleAttachmentSpatialMeasurement(
  measurement: SingleAttachmentSpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  validateHierarchySpatialMeasurement(measurement, tolerance);
  if (
    measurement.socketToAnchorErrors.length === 0 ||
    measurement.socketToAnchorErrors.some(
      (error) => !Number.isFinite(error),
    )
  ) {
    throw new Error("TASK_013R3_SOCKET_SPATIAL_NON_FINITE");
  }
  const maximum = Math.max(...measurement.socketToAnchorErrors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R3_SOCKET_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    measurement.unknownSlotCount !== 0 ||
    measurement.duplicateAttachmentNodeCount !== 0
  ) {
    throw new Error("TASK_013R3_ATTACHMENT_RUNTIME_INVALID");
  }
}

import {
  HARNESS_SPATIAL_TOLERANCE_PX,
  validateHierarchySpatialMeasurement,
  type HierarchySpatialMeasurement,
} from "../task013r1/harness-spatial.js";

export interface MultiAttachmentSpatialMeasurement
  extends HierarchySpatialMeasurement {
  readonly socketToAnchorErrors: readonly number[];
  readonly unknownSlotCount: number;
  readonly duplicateActiveAttachmentCount: number;
  readonly frontBackRoleViolationCount: number;
}

export function validateMultiAttachmentSpatialMeasurement(
  measurement: MultiAttachmentSpatialMeasurement,
  tolerance = HARNESS_SPATIAL_TOLERANCE_PX,
): void {
  validateHierarchySpatialMeasurement(measurement, tolerance);
  if (
    measurement.socketToAnchorErrors.some(
      (error) => !Number.isFinite(error),
    )
  ) {
    throw new Error("TASK_013R4_SOCKET_SPATIAL_NON_FINITE");
  }
  const maximum =
    measurement.socketToAnchorErrors.length === 0
      ? 0
      : Math.max(...measurement.socketToAnchorErrors);
  if (maximum > tolerance) {
    throw new Error(
      `TASK_013R4_SOCKET_TOLERANCE_EXCEEDED: ${maximum.toFixed(6)}`,
    );
  }
  if (
    measurement.unknownSlotCount !== 0 ||
    measurement.duplicateActiveAttachmentCount !== 0 ||
    measurement.frontBackRoleViolationCount !== 0
  ) {
    throw new Error("TASK_013R4_ATTACHMENT_RUNTIME_INVALID");
  }
}

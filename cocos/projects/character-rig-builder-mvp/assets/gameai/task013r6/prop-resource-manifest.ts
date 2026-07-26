// Generated from the tested TASK-013R6 prop boundary. Do not hand-edit.
import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
  type HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest";
import {
  garmentAttachmentResourceLogicalId,
} from "../task013r5/garment-resource-manifest";
import {
  validatePropBridgePlan,
  type PropBridgePlan,
} from "./prop-bridge-runtime-contract";

export function propAttachmentResourceLogicalId(
  attachmentId: string,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(attachmentId)) {
    throw new Error(
      `TASK_013R6_PROP_RESOURCE_ID_INVALID: ${attachmentId}`,
    );
  }
  return `prop-attachment-${attachmentId}`;
}

export function createPropResourceManifest(
  plan: PropBridgePlan,
): readonly HarnessResolvedResource[] {
  validatePropBridgePlan(plan);
  const logical: readonly HarnessLogicalResource[] = [
    ...plan.garment.base.parts.map((part) =>
      Object.freeze({
        logicalId: `part-${part.jointId}`,
        relativePath: part.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
    ...plan.garment.attachments.map((attachment) =>
      Object.freeze({
        logicalId: garmentAttachmentResourceLogicalId(
          attachment.attachmentId,
        ),
        relativePath: attachment.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
    ...plan.attachments.map((attachment) =>
      Object.freeze({
        logicalId: propAttachmentResourceLogicalId(
          attachment.attachmentId,
        ),
        relativePath: attachment.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
  ];
  return resolveLogicalResourceManifest(logical, "", "TASK_013R6");
}

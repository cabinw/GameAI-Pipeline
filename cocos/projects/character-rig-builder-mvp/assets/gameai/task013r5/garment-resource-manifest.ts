// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.
import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
  type HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest";
import {
  validateGarmentBridgePlan,
  type GarmentBridgePlan,
} from "./garment-bridge-runtime-contract";

export function garmentAttachmentResourceLogicalId(
  attachmentId: string,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(attachmentId)) {
    throw new Error(
      `TASK_013R5_ATTACHMENT_RESOURCE_ID_INVALID: ${attachmentId}`,
    );
  }
  return `attachment-${attachmentId}`;
}

export function createGarmentResourceManifest(
  plan: GarmentBridgePlan,
): readonly HarnessResolvedResource[] {
  validateGarmentBridgePlan(plan);
  const logical: readonly HarnessLogicalResource[] = [
    ...plan.base.parts.map((part) =>
      Object.freeze({
        logicalId: `part-${part.jointId}`,
        relativePath: part.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
    ...plan.attachments.map((attachment) =>
      Object.freeze({
        logicalId: garmentAttachmentResourceLogicalId(
          attachment.attachmentId,
        ),
        relativePath: attachment.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
  ];
  return resolveLogicalResourceManifest(logical, "", "TASK_013R5");
}

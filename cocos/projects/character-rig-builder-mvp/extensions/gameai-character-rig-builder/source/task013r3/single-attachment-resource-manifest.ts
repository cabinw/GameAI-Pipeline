import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
  type HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest.js";
import {
  validateSingleAttachmentBridgePlan,
  type SingleAttachmentBridgePlan,
} from "./single-attachment-runtime-contract.js";

export function attachmentResourceLogicalId(
  attachmentId: string,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(attachmentId)) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_RESOURCE_ID_INVALID: ${attachmentId}`,
    );
  }
  return `attachment-${attachmentId}`;
}

export function createSingleAttachmentResourceManifest(
  plan: SingleAttachmentBridgePlan,
): readonly HarnessResolvedResource[] {
  validateSingleAttachmentBridgePlan(plan);
  const logical: readonly HarnessLogicalResource[] = [
    ...plan.base.parts.map((part) =>
      Object.freeze({
        logicalId: `part-${part.jointId}`,
        relativePath: part.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
    Object.freeze({
      logicalId: attachmentResourceLogicalId(
        plan.attachment.attachmentId,
      ),
      relativePath: plan.attachment.resourcePath,
      kind: "sprite-frame" as const,
    }),
  ];
  return resolveLogicalResourceManifest(logical, "", "TASK_013R3");
}

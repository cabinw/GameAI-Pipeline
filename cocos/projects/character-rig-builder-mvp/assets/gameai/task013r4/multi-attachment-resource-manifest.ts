// Generated from the tested TASK-013R4 multi-attachment boundary. Do not hand-edit.
import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
  type HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest";
import {
  validateMultiAttachmentBridgePlan,
  type MultiAttachmentBridgePlan,
} from "./multi-attachment-runtime-contract";

export function multiAttachmentResourceLogicalId(
  attachmentId: string,
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(attachmentId)) {
    throw new Error(
      `TASK_013R4_ATTACHMENT_RESOURCE_ID_INVALID: ${attachmentId}`,
    );
  }
  return `attachment-${attachmentId}`;
}

export function createMultiAttachmentResourceManifest(
  plan: MultiAttachmentBridgePlan,
): readonly HarnessResolvedResource[] {
  validateMultiAttachmentBridgePlan(plan);
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
        logicalId: multiAttachmentResourceLogicalId(
          attachment.attachmentId,
        ),
        relativePath: attachment.resourcePath,
        kind: "sprite-frame" as const,
      }),
    ),
  ];
  return resolveLogicalResourceManifest(logical, "", "TASK_013R4");
}

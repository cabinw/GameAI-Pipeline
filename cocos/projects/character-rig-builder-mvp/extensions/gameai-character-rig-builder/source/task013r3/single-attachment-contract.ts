import {
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type RigLayout,
} from "@gameai/character-contracts";

import {
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
} from "../task013r2/base-rig-contract.js";
import {
  resolveHarnessProductionSortingOrders,
} from "../task013r1/harness-sorting-registry.js";
import {
  requireSingleAttachmentPose,
  SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
  SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  type SingleAttachmentBridgePlan,
} from "./single-attachment-runtime-contract.js";

export * from "./single-attachment-runtime-contract.js";

export function buildSingleAttachmentBridgePlan(
  base: BaseRigBridgePlan,
  rigLayout: RigLayout,
  attachmentInput: unknown,
  selectedAttachmentId: string,
  dimensions: Readonly<{ width: number; height: number }>,
): SingleAttachmentBridgePlan {
  validateBaseRigBridgePlan(base);
  if (base.rigId !== rigLayout.layoutId) {
    throw new Error(
      `TASK_013R3_INCOMPATIBLE_BASE_RIG: ${base.rigId}->${rigLayout.layoutId}`,
    );
  }
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(selectedAttachmentId) ||
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_SELECTION_INVALID: ${selectedAttachmentId}`,
    );
  }

  const parsed = parseAttachmentLayout(
    JSON.stringify(attachmentInput),
    rigLayout,
  );
  if (!parsed.ok) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_CONTRACT_INVALID: ${JSON.stringify(parsed.errors)}`,
    );
  }
  const layout = parsed.value;
  const selected = resolveAttachmentLayout(layout).filter(
    (attachment) => attachment.attachmentId === selectedAttachmentId,
  );
  if (selected.length !== 1) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_NOT_UNIQUE: ${selectedAttachmentId}`,
    );
  }
  const resolved = selected[0]!;
  const slot = layout.slots.find(
    (candidate) => candidate.slotId === resolved.slotId,
  );
  if (slot === undefined) {
    throw new Error(`TASK_013R3_UNKNOWN_SLOT: ${resolved.slotId}`);
  }
  if (
    !base.parts.some((part) => part.jointId === resolved.parentPartId)
  ) {
    throw new Error(
      `TASK_013R3_UNKNOWN_ATTACHMENT_PARENT: ${resolved.parentPartId}`,
    );
  }

  const baseOnly = resolveAttachmentLayout(
    layout,
    { [slot.slotId]: false },
  ).find((attachment) => attachment.attachmentId === selectedAttachmentId);
  const enabled = resolveAttachmentLayout(
    layout,
    { [slot.slotId]: true },
  ).find((attachment) => attachment.attachmentId === selectedAttachmentId);
  if (baseOnly === undefined || enabled === undefined) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_STATE_MISSING: ${selectedAttachmentId}`,
    );
  }

  const sortingOrders = resolveHarnessProductionSortingOrders([
    ...base.parts.map((part) => ({
      semanticId: part.jointId,
      drawOrder: part.drawOrder,
    })),
    {
      semanticId: resolved.attachmentId,
      drawOrder: resolved.drawOrder,
    },
  ]);
  const attachmentSortingOrder = sortingOrders.get(resolved.attachmentId);
  if (attachmentSortingOrder === undefined) {
    throw new Error(
      `TASK_013R3_ATTACHMENT_SORTING_MISSING: ${resolved.attachmentId}`,
    );
  }

  const referenceScale = rigLayout.referenceScale;
  const fileWithoutExtension = resolved.file.replace(/\.png$/u, "");
  const resourcePath =
    `${layout.attachmentLayoutId}/${fileWithoutExtension}/spriteFrame`;
  const defaultStateId = resolved.enabled
    ? SINGLE_ATTACHMENT_ENABLED_STATE_ID
    : SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID;
  return Object.freeze({
    planVersion: "1.0.0",
    rigId: base.rigId,
    defaultStateId,
    base,
    baseSortingOrders: Object.freeze(
      Object.fromEntries(
        base.parts.map((part) => [
          part.jointId,
          sortingOrders.get(part.jointId)!,
        ]),
      ),
    ),
    slot: Object.freeze({
      slotId: slot.slotId,
      parentPartId: slot.parentPartId,
      transform: requireSingleAttachmentPose(
        slot.transform,
        `slot:${slot.slotId}`,
      ),
    }),
    attachment: Object.freeze({
      attachmentId: resolved.attachmentId,
      slotId: resolved.slotId,
      parentPartId: resolved.parentPartId,
      resourcePath,
      transform: requireSingleAttachmentPose(
        resolved.attachmentTransform,
        `attachment:${resolved.attachmentId}`,
      ),
      anchor: Object.freeze({ ...resolved.anchor }),
      visualOffset: Object.freeze({
        x:
          (0.5 - resolved.anchor.x) *
          dimensions.width *
          referenceScale,
        y:
          (resolved.anchor.y - 0.5) *
          dimensions.height *
          referenceScale,
      }),
      visualSize: Object.freeze({
        width: dimensions.width * referenceScale,
        height: dimensions.height * referenceScale,
      }),
      drawOrder: resolved.drawOrder,
      sortingOrder: attachmentSortingOrder,
      enabledByState: Object.freeze({
        [SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID]: baseOnly.enabled,
        [SINGLE_ATTACHMENT_ENABLED_STATE_ID]: enabled.enabled,
      }),
    }),
  });
}

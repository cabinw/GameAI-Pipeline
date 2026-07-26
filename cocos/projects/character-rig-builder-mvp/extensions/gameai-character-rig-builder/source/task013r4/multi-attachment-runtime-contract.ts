import {
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
  type BaseRigRestPose,
  type BaseRigVector2,
} from "../task013r2/base-rig-contract.js";
import {
  requireSingleAttachmentPose,
} from "../task013r3/single-attachment-runtime-contract.js";

export const MULTI_ATTACHMENT_BASE_ONLY_STATE_ID = "base-only";
export const MULTI_ATTACHMENT_GROUP_A_STATE_ID =
  "attachment-group-a-only";
export const MULTI_ATTACHMENT_GROUP_B_STATE_ID =
  "attachment-group-b-only";
export const MULTI_ATTACHMENT_COMBINED_STATE_ID = "all-attachments";

export const MULTI_ATTACHMENT_REQUIRED_STATE_IDS = Object.freeze([
  MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
  MULTI_ATTACHMENT_GROUP_A_STATE_ID,
  MULTI_ATTACHMENT_GROUP_B_STATE_ID,
  MULTI_ATTACHMENT_COMBINED_STATE_ID,
] as const);

export type MultiAttachmentStateId =
  (typeof MULTI_ATTACHMENT_REQUIRED_STATE_IDS)[number];

export type MultiAttachmentLayerRole = "back" | "front";

export interface MultiAttachmentStatePlan {
  readonly stateId: MultiAttachmentStateId;
  readonly hudLabel: string;
  readonly enabledAttachmentIds: readonly string[];
}

export interface MultiAttachmentSlotPlan {
  readonly slotId: string;
  readonly parentPartId: string;
  readonly transform: BaseRigRestPose;
}

export interface MultiAttachmentPlan {
  readonly attachmentId: string;
  readonly slotId: string;
  readonly parentPartId: string;
  readonly resourcePath: string;
  readonly transform: BaseRigRestPose;
  readonly anchor: BaseRigVector2;
  readonly visualOffset: BaseRigVector2;
  readonly visualSize: Readonly<{ width: number; height: number }>;
  readonly drawOrder: number;
  readonly sortingOrder: number;
  readonly layerRole?: MultiAttachmentLayerRole;
  readonly enabledByState: Readonly<
    Record<MultiAttachmentStateId, boolean>
  >;
}

export interface MultiAttachmentBridgePlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly defaultStateId: MultiAttachmentStateId;
  readonly base: BaseRigBridgePlan;
  readonly baseSortingOrders: Readonly<Record<string, number>>;
  readonly states: readonly MultiAttachmentStatePlan[];
  readonly slots: readonly MultiAttachmentSlotPlan[];
  readonly attachments: readonly MultiAttachmentPlan[];
}

export interface MultiAttachmentValidationSnapshot {
  readonly rigId: string;
  readonly partCount: number;
  readonly jointCount: number;
  readonly slotCount: number;
  readonly attachmentCount: number;
  readonly resourceCount: number;
  readonly stateAttachmentCounts: Readonly<
    Record<MultiAttachmentStateId, number>
  >;
  readonly defaultStateId: MultiAttachmentStateId;
}

function uniqueIds(
  values: readonly string[],
  diagnostic: string,
): void {
  if (
    values.some((value) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`TASK_013R4_${diagnostic}_INVALID`);
  }
}

export function validateMultiAttachmentBridgePlan(
  plan: MultiAttachmentBridgePlan,
): MultiAttachmentValidationSnapshot {
  const base = validateBaseRigBridgePlan(plan.base);
  if (
    plan.planVersion !== "1.0.0" ||
    plan.rigId !== base.rigId ||
    plan.attachments.length === 0 ||
    plan.slots.length === 0
  ) {
    throw new Error("TASK_013R4_PLAN_INVALID");
  }
  uniqueIds(
    plan.slots.map((slot) => slot.slotId),
    "SLOT_IDS",
  );
  uniqueIds(
    plan.attachments.map((attachment) => attachment.attachmentId),
    "ATTACHMENT_IDS",
  );
  uniqueIds(
    plan.states.map((state) => state.stateId),
    "STATE_IDS",
  );
  if (
    plan.states.length !== MULTI_ATTACHMENT_REQUIRED_STATE_IDS.length ||
    MULTI_ATTACHMENT_REQUIRED_STATE_IDS.some(
      (stateId) => !plan.states.some((state) => state.stateId === stateId),
    ) ||
    !MULTI_ATTACHMENT_REQUIRED_STATE_IDS.includes(plan.defaultStateId)
  ) {
    throw new Error("TASK_013R4_STATES_INVALID");
  }

  const slots = new Map(plan.slots.map((slot) => [slot.slotId, slot]));
  const attachmentIds = new Set(
    plan.attachments.map((attachment) => attachment.attachmentId),
  );
  for (const slot of plan.slots) {
    requireSingleAttachmentPose(slot.transform, `slot:${slot.slotId}`);
    if (
      !plan.base.parts.some(
        (part) => part.jointId === slot.parentPartId,
      )
    ) {
      throw new Error(
        `TASK_013R4_UNKNOWN_SLOT_PARENT: ${slot.parentPartId}`,
      );
    }
  }
  for (const attachment of plan.attachments) {
    const slot = slots.get(attachment.slotId);
    if (
      slot === undefined ||
      slot.parentPartId !== attachment.parentPartId ||
      !Number.isFinite(attachment.drawOrder) ||
      !Number.isInteger(attachment.sortingOrder) ||
      (
        attachment.layerRole !== undefined &&
        attachment.layerRole !== "back" &&
        attachment.layerRole !== "front"
      )
    ) {
      throw new Error(
        `TASK_013R4_ATTACHMENT_INVALID: ${attachment.attachmentId}`,
      );
    }
    requireSingleAttachmentPose(
      attachment.transform,
      `attachment:${attachment.attachmentId}`,
    );
    for (const stateId of MULTI_ATTACHMENT_REQUIRED_STATE_IDS) {
      if (typeof attachment.enabledByState[stateId] !== "boolean") {
        throw new Error(
          `TASK_013R4_ATTACHMENT_STATE_MISSING: ${attachment.attachmentId}:${stateId}`,
        );
      }
    }
  }
  for (const state of plan.states) {
    if (
      state.hudLabel.length === 0 ||
      new Set(state.enabledAttachmentIds).size !==
        state.enabledAttachmentIds.length ||
      state.enabledAttachmentIds.some(
        (attachmentId) => !attachmentIds.has(attachmentId),
      )
    ) {
      throw new Error(
        `TASK_013R4_STATE_PLAN_INVALID: ${state.stateId}`,
      );
    }
    const resolved = plan.attachments
      .filter((attachment) => attachment.enabledByState[state.stateId])
      .map((attachment) => attachment.attachmentId)
      .sort();
    if (
      JSON.stringify(resolved) !==
      JSON.stringify([...state.enabledAttachmentIds].sort())
    ) {
      throw new Error(
        `TASK_013R4_STATE_PLAN_MISMATCH: ${state.stateId}`,
      );
    }
  }

  const orders = [
    ...Object.values(plan.baseSortingOrders),
    ...plan.attachments.map((attachment) => attachment.sortingOrder),
  ];
  if (
    new Set(orders).size !== base.partCount + plan.attachments.length ||
    Object.keys(plan.baseSortingOrders).length !== base.partCount
  ) {
    throw new Error("TASK_013R4_SORTING_INVALID");
  }
  const baseById = new Map(
    plan.base.parts.map((part) => [part.jointId, part]),
  );
  for (const attachment of plan.attachments) {
    const parent = baseById.get(attachment.parentPartId)!;
    if (
      (
        attachment.layerRole === "back" &&
        attachment.drawOrder >= parent.drawOrder
      ) ||
      (
        attachment.layerRole === "front" &&
        attachment.drawOrder <= parent.drawOrder
      )
    ) {
      throw new Error(
        `TASK_013R4_LAYER_ROLE_INVALID: ${attachment.attachmentId}`,
      );
    }
  }

  const stateAttachmentCounts = Object.freeze(
    Object.fromEntries(
      plan.states.map((state) => [
        state.stateId,
        state.enabledAttachmentIds.length,
      ]),
    ) as Record<MultiAttachmentStateId, number>,
  );
  return Object.freeze({
    rigId: plan.rigId,
    partCount: base.partCount,
    jointCount: base.jointCount,
    slotCount: plan.slots.length,
    attachmentCount: plan.attachments.length,
    resourceCount: base.partCount + plan.attachments.length,
    stateAttachmentCounts,
    defaultStateId: plan.defaultStateId,
  });
}

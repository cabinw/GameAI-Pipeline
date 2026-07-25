import {
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
  type BaseRigRestPose,
  type BaseRigVector2,
} from "../task013r2/base-rig-contract.js";
import {
  requireSingleAttachmentPose,
} from "../task013r3/single-attachment-runtime-contract.js";

export const GARMENT_BASE_ONLY_STATE_ID = "base-only";
export const GARMENT_ONLY_STATE_ID = "garment-only";
export const GARMENT_ACCESSORIES_ONLY_STATE_ID = "accessories-only";
export const GARMENT_COMBINED_STATE_ID = "garment-and-accessories";

export const GARMENT_REQUIRED_STATE_IDS = Object.freeze([
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_ONLY_STATE_ID,
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
] as const);

export type GarmentBridgeStateId =
  (typeof GARMENT_REQUIRED_STATE_IDS)[number];
export type GarmentAttachmentCategory = "wearable" | "accessory";
export type GarmentLayerRole = "back" | "front" | "cover";

export interface GarmentStatePlan {
  readonly stateId: GarmentBridgeStateId;
  readonly hudLabel: string;
  readonly garmentEnabled: boolean;
  readonly accessoriesEnabled: boolean;
  readonly enabledAttachmentIds: readonly string[];
}

export interface GarmentSlotPlan {
  readonly slotId: string;
  readonly parentPartId: string;
  readonly transform: BaseRigRestPose;
}

export interface GarmentAttachmentPlan {
  readonly attachmentId: string;
  readonly slotId: string;
  readonly parentPartId: string;
  readonly category: GarmentAttachmentCategory;
  readonly wearableSetId?: string;
  readonly resourcePath: string;
  readonly transform: BaseRigRestPose;
  readonly anchor: BaseRigVector2;
  readonly visualOffset: BaseRigVector2;
  readonly visualSize: Readonly<{ width: number; height: number }>;
  readonly drawOrder: number;
  readonly sortingOrder: number;
  readonly layerRole?: GarmentLayerRole;
  readonly enabledByState: Readonly<
    Record<GarmentBridgeStateId, boolean>
  >;
}

export interface GarmentLocalBounds {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
}

export interface GarmentSeamItemPlan {
  readonly itemId: string;
  readonly itemKind: "base" | "attachment";
  readonly localBounds: GarmentLocalBounds;
}

export interface GarmentSeamPlan {
  readonly seamId: string;
  readonly first: GarmentSeamItemPlan;
  readonly second: GarmentSeamItemPlan;
  readonly minimumOverlap: number;
}

export interface GarmentBridgePlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly defaultStateId: GarmentBridgeStateId;
  readonly base: BaseRigBridgePlan;
  readonly baseSortingOrders: Readonly<Record<string, number>>;
  readonly wearableSetIds: readonly string[];
  readonly states: readonly GarmentStatePlan[];
  readonly slots: readonly GarmentSlotPlan[];
  readonly attachments: readonly GarmentAttachmentPlan[];
  readonly seams: readonly GarmentSeamPlan[];
}

export interface GarmentBridgeValidationSnapshot {
  readonly rigId: string;
  readonly partCount: number;
  readonly jointCount: number;
  readonly slotCount: number;
  readonly attachmentCount: number;
  readonly garmentPartCount: number;
  readonly accessoryPartCount: number;
  readonly seamCount: number;
  readonly resourceCount: number;
  readonly stateCounts: Readonly<
    Record<
      GarmentBridgeStateId,
      Readonly<{ garment: number; accessories: number; total: number }>
    >
  >;
  readonly defaultStateId: GarmentBridgeStateId;
}

function uniqueIds(values: readonly string[], diagnostic: string): void {
  if (
    values.some((value) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`TASK_013R5_${diagnostic}_INVALID`);
  }
}

function validateLocalBounds(
  bounds: GarmentLocalBounds,
  diagnostic: string,
): void {
  if (
    !Number.isFinite(bounds.left) ||
    !Number.isFinite(bounds.right) ||
    !Number.isFinite(bounds.bottom) ||
    !Number.isFinite(bounds.top) ||
    bounds.left >= bounds.right ||
    bounds.bottom >= bounds.top
  ) {
    throw new Error(`TASK_013R5_SEAM_BOUNDS_INVALID: ${diagnostic}`);
  }
}

export function validateGarmentBridgePlan(
  plan: GarmentBridgePlan,
): GarmentBridgeValidationSnapshot {
  const base = validateBaseRigBridgePlan(plan.base);
  if (
    plan.planVersion !== "1.0.0" ||
    plan.rigId !== base.rigId ||
    plan.attachments.length === 0 ||
    plan.slots.length === 0 ||
    plan.wearableSetIds.length === 0 ||
    plan.seams.length === 0
  ) {
    throw new Error("TASK_013R5_PLAN_INVALID");
  }
  uniqueIds(plan.slots.map((slot) => slot.slotId), "SLOT_IDS");
  uniqueIds(
    plan.attachments.map((attachment) => attachment.attachmentId),
    "ATTACHMENT_IDS",
  );
  uniqueIds(plan.wearableSetIds, "WEARABLE_SET_IDS");
  uniqueIds(plan.states.map((state) => state.stateId), "STATE_IDS");
  uniqueIds(plan.seams.map((seam) => seam.seamId), "SEAM_IDS");
  if (
    plan.states.length !== GARMENT_REQUIRED_STATE_IDS.length ||
    GARMENT_REQUIRED_STATE_IDS.some(
      (stateId) => !plan.states.some((state) => state.stateId === stateId),
    ) ||
    !GARMENT_REQUIRED_STATE_IDS.includes(plan.defaultStateId)
  ) {
    throw new Error("TASK_013R5_STATES_INVALID");
  }

  const slots = new Map(plan.slots.map((slot) => [slot.slotId, slot]));
  const baseIds = new Set(plan.base.parts.map((part) => part.jointId));
  const attachmentIds = new Set(
    plan.attachments.map((attachment) => attachment.attachmentId),
  );
  for (const slot of plan.slots) {
    requireSingleAttachmentPose(slot.transform, `slot:${slot.slotId}`);
    if (!baseIds.has(slot.parentPartId)) {
      throw new Error(
        `TASK_013R5_UNKNOWN_SLOT_PARENT: ${slot.parentPartId}`,
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
        !["back", "front", "cover"].includes(attachment.layerRole)
      ) ||
      (
        attachment.category === "wearable" &&
        (
          attachment.wearableSetId === undefined ||
          !plan.wearableSetIds.includes(attachment.wearableSetId)
        )
      ) ||
      (
        attachment.category === "accessory" &&
        attachment.wearableSetId !== undefined
      )
    ) {
      throw new Error(
        `TASK_013R5_ATTACHMENT_INVALID: ${attachment.attachmentId}`,
      );
    }
    requireSingleAttachmentPose(
      attachment.transform,
      `attachment:${attachment.attachmentId}`,
    );
    for (const stateId of GARMENT_REQUIRED_STATE_IDS) {
      if (typeof attachment.enabledByState[stateId] !== "boolean") {
        throw new Error(
          `TASK_013R5_ATTACHMENT_STATE_MISSING: ${attachment.attachmentId}:${stateId}`,
        );
      }
    }
  }

  for (const state of plan.states) {
    const enabled = plan.attachments
      .filter((attachment) => attachment.enabledByState[state.stateId])
      .map((attachment) => attachment.attachmentId)
      .sort();
    if (
      state.hudLabel.length === 0 ||
      new Set(state.enabledAttachmentIds).size !==
        state.enabledAttachmentIds.length ||
      state.enabledAttachmentIds.some(
        (attachmentId) => !attachmentIds.has(attachmentId),
      ) ||
      JSON.stringify(enabled) !==
        JSON.stringify([...state.enabledAttachmentIds].sort())
    ) {
      throw new Error(`TASK_013R5_STATE_PLAN_INVALID: ${state.stateId}`);
    }
  }

  const allItemIds = new Set([...baseIds, ...attachmentIds]);
  for (const seam of plan.seams) {
    if (
      !Number.isFinite(seam.minimumOverlap) ||
      seam.minimumOverlap <= 0 ||
      !allItemIds.has(seam.first.itemId) ||
      !allItemIds.has(seam.second.itemId) ||
      seam.first.itemId === seam.second.itemId ||
      (
        seam.first.itemKind === "base" &&
        !baseIds.has(seam.first.itemId)
      ) ||
      (
        seam.first.itemKind === "attachment" &&
        !attachmentIds.has(seam.first.itemId)
      ) ||
      (
        seam.second.itemKind === "base" &&
        !baseIds.has(seam.second.itemId)
      ) ||
      (
        seam.second.itemKind === "attachment" &&
        !attachmentIds.has(seam.second.itemId)
      )
    ) {
      throw new Error(`TASK_013R5_SEAM_INVALID: ${seam.seamId}`);
    }
    validateLocalBounds(seam.first.localBounds, `${seam.seamId}:first`);
    validateLocalBounds(seam.second.localBounds, `${seam.seamId}:second`);
  }

  const orders = [
    ...Object.values(plan.baseSortingOrders),
    ...plan.attachments.map((attachment) => attachment.sortingOrder),
  ];
  if (
    new Set(orders).size !== base.partCount + plan.attachments.length ||
    Object.keys(plan.baseSortingOrders).length !== base.partCount
  ) {
    throw new Error("TASK_013R5_SORTING_INVALID");
  }
  const stateCounts = Object.freeze(
    Object.fromEntries(
      plan.states.map((state) => {
        const active = plan.attachments.filter(
          (attachment) => attachment.enabledByState[state.stateId],
        );
        const garment = active.filter(
          (attachment) => attachment.category === "wearable",
        ).length;
        const accessories = active.length - garment;
        return [
          state.stateId,
          Object.freeze({
            garment,
            accessories,
            total: active.length,
          }),
        ];
      }),
    ) as Record<
      GarmentBridgeStateId,
      Readonly<{ garment: number; accessories: number; total: number }>
    >,
  );
  return Object.freeze({
    rigId: plan.rigId,
    partCount: base.partCount,
    jointCount: base.jointCount,
    slotCount: plan.slots.length,
    attachmentCount: plan.attachments.length,
    garmentPartCount: plan.attachments.filter(
      (attachment) => attachment.category === "wearable",
    ).length,
    accessoryPartCount: plan.attachments.filter(
      (attachment) => attachment.category === "accessory",
    ).length,
    seamCount: plan.seams.length,
    resourceCount: base.partCount + plan.attachments.length,
    stateCounts,
    defaultStateId: plan.defaultStateId,
  });
}

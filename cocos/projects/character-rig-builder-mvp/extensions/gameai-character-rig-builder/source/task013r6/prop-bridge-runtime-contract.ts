import {
  validateGarmentBridgePlan,
  type GarmentBridgePlan,
  type GarmentBridgeStateId,
} from "../task013r5/garment-bridge-runtime-contract.js";
import type {
  BaseRigRestPose,
  BaseRigVector2,
} from "../task013r2/base-rig-contract.js";
import {
  requireSingleAttachmentPose,
} from "../task013r3/single-attachment-runtime-contract.js";

export const PROP_NO_PROP_STATE_ID = "no-prop";
export const PROP_LEFT_HAND_STATE_ID = "left-hand-prop";
export const PROP_RIGHT_HAND_STATE_ID = "right-hand-prop";

export const PROP_REQUIRED_STATE_IDS = Object.freeze([
  PROP_NO_PROP_STATE_ID,
  PROP_LEFT_HAND_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
] as const);

export type PropStateId = (typeof PROP_REQUIRED_STATE_IDS)[number];
export type PropAttachmentKind = "prop" | "hand-overlay";
export type PropLayerRole =
  | "behind-target"
  | "in-front-of-target"
  | "target-overlay";
export type PropLoadoutStateId =
  `${GarmentBridgeStateId}-with-${PropStateId}`;

export interface PropLoadoutStatePlan {
  readonly stateId: PropLoadoutStateId;
  readonly garmentStateId: GarmentBridgeStateId;
  readonly propStateId: PropStateId;
  readonly hudLabel: string;
  readonly enabledGarmentAttachmentIds: readonly string[];
  readonly enabledPropAttachmentIds: readonly string[];
  readonly activePrimaryPropCount: number;
}

export interface PropSlotPlan {
  readonly slotId: string;
  readonly parentPartId: string;
  readonly targetSocketId: string;
  readonly transform: BaseRigRestPose;
}

export interface PropAttachmentPlan {
  readonly attachmentId: string;
  readonly slotId: string;
  readonly parentPartId: string;
  readonly targetSocketId: string;
  readonly propStateId: Exclude<PropStateId, "no-prop">;
  readonly attachmentKind: PropAttachmentKind;
  readonly resourcePath: string;
  readonly transform: BaseRigRestPose;
  readonly anchor: BaseRigVector2;
  readonly gripAnchor?: BaseRigVector2;
  readonly gripLocalOffset?: BaseRigVector2;
  readonly handOverlayAttachmentId?: string;
  readonly visualOffset: BaseRigVector2;
  readonly visualSize: Readonly<{ width: number; height: number }>;
  readonly drawOrder: number;
  readonly sortingOrder: number;
  readonly layerRole: PropLayerRole;
  readonly enabledByPropState: Readonly<Record<PropStateId, boolean>>;
}

export interface PropBridgePlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly defaultGarmentStateId: GarmentBridgeStateId;
  readonly defaultPropStateId: PropStateId;
  readonly defaultStateId: PropLoadoutStateId;
  readonly garment: GarmentBridgePlan;
  readonly states: readonly PropLoadoutStatePlan[];
  readonly slots: readonly PropSlotPlan[];
  readonly attachments: readonly PropAttachmentPlan[];
}

export interface PropBridgeValidationSnapshot {
  readonly rigId: string;
  readonly partCount: number;
  readonly jointCount: number;
  readonly garmentAttachmentCount: number;
  readonly propAttachmentCount: number;
  readonly primaryPropCount: number;
  readonly handOverlayCount: number;
  readonly resourceCount: number;
  readonly stateCount: number;
  readonly stateCounts: Readonly<
    Record<
      PropLoadoutStateId,
      Readonly<{
        garment: number;
        accessories: number;
        prop: number;
        overlays: number;
      }>
    >
  >;
  readonly defaultStateId: PropLoadoutStateId;
}

export function propLoadoutStateId(
  garmentStateId: GarmentBridgeStateId,
  propStateId: PropStateId,
): PropLoadoutStateId {
  return `${garmentStateId}-with-${propStateId}`;
}

function uniqueIds(values: readonly string[], diagnostic: string): void {
  if (
    values.some((value) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`TASK_013R6_${diagnostic}_INVALID`);
  }
}

export function validatePropBridgePlan(
  plan: PropBridgePlan,
): PropBridgeValidationSnapshot {
  const garment = validateGarmentBridgePlan(plan.garment);
  if (
    plan.planVersion !== "1.0.0" ||
    plan.rigId !== garment.rigId ||
    plan.defaultGarmentStateId !== plan.garment.defaultStateId ||
    !PROP_REQUIRED_STATE_IDS.includes(plan.defaultPropStateId) ||
    plan.defaultStateId !==
      propLoadoutStateId(
        plan.defaultGarmentStateId,
        plan.defaultPropStateId,
      ) ||
    plan.slots.length === 0 ||
    plan.attachments.length === 0
  ) {
    throw new Error("TASK_013R6_PLAN_INVALID");
  }
  uniqueIds(plan.slots.map((slot) => slot.slotId), "SLOT_IDS");
  uniqueIds(
    plan.attachments.map((attachment) => attachment.attachmentId),
    "ATTACHMENT_IDS",
  );
  uniqueIds(plan.states.map((state) => state.stateId), "STATE_IDS");

  const baseIds = new Set(
    plan.garment.base.parts.map((part) => part.jointId),
  );
  const socketIds = new Set<string>();
  const slots = new Map(plan.slots.map((slot) => [slot.slotId, slot]));
  for (const slot of plan.slots) {
    requireSingleAttachmentPose(slot.transform, `prop-slot:${slot.slotId}`);
    if (
      !baseIds.has(slot.parentPartId) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slot.targetSocketId) ||
      socketIds.has(slot.targetSocketId)
    ) {
      throw new Error(`TASK_013R6_PROP_SLOT_INVALID: ${slot.slotId}`);
    }
    socketIds.add(slot.targetSocketId);
  }

  const attachmentIds = new Set(
    plan.attachments.map((attachment) => attachment.attachmentId),
  );
  for (const attachment of plan.attachments) {
    const slot = slots.get(attachment.slotId);
    if (
      slot === undefined ||
      slot.parentPartId !== attachment.parentPartId ||
      slot.targetSocketId !== attachment.targetSocketId ||
      !["prop", "hand-overlay"].includes(attachment.attachmentKind) ||
      !["behind-target", "in-front-of-target", "target-overlay"].includes(
        attachment.layerRole,
      ) ||
      !Number.isFinite(attachment.drawOrder) ||
      !Number.isInteger(attachment.sortingOrder)
    ) {
      throw new Error(
        `TASK_013R6_PROP_ATTACHMENT_INVALID: ${attachment.attachmentId}`,
      );
    }
    requireSingleAttachmentPose(
      attachment.transform,
      `prop-attachment:${attachment.attachmentId}`,
    );
    if (
      attachment.attachmentKind === "prop" &&
      (
        attachment.gripAnchor === undefined ||
        attachment.gripLocalOffset === undefined ||
        attachment.handOverlayAttachmentId === undefined ||
        !attachmentIds.has(attachment.handOverlayAttachmentId)
      )
    ) {
      throw new Error(
        `TASK_013R6_PROP_GRIP_OR_OVERLAY_MISSING: ${attachment.attachmentId}`,
      );
    }
    if (
      attachment.attachmentKind === "hand-overlay" &&
      (
        attachment.gripAnchor !== undefined ||
        attachment.gripLocalOffset !== undefined ||
        attachment.handOverlayAttachmentId !== undefined
      )
    ) {
      throw new Error(
        `TASK_013R6_PROP_OVERLAY_INVALID: ${attachment.attachmentId}`,
      );
    }
    for (const stateId of PROP_REQUIRED_STATE_IDS) {
      if (typeof attachment.enabledByPropState[stateId] !== "boolean") {
        throw new Error(
          `TASK_013R6_PROP_ATTACHMENT_STATE_MISSING: ${attachment.attachmentId}:${stateId}`,
        );
      }
    }
  }

  const garmentStates = plan.garment.states;
  const requiredStateIds = garmentStates.flatMap((garmentState) =>
    PROP_REQUIRED_STATE_IDS.map((propStateId) =>
      propLoadoutStateId(garmentState.stateId, propStateId),
    ),
  );
  if (
    plan.states.length !== requiredStateIds.length ||
    requiredStateIds.some(
      (stateId) => !plan.states.some((state) => state.stateId === stateId),
    )
  ) {
    throw new Error("TASK_013R6_LOADOUT_STATES_INVALID");
  }

  const stateCounts = Object.freeze(
    Object.fromEntries(
      plan.states.map((state) => {
        const garmentState = garmentStates.find(
          (candidate) => candidate.stateId === state.garmentStateId,
        );
        const enabledProp = plan.attachments.filter(
          (attachment) =>
            attachment.enabledByPropState[state.propStateId],
        );
        const primaryPropCount = enabledProp.filter(
          (attachment) => attachment.attachmentKind === "prop",
        ).length;
        const overlayCount = enabledProp.length - primaryPropCount;
        const expectedPrimary = state.propStateId === PROP_NO_PROP_STATE_ID
          ? 0
          : 1;
        if (
          garmentState === undefined ||
          state.stateId !==
            propLoadoutStateId(
              state.garmentStateId,
              state.propStateId,
            ) ||
          JSON.stringify([...state.enabledGarmentAttachmentIds].sort()) !==
            JSON.stringify([...garmentState.enabledAttachmentIds].sort()) ||
          JSON.stringify([...state.enabledPropAttachmentIds].sort()) !==
            JSON.stringify(
              enabledProp.map((attachment) => attachment.attachmentId).sort(),
            ) ||
          state.activePrimaryPropCount !== expectedPrimary ||
          primaryPropCount !== expectedPrimary ||
          overlayCount !== expectedPrimary
        ) {
          throw new Error(
            `TASK_013R6_LOADOUT_STATE_INVALID: ${state.stateId}`,
          );
        }
        const garmentCounts = garment.stateCounts[state.garmentStateId];
        return [
          state.stateId,
          Object.freeze({
            garment: garmentCounts.garment,
            accessories: garmentCounts.accessories,
            prop: primaryPropCount,
            overlays: overlayCount,
          }),
        ];
      }),
    ) as Record<
      PropLoadoutStateId,
      Readonly<{
        garment: number;
        accessories: number;
        prop: number;
        overlays: number;
      }>
    >,
  );

  const allOrders = [
    ...Object.values(plan.garment.baseSortingOrders),
    ...plan.garment.attachments.map(
      (attachment) => attachment.sortingOrder,
    ),
    ...plan.attachments.map((attachment) => attachment.sortingOrder),
  ];
  const expectedOrderCount =
    garment.partCount +
    plan.garment.attachments.length +
    plan.attachments.length;
  if (
    allOrders.length !== expectedOrderCount ||
    new Set(allOrders).size !== expectedOrderCount
  ) {
    throw new Error("TASK_013R6_GLOBAL_SORTING_INVALID");
  }

  return Object.freeze({
    rigId: plan.rigId,
    partCount: garment.partCount,
    jointCount: garment.jointCount,
    garmentAttachmentCount: plan.garment.attachments.length,
    propAttachmentCount: plan.attachments.length,
    primaryPropCount: plan.attachments.filter(
      (attachment) => attachment.attachmentKind === "prop",
    ).length,
    handOverlayCount: plan.attachments.filter(
      (attachment) => attachment.attachmentKind === "hand-overlay",
    ).length,
    resourceCount:
      garment.partCount +
      plan.garment.attachments.length +
      plan.attachments.length,
    stateCount: plan.states.length,
    stateCounts,
    defaultStateId: plan.defaultStateId,
  });
}

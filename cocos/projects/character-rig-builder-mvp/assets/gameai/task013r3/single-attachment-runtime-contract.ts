// Generated from the tested TASK-013R3 single-attachment boundary. Do not hand-edit.
import {
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
  type BaseRigRestPose,
  type BaseRigVector2,
} from "../task013r2/base-rig-contract";

export const SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID = "base-only";
export const SINGLE_ATTACHMENT_ENABLED_STATE_ID = "attachment-enabled";

export type SingleAttachmentStateId =
  | typeof SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID
  | typeof SINGLE_ATTACHMENT_ENABLED_STATE_ID;

export interface SingleAttachmentSlotPlan {
  readonly slotId: string;
  readonly parentPartId: string;
  readonly transform: BaseRigRestPose;
}

export interface SingleAttachmentPlan {
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
  readonly enabledByState: Readonly<Record<SingleAttachmentStateId, boolean>>;
}

export interface SingleAttachmentBridgePlan {
  readonly planVersion: "1.0.0";
  readonly rigId: string;
  readonly defaultStateId: SingleAttachmentStateId;
  readonly base: BaseRigBridgePlan;
  readonly baseSortingOrders: Readonly<Record<string, number>>;
  readonly slot: SingleAttachmentSlotPlan;
  readonly attachment: SingleAttachmentPlan;
}

export function requireSingleAttachmentPose(
  pose: BaseRigRestPose,
  diagnostic: string,
): BaseRigRestPose {
  if (
    !Number.isFinite(pose.position.x) ||
    !Number.isFinite(pose.position.y) ||
    !Number.isFinite(pose.rotationDegrees) ||
    !Number.isFinite(pose.scale.x) ||
    !Number.isFinite(pose.scale.y) ||
    pose.scale.x === 0 ||
    pose.scale.y === 0
  ) {
    throw new Error(`TASK_013R3_INVALID_TRANSFORM: ${diagnostic}`);
  }
  return Object.freeze({
    position: Object.freeze({ ...pose.position }),
    rotationDegrees: pose.rotationDegrees,
    scale: Object.freeze({ ...pose.scale }),
  });
}

export interface SingleAttachmentValidationSnapshot {
  readonly rigId: string;
  readonly partCount: number;
  readonly jointCount: number;
  readonly attachmentCount: 1;
  readonly resourceCount: number;
  readonly defaultStateId: SingleAttachmentStateId;
}

export function validateSingleAttachmentBridgePlan(
  plan: SingleAttachmentBridgePlan,
): SingleAttachmentValidationSnapshot {
  const base = validateBaseRigBridgePlan(plan.base);
  if (
    plan.planVersion !== "1.0.0" ||
    plan.rigId !== base.rigId ||
    plan.slot.slotId !== plan.attachment.slotId ||
    plan.slot.parentPartId !== plan.attachment.parentPartId ||
    !plan.base.parts.some(
      (part) => part.jointId === plan.slot.parentPartId,
    ) ||
    plan.attachment.enabledByState[SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID] ||
    !plan.attachment.enabledByState[SINGLE_ATTACHMENT_ENABLED_STATE_ID] ||
    (
      plan.defaultStateId !== SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID &&
      plan.defaultStateId !== SINGLE_ATTACHMENT_ENABLED_STATE_ID
    )
  ) {
    throw new Error("TASK_013R3_PLAN_INVALID");
  }
  const orders = [
    ...Object.values(plan.baseSortingOrders),
    plan.attachment.sortingOrder,
  ];
  if (
    new Set(orders).size !== plan.base.parts.length + 1 ||
    Object.keys(plan.baseSortingOrders).length !== plan.base.parts.length
  ) {
    throw new Error("TASK_013R3_SORTING_INVALID");
  }
  requireSingleAttachmentPose(
    plan.slot.transform,
    `slot:${plan.slot.slotId}`,
  );
  requireSingleAttachmentPose(
    plan.attachment.transform,
    `attachment:${plan.attachment.attachmentId}`,
  );
  return Object.freeze({
    rigId: plan.rigId,
    partCount: base.partCount,
    jointCount: base.jointCount,
    attachmentCount: 1,
    resourceCount: base.partCount + 1,
    defaultStateId: plan.defaultStateId,
  });
}

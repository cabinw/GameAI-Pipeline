import {
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import type {
  MultiAttachmentPlan,
  MultiAttachmentSlotPlan,
  MultiAttachmentStateId,
} from "./multi-attachment-runtime-contract";
import { multiAttachmentResourceLogicalId } from "./multi-attachment-resource-manifest";
import {
  setRuntimePose,
  type BaseRigRuntimeJoint,
} from "../task013r3/base-rig-runtime-builder";

export interface BuiltMultiAttachmentBinding {
  readonly plan: MultiAttachmentPlan;
  readonly slotNode: Node;
  readonly attachmentNode: Node;
  readonly visualNode: Node;
  readonly visualTransform: UITransform;
}

export interface BuiltMultiAttachmentRuntime {
  readonly slots: ReadonlyMap<string, Node>;
  readonly attachments: ReadonlyMap<
    string,
    BuiltMultiAttachmentBinding
  >;
}

function runtimeNode(name: string, parent: Node): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  return node;
}

export function buildMultiAttachmentRuntime(
  slots: readonly MultiAttachmentSlotPlan[],
  attachments: readonly MultiAttachmentPlan[],
  joints: ReadonlyMap<string, BaseRigRuntimeJoint>,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
): BuiltMultiAttachmentRuntime {
  const slotNodes = new Map<string, Node>();
  for (const slot of slots) {
    if (slotNodes.has(slot.slotId)) {
      throw new Error(`TASK_013R4_DUPLICATE_RUNTIME_SLOT: ${slot.slotId}`);
    }
    const parent = joints.get(slot.parentPartId);
    if (parent === undefined) {
      throw new Error(
        `TASK_013R4_UNKNOWN_RUNTIME_SLOT_PARENT: ${slot.parentPartId}`,
      );
    }
    const slotNode = runtimeNode(`Slot_${slot.slotId}`, parent.node);
    setRuntimePose(slotNode, slot.transform);
    slotNodes.set(slot.slotId, slotNode);
  }

  const bindings = new Map<string, BuiltMultiAttachmentBinding>();
  for (const attachment of attachments) {
    if (bindings.has(attachment.attachmentId)) {
      throw new Error(
        `TASK_013R4_DUPLICATE_RUNTIME_ATTACHMENT: ${attachment.attachmentId}`,
      );
    }
    const slotNode = slotNodes.get(attachment.slotId);
    if (slotNode === undefined) {
      throw new Error(
        `TASK_013R4_UNKNOWN_RUNTIME_SLOT: ${attachment.slotId}`,
      );
    }
    const attachmentNode = runtimeNode(
      `Attachment_${attachment.attachmentId}`,
      slotNode,
    );
    setRuntimePose(attachmentNode, attachment.transform);
    const visualNode = runtimeNode(
      `Visual_${attachment.attachmentId}`,
      attachmentNode,
    );
    visualNode.setPosition(
      attachment.visualOffset.x,
      attachment.visualOffset.y,
      0,
    );
    const visualTransform = visualNode.addComponent(UITransform);
    visualTransform.setAnchorPoint(0.5, 0.5);
    visualTransform.setContentSize(
      attachment.visualSize.width,
      attachment.visualSize.height,
    );
    const sprite = visualNode.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const frame = spriteFrames.get(
      multiAttachmentResourceLogicalId(attachment.attachmentId),
    );
    if (frame === undefined) {
      throw new Error(
        `TASK_013R4_RESOURCE_NOT_AVAILABLE_FOR_ATTACHMENT: ${attachment.attachmentId}`,
      );
    }
    sprite.spriteFrame = frame;
    visualNode.addComponent(Sorting2D).sortingOrder =
      attachment.sortingOrder;
    bindings.set(
      attachment.attachmentId,
      Object.freeze({
        plan: attachment,
        slotNode,
        attachmentNode,
        visualNode,
        visualTransform,
      }),
    );
  }
  return Object.freeze({
    slots: slotNodes,
    attachments: bindings,
  });
}

export function applyMultiAttachmentState(
  runtime: BuiltMultiAttachmentRuntime,
  stateId: MultiAttachmentStateId,
): number {
  let activeCount = 0;
  for (const binding of runtime.attachments.values()) {
    const enabled = binding.plan.enabledByState[stateId];
    if (enabled === undefined) {
      throw new Error(
        `TASK_013R4_UNKNOWN_RESOLVED_ATTACHMENT_STATE: ${stateId}`,
      );
    }
    binding.attachmentNode.active = enabled;
    if (enabled) activeCount += 1;
  }
  return activeCount;
}

export function duplicateActiveAttachmentCount(
  runtime: BuiltMultiAttachmentRuntime,
): number {
  let duplicates = 0;
  for (const [attachmentId, binding] of runtime.attachments) {
    if (!binding.attachmentNode.active) continue;
    const expectedName = `Attachment_${attachmentId}`;
    duplicates += Math.max(
      0,
      binding.slotNode.children.filter(
        (child) => child.active && child.name === expectedName,
      ).length - 1,
    );
  }
  return duplicates;
}

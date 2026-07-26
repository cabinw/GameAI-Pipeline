import {
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import type {
  GarmentAttachmentPlan,
  GarmentBridgeStateId,
  GarmentSlotPlan,
} from "./garment-bridge-runtime-contract";
import {
  garmentAttachmentResourceLogicalId,
} from "./garment-resource-manifest";
import {
  setRuntimePose,
  type BaseRigRuntimeJoint,
} from "../task013r3/base-rig-runtime-builder";

export interface BuiltGarmentAttachmentBinding {
  readonly plan: GarmentAttachmentPlan;
  readonly slotNode: Node;
  readonly attachmentNode: Node;
  readonly visualNode: Node;
  readonly visualTransform: UITransform;
}

export interface BuiltGarmentRuntime {
  readonly slots: ReadonlyMap<string, Node>;
  readonly attachments: ReadonlyMap<
    string,
    BuiltGarmentAttachmentBinding
  >;
}

export interface AppliedGarmentStateCounts {
  readonly active: number;
  readonly garment: number;
  readonly accessories: number;
}

function runtimeNode(name: string, parent: Node): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  return node;
}

export function buildGarmentRuntime(
  slots: readonly GarmentSlotPlan[],
  attachments: readonly GarmentAttachmentPlan[],
  joints: ReadonlyMap<string, BaseRigRuntimeJoint>,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
): BuiltGarmentRuntime {
  const slotNodes = new Map<string, Node>();
  for (const slot of slots) {
    if (slotNodes.has(slot.slotId)) {
      throw new Error(`TASK_013R5_DUPLICATE_RUNTIME_SLOT: ${slot.slotId}`);
    }
    const parent = joints.get(slot.parentPartId);
    if (parent === undefined) {
      throw new Error(
        `TASK_013R5_UNKNOWN_RUNTIME_SLOT_PARENT: ${slot.parentPartId}`,
      );
    }
    const slotNode = runtimeNode(`Slot_${slot.slotId}`, parent.node);
    setRuntimePose(slotNode, slot.transform);
    slotNodes.set(slot.slotId, slotNode);
  }

  const bindings = new Map<string, BuiltGarmentAttachmentBinding>();
  for (const attachment of attachments) {
    if (bindings.has(attachment.attachmentId)) {
      throw new Error(
        `TASK_013R5_DUPLICATE_RUNTIME_ATTACHMENT: ${attachment.attachmentId}`,
      );
    }
    const slotNode = slotNodes.get(attachment.slotId);
    if (slotNode === undefined) {
      throw new Error(
        `TASK_013R5_UNKNOWN_RUNTIME_SLOT: ${attachment.slotId}`,
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
      garmentAttachmentResourceLogicalId(attachment.attachmentId),
    );
    if (frame === undefined) {
      throw new Error(
        `TASK_013R5_RESOURCE_NOT_AVAILABLE_FOR_ATTACHMENT: ${attachment.attachmentId}`,
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

export function applyGarmentState(
  runtime: BuiltGarmentRuntime,
  stateId: GarmentBridgeStateId,
): AppliedGarmentStateCounts {
  let active = 0;
  let garment = 0;
  let accessories = 0;
  for (const binding of runtime.attachments.values()) {
    const enabled = binding.plan.enabledByState[stateId];
    if (enabled === undefined) {
      throw new Error(
        `TASK_013R5_UNKNOWN_RESOLVED_STATE: ${stateId}`,
      );
    }
    binding.attachmentNode.active = enabled;
    if (!enabled) continue;
    active += 1;
    if (binding.plan.category === "wearable") garment += 1;
    else accessories += 1;
  }
  return Object.freeze({ active, garment, accessories });
}

export function duplicateActiveGarmentCounts(
  runtime: BuiltGarmentRuntime,
): Readonly<{ garment: number; accessories: number }> {
  let garment = 0;
  let accessories = 0;
  for (const [attachmentId, binding] of runtime.attachments) {
    if (!binding.attachmentNode.active) continue;
    const expectedName = `Attachment_${attachmentId}`;
    const duplicates = Math.max(
      0,
      binding.slotNode.children.filter(
        (child) => child.active && child.name === expectedName,
      ).length - 1,
    );
    if (binding.plan.category === "wearable") garment += duplicates;
    else accessories += duplicates;
  }
  return Object.freeze({ garment, accessories });
}

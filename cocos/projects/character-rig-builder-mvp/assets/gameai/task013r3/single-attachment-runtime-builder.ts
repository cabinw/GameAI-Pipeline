import {
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import type {
  SingleAttachmentPlan,
  SingleAttachmentSlotPlan,
} from "./single-attachment-runtime-contract";
import { attachmentResourceLogicalId } from "./single-attachment-resource-manifest";
import {
  setRuntimePose,
  type BaseRigRuntimeJoint,
} from "./base-rig-runtime-builder";

export interface BuiltSingleAttachmentRuntime {
  readonly slotNode: Node;
  readonly attachmentNode: Node;
  readonly visualNode: Node;
  readonly visualTransform: UITransform;
}

function runtimeNode(name: string, parent: Node): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  return node;
}

export function buildSingleAttachmentRuntime(
  slot: SingleAttachmentSlotPlan,
  attachment: SingleAttachmentPlan,
  joints: ReadonlyMap<string, BaseRigRuntimeJoint>,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
): BuiltSingleAttachmentRuntime {
  if (
    attachment.slotId !== slot.slotId ||
    attachment.parentPartId !== slot.parentPartId
  ) {
    throw new Error("TASK_013R3_ATTACHMENT_SLOT_MISMATCH");
  }
  const parent = joints.get(slot.parentPartId);
  if (parent === undefined) {
    throw new Error(
      `TASK_013R3_UNKNOWN_RUNTIME_SLOT_PARENT: ${slot.parentPartId}`,
    );
  }
  const slotNode = runtimeNode(`Slot_${slot.slotId}`, parent.node);
  setRuntimePose(slotNode, slot.transform);
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
    attachmentResourceLogicalId(attachment.attachmentId),
  );
  if (frame === undefined) {
    throw new Error(
      `TASK_013R3_RESOURCE_NOT_AVAILABLE_FOR_ATTACHMENT: ${attachment.attachmentId}`,
    );
  }
  sprite.spriteFrame = frame;
  visualNode.addComponent(Sorting2D).sortingOrder =
    attachment.sortingOrder;
  return Object.freeze({
    slotNode,
    attachmentNode,
    visualNode,
    visualTransform,
  });
}

export function setSingleAttachmentEnabled(
  runtime: BuiltSingleAttachmentRuntime,
  enabled: boolean,
): void {
  runtime.attachmentNode.active = enabled;
}

export function countSingleAttachmentNodes(
  runtime: BuiltSingleAttachmentRuntime,
  attachmentId: string,
): number {
  const expectedName = `Attachment_${attachmentId}`;
  return runtime.slotNode.children.filter(
    (child) => child.name === expectedName,
  ).length;
}

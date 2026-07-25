import {
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import type {
  PropAttachmentPlan,
  PropSlotPlan,
  PropStateId,
} from "./prop-bridge-runtime-contract";
import {
  propAttachmentResourceLogicalId,
} from "./prop-resource-manifest";
import {
  setRuntimePose,
  type BaseRigRuntimeJoint,
} from "../task013r3/base-rig-runtime-builder";

export interface BuiltPropAttachmentBinding {
  readonly plan: PropAttachmentPlan;
  readonly slotNode: Node;
  readonly attachmentNode: Node;
  readonly gripNode: Node | null;
  readonly visualNode: Node;
  readonly visualTransform: UITransform;
}

export interface BuiltPropRuntime {
  readonly slots: ReadonlyMap<string, Node>;
  readonly attachments: ReadonlyMap<
    string,
    BuiltPropAttachmentBinding
  >;
}

export interface AppliedPropStateCounts {
  readonly active: number;
  readonly primaryProps: number;
  readonly overlays: number;
}

function runtimeNode(name: string, parent: Node): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  return node;
}

export function buildPropRuntime(
  slots: readonly PropSlotPlan[],
  attachments: readonly PropAttachmentPlan[],
  joints: ReadonlyMap<string, BaseRigRuntimeJoint>,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
): BuiltPropRuntime {
  const slotNodes = new Map<string, Node>();
  for (const slot of slots) {
    if (slotNodes.has(slot.slotId)) {
      throw new Error(
        `TASK_013R6_DUPLICATE_RUNTIME_PROP_SLOT: ${slot.slotId}`,
      );
    }
    const parent = joints.get(slot.parentPartId);
    if (parent === undefined) {
      throw new Error(
        `TASK_013R6_UNKNOWN_RUNTIME_HAND_PARENT: ${slot.parentPartId}`,
      );
    }
    const slotNode = runtimeNode(`PropSlot_${slot.slotId}`, parent.node);
    setRuntimePose(slotNode, slot.transform);
    slotNodes.set(slot.slotId, slotNode);
  }

  const bindings = new Map<string, BuiltPropAttachmentBinding>();
  for (const attachment of attachments) {
    if (bindings.has(attachment.attachmentId)) {
      throw new Error(
        `TASK_013R6_DUPLICATE_RUNTIME_PROP_ATTACHMENT: ${attachment.attachmentId}`,
      );
    }
    const slotNode = slotNodes.get(attachment.slotId);
    if (slotNode === undefined) {
      throw new Error(
        `TASK_013R6_UNKNOWN_RUNTIME_PROP_SLOT: ${attachment.slotId}`,
      );
    }
    const attachmentNode = runtimeNode(
      `PropAttachment_${attachment.attachmentId}`,
      slotNode,
    );
    setRuntimePose(attachmentNode, attachment.transform);
    const gripNode =
      attachment.attachmentKind === "prop"
        ? runtimeNode(`Grip_${attachment.attachmentId}`, attachmentNode)
        : null;
    if (gripNode !== null) {
      const offset = attachment.gripLocalOffset;
      if (offset === undefined) {
        throw new Error(
          `TASK_013R6_RUNTIME_GRIP_OFFSET_MISSING: ${attachment.attachmentId}`,
        );
      }
      gripNode.setPosition(offset.x, offset.y, 0);
    }
    const visualNode = runtimeNode(
      `PropVisual_${attachment.attachmentId}`,
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
      propAttachmentResourceLogicalId(attachment.attachmentId),
    );
    if (frame === undefined) {
      throw new Error(
        `TASK_013R6_PROP_RESOURCE_NOT_AVAILABLE: ${attachment.attachmentId}`,
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
        gripNode,
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

export function applyPropState(
  runtime: BuiltPropRuntime,
  stateId: PropStateId,
): AppliedPropStateCounts {
  let active = 0;
  let primaryProps = 0;
  let overlays = 0;
  for (const binding of runtime.attachments.values()) {
    const enabled = binding.plan.enabledByPropState[stateId];
    if (enabled === undefined) {
      throw new Error(
        `TASK_013R6_UNKNOWN_RESOLVED_PROP_STATE: ${stateId}`,
      );
    }
    binding.attachmentNode.active = enabled;
    if (!enabled) continue;
    active += 1;
    if (binding.plan.attachmentKind === "prop") primaryProps += 1;
    else overlays += 1;
  }
  return Object.freeze({ active, primaryProps, overlays });
}

export function duplicateActivePropCounts(
  runtime: BuiltPropRuntime,
): Readonly<{ primaryProps: number; overlays: number }> {
  let primaryProps = 0;
  let overlays = 0;
  for (const [attachmentId, binding] of runtime.attachments) {
    if (!binding.attachmentNode.active) continue;
    const expectedName = `PropAttachment_${attachmentId}`;
    const duplicates = Math.max(
      0,
      binding.slotNode.children.filter(
        (child) => child.active && child.name === expectedName,
      ).length - 1,
    );
    if (binding.plan.attachmentKind === "prop") {
      primaryProps += duplicates;
    } else {
      overlays += duplicates;
    }
  }
  return Object.freeze({ primaryProps, overlays });
}

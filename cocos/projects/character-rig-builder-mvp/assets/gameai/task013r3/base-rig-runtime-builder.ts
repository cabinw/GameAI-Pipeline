import {
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import type {
  BaseRigBridgePlan,
  BaseRigRestPose,
} from "../task013r2/base-rig-contract";

export interface BaseRigRuntimeJoint {
  readonly node: Node;
  readonly visual: Node;
  readonly visualTransform: UITransform;
  readonly restPose: BaseRigRestPose;
  readonly part: BaseRigBridgePlan["parts"][number];
}

export interface BuiltBaseRigRuntime {
  readonly adapterRoot: Node;
  readonly nestedParent: Node;
  readonly joints: ReadonlyMap<string, BaseRigRuntimeJoint>;
}

function runtimeNode(name: string, parent: Node): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  return node;
}

export function setRuntimePose(
  node: Node,
  pose: BaseRigRestPose,
): void {
  node.setPosition(pose.position.x, pose.position.y, 0);
  node.setRotationFromEuler(0, 0, pose.rotationDegrees);
  node.setScale(pose.scale.x, pose.scale.y, 1);
}

export function buildBaseRigRuntime(
  parent: Node,
  plan: BaseRigBridgePlan,
  spriteFrames: ReadonlyMap<string, SpriteFrame>,
  sortingOrders: Readonly<Record<string, number>>,
): BuiltBaseRigRuntime {
  const adapterRoot = runtimeNode("AdapterRoot", parent);
  const nestedParent = runtimeNode("NestedTransform", adapterRoot);
  const joints = new Map<string, BaseRigRuntimeJoint>();
  const partsById = new Map(
    plan.parts.map((part) => [part.jointId, part] as const),
  );

  const createJoint = (
    part: BaseRigBridgePlan["parts"][number],
  ): BaseRigRuntimeJoint => {
    const existing = joints.get(part.jointId);
    if (existing !== undefined) return existing;
    const parentNode =
      part.parentId === null
        ? nestedParent
        : createJoint(
            partsById.get(part.parentId) ??
              (() => {
                throw new Error(
                  `TASK_013R3_UNKNOWN_RUNTIME_PARENT: ${part.parentId}`,
                );
              })(),
          ).node;
    const joint = runtimeNode(`Joint_${part.jointId}`, parentNode);
    setRuntimePose(joint, part.restPose);
    const visual = runtimeNode(`Visual_${part.jointId}`, joint);
    visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
    const visualTransform = visual.addComponent(UITransform);
    visualTransform.setAnchorPoint(0.5, 0.5);
    visualTransform.setContentSize(
      part.visualSize.width,
      part.visualSize.height,
    );
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const frame = spriteFrames.get(`part-${part.jointId}`);
    if (frame === undefined) {
      throw new Error(
        `TASK_013R3_RESOURCE_NOT_AVAILABLE_FOR_PART: ${part.jointId}`,
      );
    }
    sprite.spriteFrame = frame;
    const sortingOrder = sortingOrders[part.jointId];
    if (sortingOrder === undefined) {
      throw new Error(
        `TASK_013R3_SORTING_NOT_AVAILABLE_FOR_PART: ${part.jointId}`,
      );
    }
    visual.addComponent(Sorting2D).sortingOrder = sortingOrder;
    const binding: BaseRigRuntimeJoint = {
      node: joint,
      visual,
      visualTransform,
      restPose: part.restPose,
      part,
    };
    joints.set(part.jointId, binding);
    return binding;
  };

  for (const part of plan.parts) createJoint(part);
  if (joints.size !== plan.parts.length) {
    throw new Error(
      `TASK_013R3_RUNTIME_JOINT_COUNT_MISMATCH: ${joints.size}`,
    );
  }
  return Object.freeze({
    adapterRoot,
    nestedParent,
    joints,
  });
}

import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
  input,
  Input,
  KeyCode,
  Label,
  Layers,
  Node,
  resources,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UIOpacity,
  UITransform,
} from "cc";
import {
  RigAnimationPlayback,
  composeJointPose,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";
import type {
  JointRestPose,
  NormalizedRigAnimation,
  RigAnimationSample,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";

import { HEAD_ACCESSORY_LAYERING_PLAN } from "./head-accessory-layering-data";

const { ccclass, executeInEditMode, property } = _decorator;
type PartPlan = (typeof HEAD_ACCESSORY_LAYERING_PLAN.base.parts)[number];
type AttachmentPlan = (typeof HEAD_ACCESSORY_LAYERING_PLAN.attachments)[number];

interface JointBinding {
  readonly spriteJoint: Node;
  readonly skeletonJoint: Node;
  readonly restPose: JointRestPose;
}

@ccclass("GameAIHeadAccessoryLayeringDemo")
@executeInEditMode
export class GameAIHeadAccessoryLayeringDemo extends Component {
  @property autoplay = false;
  @property showJointMarkers = false;
  @property showSpriteBounds = false;
  @property showPivotMarkers = false;
  @property showParentLinks = false;
  @property showLayerLabels = false;
  @property showAttachmentSockets = false;

  private bindings = new Map<string, JointBinding>();
  private slotNodes = new Map<string, Node>();
  private attachmentNodesBySlot = new Map<string, Node[]>();
  private referenceSprite: Sprite | null = null;
  private clips: readonly NormalizedRigAnimation[] = [];
  private playback: RigAnimationPlayback | null = null;
  private statusLabel: Label | null = null;
  private debugLabel: Label | null = null;
  private referenceDisplay: Node | null = null;
  private assembledDisplay: Node | null = null;
  private skeletonDisplay: Node | null = null;
  private overlayDisplay: Node | null = null;
  private overlaySprite: Sprite | null = null;
  private markerNodes: Node[] = [];
  private boundNodes: Node[] = [];
  private pivotNodes: Node[] = [];
  private linkNodes: Node[] = [];
  private layerLabelNodes: Node[] = [];
  private socketMarkerNodes: Node[] = [];
  private capEnabled = true;
  private sunglassesEnabled = true;
  private statusNote = "";

  onLoad(): void {
    this.buildDemo();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  start(): void {
    this.selectClip(0, this.autoplay);
  }

  update(deltaSeconds: number): void {
    if (this.playback?.status === "playing") {
      this.apply(this.playback.update(deltaSeconds));
    }
    this.updateStatus();
  }

  onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private buildDemo(): void {
    this.node.children
      .find((child) => child.name === "HeadAccessoryGenerated")
      ?.destroy();
    this.bindings.clear();
    this.slotNodes.clear();
    this.attachmentNodesBySlot.clear();
    this.markerNodes = [];
    this.boundNodes = [];
    this.pivotNodes = [];
    this.linkNodes = [];
    this.layerLabelNodes = [];
    this.socketMarkerNodes = [];
    this.clips = [
      this.clip("production-lite-rest-idle"),
      this.clip("production-lite-arm-wave"),
      this.clip("production-lite-walk-cycle"),
      this.clip("production-lite-articulation-stress"),
      this.clip("production-lite-head-accessory-stress"),
    ];

    const generated = new Node("HeadAccessoryGenerated");
    generated.layer = Layers.Enum.UI_2D;
    generated.setParent(this.node);
    generated.setPosition(0, 24, 0);
    this.referenceDisplay = this.display(generated, "AuthoredReferenceView", -390);
    this.assembledDisplay = this.display(generated, "AssembledSpriteView", -65);
    this.skeletonDisplay = this.display(generated, "SkeletonDebugView", 355);
    this.referenceSprite = this.createReferenceSprite(
      this.referenceDisplay,
      "ReferenceComposite",
      false,
    );
    this.overlayDisplay = new Node("ReferenceAssembledOverlay");
    this.overlayDisplay.layer = Layers.Enum.UI_2D;
    this.overlayDisplay.setParent(this.assembledDisplay);
    this.overlaySprite = this.createReferenceSprite(
      this.overlayDisplay,
      "OverlayVisual",
      true,
    );
    this.overlayDisplay.active = false;

    const spriteJoints = this.createJointHierarchy(this.assembledDisplay, "Sprite");
    const skeletonJoints = this.createJointHierarchy(
      this.skeletonDisplay,
      "Skeleton",
    );
    for (const part of HEAD_ACCESSORY_LAYERING_PLAN.base.parts) {
      const spriteJoint = spriteJoints.get(part.jointId)!;
      const skeletonJoint = skeletonJoints.get(part.jointId)!;
      this.createSprite(spriteJoint, part);
      this.createSkeletonPart(skeletonJoint, part);
      this.createPartDebug(spriteJoint, part, true);
      this.createPartDebug(skeletonJoint, part, false);
      this.createLayerLabel(
        spriteJoint,
        `${part.drawOrder} ${part.jointId}`,
        part.visualOffset.x + part.visualSize.width / 2 + 4,
        part.visualOffset.y,
      );
      this.bindings.set(part.jointId, {
        spriteJoint,
        skeletonJoint,
        restPose: {
          position: { ...part.restPose.position },
          rotationDegrees: part.restPose.rotationDegrees,
          scale: { ...part.restPose.scale },
        },
      });
    }
    this.createAttachments(spriteJoints, skeletonJoints);
    this.createHud(generated);
    this.applyAccessoryState();
    this.updateDebugVisibility();
  }

  private display(parent: Node, name: string, x: number): Node {
    const display = new Node(name);
    display.layer = Layers.Enum.UI_2D;
    display.setParent(parent);
    display.setPosition(x, 5, 0);
    return display;
  }

  private createReferenceSprite(
    parent: Node,
    name: string,
    translucent: boolean,
  ): Sprite {
    const visual = new Node(name);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(parent);
    visual.addComponent(UITransform).setContentSize(
      HEAD_ACCESSORY_LAYERING_PLAN.base.sourceCanvas.width *
        HEAD_ACCESSORY_LAYERING_PLAN.base.referenceScale,
      HEAD_ACCESSORY_LAYERING_PLAN.base.sourceCanvas.height *
        HEAD_ACCESSORY_LAYERING_PLAN.base.referenceScale,
    );
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    visual.addComponent(Sorting2D).sortingOrder = translucent ? 250 : 0;
    if (translucent) visual.addComponent(UIOpacity).opacity = 105;
    return sprite;
  }

  private createJointHierarchy(parent: Node, prefix: string): Map<string, Node> {
    const joints = new Map<string, Node>();
    for (const part of HEAD_ACCESSORY_LAYERING_PLAN.base.parts) {
      const joint = new Node(`${prefix}Joint_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of HEAD_ACCESSORY_LAYERING_PLAN.base.parts) {
      const joint = joints.get(part.jointId)!;
      joint.setParent(
        part.parentId === null ? parent : joints.get(part.parentId)!,
      );
      this.setPose(joint, part.restPose);
    }
    return joints;
  }

  private createSprite(parent: Node, part: PartPlan): void {
    const visual = new Node(`Visual_${part.jointId}`);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(parent);
    visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
    visual.addComponent(UITransform).setContentSize(
      part.visualSize.width,
      part.visualSize.height,
    );
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    visual.addComponent(Sorting2D).sortingOrder = part.sortingOrder;
    this.loadSprite(part.resourcePath, sprite, part.jointId);
  }

  private createAttachments(
    spriteJoints: ReadonlyMap<string, Node>,
    skeletonJoints: ReadonlyMap<string, Node>,
  ): void {
    for (const slot of HEAD_ACCESSORY_LAYERING_PLAN.slots) {
      const node = new Node(`AttachmentSlot_${slot.slotId}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(spriteJoints.get(slot.parentPartId)!);
      this.setPose(node, slot.transform);
      this.slotNodes.set(slot.slotId, node);
      this.socketMarkerNodes.push(
        this.circleNode(node, `Socket_${slot.slotId}`, 9, "#fb7185", false),
      );
      const skeletonSocket = new Node(`SkeletonSocket_${slot.slotId}`);
      skeletonSocket.layer = Layers.Enum.UI_2D;
      skeletonSocket.setParent(skeletonJoints.get(slot.parentPartId)!);
      this.setPose(skeletonSocket, slot.transform);
      this.socketMarkerNodes.push(
        this.circleNode(
          skeletonSocket,
          `SkeletonSocketMarker_${slot.slotId}`,
          9,
          "#fb7185",
          false,
        ),
      );
    }
    for (const attachment of HEAD_ACCESSORY_LAYERING_PLAN.attachments) {
      this.createAttachment(this.slotNodes.get(attachment.slotId)!, attachment);
    }
  }

  private createAttachment(parent: Node, attachment: AttachmentPlan): void {
    const pivot = new Node(`Attachment_${attachment.attachmentId}`);
    pivot.layer = Layers.Enum.UI_2D;
    pivot.setParent(parent);
    this.setPose(pivot, attachment.transform);
    const slotNodes = this.attachmentNodesBySlot.get(attachment.slotId) ?? [];
    slotNodes.push(pivot);
    this.attachmentNodesBySlot.set(attachment.slotId, slotNodes);
    this.pivotNodes.push(
      this.circleNode(
        pivot,
        `AttachmentPivot_${attachment.attachmentId}`,
        7,
        "#facc15",
        false,
      ),
    );
    const visual = new Node(`Visual_${attachment.attachmentId}`);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(pivot);
    visual.setPosition(
      attachment.visualOffset.x,
      attachment.visualOffset.y,
      0,
    );
    visual.addComponent(UITransform).setContentSize(
      attachment.visualSize.width,
      attachment.visualSize.height,
    );
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    visual.addComponent(Sorting2D).sortingOrder = attachment.sortingOrder;
    this.loadSprite(
      attachment.resourcePath,
      sprite,
      attachment.attachmentId,
    );
    const bounds = new Node(`AttachmentBounds_${attachment.attachmentId}`);
    bounds.layer = Layers.Enum.UI_2D;
    bounds.setParent(pivot);
    bounds.setPosition(
      attachment.visualOffset.x,
      attachment.visualOffset.y,
      0,
    );
    const graphics = bounds.addComponent(Graphics);
    graphics.strokeColor = new Color().fromHEX("#fb7185");
    graphics.lineWidth = 1;
    graphics.rect(
      -attachment.visualSize.width / 2,
      -attachment.visualSize.height / 2,
      attachment.visualSize.width,
      attachment.visualSize.height,
    );
    graphics.stroke();
    bounds.addComponent(Sorting2D).sortingOrder = 100;
    this.boundNodes.push(bounds);
    this.createLayerLabel(
      pivot,
      `${attachment.drawOrder} ${attachment.attachmentId}`,
      attachment.visualOffset.x + attachment.visualSize.width / 2 + 4,
      attachment.visualOffset.y,
    );
  }

  private loadSprite(path: string, sprite: Sprite, id: string): void {
    resources.load(
      path,
      SpriteFrame,
      (error: Error | null, frame: SpriteFrame | null) => {
        if (error || !frame) {
          this.statusNote = `asset load failed: ${id} ${error?.message ?? "missing frame"}`;
          return;
        }
        sprite.spriteFrame = frame;
      },
    );
  }

  private createSkeletonPart(parent: Node, part: PartPlan): void {
    const graphicNode = new Node(`Skeleton_${part.jointId}`);
    graphicNode.layer = Layers.Enum.UI_2D;
    graphicNode.setParent(parent);
    const graphics = graphicNode.addComponent(Graphics);
    graphics.strokeColor = new Color().fromHEX("#94a3b8");
    graphics.lineWidth = 4;
    for (const child of HEAD_ACCESSORY_LAYERING_PLAN.base.parts.filter(
      (candidate) => candidate.parentId === part.jointId,
    )) {
      graphics.moveTo(0, 0);
      graphics.lineTo(child.restPose.position.x, child.restPose.position.y);
      graphics.stroke();
    }
  }

  private createPartDebug(
    parent: Node,
    part: PartPlan,
    withBounds: boolean,
  ): void {
    this.markerNodes.push(
      this.circleNode(parent, `JointMarker_${part.jointId}`, 3, "#22d3ee"),
    );
    this.pivotNodes.push(
      this.circleNode(
        parent,
        `PivotMarker_${part.jointId}`,
        7,
        "#facc15",
        false,
      ),
    );
    if (withBounds) {
      const bounds = new Node(`Bounds_${part.jointId}`);
      bounds.layer = Layers.Enum.UI_2D;
      bounds.setParent(parent);
      bounds.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
      const graphics = bounds.addComponent(Graphics);
      graphics.strokeColor = new Color().fromHEX("#34d399");
      graphics.lineWidth = 1;
      graphics.rect(
        -part.visualSize.width / 2,
        -part.visualSize.height / 2,
        part.visualSize.width,
        part.visualSize.height,
      );
      graphics.stroke();
      bounds.addComponent(Sorting2D).sortingOrder = 80;
      this.boundNodes.push(bounds);
    }
    if (part.parentId !== null) {
      const link = new Node(`ParentLink_${part.jointId}`);
      link.layer = Layers.Enum.UI_2D;
      link.setParent(parent);
      const graphics = link.addComponent(Graphics);
      graphics.strokeColor = new Color().fromHEX("#f97316");
      graphics.lineWidth = 1;
      graphics.moveTo(0, 0);
      graphics.lineTo(-part.restPose.position.x, -part.restPose.position.y);
      graphics.stroke();
      this.linkNodes.push(link);
    }
  }

  private createLayerLabel(
    parent: Node,
    text: string,
    x: number,
    y: number,
  ): void {
    const label = this.createLabel(parent, text, 10, x, y, "#fde68a", 180);
    label.node.addComponent(Sorting2D).sortingOrder = 180;
    this.layerLabelNodes.push(label.node);
  }

  private circleNode(
    parent: Node,
    name: string,
    radius: number,
    color: string,
    filled = true,
  ): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color().fromHEX(color);
    graphics.strokeColor = new Color().fromHEX(color);
    graphics.lineWidth = 2;
    graphics.circle(0, 0, radius);
    if (filled) graphics.fill();
    graphics.stroke();
    node.addComponent(Sorting2D).sortingOrder = 150;
    return node;
  }

  private createHud(parent: Node): void {
    this.createLabel(
      parent,
      "TASK-010 · Head Accessory Layering Reference",
      26,
      0,
      310,
      "#f8fafc",
    );
    this.createLabel(parent, "AUTHORED REFERENCE", 16, -390, 278, "#7dd3fc");
    this.createLabel(parent, "ASSEMBLED + ATTACHMENTS", 16, -65, 278, "#86efac");
    this.createLabel(parent, "SKELETON / SOCKETS", 16, 355, 278, "#fbbf24");
    this.statusLabel = this.createLabel(parent, "", 18, 0, 250, "#67e8f9");
    this.debugLabel = this.createLabel(parent, "", 13, 0, 226, "#a5b4fc");
    this.createLabel(
      parent,
      "1 Rest  2 Wave  3 Walk  4 Stress  5 Accessory Stress  Space Pause/Resume  R Exact Reset",
      14,
      0,
      -312,
      "#cbd5e1",
    );
    this.createLabel(
      parent,
      "C Cap  G Glasses  Q Reference  E Assembled  O Overlay  J Joints  B Bounds  A Pivots  L Links  D Layers  S Sockets  V Skeleton",
      13,
      0,
      -336,
      "#cbd5e1",
    );
  }

  private createLabel(
    parent: Node,
    text: string,
    fontSize: number,
    x: number,
    y: number,
    color: string,
    width = 1240,
  ): Label {
    const node = new Node("Label");
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, fontSize + 8);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 2;
    label.color = new Color().fromHEX(color);
    return label;
  }

  private clip(animationId: string): NormalizedRigAnimation {
    const clip = HEAD_ACCESSORY_LAYERING_PLAN.base.clips.find(
      (candidate) => candidate.animationId === animationId,
    );
    if (clip === undefined) throw new Error(`Missing ${animationId}.`);
    return clip as unknown as NormalizedRigAnimation;
  }

  private selectClip(index: number, play: boolean): void {
    this.statusNote = "";
    this.playback = new RigAnimationPlayback(this.clips[index]!);
    this.apply(play ? this.playback.play() : this.playback.stop());
    this.updateStatus();
  }

  private apply(sample: RigAnimationSample): void {
    for (const [jointId, binding] of this.bindings) {
      const pose = composeJointPose(binding.restPose, sample.joints[jointId]);
      this.setPose(binding.spriteJoint, pose);
      this.setPose(binding.skeletonJoint, pose);
    }
  }

  private setPose(
    node: Node,
    pose: {
      readonly position: { readonly x: number; readonly y: number };
      readonly rotationDegrees: number;
      readonly scale: { readonly x: number; readonly y: number };
    },
  ): void {
    node.setPosition(pose.position.x, pose.position.y, 0);
    node.setRotationFromEuler(0, 0, pose.rotationDegrees);
    node.setScale(pose.scale.x, pose.scale.y, 1);
  }

  private restoreRest(): void {
    if (this.playback !== null) this.playback.stop();
    for (const binding of this.bindings.values()) {
      this.setPose(binding.spriteJoint, binding.restPose);
      this.setPose(binding.skeletonJoint, binding.restPose);
    }
    this.capEnabled = true;
    this.sunglassesEnabled = true;
    this.applyAccessoryState();
    this.statusNote = "exact authored Rest Pose";
    this.updateStatus();
  }

  private variantId(): keyof typeof HEAD_ACCESSORY_LAYERING_PLAN.referenceResourcePaths {
    if (this.capEnabled && this.sunglassesEnabled) return "cap-and-sunglasses";
    if (this.capEnabled) return "cap-only";
    if (this.sunglassesEnabled) return "sunglasses-only";
    return "base";
  }

  private applyAccessoryState(): void {
    for (const node of this.attachmentNodesBySlot.get("headwear") ?? []) {
      node.active = this.capEnabled;
    }
    for (const node of this.attachmentNodesBySlot.get("face-accessory") ?? []) {
      node.active = this.sunglassesEnabled;
    }
    const variant = this.variantId();
    const path = HEAD_ACCESSORY_LAYERING_PLAN.referenceResourcePaths[variant];
    resources.load(
      path,
      SpriteFrame,
      (error: Error | null, frame: SpriteFrame | null) => {
        if (error || !frame) {
          this.statusNote = `reference load failed: ${error?.message ?? "missing frame"}`;
          return;
        }
        if (this.referenceSprite !== null) this.referenceSprite.spriteFrame = frame;
        if (this.overlaySprite !== null) this.overlaySprite.spriteFrame = frame;
      },
    );
    this.statusNote = `accessories ${variant}`;
    this.updateStatus();
  }

  private updateDebugVisibility(): void {
    for (const node of this.markerNodes) node.active = this.showJointMarkers;
    for (const node of this.boundNodes) node.active = this.showSpriteBounds;
    for (const node of this.pivotNodes) node.active = this.showPivotMarkers;
    for (const node of this.linkNodes) node.active = this.showParentLinks;
    for (const node of this.layerLabelNodes) node.active = this.showLayerLabels;
    for (const node of this.socketMarkerNodes) {
      node.active = this.showAttachmentSockets;
    }
  }

  private updateStatus(): void {
    if (
      this.statusLabel === null ||
      this.debugLabel === null ||
      this.playback === null
    ) {
      return;
    }
    const variant = this.variantId();
    const note = this.statusNote.length === 0 ? "" : ` · ${this.statusNote}`;
    this.statusLabel.string =
      `CLIP ${this.playback.animation.animationId}   ` +
      `STATE ${this.playback.status.toUpperCase()}   ` +
      `TIME ${this.playback.sample().sampleTime.toFixed(2)}s${note}`;
    this.debugLabel.string =
      `ACCESSORIES CAP:${this.capEnabled ? "ON" : "OFF"} GLASSES:${this.sunglassesEnabled ? "ON" : "OFF"}   ` +
      `RECON ${variant} ${HEAD_ACCESSORY_LAYERING_PLAN.reconstructionStatus[variant]}   ` +
      `DEBUG J:${this.showJointMarkers ? "ON" : "OFF"} B:${this.showSpriteBounds ? "ON" : "OFF"} ` +
      `P:${this.showPivotMarkers ? "ON" : "OFF"} L:${this.showParentLinks ? "ON" : "OFF"} ` +
      `Z:${this.showLayerLabels ? "ON" : "OFF"} S:${this.showAttachmentSockets ? "ON" : "OFF"} ` +
      `O:${this.overlayDisplay?.active ? "ON" : "OFF"}`;
  }

  private readonly onKeyDown = (event: EventKeyboard): void => {
    if (event.keyCode === KeyCode.DIGIT_1) this.selectClip(0, true);
    else if (event.keyCode === KeyCode.DIGIT_2) this.selectClip(1, true);
    else if (event.keyCode === KeyCode.DIGIT_3) this.selectClip(2, true);
    else if (event.keyCode === KeyCode.DIGIT_4) this.selectClip(3, true);
    else if (event.keyCode === KeyCode.DIGIT_5) this.selectClip(4, true);
    else if (event.keyCode === KeyCode.SPACE && this.playback !== null) {
      this.statusNote = "";
      this.apply(
        this.playback.status === "playing"
          ? this.playback.pause()
          : this.playback.play(),
      );
    } else if (event.keyCode === KeyCode.KEY_R) this.restoreRest();
    else if (event.keyCode === KeyCode.KEY_C) {
      this.capEnabled = !this.capEnabled;
      this.applyAccessoryState();
    } else if (event.keyCode === KeyCode.KEY_G) {
      this.sunglassesEnabled = !this.sunglassesEnabled;
      this.applyAccessoryState();
    } else if (event.keyCode === KeyCode.KEY_Q && this.referenceDisplay !== null) {
      this.referenceDisplay.active = !this.referenceDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_E && this.assembledDisplay !== null) {
      this.assembledDisplay.active = !this.assembledDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_O && this.overlayDisplay !== null) {
      this.overlayDisplay.active = !this.overlayDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_J) {
      this.showJointMarkers = !this.showJointMarkers;
    } else if (event.keyCode === KeyCode.KEY_B) {
      this.showSpriteBounds = !this.showSpriteBounds;
    } else if (event.keyCode === KeyCode.KEY_A) {
      this.showPivotMarkers = !this.showPivotMarkers;
    } else if (event.keyCode === KeyCode.KEY_L) {
      this.showParentLinks = !this.showParentLinks;
    } else if (event.keyCode === KeyCode.KEY_D) {
      this.showLayerLabels = !this.showLayerLabels;
    } else if (event.keyCode === KeyCode.KEY_S) {
      this.showAttachmentSockets = !this.showAttachmentSockets;
    } else if (event.keyCode === KeyCode.KEY_V && this.skeletonDisplay !== null) {
      this.skeletonDisplay.active = !this.skeletonDisplay.active;
    }
    this.updateDebugVisibility();
    this.updateStatus();
  };
}

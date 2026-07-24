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

import { ONE_HANDED_PROP_PLAN } from "./one-handed-prop-data";

const { ccclass, executeInEditMode, property } = _decorator;
type PartPlan = (typeof ONE_HANDED_PROP_PLAN.base.parts)[number];

interface JointBinding {
  readonly sprite: Node;
  readonly skeleton: Node;
  readonly rest: JointRestPose;
}

@ccclass("GameAIOneHandedPropDemo")
@executeInEditMode
export class GameAIOneHandedPropDemo extends Component {
  @property autoplay = false;
  @property showJointMarkers = false;
  @property showSpriteBounds = false;
  @property showPivotMarkers = false;
  @property showParentLinks = false;
  @property showLayerLabels = false;
  @property showSocketMarkers = false;
  @property showGripMarkers = false;

  private bindings = new Map<string, JointBinding>();
  private attachmentNodes = new Map<string, Node>();
  private referenceSprite: Sprite | null = null;
  private overlaySprite: Sprite | null = null;
  private referenceDisplay: Node | null = null;
  private assembledDisplay: Node | null = null;
  private skeletonDisplay: Node | null = null;
  private overlayDisplay: Node | null = null;
  private playback: RigAnimationPlayback | null = null;
  private clips: readonly NormalizedRigAnimation[] = [];
  private status: Label | null = null;
  private debug: Label | null = null;
  private joints: Node[] = [];
  private bounds: Node[] = [];
  private pivots: Node[] = [];
  private links: Node[] = [];
  private layers: Node[] = [];
  private sockets: Node[] = [];
  private grips: Node[] = [];
  private variantId: "no-prop" | "left-hand" | "right-hand" = "left-hand";
  private note = "";

  onLoad(): void {
    this.build();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  start(): void {
    this.selectClip(0, false);
  }

  update(delta: number): void {
    if (this.playback?.status === "playing") {
      this.apply(this.playback.update(delta));
    }
    this.updateStatus();
  }

  onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private build(): void {
    this.node.children.find((child) => child.name === "PropGenerated")?.destroy();
    this.clips = ONE_HANDED_PROP_PLAN.base.clips as unknown as NormalizedRigAnimation[];
    const root = new Node("PropGenerated");
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.setPosition(0, 24, 0);
    this.referenceDisplay = this.display(root, "AuthoredReferenceView", -390);
    this.assembledDisplay = this.display(root, "AssembledCharacterView", -65);
    this.skeletonDisplay = this.display(root, "SkeletonDebugView", 355);
    this.referenceSprite = this.reference(this.referenceDisplay, "Reference", false);
    this.overlayDisplay = new Node("ReferenceAssembledOverlay");
    this.overlayDisplay.layer = Layers.Enum.UI_2D;
    this.overlayDisplay.setParent(this.assembledDisplay);
    this.overlaySprite = this.reference(this.overlayDisplay, "Overlay", true);
    this.overlayDisplay.active = false;

    const spriteJoints = this.hierarchy(this.assembledDisplay, "Sprite");
    const skeletonJoints = this.hierarchy(this.skeletonDisplay, "Skeleton");
    for (const part of ONE_HANDED_PROP_PLAN.base.parts) {
      const sprite = spriteJoints.get(part.jointId)!;
      const skeleton = skeletonJoints.get(part.jointId)!;
      this.sprite(sprite, part);
      this.skeletonPart(skeleton, part);
      this.partDebug(sprite, part);
      this.partDebug(skeleton, part, false);
      this.layerLabel(
        sprite,
        `${part.drawOrder} ${part.jointId}`,
        part.visualOffset.x + part.visualSize.width / 2,
        part.visualOffset.y,
      );
      this.bindings.set(part.jointId, {
        sprite,
        skeleton,
        rest: {
          position: { ...part.restPose.position },
          rotationDegrees: part.restPose.rotationDegrees,
          scale: { ...part.restPose.scale },
        },
      });
    }
    this.attachments(spriteJoints);
    this.hud(root);
    this.applyState();
    this.updateDebug();
  }

  private display(parent: Node, name: string, x: number): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, 5, 0);
    return node;
  }

  private reference(parent: Node, name: string, translucent: boolean): Sprite {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.addComponent(UITransform).setContentSize(
      ONE_HANDED_PROP_PLAN.base.sourceCanvas.width *
        ONE_HANDED_PROP_PLAN.base.referenceScale,
      ONE_HANDED_PROP_PLAN.base.sourceCanvas.height *
        ONE_HANDED_PROP_PLAN.base.referenceScale,
    );
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    node.addComponent(Sorting2D).sortingOrder = translucent ? 250 : 200;
    if (translucent) node.addComponent(UIOpacity).opacity = 105;
    return sprite;
  }

  private hierarchy(parent: Node, prefix: string): Map<string, Node> {
    const result = new Map<string, Node>();
    for (const part of ONE_HANDED_PROP_PLAN.base.parts) {
      const node = new Node(`${prefix}Joint_${part.jointId}`);
      node.layer = Layers.Enum.UI_2D;
      result.set(part.jointId, node);
    }
    for (const part of ONE_HANDED_PROP_PLAN.base.parts) {
      const node = result.get(part.jointId)!;
      node.setParent(part.parentId === null ? parent : result.get(part.parentId)!);
      this.setPose(node, part.restPose);
    }
    return result;
  }

  private sprite(parent: Node, part: PartPlan): void {
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
    this.load(part.resourcePath, sprite, part.jointId);
  }

  private attachments(joints: ReadonlyMap<string, Node>): void {
    const slotNodes = new Map<string, Node>();
    for (const slot of ONE_HANDED_PROP_PLAN.slots) {
      const node = new Node(`PropSocket_${slot.slotId}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(joints.get(slot.parentPartId)!);
      this.setPose(node, slot.transform);
      slotNodes.set(slot.slotId, node);
      this.sockets.push(this.circle(node, `Socket_${slot.target?.id ?? slot.slotId}`, 9, "#fb7185"));
    }
    for (const attachment of ONE_HANDED_PROP_PLAN.attachments) {
      const pivot = new Node(`Attachment_${attachment.attachmentId}`);
      pivot.layer = Layers.Enum.UI_2D;
      pivot.setParent(slotNodes.get(attachment.slotId)!);
      this.setPose(pivot, attachment.transform);
      this.attachmentNodes.set(attachment.attachmentId, pivot);
      this.pivots.push(
        this.circle(pivot, `Pivot_${attachment.attachmentId}`, 7, "#facc15"),
      );
      if ("gripAnchor" in attachment) {
        this.grips.push(
          this.circle(pivot, `Grip_${attachment.attachmentId}`, 4, "#22d3ee", true),
        );
      }
      const visual = new Node(`Visual_${attachment.attachmentId}`);
      visual.layer = Layers.Enum.UI_2D;
      visual.setParent(pivot);
      visual.setPosition(attachment.visualOffset.x, attachment.visualOffset.y, 0);
      visual.addComponent(UITransform).setContentSize(
        attachment.visualSize.width,
        attachment.visualSize.height,
      );
      const sprite = visual.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      visual.addComponent(Sorting2D).sortingOrder = attachment.sortingOrder;
      this.load(attachment.resourcePath, sprite, attachment.attachmentId);
      const bounds = new Node(`PropBounds_${attachment.attachmentId}`);
      bounds.layer = Layers.Enum.UI_2D;
      bounds.setParent(pivot);
      bounds.setPosition(attachment.visualOffset.x, attachment.visualOffset.y, 0);
      const graphics = bounds.addComponent(Graphics);
      graphics.strokeColor = new Color().fromHEX("#fb7185");
      graphics.rect(
        -attachment.visualSize.width / 2,
        -attachment.visualSize.height / 2,
        attachment.visualSize.width,
        attachment.visualSize.height,
      );
      graphics.stroke();
      bounds.addComponent(Sorting2D).sortingOrder = 100;
      this.bounds.push(bounds);
      this.layerLabel(
        pivot,
        `${attachment.drawOrder} ${attachment.layerRole ?? ""} ${attachment.attachmentId}`,
        attachment.visualOffset.x + attachment.visualSize.width / 2,
        attachment.visualOffset.y,
      );
    }
  }

  private skeletonPart(parent: Node, part: PartPlan): void {
    const graphics = parent.addComponent(Graphics);
    graphics.strokeColor = new Color().fromHEX("#94a3b8");
    graphics.lineWidth = 4;
    for (const child of ONE_HANDED_PROP_PLAN.base.parts.filter(
      (candidate) => candidate.parentId === part.jointId,
    )) {
      graphics.moveTo(0, 0);
      graphics.lineTo(child.restPose.position.x, child.restPose.position.y);
      graphics.stroke();
    }
  }

  private partDebug(parent: Node, part: PartPlan, withBounds = true): void {
    this.joints.push(this.circle(parent, `Joint_${part.jointId}`, 3, "#22d3ee", true));
    this.pivots.push(this.circle(parent, `Pivot_${part.jointId}`, 7, "#facc15"));
    if (withBounds) {
      const node = new Node(`Bounds_${part.jointId}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(parent);
      node.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
      const graphics = node.addComponent(Graphics);
      graphics.strokeColor = new Color().fromHEX("#34d399");
      graphics.rect(
        -part.visualSize.width / 2,
        -part.visualSize.height / 2,
        part.visualSize.width,
        part.visualSize.height,
      );
      graphics.stroke();
      this.bounds.push(node);
    }
    if (part.parentId !== null) {
      const node = new Node(`ParentLink_${part.jointId}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(parent);
      const graphics = node.addComponent(Graphics);
      graphics.strokeColor = new Color().fromHEX("#f97316");
      graphics.moveTo(0, 0);
      graphics.lineTo(-part.restPose.position.x, -part.restPose.position.y);
      graphics.stroke();
      this.links.push(node);
    }
  }

  private circle(
    parent: Node,
    name: string,
    radius: number,
    color: string,
    filled = false,
  ): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const graphics = node.addComponent(Graphics);
    graphics.strokeColor = new Color().fromHEX(color);
    graphics.fillColor = new Color().fromHEX(color);
    graphics.circle(0, 0, radius);
    if (filled) graphics.fill();
    graphics.stroke();
    node.addComponent(Sorting2D).sortingOrder = 180;
    return node;
  }

  private layerLabel(parent: Node, text: string, x: number, y: number): void {
    const label = this.label(parent, text, 9, x, y, "#fde68a", 180);
    label.node.addComponent(Sorting2D).sortingOrder = 180;
    this.layers.push(label.node);
  }

  private hud(parent: Node): void {
    this.label(parent, "TASK-012 · One-Handed Prop Attachment Reference", 24, 0, 310, "#f8fafc");
    this.label(parent, "AUTHORED REFERENCE", 15, -390, 280, "#7dd3fc");
    this.label(parent, "ASSEMBLED + PROP", 15, -65, 280, "#86efac");
    this.label(parent, "SKELETON / SOCKET + GRIP", 15, 355, 280, "#fbbf24");
    this.status = this.label(parent, "", 16, 0, 252, "#67e8f9");
    this.debug = this.label(parent, "", 12, 0, 230, "#a5b4fc");
    this.label(
      parent,
      "1 Rest+Prop  2 Walk+Prop  3 Prop Swing  4 Prop Stress  Space Pause/Resume  R Exact Reset",
      13,
      0,
      -314,
      "#cbd5e1",
    );
    this.label(
      parent,
      "Z No Prop  X Left Hand  C Right Hand  Q Reference  E Assembled  O Overlay  J Joints  B Bounds  A Pivots  L Links  D Layers  S Sockets  G Grips  V Skeleton",
      12,
      0,
      -338,
      "#cbd5e1",
    );
  }

  private label(
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
    node.addComponent(UITransform).setContentSize(width, fontSize + 6);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.color = new Color().fromHEX(color);
    return label;
  }

  private load(path: string, sprite: Sprite, id: string): void {
    resources.load(path, SpriteFrame, (error: Error | null, frame: SpriteFrame | null) => {
      if (error || !frame) {
        this.note = `asset load failed ${id}`;
        return;
      }
      sprite.spriteFrame = frame;
    });
  }

  private selectClip(index: number, play = true): void {
    this.playback = new RigAnimationPlayback(this.clips[index]!);
    this.apply(play ? this.playback.play() : this.playback.stop());
    this.note = "";
    this.updateStatus();
  }

  private apply(sample: RigAnimationSample): void {
    for (const [jointId, binding] of this.bindings) {
      const pose = composeJointPose(binding.rest, sample.joints[jointId]);
      this.setPose(binding.sprite, pose);
      this.setPose(binding.skeleton, pose);
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

  private applyState(): void {
    for (const attachment of ONE_HANDED_PROP_PLAN.attachments) {
      const enabled =
        ("propStateId" in attachment && attachment.propStateId === "left-hand-prop"
          ? this.variantId === "left-hand"
          : "propStateId" in attachment &&
              attachment.propStateId === "right-hand-prop"
            ? this.variantId === "right-hand"
            : true);
      this.attachmentNodes.get(attachment.attachmentId)!.active = enabled;
    }
    const path = ONE_HANDED_PROP_PLAN.referenceResourcePaths[this.variantId];
    resources.load(path, SpriteFrame, (error: Error | null, frame: SpriteFrame | null) => {
      if (error || !frame) {
        this.note = "reference load failed";
        return;
      }
      if (this.referenceSprite !== null) this.referenceSprite.spriteFrame = frame;
      if (this.overlaySprite !== null) this.overlaySprite.spriteFrame = frame;
    });
    this.note = `prop state ${this.variantId}`;
    this.updateStatus();
  }

  private reset(): void {
    this.playback?.stop();
    for (const binding of this.bindings.values()) {
      this.setPose(binding.sprite, binding.rest);
      this.setPose(binding.skeleton, binding.rest);
    }
    this.variantId = "left-hand";
    this.applyState();
    this.note = "exact authored Rest Pose";
  }

  private updateDebug(): void {
    for (const node of this.joints) node.active = this.showJointMarkers;
    for (const node of this.bounds) node.active = this.showSpriteBounds;
    for (const node of this.pivots) node.active = this.showPivotMarkers;
    for (const node of this.links) node.active = this.showParentLinks;
    for (const node of this.layers) node.active = this.showLayerLabels;
    for (const node of this.sockets) node.active = this.showSocketMarkers;
    for (const node of this.grips) node.active = this.showGripMarkers;
  }

  private updateStatus(): void {
    if (this.status === null || this.debug === null || this.playback === null) return;
    this.status.string =
      `CLIP ${this.playback.animation.animationId}  ${this.playback.status.toUpperCase()}  ` +
      `${this.playback.sample().sampleTime.toFixed(2)}s · ${this.note}`;
    this.debug.string =
      `PROP ${this.variantId} · GRIP LOCK 60 Hz · ${ONE_HANDED_PROP_PLAN.reconstructionStatus[this.variantId]} · ` +
      `J:${this.showJointMarkers ? "ON" : "OFF"} B:${this.showSpriteBounds ? "ON" : "OFF"} P:${this.showPivotMarkers ? "ON" : "OFF"} ` +
      `L:${this.showParentLinks ? "ON" : "OFF"} Z:${this.showLayerLabels ? "ON" : "OFF"} S:${this.showSocketMarkers ? "ON" : "OFF"} G:${this.showGripMarkers ? "ON" : "OFF"}`;
  }

  private setVariant(variant: "no-prop" | "left-hand" | "right-hand"): void {
    this.variantId = variant;
    this.applyState();
  }

  private readonly onKeyDown = (event: EventKeyboard): void => {
    if (event.keyCode === KeyCode.DIGIT_1) this.selectClip(0);
    else if (event.keyCode === KeyCode.DIGIT_2) this.selectClip(1);
    else if (event.keyCode === KeyCode.DIGIT_3) this.selectClip(2);
    else if (event.keyCode === KeyCode.DIGIT_4) this.selectClip(3);
    else if (event.keyCode === KeyCode.SPACE && this.playback !== null) {
      this.apply(
        this.playback.status === "playing"
          ? this.playback.pause()
          : this.playback.play(),
      );
    } else if (event.keyCode === KeyCode.KEY_R) this.reset();
    else if (event.keyCode === KeyCode.KEY_Z) this.setVariant("no-prop");
    else if (event.keyCode === KeyCode.KEY_X) this.setVariant("left-hand");
    else if (event.keyCode === KeyCode.KEY_C) this.setVariant("right-hand");
    else if (event.keyCode === KeyCode.KEY_Q && this.referenceDisplay !== null) {
      this.referenceDisplay.active = !this.referenceDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_E && this.assembledDisplay !== null) {
      this.assembledDisplay.active = !this.assembledDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_O && this.overlayDisplay !== null) {
      this.overlayDisplay.active = !this.overlayDisplay.active;
    } else if (event.keyCode === KeyCode.KEY_J) this.showJointMarkers = !this.showJointMarkers;
    else if (event.keyCode === KeyCode.KEY_B) this.showSpriteBounds = !this.showSpriteBounds;
    else if (event.keyCode === KeyCode.KEY_A) this.showPivotMarkers = !this.showPivotMarkers;
    else if (event.keyCode === KeyCode.KEY_L) this.showParentLinks = !this.showParentLinks;
    else if (event.keyCode === KeyCode.KEY_D) this.showLayerLabels = !this.showLayerLabels;
    else if (event.keyCode === KeyCode.KEY_S) this.showSocketMarkers = !this.showSocketMarkers;
    else if (event.keyCode === KeyCode.KEY_G) this.showGripMarkers = !this.showGripMarkers;
    else if (event.keyCode === KeyCode.KEY_V && this.skeletonDisplay !== null) {
      this.skeletonDisplay.active = !this.skeletonDisplay.active;
    }
    this.updateDebug();
    this.updateStatus();
  };
}

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

import { PRODUCTION_LITE_CHARACTER_PLAN } from "./production-lite-character-data";

const { ccclass, executeInEditMode, property } = _decorator;
type PartPlan = (typeof PRODUCTION_LITE_CHARACTER_PLAN.parts)[number];

interface JointBinding {
  readonly spriteJoint: Node;
  readonly skeletonJoint: Node;
  readonly restPose: JointRestPose;
}

@ccclass("GameAIProductionLiteCharacterDemo")
@executeInEditMode
export class GameAIProductionLiteCharacterDemo extends Component {
  @property
  autoplay = false;

  @property
  showJointMarkers = true;

  @property
  showSpriteBounds = false;

  @property
  showPivotMarkers = false;

  @property
  showParentLinks = false;

  @property
  showLayerLabels = false;

  private bindings = new Map<string, JointBinding>();
  private markerNodes: Node[] = [];
  private boundNodes: Node[] = [];
  private pivotNodes: Node[] = [];
  private linkNodes: Node[] = [];
  private layerLabelNodes: Node[] = [];
  private clips: readonly NormalizedRigAnimation[] = [];
  private playback: RigAnimationPlayback | null = null;
  private statusLabel: Label | null = null;
  private debugLabel: Label | null = null;
  private referenceDisplay: Node | null = null;
  private assembledDisplay: Node | null = null;
  private skeletonDisplay: Node | null = null;
  private overlayDisplay: Node | null = null;
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
      .find((child) => child.name === "ProductionLiteGenerated")
      ?.destroy();
    this.bindings.clear();
    this.markerNodes = [];
    this.boundNodes = [];
    this.pivotNodes = [];
    this.linkNodes = [];
    this.layerLabelNodes = [];
    this.clips = [
      this.clip("production-lite-rest-idle"),
      this.clip("production-lite-arm-wave"),
      this.clip("production-lite-walk-cycle"),
      this.clip("production-lite-articulation-stress"),
    ];

    const generated = new Node("ProductionLiteGenerated");
    generated.layer = Layers.Enum.UI_2D;
    generated.setParent(this.node);
    generated.setPosition(0, 30, 0);

    this.referenceDisplay = this.display(generated, "AuthoredReferenceView", -390);
    this.assembledDisplay = this.display(generated, "AssembledSpriteView", -65);
    this.skeletonDisplay = this.display(generated, "SkeletonDebugView", 355);
    this.createReferenceSprite(this.referenceDisplay, "ReferenceComposite", false);
    this.overlayDisplay = this.createReferenceSprite(
      this.assembledDisplay,
      "ReferenceAssembledOverlay",
      true,
    );
    this.overlayDisplay.active = false;

    const spriteJoints = this.createJointHierarchy(
      this.assembledDisplay,
      "Sprite",
    );
    const skeletonJoints = this.createJointHierarchy(
      this.skeletonDisplay,
      "Skeleton",
    );
    for (const part of PRODUCTION_LITE_CHARACTER_PLAN.parts) {
      const spriteJoint = spriteJoints.get(part.jointId)!;
      const skeletonJoint = skeletonJoints.get(part.jointId)!;
      this.createSprite(spriteJoint, part);
      this.createSkeletonPart(skeletonJoint, part);
      this.createDebug(spriteJoint, part, true);
      this.createDebug(skeletonJoint, part, false);
      this.createLayerLabel(spriteJoint, part);
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
    this.createHud(generated);
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
  ): Node {
    const visual = new Node(name);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(parent);
    visual.addComponent(UITransform).setContentSize(
      PRODUCTION_LITE_CHARACTER_PLAN.sourceCanvas.width *
        PRODUCTION_LITE_CHARACTER_PLAN.referenceScale,
      PRODUCTION_LITE_CHARACTER_PLAN.sourceCanvas.height *
        PRODUCTION_LITE_CHARACTER_PLAN.referenceScale,
    );
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    visual.addComponent(Sorting2D).sortingOrder = translucent ? 250 : 0;
    if (translucent) visual.addComponent(UIOpacity).opacity = 105;
    resources.load(
      PRODUCTION_LITE_CHARACTER_PLAN.referenceResourcePath,
      SpriteFrame,
      (error: Error | null, frame: SpriteFrame | null) => {
        if (error || !frame) {
          this.statusNote = `reference load failed: ${error?.message ?? "missing frame"}`;
          return;
        }
        sprite.spriteFrame = frame;
      },
    );
    return visual;
  }

  private createJointHierarchy(parent: Node, prefix: string): Map<string, Node> {
    const joints = new Map<string, Node>();
    for (const part of PRODUCTION_LITE_CHARACTER_PLAN.parts) {
      const joint = new Node(`${prefix}Joint_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of PRODUCTION_LITE_CHARACTER_PLAN.parts) {
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
    visual.addComponent(Sorting2D).sortingOrder = part.drawOrder;
    resources.load(
      part.resourcePath,
      SpriteFrame,
      (error: Error | null, frame: SpriteFrame | null) => {
        if (error || !frame) {
          this.statusNote =
            `asset load failed: ${part.jointId} ${error?.message ?? "missing frame"}`;
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
    for (const child of PRODUCTION_LITE_CHARACTER_PLAN.parts.filter(
      (candidate) => candidate.parentId === part.jointId,
    )) {
      graphics.moveTo(0, 0);
      graphics.lineTo(child.restPose.position.x, child.restPose.position.y);
      graphics.stroke();
    }
  }

  private createDebug(parent: Node, part: PartPlan, withBounds: boolean): void {
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
      bounds.addComponent(Sorting2D).sortingOrder = 80 + part.drawOrder;
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

  private createLayerLabel(parent: Node, part: PartPlan): void {
    const label = this.createLabel(
      parent,
      `${part.drawOrder} ${part.jointId}`,
      10,
      part.visualOffset.x + part.visualSize.width / 2 + 4,
      part.visualOffset.y,
      "#fde68a",
      170,
    );
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
      "TASK-009 · Production-Lite Layered Character Reference",
      26,
      0,
      310,
      "#f8fafc",
    );
    this.createLabel(parent, "AUTHORED REFERENCE", 16, -390, 278, "#7dd3fc");
    this.createLabel(parent, "ASSEMBLED SPRITES", 16, -65, 278, "#86efac");
    this.createLabel(parent, "SKELETON / DEBUG", 16, 355, 278, "#fbbf24");
    this.statusLabel = this.createLabel(parent, "", 18, 0, 250, "#67e8f9");
    this.debugLabel = this.createLabel(parent, "", 14, 0, 226, "#a5b4fc");
    this.createLabel(
      parent,
      "1 Rest  2 Wave  3 Walk  4 Stress  Space Pause/Resume  R Exact Reset  Q Reference  E Assembled  O Overlay",
      14,
      0,
      -316,
      "#cbd5e1",
    );
    this.createLabel(
      parent,
      "J Joints  B Bounds  A Pivots  L Links  D Layer Labels  V Skeleton",
      14,
      0,
      -338,
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
    const clip = PRODUCTION_LITE_CHARACTER_PLAN.clips.find(
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
    this.statusNote = "exact authored Rest Pose";
    this.updateStatus();
  }

  private updateDebugVisibility(): void {
    for (const node of this.markerNodes) node.active = this.showJointMarkers;
    for (const node of this.boundNodes) node.active = this.showSpriteBounds;
    for (const node of this.pivotNodes) node.active = this.showPivotMarkers;
    for (const node of this.linkNodes) node.active = this.showParentLinks;
    for (const node of this.layerLabelNodes) node.active = this.showLayerLabels;
  }

  private updateStatus(): void {
    if (
      this.statusLabel === null ||
      this.debugLabel === null ||
      this.playback === null
    ) {
      return;
    }
    const note = this.statusNote.length === 0 ? "" : ` · ${this.statusNote}`;
    this.statusLabel.string =
      `CLIP ${this.playback.animation.animationId}   ` +
      `STATE ${this.playback.status.toUpperCase()}   ` +
      `TIME ${this.playback.sample().sampleTime.toFixed(2)}s${note}`;
    this.debugLabel.string =
      `RECONSTRUCTION ${PRODUCTION_LITE_CHARACTER_PLAN.reconstructionStatus}   ` +
      `DEBUG J:${this.showJointMarkers ? "ON" : "OFF"} ` +
      `B:${this.showSpriteBounds ? "ON" : "OFF"} ` +
      `P:${this.showPivotMarkers ? "ON" : "OFF"} ` +
      `L:${this.showParentLinks ? "ON" : "OFF"} ` +
      `Z:${this.showLayerLabels ? "ON" : "OFF"} ` +
      `O:${this.overlayDisplay?.active ? "ON" : "OFF"}`;
  }

  private readonly onKeyDown = (event: EventKeyboard): void => {
    if (event.keyCode === KeyCode.DIGIT_1) this.selectClip(0, true);
    else if (event.keyCode === KeyCode.DIGIT_2) this.selectClip(1, true);
    else if (event.keyCode === KeyCode.DIGIT_3) this.selectClip(2, true);
    else if (event.keyCode === KeyCode.DIGIT_4) this.selectClip(3, true);
    else if (event.keyCode === KeyCode.SPACE && this.playback !== null) {
      this.statusNote = "";
      this.apply(
        this.playback.status === "playing"
          ? this.playback.pause()
          : this.playback.play(),
      );
    } else if (event.keyCode === KeyCode.KEY_R) this.restoreRest();
    else if (event.keyCode === KeyCode.KEY_Q && this.referenceDisplay !== null) {
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
    } else if (event.keyCode === KeyCode.KEY_V && this.skeletonDisplay !== null) {
      this.skeletonDisplay.active = !this.skeletonDisplay.active;
    }
    this.updateDebugVisibility();
    this.updateStatus();
  };
}

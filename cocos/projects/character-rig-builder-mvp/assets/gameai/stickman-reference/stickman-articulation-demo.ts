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
  Sorting2D,
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

import { STICKMAN_REFERENCE_PLAN } from "./stickman-reference-data";

const { ccclass, executeInEditMode, property } = _decorator;

interface JointBinding {
  readonly node: Node;
  readonly restPose: JointRestPose;
  readonly marker: Node;
}

type PrimitiveVisual = (typeof STICKMAN_REFERENCE_PLAN.parts)[number]["visual"];

@ccclass("GameAIStickmanArticulationDemo")
@executeInEditMode
export class GameAIStickmanArticulationDemo extends Component {
  @property
  autoplay = true;

  @property
  autoCycleClips = true;

  @property
  showJointMarkers = true;

  private bindings = new Map<string, JointBinding>();
  private clips: readonly NormalizedRigAnimation[] = [];
  private playback: RigAnimationPlayback | null = null;
  private activeClipIndex = 0;
  private clipElapsed = 0;
  private statusLabel: Label | null = null;
  private statusNote = "";

  onLoad(): void {
    this.buildDemo();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  start(): void {
    this.selectClip(0, this.autoplay);
  }

  update(deltaSeconds: number): void {
    if (this.playback?.status !== "playing") {
      this.updateStatus();
      return;
    }
    this.apply(this.playback.update(deltaSeconds));
    this.clipElapsed += deltaSeconds;
    if (this.autoCycleClips && this.clipElapsed >= 4) {
      this.selectClip((this.activeClipIndex + 1) % this.clips.length, true);
    }
    this.updateStatus();
  }

  onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private buildDemo(): void {
    const previous = this.node.children.find(
      (child) => child.name === "StickmanGenerated",
    );
    previous?.destroy();
    this.bindings.clear();

    this.clips = [
      this.clip("stickman-rest-idle"),
      this.clip("stickman-arm-wave"),
      this.clip("stickman-walk-cycle"),
    ];
    const generated = new Node("StickmanGenerated");
    generated.layer = Layers.Enum.UI_2D;
    generated.setParent(this.node);
    generated.setPosition(0, 92, 0);
    const rigDisplay = new Node("RigDisplay");
    rigDisplay.layer = Layers.Enum.UI_2D;
    rigDisplay.setParent(generated);
    rigDisplay.setScale(1.25, 1.25, 1);

    const joints = new Map<string, Node>();
    for (const part of STICKMAN_REFERENCE_PLAN.parts) {
      const joint = new Node(`Joint_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of STICKMAN_REFERENCE_PLAN.parts) {
      const joint = joints.get(part.jointId)!;
      joint.setParent(
        part.parentId === null ? rigDisplay : joints.get(part.parentId)!,
      );
      const rest = part.restPose;
      joint.setPosition(rest.position.x, rest.position.y, 0);
      joint.setRotationFromEuler(0, 0, rest.rotationDegrees);
      joint.setScale(rest.scale.x, rest.scale.y, 1);
      const marker = this.createMarker(joint, part.jointId);
      this.createPrimitive(joint, part.visual, part.drawOrder);
      this.bindings.set(part.jointId, {
        node: joint,
        restPose: {
          position: { ...rest.position },
          rotationDegrees: rest.rotationDegrees,
          scale: { ...rest.scale },
        },
        marker,
      });
    }

    this.createHud(generated);
    this.setMarkers(this.showJointMarkers);
  }

  private clip(animationId: string): NormalizedRigAnimation {
    const clip = STICKMAN_REFERENCE_PLAN.clips.find(
      (candidate) => candidate.animationId === animationId,
    );
    if (clip === undefined) throw new Error(`Missing ${animationId}.`);
    return clip as unknown as NormalizedRigAnimation;
  }

  private createPrimitive(
    parent: Node,
    visual: PrimitiveVisual,
    drawOrder: number,
  ): void {
    const node = new Node(`Visual_${visual.partId}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const graphics = node.addComponent(Graphics);
    const color = new Color().fromHEX(visual.color);
    graphics.strokeColor = color;
    graphics.fillColor = color;
    graphics.lineWidth = STICKMAN_REFERENCE_PLAN.lineWidth;
    if (visual.kind === "segment") {
      graphics.moveTo(visual.from.x, visual.from.y);
      graphics.lineTo(visual.to.x, visual.to.y);
      graphics.stroke();
      const capRadius = STICKMAN_REFERENCE_PLAN.lineWidth / 2;
      graphics.circle(visual.from.x, visual.from.y, capRadius);
      graphics.circle(visual.to.x, visual.to.y, capRadius);
      graphics.fill();
    } else {
      graphics.circle(visual.center.x, visual.center.y, visual.radius);
      graphics.fill();
      graphics.stroke();
    }
    node.addComponent(Sorting2D).sortingOrder = drawOrder;
  }

  private createMarker(parent: Node, jointId: string): Node {
    const node = new Node(`Marker_${jointId}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color().fromHEX("#22d3ee");
    graphics.strokeColor = new Color().fromHEX("#0f172a");
    graphics.lineWidth = 2;
    graphics.circle(0, 0, STICKMAN_REFERENCE_PLAN.jointMarkerRadius);
    graphics.fill();
    graphics.stroke();
    node.addComponent(Sorting2D).sortingOrder = 100 + this.bindings.size;
    return node;
  }

  private createHud(parent: Node): void {
    const title = this.createLabel(
      parent,
      "TASK-007 · Minimal Stickman Articulation Reference",
      28,
      0,
      210,
      "#f8fafc",
    );
    title.node.name = "Title";
    const state = this.createLabel(parent, "", 24, 0, 175, "#67e8f9");
    state.node.name = "ClipAndPlaybackState";
    this.statusLabel = state;
    const help = this.createLabel(
      parent,
      "1 Rest/Idle   2 Arm Wave   3 Walk Cycle   Space Play/Pause   R Rest   J Joints",
      18,
      0,
      -330,
      "#cbd5e1",
    );
    help.node.name = "Controls";
  }

  private createLabel(
    parent: Node,
    text: string,
    fontSize: number,
    x: number,
    y: number,
    color: string,
  ): Label {
    const node = new Node("Label");
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(920, fontSize + 14);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 4;
    label.color = new Color().fromHEX(color);
    return label;
  }

  private selectClip(index: number, play: boolean): void {
    this.activeClipIndex = index;
    this.clipElapsed = 0;
    this.statusNote = "";
    this.playback = new RigAnimationPlayback(this.clips[index]!);
    const sample = play ? this.playback.play() : this.playback.stop();
    this.apply(sample);
    this.updateStatus();
  }

  private apply(sample: RigAnimationSample): void {
    for (const [jointId, binding] of this.bindings) {
      const pose = composeJointPose(binding.restPose, sample.joints[jointId]);
      binding.node.setPosition(pose.position.x, pose.position.y, 0);
      binding.node.setRotationFromEuler(0, 0, pose.rotationDegrees);
      binding.node.setScale(pose.scale.x, pose.scale.y, 1);
    }
  }

  private restoreRest(): void {
    if (this.playback !== null) this.playback.stop();
    this.statusNote = "exact authored rest pose";
    for (const binding of this.bindings.values()) {
      const rest = binding.restPose;
      binding.node.setPosition(rest.position.x, rest.position.y, 0);
      binding.node.setRotationFromEuler(0, 0, rest.rotationDegrees);
      binding.node.setScale(rest.scale.x, rest.scale.y, 1);
    }
    this.updateStatus();
  }

  private setMarkers(visible: boolean): void {
    this.showJointMarkers = visible;
    for (const binding of this.bindings.values()) {
      binding.marker.active = visible;
    }
  }

  private updateStatus(note?: string): void {
    if (this.statusLabel === null || this.playback === null) return;
    const markerState = this.showJointMarkers ? "joints on" : "joints off";
    const visibleNote = note ?? this.statusNote;
    const suffix = visibleNote.length === 0 ? "" : ` · ${visibleNote}`;
    this.statusLabel.string =
      `CLIP  ${this.playback.animation.animationId}   ` +
      `STATE  ${this.playback.status.toUpperCase()}   ` +
      `TIME  ${this.playback.sample().sampleTime.toFixed(2)}s   ${markerState}${suffix}`;
  }

  private readonly onKeyDown = (event: EventKeyboard): void => {
    if (event.keyCode === KeyCode.DIGIT_1) this.selectClip(0, true);
    else if (event.keyCode === KeyCode.DIGIT_2) this.selectClip(1, true);
    else if (event.keyCode === KeyCode.DIGIT_3) this.selectClip(2, true);
    else if (event.keyCode === KeyCode.SPACE && this.playback !== null) {
      this.statusNote = "";
      this.apply(
        this.playback.status === "playing"
          ? this.playback.pause()
          : this.playback.play(),
      );
      this.updateStatus();
    } else if (event.keyCode === KeyCode.KEY_R) {
      this.restoreRest();
    } else if (event.keyCode === KeyCode.KEY_J) {
      this.setMarkers(!this.showJointMarkers);
      this.updateStatus();
    }
  };
}

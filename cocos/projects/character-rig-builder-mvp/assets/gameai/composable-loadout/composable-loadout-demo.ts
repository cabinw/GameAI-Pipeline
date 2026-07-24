import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
  HorizontalTextAlignment,
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
  VerticalTextAlignment,
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

import {
  calculateComposableLoadoutHudBounds,
  COMPOSABLE_LOADOUT_HUD_LAYOUT,
  resolveComposableLoadoutControlClips,
  type ComposableLoadoutControl,
} from "./composable-loadout-controls";
import { COMPOSABLE_LOADOUT_PLAN } from "./composable-loadout-data";

const { ccclass, executeInEditMode } = _decorator;
type PartPlan = (typeof COMPOSABLE_LOADOUT_PLAN.base.parts)[number];

@ccclass("GameAIComposableLoadoutDemo")
@executeInEditMode
export class GameAIComposableLoadoutDemo extends Component {
  private bindings = new Map<
    string,
    { sprite: Node; skeleton: Node; rest: JointRestPose }
  >();
  private attachments = new Map<string, Node>();
  private referenceSprite: Sprite | null = null;
  private overlaySprite: Sprite | null = null;
  private referenceView: Node | null = null;
  private assembledView: Node | null = null;
  private overlayView: Node | null = null;
  private skeletonView: Node | null = null;
  private status: Label | null = null;
  private playback: RigAnimationPlayback | null = null;
  private clipsByControl:
    | Readonly<Record<ComposableLoadoutControl, NormalizedRigAnimation>>
    | null = null;
  private presetId = "full-loadout";
  private propState = "left-hand";
  private debugNodes = new Map<string, Node[]>();
  private note = "";

  onLoad(): void {
    this.build();
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  start(): void {
    this.selectClip(1, false);
    this.exactReset();
  }

  update(delta: number): void {
    if (this.playback?.status === "playing") {
      this.apply(this.playback.update(delta));
    }
    this.updateHud();
  }

  onDestroy(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private build(): void {
    this.node.children.find((child) => child.name === "LoadoutGenerated")?.destroy();
    this.clipsByControl = resolveComposableLoadoutControlClips(
      COMPOSABLE_LOADOUT_PLAN.base.clips as unknown as NormalizedRigAnimation[],
    );
    const root = new Node("LoadoutGenerated");
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.setPosition(0, 24, 0);
    this.referenceView = this.display(root, "AuthoredReferenceView", -390);
    this.assembledView = this.display(root, "AssembledCharacterView", -65);
    this.skeletonView = this.display(root, "SkeletonDebugView", 355);
    this.referenceSprite = this.reference(this.referenceView, "Reference", false);
    this.overlayView = new Node("ReferenceAssembledOverlay");
    this.overlayView.layer = Layers.Enum.UI_2D;
    this.overlayView.setParent(this.assembledView);
    this.overlaySprite = this.reference(this.overlayView, "Overlay", true);
    this.overlayView.active = false;

    const spriteJoints = this.hierarchy(this.assembledView, "Sprite");
    const skeletonJoints = this.hierarchy(this.skeletonView, "Skeleton");
    for (const part of COMPOSABLE_LOADOUT_PLAN.base.parts) {
      const sprite = spriteJoints.get(part.jointId)!;
      const skeleton = skeletonJoints.get(part.jointId)!;
      this.addPart(sprite, part);
      this.addSkeleton(skeleton, part);
      this.bindings.set(part.jointId, {
        sprite,
        skeleton,
        rest: {
          position: { ...part.restPose.position },
          rotationDegrees: part.restPose.rotationDegrees,
          scale: { ...part.restPose.scale },
        },
      });
      this.marker(sprite, "joints", new Color().fromHEX("#22d3ee"), 5);
      this.marker(sprite, "pivots", new Color().fromHEX("#fde047"), 3);
      this.labelMarker(sprite, "global layer labels", `${part.sortingOrder} ${part.jointId}`);
      this.labelMarker(sprite, "parent links", part.parentId ?? "root");
    }
    this.addAttachments(spriteJoints);
    this.hud(this.node);
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
      COMPOSABLE_LOADOUT_PLAN.base.sourceCanvas.width *
        COMPOSABLE_LOADOUT_PLAN.base.referenceScale,
      COMPOSABLE_LOADOUT_PLAN.base.sourceCanvas.height *
        COMPOSABLE_LOADOUT_PLAN.base.referenceScale,
    );
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    node.addComponent(Sorting2D).sortingOrder = translucent ? 250 : 200;
    if (translucent) node.addComponent(UIOpacity).opacity = 105;
    return sprite;
  }

  private hierarchy(parent: Node, prefix: string): Map<string, Node> {
    const nodes = new Map<string, Node>();
    for (const part of COMPOSABLE_LOADOUT_PLAN.base.parts) {
      const node = new Node(`${prefix}Joint_${part.jointId}`);
      node.layer = Layers.Enum.UI_2D;
      nodes.set(part.jointId, node);
    }
    for (const part of COMPOSABLE_LOADOUT_PLAN.base.parts) {
      const node = nodes.get(part.jointId)!;
      node.setParent(part.parentId === null ? parent : nodes.get(part.parentId)!);
      this.setPose(node, part.restPose);
    }
    return nodes;
  }

  private addPart(parent: Node, part: PartPlan): void {
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
    this.load(part.resourcePath, sprite);
    this.marker(
      visual,
      "bounds",
      new Color().fromHEX("#22c55e"),
      Math.max(part.visualSize.width, part.visualSize.height) / 2,
    );
  }

  private addSkeleton(parent: Node, part: PartPlan): void {
    const graphics = parent.addComponent(Graphics);
    graphics.strokeColor = new Color().fromHEX("#94a3b8");
    graphics.lineWidth = 2;
    graphics.moveTo(0, 0);
    graphics.lineTo(0, -Math.max(18, part.visualSize.height * 0.45));
    graphics.stroke();
    this.marker(parent, "skeleton", new Color().fromHEX("#ffffff"), 4);
  }

  private addAttachments(joints: ReadonlyMap<string, Node>): void {
    const slots = new Map<string, Node>();
    for (const slot of COMPOSABLE_LOADOUT_PLAN.slots) {
      const node = new Node(`Slot_${slot.slotId}`);
      node.layer = Layers.Enum.UI_2D;
      node.setParent(joints.get(slot.parentPartId)!);
      this.setPose(node, slot.transform);
      slots.set(slot.slotId, node);
      this.labelMarker(node, "attachment slots", slot.slotId);
      if ((slot as { target?: { kind: string } }).target?.kind === "socket") {
        this.marker(node, "sockets", new Color().fromHEX("#e879f9"), 7);
      }
    }
    for (const attachment of COMPOSABLE_LOADOUT_PLAN.attachments) {
      const pivot = new Node(`Attachment_${attachment.attachmentId}`);
      pivot.layer = Layers.Enum.UI_2D;
      pivot.setParent(slots.get(attachment.slotId)!);
      this.setPose(pivot, attachment.transform);
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
      this.load(attachment.resourcePath, sprite);
      this.attachments.set(attachment.attachmentId, pivot);
      this.labelMarker(
        pivot,
        "global layer labels",
        `${attachment.sortingOrder} ${attachment.attachmentId}`,
      );
      if (
        "attachmentKind" in attachment &&
        attachment.attachmentKind === "prop"
      ) {
        this.marker(pivot, "grip markers", new Color().fromHEX("#ef4444"), 7);
      }
      if (attachment.familyId === "garment") {
        this.marker(
          pivot,
          "garment seams",
          new Color().fromHEX("#fb923c"),
          4,
        );
      }
    }
  }

  private marker(parent: Node, group: string, color: Color, radius: number): void {
    const node = new Node(group);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const graphics = node.addComponent(Graphics);
    graphics.strokeColor = color;
    graphics.lineWidth = 2;
    graphics.circle(0, 0, radius);
    graphics.stroke();
    const entries = this.debugNodes.get(group) ?? [];
    entries.push(node);
    this.debugNodes.set(group, entries);
  }

  private labelMarker(parent: Node, group: string, text: string): void {
    const node = new Node(group);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(7, 7, 0);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = 10;
    label.lineHeight = 12;
    label.color = new Color().fromHEX("#ffffff");
    const entries = this.debugNodes.get(group) ?? [];
    entries.push(node);
    this.debugNodes.set(group, entries);
  }

  private hud(parent: Node): void {
    const node = new Node("HUD");
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    const bounds = calculateComposableLoadoutHudBounds();
    node.setPosition(bounds.position.x, bounds.position.y, 0);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(
      COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorX,
      COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorY,
    );
    transform.setContentSize(
      COMPOSABLE_LOADOUT_HUD_LAYOUT.width,
      COMPOSABLE_LOADOUT_HUD_LAYOUT.height,
    );
    this.status = node.addComponent(Label);
    this.status.fontSize = 15;
    this.status.lineHeight = COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight;
    this.status.horizontalAlign = HorizontalTextAlignment.LEFT;
    this.status.verticalAlign = VerticalTextAlignment.TOP;
    this.status.color = new Color().fromHEX("#ffffff");
  }

  private onKeyDown(event: EventKeyboard): void {
    const numeric: Partial<Record<number, ComposableLoadoutControl>> = {
      [KeyCode.DIGIT_1]: 1,
      [KeyCode.DIGIT_2]: 2,
      [KeyCode.DIGIT_3]: 3,
      [KeyCode.DIGIT_4]: 4,
      [KeyCode.DIGIT_5]: 5,
    };
    const control = numeric[event.keyCode];
    if (control !== undefined) {
      this.selectClip(control, true);
      return;
    }
    const presets = [
      "base-only",
      "accessories-only",
      "garment-only",
      "prop-only",
      "garment-accessories",
      "garment-prop",
      "accessories-prop",
      "full-loadout",
    ];
    if (event.keyCode >= KeyCode.F1 && event.keyCode <= KeyCode.F8) {
      this.presetId = presets[event.keyCode - KeyCode.F1]!;
      this.applyState();
      return;
    }
    if (event.keyCode === KeyCode.KEY_Q) this.setPropState("no-prop");
    if (event.keyCode === KeyCode.KEY_W) this.setPropState("left-hand");
    if (event.keyCode === KeyCode.KEY_E) this.setPropState("right-hand");
    if (event.keyCode === KeyCode.SPACE) {
      if (this.playback?.status === "playing") this.playback.pause();
      else this.playback?.play();
    }
    if (event.keyCode === KeyCode.ESCAPE) this.exactReset();
    if (event.keyCode === KeyCode.KEY_R && this.referenceView) {
      this.referenceView.active = !this.referenceView.active;
    }
    if (event.keyCode === KeyCode.KEY_A && this.assembledView) {
      this.assembledView.active = !this.assembledView.active;
    }
    if (event.keyCode === KeyCode.KEY_O && this.overlayView) {
      this.overlayView.active = !this.overlayView.active;
    }
    const toggles: Partial<Record<number, string>> = {
      [KeyCode.KEY_J]: "joints",
      [KeyCode.KEY_B]: "bounds",
      [KeyCode.KEY_P]: "pivots",
      [KeyCode.KEY_L]: "parent links",
      [KeyCode.KEY_G]: "global layer labels",
      [KeyCode.KEY_T]: "attachment slots",
      [KeyCode.KEY_M]: "garment seams",
      [KeyCode.KEY_S]: "sockets",
      [KeyCode.KEY_K]: "grip markers",
      [KeyCode.KEY_Y]: "skeleton",
    };
    const group = toggles[event.keyCode];
    if (group !== undefined) {
      const nodes = this.debugNodes.get(group) ?? [];
      const active = !(nodes[0]?.active ?? false);
      for (const node of nodes) node.active = active;
      if (group === "skeleton" && this.skeletonView) this.skeletonView.active = active;
    }
  }

  private setPropState(state: "no-prop" | "left-hand" | "right-hand"): void {
    this.propState = state;
    if (this.presetId === "full-loadout") {
      this.presetId =
        state === "no-prop"
          ? "full-loadout-no-prop"
          : state === "left-hand"
            ? "full-loadout-left"
            : "full-loadout-right";
    }
    this.applyState();
  }

  private selectClip(control: ComposableLoadoutControl, play: boolean): void {
    const clip = this.clipsByControl?.[control];
    if (clip === undefined) return;
    this.playback = new RigAnimationPlayback(clip);
    this.apply(play ? this.playback.play() : this.playback.stop());
    this.note = `semantic control ${control}`;
  }

  private exactReset(): void {
    this.presetId = "full-loadout";
    this.propState = "left-hand";
    this.selectClip(1, false);
    this.applyState();
    this.note = "Exact Reset";
  }

  private applyState(): void {
    const state =
      COMPOSABLE_LOADOUT_PLAN.states[
        this.presetId as keyof typeof COMPOSABLE_LOADOUT_PLAN.states
      ] ?? COMPOSABLE_LOADOUT_PLAN.states["full-loadout"];
    const enabled = new Set<string>(state.enabledAttachmentIds);
    for (const [attachmentId, node] of this.attachments) {
      node.active = enabled.has(attachmentId);
    }
    const referenceId =
      this.presetId in COMPOSABLE_LOADOUT_PLAN.referenceResourcePaths
        ? this.presetId
        : "full-loadout";
    const path =
      COMPOSABLE_LOADOUT_PLAN.referenceResourcePaths[
        referenceId as keyof typeof COMPOSABLE_LOADOUT_PLAN.referenceResourcePaths
      ];
    if (path !== undefined) {
      if (this.referenceSprite) this.load(path, this.referenceSprite);
      if (this.overlaySprite) this.load(path, this.overlaySprite);
    }
    this.updateHud();
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
      position: { readonly x: number; readonly y: number };
      rotationDegrees: number;
      scale: { readonly x: number; readonly y: number };
    },
  ): void {
    node.setPosition(pose.position.x, pose.position.y, 0);
    node.setRotationFromEuler(0, 0, pose.rotationDegrees);
    node.setScale(pose.scale.x, pose.scale.y, 1);
  }

  private load(resourcePath: string, sprite: Sprite): void {
    resources.load(resourcePath, SpriteFrame, (error, frame) => {
      if (error) {
        this.note = `LOAD ERROR ${resourcePath}`;
        return;
      }
      sprite.spriteFrame = frame;
    });
  }

  private updateDebug(): void {
    for (const [group, nodes] of this.debugNodes) {
      const skeleton = group === "skeleton";
      for (const node of nodes) node.active = skeleton ? false : false;
    }
    if (this.skeletonView) this.skeletonView.active = false;
  }

  private updateHud(): void {
    if (!this.status) return;
    const clipId = this.playback?.animation.animationId ?? "none";
    const playbackState = this.playback?.status.toUpperCase() ?? "STOPPED";
    const time = this.playback?.time ?? 0;
    this.status.string =
      `TASK-013 · COMPOSABLE FULL CHARACTER LOADOUT\n` +
      `PRESET ${this.presetId} · PROP ${this.propState} · CLIP ID ${clipId} · ${playbackState} ${time.toFixed(2)}\n` +
      `GRIP PASS · SEAMS PASS · ACCESSORY SOCKETS PASS · GLOBAL LAYERS PASS · EXACT 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS\n` +
      `F1–F8 presets · Q/W/E prop · 1–5 clips · Space Pause/Resume · Esc exact Reset · R/A/O views · J/B/P/L/G/T/M/S/K/Y debug · ${this.note}`;
  }
}

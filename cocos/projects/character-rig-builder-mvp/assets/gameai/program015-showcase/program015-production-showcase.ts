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
  UITransform,
  Vec3,
} from "cc";

import {
  createPrevalidatedCharacterSemanticEventEvaluator,
  type CharacterSemanticEventContract,
  type CharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
  type SemanticEventValidationContext,
} from "@gameai/character-semantic-events/dist/runtime-esm/runtime.js";
import {
  composeJointPose,
  RigAnimationPlayback,
  type NormalizedRigAnimation,
  type RigAnimationSample,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";

import {
  compileCocosVfxRenderDescriptors,
  type CocosVfxResourceRecipe,
} from "../task014d2/cocos-vfx-render-descriptor";
import { CocosVfxRuntimeState } from "../task014d2/cocos-vfx-runtime-state";
import {
  CocosRenderPlanHost,
  type CocosResourceRealization,
} from "../task014d2/task014d2-cocos-vfx-render-plan-adapter";
import {
  RED_CAP_PRODUCTION_MOTION_CLIPS,
  RED_CAP_PRODUCTION_SEMANTIC_CONTEXT,
  RED_CAP_PRODUCTION_SEMANTIC_EVENTS,
} from "../red-cap-production/red-cap-production-motion-data";
import { RED_CAP_PRODUCTION_STATIC_PLAN } from "../red-cap-production/red-cap-production-static-data";
import {
  PROGRAM015_SHOWCASE_CHARACTER_BOUNDS,
  PROGRAM015_SHOWCASE_LAYOUT,
  PROGRAM015_SHOWCASE_RENDER_PLAN,
  PROGRAM015_SHOWCASE_RESOURCES,
} from "./program015-showcase-data";

const { ccclass } = _decorator;

const RESOURCE_PATHS = {
  background: "program015-showcase/training-ground-background/spriteFrame",
  productionLite: "program015-showcase/production-lite-character/spriteFrame",
  redCapAtlas: "red-cap-production-v1/parts-atlas/spriteFrame",
  vfxSoftMask: "program015-showcase/vfx-soft-mask/spriteFrame",
} as const;
const CREATOR_VERSION = "3.8.8";
const SCENE_ID = "red-cap-production-showcase";
const RUNTIME_ID = "program015-live-jointed-showcase-v2";
const VIEWPORT = { width: 1280, height: 720 } as const;

type SequenceStage = "hold" | "dust" | "trail" | "aura" | "final";
type ClipName = keyof typeof RED_CAP_PRODUCTION_MOTION_CLIPS;
type PartPlan = (typeof RED_CAP_PRODUCTION_STATIC_PLAN.parts)[number];
type RuntimeSnapshot = {
  readonly action: string;
  readonly clip: ClipName;
  readonly animationTime: number;
  readonly playbackStatus: string;
  readonly paused: boolean;
  readonly stress: boolean;
  readonly debug: boolean;
  readonly stage: SequenceStage;
  readonly runtimeRoots: number;
  readonly inputHandlers: number;
  readonly duplicateRoots: number;
  readonly activeVfx: number;
  readonly staleVfx: number;
  readonly leakedVfx: number;
  readonly cleanupErrors: number;
  readonly setupCount: number;
  readonly teardownCount: number;
  readonly rebuildCount: number;
  readonly leftGripWorld: readonly [number, number];
  readonly leftFootWorld: readonly [number, number];
  readonly rightFootWorld: readonly [number, number];
  readonly maximumProjectionErrorPx: number;
  readonly maximumPositionErrorPx: number;
  readonly maximumRotationErrorDegrees: number;
  readonly maximumAabbOverflowPx: number;
  readonly materialBlendMismatches: number;
  readonly duplicateDestroys: number;
  readonly visibilityMismatches: number;
};
type EvidenceIdentity = {
  readonly featureSha: string;
  readonly sceneId: typeof SCENE_ID;
  readonly runtimeId: typeof RUNTIME_ID;
  readonly sessionId: string;
  readonly viewport: typeof VIEWPORT;
  readonly creatorVersion: typeof CREATOR_VERSION;
  readonly manualEvidence: boolean;
};
type EvidenceDiagnostics = {
  readonly schemaVersion: "1.0.0";
  readonly identity: EvidenceIdentity;
  readonly events: Array<{ readonly sequence: number; readonly snapshot: RuntimeSnapshot }>;
  latest: RuntimeSnapshot | null;
};

const TRACK_BY_CLIP: Record<ClipName, string> = {
  rest: "red-cap-rest-events",
  idle: "red-cap-idle-events",
  walk: "red-cap-walk-events",
  wave: "red-cap-wave-events",
};

@ccclass("Program015ProductionShowcase")
export class Program015ProductionShowcase extends Component {
  private runtimeRoot: Node | null = null;
  private vfxHost: CocosRenderPlanHost | null = null;
  private vfxRuntime: CocosVfxRuntimeState | null = null;
  private targets = new Map<string, Node>();
  private redCapJoints = new Map<string, Node>();
  private redCapFrames: SpriteFrame[] = [];
  private productionLiteRoot: Node | null = null;
  private redCapRoot: Node | null = null;
  private hudPanel: Node | null = null;
  private hud: Label | null = null;
  private playback: RigAnimationPlayback | null = null;
  private semantic: CharacterSemanticEventEvaluator | null = null;
  private activeClip: ClipName = "rest";
  private generation = 0;
  private elapsed = 0;
  private paused = false;
  private stressed = false;
  private debug = false;
  private stage: SequenceStage = "hold";
  private commandCounter = 0;
  private setupCount = 0;
  private teardownCount = 0;
  private rebuildCount = 0;
  private cleanupErrorCount = 0;
  private action = "BOOT";
  private eventSequence = 0;
  private readonly identity = resolveEvidenceIdentity();
  private readonly diagnostics: EvidenceDiagnostics = {
    schemaVersion: "1.0.0",
    identity: this.identity,
    events: [],
    latest: null,
  };

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    publishDiagnostics(this.diagnostics);
    void this.rebuild(false);
  }

  update(deltaSeconds: number): void {
    if (
      this.paused ||
      this.vfxRuntime === null ||
      this.playback === null ||
      this.semantic === null
    ) {
      this.updateHud();
      return;
    }
    this.elapsed += deltaSeconds;
    const sample = this.playback.update(deltaSeconds);
    this.applyRedCapSample(sample);
    this.dispatchSemantic(this.semantic.advance(deltaSeconds));
    this.vfxRuntime.tick(deltaSeconds);
    if (!this.identity.manualEvidence) this.advanceSequence();
    this.updateHud();
  }

  onDisable(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.disposeRuntime("dispose");
  }

  private async rebuild(explicit: boolean): Promise<void> {
    const generation = ++this.generation;
    if (explicit) this.rebuildCount += 1;
    this.disposeRuntime("rebuild");
    this.elapsed = 0;
    this.paused = false;
    this.stressed = false;
    this.debug = false;
    this.stage = "hold";
    this.activeClip = "rest";
    this.action = explicit ? `REBUILD_${this.rebuildCount}_LOADING` : "INITIALIZING";
    const frames = await Promise.all([
      loadSpriteFrame(RESOURCE_PATHS.background),
      loadSpriteFrame(RESOURCE_PATHS.productionLite),
      loadSpriteFrame(RESOURCE_PATHS.redCapAtlas),
      loadSpriteFrame(RESOURCE_PATHS.vfxSoftMask),
    ]);
    if (
      generation !== this.generation ||
      !this.enabled ||
      !this.node.activeInHierarchy
    ) return;
    this.buildRuntime(frames[0], frames[1], frames[2], frames[3]);
    this.setupCount += 1;
    this.publish(explicit ? `REBUILD_${this.rebuildCount}_READY` : "READY");
  }

  private buildRuntime(
    backgroundFrame: SpriteFrame,
    productionLiteFrame: SpriteFrame,
    redCapAtlasFrame: SpriteFrame,
    vfxSoftMaskFrame: SpriteFrame,
  ): void {
    const root = new Node("PROGRAM015_Showcase_Runtime");
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.addComponent(UITransform).setContentSize(VIEWPORT.width, VIEWPORT.height);
    this.runtimeRoot = root;

    createSprite(
      root,
      "LicensedTrainingGround",
      backgroundFrame,
      VIEWPORT.width,
      VIEWPORT.height,
      0,
      0,
      -10000,
    );

    const production = createCharacter(
      root,
      "CHR_showcase_production_lite",
      productionLiteFrame,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.width,
      PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.height,
      PROGRAM015_SHOWCASE_LAYOUT.characters[0].centerX - VIEWPORT.width / 2,
      VIEWPORT.height / 2 - PROGRAM015_SHOWCASE_LAYOUT.characters[0].footY +
        PROGRAM015_SHOWCASE_CHARACTER_BOUNDS.productionLite.height / 2,
      -1500,
    );
    this.productionLiteRoot = production;
    this.addTarget(production, "showcase.production-lite.left-foot", -32, -200);
    this.addTarget(production, "showcase.production-lite.body-center", 0, 0);

    const redCap = new Node("CHR_showcase_red_cap");
    redCap.layer = Layers.Enum.UI_2D;
    redCap.setParent(root);
    redCap.setPosition(
      PROGRAM015_SHOWCASE_LAYOUT.characters[1].centerX - VIEWPORT.width / 2,
      -48.8,
      0,
    );
    this.redCapRoot = redCap;
    this.redCapJoints = this.createRedCapJointHierarchy(redCap);
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      this.createRedCapPart(
        this.redCapJoints.get(part.jointId)!,
        part,
        redCapAtlasFrame,
      );
    }
    this.addTarget(
      this.redCapJoints.get("hand-left")!,
      "showcase.red-cap.left-grip",
      8.8,
      -22.8,
    );
    this.addTarget(
      this.redCapJoints.get("hand-right")!,
      "showcase.red-cap.right-grip",
      -8.8,
      -22.8,
    );
    this.addTarget(
      this.redCapJoints.get("torso")!,
      "showcase.red-cap.torso",
      0,
      32,
    );
    this.addTarget(
      this.redCapJoints.get("foot-left")!,
      "showcase.red-cap.left-foot",
      0,
      -78,
    );
    this.addTarget(
      this.redCapJoints.get("foot-right")!,
      "showcase.red-cap.right-foot",
      0,
      -78,
    );

    const compiled = compileCocosVfxRenderDescriptors(
      PROGRAM015_SHOWCASE_RENDER_PLAN,
      PROGRAM015_SHOWCASE_RESOURCES as readonly CocosVfxResourceRecipe[],
    );
    if (!compiled.ok) {
      throw new Error(
        `PROGRAM015_SHOWCASE_DESCRIPTOR_FAILURE:${JSON.stringify(compiled.errors)}`,
      );
    }
    const resourcesById = new Map<string, CocosResourceRealization>(
      PROGRAM015_SHOWCASE_RESOURCES.map((resource) => [
        resource.resourceId,
        {
          resourceId: resource.resourceId,
          recipeKind: resource.recipeKind,
          spriteFrame: resource.recipeKind === "textured-sprite"
            ? vfxSoftMaskFrame
            : null,
        },
      ]),
    );
    this.vfxHost = new CocosRenderPlanHost(
      root,
      (targetId) => this.targets.get(targetId),
      new Map(compiled.value.cues.map((cue, index) => [cue.cueId, index])),
      resourcesById,
      () => {},
    );
    this.vfxHost.verifyMaterialBlendGate(vfxSoftMaskFrame);
    this.vfxRuntime = new CocosVfxRuntimeState(compiled.value, this.vfxHost);
    this.semantic = this.createSemantic(TRACK_BY_CLIP.rest);
    this.playback = this.createPlayback("rest");
    this.applyRedCapSample(this.playback.stop());
    this.createHud(root);
  }

  private createPlayback(name: ClipName): RigAnimationPlayback {
    const clip = RED_CAP_PRODUCTION_MOTION_CLIPS[name];
    return new RigAnimationPlayback({
      schemaVersion: clip.schemaVersion,
      animationId: clip.animationId,
      rigId: clip.rig.rigId,
      rigSchemaVersion: clip.rig.schemaVersion,
      duration: clip.duration,
      loop: clip.loop,
      tracks: clip.tracks,
    } as unknown as NormalizedRigAnimation);
  }

  private createSemantic(trackId: string): CharacterSemanticEventEvaluator {
    return createPrevalidatedCharacterSemanticEventEvaluator(
      RED_CAP_PRODUCTION_SEMANTIC_EVENTS as unknown as CharacterSemanticEventContract,
      RED_CAP_PRODUCTION_SEMANTIC_CONTEXT as unknown as SemanticEventValidationContext,
      trackId,
    );
  }

  private createRedCapJointHierarchy(parent: Node): Map<string, Node> {
    const joints = new Map<string, Node>();
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const joint = new Node(`JNT_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      joints.get(part.jointId)!.setParent(
        part.parentId === null ? parent : joints.get(part.parentId)!,
      );
    }
    return joints;
  }

  private createRedCapPart(
    parent: Node,
    part: PartPlan,
    atlasFrame: SpriteFrame,
  ): void {
    const frame = new SpriteFrame();
    const mutableFrame = frame as SpriteFrame & {
      texture: unknown;
      rect: { x: number; y: number; width: number; height: number };
      originalSize: { width: number; height: number };
      offset: { x: number; y: number };
      rotated: boolean;
    };
    mutableFrame.texture = (atlasFrame as SpriteFrame & { texture: unknown }).texture;
    mutableFrame.rect = { ...part.atlasRect };
    mutableFrame.originalSize = {
      width: part.atlasRect.width,
      height: part.atlasRect.height,
    };
    mutableFrame.offset = { x: 0, y: 0 };
    mutableFrame.rotated = false;
    this.redCapFrames.push(frame);

    const visual = new Node(`SPR_${part.jointId}`);
    visual.layer = Layers.Enum.UI_2D;
    visual.setParent(parent);
    visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
    visual
      .addComponent(UITransform)
      .setContentSize(part.visualSize.width, part.visualSize.height);
    const sprite = visual.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    visual.addComponent(Sorting2D).sortingOrder = -500 + part.drawOrder;
  }

  private applyRedCapSample(sample: RigAnimationSample): void {
    const stress: Readonly<Record<string, number>> = this.stressed
      ? {
          "upper-arm-right": 8,
          "forearm-right": 8,
          "hand-right": 4,
          "upper-arm-left": -8,
          "forearm-left": -8,
          "hand-left": -4,
          "thigh-right": 5,
          "shin-right": 5,
          "foot-right": 3,
          "thigh-left": -5,
          "shin-left": -5,
          "foot-left": -3,
        }
      : {};
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const pose = composeJointPose(part.restPose, sample.joints[part.jointId]);
      const joint = this.redCapJoints.get(part.jointId);
      joint?.setPosition(pose.position.x, pose.position.y, 0);
      joint?.setRotationFromEuler(
        0,
        0,
        pose.rotationDegrees + (stress[part.jointId] ?? 0),
      );
      joint?.setScale(pose.scale.x, pose.scale.y, 1);
    }
  }

  private addTarget(parent: Node, targetId: string, x: number, y: number): void {
    const target = new Node(targetId);
    target.layer = Layers.Enum.UI_2D;
    target.setParent(parent);
    target.setPosition(x, y, 0);
    target.addComponent(UITransform).setContentSize(8, 8);
    this.targets.set(targetId, target);
  }

  private createHud(root: Node): void {
    const panel = new Node("PROGRAM015_HUD_PANEL");
    panel.layer = Layers.Enum.UI_2D;
    panel.setParent(root);
    panel.setPosition(0, 310, 0);
    panel.addComponent(UITransform).setContentSize(1240, 82);
    const graphics = panel.addComponent(Graphics);
    panel.addComponent(Sorting2D).sortingOrder = 9500;
    graphics.fillColor = new Color(5, 14, 28, 232);
    graphics.rect(-620, -41, 1240, 82);
    graphics.fill();

    const text = new Node("PROGRAM015_HUD_TEXT");
    text.layer = Layers.Enum.UI_2D;
    text.setParent(panel);
    text.addComponent(UITransform).setContentSize(1208, 70);
    const label = text.addComponent(Label);
    text.addComponent(Sorting2D).sortingOrder = 9501;
    label.fontSize = 15;
    label.lineHeight = 22;
    label.color = new Color(255, 248, 220, 255);
    label.horizontalAlign = HorizontalTextAlignment.LEFT;
    label.overflow = Label.Overflow.CLAMP;
    this.hudPanel = panel;
    this.hud = label;
  }

  private selectClip(name: ClipName): void {
    if (this.semantic === null) return;
    this.dispatchSemantic(this.semantic.switchTrack(TRACK_BY_CLIP[name]));
    this.activeClip = name;
    this.playback = this.createPlayback(name);
    this.playback.play();
    this.semantic.play();
    this.applyRedCapSample(this.playback.sample());
    this.publish(`CLIP_${name.toUpperCase()}`);
  }

  private advanceSequence(): void {
    if (this.stage === "hold" && this.elapsed >= 1) {
      this.emitDust();
    } else if (this.stage === "dust" && this.elapsed >= 2.25) {
      this.startTrail();
    } else if (this.stage === "trail" && this.elapsed >= 4) {
      this.stopTrail();
      this.startAura();
    }
  }

  private emitDust(): void {
    this.vfxRuntime?.dispatch({
      command: "emit",
      cueId: "program015-dust",
      commandId: `program015-dust-${++this.commandCounter}`,
      targetId: "showcase.production-lite.left-foot",
    });
    this.stage = "dust";
    this.publish("DUST");
  }

  private startTrail(): void {
    if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.trail.active")) {
      return;
    }
    this.vfxRuntime?.dispatch({
      command: "start",
      cueId: "program015-trail",
      commandId: `program015-trail-${++this.commandCounter}`,
      instanceId: "program015.trail.active",
      targetId: "showcase.red-cap.left-grip",
    });
    this.stage = "trail";
    this.publish("TRAIL_START");
  }

  private stopTrail(): void {
    if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.trail.active")) {
      this.vfxRuntime.dispatch({
        command: "stop",
        instanceId: "program015.trail.active",
        reason: "semantic-stop",
      });
    }
    this.publish("TRAIL_STOP");
  }

  private startAura(): void {
    if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.aura.active")) {
      return;
    }
    this.vfxRuntime?.dispatch({
      command: "start",
      cueId: "program015-aura",
      commandId: `program015-aura-${++this.commandCounter}`,
      instanceId: "program015.aura.active",
      targetId: "showcase.red-cap.torso",
    });
    this.stage = "final";
    this.publish("AURA_START");
  }

  private stopAura(): void {
    if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.aura.active")) {
      this.vfxRuntime.dispatch({
        command: "stop",
        instanceId: "program015.aura.active",
        reason: "semantic-stop",
      });
    }
    this.publish("AURA_STOP");
  }

  private cleanVfx(): void {
    this.vfxRuntime?.rebuild();
    this.stage = "hold";
    this.publish("VFX_CLEAN");
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      if (this.playback?.status === "playing") this.playback.pause();
      this.semantic?.pause();
    } else {
      if (this.playback?.status === "paused") this.playback.play();
      this.semantic?.resume();
    }
    this.vfxRuntime?.setPaused(this.paused);
    this.publish(this.paused ? "PAUSED" : "RESUMED");
  }

  private exactReset(): void {
    if (this.vfxRuntime === null) return;
    this.vfxRuntime.rebuild();
    this.semantic?.dispose();
    this.semantic = this.createSemantic(TRACK_BY_CLIP.rest);
    this.playback = this.createPlayback("rest");
    this.activeClip = "rest";
    this.applyRedCapSample(this.playback.stop());
    this.elapsed = 0;
    this.paused = false;
    this.stressed = false;
    this.debug = false;
    this.stage = "hold";
    this.vfxHost?.setDebug(false);
    this.productionLiteRoot?.setScale(1, 1, 1);
    this.redCapRoot?.setScale(1, 1, 1);
    this.publish("EXACT_RESET");
  }

  private dispatchSemantic(commands: readonly EvaluatedSemanticEvent[]): void {
    for (const command of commands) {
      console.info(
        "PROGRAM015_LIVE_SEMANTIC",
        JSON.stringify({
          identity: this.identity,
          command: command.command,
          eventId: command.eventId,
          cycle: command.cycle,
          reason: command.command === "stop" ? command.reason : undefined,
        }),
      );
    }
  }

  private onKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.DIGIT_1) this.selectClip("rest");
    else if (event.keyCode === KeyCode.DIGIT_2) this.selectClip("idle");
    else if (event.keyCode === KeyCode.DIGIT_3) this.selectClip("walk");
    else if (event.keyCode === KeyCode.DIGIT_4) this.selectClip("wave");
    else if (event.keyCode === KeyCode.DIGIT_5) this.emitDust();
    else if (event.keyCode === KeyCode.DIGIT_6) {
      if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.trail.active")) {
        this.stopTrail();
      } else this.startTrail();
    } else if (event.keyCode === KeyCode.DIGIT_7) {
      if (this.vfxRuntime?.snapshot().activeCueKeys.includes("program015.aura.active")) {
        this.stopAura();
      } else this.startAura();
    } else if (event.keyCode === KeyCode.KEY_C) this.cleanVfx();
    else if (event.keyCode === KeyCode.SPACE) this.togglePause();
    else if (event.keyCode === KeyCode.KEY_T) {
      this.stressed = !this.stressed;
      this.applyRedCapSample(this.playback?.sample() ?? this.createPlayback("rest").sample());
      this.publish(this.stressed ? "STRESS_ON" : "STRESS_OFF");
    } else if (event.keyCode === KeyCode.KEY_B) void this.rebuild(true);
    else if (event.keyCode === KeyCode.KEY_D) {
      this.debug = !this.debug;
      this.vfxHost?.setDebug(this.debug);
      this.publish(this.debug ? "DEBUG_ON" : "DEBUG_OFF");
    } else if (event.keyCode === KeyCode.KEY_R) this.exactReset();
    else if (event.keyCode === KeyCode.KEY_H) this.publish("DIAGNOSTIC");
  }

  private publish(action: string): void {
    this.action = action;
    const snapshot = this.snapshot(action);
    this.diagnostics.latest = snapshot;
    this.diagnostics.events.push({
      sequence: ++this.eventSequence,
      snapshot,
    });
    publishDiagnostics(this.diagnostics);
    this.updateHud();
    console.info(
      "PROGRAM015_LIVE_EVIDENCE",
      JSON.stringify({ identity: this.identity, sequence: this.eventSequence, snapshot }),
    );
  }

  private snapshot(action: string): RuntimeSnapshot {
    const vfx = this.vfxRuntime?.snapshot();
    const roots = this.node.children.filter(
      (child) => child.name === "PROGRAM015_Showcase_Runtime",
    ).length;
    const world = (targetId: string): readonly [number, number] => {
      const target = this.targets.get(targetId);
      if (target === undefined) return [0, 0];
      const position = new Vec3();
      target.getWorldPosition(position);
      return [round(position.x), round(position.y)];
    };
    return {
      action,
      clip: this.activeClip,
      animationTime: round(this.playback?.time ?? 0),
      playbackStatus: this.playback?.status ?? "stopped",
      paused: this.paused,
      stress: this.stressed,
      debug: this.debug,
      stage: this.stage,
      runtimeRoots: roots,
      inputHandlers: this.enabled ? 1 : 0,
      duplicateRoots: Math.max(0, roots - 1),
      activeVfx: vfx?.activeRendererCount ?? 0,
      staleVfx: vfx?.staleRendererCount ?? 0,
      leakedVfx: vfx?.extraRendererIds.length ?? 0,
      cleanupErrors:
        this.cleanupErrorCount + (vfx?.cleanupErrors.length ?? 0),
      setupCount: this.setupCount,
      teardownCount: this.teardownCount,
      rebuildCount: this.rebuildCount,
      leftGripWorld: world("showcase.red-cap.left-grip"),
      leftFootWorld: world("showcase.red-cap.left-foot"),
      rightFootWorld: world("showcase.red-cap.right-foot"),
      maximumProjectionErrorPx: round(
        this.vfxHost?.maximumProjectionErrorPx ?? 0,
      ),
      maximumPositionErrorPx: round(
        this.vfxHost?.maximumPositionErrorPx ?? 0,
      ),
      maximumRotationErrorDegrees: round(
        this.vfxHost?.maximumRotationErrorDegrees ?? 0,
      ),
      maximumAabbOverflowPx: round(
        this.vfxHost?.maximumViewportOverflowPx ?? 0,
      ),
      materialBlendMismatches: this.vfxHost?.materialBlendMismatches ?? 0,
      duplicateDestroys: this.vfxHost?.duplicateDestroys ?? 0,
      visibilityMismatches: this.vfxHost?.visibilityMismatches ?? 0,
    };
  }

  private updateHud(): void {
    if (this.hud === null) return;
    const snapshot = this.snapshot(this.action);
    const shortSha = this.identity.featureSha.slice(0, 12);
    this.hud.string =
      `PROGRAM-015 LIVE · SHA ${shortSha} · SESSION ${this.identity.sessionId} · ` +
      `SCENE ${SCENE_ID} · CREATOR ${CREATOR_VERSION} · 1280×720\n` +
      `${this.action} · ${snapshot.clip.toUpperCase()} ${snapshot.animationTime.toFixed(2)}s ` +
      `${snapshot.playbackStatus.toUpperCase()} · PAUSE ${snapshot.paused ? "ON" : "OFF"} · ` +
      `STRESS ${snapshot.stress ? "ON" : "OFF"} · DEBUG ${snapshot.debug ? "ON" : "OFF"} · ` +
      `VFX ${snapshot.activeVfx} · ROOT ${snapshot.runtimeRoots} · INPUT ${snapshot.inputHandlers} · ` +
      `DUP/LEAK/STALE/CLEAN ${snapshot.duplicateRoots}/${snapshot.leakedVfx}/` +
      `${snapshot.staleVfx}/${snapshot.cleanupErrors} · SETUP/TEARDOWN/REBUILD ` +
      `${snapshot.setupCount}/${snapshot.teardownCount}/${snapshot.rebuildCount} · ` +
      `POS/ROT/AABB ${Math.max(
        snapshot.maximumProjectionErrorPx,
        snapshot.maximumPositionErrorPx,
      ).toFixed(3)}/${snapshot.maximumRotationErrorDegrees.toFixed(3)}/` +
      `${snapshot.maximumAabbOverflowPx.toFixed(3)}`;
  }

  private disposeRuntime(reason: "dispose" | "rebuild"): void {
    if (this.runtimeRoot !== null) this.teardownCount += 1;
    try {
      this.semantic?.dispose();
      this.semantic = null;
      this.playback = null;
      this.vfxRuntime?.cleanup(reason);
      this.vfxRuntime = null;
      this.vfxHost = null;
      this.targets.clear();
      this.redCapJoints.clear();
      this.productionLiteRoot = null;
      this.redCapRoot = null;
      this.hudPanel = null;
      this.hud = null;
      this.runtimeRoot?.destroy();
      this.runtimeRoot = null;
      for (const frame of this.redCapFrames) {
        (frame as SpriteFrame & { destroy(): void }).destroy();
      }
      this.redCapFrames = [];
    } catch (cause) {
      this.cleanupErrorCount += 1;
      console.error(
        "PROGRAM015_LIVE_CLEANUP_ERROR",
        JSON.stringify({ identity: this.identity, reason, cause: String(cause) }),
      );
    }
  }
}

function resolveEvidenceIdentity(): EvidenceIdentity {
  const locationSearch =
    (globalThis as unknown as { location?: { search?: string } }).location?.search ?? "";
  const params = new URLSearchParams(locationSearch);
  const requestedSha = params.get("featureSha") ?? "";
  const requestedSession = params.get("evidenceSession") ?? "";
  return {
    featureSha: /^[0-9a-f]{40}$/.test(requestedSha)
      ? requestedSha
      : "unbound-feature-sha",
    sceneId: SCENE_ID,
    runtimeId: RUNTIME_ID,
    sessionId: /^[A-Za-z0-9._-]{8,96}$/.test(requestedSession)
      ? requestedSession
      : "program015-local-preview",
    viewport: VIEWPORT,
    creatorVersion: CREATOR_VERSION,
    manualEvidence: params.get("manualEvidence") === "1",
  };
}

function publishDiagnostics(diagnostics: EvidenceDiagnostics): void {
  (
    globalThis as unknown as {
      __PROGRAM015_LIVE_EVIDENCE__?: EvidenceDiagnostics;
    }
  ).__PROGRAM015_LIVE_EVIDENCE__ = diagnostics;
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function loadSpriteFrame(resourcePath: string): Promise<SpriteFrame> {
  return new Promise((resolve, reject) => {
    resources.load(resourcePath, SpriteFrame, (error, frame) => {
      if (error) reject(error);
      else if (frame === null) {
        reject(new Error(`PROGRAM015_RESOURCE_NULL:${resourcePath}`));
      } else resolve(frame);
    });
  });
}

function createSprite(
  parent: Node,
  name: string,
  frame: SpriteFrame,
  width: number,
  height: number,
  x: number,
  y: number,
  sortingOrder: number,
): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  node.setParent(parent);
  node.setPosition(x, y, 0);
  node.addComponent(UITransform).setContentSize(width, height);
  const sprite = node.addComponent(Sprite);
  sprite.spriteFrame = frame;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  node.addComponent(Sorting2D).sortingOrder = sortingOrder;
  return node;
}

function createCharacter(
  parent: Node,
  name: string,
  frame: SpriteFrame,
  width: number,
  height: number,
  x: number,
  y: number,
  sortingOrder: number,
): Node {
  return createSprite(
    parent,
    name,
    frame,
    width,
    height,
    x,
    y,
    sortingOrder,
  );
}

import {
  _decorator,
  Component,
  EventKeyboard,
  input,
  Input,
  KeyCode,
  Layers,
  Node,
  Sorting2D,
  Sprite,
  SpriteFrame,
  UITransform,
} from "cc";

import {
  createPrevalidatedCharacterSemanticEventEvaluator,
  type CharacterSemanticEventEvaluator,
  type CharacterSemanticEventContract,
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
  RED_CAP_PRODUCTION_MOTION_CLIPS,
  RED_CAP_PRODUCTION_SEMANTIC_CONTEXT,
  RED_CAP_PRODUCTION_SEMANTIC_EVENTS,
} from "./red-cap-production-motion-data";
import { RED_CAP_PRODUCTION_STATIC_PLAN } from "./red-cap-production-static-data";

const { ccclass, property } = _decorator;
type PartPlan = (typeof RED_CAP_PRODUCTION_STATIC_PLAN.parts)[number];
type ClipName = keyof typeof RED_CAP_PRODUCTION_MOTION_CLIPS;

const FAILURE_POINTS = [
  "before-resource-completion",
  "after-resource-completion",
  "after-root-publication",
  "after-input-publication",
  "after-target-publication",
  "after-renderer-creation",
  "after-sorting2d-attachment",
  "during-rebuild-detachment",
  "during-dispose-finalization",
] as const;
type FailurePoint = (typeof FAILURE_POINTS)[number];

const TRACK_BY_CLIP: Record<ClipName, string> = {
  rest: "red-cap-rest-events",
  idle: "red-cap-idle-events",
  walk: "red-cap-walk-events",
  wave: "red-cap-wave-events",
};

@ccclass("RedCapProductionMotionHarness")
export class RedCapProductionMotionHarness extends Component {
  @property
  atlasFrame: SpriteFrame | null = null;

  @property
  failurePoint = "";

  private generation = 0;
  private runtimeRoot: Node | null = null;
  private inputPublished = false;
  private recoveryInputPublished = false;
  private targets = new Map<string, Node>();
  private rendererFrames: SpriteFrame[] = [];
  private playback: RigAnimationPlayback | null = null;
  private semantic: CharacterSemanticEventEvaluator | null = null;
  private activeClip: ClipName = "rest";
  private transformStress = false;
  private debugProjection = false;
  private lastPrimaryError = "";
  private cleanupErrors: string[] = [];

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onRecoveryKeyDown, this);
    this.recoveryInputPublished = true;
    this.rebuild();
  }

  update(deltaSeconds: number): void {
    if (!this.playback || !this.semantic) return;
    const sample = this.playback.update(deltaSeconds);
    this.applySample(sample);
    this.dispatchSemantic(this.semantic.advance(deltaSeconds));
  }

  onDisable(): void {
    this.unpublishRecoveryInput();
    this.disposeRuntime(false);
  }

  onDestroy(): void {
    this.unpublishRecoveryInput();
    this.disposeRuntime(true);
  }

  rebuild(): void {
    const generation = ++this.generation;
    this.lastPrimaryError = "";
    try {
      this.disposeRuntime(false, true);
      this.fail("before-resource-completion");
      const atlasFrame = this.atlasFrame;
      if (!atlasFrame) {
        throw new Error("PROGRAM015_MOTION_RESOURCE: missing atlas");
      }
      if (generation !== this.generation) return;
      this.fail("after-resource-completion");
      this.publishRuntime(atlasFrame);
    } catch (cause) {
      this.failBuild(cause);
    }
  }

  exactReset(): void {
    this.failurePoint = "";
    this.activeClip = "rest";
    this.transformStress = false;
    this.debugProjection = false;
    this.rebuild();
  }

  private publishRuntime(atlasFrame: SpriteFrame): void {
    const root = new Node(RED_CAP_PRODUCTION_STATIC_PLAN.rootName);
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.setPosition(0, -20, 0);
    this.runtimeRoot = root;
    this.fail("after-root-publication");

    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputPublished = true;
    this.fail("after-input-publication");

    this.targets = this.createJointHierarchy(root);
    this.fail("after-target-publication");
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      this.createPart(this.targets.get(part.jointId)!, part, atlasFrame);
    }
    this.fail("after-renderer-creation");
    this.fail("after-sorting2d-attachment");

    this.semantic = createPrevalidatedCharacterSemanticEventEvaluator(
      RED_CAP_PRODUCTION_SEMANTIC_EVENTS as unknown as CharacterSemanticEventContract,
      RED_CAP_PRODUCTION_SEMANTIC_CONTEXT as unknown as SemanticEventValidationContext,
      TRACK_BY_CLIP.rest,
    );
    this.playback = this.createPlayback("rest");
    this.applySample(this.playback.stop());
    console.info(
      "PROGRAM015_MOTION_READY",
      JSON.stringify(this.snapshot()),
    );
  }

  private createPlayback(name: ClipName): RigAnimationPlayback {
    const clip = RED_CAP_PRODUCTION_MOTION_CLIPS[name];
    const normalized = {
      schemaVersion: clip.schemaVersion,
      animationId: clip.animationId,
      rigId: clip.rig.rigId,
      rigSchemaVersion: clip.rig.schemaVersion,
      duration: clip.duration,
      loop: clip.loop,
      tracks: clip.tracks,
    } as unknown as NormalizedRigAnimation;
    return new RigAnimationPlayback(normalized);
  }

  private selectClip(name: ClipName): void {
    if (!this.semantic) return;
    this.dispatchSemantic(this.semantic.switchTrack(TRACK_BY_CLIP[name]));
    this.activeClip = name;
    this.playback = this.createPlayback(name);
    this.playback.play();
    this.semantic.play();
    this.applySample(this.playback.sample());
    console.info("PROGRAM015_MOTION_CLIP", JSON.stringify(this.snapshot()));
  }

  private togglePause(): void {
    if (!this.playback || !this.semantic) return;
    if (this.playback.status === "playing") {
      this.playback.pause();
      this.semantic.pause();
    } else if (this.playback.status === "paused") {
      this.playback.play();
      this.semantic.resume();
    }
    console.info("PROGRAM015_MOTION_PAUSE", JSON.stringify(this.snapshot()));
  }

  private snapshot(): object {
    return {
      clip: this.activeClip,
      time: this.playback?.time ?? 0,
      status: this.playback?.status ?? "stopped",
      semanticStatus: this.semantic?.snapshot.status ?? "stopped",
      semanticInstances: this.semantic?.snapshot.activeInstanceIds.length ?? 0,
      roots: this.runtimeRoot ? 1 : 0,
      targets: this.targets.size,
      renderers: this.rendererFrames.length,
      stress: this.transformStress,
      debug: this.debugProjection,
      failurePoint: this.failurePoint,
    };
  }

  private createJointHierarchy(parent: Node): Map<string, Node> {
    const joints = new Map<string, Node>();
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const joint = new Node(`JNT_${part.jointId}`);
      joint.layer = Layers.Enum.UI_2D;
      joints.set(part.jointId, joint);
    }
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const joint = joints.get(part.jointId)!;
      joint.setParent(
        part.parentId === null ? parent : joints.get(part.parentId)!,
      );
    }
    return joints;
  }

  private createPart(
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
    this.rendererFrames.push(frame);

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
    visual.addComponent(Sorting2D).sortingOrder = 100 + part.drawOrder;
  }

  private applySample(sample: RigAnimationSample): void {
    const stress: Readonly<Record<string, number>> = this.transformStress
      ? {
          "upper-arm-right": 5,
          "forearm-right": 5,
          "hand-right": 3,
          "upper-arm-left": -5,
          "forearm-left": -5,
          "hand-left": -3,
        }
      : {};
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      const pose = composeJointPose(part.restPose, sample.joints[part.jointId]);
      const joint = this.targets.get(part.jointId);
      joint?.setPosition(pose.position.x, pose.position.y, 0);
      joint?.setRotationFromEuler(
        0,
        0,
        pose.rotationDegrees + (stress[part.jointId] ?? 0),
      );
      joint?.setScale(pose.scale.x, pose.scale.y, 1);
    }
  }

  private dispatchSemantic(commands: readonly EvaluatedSemanticEvent[]): void {
    for (const command of commands) {
      console.info(
        "PROGRAM015_MOTION_SEMANTIC",
        JSON.stringify({
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
    else if (event.keyCode === KeyCode.SPACE) this.togglePause();
    else if (event.keyCode === KeyCode.KEY_T) {
      this.transformStress = !this.transformStress;
      this.applySample(this.playback?.sample() ?? this.createPlayback("rest").sample());
      console.info("PROGRAM015_MOTION_STRESS", this.transformStress);
    } else if (event.keyCode === KeyCode.KEY_B) this.rebuild();
    else if (event.keyCode === KeyCode.KEY_D) {
      this.debugProjection = !this.debugProjection;
      console.info("PROGRAM015_MOTION_DEBUG", this.debugProjection);
    }
  }

  private onRecoveryKeyDown(event: EventKeyboard): void {
    if (event.keyCode === KeyCode.KEY_R) this.exactReset();
    else if (event.keyCode === KeyCode.KEY_G) this.cycleFault();
  }

  private unpublishRecoveryInput(): void {
    if (!this.recoveryInputPublished) return;
    input.off(Input.EventType.KEY_DOWN, this.onRecoveryKeyDown, this);
    this.recoveryInputPublished = false;
  }

  private cycleFault(): void {
    const current = FAILURE_POINTS.indexOf(this.failurePoint as FailurePoint);
    this.failurePoint =
      current + 1 >= FAILURE_POINTS.length ? "" : FAILURE_POINTS[current + 1];
    console.info(
      "PROGRAM015_MOTION_FAULT_SELECTED",
      this.failurePoint || "none",
    );
    if (this.failurePoint === "during-dispose-finalization") {
      this.disposeRuntime(true);
      this.failurePoint = "";
    }
    this.rebuild();
  }

  private disposeRuntime(finalizing: boolean, rebuilding = false): void {
    const cleanupErrors: string[] = [];
    const attempt = (step: string, action: () => void): void => {
      try {
        action();
      } catch (cause) {
        cleanupErrors.push(
          `${step}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    };
    if (rebuilding) {
      attempt("rebuild-detachment", () => this.fail("during-rebuild-detachment"));
    }
    attempt("semantic", () => {
      if (this.semantic) this.dispatchSemantic(this.semantic.dispose());
      this.semantic = null;
    });
    this.playback = null;
    if (this.inputPublished) {
      attempt("input", () => {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.inputPublished = false;
      });
    }
    attempt("targets", () => this.targets.clear());
    attempt("root", () => {
      this.runtimeRoot?.destroy();
      this.runtimeRoot = null;
    });
    attempt("renderers", () => {
      for (const frame of this.rendererFrames) {
        (frame as SpriteFrame & { destroy(): void }).destroy();
      }
      this.rendererFrames = [];
    });
    if (finalizing) {
      attempt("dispose-finalization", () => this.fail("during-dispose-finalization"));
    }
    this.cleanupErrors = cleanupErrors;
    if (cleanupErrors.length > 0) {
      console.error(
        "PROGRAM015_MOTION_CLEANUP_ERRORS",
        JSON.stringify({ primary: this.lastPrimaryError, cleanup: cleanupErrors }),
      );
    }
  }

  private fail(point: FailurePoint): void {
    if (this.failurePoint === point) {
      throw new Error(`PROGRAM015_MOTION_INJECTED:${point}`);
    }
  }

  private failBuild(cause: unknown): void {
    this.lastPrimaryError =
      cause instanceof Error ? cause.message : String(cause);
    this.disposeRuntime(false);
    console.error(
      "PROGRAM015_MOTION_BUILD_FAILED",
      JSON.stringify({ primary: this.lastPrimaryError, cleanup: this.cleanupErrors }),
    );
  }
}

export const RED_CAP_PRODUCTION_MOTION_FAILURE_POINTS = FAILURE_POINTS;

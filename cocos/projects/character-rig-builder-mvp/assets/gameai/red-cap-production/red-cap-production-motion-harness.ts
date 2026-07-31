import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
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

import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterSnapshot,
  AnimationReviewOverlay,
} from "@gameai/animation-review-core";
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
type ReviewMatrix = AnimationReviewAdapterSnapshot["parts"][number]["worldTransform"];

const REVIEW_ADAPTER_ID = "cocos-red-cap-production-motion";
const REVIEW_CLIPS: readonly ClipName[] = ["rest", "idle", "walk", "wave"];
const REVIEW_OVERLAYS: readonly AnimationReviewOverlay[] = [
  "skeleton",
  "pivots",
  "sockets",
  "hit-areas",
  "attachments",
];
const REVIEW_COMMANDS = [
  "describe",
  "select-clip",
  "play",
  "pause",
  "seek",
  "step",
  "set-rate",
  "set-loop",
  "set-overlay",
  "exact-reset",
] as const;

function multiplyReviewMatrix(
  left: ReviewMatrix,
  right: ReviewMatrix,
): ReviewMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    tx: left.a * right.tx + left.c * right.ty + left.tx,
    ty: left.b * right.tx + left.d * right.ty + left.ty,
  };
}

function localReviewMatrix(node: Node): ReviewMatrix {
  const radians = (node.eulerAngles.z * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    a: cosine * node.scale.x,
    b: sine * node.scale.x,
    c: -sine * node.scale.y,
    d: cosine * node.scale.y,
    tx: node.position.x,
    ty: node.position.y,
  };
}

function reviewRuntimeError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

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
  readonly animationReviewAdapterId = REVIEW_ADAPTER_ID;

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
  private reviewAdapterRevision = 0;
  private reviewRate = 1;
  private reviewLoop = true;
  private reviewSuppressedSemanticCommands = 0;
  private reviewOverlays: Record<AnimationReviewOverlay, boolean> = {
    skeleton: false,
    pivots: false,
    sockets: false,
    "hit-areas": false,
    attachments: false,
  };
  private reviewOverlayGraphics: Graphics | null = null;

  onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onRecoveryKeyDown, this);
    this.recoveryInputPublished = true;
    this.rebuild();
  }

  update(deltaSeconds: number): void {
    if (!this.playback || !this.semantic) return;
    deltaSeconds *= this.reviewRate;
    const sample = this.playback.update(deltaSeconds);
    this.applySample(sample);
    this.dispatchSemantic(this.semantic.advance(deltaSeconds));
    if (this.playback.status === "stopped") this.semantic.pause();
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
    this.resetReviewState();
    this.reviewAdapterRevision += 1;
  }

  animationReviewExecute(
    request: AnimationReviewAdapterRequest,
  ): AnimationReviewAdapterSnapshot {
    if (
      request.expectedRevision !== undefined &&
      request.expectedRevision !== this.reviewAdapterRevision
    ) {
      throw reviewRuntimeError(
        "COCOS_REVIEW_STALE_REVISION",
        `Expected runtime revision ${request.expectedRevision}, received ${this.reviewAdapterRevision}.`,
      );
    }
    if (request.command !== "describe" && (!this.playback || !this.semantic)) {
      throw reviewRuntimeError(
        "COCOS_REVIEW_RUNTIME_NOT_READY",
        "PROGRAM-015 motion runtime is not ready.",
      );
    }
    switch (request.command) {
      case "describe":
        break;
      case "select-clip":
        this.selectClip(request.payload.clipId as ClipName);
        break;
      case "play":
        this.playReview();
        break;
      case "pause":
        this.pauseReview();
        break;
      case "seek":
        this.seekReview(request.payload.time!);
        break;
      case "step":
        this.stepReview(
          request.payload.deltaFrames!,
          request.payload.frameRate!,
        );
        break;
      case "set-rate":
        this.reviewRate = request.payload.rate!;
        this.reviewAdapterRevision += 1;
        break;
      case "set-loop":
        this.setReviewLoop(request.payload.loop!);
        break;
      case "set-overlay":
        this.reviewOverlays[request.payload.overlay!] =
          request.payload.enabled!;
        this.redrawReviewOverlays();
        this.reviewAdapterRevision += 1;
        break;
      case "exact-reset":
        this.resetReviewState();
        this.reviewAdapterRevision += 1;
        break;
      default:
        throw reviewRuntimeError(
          "COCOS_REVIEW_COMMAND_UNSUPPORTED",
          `Unsupported animation review command ${String(request.command)}.`,
        );
    }
    return this.animationReviewSnapshot();
  }

  animationReviewSnapshot(): AnimationReviewAdapterSnapshot {
    const clip = RED_CAP_PRODUCTION_MOTION_CLIPS[this.activeClip];
    const matrices = this.reviewJointMatrices();
    return {
      adapterId: REVIEW_ADAPTER_ID,
      adapterRevision: this.reviewAdapterRevision,
      characterId: "red-cap-production-v1",
      rigId: RED_CAP_PRODUCTION_STATIC_PLAN.rigId,
      playback: {
        status: this.playback?.status ?? "stopped",
        time: this.playback?.time ?? 0,
        duration: clip.duration,
        rate: this.reviewRate,
        loop: this.reviewLoop,
        clipId: this.activeClip,
        availableClipIds: REVIEW_CLIPS,
      },
      capabilities: REVIEW_COMMANDS.map((command) => ({
        command,
        available: true,
      })),
      overlays: { ...this.reviewOverlays },
      parts: RED_CAP_PRODUCTION_STATIC_PLAN.parts.map((part) => ({
        partId: part.jointId,
        parentId: part.parentId,
        assetUrl:
          "db://assets/resources/red-cap-production-v1/parts-atlas.png",
        drawOrder: part.drawOrder,
        width: part.visualSize.width,
        height: part.visualSize.height,
        anchor: { ...part.anchor },
        visualOffset: { ...part.visualOffset },
        worldTransform: multiplyReviewMatrix(
          matrices.get(part.jointId) ?? {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            tx: 0,
            ty: 0,
          },
          {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            tx: part.visualOffset.x,
            ty: part.visualOffset.y,
          },
        ),
      })),
      joints: RED_CAP_PRODUCTION_STATIC_PLAN.parts.map((part) => {
        const matrix = matrices.get(part.jointId);
        return {
          jointId: part.jointId,
          parentId: part.parentId,
          worldPivot: { x: matrix?.tx ?? 0, y: matrix?.ty ?? 0 },
        };
      }),
      timeline: clip.tracks
        .map((track) => ({
          jointId: track.jointId,
          property: track.property,
          keyframes: track.keyframes.map((keyframe) => ({
            time: keyframe.time,
            value:
              typeof keyframe.value === "number"
                ? keyframe.value
                : { ...keyframe.value },
          })),
        }))
        .sort(
          (left, right) =>
            left.jointId.localeCompare(right.jointId) ||
            left.property.localeCompare(right.property),
        ),
      runtimeDiagnostics: {
        generation: this.generation,
        runtimeRoots: this.runtimeRoot === null ? 0 : 1,
        targets: this.targets.size,
        renderers: this.rendererFrames.length,
        semanticInstances:
          this.semantic?.snapshot.activeInstanceIds.length ?? 0,
        semanticTime: this.semantic?.snapshot.localTimeSeconds ?? 0,
        suppressedSemanticCommands: this.reviewSuppressedSemanticCommands,
        transformStress: this.transformStress,
        debugProjection: this.debugProjection,
        failurePoint: this.failurePoint || "none",
        primaryError: this.lastPrimaryError || "none",
        cleanupErrorCount: this.cleanupErrors.length,
      },
    };
  }

  private resetReviewState(): void {
    this.failurePoint = "";
    this.activeClip = "rest";
    this.transformStress = false;
    this.debugProjection = false;
    this.reviewRate = 1;
    this.reviewLoop = true;
    this.reviewSuppressedSemanticCommands = 0;
    for (const overlay of REVIEW_OVERLAYS) this.reviewOverlays[overlay] = false;
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
    const reviewOverlayNode = new Node("AnimationReviewOverlay");
    reviewOverlayNode.layer = Layers.Enum.UI_2D;
    reviewOverlayNode.setParent(root);
    this.reviewOverlayGraphics = reviewOverlayNode.addComponent(Graphics);
    reviewOverlayNode.addComponent(Sorting2D).sortingOrder = 1000;
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
    if (!REVIEW_CLIPS.includes(name)) {
      throw reviewRuntimeError(
        "COCOS_REVIEW_CLIP_NOT_FOUND",
        `Unknown PROGRAM-015 review clip ${String(name)}.`,
      );
    }
    if (!this.semantic) return;
    this.dispatchSemantic(this.semantic.switchTrack(TRACK_BY_CLIP[name]));
    this.activeClip = name;
    this.reviewLoop = RED_CAP_PRODUCTION_MOTION_CLIPS[name].loop;
    this.playback = this.createPlayback(name);
    this.playback.play();
    this.semantic.play();
    this.applySample(this.playback.sample());
    this.reviewAdapterRevision += 1;
    console.info("PROGRAM015_MOTION_CLIP", JSON.stringify(this.snapshot()));
  }

  private togglePause(): void {
    if (!this.playback || !this.semantic) return;
    if (this.playback.status === "playing") {
      this.pauseReview();
    } else if (this.playback.status === "paused") {
      this.playReview();
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

  private playReview(): void {
    if (!this.playback || !this.semantic) return;
    this.applySample(this.playback.play());
    if (this.semantic.snapshot.status === "paused") this.semantic.resume();
    else this.semantic.play();
    this.reviewAdapterRevision += 1;
  }

  private pauseReview(): void {
    if (!this.playback || !this.semantic) return;
    this.applySample(this.playback.pause());
    this.semantic.pause();
    this.reviewAdapterRevision += 1;
  }

  private seekReview(time: number): void {
    if (!this.playback || !this.semantic) return;
    const clip = RED_CAP_PRODUCTION_MOTION_CLIPS[this.activeClip];
    const bounded = this.reviewLoop
      ? time % clip.duration
      : Math.min(time, clip.duration);
    this.applySample(this.playback.seek(Math.max(0, bounded)));
    this.playback.pause();
    this.synchronizeReviewSemantic(Math.max(0, bounded), "paused");
    this.reviewAdapterRevision += 1;
  }

  private stepReview(deltaFrames: number, frameRate: number): void {
    this.seekReview(
      (this.playback?.time ?? 0) + deltaFrames / frameRate,
    );
  }

  private setReviewLoop(loop: boolean): void {
    if (!this.playback) return;
    const time = this.playback.time;
    const status = this.playback.status;
    const source = RED_CAP_PRODUCTION_MOTION_CLIPS[this.activeClip];
    const normalized = {
      schemaVersion: source.schemaVersion,
      animationId: source.animationId,
      rigId: source.rig.rigId,
      rigSchemaVersion: source.rig.schemaVersion,
      duration: source.duration,
      loop,
      tracks: source.tracks,
    } as unknown as NormalizedRigAnimation;
    this.reviewLoop = loop;
    this.playback = new RigAnimationPlayback(normalized);
    this.applySample(this.playback.seek(Math.min(time, source.duration)));
    if (status === "playing") {
      this.playback.play();
    } else if (status === "paused") {
      this.playback.play();
      this.playback.pause();
    }
    this.reviewAdapterRevision += 1;
  }

  private synchronizeReviewSemantic(
    time: number,
    status: "playing" | "paused" | "stopped",
  ): void {
    if (this.semantic) this.dispatchSemantic(this.semantic.dispose());
    this.semantic = createPrevalidatedCharacterSemanticEventEvaluator(
      RED_CAP_PRODUCTION_SEMANTIC_EVENTS as unknown as CharacterSemanticEventContract,
      RED_CAP_PRODUCTION_SEMANTIC_CONTEXT as unknown as SemanticEventValidationContext,
      TRACK_BY_CLIP[this.activeClip],
    );
    if (status === "stopped") return;
    this.semantic.play();
    this.reviewSuppressedSemanticCommands +=
      this.semantic.advance(time).length;
    if (status === "paused") this.semantic.pause();
  }

  private reviewJointMatrices(): ReadonlyMap<string, ReviewMatrix> {
    const matrices = new Map<string, ReviewMatrix>();
    const visit = (jointId: string): ReviewMatrix => {
      const existing = matrices.get(jointId);
      if (existing) return existing;
      const part = RED_CAP_PRODUCTION_STATIC_PLAN.parts.find(
        (candidate) => candidate.jointId === jointId,
      );
      const node = this.targets.get(jointId);
      if (!part || !node) {
        return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
      }
      const local = localReviewMatrix(node);
      const world =
        part.parentId === null
          ? local
          : multiplyReviewMatrix(visit(part.parentId), local);
      matrices.set(jointId, world);
      return world;
    };
    for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
      visit(part.jointId);
    }
    return matrices;
  }

  private redrawReviewOverlays(): void {
    const graphics = this.reviewOverlayGraphics;
    if (!graphics) return;
    graphics.clear();
    const matrices = this.reviewJointMatrices();
    if (this.reviewOverlays.skeleton) {
      graphics.strokeColor = new Color().fromHEX("#53C7FF");
      graphics.lineWidth = 2;
      for (const part of RED_CAP_PRODUCTION_STATIC_PLAN.parts) {
        if (part.parentId === null) continue;
        const parent = matrices.get(part.parentId);
        const child = matrices.get(part.jointId);
        if (!parent || !child) continue;
        graphics.moveTo(parent.tx, parent.ty);
        graphics.lineTo(child.tx, child.ty);
      }
      graphics.stroke();
    }
    if (this.reviewOverlays.pivots) {
      graphics.strokeColor = new Color().fromHEX("#FFD166");
      graphics.lineWidth = 2;
      for (const matrix of matrices.values()) graphics.circle(matrix.tx, matrix.ty, 3);
      graphics.stroke();
    }
    if (this.reviewOverlays.sockets) {
      graphics.strokeColor = new Color().fromHEX("#E879F9");
      for (const jointId of ["hand-left", "hand-right", "torso"]) {
        const matrix = matrices.get(jointId);
        if (matrix) graphics.circle(matrix.tx, matrix.ty, 7);
      }
      graphics.stroke();
    }
    if (this.reviewOverlays["hit-areas"]) {
      graphics.strokeColor = new Color().fromHEX("#FB7185");
      const torso = matrices.get("torso");
      const head = matrices.get("head");
      if (torso) graphics.rect(torso.tx - 48, torso.ty - 50, 96, 110);
      if (head) graphics.circle(head.tx, head.ty + 32, 54);
      graphics.stroke();
    }
    if (this.reviewOverlays.attachments) {
      graphics.strokeColor = new Color().fromHEX("#A7F3D0");
      const briefcase = matrices.get("briefcase");
      if (briefcase) graphics.rect(briefcase.tx - 32, briefcase.ty - 24, 64, 48);
      graphics.stroke();
    }
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
    this.redrawReviewOverlays();
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
      this.reviewAdapterRevision += 1;
    } else if (event.keyCode === KeyCode.KEY_B) {
      this.rebuild();
      this.reviewAdapterRevision += 1;
    }
    else if (event.keyCode === KeyCode.KEY_D) {
      this.debugProjection = !this.debugProjection;
      console.info("PROGRAM015_MOTION_DEBUG", this.debugProjection);
      this.reviewAdapterRevision += 1;
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
    this.reviewOverlayGraphics = null;
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

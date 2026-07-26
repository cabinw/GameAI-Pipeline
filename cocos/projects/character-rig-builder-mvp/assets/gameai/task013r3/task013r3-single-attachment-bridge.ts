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
  SpriteFrame,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import {
  RigAnimationPlayback,
  composeJointPose,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";
import type {
  NormalizedRigAnimation,
  RigAnimationSample,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";

import { HarnessLifecycle } from "../task013r1/harness-lifecycle";
import { HarnessResourceCoordinator } from "../task013r1/harness-resource-manifest";
import {
  HARNESS_SORTING_POLICY,
  harnessSortingOrder,
  validateHarnessSortingPolicy,
} from "../task013r1/harness-sorting-registry";
import {
  harnessBounds,
  harnessDistance,
  HARNESS_SPATIAL_TOLERANCE_PX,
  type HarnessBounds,
  type HarnessPoint,
} from "../task013r1/harness-spatial";
import {
  projectNodeToOverlayLocal,
  runtimeWorldPoint,
} from "../task013r1/debug-space-projector";
import { BASE_RIG_REST_CLIP_ID } from "../task013r2/base-rig-contract";
import {
  formatSingleAttachmentInputHelp,
  SINGLE_ATTACHMENT_INPUT_REGISTRY,
  validateSingleAttachmentInputRegistry,
  type SingleAttachmentInputBinding,
  type SingleAttachmentSemanticAction,
} from "./single-attachment-input-registry";
import { SINGLE_ATTACHMENT_BRIDGE_PLAN } from "./single-attachment-plan-data";
import {
  createSingleAttachmentResourceManifest,
} from "./single-attachment-resource-manifest";
import {
  SingleAttachmentBridgeState,
} from "./single-attachment-state";
import {
  validateSingleAttachmentBridgePlan,
} from "./single-attachment-runtime-contract";
import {
  validateSingleAttachmentSpatialMeasurement,
  type SingleAttachmentSpatialMeasurement,
} from "./single-attachment-spatial";
import {
  buildBaseRigRuntime,
  setRuntimePose,
  type BuiltBaseRigRuntime,
} from "./base-rig-runtime-builder";
import {
  buildSingleAttachmentRuntime,
  countSingleAttachmentNodes,
  setSingleAttachmentEnabled,
  type BuiltSingleAttachmentRuntime,
} from "./single-attachment-runtime-builder";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R3Generated";
const OVERLAY_ROOT_NAME = "TASK013R3DebugOverlayRoot";
const HUD_NAME = "TASK013R3HUD";
const PLAN = SINGLE_ATTACHMENT_BRIDGE_PLAN;
const PLAN_VALIDATION = validateSingleAttachmentBridgePlan(PLAN);
const RESOURCE_MANIFEST = createSingleAttachmentResourceManifest(PLAN);
const INPUT_REGISTRY = validateSingleAttachmentInputRegistry();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

interface SingleAttachmentRuntime {
  readonly generatedRoot: Node;
  readonly base: BuiltBaseRigRuntime;
  readonly attachment: BuiltSingleAttachmentRuntime;
  readonly overlayRoot: Node;
  readonly debugGraphicsNode: Node;
  readonly debugGraphics: Graphics;
  readonly hudLabel: Label;
}

interface SpatialRuntimeSnapshot {
  readonly maximumMarkerError: number;
  readonly maximumSkeletonError: number;
  readonly socketToAnchorError: number;
  readonly unknownSlotCount: number;
  readonly duplicateAttachmentNodeCount: number;
  readonly duplicateResourceRequestCount: number;
  readonly duplicateInputHandlerCount: number;
  readonly nonFinitePositionCount: number;
  readonly debugOutsideCharacterCount: number;
  readonly sortingViolationCount: number;
  readonly characterBounds: HarnessBounds;
}

@ccclass("GameAITask013R3SingleAttachmentBridge")
export class GameAITask013R3SingleAttachmentBridge extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly semanticState = new SingleAttachmentBridgeState(
    PLAN.defaultStateId,
  );
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: SingleAttachmentRuntime | null = null;
  private playback: RigAnimationPlayback | null = null;
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private inputRegistered = false;
  private inputEventCount = 0;
  private lifecycleRebuildCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
  private maximumSocketError = 0;
  private lastSpatial: SpatialRuntimeSnapshot | null = null;

  onEnable(): void {
    this.beginRuntimeSetup();
  }

  update(deltaSeconds: number): void {
    if (this.runtime === null || this.playback === null) return;
    this.applySample(this.playback.update(deltaSeconds));
    this.semanticState.setPlaybackStatus(this.playback.status);
    this.semanticState.setTime(this.playback.time);
    this.applyStressTransform();
    this.applyAttachmentState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  onDisable(): void {
    this.teardownRuntime(false);
  }

  onDestroy(): void {
    this.teardownRuntime(true);
  }

  private beginRuntimeSetup(): void {
    const generation = this.lifecycle.begin();
    this.registerInput();
    this.spriteFrames.clear();
    this.coordinator = new HarnessResourceCoordinator(RESOURCE_MANIFEST);
    for (const entry of RESOURCE_MANIFEST) {
      this.coordinator.request(entry.logicalId);
      resources.load(entry.cocosPath, SpriteFrame, (error, asset) => {
        if (!this.lifecycle.accepts(generation)) return;
        if (error || asset === null) {
          this.coordinator?.reject(entry.logicalId);
          this.lifecycle.fail(generation);
          throw new Error(
            `TASK_013R3_RESOURCE_LOAD_FAILED: ${JSON.stringify({
              logicalId: entry.logicalId,
              cocosPath: entry.cocosPath,
              error: error?.message ?? "null SpriteFrame",
            })}`,
          );
        }
        this.spriteFrames.set(entry.logicalId, asset);
        this.coordinator?.succeed(entry.logicalId);
        const snapshot = this.coordinator?.snapshot();
        if (snapshot?.terminal === "passed") {
          this.buildRuntime();
          this.lifecycle.ready(generation);
          this.exactReset();
          console.info(
            `TASK_013R3_RUNTIME_READY ${JSON.stringify({
              lifecycle: this.lifecycle.snapshot(),
              resources: snapshot,
              plan: PLAN_VALIDATION,
              sorting: SORTING_POLICY,
              spatial: this.lastSpatial,
            })}`,
          );
        }
      });
    }
  }

  private buildRuntime(): void {
    if (this.coordinator?.snapshot().terminal !== "passed") {
      throw new Error("TASK_013R3_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicateRoots = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicateRoots.length > 0) {
      throw new Error(
        `TASK_013R3_DUPLICATE_GENERATED_ROOT: ${duplicateRoots
          .map((node) => node.name)
          .join(",")}`,
      );
    }
    const generatedRoot = this.nodeWithLayer(
      GENERATED_ROOT_NAME,
      this.node,
    );
    const base = buildBaseRigRuntime(
      generatedRoot,
      PLAN.base,
      this.spriteFrames,
      PLAN.baseSortingOrders,
    );
    const attachment = buildSingleAttachmentRuntime(
      PLAN.slot,
      PLAN.attachment,
      base.joints,
      this.spriteFrames,
    );
    const overlayRoot = this.nodeWithLayer(
      OVERLAY_ROOT_NAME,
      this.node,
    );
    const overlayTransform = overlayRoot.addComponent(UITransform);
    overlayTransform.setAnchorPoint(0.5, 0.5);
    overlayTransform.setContentSize(1280, 720);
    const debugGraphicsNode = this.nodeWithLayer(
      "SingleAttachmentSpatialDebugGraphics",
      overlayRoot,
    );
    const debugGraphics = debugGraphicsNode.addComponent(Graphics);
    debugGraphicsNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("debug-geometry");
    const hudNode = this.nodeWithLayer(HUD_NAME, overlayRoot);
    const hudLabel = hudNode.addComponent(Label);
    hudLabel.fontSize = 14;
    hudLabel.lineHeight = 17;
    hudLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    hudLabel.verticalAlign = VerticalTextAlignment.TOP;
    hudLabel.enableWrapText = false;
    hudLabel.overflow = Label.Overflow.CLAMP;
    hudLabel.color = new Color().fromHEX("#ffffff");
    hudNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("hud");
    const hudTransform = hudNode.getComponent(UITransform);
    if (hudTransform === null) {
      throw new Error("TASK_013R3_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1220, 166);
    hudNode.setPosition(-610, 340, 0);
    this.runtime = {
      generatedRoot,
      base,
      attachment,
      overlayRoot,
      debugGraphicsNode,
      debugGraphics,
      hudLabel,
    };
  }

  private nodeWithLayer(name: string, parent: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    return node;
  }

  private clip(animationId: string): NormalizedRigAnimation {
    const clip = PLAN.base.clips.find(
      (candidate) => candidate.animationId === animationId,
    );
    if (clip === undefined) {
      throw new Error(
        `TASK_013R3_UNKNOWN_SEMANTIC_CLIP: ${animationId}`,
      );
    }
    return clip as unknown as NormalizedRigAnimation;
  }

  private selectClip(animationId: string, play: boolean): void {
    this.semanticState.selectClip(animationId);
    this.playback = new RigAnimationPlayback(this.clip(animationId));
    const sample = play ? this.playback.play() : this.playback.stop();
    this.semanticState.setPlaybackStatus(this.playback.status);
    this.semanticState.setTime(this.playback.time);
    this.applySample(sample);
  }

  private applySample(sample: RigAnimationSample): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    for (const [jointId, binding] of runtime.base.joints) {
      const pose = composeJointPose(
        binding.restPose,
        sample.joints[jointId],
      );
      setRuntimePose(binding.node, pose);
    }
  }

  private applyStressTransform(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    if (this.semanticState.snapshot().stressEnabled) {
      runtime.base.adapterRoot.setPosition(72, -68, 0);
      runtime.base.adapterRoot.setScale(1.12, 0.91, 1);
      runtime.base.adapterRoot.setRotationFromEuler(0, 0, 11);
      runtime.base.nestedParent.setPosition(-36, 18, 0);
      runtime.base.nestedParent.setScale(0.94, 1.07, 1);
      runtime.base.nestedParent.setRotationFromEuler(0, 0, -7);
    } else {
      runtime.base.adapterRoot.setPosition(0, -70, 0);
      runtime.base.adapterRoot.setScale(1, 1, 1);
      runtime.base.adapterRoot.setRotationFromEuler(0, 0, 0);
      runtime.base.nestedParent.setPosition(0, 0, 0);
      runtime.base.nestedParent.setScale(1, 1, 1);
      runtime.base.nestedParent.setRotationFromEuler(0, 0, 0);
    }
  }

  private applyAttachmentState(): void {
    if (this.runtime === null) return;
    const stateId = this.semanticState.snapshot().attachmentStateId;
    const enabled = PLAN.attachment.enabledByState[stateId];
    if (enabled === undefined) {
      throw new Error(
        `TASK_013R3_UNKNOWN_RESOLVED_ATTACHMENT_STATE: ${stateId}`,
      );
    }
    setSingleAttachmentEnabled(this.runtime.attachment, enabled);
  }

  private updateSpatialAndDebug(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const projections = new Map(
      [...runtime.base.joints].map(([jointId, binding]) => [
        jointId,
        projectNodeToOverlayLocal(
          binding.node,
          runtime.overlayRoot,
          "TASK_013R3",
        ),
      ]),
    );
    const markerErrors = [...projections.values()].map(
      (projection) => projection.error,
    );
    const skeletonEndpointErrors: number[] = [];
    for (const part of PLAN.base.parts) {
      if (part.parentId === null) continue;
      const parent = projections.get(part.parentId);
      const child = projections.get(part.jointId);
      if (parent === undefined || child === undefined) {
        throw new Error(
          `TASK_013R3_DEBUG_HIERARCHY_PROJECTION_MISSING: ${part.jointId}`,
        );
      }
      skeletonEndpointErrors.push(parent.error, child.error);
    }
    const socketProjection = projectNodeToOverlayLocal(
      runtime.attachment.slotNode,
      runtime.overlayRoot,
      "TASK_013R3",
    );
    const anchorProjection = projectNodeToOverlayLocal(
      runtime.attachment.attachmentNode,
      runtime.overlayRoot,
      "TASK_013R3",
    );
    const socketWorld = runtimeWorldPoint(
      runtime.attachment.slotNode,
      "TASK_013R3",
    );
    const anchorWorld = runtimeWorldPoint(
      runtime.attachment.attachmentNode,
      "TASK_013R3",
    );
    const socketToAnchorError = harnessDistance(
      socketWorld,
      anchorWorld,
    );
    const characterBounds = harnessBounds(
      this.characterWorldPoints(runtime),
      14,
    );
    const debugWorldPoints = [
      ...projections.values(),
      socketProjection,
      anchorProjection,
    ].map((projection) => projection.roundTripWorld);
    const debugBounds = harnessBounds(debugWorldPoints, 8);
    const duplicateAttachmentNodeCount = Math.max(
      0,
      countSingleAttachmentNodes(
        runtime.attachment,
        PLAN.attachment.attachmentId,
      ) - 1,
    );
    const measurement: SingleAttachmentSpatialMeasurement = {
      markerErrors: [
        ...markerErrors,
        socketProjection.error,
        anchorProjection.error,
      ],
      skeletonEndpointErrors,
      socketToAnchorErrors: [socketToAnchorError],
      characterBounds,
      debugBounds,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      sortingViolationCount: this.sortingViolationCount(runtime),
      unknownSlotCount: 0,
      duplicateAttachmentNodeCount,
    };
    validateSingleAttachmentSpatialMeasurement(measurement);

    const maximumMarkerError = Math.max(...markerErrors);
    const maximumSkeletonError = Math.max(...skeletonEndpointErrors);
    this.maximumMarkerError = Math.max(
      this.maximumMarkerError,
      maximumMarkerError,
    );
    this.maximumSkeletonError = Math.max(
      this.maximumSkeletonError,
      maximumSkeletonError,
    );
    this.maximumSocketError = Math.max(
      this.maximumSocketError,
      socketToAnchorError,
    );
    this.lastSpatial = {
      maximumMarkerError,
      maximumSkeletonError,
      socketToAnchorError,
      unknownSlotCount: 0,
      duplicateAttachmentNodeCount,
      duplicateResourceRequestCount:
        this.coordinator?.snapshot().duplicateRequests ?? 0,
      duplicateInputHandlerCount: this.inputRegistered ? 0 : 1,
      nonFinitePositionCount: 0,
      debugOutsideCharacterCount: 0,
      sortingViolationCount: measurement.sortingViolationCount,
      characterBounds,
    };

    const debugEnabled = this.semanticState.snapshot().debugEnabled;
    runtime.debugGraphicsNode.active = debugEnabled;
    runtime.debugGraphics.clear();
    if (!debugEnabled) return;
    this.drawDebug(
      runtime,
      projections,
      socketProjection.overlayLocal,
      anchorProjection.overlayLocal,
      characterBounds,
    );
  }

  private drawDebug(
    runtime: SingleAttachmentRuntime,
    projections: ReadonlyMap<
      string,
      ReturnType<typeof projectNodeToOverlayLocal>
    >,
    socket: HarnessPoint,
    anchor: HarnessPoint,
    characterBounds: HarnessBounds,
  ): void {
    const graphics = runtime.debugGraphics;
    graphics.lineWidth = 2;
    graphics.strokeColor = new Color().fromHEX("#22d3ee");
    for (const part of PLAN.base.parts) {
      const child = projections.get(part.jointId)!;
      if (part.parentId !== null) {
        const parent = projections.get(part.parentId)!;
        graphics.moveTo(parent.overlayLocal.x, parent.overlayLocal.y);
        graphics.lineTo(child.overlayLocal.x, child.overlayLocal.y);
      }
      graphics.circle(child.overlayLocal.x, child.overlayLocal.y, 5);
    }
    graphics.stroke();

    graphics.strokeColor = new Color().fromHEX("#fb7185");
    graphics.circle(socket.x, socket.y, 9);
    graphics.moveTo(socket.x - 12, socket.y);
    graphics.lineTo(socket.x + 12, socket.y);
    graphics.moveTo(socket.x, socket.y - 12);
    graphics.lineTo(socket.x, socket.y + 12);
    graphics.stroke();

    graphics.strokeColor = new Color().fromHEX("#facc15");
    graphics.circle(anchor.x, anchor.y, 5);
    graphics.moveTo(anchor.x - 8, anchor.y - 8);
    graphics.lineTo(anchor.x + 8, anchor.y + 8);
    graphics.moveTo(anchor.x - 8, anchor.y + 8);
    graphics.lineTo(anchor.x + 8, anchor.y - 8);
    graphics.moveTo(socket.x, socket.y);
    graphics.lineTo(anchor.x, anchor.y);
    graphics.stroke();

    const corners = [
      { x: characterBounds.left, y: characterBounds.bottom },
      { x: characterBounds.right, y: characterBounds.bottom },
      { x: characterBounds.right, y: characterBounds.top },
      { x: characterBounds.left, y: characterBounds.top },
    ].map((point) =>
      this.worldToOverlayLocal(runtime.overlayRoot, point),
    );
    graphics.strokeColor = new Color().fromHEX("#a78bfa");
    graphics.moveTo(corners[0]!.x, corners[0]!.y);
    for (const corner of corners.slice(1)) {
      graphics.lineTo(corner.x, corner.y);
    }
    graphics.lineTo(corners[0]!.x, corners[0]!.y);
    graphics.stroke();
  }

  private characterWorldPoints(
    runtime: SingleAttachmentRuntime,
  ): HarnessPoint[] {
    const points: HarnessPoint[] = [];
    for (const binding of runtime.base.joints.values()) {
      points.push(runtimeWorldPoint(binding.node, "TASK_013R3"));
      points.push(
        ...this.visualWorldCorners(
          binding.visualTransform,
          binding.part.jointId,
        ),
      );
    }
    if (runtime.attachment.attachmentNode.active) {
      points.push(
        ...this.visualWorldCorners(
          runtime.attachment.visualTransform,
          PLAN.attachment.attachmentId,
        ),
      );
    }
    return points;
  }

  private visualWorldCorners(
    transform: UITransform,
    semanticId: string,
  ): HarnessPoint[] {
    const width = transform.contentSize.width / 2;
    const height = transform.contentSize.height / 2;
    return [
      new Vec3(-width, -height, 0),
      new Vec3(width, -height, 0),
      new Vec3(width, height, 0),
      new Vec3(-width, height, 0),
    ].map((corner) => {
      const world = transform.convertToWorldSpaceAR(corner);
      if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
        throw new Error(
          `TASK_013R3_RUNTIME_VISUAL_POSITION_NON_FINITE: ${semanticId}`,
        );
      }
      return { x: world.x, y: world.y };
    });
  }

  private worldToOverlayLocal(
    overlayRoot: Node,
    world: HarnessPoint,
  ): HarnessPoint {
    const transform = overlayRoot.getComponent(UITransform);
    if (transform === null) {
      throw new Error("TASK_013R3_OVERLAY_TRANSFORM_MISSING");
    }
    const local = transform.convertToNodeSpaceAR(
      new Vec3(world.x, world.y, 0),
    );
    return { x: local.x, y: local.y };
  }

  private sortingViolationCount(
    runtime: SingleAttachmentRuntime,
  ): number {
    let violations = 0;
    for (const binding of runtime.base.joints.values()) {
      const order =
        binding.visual.getComponent(Sorting2D)?.sortingOrder;
      if (
        order === undefined ||
        order < HARNESS_SORTING_POLICY.production.minimum ||
        order > HARNESS_SORTING_POLICY.production.maximum
      ) {
        violations += 1;
      }
    }
    const attachmentOrder =
      runtime.attachment.visualNode.getComponent(Sorting2D)?.sortingOrder;
    if (
      attachmentOrder === undefined ||
      attachmentOrder < HARNESS_SORTING_POLICY.production.minimum ||
      attachmentOrder > HARNESS_SORTING_POLICY.production.maximum
    ) {
      violations += 1;
    }
    const debugOrder =
      runtime.debugGraphicsNode.getComponent(Sorting2D)?.sortingOrder;
    if (
      debugOrder === undefined ||
      debugOrder < HARNESS_SORTING_POLICY.debug.minimum ||
      debugOrder > HARNESS_SORTING_POLICY.debug.maximum
    ) {
      violations += 1;
    }
    const hudOrder =
      runtime.hudLabel.node.getComponent(Sorting2D)?.sortingOrder;
    if (
      hudOrder === undefined ||
      hudOrder < HARNESS_SORTING_POLICY.hud.minimum ||
      hudOrder > HARNESS_SORTING_POLICY.hud.maximum
    ) {
      violations += 1;
    }
    return violations;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R3_DUPLICATE_INPUT_HANDLER");
    }
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = true;
  }

  private unregisterInput(): void {
    if (!this.inputRegistered) return;
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = false;
  }

  private onKeyDown(event: EventKeyboard): void {
    const binding = BINDING_BY_KEY.get(event.keyCode);
    if (binding === undefined) return;
    this.inputEventCount += 1;
    this.executeAction(binding);
  }

  private executeAction(binding: SingleAttachmentInputBinding): void {
    const action: SingleAttachmentSemanticAction = binding.action;
    if (action.kind === "select-clip") {
      this.selectClip(action.clipId, true);
    } else if (action.kind === "select-attachment-state") {
      this.semanticState.selectAttachmentState(action.stateId);
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null) {
        throw new Error("TASK_013R3_PLAYBACK_NOT_READY");
      }
      if (this.playback.status === "playing") {
        this.applySample(this.playback.pause());
      } else {
        this.applySample(this.playback.play());
      }
      this.semanticState.setPlaybackStatus(this.playback.status);
    } else if (action.kind === "exact-reset") {
      this.exactReset();
    } else if (action.kind === "toggle-debug") {
      this.semanticState.toggleDebug();
    } else if (action.kind === "toggle-stress") {
      this.semanticState.toggleStress();
    } else if (action.kind === "rebuild-runtime") {
      this.lifecycleRebuildCount += 1;
      this.teardownRuntime(false);
      this.beginRuntimeSetup();
      return;
    } else {
      const exhaustive: never = action;
      throw new Error(`TASK_013R3_UNKNOWN_ACTION: ${String(exhaustive)}`);
    }
    this.applyStressTransform();
    this.applyAttachmentState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private exactReset(): void {
    this.semanticState.exactReset();
    this.maximumMarkerError = 0;
    this.maximumSkeletonError = 0;
    this.maximumSocketError = 0;
    this.lastSpatial = null;
    this.playback = new RigAnimationPlayback(
      this.clip(BASE_RIG_REST_CLIP_ID),
    );
    this.applySample(this.playback.stop());
    this.semanticState.setPlaybackStatus(this.playback.status);
    this.semanticState.setTime(this.playback.time);
    this.applyStressTransform();
    this.applyAttachmentState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private updateHud(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const semantic = this.semanticState.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const resource = this.coordinator?.snapshot();
    const attachmentEnabled =
      PLAN.attachment.enabledByState[semantic.attachmentStateId];
    runtime.hudLabel.string = [
      "TASK-013R3 · GENERIC SINGLE ATTACHMENT BRIDGE",
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${this.lifecycleRebuildCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resource?.loaded ?? 0}/${resource?.expected ?? RESOURCE_MANIFEST.length} ${(resource?.terminal ?? "pending").toUpperCase()} · PARTS ${PLAN_VALIDATION.partCount} · JOINTS ${PLAN_VALIDATION.jointCount} · ATTACHMENTS ${attachmentEnabled ? 1 : 0}/1`,
      `STATE ${semantic.attachmentStateId} · ATTACHMENT ${attachmentEnabled ? "ENABLED" : "DISABLED"} · NODES ${countSingleAttachmentNodes(runtime.attachment, PLAN.attachment.attachmentId)} · DUPLICATES ${this.lastSpatial?.duplicateAttachmentNodeCount ?? 0}`,
      `CLIP ${this.playback?.animation.animationId ?? semantic.clipId} · ${this.playback?.status.toUpperCase() ?? semantic.playbackStatus.toUpperCase()} ${this.playback?.time.toFixed(2) ?? semantic.timeSeconds.toFixed(2)}s`,
      `TRANSFORM STRESS ${semantic.stressEnabled ? "ON" : "OFF"} · DEBUG ${semantic.debugEnabled ? "ON" : "OFF"} · SPATIAL PASS · UNKNOWN SLOTS ${this.lastSpatial?.unknownSlotCount ?? 0} · SORTING ${this.lastSpatial?.sortingViolationCount ?? 0}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · SOCKET↔ANCHOR ${this.maximumSocketError.toFixed(3)} px · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px`,
      `DUP INPUT ${this.lastSpatial?.duplicateInputHandlerCount ?? 0} · DUP RESOURCE ${this.lastSpatial?.duplicateResourceRequestCount ?? 0} · NON-FINITE ${this.lastSpatial?.nonFinitePositionCount ?? 0} · OUTSIDE ${this.lastSpatial?.debugOutsideCharacterCount ?? 0}`,
      formatSingleAttachmentInputHelp(),
    ].join("\n");
  }

  private teardownRuntime(dispose: boolean): void {
    this.unregisterInput();
    this.runtime?.generatedRoot.removeFromParent();
    this.runtime?.overlayRoot.removeFromParent();
    this.runtime?.generatedRoot.destroy();
    this.runtime?.overlayRoot.destroy();
    this.runtime = null;
    this.playback = null;
    this.coordinator = null;
    this.spriteFrames.clear();
    this.lifecycle.teardown(dispose);
  }
}

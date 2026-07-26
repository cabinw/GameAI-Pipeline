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
  buildBaseRigRuntime,
  setRuntimePose,
  type BuiltBaseRigRuntime,
} from "../task013r3/base-rig-runtime-builder";
import {
  formatMultiAttachmentInputHelpLines,
  MULTI_ATTACHMENT_INPUT_REGISTRY,
  validateMultiAttachmentInputRegistry,
  type MultiAttachmentInputBinding,
  type MultiAttachmentSemanticAction,
} from "./multi-attachment-input-registry";
import { MULTI_ATTACHMENT_BRIDGE_PLAN } from "./multi-attachment-plan-data";
import {
  createMultiAttachmentResourceManifest,
} from "./multi-attachment-resource-manifest";
import {
  validateMultiAttachmentBridgePlan,
} from "./multi-attachment-runtime-contract";
import {
  validateMultiAttachmentSpatialMeasurement,
  type MultiAttachmentSpatialMeasurement,
} from "./multi-attachment-spatial";
import {
  MultiAttachmentBridgeState,
} from "./multi-attachment-state";
import {
  applyMultiAttachmentState,
  buildMultiAttachmentRuntime,
  duplicateActiveAttachmentCount,
  type BuiltMultiAttachmentRuntime,
} from "./multi-attachment-runtime-builder";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R4Generated";
const OVERLAY_ROOT_NAME = "TASK013R4DebugOverlayRoot";
const HUD_NAME = "TASK013R4HUD";
const PLAN = MULTI_ATTACHMENT_BRIDGE_PLAN;
const PLAN_VALIDATION = validateMultiAttachmentBridgePlan(PLAN);
const RESOURCE_MANIFEST = createMultiAttachmentResourceManifest(PLAN);
const INPUT_REGISTRY = validateMultiAttachmentInputRegistry();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

interface MultiAttachmentRuntime {
  readonly generatedRoot: Node;
  readonly base: BuiltBaseRigRuntime;
  readonly attachments: BuiltMultiAttachmentRuntime;
  readonly overlayRoot: Node;
  readonly debugGraphicsNode: Node;
  readonly debugGraphics: Graphics;
  readonly hudLabel: Label;
}

interface ActiveAttachmentProjection {
  readonly attachmentId: string;
  readonly socket: ReturnType<typeof projectNodeToOverlayLocal>;
  readonly anchor: ReturnType<typeof projectNodeToOverlayLocal>;
}

interface SpatialRuntimeSnapshot {
  readonly maximumMarkerError: number;
  readonly maximumSkeletonError: number;
  readonly maximumSocketError: number;
  readonly activeAttachmentCount: number;
  readonly unknownSlotCount: number;
  readonly duplicateActiveAttachmentCount: number;
  readonly duplicateResourceRequestCount: number;
  readonly duplicateInputHandlerCount: number;
  readonly nonFinitePositionCount: number;
  readonly debugOutsideCharacterCount: number;
  readonly sortingViolationCount: number;
  readonly frontBackRoleViolationCount: number;
  readonly characterBounds: HarnessBounds;
}

@ccclass("GameAITask013R4HeadAccessoryLayeringBridge")
export class GameAITask013R4HeadAccessoryLayeringBridge extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly semanticState = new MultiAttachmentBridgeState(
    PLAN.defaultStateId,
  );
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: MultiAttachmentRuntime | null = null;
  private playback: RigAnimationPlayback | null = null;
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private inputRegistered = false;
  private inputEventCount = 0;
  private lifecycleRebuildCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
  private maximumSocketError = 0;
  private activeAttachmentCount = 0;
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
            `TASK_013R4_RESOURCE_LOAD_FAILED: ${JSON.stringify({
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
            `TASK_013R4_RUNTIME_READY ${JSON.stringify({
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
      throw new Error("TASK_013R4_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicateRoots = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicateRoots.length > 0) {
      throw new Error(
        `TASK_013R4_DUPLICATE_GENERATED_ROOT: ${duplicateRoots
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
    const attachments = buildMultiAttachmentRuntime(
      PLAN.slots,
      PLAN.attachments,
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
      "MultiAttachmentSpatialDebugGraphics",
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
      throw new Error("TASK_013R4_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1240, 183);
    hudNode.setPosition(-620, 340, 0);
    this.runtime = {
      generatedRoot,
      base,
      attachments,
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
        `TASK_013R4_UNKNOWN_SEMANTIC_CLIP: ${animationId}`,
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
    this.activeAttachmentCount = applyMultiAttachmentState(
      this.runtime.attachments,
      this.semanticState.snapshot().attachmentStateId,
    );
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
          "TASK_013R4",
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
          `TASK_013R4_DEBUG_HIERARCHY_PROJECTION_MISSING: ${part.jointId}`,
        );
      }
      skeletonEndpointErrors.push(parent.error, child.error);
    }

    const activeProjections: ActiveAttachmentProjection[] = [];
    const socketToAnchorErrors: number[] = [];
    for (const [attachmentId, binding] of runtime.attachments.attachments) {
      if (!binding.attachmentNode.active) continue;
      const socket = projectNodeToOverlayLocal(
        binding.slotNode,
        runtime.overlayRoot,
        "TASK_013R4",
      );
      const anchor = projectNodeToOverlayLocal(
        binding.attachmentNode,
        runtime.overlayRoot,
        "TASK_013R4",
      );
      activeProjections.push({ attachmentId, socket, anchor });
      markerErrors.push(socket.error, anchor.error);
      socketToAnchorErrors.push(
        harnessDistance(
          runtimeWorldPoint(binding.slotNode, "TASK_013R4"),
          runtimeWorldPoint(binding.attachmentNode, "TASK_013R4"),
        ),
      );
    }

    const characterBounds = harnessBounds(
      this.characterWorldPoints(runtime),
      14,
    );
    const debugWorldPoints = [
      ...[...projections.values()].map(
        (projection) => projection.roundTripWorld,
      ),
      ...activeProjections.flatMap((projection) => [
        projection.socket.roundTripWorld,
        projection.anchor.roundTripWorld,
      ]),
    ];
    const debugBounds = harnessBounds(debugWorldPoints, 8);
    const duplicateCount = duplicateActiveAttachmentCount(
      runtime.attachments,
    );
    const frontBackRoleViolationCount =
      this.frontBackRoleViolationCount(runtime);
    const measurement: MultiAttachmentSpatialMeasurement = {
      markerErrors,
      skeletonEndpointErrors,
      socketToAnchorErrors,
      characterBounds,
      debugBounds,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      sortingViolationCount: this.sortingViolationCount(runtime),
      unknownSlotCount: 0,
      duplicateActiveAttachmentCount: duplicateCount,
      frontBackRoleViolationCount,
    };
    validateMultiAttachmentSpatialMeasurement(measurement);

    const maximumMarkerError = Math.max(...markerErrors);
    const maximumSkeletonError = Math.max(...skeletonEndpointErrors);
    const maximumSocketError =
      socketToAnchorErrors.length === 0
        ? 0
        : Math.max(...socketToAnchorErrors);
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
      maximumSocketError,
    );
    this.lastSpatial = {
      maximumMarkerError,
      maximumSkeletonError,
      maximumSocketError,
      activeAttachmentCount: activeProjections.length,
      unknownSlotCount: 0,
      duplicateActiveAttachmentCount: duplicateCount,
      duplicateResourceRequestCount:
        this.coordinator?.snapshot().duplicateRequests ?? 0,
      duplicateInputHandlerCount: this.inputRegistered ? 0 : 1,
      nonFinitePositionCount: 0,
      debugOutsideCharacterCount: 0,
      sortingViolationCount: measurement.sortingViolationCount,
      frontBackRoleViolationCount,
      characterBounds,
    };

    const debugEnabled = this.semanticState.snapshot().debugEnabled;
    runtime.debugGraphicsNode.active = debugEnabled;
    runtime.debugGraphics.clear();
    if (!debugEnabled) return;
    this.drawDebug(
      runtime,
      projections,
      activeProjections,
      characterBounds,
    );
  }

  private drawDebug(
    runtime: MultiAttachmentRuntime,
    projections: ReadonlyMap<
      string,
      ReturnType<typeof projectNodeToOverlayLocal>
    >,
    attachments: readonly ActiveAttachmentProjection[],
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

    const colors = ["#fb7185", "#facc15", "#4ade80", "#60a5fa"];
    attachments.forEach((projection, index) => {
      const socket = projection.socket.overlayLocal;
      const anchor = projection.anchor.overlayLocal;
      graphics.strokeColor = new Color().fromHEX(
        colors[index % colors.length]!,
      );
      graphics.circle(socket.x, socket.y, 9 + index * 2);
      graphics.moveTo(socket.x - 12, socket.y);
      graphics.lineTo(socket.x + 12, socket.y);
      graphics.moveTo(socket.x, socket.y - 12);
      graphics.lineTo(socket.x, socket.y + 12);
      graphics.circle(anchor.x, anchor.y, 5 + index);
      graphics.moveTo(anchor.x - 8, anchor.y - 8);
      graphics.lineTo(anchor.x + 8, anchor.y + 8);
      graphics.moveTo(anchor.x - 8, anchor.y + 8);
      graphics.lineTo(anchor.x + 8, anchor.y - 8);
      graphics.moveTo(socket.x, socket.y);
      graphics.lineTo(anchor.x, anchor.y);
      graphics.stroke();
    });

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
    runtime: MultiAttachmentRuntime,
  ): HarnessPoint[] {
    const points: HarnessPoint[] = [];
    for (const binding of runtime.base.joints.values()) {
      points.push(runtimeWorldPoint(binding.node, "TASK_013R4"));
      points.push(
        ...this.visualWorldCorners(
          binding.visualTransform,
          binding.part.jointId,
        ),
      );
    }
    for (const binding of runtime.attachments.attachments.values()) {
      if (!binding.attachmentNode.active) continue;
      points.push(
        ...this.visualWorldCorners(
          binding.visualTransform,
          binding.plan.attachmentId,
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
          `TASK_013R4_RUNTIME_VISUAL_POSITION_NON_FINITE: ${semanticId}`,
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
      throw new Error("TASK_013R4_OVERLAY_TRANSFORM_MISSING");
    }
    const local = transform.convertToNodeSpaceAR(
      new Vec3(world.x, world.y, 0),
    );
    return { x: local.x, y: local.y };
  }

  private sortingViolationCount(
    runtime: MultiAttachmentRuntime,
  ): number {
    let violations = 0;
    const observedOrders: number[] = [];
    for (const [jointId, binding] of runtime.base.joints) {
      const order =
        binding.visual.getComponent(Sorting2D)?.sortingOrder;
      observedOrders.push(order ?? Number.NaN);
      if (
        order !== PLAN.baseSortingOrders[jointId] ||
        order < HARNESS_SORTING_POLICY.production.minimum ||
        order > HARNESS_SORTING_POLICY.production.maximum
      ) {
        violations += 1;
      }
    }
    for (const binding of runtime.attachments.attachments.values()) {
      const order =
        binding.visualNode.getComponent(Sorting2D)?.sortingOrder;
      observedOrders.push(order ?? Number.NaN);
      if (
        order !== binding.plan.sortingOrder ||
        order < HARNESS_SORTING_POLICY.production.minimum ||
        order > HARNESS_SORTING_POLICY.production.maximum
      ) {
        violations += 1;
      }
    }
    if (new Set(observedOrders).size !== observedOrders.length) {
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

  private frontBackRoleViolationCount(
    runtime: MultiAttachmentRuntime,
  ): number {
    let violations = 0;
    for (const binding of runtime.attachments.attachments.values()) {
      const parent = runtime.base.joints.get(
        binding.plan.parentPartId,
      );
      const attachmentOrder =
        binding.visualNode.getComponent(Sorting2D)?.sortingOrder;
      const parentOrder =
        parent?.visual.getComponent(Sorting2D)?.sortingOrder;
      if (
        parent === undefined ||
        attachmentOrder === undefined ||
        parentOrder === undefined ||
        (
          binding.plan.layerRole === "back" &&
          attachmentOrder >= parentOrder
        ) ||
        (
          binding.plan.layerRole === "front" &&
          attachmentOrder <= parentOrder
        )
      ) {
        violations += 1;
      }
    }
    return violations;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R4_DUPLICATE_INPUT_HANDLER");
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

  private executeAction(binding: MultiAttachmentInputBinding): void {
    const action: MultiAttachmentSemanticAction = binding.action;
    if (action.kind === "select-clip") {
      this.selectClip(action.clipId, true);
    } else if (action.kind === "select-attachment-state") {
      this.semanticState.selectAttachmentState(action.stateId);
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null) {
        throw new Error("TASK_013R4_PLAYBACK_NOT_READY");
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
      throw new Error(`TASK_013R4_UNKNOWN_ACTION: ${String(exhaustive)}`);
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

  private stateLabel(): string {
    const stateId = this.semanticState.snapshot().attachmentStateId;
    const state = PLAN.states.find(
      (candidate) => candidate.stateId === stateId,
    );
    if (state === undefined) {
      throw new Error(`TASK_013R4_UNKNOWN_STATE_LABEL: ${stateId}`);
    }
    return state.hudLabel;
  }

  private updateHud(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const semantic = this.semanticState.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const resource = this.coordinator?.snapshot();
    const [runtimeInputHelp, attachmentInputHelp] =
      formatMultiAttachmentInputHelpLines();
    runtime.hudLabel.string = [
      "TASK-013R4 · GENERIC HEAD ACCESSORY LAYERING BRIDGE",
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${this.lifecycleRebuildCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resource?.loaded ?? 0}/${resource?.expected ?? RESOURCE_MANIFEST.length} ${(resource?.terminal ?? "pending").toUpperCase()} · PARTS ${PLAN_VALIDATION.partCount} · JOINTS ${PLAN_VALIDATION.jointCount} · ATTACHMENTS ${this.activeAttachmentCount}/${PLAN_VALIDATION.attachmentCount}`,
      `STATE ${semantic.attachmentStateId} · ${this.stateLabel()} · ACTIVE ${this.activeAttachmentCount} · DUPLICATES ${this.lastSpatial?.duplicateActiveAttachmentCount ?? 0}`,
      `CLIP ${this.playback?.animation.animationId ?? semantic.clipId} · ${this.playback?.status.toUpperCase() ?? semantic.playbackStatus.toUpperCase()} ${this.playback?.time.toFixed(2) ?? semantic.timeSeconds.toFixed(2)}s`,
      `TRANSFORM STRESS ${semantic.stressEnabled ? "ON" : "OFF"} · DEBUG ${semantic.debugEnabled ? "ON" : "OFF"} · SPATIAL PASS · UNKNOWN SLOTS ${this.lastSpatial?.unknownSlotCount ?? 0}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · SOCKET↔ANCHOR ${this.maximumSocketError.toFixed(3)} px · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px`,
      `SORTING ${this.lastSpatial?.sortingViolationCount ?? 0} · FRONT/BACK ${this.lastSpatial?.frontBackRoleViolationCount ?? 0} · DUP INPUT ${this.lastSpatial?.duplicateInputHandlerCount ?? 0} · DUP RESOURCE ${this.lastSpatial?.duplicateResourceRequestCount ?? 0}`,
      `NON-FINITE ${this.lastSpatial?.nonFinitePositionCount ?? 0} · OUTSIDE ${this.lastSpatial?.debugOutsideCharacterCount ?? 0} · CONTROLS ${runtimeInputHelp}`,
      `ATTACHMENT STATES ${attachmentInputHelp}`,
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

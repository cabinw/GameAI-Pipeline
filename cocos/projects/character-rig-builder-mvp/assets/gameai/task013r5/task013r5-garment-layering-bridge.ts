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
  formatGarmentInputHelpLines,
  GARMENT_INPUT_REGISTRY,
  validateGarmentInputRegistry,
  type GarmentInputBinding,
  type GarmentSemanticAction,
} from "./garment-input-registry";
import { GARMENT_BRIDGE_PLAN } from "./garment-bridge-plan-data";
import {
  createGarmentResourceManifest,
} from "./garment-resource-manifest";
import {
  validateGarmentBridgePlan,
  type GarmentLocalBounds,
  type GarmentSeamItemPlan,
} from "./garment-bridge-runtime-contract";
import {
  garmentSeamError,
  garmentSeamOverlap,
  validateGarmentSpatialMeasurement,
  type GarmentSpatialMeasurement,
  type GarmentWorldBounds,
} from "./garment-spatial";
import { GarmentBridgeState } from "./garment-state";
import {
  applyGarmentState,
  buildGarmentRuntime,
  duplicateActiveGarmentCounts,
  type AppliedGarmentStateCounts,
  type BuiltGarmentRuntime,
} from "./garment-runtime-builder";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R5Generated";
const OVERLAY_ROOT_NAME = "TASK013R5DebugOverlayRoot";
const HUD_NAME = "TASK013R5HUD";
const PLAN = GARMENT_BRIDGE_PLAN;
const PLAN_VALIDATION = validateGarmentBridgePlan(PLAN);
const RESOURCE_MANIFEST = createGarmentResourceManifest(PLAN);
const INPUT_REGISTRY = validateGarmentInputRegistry();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

interface GarmentRuntime {
  readonly generatedRoot: Node;
  readonly base: BuiltBaseRigRuntime;
  readonly attachments: BuiltGarmentRuntime;
  readonly overlayRoot: Node;
  readonly debugGraphicsNode: Node;
  readonly debugGraphics: Graphics;
  readonly hudLabel: Label;
}

interface ActiveAccessoryProjection {
  readonly attachmentId: string;
  readonly socket: ReturnType<typeof projectNodeToOverlayLocal>;
  readonly anchor: ReturnType<typeof projectNodeToOverlayLocal>;
}

interface ActiveSeamProjection {
  readonly seamId: string;
  readonly first: GarmentWorldBounds;
  readonly second: GarmentWorldBounds;
  readonly observedOverlap: number;
  readonly error: number;
}

interface SpatialRuntimeSnapshot {
  readonly maximumMarkerError: number;
  readonly maximumSkeletonError: number;
  readonly maximumAccessorySocketError: number;
  readonly maximumGarmentSeamError: number;
  readonly activeCounts: AppliedGarmentStateCounts;
  readonly activeSeamCount: number;
  readonly unknownSlotCount: number;
  readonly duplicateActiveGarmentCount: number;
  readonly duplicateActiveAccessoryCount: number;
  readonly duplicateResourceRequestCount: number;
  readonly duplicateInputHandlerCount: number;
  readonly nonFinitePositionCount: number;
  readonly debugOutsideCharacterCount: number;
  readonly sortingViolationCount: number;
  readonly frontBackRoleViolationCount: number;
  readonly characterBounds: HarnessBounds;
}

@ccclass("GameAITask013R5GarmentLayeringBridge")
export class GameAITask013R5GarmentLayeringBridge extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly semanticState = new GarmentBridgeState(
    PLAN.defaultStateId,
  );
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: GarmentRuntime | null = null;
  private playback: RigAnimationPlayback | null = null;
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private inputRegistered = false;
  private inputEventCount = 0;
  private lifecycleRebuildCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
  private maximumAccessorySocketError = 0;
  private maximumGarmentSeamError = 0;
  private activeCounts: AppliedGarmentStateCounts = Object.freeze({
    active: 0,
    garment: 0,
    accessories: 0,
  });
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
    this.applyLoadoutState();
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
            `TASK_013R5_RESOURCE_LOAD_FAILED: ${JSON.stringify({
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
            `TASK_013R5_RUNTIME_READY ${JSON.stringify({
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
      throw new Error("TASK_013R5_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicateRoots = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicateRoots.length > 0) {
      throw new Error(
        `TASK_013R5_DUPLICATE_GENERATED_ROOT: ${duplicateRoots
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
    const attachments = buildGarmentRuntime(
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
      "GarmentSpatialDebugGraphics",
      overlayRoot,
    );
    const debugGraphics = debugGraphicsNode.addComponent(Graphics);
    debugGraphicsNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("debug-geometry");
    const hudNode = this.nodeWithLayer(HUD_NAME, overlayRoot);
    const hudLabel = hudNode.addComponent(Label);
    hudLabel.fontSize = 13;
    hudLabel.lineHeight = 16;
    hudLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    hudLabel.verticalAlign = VerticalTextAlignment.TOP;
    hudLabel.enableWrapText = false;
    hudLabel.overflow = Label.Overflow.CLAMP;
    hudLabel.color = new Color().fromHEX("#ffffff");
    hudNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("hud");
    const hudTransform = hudNode.getComponent(UITransform);
    if (hudTransform === null) {
      throw new Error("TASK_013R5_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1240, 224);
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
        `TASK_013R5_UNKNOWN_SEMANTIC_CLIP: ${animationId}`,
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

  private applyLoadoutState(): void {
    if (this.runtime === null) return;
    this.activeCounts = applyGarmentState(
      this.runtime.attachments,
      this.semanticState.snapshot().loadoutStateId,
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
          "TASK_013R5",
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
          `TASK_013R5_DEBUG_HIERARCHY_PROJECTION_MISSING: ${part.jointId}`,
        );
      }
      skeletonEndpointErrors.push(parent.error, child.error);
    }

    const activeAccessories: ActiveAccessoryProjection[] = [];
    const accessorySocketToAnchorErrors: number[] = [];
    for (const [attachmentId, binding] of runtime.attachments.attachments) {
      if (
        !binding.attachmentNode.active ||
        binding.plan.category !== "accessory"
      ) {
        continue;
      }
      const socket = projectNodeToOverlayLocal(
        binding.slotNode,
        runtime.overlayRoot,
        "TASK_013R5",
      );
      const anchor = projectNodeToOverlayLocal(
        binding.attachmentNode,
        runtime.overlayRoot,
        "TASK_013R5",
      );
      activeAccessories.push({ attachmentId, socket, anchor });
      markerErrors.push(socket.error, anchor.error);
      accessorySocketToAnchorErrors.push(
        harnessDistance(
          runtimeWorldPoint(binding.slotNode, "TASK_013R5"),
          runtimeWorldPoint(binding.attachmentNode, "TASK_013R5"),
        ),
      );
    }

    const activeSeams = this.activeSeamProjections(runtime);
    const garmentSeamErrors = activeSeams.map((seam) => seam.error);
    const characterBounds = harnessBounds(
      this.characterWorldPoints(runtime),
      14,
    );
    const debugWorldPoints = [
      ...[...projections.values()].map(
        (projection) => projection.roundTripWorld,
      ),
      ...activeAccessories.flatMap((projection) => [
        projection.socket.roundTripWorld,
        projection.anchor.roundTripWorld,
      ]),
      ...activeSeams.flatMap((seam) => [
        ...this.boundsCorners(seam.first),
        ...this.boundsCorners(seam.second),
      ]),
    ];
    const debugBounds = harnessBounds(debugWorldPoints, 8);
    const duplicateCounts = duplicateActiveGarmentCounts(
      runtime.attachments,
    );
    const measurement: GarmentSpatialMeasurement = {
      markerErrors,
      skeletonEndpointErrors,
      accessorySocketToAnchorErrors,
      garmentSeamErrors,
      characterBounds,
      debugBounds,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      sortingViolationCount: this.sortingViolationCount(runtime),
      unknownSlotCount: 0,
      duplicateActiveGarmentCount: duplicateCounts.garment,
      duplicateActiveAccessoryCount: duplicateCounts.accessories,
      frontBackRoleViolationCount:
        this.frontBackRoleViolationCount(runtime),
    };
    validateGarmentSpatialMeasurement(measurement);

    const maximumMarkerError = Math.max(...markerErrors);
    const maximumSkeletonError = Math.max(...skeletonEndpointErrors);
    const maximumAccessorySocketError =
      accessorySocketToAnchorErrors.length === 0
        ? 0
        : Math.max(...accessorySocketToAnchorErrors);
    const maximumGarmentSeamError =
      garmentSeamErrors.length === 0
        ? 0
        : Math.max(...garmentSeamErrors);
    this.maximumMarkerError = Math.max(
      this.maximumMarkerError,
      maximumMarkerError,
    );
    this.maximumSkeletonError = Math.max(
      this.maximumSkeletonError,
      maximumSkeletonError,
    );
    this.maximumAccessorySocketError = Math.max(
      this.maximumAccessorySocketError,
      maximumAccessorySocketError,
    );
    this.maximumGarmentSeamError = Math.max(
      this.maximumGarmentSeamError,
      maximumGarmentSeamError,
    );
    this.lastSpatial = {
      maximumMarkerError,
      maximumSkeletonError,
      maximumAccessorySocketError,
      maximumGarmentSeamError,
      activeCounts: this.activeCounts,
      activeSeamCount: activeSeams.length,
      unknownSlotCount: 0,
      duplicateActiveGarmentCount: duplicateCounts.garment,
      duplicateActiveAccessoryCount: duplicateCounts.accessories,
      duplicateResourceRequestCount:
        this.coordinator?.snapshot().duplicateRequests ?? 0,
      duplicateInputHandlerCount: this.inputRegistered ? 0 : 1,
      nonFinitePositionCount: 0,
      debugOutsideCharacterCount: this.debugOutsideViewportCount(
        runtime.overlayRoot,
        debugWorldPoints,
      ),
      sortingViolationCount: measurement.sortingViolationCount,
      frontBackRoleViolationCount:
        measurement.frontBackRoleViolationCount,
      characterBounds,
    };
    if (this.lastSpatial.debugOutsideCharacterCount !== 0) {
      throw new Error(
        `TASK_013R5_DEBUG_OUTSIDE_VIEWPORT: ${this.lastSpatial.debugOutsideCharacterCount}`,
      );
    }

    const debugEnabled = this.semanticState.snapshot().debugEnabled;
    runtime.debugGraphicsNode.active = debugEnabled;
    runtime.debugGraphics.clear();
    if (!debugEnabled) return;
    this.drawDebug(
      runtime,
      projections,
      activeAccessories,
      activeSeams,
      characterBounds,
    );
  }

  private activeSeamProjections(
    runtime: GarmentRuntime,
  ): readonly ActiveSeamProjection[] {
    const result: ActiveSeamProjection[] = [];
    for (const seam of PLAN.seams) {
      const firstTransform = this.seamItemTransform(runtime, seam.first);
      const secondTransform = this.seamItemTransform(runtime, seam.second);
      if (firstTransform === null || secondTransform === null) continue;
      const first = this.worldBounds(
        firstTransform,
        seam.first.localBounds,
      );
      const second = this.worldBounds(
        secondTransform,
        seam.second.localBounds,
      );
      result.push(
        Object.freeze({
          seamId: seam.seamId,
          first,
          second,
          observedOverlap: garmentSeamOverlap(first, second),
          error: garmentSeamError(
            first,
            second,
            seam.minimumOverlap,
          ),
        }),
      );
    }
    return Object.freeze(result);
  }

  private seamItemTransform(
    runtime: GarmentRuntime,
    item: GarmentSeamItemPlan,
  ): UITransform | null {
    if (item.itemKind === "base") {
      const binding = runtime.base.joints.get(item.itemId);
      if (binding === undefined) {
        throw new Error(`TASK_013R5_SEAM_BASE_ITEM_MISSING: ${item.itemId}`);
      }
      return binding.visualTransform;
    }
    const binding = runtime.attachments.attachments.get(item.itemId);
    if (binding === undefined) {
      throw new Error(
        `TASK_013R5_SEAM_ATTACHMENT_ITEM_MISSING: ${item.itemId}`,
      );
    }
    return binding.attachmentNode.active
      ? binding.visualTransform
      : null;
  }

  private worldBounds(
    transform: UITransform,
    bounds: GarmentLocalBounds,
  ): GarmentWorldBounds {
    const points = [
      new Vec3(bounds.left, bounds.bottom, 0),
      new Vec3(bounds.right, bounds.bottom, 0),
      new Vec3(bounds.right, bounds.top, 0),
      new Vec3(bounds.left, bounds.top, 0),
    ].map((point) => transform.convertToWorldSpaceAR(point));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    if ([...xs, ...ys].some((value) => !Number.isFinite(value))) {
      throw new Error("TASK_013R5_SEAM_WORLD_POSITION_NON_FINITE");
    }
    return Object.freeze({
      left: Math.min(...xs),
      right: Math.max(...xs),
      bottom: Math.min(...ys),
      top: Math.max(...ys),
    });
  }

  private drawDebug(
    runtime: GarmentRuntime,
    projections: ReadonlyMap<
      string,
      ReturnType<typeof projectNodeToOverlayLocal>
    >,
    accessories: readonly ActiveAccessoryProjection[],
    seams: readonly ActiveSeamProjection[],
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

    const colors = ["#fb7185", "#facc15", "#4ade80"];
    accessories.forEach((projection, index) => {
      const socket = projection.socket.overlayLocal;
      const anchor = projection.anchor.overlayLocal;
      graphics.strokeColor = new Color().fromHEX(
        colors[index % colors.length]!,
      );
      graphics.circle(socket.x, socket.y, 9 + index * 2);
      graphics.moveTo(socket.x - 11, socket.y);
      graphics.lineTo(socket.x + 11, socket.y);
      graphics.moveTo(socket.x, socket.y - 11);
      graphics.lineTo(socket.x, socket.y + 11);
      graphics.circle(anchor.x, anchor.y, 5 + index);
      graphics.moveTo(anchor.x - 7, anchor.y - 7);
      graphics.lineTo(anchor.x + 7, anchor.y + 7);
      graphics.moveTo(anchor.x - 7, anchor.y + 7);
      graphics.lineTo(anchor.x + 7, anchor.y - 7);
      graphics.moveTo(socket.x, socket.y);
      graphics.lineTo(anchor.x, anchor.y);
      graphics.stroke();
    });

    graphics.lineWidth = 1.5;
    for (const seam of seams) {
      graphics.strokeColor = new Color().fromHEX("#f97316");
      this.drawWorldBounds(runtime, seam.first);
      graphics.stroke();
      graphics.strokeColor = new Color().fromHEX("#84cc16");
      this.drawWorldBounds(runtime, seam.second);
      graphics.stroke();
      const firstCenter = this.worldToOverlayLocal(runtime.overlayRoot, {
        x: (seam.first.left + seam.first.right) / 2,
        y: (seam.first.bottom + seam.first.top) / 2,
      });
      const secondCenter = this.worldToOverlayLocal(runtime.overlayRoot, {
        x: (seam.second.left + seam.second.right) / 2,
        y: (seam.second.bottom + seam.second.top) / 2,
      });
      graphics.strokeColor = new Color().fromHEX(
        seam.error <= HARNESS_SPATIAL_TOLERANCE_PX
          ? "#e2e8f0"
          : "#ef4444",
      );
      graphics.moveTo(firstCenter.x, firstCenter.y);
      graphics.lineTo(secondCenter.x, secondCenter.y);
      graphics.stroke();
    }

    const corners = this.boundsCorners(characterBounds).map((point) =>
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

  private drawWorldBounds(
    runtime: GarmentRuntime,
    bounds: GarmentWorldBounds,
  ): void {
    const corners = this.boundsCorners(bounds).map((point) =>
      this.worldToOverlayLocal(runtime.overlayRoot, point),
    );
    runtime.debugGraphics.moveTo(corners[0]!.x, corners[0]!.y);
    for (const corner of corners.slice(1)) {
      runtime.debugGraphics.lineTo(corner.x, corner.y);
    }
    runtime.debugGraphics.lineTo(corners[0]!.x, corners[0]!.y);
  }

  private boundsCorners(
    bounds: GarmentWorldBounds | HarnessBounds,
  ): HarnessPoint[] {
    return [
      { x: bounds.left, y: bounds.bottom },
      { x: bounds.right, y: bounds.bottom },
      { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.top },
    ];
  }

  private characterWorldPoints(runtime: GarmentRuntime): HarnessPoint[] {
    const points: HarnessPoint[] = [];
    for (const binding of runtime.base.joints.values()) {
      points.push(runtimeWorldPoint(binding.node, "TASK_013R5"));
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
          `TASK_013R5_RUNTIME_VISUAL_POSITION_NON_FINITE: ${semanticId}`,
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
      throw new Error("TASK_013R5_OVERLAY_TRANSFORM_MISSING");
    }
    const local = transform.convertToNodeSpaceAR(
      new Vec3(world.x, world.y, 0),
    );
    return { x: local.x, y: local.y };
  }

  private debugOutsideViewportCount(
    overlayRoot: Node,
    points: readonly HarnessPoint[],
  ): number {
    return points.filter((point) => {
      const local = this.worldToOverlayLocal(overlayRoot, point);
      return (
        !Number.isFinite(local.x) ||
        !Number.isFinite(local.y) ||
        local.x < -640 ||
        local.x > 640 ||
        local.y < -360 ||
        local.y > 360
      );
    }).length;
  }

  private sortingViolationCount(runtime: GarmentRuntime): number {
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

  private frontBackRoleViolationCount(runtime: GarmentRuntime): number {
    let violations = 0;
    for (const binding of runtime.attachments.attachments.values()) {
      const attachmentOrder =
        binding.visualNode.getComponent(Sorting2D)?.sortingOrder;
      if (
        attachmentOrder === undefined ||
        attachmentOrder !== binding.plan.sortingOrder ||
        (
          binding.plan.layerRole !== undefined &&
          !["back", "front", "cover"].includes(binding.plan.layerRole)
        )
      ) {
        violations += 1;
      }
    }
    return violations;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R5_DUPLICATE_INPUT_HANDLER");
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

  private executeAction(binding: GarmentInputBinding): void {
    const action: GarmentSemanticAction = binding.action;
    if (action.kind === "select-clip") {
      this.selectClip(action.clipId, true);
    } else if (action.kind === "select-garment-state") {
      this.semanticState.selectState(action.stateId);
    } else if (action.kind === "toggle-garment") {
      this.semanticState.toggleGarment();
    } else if (action.kind === "toggle-accessories") {
      this.semanticState.toggleAccessories();
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null) {
        throw new Error("TASK_013R5_PLAYBACK_NOT_READY");
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
      throw new Error(`TASK_013R5_UNKNOWN_ACTION: ${String(exhaustive)}`);
    }
    this.applyStressTransform();
    this.applyLoadoutState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private exactReset(): void {
    this.semanticState.exactReset();
    this.maximumMarkerError = 0;
    this.maximumSkeletonError = 0;
    this.maximumAccessorySocketError = 0;
    this.maximumGarmentSeamError = 0;
    this.lastSpatial = null;
    this.playback = new RigAnimationPlayback(
      this.clip(BASE_RIG_REST_CLIP_ID),
    );
    this.applySample(this.playback.stop());
    this.semanticState.setPlaybackStatus(this.playback.status);
    this.semanticState.setTime(this.playback.time);
    this.applyStressTransform();
    this.applyLoadoutState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private stateLabel(): string {
    const stateId = this.semanticState.snapshot().loadoutStateId;
    const state = PLAN.states.find(
      (candidate) => candidate.stateId === stateId,
    );
    if (state === undefined) {
      throw new Error(`TASK_013R5_UNKNOWN_STATE_LABEL: ${stateId}`);
    }
    return state.hudLabel;
  }

  private updateHud(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const semantic = this.semanticState.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const resource = this.coordinator?.snapshot();
    const [runtimeHelp, stateHelp, toggleHelp] =
      formatGarmentInputHelpLines();
    runtime.hudLabel.string = [
      "TASK-013R5 · GENERIC MULTI-PART GARMENT LAYERING BRIDGE",
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${this.lifecycleRebuildCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resource?.loaded ?? 0}/${resource?.expected ?? RESOURCE_MANIFEST.length} ${(resource?.terminal ?? "pending").toUpperCase()} · BASE ${PLAN_VALIDATION.partCount} · JOINTS ${PLAN_VALIDATION.jointCount} · ATTACHMENTS ${this.activeCounts.active}/${PLAN_VALIDATION.attachmentCount}`,
      `STATE ${semantic.loadoutStateId} · ${this.stateLabel()} · GARMENT ${this.activeCounts.garment}/${PLAN_VALIDATION.garmentPartCount} · ACCESSORIES ${this.activeCounts.accessories}/${PLAN_VALIDATION.accessoryPartCount}`,
      `CLIP ${this.playback?.animation.animationId ?? semantic.clipId} · ${this.playback?.status.toUpperCase() ?? semantic.playbackStatus.toUpperCase()} ${this.playback?.time.toFixed(2) ?? semantic.timeSeconds.toFixed(2)}s`,
      `TRANSFORM STRESS ${semantic.stressEnabled ? "ON" : "OFF"} · DEBUG ${semantic.debugEnabled ? "ON" : "OFF"} · SPATIAL PASS · ACTIVE SEAMS ${this.lastSpatial?.activeSeamCount ?? 0}/${PLAN_VALIDATION.seamCount}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · ACCESSORY SOCKET ${this.maximumAccessorySocketError.toFixed(3)} px`,
      `MAX GARMENT SEAM ${this.maximumGarmentSeamError.toFixed(3)} px · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px · UNKNOWN SLOTS ${this.lastSpatial?.unknownSlotCount ?? 0}`,
      `SORTING ${this.lastSpatial?.sortingViolationCount ?? 0} · FRONT/BACK ${this.lastSpatial?.frontBackRoleViolationCount ?? 0} · DUP GARMENT ${this.lastSpatial?.duplicateActiveGarmentCount ?? 0} · DUP ACCESSORY ${this.lastSpatial?.duplicateActiveAccessoryCount ?? 0}`,
      `DUP INPUT ${this.lastSpatial?.duplicateInputHandlerCount ?? 0} · DUP RESOURCE ${this.lastSpatial?.duplicateResourceRequestCount ?? 0} · NON-FINITE ${this.lastSpatial?.nonFinitePositionCount ?? 0} · OUTSIDE ${this.lastSpatial?.debugOutsideCharacterCount ?? 0}`,
      `CONTROLS ${runtimeHelp}`,
      `LOADOUT STATES ${stateHelp}`,
      `GROUP TOGGLES ${toggleHelp}`,
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

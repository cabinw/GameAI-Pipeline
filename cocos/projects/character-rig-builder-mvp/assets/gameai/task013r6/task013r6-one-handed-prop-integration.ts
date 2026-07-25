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
  formatPropInputHelpLines,
  PROP_INPUT_REGISTRY,
  validatePropInputRegistry,
  type PropInputBinding,
  type PropSemanticAction,
} from "./prop-input-registry";
import { PROP_BRIDGE_PLAN } from "./prop-bridge-plan-data";
import {
  createPropResourceManifest,
} from "./prop-resource-manifest";
import {
  validatePropBridgePlan,
  type PropAttachmentPlan,
} from "./prop-bridge-runtime-contract";
import {
  type GarmentLocalBounds,
  type GarmentSeamItemPlan,
} from "../task013r5/garment-bridge-runtime-contract";
import {
  garmentSeamError,
  garmentSeamOverlap,
  type GarmentWorldBounds,
} from "../task013r5/garment-spatial";
import {
  validatePropSpatialMeasurement,
  type PropSpatialMeasurement,
} from "./prop-spatial";
import { PropBridgeState } from "./prop-state";
import {
  applyGarmentState,
  buildGarmentRuntime,
  duplicateActiveGarmentCounts,
  type AppliedGarmentStateCounts,
  type BuiltGarmentRuntime,
} from "../task013r5/garment-runtime-builder";
import {
  applyPropState,
  buildPropRuntime,
  duplicateActivePropCounts,
  type AppliedPropStateCounts,
  type BuiltPropRuntime,
} from "./prop-runtime-builder";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R6Generated";
const OVERLAY_ROOT_NAME = "TASK013R6DebugOverlayRoot";
const HUD_NAME = "TASK013R6HUD";
const PLAN = PROP_BRIDGE_PLAN;
const PLAN_VALIDATION = validatePropBridgePlan(PLAN);
const RESOURCE_MANIFEST = createPropResourceManifest(PLAN);
const INPUT_REGISTRY = validatePropInputRegistry();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

export interface PropIntegrationDisplayIdentity {
  readonly adapterId: string;
  readonly hudTitle: string;
  readonly diagnosticsId: string;
}

export const TASK013R6_DISPLAY_IDENTITY: PropIntegrationDisplayIdentity =
  Object.freeze({
    adapterId: "task-013r6-one-handed-prop-integration",
    hudTitle: "TASK-013R6 · GENERIC ONE-HANDED PROP INTEGRATION",
    diagnosticsId: "TASK_013R6",
  });

interface PropIntegrationRuntime {
  readonly generatedRoot: Node;
  readonly base: BuiltBaseRigRuntime;
  readonly attachments: BuiltGarmentRuntime;
  readonly props: BuiltPropRuntime;
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

interface ActivePropProjection {
  readonly attachment: PropAttachmentPlan;
  readonly socket: ReturnType<typeof projectNodeToOverlayLocal>;
  readonly grip: ReturnType<typeof projectNodeToOverlayLocal>;
  readonly error: number;
}

interface SpatialRuntimeSnapshot {
  readonly maximumMarkerError: number;
  readonly maximumSkeletonError: number;
  readonly maximumAccessorySocketError: number;
  readonly maximumGarmentSeamError: number;
  readonly maximumPropGripError: number;
  readonly activeCounts: AppliedGarmentStateCounts;
  readonly activePropCounts: AppliedPropStateCounts;
  readonly activeSeamCount: number;
  readonly unknownSlotCount: number;
  readonly duplicateActiveGarmentCount: number;
  readonly duplicateActiveAccessoryCount: number;
  readonly duplicateActivePropCount: number;
  readonly unknownHandSocketCount: number;
  readonly duplicateResourceRequestCount: number;
  readonly duplicateInputHandlerCount: number;
  readonly nonFinitePositionCount: number;
  readonly debugOutsideCharacterCount: number;
  readonly sortingViolationCount: number;
  readonly frontBackRoleViolationCount: number;
  readonly characterBounds: HarnessBounds;
}

@ccclass("GameAITask013R6OneHandedPropIntegration")
export class GameAITask013R6OneHandedPropIntegration extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly semanticState = new PropBridgeState(
    PLAN.defaultGarmentStateId,
    PLAN.defaultPropStateId,
  );
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: PropIntegrationRuntime | null = null;
  private playback: RigAnimationPlayback | null = null;
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private inputRegistered = false;
  private inputEventCount = 0;
  private lifecycleRebuildCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
  private maximumAccessorySocketError = 0;
  private maximumGarmentSeamError = 0;
  private maximumPropGripError = 0;
  private activeCounts: AppliedGarmentStateCounts = Object.freeze({
    active: 0,
    garment: 0,
    accessories: 0,
  });
  private activePropCounts: AppliedPropStateCounts = Object.freeze({
    active: 0,
    primaryProps: 0,
    overlays: 0,
  });
  private lastSpatial: SpatialRuntimeSnapshot | null = null;

  protected runtimeDisplayIdentity(): PropIntegrationDisplayIdentity {
    return TASK013R6_DISPLAY_IDENTITY;
  }

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
            `TASK_013R6_RESOURCE_LOAD_FAILED: ${JSON.stringify({
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
          const identity = this.runtimeDisplayIdentity();
          console.info(
            `${identity.diagnosticsId}_RUNTIME_READY ${JSON.stringify({
              displayIdentity: identity,
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
      throw new Error("TASK_013R6_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicateRoots = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicateRoots.length > 0) {
      throw new Error(
        `TASK_013R6_DUPLICATE_GENERATED_ROOT: ${duplicateRoots
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
      PLAN.garment.base,
      this.spriteFrames,
      PLAN.garment.baseSortingOrders,
    );
    const attachments = buildGarmentRuntime(
      PLAN.garment.slots,
      PLAN.garment.attachments,
      base.joints,
      this.spriteFrames,
    );
    const props = buildPropRuntime(
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
      "PropIntegrationSpatialDebugGraphics",
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
      throw new Error("TASK_013R6_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1240, 240);
    hudNode.setPosition(-620, 340, 0);
    this.runtime = {
      generatedRoot,
      base,
      attachments,
      props,
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
    const clip = PLAN.garment.base.clips.find(
      (candidate) => candidate.animationId === animationId,
    );
    if (clip === undefined) {
      throw new Error(
        `TASK_013R6_UNKNOWN_SEMANTIC_CLIP: ${animationId}`,
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
      this.semanticState.snapshot().garmentStateId,
    );
    this.activePropCounts = applyPropState(
      this.runtime.props,
      this.semanticState.snapshot().propStateId,
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
          "TASK_013R6",
        ),
      ]),
    );
    const markerErrors = [...projections.values()].map(
      (projection) => projection.error,
    );
    const skeletonEndpointErrors: number[] = [];
    for (const part of PLAN.garment.base.parts) {
      if (part.parentId === null) continue;
      const parent = projections.get(part.parentId);
      const child = projections.get(part.jointId);
      if (parent === undefined || child === undefined) {
        throw new Error(
          `TASK_013R6_DEBUG_HIERARCHY_PROJECTION_MISSING: ${part.jointId}`,
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
        "TASK_013R6",
      );
      const anchor = projectNodeToOverlayLocal(
        binding.attachmentNode,
        runtime.overlayRoot,
        "TASK_013R6",
      );
      activeAccessories.push({ attachmentId, socket, anchor });
      markerErrors.push(socket.error, anchor.error);
      accessorySocketToAnchorErrors.push(
        harnessDistance(
          runtimeWorldPoint(binding.slotNode, "TASK_013R6"),
          runtimeWorldPoint(binding.attachmentNode, "TASK_013R6"),
        ),
      );
    }

    const activeProps: ActivePropProjection[] = [];
    const propSocketToGripErrors: number[] = [];
    for (const binding of runtime.props.attachments.values()) {
      if (
        !binding.attachmentNode.active ||
        binding.plan.attachmentKind !== "prop"
      ) {
        continue;
      }
      if (binding.gripNode === null) {
        throw new Error(
          `TASK_013R6_ACTIVE_PROP_GRIP_MISSING: ${binding.plan.attachmentId}`,
        );
      }
      const socket = projectNodeToOverlayLocal(
        binding.slotNode,
        runtime.overlayRoot,
        "TASK_013R6",
      );
      const grip = projectNodeToOverlayLocal(
        binding.gripNode,
        runtime.overlayRoot,
        "TASK_013R6",
      );
      const error = harnessDistance(
        runtimeWorldPoint(binding.slotNode, "TASK_013R6"),
        runtimeWorldPoint(binding.gripNode, "TASK_013R6"),
      );
      activeProps.push({
        attachment: binding.plan,
        socket,
        grip,
        error,
      });
      propSocketToGripErrors.push(error);
      markerErrors.push(socket.error, grip.error);
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
      ...activeProps.flatMap((projection) => [
        projection.socket.roundTripWorld,
        projection.grip.roundTripWorld,
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
    const duplicatePropCounts = duplicateActivePropCounts(runtime.props);
    const expectedPrimaryPropCount =
      this.semanticState.snapshot().propStateId === "no-prop" ? 0 : 1;
    const measurement: PropSpatialMeasurement = {
      markerErrors,
      skeletonEndpointErrors,
      accessorySocketToAnchorErrors,
      garmentSeamErrors,
      propSocketToGripErrors,
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
      unknownHandSocketCount: 0,
      duplicateActivePropCount: duplicatePropCounts.primaryProps,
      activePrimaryPropCount: this.activePropCounts.primaryProps,
      expectedPrimaryPropCount,
    };
    validatePropSpatialMeasurement(measurement);

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
    const maximumPropGripError =
      propSocketToGripErrors.length === 0
        ? 0
        : Math.max(...propSocketToGripErrors);
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
    this.maximumPropGripError = Math.max(
      this.maximumPropGripError,
      maximumPropGripError,
    );
    this.lastSpatial = {
      maximumMarkerError,
      maximumSkeletonError,
      maximumAccessorySocketError,
      maximumGarmentSeamError,
      maximumPropGripError,
      activeCounts: this.activeCounts,
      activePropCounts: this.activePropCounts,
      activeSeamCount: activeSeams.length,
      unknownSlotCount: 0,
      duplicateActiveGarmentCount: duplicateCounts.garment,
      duplicateActiveAccessoryCount: duplicateCounts.accessories,
      duplicateActivePropCount: duplicatePropCounts.primaryProps,
      unknownHandSocketCount: 0,
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
        `TASK_013R6_DEBUG_OUTSIDE_VIEWPORT: ${this.lastSpatial.debugOutsideCharacterCount}`,
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
      activeProps,
      activeSeams,
      characterBounds,
    );
  }

  private activeSeamProjections(
    runtime: PropIntegrationRuntime,
  ): readonly ActiveSeamProjection[] {
    const result: ActiveSeamProjection[] = [];
    for (const seam of PLAN.garment.seams) {
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
    runtime: PropIntegrationRuntime,
    item: GarmentSeamItemPlan,
  ): UITransform | null {
    if (item.itemKind === "base") {
      const binding = runtime.base.joints.get(item.itemId);
      if (binding === undefined) {
        throw new Error(`TASK_013R6_SEAM_BASE_ITEM_MISSING: ${item.itemId}`);
      }
      return binding.visualTransform;
    }
    const binding = runtime.attachments.attachments.get(item.itemId);
    if (binding === undefined) {
      throw new Error(
        `TASK_013R6_SEAM_ATTACHMENT_ITEM_MISSING: ${item.itemId}`,
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
      throw new Error("TASK_013R6_SEAM_WORLD_POSITION_NON_FINITE");
    }
    return Object.freeze({
      left: Math.min(...xs),
      right: Math.max(...xs),
      bottom: Math.min(...ys),
      top: Math.max(...ys),
    });
  }

  private drawDebug(
    runtime: PropIntegrationRuntime,
    projections: ReadonlyMap<
      string,
      ReturnType<typeof projectNodeToOverlayLocal>
    >,
    accessories: readonly ActiveAccessoryProjection[],
    props: readonly ActivePropProjection[],
    seams: readonly ActiveSeamProjection[],
    characterBounds: HarnessBounds,
  ): void {
    const graphics = runtime.debugGraphics;
    graphics.lineWidth = 2;
    graphics.strokeColor = new Color().fromHEX("#22d3ee");
    for (const part of PLAN.garment.base.parts) {
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

    props.forEach((projection) => {
      const socket = projection.socket.overlayLocal;
      const grip = projection.grip.overlayLocal;
      graphics.strokeColor = new Color().fromHEX(
        projection.error <= HARNESS_SPATIAL_TOLERANCE_PX
          ? "#f472b6"
          : "#ef4444",
      );
      graphics.circle(socket.x, socket.y, 13);
      graphics.moveTo(socket.x - 13, socket.y);
      graphics.lineTo(socket.x + 13, socket.y);
      graphics.moveTo(socket.x, socket.y - 13);
      graphics.lineTo(socket.x, socket.y + 13);
      graphics.circle(grip.x, grip.y, 7);
      graphics.moveTo(grip.x - 9, grip.y - 9);
      graphics.lineTo(grip.x + 9, grip.y + 9);
      graphics.moveTo(grip.x - 9, grip.y + 9);
      graphics.lineTo(grip.x + 9, grip.y - 9);
      graphics.moveTo(socket.x, socket.y);
      graphics.lineTo(grip.x, grip.y);
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
    runtime: PropIntegrationRuntime,
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

  private characterWorldPoints(runtime: PropIntegrationRuntime): HarnessPoint[] {
    const points: HarnessPoint[] = [];
    for (const binding of runtime.base.joints.values()) {
      points.push(runtimeWorldPoint(binding.node, "TASK_013R6"));
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
    for (const binding of runtime.props.attachments.values()) {
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
          `TASK_013R6_RUNTIME_VISUAL_POSITION_NON_FINITE: ${semanticId}`,
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
      throw new Error("TASK_013R6_OVERLAY_TRANSFORM_MISSING");
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

  private sortingViolationCount(runtime: PropIntegrationRuntime): number {
    let violations = 0;
    const observedOrders: number[] = [];
    for (const [jointId, binding] of runtime.base.joints) {
      const order =
        binding.visual.getComponent(Sorting2D)?.sortingOrder;
      observedOrders.push(order ?? Number.NaN);
      if (
        order !== PLAN.garment.baseSortingOrders[jointId] ||
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
    for (const binding of runtime.props.attachments.values()) {
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

  private frontBackRoleViolationCount(runtime: PropIntegrationRuntime): number {
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
    for (const binding of runtime.props.attachments.values()) {
      const attachmentOrder =
        binding.visualNode.getComponent(Sorting2D)?.sortingOrder;
      if (
        attachmentOrder === undefined ||
        attachmentOrder !== binding.plan.sortingOrder ||
        ![
          "behind-target",
          "in-front-of-target",
          "target-overlay",
        ].includes(binding.plan.layerRole)
      ) {
        violations += 1;
      }
    }
    return violations;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R6_DUPLICATE_INPUT_HANDLER");
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

  private executeAction(binding: PropInputBinding): void {
    const action: PropSemanticAction = binding.action;
    if (action.kind === "select-clip") {
      this.selectClip(action.clipId, true);
    } else if (action.kind === "select-prop-state") {
      this.semanticState.selectPropState(action.propStateId);
    } else if (action.kind === "toggle-garment") {
      this.semanticState.toggleGarment();
    } else if (action.kind === "toggle-accessories") {
      this.semanticState.toggleAccessories();
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null) {
        throw new Error("TASK_013R6_PLAYBACK_NOT_READY");
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
      throw new Error(`TASK_013R6_UNKNOWN_ACTION: ${String(exhaustive)}`);
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
    this.maximumPropGripError = 0;
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
      throw new Error(`TASK_013R6_UNKNOWN_STATE_LABEL: ${stateId}`);
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
      formatPropInputHelpLines();
    const garmentPartCount = PLAN.garment.attachments.filter(
      (attachment) => attachment.category === "wearable",
    ).length;
    const accessoryPartCount =
      PLAN.garment.attachments.length - garmentPartCount;
    const identity = this.runtimeDisplayIdentity();
    runtime.hudLabel.string = [
      identity.hudTitle,
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${this.lifecycleRebuildCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resource?.loaded ?? 0}/${resource?.expected ?? RESOURCE_MANIFEST.length} ${(resource?.terminal ?? "pending").toUpperCase()} · BASE ${PLAN_VALIDATION.partCount} · JOINTS ${PLAN_VALIDATION.jointCount} · ATTACHMENTS ${this.activeCounts.active + this.activePropCounts.active}/${PLAN_VALIDATION.garmentAttachmentCount + PLAN_VALIDATION.propAttachmentCount}`,
      `STATE ${semantic.loadoutStateId} · ${this.stateLabel()} · GARMENT ${this.activeCounts.garment}/${garmentPartCount} · ACCESSORIES ${this.activeCounts.accessories}/${accessoryPartCount}`,
      `PROP STATE ${semantic.propStateId} · PRIMARY ${this.activePropCounts.primaryProps}/1 · OVERLAYS ${this.activePropCounts.overlays}/1 · UNKNOWN HAND SOCKETS ${this.lastSpatial?.unknownHandSocketCount ?? 0}`,
      `CLIP ${this.playback?.animation.animationId ?? semantic.clipId} · ${this.playback?.status.toUpperCase() ?? semantic.playbackStatus.toUpperCase()} ${this.playback?.time.toFixed(2) ?? semantic.timeSeconds.toFixed(2)}s`,
      `TRANSFORM STRESS ${semantic.stressEnabled ? "ON" : "OFF"} · DEBUG ${semantic.debugEnabled ? "ON" : "OFF"} · SPATIAL PASS · ACTIVE SEAMS ${this.lastSpatial?.activeSeamCount ?? 0}/${PLAN.garment.seams.length}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · ACCESSORY SOCKET ${this.maximumAccessorySocketError.toFixed(3)} px`,
      `MAX GARMENT SEAM ${this.maximumGarmentSeamError.toFixed(3)} px · PROP GRIP ${this.maximumPropGripError.toFixed(3)} px · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px`,
      `SORTING ${this.lastSpatial?.sortingViolationCount ?? 0} · FRONT/BACK ${this.lastSpatial?.frontBackRoleViolationCount ?? 0} · UNKNOWN SLOTS ${this.lastSpatial?.unknownSlotCount ?? 0}`,
      `DUP GARMENT ${this.lastSpatial?.duplicateActiveGarmentCount ?? 0} · DUP ACCESSORY ${this.lastSpatial?.duplicateActiveAccessoryCount ?? 0} · DUP PROP ${this.lastSpatial?.duplicateActivePropCount ?? 0}`,
      `DUP INPUT ${this.lastSpatial?.duplicateInputHandlerCount ?? 0} · DUP RESOURCE ${this.lastSpatial?.duplicateResourceRequestCount ?? 0} · NON-FINITE ${this.lastSpatial?.nonFinitePositionCount ?? 0} · OUTSIDE ${this.lastSpatial?.debugOutsideCharacterCount ?? 0}`,
      `CONTROLS ${runtimeHelp}`,
      `PROP STATES ${stateHelp}`,
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

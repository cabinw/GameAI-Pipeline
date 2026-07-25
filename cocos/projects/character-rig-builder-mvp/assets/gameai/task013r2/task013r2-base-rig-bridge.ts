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

import { PRODUCTION_LITE_CHARACTER_PLAN } from "../production-lite-character/production-lite-character-data";
import {
  BASE_RIG_REST_CLIP_ID,
  validateBaseRigBridgePlan,
} from "./base-rig-contract";
import {
  BASE_RIG_INPUT_REGISTRY,
  formatBaseRigInputHelp,
  validateBaseRigInputRegistry,
  type BaseRigInputBinding,
  type BaseRigSemanticAction,
} from "./base-rig-input-registry";
import {
  createBaseRigResourceManifest,
  resourceLogicalIdForJoint,
} from "./base-rig-resource-manifest";
import { BaseRigBridgeState } from "./base-rig-state";
import { HarnessLifecycle } from "../task013r1/harness-lifecycle";
import { HarnessResourceCoordinator } from "../task013r1/harness-resource-manifest";
import {
  harnessProductionSortingOrder,
  harnessSortingOrder,
  validateHarnessSortingPolicy,
} from "../task013r1/harness-sorting-registry";
import {
  harnessBounds,
  HARNESS_SPATIAL_TOLERANCE_PX,
  validateHierarchySpatialMeasurement,
  type HarnessBounds,
  type HarnessPoint,
  type HierarchySpatialMeasurement,
} from "../task013r1/harness-spatial";
import {
  projectNodeToOverlayLocal,
  runtimeWorldPoint,
} from "../task013r1/debug-space-projector";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R2Generated";
const OVERLAY_ROOT_NAME = "TASK013R2DebugOverlayRoot";
const HUD_NAME = "TASK013R2HUD";
const PLAN = PRODUCTION_LITE_CHARACTER_PLAN;
const PLAN_VALIDATION = validateBaseRigBridgePlan(PLAN);
const RESOURCE_MANIFEST = createBaseRigResourceManifest(PLAN);
const INPUT_REGISTRY = validateBaseRigInputRegistry();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

type PartPlan = (typeof PLAN.parts)[number];

interface JointBinding {
  readonly node: Node;
  readonly visual: Node;
  readonly visualTransform: UITransform;
  readonly restPose: JointRestPose;
  readonly part: PartPlan;
}

interface BaseRigRuntime {
  readonly generatedRoot: Node;
  readonly adapterRoot: Node;
  readonly nestedParent: Node;
  readonly joints: ReadonlyMap<string, JointBinding>;
  readonly overlayRoot: Node;
  readonly debugGraphicsNode: Node;
  readonly debugGraphics: Graphics;
  readonly hudLabel: Label;
}

interface SpatialRuntimeSnapshot {
  readonly maximumMarkerError: number;
  readonly maximumSkeletonError: number;
  readonly unknownParentCount: number;
  readonly parentCycleCount: number;
  readonly nonFinitePositionCount: number;
  readonly debugLineOutsideCharacterCount: number;
  readonly sortingViolationCount: number;
  readonly characterBounds: HarnessBounds;
}

@ccclass("GameAITask013R2BaseRigBridge")
export class GameAITask013R2BaseRigBridge extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly semanticState = new BaseRigBridgeState();
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: BaseRigRuntime | null = null;
  private playback: RigAnimationPlayback | null = null;
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private inputRegistered = false;
  private inputEventCount = 0;
  private lifecycleRebuildCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
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
    this.updateDebugOverlay();
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
        if (error || asset == null) {
          this.coordinator?.reject(entry.logicalId);
          this.lifecycle.fail(generation);
          throw new Error(
            `TASK_013R2_RESOURCE_LOAD_FAILED: ${JSON.stringify({
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
            `TASK_013R2_RUNTIME_READY ${JSON.stringify({
              lifecycle: this.lifecycle.snapshot(),
              resources: snapshot,
              plan: PLAN_VALIDATION,
              sorting: SORTING_POLICY,
            })}`,
          );
        }
      });
    }
  }

  private buildRuntime(): void {
    if (this.coordinator?.snapshot().terminal !== "passed") {
      throw new Error("TASK_013R2_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicateRoots = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicateRoots.length > 0) {
      throw new Error(
        `TASK_013R2_DUPLICATE_GENERATED_ROOT: ${duplicateRoots
          .map((node) => node.name)
          .join(",")}`,
      );
    }

    const generatedRoot = this.nodeWithLayer(GENERATED_ROOT_NAME, this.node);
    const adapterRoot = this.nodeWithLayer("AdapterRoot", generatedRoot);
    const nestedParent = this.nodeWithLayer("NestedTransform", adapterRoot);
    const joints = new Map<string, JointBinding>();

    const createJoint = (part: PartPlan): JointBinding => {
      const existing = joints.get(part.jointId);
      if (existing !== undefined) return existing;
      const parent =
        part.parentId === null
          ? nestedParent
          : createJoint(this.requirePart(part.parentId)).node;
      const joint = this.nodeWithLayer(`Joint_${part.jointId}`, parent);
      this.setPose(joint, part.restPose);
      const visual = this.nodeWithLayer(`Visual_${part.jointId}`, joint);
      visual.setPosition(part.visualOffset.x, part.visualOffset.y, 0);
      const visualTransform = visual.addComponent(UITransform);
      visualTransform.setAnchorPoint(0.5, 0.5);
      visualTransform.setContentSize(
        part.visualSize.width,
        part.visualSize.height,
      );
      const sprite = visual.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      const logicalId = resourceLogicalIdForJoint(part.jointId);
      const spriteFrame = this.spriteFrames.get(logicalId);
      if (spriteFrame === undefined) {
        throw new Error(
          `TASK_013R2_RESOURCE_NOT_AVAILABLE_FOR_PART: ${part.jointId}`,
        );
      }
      sprite.spriteFrame = spriteFrame;
      visual.addComponent(Sorting2D).sortingOrder =
        harnessProductionSortingOrder(part.drawOrder);
      const binding: JointBinding = {
        node: joint,
        visual,
        visualTransform,
        restPose: part.restPose,
        part,
      };
      joints.set(part.jointId, binding);
      return binding;
    };
    for (const part of PLAN.parts) createJoint(part);
    if (joints.size !== PLAN_VALIDATION.jointCount) {
      throw new Error(
        `TASK_013R2_RUNTIME_JOINT_COUNT_MISMATCH: ${joints.size}`,
      );
    }

    const overlayRoot = this.nodeWithLayer(OVERLAY_ROOT_NAME, this.node);
    const overlayTransform = overlayRoot.addComponent(UITransform);
    overlayTransform.setAnchorPoint(0.5, 0.5);
    overlayTransform.setContentSize(1280, 720);
    const debugGraphicsNode = this.nodeWithLayer(
      "HierarchySpatialDebugGraphics",
      overlayRoot,
    );
    const debugGraphics = debugGraphicsNode.addComponent(Graphics);
    debugGraphicsNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("debug-geometry");
    const hudNode = this.nodeWithLayer(HUD_NAME, overlayRoot);
    const hudLabel = hudNode.addComponent(Label);
    hudLabel.fontSize = 15;
    hudLabel.lineHeight = 18;
    hudLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    hudLabel.verticalAlign = VerticalTextAlignment.TOP;
    hudLabel.enableWrapText = false;
    hudLabel.overflow = Label.Overflow.CLAMP;
    hudLabel.color = new Color().fromHEX("#ffffff");
    hudNode.addComponent(Sorting2D).sortingOrder = harnessSortingOrder("hud");
    const hudTransform = hudNode.getComponent(UITransform);
    if (hudTransform === null) {
      throw new Error("TASK_013R2_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1220, 150);
    hudNode.setPosition(-610, 340, 0);

    this.runtime = {
      generatedRoot,
      adapterRoot,
      nestedParent,
      joints,
      overlayRoot,
      debugGraphicsNode,
      debugGraphics,
      hudLabel,
    };
  }

  private requirePart(jointId: string): PartPlan {
    const part = PLAN.parts.find(
      (candidate) => candidate.jointId === jointId,
    );
    if (part === undefined) {
      throw new Error(`TASK_013R2_UNKNOWN_RUNTIME_PARENT: ${jointId}`);
    }
    return part;
  }

  private nodeWithLayer(name: string, parent: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    return node;
  }

  private setPose(node: Node, pose: JointRestPose): void {
    node.setPosition(pose.position.x, pose.position.y, 0);
    node.setRotationFromEuler(0, 0, pose.rotationDegrees);
    node.setScale(pose.scale.x, pose.scale.y, 1);
  }

  private clip(animationId: string): NormalizedRigAnimation {
    const clip = PLAN.clips.find(
      (candidate) => candidate.animationId === animationId,
    );
    if (clip === undefined) {
      throw new Error(`TASK_013R2_UNKNOWN_SEMANTIC_CLIP: ${animationId}`);
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
    for (const [jointId, binding] of runtime.joints) {
      const pose = composeJointPose(
        binding.restPose,
        sample.joints[jointId],
      );
      this.setPose(binding.node, pose);
    }
  }

  private applyStressTransform(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    if (this.semanticState.snapshot().stressEnabled) {
      runtime.adapterRoot.setPosition(72, -68, 0);
      runtime.adapterRoot.setScale(1.12, 0.91, 1);
      runtime.adapterRoot.setRotationFromEuler(0, 0, 11);
      runtime.nestedParent.setPosition(-36, 18, 0);
      runtime.nestedParent.setScale(0.94, 1.07, 1);
      runtime.nestedParent.setRotationFromEuler(0, 0, -7);
    } else {
      runtime.adapterRoot.setPosition(0, -70, 0);
      runtime.adapterRoot.setScale(1, 1, 1);
      runtime.adapterRoot.setRotationFromEuler(0, 0, 0);
      runtime.nestedParent.setPosition(0, 0, 0);
      runtime.nestedParent.setScale(1, 1, 1);
      runtime.nestedParent.setRotationFromEuler(0, 0, 0);
    }
  }

  private updateDebugOverlay(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const debugEnabled = this.semanticState.snapshot().debugEnabled;
    runtime.debugGraphicsNode.active = debugEnabled;
    runtime.debugGraphics.clear();
    if (!debugEnabled) {
      this.lastSpatial = null;
      return;
    }

    const projections = new Map(
      [...runtime.joints].map(([jointId, binding]) => [
        jointId,
        projectNodeToOverlayLocal(
          binding.node,
          runtime.overlayRoot,
          "TASK_013R2",
        ),
      ]),
    );
    const markerErrors = [...projections.values()].map(
      (projection) => projection.error,
    );
    const skeletonEndpointErrors: number[] = [];
    const graphics = runtime.debugGraphics;
    graphics.lineWidth = 2;
    graphics.strokeColor = new Color().fromHEX("#22d3ee");
    for (const part of PLAN.parts) {
      const child = projections.get(part.jointId);
      if (child === undefined) {
        throw new Error(
          `TASK_013R2_DEBUG_JOINT_PROJECTION_MISSING: ${part.jointId}`,
        );
      }
      if (part.parentId !== null) {
        const parent = projections.get(part.parentId);
        if (parent === undefined) {
          throw new Error(
            `TASK_013R2_DEBUG_PARENT_PROJECTION_MISSING: ${part.parentId}`,
          );
        }
        graphics.moveTo(parent.overlayLocal.x, parent.overlayLocal.y);
        graphics.lineTo(child.overlayLocal.x, child.overlayLocal.y);
        skeletonEndpointErrors.push(parent.error, child.error);
      }
      graphics.circle(child.overlayLocal.x, child.overlayLocal.y, 5);
      graphics.moveTo(
        child.overlayLocal.x - 7,
        child.overlayLocal.y,
      );
      graphics.lineTo(
        child.overlayLocal.x + 7,
        child.overlayLocal.y,
      );
    }
    graphics.stroke();

    const characterWorldPoints = this.characterWorldPoints(runtime);
    const characterBounds = harnessBounds(characterWorldPoints, 12);
    const debugWorldPoints = [...projections.values()].map(
      (projection) => projection.roundTripWorld,
    );
    const debugBounds = harnessBounds(debugWorldPoints, 7);
    const measurement: HierarchySpatialMeasurement = {
      markerErrors,
      skeletonEndpointErrors,
      characterBounds,
      debugBounds,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      sortingViolationCount: this.sortingViolationCount(runtime),
    };
    validateHierarchySpatialMeasurement(measurement);

    const characterLocalCorners = [
      { x: characterBounds.left, y: characterBounds.bottom },
      { x: characterBounds.right, y: characterBounds.bottom },
      { x: characterBounds.right, y: characterBounds.top },
      { x: characterBounds.left, y: characterBounds.top },
    ].map((point) =>
      this.worldToOverlayLocal(runtime.overlayRoot, point),
    );
    graphics.strokeColor = new Color().fromHEX("#a78bfa");
    graphics.moveTo(
      characterLocalCorners[0]!.x,
      characterLocalCorners[0]!.y,
    );
    for (const corner of characterLocalCorners.slice(1)) {
      graphics.lineTo(corner.x, corner.y);
    }
    graphics.lineTo(
      characterLocalCorners[0]!.x,
      characterLocalCorners[0]!.y,
    );
    graphics.stroke();

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
    this.lastSpatial = {
      maximumMarkerError,
      maximumSkeletonError,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      debugLineOutsideCharacterCount: 0,
      sortingViolationCount: measurement.sortingViolationCount,
      characterBounds,
    };
  }

  private characterWorldPoints(runtime: BaseRigRuntime): HarnessPoint[] {
    const points: HarnessPoint[] = [];
    for (const binding of runtime.joints.values()) {
      points.push(runtimeWorldPoint(binding.node, "TASK_013R2"));
      const width = binding.visualTransform.contentSize.width / 2;
      const height = binding.visualTransform.contentSize.height / 2;
      for (const corner of [
        new Vec3(-width, -height, 0),
        new Vec3(width, -height, 0),
        new Vec3(width, height, 0),
        new Vec3(-width, height, 0),
      ]) {
        const world =
          binding.visualTransform.convertToWorldSpaceAR(corner);
        if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
          throw new Error(
            `TASK_013R2_RUNTIME_VISUAL_POSITION_NON_FINITE: ${binding.part.jointId}`,
          );
        }
        points.push({ x: world.x, y: world.y });
      }
    }
    return points;
  }

  private worldToOverlayLocal(
    overlayRoot: Node,
    world: HarnessPoint,
  ): HarnessPoint {
    const transform = overlayRoot.getComponent(UITransform);
    if (transform === null) {
      throw new Error("TASK_013R2_OVERLAY_TRANSFORM_MISSING");
    }
    const local = transform.convertToNodeSpaceAR(
      new Vec3(world.x, world.y, 0),
    );
    return { x: local.x, y: local.y };
  }

  private sortingViolationCount(runtime: BaseRigRuntime): number {
    let violations = 0;
    for (const binding of runtime.joints.values()) {
      const order = binding.visual.getComponent(Sorting2D)?.sortingOrder;
      if (
        order === undefined ||
        order < SORTING_POLICY.production.minimum ||
        order > SORTING_POLICY.production.maximum
      ) {
        violations += 1;
      }
    }
    const debugOrder =
      runtime.debugGraphicsNode.getComponent(Sorting2D)?.sortingOrder;
    if (
      debugOrder === undefined ||
      debugOrder < SORTING_POLICY.debug.minimum ||
      debugOrder > SORTING_POLICY.debug.maximum
    ) {
      violations += 1;
    }
    const hudOrder =
      runtime.hudLabel.node.getComponent(Sorting2D)?.sortingOrder;
    if (
      hudOrder === undefined ||
      hudOrder < SORTING_POLICY.hud.minimum ||
      hudOrder > SORTING_POLICY.hud.maximum
    ) {
      violations += 1;
    }
    return violations;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R2_DUPLICATE_INPUT_HANDLER");
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

  private executeAction(binding: BaseRigInputBinding): void {
    const action: BaseRigSemanticAction = binding.action;
    if (action.kind === "select-clip") {
      this.selectClip(action.clipId, true);
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null) {
        throw new Error("TASK_013R2_PLAYBACK_NOT_READY");
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
      throw new Error(`TASK_013R2_UNKNOWN_ACTION: ${String(exhaustive)}`);
    }
    this.applyStressTransform();
    this.updateDebugOverlay();
    this.updateHud();
  }

  private exactReset(): void {
    this.semanticState.exactReset();
    this.maximumMarkerError = 0;
    this.maximumSkeletonError = 0;
    this.lastSpatial = null;
    this.playback = new RigAnimationPlayback(this.clip(BASE_RIG_REST_CLIP_ID));
    this.applySample(this.playback.stop());
    this.semanticState.setPlaybackStatus(this.playback.status);
    this.semanticState.setTime(this.playback.time);
    this.applyStressTransform();
    this.updateDebugOverlay();
    this.updateHud();
  }

  private updateHud(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const semantic = this.semanticState.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const resource = this.coordinator?.snapshot();
    const spatialStatus = semantic.debugEnabled
      ? this.lastSpatial === null
        ? "PENDING"
        : "PASS"
      : "OFF";
    runtime.hudLabel.string = [
      "TASK-013R2 · PRODUCTION-LITE BASE RIG BRIDGE",
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${this.lifecycleRebuildCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resource?.loaded ?? 0}/${resource?.expected ?? RESOURCE_MANIFEST.length} ${(resource?.terminal ?? "pending").toUpperCase()} · PARTS ${PLAN_VALIDATION.partCount} · JOINTS ${PLAN_VALIDATION.jointCount} · SEGMENTS ${PLAN_VALIDATION.skeletonSegmentCount}`,
      `CLIP ${this.playback?.animation.animationId ?? semantic.clipId} · ${this.playback?.status.toUpperCase() ?? semantic.playbackStatus.toUpperCase()} ${this.playback?.time.toFixed(2) ?? semantic.timeSeconds.toFixed(2)}s`,
      `TRANSFORM STRESS ${semantic.stressEnabled ? "ON" : "OFF"} · DEBUG ${semantic.debugEnabled ? "ON" : "OFF"} · SPATIAL ${spatialStatus} · UNKNOWN PARENTS ${this.lastSpatial?.unknownParentCount ?? 0} · CYCLES ${this.lastSpatial?.parentCycleCount ?? 0}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · NON-FINITE ${this.lastSpatial?.nonFinitePositionCount ?? 0} · OUTSIDE ${this.lastSpatial?.debugLineOutsideCharacterCount ?? 0} · SORTING ${this.lastSpatial?.sortingViolationCount ?? 0} · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px`,
      formatBaseRigInputHelp(),
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

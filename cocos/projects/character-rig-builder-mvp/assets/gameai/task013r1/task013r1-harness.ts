import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
  HorizontalTextAlignment,
  input,
  Input,
  JsonAsset,
  KeyCode,
  Label,
  Layers,
  Node,
  resources,
  Sorting2D,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";

import {
  formatHarnessInputHelp,
  HARNESS_INPUT_REGISTRY,
  type HarnessInputBinding,
  type HarnessSemanticAction,
} from "./harness-input-registry";
import { HarnessLifecycle } from "./harness-lifecycle";
import {
  HarnessResourceCoordinator,
  resolveHarnessResourceManifest,
} from "./harness-resource-manifest";
import {
  harnessSortingOrder,
  validateHarnessSortingPolicy,
} from "./harness-sorting-registry";
import {
  harnessBounds,
  harnessDistance,
  HARNESS_SPATIAL_TOLERANCE_PX,
  validateHarnessSpatialMeasurement,
  type HarnessPoint,
  type HarnessSpatialMeasurement,
} from "./harness-spatial";
import {
  HarnessPlaybackState,
  type HarnessPose,
} from "./harness-state";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK013R1Generated";
const OVERLAY_ROOT_NAME = "TASK013R1DebugOverlayRoot";
const HUD_NAME = "TASK013R1HUD";
const RESOURCE_MANIFEST = resolveHarnessResourceManifest();
const SORTING_POLICY = validateHarnessSortingPolicy();
const BINDING_BY_KEY = new Map(
  HARNESS_INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding,
  ]),
);

interface HarnessConfig {
  readonly schemaVersion: "1.0.0";
  readonly harnessId: "task-013r1-minimal-cocos-runtime-harness";
  readonly designResolution: Readonly<{ width: 1280; height: 720 }>;
  readonly runtimeTolerancePx: number;
}

interface HarnessRuntimeNodes {
  readonly generatedRoot: Node;
  readonly adapterRoot: Node;
  readonly nestedParent: Node;
  readonly rootJoint: Node;
  readonly childJoint: Node;
  readonly socket: Node;
  readonly gripAnchor: Node;
  readonly overlayRoot: Node;
  readonly overlayGraphicsNode: Node;
  readonly overlayGraphics: Graphics;
  readonly hudLabel: Label;
}

@ccclass("GameAITask013R1Harness")
export class GameAITask013R1Harness extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly playback = new HarnessPlaybackState();
  private coordinator: HarnessResourceCoordinator | null = null;
  private runtime: HarnessRuntimeNodes | null = null;
  private inputRegistered = false;
  private inputEventCount = 0;
  private maximumMarkerError = 0;
  private maximumSkeletonError = 0;
  private maximumGripError = 0;
  private lastMeasurement: HarnessSpatialMeasurement | null = null;
  private config: HarnessConfig | null = null;

  onEnable(): void {
    this.beginRuntimeSetup();
  }

  update(deltaSeconds: number): void {
    if (this.runtime === null) return;
    this.applyPose(this.playback.update(deltaSeconds));
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
    this.coordinator = new HarnessResourceCoordinator(RESOURCE_MANIFEST);
    for (const entry of RESOURCE_MANIFEST) {
      this.coordinator.request(entry.logicalId);
      resources.load(entry.cocosPath, JsonAsset, (error, asset) => {
        if (!this.lifecycle.accepts(generation)) return;
        if (error || asset == null) {
          this.coordinator?.reject(entry.logicalId);
          this.lifecycle.fail(generation);
          throw new Error(
            `TASK_013R1_RESOURCE_LOAD_FAILED: ${JSON.stringify({
              logicalId: entry.logicalId,
              cocosPath: entry.cocosPath,
              error: error?.message ?? "null JsonAsset",
            })}`,
          );
        }
        this.coordinator?.succeed(entry.logicalId);
        this.config = this.validateConfig(asset.json);
        const snapshot = this.coordinator?.snapshot();
        if (snapshot?.terminal === "passed") {
          this.buildRuntime();
          this.lifecycle.ready(generation);
          this.exactReset();
          console.info(
            `TASK_013R1_RUNTIME_READY ${JSON.stringify({
              lifecycle: this.lifecycle.snapshot(),
              resources: snapshot,
              sorting: SORTING_POLICY,
            })}`,
          );
        }
      });
    }
  }

  private validateConfig(value: unknown): HarnessConfig {
    const config = value as Partial<HarnessConfig> | null;
    if (
      config?.schemaVersion !== "1.0.0" ||
      config.harnessId !== "task-013r1-minimal-cocos-runtime-harness" ||
      config.designResolution?.width !== 1280 ||
      config.designResolution.height !== 720 ||
      config.runtimeTolerancePx !== HARNESS_SPATIAL_TOLERANCE_PX
    ) {
      throw new Error(`TASK_013R1_CONFIG_INVALID: ${JSON.stringify(value)}`);
    }
    return config as HarnessConfig;
  }

  private buildRuntime(): void {
    if (this.coordinator?.snapshot().terminal !== "passed") {
      throw new Error("TASK_013R1_BUILD_BEFORE_MANIFEST_PASS");
    }
    const duplicate = this.node.children.filter(
      (child) =>
        child.name === GENERATED_ROOT_NAME ||
        child.name === OVERLAY_ROOT_NAME,
    );
    if (duplicate.length > 0) {
      throw new Error(
        `TASK_013R1_DUPLICATE_GENERATED_ROOT: ${duplicate.map((node) => node.name).join(",")}`,
      );
    }

    const generatedRoot = this.nodeWithLayer(GENERATED_ROOT_NAME, this.node);
    const adapterRoot = this.nodeWithLayer("AdapterRoot", generatedRoot);
    const nestedParent = this.nodeWithLayer("NestedTransform", adapterRoot);
    const rootJoint = this.nodeWithLayer("Joint_root", nestedParent);
    const childJoint = this.nodeWithLayer("Joint_child", rootJoint);
    const socket = this.nodeWithLayer("Socket_handle", childJoint);
    socket.setPosition(120, 0, 0);
    const attachmentPivot = this.nodeWithLayer(
      "Attachment_handle",
      childJoint,
    );
    attachmentPivot.setPosition(120, 0, 0);
    const gripAnchor = this.nodeWithLayer("GripAnchor", attachmentPivot);

    this.productionPart(
      rootJoint,
      "RootPart",
      new Color().fromHEX("#38bdf8"),
      100,
      42,
      "production-root",
    );
    this.productionPart(
      childJoint,
      "ChildPart",
      new Color().fromHEX("#f59e0b"),
      120,
      30,
      "production-child",
    );
    this.productionPart(
      attachmentPivot,
      "Attachment",
      new Color().fromHEX("#a78bfa"),
      48,
      48,
      "production-attachment",
    );

    const overlayRoot = this.nodeWithLayer(OVERLAY_ROOT_NAME, this.node);
    const overlayTransform = overlayRoot.addComponent(UITransform);
    overlayTransform.setAnchorPoint(0.5, 0.5);
    overlayTransform.setContentSize(
      this.config?.designResolution.width ?? 1280,
      this.config?.designResolution.height ?? 720,
    );
    const overlayGraphicsNode = this.nodeWithLayer(
      "SpatialDebugGraphics",
      overlayRoot,
    );
    const overlayGraphics = overlayGraphicsNode.addComponent(Graphics);
    overlayGraphicsNode.addComponent(Sorting2D).sortingOrder =
      harnessSortingOrder("debug-geometry");

    const hudNode = this.nodeWithLayer(HUD_NAME, overlayRoot);
    const hudLabel = hudNode.addComponent(Label);
    hudLabel.fontSize = 16;
    hudLabel.lineHeight = 20;
    hudLabel.horizontalAlign = HorizontalTextAlignment.LEFT;
    hudLabel.verticalAlign = VerticalTextAlignment.TOP;
    hudLabel.enableWrapText = false;
    hudLabel.overflow = Label.Overflow.CLAMP;
    hudLabel.color = new Color().fromHEX("#ffffff");
    hudNode.addComponent(Sorting2D).sortingOrder = harnessSortingOrder("hud");
    const hudTransform = hudNode.getComponent(UITransform);
    if (hudTransform === null) {
      throw new Error("TASK_013R1_HUD_TRANSFORM_MISSING");
    }
    hudTransform.setAnchorPoint(0, 1);
    hudTransform.setContentSize(1220, 140);
    hudNode.setPosition(-610, 340, 0);

    this.runtime = {
      generatedRoot,
      adapterRoot,
      nestedParent,
      rootJoint,
      childJoint,
      socket,
      gripAnchor,
      overlayRoot,
      overlayGraphicsNode,
      overlayGraphics,
      hudLabel,
    };
  }

  private nodeWithLayer(name: string, parent: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    return node;
  }

  private productionPart(
    parent: Node,
    name: string,
    color: Color,
    width: number,
    height: number,
    role:
      | "production-root"
      | "production-child"
      | "production-attachment",
  ): void {
    const node = this.nodeWithLayer(name, parent);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 0.5);
    transform.setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.rect(0, -height / 2, width, height);
    graphics.fill();
    node.addComponent(Sorting2D).sortingOrder = harnessSortingOrder(role);
  }

  private applyPose(pose: HarnessPose): void {
    if (this.runtime === null) return;
    this.runtime.childJoint.setPosition(
      pose.childPosition.x,
      pose.childPosition.y,
      0,
    );
    this.runtime.childJoint.setRotationFromEuler(
      0,
      0,
      pose.childRotationDegrees,
    );
  }

  private applyStressTransform(): void {
    if (this.runtime === null) return;
    if (this.playback.snapshot().stressEnabled) {
      this.runtime.adapterRoot.setPosition(72, -54, 0);
      this.runtime.adapterRoot.setScale(1.18, 0.86, 1);
      this.runtime.adapterRoot.setRotationFromEuler(0, 0, 17);
      this.runtime.nestedParent.setPosition(-46, 22, 0);
      this.runtime.nestedParent.setScale(0.9, 1.12, 1);
      this.runtime.nestedParent.setRotationFromEuler(0, 0, -11);
    } else {
      this.runtime.adapterRoot.setPosition(0, -40, 0);
      this.runtime.adapterRoot.setScale(1, 1, 1);
      this.runtime.adapterRoot.setRotationFromEuler(0, 0, 0);
      this.runtime.nestedParent.setPosition(0, 0, 0);
      this.runtime.nestedParent.setScale(1, 1, 1);
      this.runtime.nestedParent.setRotationFromEuler(0, 0, 0);
    }
  }

  private updateDebugOverlay(): void {
    const runtime = this.runtime;
    if (runtime === null) return;
    const debugEnabled = this.playback.snapshot().debugEnabled;
    runtime.overlayGraphicsNode.active = debugEnabled;
    runtime.overlayGraphics.clear();
    if (!debugEnabled) return;

    const rootWorld = this.worldPoint(runtime.rootJoint);
    const childWorld = this.worldPoint(runtime.childJoint);
    const socketWorld = this.worldPoint(runtime.socket);
    const gripWorld = this.worldPoint(runtime.gripAnchor);
    const rootLocal = this.overlayPoint(runtime.overlayRoot, rootWorld);
    const childLocal = this.overlayPoint(runtime.overlayRoot, childWorld);
    const socketLocal = this.overlayPoint(runtime.overlayRoot, socketWorld);
    const gripLocal = this.overlayPoint(runtime.overlayRoot, gripWorld);
    const graphics = runtime.overlayGraphics;

    graphics.lineWidth = 3;
    graphics.strokeColor = new Color().fromHEX("#22d3ee");
    graphics.moveTo(rootLocal.x, rootLocal.y);
    graphics.lineTo(childLocal.x, childLocal.y);
    graphics.circle(rootLocal.x, rootLocal.y, 7);
    graphics.circle(childLocal.x, childLocal.y, 7);
    graphics.stroke();
    graphics.strokeColor = new Color().fromHEX("#4ade80");
    graphics.circle(socketLocal.x, socketLocal.y, 11);
    graphics.moveTo(socketLocal.x - 14, socketLocal.y);
    graphics.lineTo(socketLocal.x + 14, socketLocal.y);
    graphics.stroke();
    graphics.strokeColor = new Color().fromHEX("#f472b6");
    graphics.circle(gripLocal.x, gripLocal.y, 6);
    graphics.moveTo(gripLocal.x, gripLocal.y - 14);
    graphics.lineTo(gripLocal.x, gripLocal.y + 14);
    graphics.stroke();

    const rootRoundTrip = this.overlayLocalToWorld(runtime.overlayRoot, rootLocal);
    const childRoundTrip = this.overlayLocalToWorld(
      runtime.overlayRoot,
      childLocal,
    );
    const socketRoundTrip = this.overlayLocalToWorld(
      runtime.overlayRoot,
      socketLocal,
    );
    const measurement: HarnessSpatialMeasurement = {
      markerError: harnessDistance(socketWorld, socketRoundTrip),
      skeletonRootError: harnessDistance(rootWorld, rootRoundTrip),
      skeletonChildError: harnessDistance(childWorld, childRoundTrip),
      gripError: harnessDistance(socketWorld, gripWorld),
      characterBounds: harnessBounds([rootWorld, childWorld, socketWorld], 24),
      debugBounds: harnessBounds(
        [rootRoundTrip, childRoundTrip, socketRoundTrip, gripWorld],
        14,
      ),
    };
    validateHarnessSpatialMeasurement(measurement);
    this.lastMeasurement = measurement;
    this.maximumMarkerError = Math.max(
      this.maximumMarkerError,
      measurement.markerError,
    );
    this.maximumSkeletonError = Math.max(
      this.maximumSkeletonError,
      measurement.skeletonRootError,
      measurement.skeletonChildError,
    );
    this.maximumGripError = Math.max(
      this.maximumGripError,
      measurement.gripError,
    );
  }

  private worldPoint(node: Node): HarnessPoint {
    const world = node.getWorldPosition(new Vec3());
    if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
      throw new Error("TASK_013R1_RUNTIME_WORLD_POSITION_NON_FINITE");
    }
    return { x: world.x, y: world.y };
  }

  private overlayPoint(overlayRoot: Node, world: HarnessPoint): HarnessPoint {
    const transform = overlayRoot.getComponent(UITransform);
    if (transform === null) {
      throw new Error("TASK_013R1_OVERLAY_TRANSFORM_MISSING");
    }
    const local = transform.convertToNodeSpaceAR(
      new Vec3(world.x, world.y, 0),
    );
    return { x: local.x, y: local.y };
  }

  private overlayLocalToWorld(
    overlayRoot: Node,
    local: HarnessPoint,
  ): HarnessPoint {
    const transform = overlayRoot.getComponent(UITransform);
    if (transform === null) {
      throw new Error("TASK_013R1_OVERLAY_TRANSFORM_MISSING");
    }
    const world = transform.convertToWorldSpaceAR(
      new Vec3(local.x, local.y, 0),
    );
    return { x: world.x, y: world.y };
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_013R1_DUPLICATE_INPUT_HANDLER");
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

  private executeAction(binding: HarnessInputBinding): void {
    const action: HarnessSemanticAction = binding.action;
    if (action.kind === "toggle-debug") {
      this.playback.toggleDebug();
    } else if (action.kind === "toggle-playback") {
      this.playback.togglePlayback();
    } else if (action.kind === "exact-reset") {
      this.exactReset();
    } else if (action.kind === "toggle-stress") {
      this.playback.toggleStress();
    } else if (action.kind === "rebuild-runtime") {
      this.teardownRuntime(false);
      this.beginRuntimeSetup();
      return;
    } else {
      const exhaustive: never = action;
      throw new Error(`TASK_013R1_UNKNOWN_ACTION: ${String(exhaustive)}`);
    }
    this.updateDebugOverlay();
    this.updateHud();
  }

  private exactReset(): void {
    this.maximumMarkerError = 0;
    this.maximumSkeletonError = 0;
    this.maximumGripError = 0;
    this.lastMeasurement = null;
    this.applyPose(this.playback.exactReset());
    this.applyStressTransform();
    this.updateDebugOverlay();
    this.updateHud();
  }

  private updateHud(): void {
    if (this.runtime === null) return;
    const playback = this.playback.snapshot();
    const resourcesState = this.coordinator?.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const spatialStatus =
      this.lastMeasurement === null
        ? playback.debugEnabled
          ? "PENDING"
          : "OFF"
        : "PASS";
    this.runtime.hudLabel.string = [
      "TASK-013R1 · MINIMAL COCOS RUNTIME ADAPTER HARNESS",
      `LIFECYCLE ${lifecycle.phase.toUpperCase()} · GENERATION ${lifecycle.setupCount} · INPUT EVENTS ${this.inputEventCount}`,
      `RESOURCES ${resourcesState?.loaded ?? 0}/${resourcesState?.expected ?? RESOURCE_MANIFEST.length} ${(resourcesState?.terminal ?? "pending").toUpperCase()} · PLAYBACK ${playback.state.toUpperCase()} ${playback.timeSeconds.toFixed(2)}s`,
      `STRESS ${playback.stressEnabled ? "ON" : "OFF"} · DEBUG ${playback.debugEnabled ? "ON" : "OFF"} · SPATIAL ${spatialStatus}`,
      `MAX MARKER ${this.maximumMarkerError.toFixed(3)} px · SKELETON ${this.maximumSkeletonError.toFixed(3)} px · GRIP ${this.maximumGripError.toFixed(3)} px · LIMIT ${HARNESS_SPATIAL_TOLERANCE_PX.toFixed(1)} px`,
      formatHarnessInputHelp(),
    ].join("\n");
  }

  private teardownRuntime(dispose: boolean): void {
    this.unregisterInput();
    this.runtime?.generatedRoot.removeFromParent();
    this.runtime?.overlayRoot.removeFromParent();
    this.runtime?.generatedRoot.destroy();
    this.runtime?.overlayRoot.destroy();
    this.runtime = null;
    this.coordinator = null;
    this.config = null;
    this.lifecycle.teardown(dispose);
  }
}

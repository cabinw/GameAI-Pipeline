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
  Quat,
  resources,
  Sorting2D,
  UIRenderer,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import {
  createPrevalidatedCharacterSemanticEventEvaluator,
  type CharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
} from "@gameai/character-semantic-events/dist/runtime-esm/runtime.js";
import {
  composeJointPose,
  RigAnimationPlayback,
  type JointRestPose,
  type NormalizedRigAnimation,
  type RigAnimationSample,
} from "@gameai/rig-animation/dist/runtime-esm/runtime.js";

import { STICKMAN_REFERENCE_PLAN } from "../stickman-reference/stickman-reference-data";
import { projectNodeToOverlayLocal } from "../task013r1/debug-space-projector";
import { HarnessLifecycle } from "../task013r1/harness-lifecycle";
import { HarnessResourceCoordinator } from "../task013r1/harness-resource-manifest";
import {
  SemanticVfxAdapter,
  createSortedGraphicsRenderer,
  type SemanticVfxHost,
  type SemanticVfxPose,
  type SemanticVfxRendererRequest,
  type SemanticVfxRendererUpdate,
} from "./semantic-vfx-adapter";
import { assertNeverSemanticVfxRendererKind } from "./semantic-vfx-cue-registry";
import {
  SemanticVfxAdapterError,
  SemanticVfxAdapterErrorCode,
} from "./semantic-vfx-diagnostics";
import {
  assertNeverSemanticVfxAction,
  formatSemanticVfxInputHelpLines,
  nextTask014BTransformStressState,
  SEMANTIC_VFX_INPUT_REGISTRY,
  TASK014B_VISUAL_ACCEPTANCE,
  task014bViewportOverflowPx,
  task014bTransformStressPose,
  transformTask014BAabb,
  type SemanticVfxAction,
} from "./semantic-vfx-input-registry";
import {
  TASK014B_INITIAL_TRACK_ID,
  TASK014B_TRACK_ORDER,
  TASK014B_SEMANTIC_EVENT_CONTEXT,
  TASK014B_SEMANTIC_EVENT_CONTRACT,
  resolveTask014BSemanticTrackId,
  task014bSemanticTrackDefinition,
  type Task014BSemanticTrackId,
} from "./semantic-vfx-reference-contract";
import { resolveSemanticVfxResourceManifest } from "./semantic-vfx-resource-manifest";

const { ccclass } = _decorator;
const GENERATED_ROOT_NAME = "TASK014BGenerated";
const TRANSFORM_STRESS_ROOT_NAME = "TransformStressRoot";
const TASK014B_SORTING_LAYER = 0;
const RESOURCE_MANIFEST = resolveSemanticVfxResourceManifest();
const BINDING_BY_KEY = new Map(
  SEMANTIC_VFX_INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode],
    binding.action,
  ]),
);

interface SemanticVfxConfig {
  readonly schemaVersion: "1.0.0";
  readonly referenceId: "task-014b-cocos-semantic-vfx-adapter";
  readonly designResolution: Readonly<{ width: 1280; height: 720 }>;
  readonly socketProjectionTolerancePx: number;
}

interface JointBinding {
  readonly node: Node;
  readonly restPose: JointRestPose;
  readonly marker: Node;
}

interface RendererBinding {
  readonly node: Node;
  readonly graphics: Graphics;
  readonly request: SemanticVfxRendererRequest;
}

interface RendererComponentMeasurement {
  readonly rendererId: string;
  readonly uiRendererCount: number;
  readonly sorting2DCount: number;
}

type PrimitiveVisual = (typeof STICKMAN_REFERENCE_PLAN.parts)[number]["visual"];

class CocosSemanticVfxHost implements SemanticVfxHost {
  private readonly renderers = new Map<string, RendererBinding>();
  private readonly socketWorldRotation = new Quat();
  private readonly socketWorldScale = new Vec3();
  private readonly composedWorldRotation = new Quat();
  private readonly authoredLocalRotation = new Quat();
  private readonly effectWorldRotation = new Quat();
  private debugVisible = false;
  maximumProjectionError = 0;
  maximumEffectPositionError = 0;
  maximumEffectRotationErrorDegrees = 0;
  maximumViewportOverflowPx = 0;
  rendererComponentConflictCount = 0;

  constructor(
    private readonly overlayRoot: Node,
    private readonly sockets: ReadonlyMap<string, Node>,
  ) {}

  resolveSocket(socketId: string): SemanticVfxPose | undefined {
    const socket = this.sockets.get(socketId);
    if (socket === undefined) return undefined;
    const projected = projectNodeToOverlayLocal(
      socket,
      this.overlayRoot,
      "TASK_014B",
    );
    this.maximumProjectionError = Math.max(
      this.maximumProjectionError,
      projected.error,
    );
    socket.getWorldRotation(this.socketWorldRotation);
    socket.getWorldScale(this.socketWorldScale);
    return {
      position: projected.overlayLocal,
      rotation: {
        x: this.socketWorldRotation.x,
        y: this.socketWorldRotation.y,
        z: this.socketWorldRotation.z,
        w: this.socketWorldRotation.w,
      },
      scale: {
        x: this.socketWorldScale.x,
        y: this.socketWorldScale.y,
      },
    };
  }

  createRenderer(request: SemanticVfxRendererRequest): void {
    if (this.renderers.has(request.rendererId)) {
      throw new Error(`TASK_014B_RENDERER_DUPLICATE: ${request.rendererId}`);
    }
    const node = new Node(`VFX_${request.rendererId}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.overlayRoot);
    node.addComponent(UITransform).setContentSize(160, 160);
    let graphics: Graphics;
    try {
      ({ graphics } = this.createSortedGraphics(
        node,
        request.sortingOrder,
      ));
    } catch (error) {
      if (
        error instanceof SemanticVfxAdapterError &&
        error.code ===
          SemanticVfxAdapterErrorCode.RENDERABLE_COMPONENT_CONFLICT
      ) {
        this.rendererComponentConflictCount += 1;
      }
      throw error;
    }
    this.renderers.set(request.rendererId, { node, graphics, request });
  }

  updateRenderer(
    rendererId: string,
    update: SemanticVfxRendererUpdate,
  ): void {
    const renderer = this.renderers.get(rendererId);
    if (renderer === undefined) {
      throw new Error(`TASK_014B_RENDERER_UNKNOWN: ${rendererId}`);
    }
    const { node, graphics, request } = renderer;
    node.setPosition(update.pose.position.x, update.pose.position.y, 0);
    this.socketWorldRotation.x = update.pose.rotation.socketWorld.x;
    this.socketWorldRotation.y = update.pose.rotation.socketWorld.y;
    this.socketWorldRotation.z = update.pose.rotation.socketWorld.z;
    this.socketWorldRotation.w = update.pose.rotation.socketWorld.w;
    Quat.normalize(this.socketWorldRotation, this.socketWorldRotation);
    Quat.fromEuler(
      this.authoredLocalRotation,
      0,
      0,
      update.pose.rotation.localZDegrees,
    );
    Quat.multiply(
      this.composedWorldRotation,
      this.socketWorldRotation,
      this.authoredLocalRotation,
    );
    Quat.normalize(
      this.composedWorldRotation,
      this.composedWorldRotation,
    );
    node.setWorldRotation(this.composedWorldRotation);
    node.setScale(update.pose.scale.x, update.pose.scale.y, 1);
    this.maximumEffectPositionError = Math.max(
      this.maximumEffectPositionError,
      Math.hypot(
        node.position.x - update.pose.position.x,
        node.position.y - update.pose.position.y,
      ),
    );
    node.getWorldRotation(this.effectWorldRotation);
    const rotationDot = Math.min(
      1,
      Math.abs(
        this.effectWorldRotation.x * this.composedWorldRotation.x +
          this.effectWorldRotation.y * this.composedWorldRotation.y +
          this.effectWorldRotation.z * this.composedWorldRotation.z +
          this.effectWorldRotation.w * this.composedWorldRotation.w,
      ),
    );
    this.maximumEffectRotationErrorDegrees = Math.max(
      this.maximumEffectRotationErrorDegrees,
      (2 * Math.acos(rotationDot) * 180) / Math.PI,
    );
    graphics.clear();
    switch (request.rendererKind) {
      case "footstep-dust": {
        const radius = 16 + update.normalizedAge * 38;
        const alpha = Math.round(255 * (1 - update.normalizedAge));
        graphics.fillColor = new Color(251, 146, 60, alpha);
        graphics.circle(-18, 16, radius * 0.62);
        graphics.circle(14, 20, radius * 0.78);
        graphics.circle(0, 30, radius * 0.48);
        graphics.fill();
        graphics.strokeColor = new Color(255, 237, 213, alpha);
        graphics.lineWidth = 4;
        graphics.circle(-18, 16, radius * 0.62);
        graphics.circle(14, 20, radius * 0.78);
        graphics.stroke();
        break;
      }
      case "hand-trail": {
        const pulse = 7 + Math.sin(update.elapsedSeconds * 18) * 2;
        graphics.strokeColor = new Color(52, 211, 153, 245);
        graphics.lineWidth = 16;
        graphics.moveTo(-64, -14);
        graphics.bezierCurveTo(-44, 30, -18, -26, 0, 0);
        graphics.stroke();
        graphics.strokeColor = new Color(236, 253, 245, 235);
        graphics.lineWidth = 4;
        graphics.moveTo(-62, -14);
        graphics.bezierCurveTo(-42, 28, -18, -24, 0, 0);
        graphics.stroke();
        graphics.fillColor = new Color(110, 231, 183, 255);
        graphics.circle(0, 0, pulse);
        graphics.fill();
        break;
      }
      case "persistent-aura": {
        const radius = 62 + Math.sin(update.elapsedSeconds * 4) * 5;
        graphics.strokeColor = new Color(192, 132, 252, 225);
        graphics.lineWidth = 8;
        graphics.circle(0, 0, radius);
        graphics.stroke();
        graphics.strokeColor = new Color(244, 114, 182, 180);
        graphics.lineWidth = 4;
        graphics.circle(0, 0, radius - 13);
        graphics.stroke();
        break;
      }
      default:
        assertNeverSemanticVfxRendererKind(request.rendererKind);
    }
    const viewportBounds = transformTask014BAabb(
      {
        position: {
          x: update.pose.position.x,
          y: update.pose.position.y,
        },
        rotationDegrees: node.eulerAngles.z,
        scale: {
          x: update.pose.scale.x,
          y: update.pose.scale.y,
        },
      },
      TASK014B_VISUAL_ACCEPTANCE.rendererLocalBounds[
        request.rendererKind
      ],
    );
    const overflow = task014bViewportOverflowPx(viewportBounds);
    this.maximumViewportOverflowPx = Math.max(
      this.maximumViewportOverflowPx,
      overflow,
    );
    if (overflow > 0) {
      throw new Error(
        `TASK_014B_VFX_VIEWPORT_OVERFLOW: ${request.rendererId} ${overflow.toFixed(4)}px`,
      );
    }
    if (this.debugVisible) {
      graphics.strokeColor = new Color(34, 211, 238, 180);
      graphics.lineWidth = 2;
      graphics.rect(-80, -80, 160, 160);
      graphics.stroke();
    }
  }

  destroyRenderer(rendererId: string, _reason: string): void {
    const renderer = this.renderers.get(rendererId);
    if (renderer === undefined) return;
    renderer.node.destroy();
    this.renderers.delete(rendererId);
  }

  activeRendererCount(): number {
    return this.renderers.size;
  }

  rendererComponentSnapshot(): readonly RendererComponentMeasurement[] {
    return Object.freeze(
      [...this.renderers.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([rendererId, binding]) =>
          Object.freeze({
            rendererId,
            uiRendererCount:
              binding.node.getComponents(UIRenderer).length,
            sorting2DCount:
              binding.node.getComponents(Sorting2D).length,
          }),
        ),
    );
  }

  setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    for (const renderer of this.renderers.values()) {
      renderer.node.name = visible
        ? `VFX_DEBUG_${renderer.request.rendererId}`
        : `VFX_${renderer.request.rendererId}`;
    }
  }

  private createSortedGraphics(
    node: Node,
    sortingOrder: number,
  ): Readonly<{ graphics: Graphics; sorting: Sorting2D }> {
    return createSortedGraphicsRenderer<UIRenderer, Graphics, Sorting2D>(
      {
        currentRenderer: () => node.getComponent(UIRenderer),
        renderers: () => node.getComponents(UIRenderer),
        sortings: () => node.getComponents(Sorting2D),
        addGraphics: () => node.addComponent(Graphics),
        addSorting: () => node.addComponent(Sorting2D),
        configureSorting: (sorting, sortingLayer, order) => {
          sorting.sortingLayer = sortingLayer;
          sorting.sortingOrder = order;
        },
        destroyPartial: () => {
          node.destroy();
        },
      },
      TASK014B_SORTING_LAYER,
      sortingOrder,
    );
  }
}

@ccclass("GameAITask014BSemanticVfxReference")
export class GameAITask014BSemanticVfxReference extends Component {
  private readonly lifecycle = new HarnessLifecycle();
  private readonly joints = new Map<string, JointBinding>();
  private readonly sockets = new Map<string, Node>();
  private coordinator: HarnessResourceCoordinator | null = null;
  private config: SemanticVfxConfig | null = null;
  private generatedRoot: Node | null = null;
  private transformStressRoot: Node | null = null;
  private overlayRoot: Node | null = null;
  private hud: Label | null = null;
  private host: CocosSemanticVfxHost | null = null;
  private adapter: SemanticVfxAdapter | null = null;
  private evaluator: CharacterSemanticEventEvaluator | null = null;
  private animation: RigAnimationPlayback | null = null;
  private activeTrackId: Task014BSemanticTrackId =
    TASK014B_INITIAL_TRACK_ID;
  private inputRegistered = false;
  private rebuildCount = 0;
  private transformStressEnabled = false;
  private debugJoints = false;
  private debugVfx = false;
  private debugSkeleton = false;
  private debugLinks = false;
  private runtimeFailure = "";

  onEnable(): void {
    this.beginSetup(false);
  }

  update(deltaSeconds: number): void {
    if (
      this.adapter === null ||
      this.evaluator === null ||
      this.animation === null
    ) {
      this.updateHud();
      return;
    }
    try {
      if (this.evaluator.snapshot.status === "playing") {
        this.applyAnimation(this.animation.update(deltaSeconds));
        this.dispatch(this.evaluator.advance(deltaSeconds));
      }
      this.adapter.tick(deltaSeconds);
      this.assertRuntime();
    } catch (error) {
      this.runtimeFailure =
        error instanceof Error ? error.message : String(error);
      console.error(this.runtimeFailure);
    }
    this.updateHud();
  }

  onDisable(): void {
    this.teardown(false, "dispose");
  }

  onDestroy(): void {
    this.teardown(true, "dispose");
  }

  private beginSetup(preserveTransformStress: boolean): void {
    const generation = this.lifecycle.begin();
    if (!this.inputRegistered) this.registerInput();
    this.coordinator = new HarnessResourceCoordinator(RESOURCE_MANIFEST);
    for (const resource of RESOURCE_MANIFEST) {
      this.coordinator.request(resource.logicalId);
      resources.load(resource.cocosPath, JsonAsset, (error, asset) => {
        if (!this.lifecycle.accepts(generation)) return;
        if (error || asset === null) {
          this.coordinator?.reject(resource.logicalId);
          this.lifecycle.fail(generation);
          this.runtimeFailure = `TASK_014B_RESOURCE_LOAD_FAILED: ${resource.logicalId}`;
          console.error(this.runtimeFailure, error);
          return;
        }
        this.coordinator?.succeed(resource.logicalId);
        this.config = this.validateConfig(asset.json);
        if (this.coordinator?.snapshot().terminal === "passed") {
          this.buildRuntime();
          this.lifecycle.ready(generation);
          this.exactReset(preserveTransformStress);
          console.info("TASK_014B_RUNTIME_READY", this.runtimeSnapshot());
        }
      });
    }
  }

  private validateConfig(value: unknown): SemanticVfxConfig {
    const config = value as Partial<SemanticVfxConfig> | null;
    if (
      config?.schemaVersion !== "1.0.0" ||
      config.referenceId !== "task-014b-cocos-semantic-vfx-adapter" ||
      config.designResolution?.width !== 1280 ||
      config.designResolution.height !== 720 ||
      config.socketProjectionTolerancePx !== 0.5
    ) {
      throw new Error(`TASK_014B_CONFIG_INVALID: ${JSON.stringify(value)}`);
    }
    return config as SemanticVfxConfig;
  }

  private buildRuntime(): void {
    if (this.node.children.some((child) => child.name === GENERATED_ROOT_NAME)) {
      throw new Error("TASK_014B_DUPLICATE_RUNTIME_ROOT");
    }
    const root = this.makeNode(GENERATED_ROOT_NAME, this.node);
    const transformStressRoot = this.makeNode(
      TRANSFORM_STRESS_ROOT_NAME,
      root,
    );
    this.transformStressRoot = transformStressRoot;
    this.applyTransformStress();
    const rigRoot = this.makeNode(
      "MinimalStickmanRig",
      transformStressRoot,
    );
    rigRoot.setPosition(100, 60, 0);
    rigRoot.setScale(1.35, 1.35, 1);
    this.generatedRoot = root;

    const jointNodes = new Map<string, Node>();
    for (const part of STICKMAN_REFERENCE_PLAN.parts) {
      jointNodes.set(part.jointId, this.makeNode(`Joint_${part.jointId}`));
    }
    for (const part of STICKMAN_REFERENCE_PLAN.parts) {
      const joint = jointNodes.get(part.jointId)!;
      joint.setParent(
        part.parentId === null ? rigRoot : jointNodes.get(part.parentId)!,
      );
      joint.setPosition(
        part.restPose.position.x,
        part.restPose.position.y,
        0,
      );
      joint.setRotationFromEuler(0, 0, part.restPose.rotationDegrees);
      joint.setScale(part.restPose.scale.x, part.restPose.scale.y, 1);
      this.createPrimitive(joint, part.visual, 10 + part.drawOrder);
      const marker = this.createMarker(joint, part.drawOrder);
      this.joints.set(part.jointId, {
        node: joint,
        marker,
        restPose: {
          position: { ...part.restPose.position },
          rotationDegrees: part.restPose.rotationDegrees,
          scale: { ...part.restPose.scale },
        },
      });
    }
    this.createSocket("foot-left-contact", jointNodes.get("foot-left")!);
    this.createSocket("foot-right-contact", jointNodes.get("foot-right")!);
    this.createSocket("hand-right-trail", jointNodes.get("hand-right")!);
    this.createSocket("torso-aura", jointNodes.get("torso")!);

    const overlay = this.makeNode("TASK014BOverlay", root);
    overlay.addComponent(UITransform).setContentSize(1280, 720);
    this.overlayRoot = overlay;
    this.host = new CocosSemanticVfxHost(overlay, this.sockets);
    this.adapter = new SemanticVfxAdapter(this.host);
    this.createHud(overlay);
  }

  private makeNode(name: string, parent?: Node): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    if (parent !== undefined) node.setParent(parent);
    return node;
  }

  private createPrimitive(
    parent: Node,
    visual: PrimitiveVisual,
    order: number,
  ): void {
    const node = this.makeNode(`Visual_${visual.partId}`, parent);
    const { graphics } = this.hostSortedGraphics(node, order);
    const color = new Color().fromHEX(visual.color);
    graphics.strokeColor = color;
    graphics.fillColor = color;
    graphics.lineWidth = STICKMAN_REFERENCE_PLAN.lineWidth;
    if (visual.kind === "segment") {
      graphics.moveTo(visual.from.x, visual.from.y);
      graphics.lineTo(visual.to.x, visual.to.y);
      graphics.stroke();
    } else {
      graphics.circle(visual.center.x, visual.center.y, visual.radius);
      graphics.fill();
    }
  }

  private createMarker(parent: Node, order: number): Node {
    const marker = this.makeNode("JointMarker", parent);
    const { graphics } = this.hostSortedGraphics(
      marker,
      100 + order,
    );
    graphics.fillColor = new Color().fromHEX("#22d3ee");
    graphics.circle(0, 0, 5);
    graphics.fill();
    marker.active = this.debugJoints;
    return marker;
  }

  private hostSortedGraphics(
    node: Node,
    sortingOrder: number,
  ): Readonly<{ graphics: Graphics; sorting: Sorting2D }> {
    return createSortedGraphicsRenderer<UIRenderer, Graphics, Sorting2D>(
      {
        currentRenderer: () => node.getComponent(UIRenderer),
        renderers: () => node.getComponents(UIRenderer),
        sortings: () => node.getComponents(Sorting2D),
        addGraphics: () => node.addComponent(Graphics),
        addSorting: () => node.addComponent(Sorting2D),
        configureSorting: (sorting, sortingLayer, order) => {
          sorting.sortingLayer = sortingLayer;
          sorting.sortingOrder = order;
        },
        destroyPartial: () => {
          node.destroy();
        },
      },
      TASK014B_SORTING_LAYER,
      sortingOrder,
    );
  }

  private createSocket(socketId: string, parent: Node): void {
    const socket = this.makeNode(`Socket_${socketId}`, parent);
    this.sockets.set(socketId, socket);
  }

  private createHud(parent: Node): void {
    const node = this.makeNode("TASK014BHUD", parent);
    node.setPosition(-620, 345, 0);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 1);
    transform.setContentSize(1240, 270);
    const label = node.addComponent(Label);
    label.fontSize = 15;
    label.lineHeight = 18;
    label.horizontalAlign = HorizontalTextAlignment.LEFT;
    label.verticalAlign = VerticalTextAlignment.TOP;
    label.overflow = Label.Overflow.CLAMP;
    label.color = new Color().fromHEX("#f8fafc");
    const hudSorting = node.addComponent(Sorting2D);
    hudSorting.sortingLayer = TASK014B_SORTING_LAYER;
    hudSorting.sortingOrder = 200;
    this.hud = label;
  }

  private selectTrack(candidateTrackId: unknown, play = true): void {
    const trackId = resolveTask014BSemanticTrackId(candidateTrackId);
    const trackDefinition = task014bSemanticTrackDefinition(trackId);
    if (this.evaluator !== null) {
      this.dispatch(this.evaluator.switchTrack(trackId));
    }
    this.adapter?.cleanup("track-switch");
    this.activeTrackId = trackId;
    this.evaluator = createPrevalidatedCharacterSemanticEventEvaluator(
      TASK014B_SEMANTIC_EVENT_CONTRACT,
      TASK014B_SEMANTIC_EVENT_CONTEXT,
      trackId,
    );
    const clip = STICKMAN_REFERENCE_PLAN.clips.find(
      (candidate) => candidate.animationId === trackDefinition.clipId,
    );
    if (clip === undefined) {
      throw new Error(
        `TASK_014B_CLIP_UNKNOWN: ${trackDefinition.clipId}`,
      );
    }
    this.animation = new RigAnimationPlayback(
      clip as unknown as NormalizedRigAnimation,
    );
    this.applyAnimation(play ? this.animation.play() : this.animation.stop());
    if (play) this.evaluator.play();
  }

  private dispatch(commands: readonly EvaluatedSemanticEvent[]): void {
    for (const command of commands) this.adapter?.dispatch(command);
  }

  private applyAnimation(sample: RigAnimationSample): void {
    for (const [jointId, binding] of this.joints) {
      const pose = composeJointPose(binding.restPose, sample.joints[jointId]);
      binding.node.setPosition(pose.position.x, pose.position.y, 0);
      binding.node.setRotationFromEuler(0, 0, pose.rotationDegrees);
      binding.node.setScale(pose.scale.x, pose.scale.y, 1);
    }
  }

  private exactReset(preserveTransformStress = false): void {
    if (this.evaluator !== null) {
      this.dispatch(this.evaluator.exactReset());
    }
    this.adapter?.cleanup("exact-reset");
    if (!preserveTransformStress) {
      this.transformStressEnabled = false;
    }
    this.applyTransformStress();
    this.debugJoints = false;
    this.debugVfx = false;
    this.debugSkeleton = false;
    this.debugLinks = false;
    for (const joint of this.joints.values()) {
      joint.marker.active = false;
    }
    this.host?.setDebugVisible(false);
    this.selectTrack(TASK014B_INITIAL_TRACK_ID, false);
    this.runtimeFailure = "";
  }

  private rebuild(): void {
    this.rebuildCount += 1;
    this.teardown(false, "rebuild");
    this.beginSetup(true);
  }

  private applyTransformStress(): void {
    const root = this.transformStressRoot;
    if (root === null) return;
    const pose = task014bTransformStressPose(
      this.transformStressEnabled,
    );
    root.setPosition(pose.position.x, pose.position.y, 0);
    root.setRotationFromEuler(0, 0, pose.rotationDegrees);
    root.setScale(pose.scale.x, pose.scale.y, 1);
  }

  private teardown(
    dispose: boolean,
    reason: "dispose" | "rebuild",
  ): void {
    if (this.evaluator !== null) this.dispatch(this.evaluator.dispose());
    this.adapter?.cleanup(reason);
    const generatedRoot = this.generatedRoot;
    if (generatedRoot !== null) {
      generatedRoot.setParent(null);
      generatedRoot.destroy();
    }
    this.generatedRoot = null;
    this.transformStressRoot = null;
    this.overlayRoot = null;
    this.hud = null;
    this.host = null;
    this.adapter = null;
    this.evaluator = null;
    this.animation = null;
    this.joints.clear();
    this.sockets.clear();
    if (reason !== "rebuild") this.unregisterInput();
    this.lifecycle.teardown(dispose);
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_014B_DUPLICATE_INPUT_HANDLER");
    }
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = true;
  }

  private unregisterInput(): void {
    if (!this.inputRegistered) return;
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = false;
  }

  private applyAction(action: SemanticVfxAction): void {
    const nextTransformStressState =
      nextTask014BTransformStressState(
        this.transformStressEnabled,
        action,
      );
    if (action.kind === "select-track") {
      this.selectTrack(action.trackId);
    } else if (action.kind === "toggle-playback") {
      if (this.evaluator?.snapshot.status === "playing") {
        this.evaluator.pause();
        this.animation?.pause();
      } else {
        this.evaluator?.resume();
        this.animation?.play();
      }
    } else if (action.kind === "exact-reset") {
      this.exactReset();
    } else if (action.kind === "switch-track") {
      const current = TASK014B_TRACK_ORDER.indexOf(this.activeTrackId);
      this.selectTrack(
        TASK014B_TRACK_ORDER[
          (current + 1) % TASK014B_TRACK_ORDER.length
        ],
      );
    } else if (action.kind === "rebuild-runtime") {
      this.rebuild();
    } else if (action.kind === "toggle-transform-stress") {
      this.transformStressEnabled = nextTransformStressState;
      this.applyTransformStress();
    } else if (action.kind === "toggle-debug") {
      if (action.debug === "joints") {
        this.debugJoints = !this.debugJoints;
        for (const joint of this.joints.values()) {
          joint.marker.active = this.debugJoints;
        }
      } else if (action.debug === "vfx") {
        this.debugVfx = !this.debugVfx;
        this.host?.setDebugVisible(this.debugVfx);
      } else if (action.debug === "skeleton") {
        this.debugSkeleton = !this.debugSkeleton;
      } else {
        this.debugLinks = !this.debugLinks;
      }
    } else {
      assertNeverSemanticVfxAction(action);
    }
  }

  private assertRuntime(): void {
    const projection = this.host?.maximumProjectionError ?? 0;
    if (
      projection >
      (this.config?.socketProjectionTolerancePx ?? 0.5)
    ) {
      throw new Error(
        `TASK_014B_SOCKET_PROJECTION_DRIFT: ${projection.toFixed(6)}`,
      );
    }
    if ((this.adapter?.snapshot().leakedInstanceCount ?? 0) !== 0) {
      throw new Error("TASK_014B_RENDERER_LEAK");
    }
  }

  private runtimeSnapshot(): object {
    return {
      track: this.activeTrackId,
      evaluator: this.evaluator?.snapshot ?? null,
      adapter: this.adapter?.snapshot() ?? null,
      resources: this.coordinator?.snapshot() ?? null,
      lifecycle: this.lifecycle.snapshot(),
      rebuildCount: this.rebuildCount,
      inputHandlers: this.inputRegistered ? 1 : 0,
      transformStress: {
        enabled: this.transformStressEnabled,
        rootCount:
          this.generatedRoot?.children.filter(
            (child) => child.name === TRANSFORM_STRESS_ROOT_NAME,
          ).length ?? 0,
        pose: task014bTransformStressPose(
          this.transformStressEnabled,
        ),
        actual: this.transformStressRoot === null
          ? null
          : {
              position: {
                x: this.transformStressRoot.position.x,
                y: this.transformStressRoot.position.y,
              },
              rotationDegrees:
                this.transformStressRoot.eulerAngles.z,
              scale: {
                x: this.transformStressRoot.scale.x,
                y: this.transformStressRoot.scale.y,
              },
            },
      },
      maximumSocketProjectionErrorPx:
        this.host?.maximumProjectionError ?? 0,
      maximumEffectPositionErrorPx:
        this.host?.maximumEffectPositionError ?? 0,
      maximumEffectRotationErrorDegrees:
        this.host?.maximumEffectRotationErrorDegrees ?? 0,
      maximumViewportOverflowPx:
        this.host?.maximumViewportOverflowPx ?? 0,
      rendererComponentConflictCount:
        this.host?.rendererComponentConflictCount ?? 0,
      rendererComponents:
        this.host?.rendererComponentSnapshot() ?? [],
      failure: this.runtimeFailure,
    };
  }

  private updateHud(): void {
    if (this.hud === null) return;
    const evaluation = this.evaluator?.snapshot;
    const adapter = this.adapter?.snapshot();
    const resources = this.coordinator?.snapshot();
    const lifecycle = this.lifecycle.snapshot();
    const rendererComponents = this.host?.rendererComponentSnapshot() ?? [];
    const stressPose = task014bTransformStressPose(
      this.transformStressEnabled,
    );
    const pass =
      lifecycle.phase === "ready" &&
      resources?.terminal === "passed" &&
      adapter?.leakedInstanceCount === 0 &&
      (this.host?.maximumViewportOverflowPx ?? 0) === 0 &&
      this.runtimeFailure.length === 0;
    this.hud.string = [
      `TASK-014B · Cocos Semantic VFX Adapter · ${pass ? "PASS" : "FAIL"}`,
      `TRACK ${this.activeTrackId} · CLIP ${evaluation?.clipId ?? "loading"} · ${(evaluation?.status ?? "loading").toUpperCase()} · ${(evaluation?.localTimeSeconds ?? 0).toFixed(2)}s`,
      `LAST ${adapter?.lastCommand ?? "none"} · emit/start/stop ${adapter?.emitCount ?? 0}/${adapter?.startCount ?? 0}/${adapter?.stopCount ?? 0}`,
      `ACTIVE ${adapter?.activeInstanceIds.join(",") || "none"} (${(adapter?.activeInstanceIds.length ?? 0) + (adapter?.activeOneShotCount ?? 0)}) · audio/gameplay ${adapter?.audioCount ?? 0}/${adapter?.gameplayCount ?? 0}`,
      `RESOURCES ${resources?.loaded ?? 0}/${resources?.expected ?? RESOURCE_MANIFEST.length} · projection ${(this.host?.maximumProjectionError ?? 0).toFixed(4)}px`,
      `VFX position/rotation error ${(this.host?.maximumEffectPositionError ?? 0).toFixed(4)}px/${(this.host?.maximumEffectRotationErrorDegrees ?? 0).toFixed(4)}deg · components ${rendererComponents.map(({ uiRendererCount, sorting2DCount }) => `${uiRendererCount}/${sorting2DCount}`).join(",") || "none"} · conflicts ${this.host?.rendererComponentConflictCount ?? 0}`,
      `VIEWPORT overflow ${(this.host?.maximumViewportOverflowPx ?? 0).toFixed(4)}px · finite ${this.runtimeFailure.includes("NON_FINITE") ? "FAIL" : "PASS"}`,
      `duplicate starts ${adapter?.duplicateStartCount ?? 0} · unknown stops ${adapter?.unknownStopCount ?? 0} · leaked ${adapter?.leakedInstanceCount ?? 0}`,
      `LIFECYCLE setup/teardown/rebuild ${lifecycle.setupCount}/${lifecycle.teardownCount}/${this.rebuildCount} · input ${this.inputRegistered ? 1 : 0}`,
      `STRESS ${this.transformStressEnabled ? "ON" : "OFF"} · root ${stressPose.position.x}/${stressPose.position.y} · rotation ${stressPose.rotationDegrees}deg · scale ${stressPose.scale.x}/${stressPose.scale.y}`,
      `DEBUG J:${this.debugJoints ? "ON" : "OFF"} V:${this.debugVfx ? "ON" : "OFF"} K:${this.debugSkeleton ? "ON" : "OFF"} Y:${this.debugLinks ? "ON" : "OFF"}`,
      ...formatSemanticVfxInputHelpLines(),
      this.runtimeFailure,
    ].join("\n");
  }

  private readonly onKeyDown = (event: EventKeyboard): void => {
    const action = BINDING_BY_KEY.get(event.keyCode);
    if (action === undefined) return;
    try {
      this.applyAction(action);
    } catch (error) {
      this.runtimeFailure =
        error instanceof Error ? error.message : String(error);
      console.error(this.runtimeFailure);
    }
    this.updateHud();
  };
}

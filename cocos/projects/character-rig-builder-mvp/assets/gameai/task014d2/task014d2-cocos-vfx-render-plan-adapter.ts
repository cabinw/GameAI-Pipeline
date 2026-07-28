import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  Graphics,
  input,
  Input,
  KeyCode,
  Label,
  Layers,
  Node,
  Quat,
  Sorting2D,
  UITransform,
  UIRenderer,
  Vec3,
} from "cc";

import {
  TASK014D2_INPUT_REGISTRY,
  TASK014D2_RESOURCE_REGISTRY,
  TASK014D2_SORTING,
  TASK014D2_SPATIAL,
  type Task014D2InputAction,
} from "./cocos-vfx-harness-contract";
import {
  compileCocosVfxRenderDescriptors,
  type CocosVfxCueDescriptor,
  type CocosVfxDescriptorPlan,
  type CocosVfxLayerDescriptor,
} from "./cocos-vfx-render-descriptor";
import {
  CocosVfxRuntimeState,
  type CocosVfxRuntimeHost,
} from "./cocos-vfx-runtime-state";
import type { VfxLayerSample } from "./d1/types";
import { TASK014D2_RENDER_PLAN } from "./render-plan-data";

const { ccclass } = _decorator;

interface RendererBinding {
  readonly node: Node;
  readonly graphics: Graphics;
  readonly descriptor: CocosVfxLayerDescriptor;
  readonly target: Node;
}

class CocosRenderPlanHost implements CocosVfxRuntimeHost {
  private readonly renderers = new Map<string, RendererBinding>();
  private readonly world = new Vec3();
  private readonly authoredLocal = new Vec3();
  private readonly overlayLocal = new Vec3();
  private readonly worldScale = new Vec3();
  private readonly targetRotation = new Quat();
  private readonly localRotation = new Quat();
  private readonly expectedRotation = new Quat();
  private readonly observedRotation = new Quat();
  private debug = false;
  maximumProjectionErrorPx = 0;
  maximumPositionErrorPx = 0;
  maximumRotationErrorDegrees = 0;
  maximumViewportOverflowPx = 0;

  constructor(
    private readonly overlay: Node,
    private readonly targets: readonly Node[],
    private readonly cueOrder: ReadonlyMap<string, number>,
  ) {}

  createLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (this.renderers.has(rendererId)) {
      throw new Error(`TASK_014D2_DUPLICATE_RENDERER: ${rendererId}`);
    }
    const cueIndex = this.cueOrder.get(descriptor.cueId);
    if (cueIndex === undefined) {
      throw new Error(`TASK_014D2_UNKNOWN_CUE_INDEX: ${descriptor.cueId}`);
    }
    const node = new Node(`VFX_${rendererId}`);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(this.overlay);
    node.addComponent(UITransform).setContentSize(240, 240);
    try {
      if (node.getComponent(UIRenderer) !== null) {
        throw new Error("Renderer node was not clean.");
      }
      const graphics = node.addComponent(Graphics);
      if (
        node.getComponent(UIRenderer) !== graphics ||
        node.getComponents(UIRenderer).length !== 1
      ) {
        throw new Error("Graphics must be the sole UIRenderer.");
      }
      const sorting = node.addComponent(Sorting2D);
      sorting.sortingLayer = 0;
      sorting.sortingOrder = descriptor.sortingOrder;
      if (
        node.getComponents(UIRenderer).length !== 1 ||
        node.getComponents(Sorting2D).length !== 1
      ) {
        throw new Error("Sorting2D must follow one Graphics component.");
      }
      this.renderers.set(rendererId, {
        node,
        graphics,
        descriptor,
        target: this.targets[cueIndex % this.targets.length] as Node,
      });
    } catch (error) {
      node.destroy();
      throw error;
    }
  }

  updateLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    commandElapsedSeconds: number,
  ): void {
    const binding = this.renderers.get(rendererId);
    if (binding === undefined) {
      throw new Error(`TASK_014D2_UNKNOWN_RENDERER: ${rendererId}`);
    }
    const targetTransform = binding.target.getComponent(UITransform);
    const overlayTransform = this.overlay.getComponent(UITransform);
    if (targetTransform === null || overlayTransform === null) {
      throw new Error("TASK_014D2_PROJECTION_TRANSFORM_MISSING");
    }
    this.authoredLocal.x = sample.position.x;
    this.authoredLocal.y = sample.position.y;
    this.authoredLocal.z = 0;
    targetTransform.convertToWorldSpaceAR(this.authoredLocal, this.world);
    overlayTransform.convertToNodeSpaceAR(this.world, this.overlayLocal);
    const requestedX = this.overlayLocal.x;
    const requestedY = this.overlayLocal.y;
    if (!Number.isFinite(requestedX) || !Number.isFinite(requestedY)) {
      throw new Error("TASK_014D2_NON_FINITE_PROJECTION");
    }
    binding.node.setPosition(requestedX, requestedY, 0);
    binding.target.getWorldRotation(this.targetRotation);
    Quat.fromEuler(
      this.localRotation,
      0,
      0,
      sample.rotationDegrees,
    );
    Quat.multiply(
      this.expectedRotation,
      this.targetRotation,
      this.localRotation,
    );
    Quat.normalize(this.expectedRotation, this.expectedRotation);
    binding.node.setWorldRotation(this.expectedRotation);
    binding.target.getWorldScale(this.worldScale);
    binding.node.setScale(
      this.worldScale.x * sample.scale.x,
      this.worldScale.y * sample.scale.y,
      1,
    );
    const positionError = Math.hypot(
      binding.node.position.x - requestedX,
      binding.node.position.y - requestedY,
    );
    this.maximumPositionErrorPx = Math.max(
      this.maximumPositionErrorPx,
      positionError,
    );
    overlayTransform.convertToWorldSpaceAR(binding.node.position, this.world);
    const roundTrip = targetTransform.convertToNodeSpaceAR(this.world);
    this.maximumProjectionErrorPx = Math.max(
      this.maximumProjectionErrorPx,
      Math.hypot(
        roundTrip.x - sample.position.x,
        roundTrip.y - sample.position.y,
      ),
    );
    binding.node.getWorldRotation(this.observedRotation);
    const dot = Math.min(
      1,
      Math.abs(
        this.observedRotation.x * this.expectedRotation.x +
          this.observedRotation.y * this.expectedRotation.y +
          this.observedRotation.z * this.expectedRotation.z +
          this.observedRotation.w * this.expectedRotation.w,
      ),
    );
    this.maximumRotationErrorDegrees = Math.max(
      this.maximumRotationErrorDegrees,
      (2 * Math.acos(dot) * 180) / Math.PI,
    );
    this.draw(
      binding.graphics,
      descriptor,
      sample,
      commandElapsedSeconds,
    );
    const radius = 120 * Math.max(sample.scale.x, sample.scale.y);
    const horizontal =
      Math.abs(requestedX) + radius -
      (TASK014D2_SPATIAL.designWidth / 2 -
        TASK014D2_SPATIAL.safeInset);
    const vertical =
      Math.abs(requestedY) + radius -
      (TASK014D2_SPATIAL.designHeight / 2 -
        TASK014D2_SPATIAL.safeInset);
    const overflow = Math.max(0, horizontal, vertical);
    this.maximumViewportOverflowPx = Math.max(
      this.maximumViewportOverflowPx,
      overflow,
    );
    if (overflow > 0) {
      throw new Error(
        `TASK_014D2_VIEWPORT_OVERFLOW: ${overflow.toFixed(4)}`,
      );
    }
  }

  destroyLayer(rendererId: string, _reason: string): void {
    const binding = this.renderers.get(rendererId);
    if (binding === undefined) return;
    binding.node.destroy();
    this.renderers.delete(rendererId);
  }

  activeRendererCount(): number {
    return this.renderers.size;
  }

  setDebug(value: boolean): void {
    this.debug = value;
  }

  componentCounts(): Readonly<{ graphics: number; sorting: number }> {
    return [...this.renderers.values()].reduce(
      (total, binding) => ({
        graphics:
          total.graphics +
          binding.node.getComponents(Graphics).length,
        sorting:
          total.sorting +
          binding.node.getComponents(Sorting2D).length,
      }),
      { graphics: 0, sorting: 0 },
    );
  }

  private draw(
    graphics: Graphics,
    descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    elapsedSeconds: number,
  ): void {
    graphics.clear();
    const color = descriptor.layer.color;
    const alpha = Math.max(
      0,
      Math.min(255, Math.round(sample.effectiveAlpha * 255)),
    );
    graphics.fillColor = new Color(
      Math.round(color.r * 255),
      Math.round(color.g * 255),
      Math.round(color.b * 255),
      alpha,
    );
    graphics.strokeColor = graphics.fillColor;
    switch (descriptor.primitive) {
      case "sprite-quad":
        graphics.rect(-54, -54, 108, 108);
        graphics.fill();
        break;
      case "ring":
        graphics.lineWidth = 8;
        graphics.circle(0, 0, 66);
        graphics.stroke();
        break;
      case "ribbon":
        graphics.lineWidth = 16;
        graphics.moveTo(-96, -24);
        graphics.bezierCurveTo(-62, 52, -24, -48, 42, 20);
        graphics.stroke();
        break;
      case "burst-particles":
        for (const particle of descriptor.layer.emission?.schedule ?? []) {
          if (particle.spawnTimeSeconds > elapsedSeconds) continue;
          const angle =
            ((particle.randomUint32 & 0xffff) / 0xffff) *
            Math.PI *
            2;
          const radius =
            20 + ((particle.randomUint32 >>> 16) / 0xffff) * 68;
          graphics.circle(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            7,
          );
        }
        graphics.fill();
        break;
      default:
        assertNeverPrimitive(descriptor.primitive);
    }
    if (this.debug) {
      graphics.strokeColor = new Color(34, 211, 238, 220);
      graphics.lineWidth = 2;
      graphics.rect(-120, -120, 240, 240);
      graphics.stroke();
    }
  }
}

function assertNeverPrimitive(value: never): never {
  throw new Error(`TASK_014D2_UNREACHABLE_PRIMITIVE: ${String(value)}`);
}

@ccclass("GameAITask014D2CocosVfxRenderPlanAdapter")
export class GameAITask014D2CocosVfxRenderPlanAdapter extends Component {
  private generation = 0;
  private runtimeRoot: Node | null = null;
  private stressRoot: Node | null = null;
  private overlay: Node | null = null;
  private hud: Label | null = null;
  private descriptorPlan: CocosVfxDescriptorPlan | null = null;
  private host: CocosRenderPlanHost | null = null;
  private runtime: CocosVfxRuntimeState | null = null;
  private inputRegistered = false;
  private ready = false;
  private playing = false;
  private stress = false;
  private debug = false;
  private elapsedSeconds = 0;
  private commandCounter = 0;
  private failure = "";
  private readonly onKeyDown = (event: EventKeyboard): void => {
    const key =
      event.keyCode === KeyCode.SPACE
        ? "Space"
        : event.keyCode === KeyCode.ESCAPE
          ? "Escape"
          : event.keyCode === KeyCode.DIGIT_1
            ? "1"
            : event.keyCode === KeyCode.DIGIT_2
              ? "2"
              : event.keyCode === KeyCode.DIGIT_3
                ? "3"
                : event.keyCode === KeyCode.DIGIT_4
                  ? "4"
                  : event.keyCode === KeyCode.KEY_X
                    ? "X"
                    : event.keyCode === KeyCode.KEY_B
                      ? "B"
                      : event.keyCode === KeyCode.KEY_D
                        ? "D"
                        : "";
    const binding = TASK014D2_INPUT_REGISTRY.find(
      (candidate) => candidate.key === key,
    );
    if (binding !== undefined) this.dispatch(binding.action);
  };

  onEnable(): void {
    this.beginSetup();
  }

  update(deltaSeconds: number): void {
    if (!this.ready || this.runtime === null) return;
    try {
      if (this.playing) {
        this.elapsedSeconds += deltaSeconds;
        this.runtime.tick(deltaSeconds);
      }
      this.assertRuntime();
    } catch (error) {
      this.failure = error instanceof Error ? error.message : String(error);
      console.error(this.failure);
    }
    this.updateHud();
  }

  onDisable(): void {
    this.teardown("disable");
  }

  onDestroy(): void {
    this.teardown("dispose");
  }

  private beginSetup(): void {
    const generation = ++this.generation;
    this.ready = false;
    this.failure = "";
    const compiled = compileCocosVfxRenderDescriptors(
      TASK014D2_RENDER_PLAN,
      TASK014D2_RESOURCE_REGISTRY,
    );
    if (!compiled.ok) {
      this.failure = `TASK_014D2_RESOURCE_RECIPE_GATE_FAILED: ${JSON.stringify(compiled.errors)}`;
      console.error(this.failure);
      return;
    }
    try {
      this.descriptorPlan = compiled.value;
      this.buildRuntime(compiled.value);
      if (generation !== this.generation) return;
      this.ready = true;
      this.exactReset();
      this.registerInput();
      console.info("TASK_014D2_RUNTIME_READY", this.snapshot());
    } catch (error) {
      this.failure = error instanceof Error ? error.message : String(error);
      this.teardown("partial-build");
      console.error(this.failure);
    }
  }

  private buildRuntime(plan: CocosVfxDescriptorPlan): void {
    if (
      this.runtimeRoot !== null ||
      this.node.children.some(
        (child) => child.name === "Task014D2RuntimeRoot",
      )
    ) {
      throw new Error("TASK_014D2_DUPLICATE_RUNTIME_ROOT");
    }
    const root = new Node("Task014D2RuntimeRoot");
    root.layer = Layers.Enum.UI_2D;
    root.setParent(this.node);
    root.addComponent(UITransform).setContentSize(1280, 720);
    this.runtimeRoot = root;

    const stressRoot = new Node("GenericStressRoot");
    stressRoot.layer = Layers.Enum.UI_2D;
    stressRoot.setParent(root);
    stressRoot.addComponent(UITransform).setContentSize(1280, 720);
    this.stressRoot = stressRoot;
    const targetA = this.target("GenericTargetA", stressRoot, -210, -40);
    const nested = this.target("GenericNestedParent", stressRoot, 150, 30);
    nested.setRotationFromEuler(0, 0, -12);
    nested.setScale(1.1, 0.85, 1);
    const targetB = this.target("GenericTargetB", nested, 70, 35);
    const targetC = this.target("GenericTargetC", stressRoot, 0, 120);

    const overlay = new Node("VfxOverlayRoot");
    overlay.layer = Layers.Enum.UI_2D;
    overlay.setParent(root);
    overlay.addComponent(UITransform).setContentSize(1280, 720);
    this.overlay = overlay;
    const cueOrder = new Map(
      plan.cues.map((cue, index) => [cue.cueId, index]),
    );
    this.host = new CocosRenderPlanHost(
      overlay,
      [targetA, targetB, targetC],
      cueOrder,
    );
    this.runtime = new CocosVfxRuntimeState(plan, this.host);

    const hudNode = new Node("Task014D2Hud");
    hudNode.layer = Layers.Enum.UI_2D;
    hudNode.setParent(root);
    hudNode.setPosition(-620, 340, 0);
    const hudTransform = hudNode.addComponent(UITransform);
    hudTransform.setContentSize(1240, 120);
    hudTransform.setAnchorPoint(0, 1);
    const hud = hudNode.addComponent(Label);
    hud.fontSize = 16;
    hud.lineHeight = 20;
    hud.color = new Color(226, 232, 240, 255);
    hudNode.addComponent(Sorting2D).sortingOrder =
      TASK014D2_SORTING.hud;
    this.hud = hud;
  }

  private target(
    name: string,
    parent: Node,
    x: number,
    y: number,
  ): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(24, 24);
    return node;
  }

  private registerInput(): void {
    if (this.inputRegistered) {
      throw new Error("TASK_014D2_DUPLICATE_INPUT_HANDLER");
    }
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = true;
  }

  private dispatch(action: Task014D2InputAction): void {
    if (!this.ready || this.runtime === null || this.descriptorPlan === null) {
      return;
    }
    if (action === "pause") {
      this.playing = !this.playing;
      this.runtime.setPaused(!this.playing);
    } else if (action === "stress") {
      this.stress = !this.stress;
      this.applyStress();
    } else if (action === "debug") {
      this.debug = !this.debug;
      this.host?.setDebug(this.debug);
    } else if (action === "rebuild") {
      this.rebuild();
      return;
    } else if (action === "reset") {
      this.exactReset();
    } else {
      const cue = this.resolveControlCue(action);
      this.playing = true;
      this.runtime.setPaused(false);
      if (cue.commandMode === "emit") {
        this.runtime.dispatch({
          command: "emit",
          cueId: cue.cueId,
          commandId: `command-${++this.commandCounter}`,
        });
      } else {
        const instanceId = `${cue.lifecycle}-instance`;
        this.runtime.dispatch({
          command: "start",
          cueId: cue.cueId,
          commandId: `command-${++this.commandCounter}`,
          instanceId,
        });
      }
    }
    this.updateHud();
  }

  private resolveControlCue(
    action: "one-shot" | "looping" | "persistent" | "combined",
  ): CocosVfxCueDescriptor {
    const cues = this.descriptorPlan?.cues ?? [];
    if (action === "looping") {
      return this.requireCue(
        cues.find((cue) => cue.lifecycle === "looping"),
      );
    }
    if (action === "persistent") {
      return this.requireCue(
        cues.find((cue) => cue.lifecycle === "persistent"),
      );
    }
    const oneShots = cues.filter((cue) => cue.lifecycle === "one-shot");
    return this.requireCue(
      action === "combined"
        ? [...oneShots].sort(
            (left, right) => right.layers.length - left.layers.length,
          )[0]
        : [...oneShots].sort(
            (left, right) => left.layers.length - right.layers.length,
          )[0],
    );
  }

  private requireCue(
    cue: CocosVfxCueDescriptor | undefined,
  ): CocosVfxCueDescriptor {
    if (cue === undefined) throw new Error("TASK_014D2_CONTROL_CUE_MISSING");
    return cue;
  }

  private applyStress(): void {
    if (this.stressRoot === null) return;
    if (this.stress) {
      this.stressRoot.setPosition(55, -25, 0);
      this.stressRoot.setRotationFromEuler(0, 0, 18);
      this.stressRoot.setScale(1.18, 0.82, 1);
    } else {
      this.stressRoot.setPosition(0, 0, 0);
      this.stressRoot.setRotationFromEuler(0, 0, 0);
      this.stressRoot.setScale(1, 1, 1);
    }
  }

  private exactReset(): void {
    this.runtime?.cleanup("reset");
    this.runtime?.setPaused(true);
    this.playing = false;
    this.elapsedSeconds = 0;
    this.stress = false;
    this.debug = false;
    this.applyStress();
    this.host?.setDebug(false);
    this.updateHud();
  }

  private rebuild(): void {
    this.runtime?.rebuild();
    this.unregisterInput();
    this.destroyRuntimeRoot();
    this.runtimeRoot = null;
    this.stressRoot = null;
    this.overlay = null;
    this.hud = null;
    this.host = null;
    this.runtime = null;
    this.beginSetup();
  }

  private teardown(reason: string): void {
    ++this.generation;
    this.ready = false;
    this.runtime?.cleanup(reason);
    this.unregisterInput();
    this.destroyRuntimeRoot();
    this.runtimeRoot = null;
    this.stressRoot = null;
    this.overlay = null;
    this.hud = null;
    this.host = null;
    this.runtime = null;
  }

  private destroyRuntimeRoot(): void {
    const root = this.runtimeRoot;
    if (root === null) return;
    root.removeFromParent();
    root.destroy();
  }

  private unregisterInput(): void {
    if (!this.inputRegistered) return;
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.inputRegistered = false;
  }

  private assertRuntime(): void {
    const snapshot = this.runtime?.snapshot();
    if (
      this.node.children.filter(
        (child) => child.name === "Task014D2RuntimeRoot",
      ).length !== 1 ||
      !this.inputRegistered ||
      snapshot === undefined ||
      snapshot.staleRendererCount !== 0
    ) {
      throw new Error("TASK_014D2_RUNTIME_INVARIANT_FAILED");
    }
    const components = this.host?.componentCounts();
    if (
      components !== undefined &&
      (components.graphics !== snapshot.activeRendererCount ||
        components.sorting !== snapshot.activeRendererCount)
    ) {
      throw new Error("TASK_014D2_RENDERER_COMPONENT_INVARIANT_FAILED");
    }
    if (
      (this.host?.maximumProjectionErrorPx ?? 0) >
        TASK014D2_SPATIAL.positionTolerancePx ||
      (this.host?.maximumPositionErrorPx ?? 0) >
        TASK014D2_SPATIAL.positionTolerancePx ||
      (this.host?.maximumRotationErrorDegrees ?? 0) >
        TASK014D2_SPATIAL.rotationToleranceDegrees ||
      (this.host?.maximumViewportOverflowPx ?? 0) > 0
    ) {
      throw new Error("TASK_014D2_SPATIAL_TOLERANCE_FAILED");
    }
  }

  private updateHud(): void {
    if (this.hud === null) return;
    const snapshot = this.runtime?.snapshot();
    this.hud.string = [
      "TASK-014D2 · Generic Cocos Render Plan Adapter",
      `Gate ${this.ready ? "PASS" : "WAIT"} · ${this.playing ? "PLAYING" : "STOPPED"} at ${this.elapsedSeconds.toFixed(2)}s · Stress ${this.stress ? "ON" : "OFF"} · Debug ${this.debug ? "ON" : "OFF"}`,
      `Instances ${snapshot?.activeCueKeys.length ?? 0} · Renderers ${snapshot?.activeRendererCount ?? 0} · Stale ${snapshot?.staleRendererCount ?? 0} · Root ${this.runtimeRoot === null ? 0 : 1} · Input ${this.inputRegistered ? 1 : 0} · ${this.failure || "No errors"}`,
      TASK014D2_INPUT_REGISTRY.slice(0, 4).map(
        (entry) => `${entry.key} ${entry.label}`,
      ).join("  ·  "),
      TASK014D2_INPUT_REGISTRY.slice(4).map(
        (entry) => `${entry.key} ${entry.label}`,
      ).join("  ·  "),
    ].join("\n");
  }

  private snapshot(): unknown {
    return {
      generation: this.generation,
      ready: this.ready,
      rootCount: this.runtimeRoot === null ? 0 : 1,
      inputCount: this.inputRegistered ? 1 : 0,
      runtime: this.runtime?.snapshot(),
    };
  }
}

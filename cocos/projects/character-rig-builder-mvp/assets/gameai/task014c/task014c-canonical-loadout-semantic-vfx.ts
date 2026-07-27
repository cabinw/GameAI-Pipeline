import {
  _decorator,
  EventKeyboard,
  KeyCode,
  Node,
  UITransform,
} from "cc";
import {
  createPrevalidatedCharacterSemanticEventEvaluator,
  type CharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
} from "@gameai/character-semantic-events/dist/runtime-esm/runtime.js";

import {
  GameAIComposableCharacterLoadoutReferenceV2,
} from "../composable-character-loadout-v2/composable-character-loadout-reference-v2";
import {
  CocosSemanticVfxHost,
} from "../task014b/task014b-semantic-vfx-reference";
import {
  SemanticVfxAdapter,
} from "../task014b/semantic-vfx-adapter";
import {
  TASK014C_ADAPTER_ID,
  TASK014C_INITIAL_TRACK_ID,
  TASK014C_SEMANTIC_EVENT_CONTEXT,
  TASK014C_SEMANTIC_EVENT_CONTRACT,
  Task014CTargetError,
  Task014CTargetErrorCode,
  requireTask014CTargetBinding,
  resolveTask014CTargetBindings,
  type Task014CLogicalTargetId,
  type Task014CTargetBinding,
} from "./canonical-semantic-vfx-contract";
import {
  TASK014C_INPUT_REGISTRY,
  formatTask014CInputHelpLines,
  validateTask014CInputRegistry,
  type Task014CInputBinding,
} from "./canonical-semantic-vfx-input-registry";
import { Task014CLifecycle } from "./canonical-semantic-vfx-lifecycle";

const { ccclass } = _decorator;
const INPUT_REGISTRY = validateTask014CInputRegistry();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode as keyof typeof KeyCode] as number,
    binding,
  ]),
);

@ccclass("GameAITask014CCanonicalLoadoutSemanticVfx")
export class GameAITask014CCanonicalLoadoutSemanticVfx
  extends GameAIComposableCharacterLoadoutReferenceV2 {
  private readonly task014cLifecycle = new Task014CLifecycle();
  private task014cGeneration = 0;
  private rebuildPending = false;
  private targetBindings:
    ReadonlyMap<Task014CLogicalTargetId, Task014CTargetBinding> =
      new Map();
  private semanticEvaluator: CharacterSemanticEventEvaluator | null = null;
  private semanticVfxHost: CocosSemanticVfxHost | null = null;
  private semanticVfxAdapter: SemanticVfxAdapter | null = null;
  private vfxDebugEnabled = false;
  private targetDebugEnabled = false;
  private staleTargetReferenceCount = 0;
  private duplicateRuntimeRootCount = 0;
  private viewportOverflowCount = 0;
  private nonFiniteCoordinateCount = 0;

  protected runtimeDisplayIdentity() {
    return Object.freeze({
      adapterId: TASK014C_ADAPTER_ID,
      hudTitle: "GAMEAI · CANONICAL LOADOUT SEMANTIC VFX",
      diagnosticsId: "TASK_014C",
    });
  }

  protected additionalSemanticClipIds(): readonly string[] {
    return Object.freeze([
      "production-lite-full-loadout-rest",
      "production-lite-full-loadout-walk",
      "production-lite-full-loadout-wave",
      "production-lite-full-loadout-prop-swing",
      "production-lite-full-loadout-integration-stress",
    ]);
  }

  protected beginRuntimeSetup(): void {
    this.task014cGeneration = this.task014cLifecycle.begin(
      this.rebuildPending,
    );
    this.rebuildPending = false;
    super.beginRuntimeSetup();
  }

  protected afterCanonicalRuntimeBuilt(): void {
    this.task014cLifecycle.advance(
      this.task014cGeneration,
      "resources-passed",
    );
    this.task014cLifecycle.advance(
      this.task014cGeneration,
      "loadout-built",
    );
    this.resolveSemanticTargets();
    this.task014cLifecycle.advance(
      this.task014cGeneration,
      "sockets-resolved",
    );
    const runtime = this.runtime;
    if (runtime === null) {
      throw new Error("TASK_014C_CANONICAL_RUNTIME_MISSING");
    }
    this.semanticVfxHost = new CocosSemanticVfxHost(
      runtime.overlayRoot,
      (logicalTargetId) => this.resolveSemanticTargetNode(logicalTargetId),
      "TASK_014C",
    );
    this.semanticVfxAdapter = new SemanticVfxAdapter(this.semanticVfxHost);
    this.semanticEvaluator =
      createPrevalidatedCharacterSemanticEventEvaluator(
        TASK014C_SEMANTIC_EVENT_CONTRACT,
        TASK014C_SEMANTIC_EVENT_CONTEXT,
        TASK014C_INITIAL_TRACK_ID,
      );
    this.task014cLifecycle.advance(
      this.task014cGeneration,
      "events-ready",
    );
  }

  protected afterCanonicalRuntimeReady(): void {
    this.task014cLifecycle.advance(
      this.task014cGeneration,
      "ready",
    );
    this.task014cLifecycle.registerInput(this.task014cGeneration);
  }

  protected afterCanonicalFrame(deltaSeconds: number): void {
    if (
      this.semanticEvaluator === null ||
      this.semanticVfxAdapter === null
    ) {
      return;
    }
    if (this.semanticEvaluator.snapshot.status === "playing") {
      this.dispatchSemanticCommands(
        this.semanticEvaluator.advance(deltaSeconds),
      );
    }
    this.semanticVfxAdapter.tick(deltaSeconds);
    this.validateRuntimeMeasurements();
  }

  protected afterCanonicalLoadoutApplied(): void {
    if (this.runtime === null) return;
    this.resolveSemanticTargets();
    this.semanticVfxAdapter?.tick(0);
  }

  protected afterCanonicalExactReset(): void {
    if (this.semanticEvaluator !== null) {
      this.dispatchSemanticCommands(this.semanticEvaluator.exactReset());
      this.dispatchSemanticCommands(
        this.semanticEvaluator.switchTrack(TASK014C_INITIAL_TRACK_ID),
      );
    }
    this.semanticVfxAdapter?.cleanup("exact-reset");
    this.vfxDebugEnabled = false;
    this.targetDebugEnabled = false;
    this.staleTargetReferenceCount = 0;
    this.targetBindings = this.runtime === null
      ? new Map()
      : resolveTask014CTargetBindings(
          this.canonicalPlan(),
          this.semanticState.snapshot().propStateId,
        );
    if (
      this.task014cLifecycle.snapshot().phase === "events-ready"
    ) {
      this.task014cLifecycle.advance(
        this.task014cGeneration,
        "reset-complete",
      );
    }
  }

  protected beforeCanonicalRuntimeTeardown(dispose: boolean): void {
    if (this.semanticEvaluator !== null) {
      this.dispatchSemanticCommands(this.semanticEvaluator.dispose());
    }
    this.semanticVfxAdapter?.cleanup("rebuild");
    this.semanticEvaluator = null;
    this.semanticVfxAdapter = null;
    this.semanticVfxHost = null;
    this.targetBindings = new Map();
    this.task014cLifecycle.teardown(dispose);
  }

  protected onKeyDown(event: EventKeyboard): void {
    if (!this.readiness.canDispatch(this.runtimeGeneration)) return;
    const binding = BINDING_BY_KEY.get(event.keyCode);
    if (binding === undefined) return;
    this.inputEventCount += 1;
    this.executeTask014CAction(binding);
  }

  protected updateHud(): void {
    super.updateHud();
    const runtime = this.runtime;
    if (runtime === null) return;
    const inherited = runtime.hudLabel.string.split("\n").slice(0, 12);
    const evaluator = this.semanticEvaluator?.snapshot;
    const adapter = this.semanticVfxAdapter?.snapshot();
    const host = this.semanticVfxHost;
    const components = host?.rendererComponentSnapshot() ?? [];
    const lifecycle = this.task014cLifecycle.snapshot();
    const activeTarget = this.targetBindings.get("active-hand-tool");
    const help = formatTask014CInputHelpLines();
    runtime.hudLabel.fontSize = 11;
    runtime.hudLabel.lineHeight = 13;
    runtime.hudLabel.node
      .getComponent(UITransform)
      ?.setContentSize(1240, 326);
    runtime.hudLabel.string = [
      "GAMEAI · CANONICAL LOADOUT SEMANTIC VFX",
      ...inherited.slice(1, 6),
      `SEMANTIC TRACK ${evaluator?.trackId ?? TASK014C_INITIAL_TRACK_ID} · ${evaluator?.status.toUpperCase() ?? "STOPPED"} ${(evaluator?.localTimeSeconds ?? 0).toFixed(2)}s · TARGET ${activeTarget?.sourceKind ?? "none"}:${activeTarget?.sourceId ?? "none"}`,
      `COMMANDS EMIT ${adapter?.emitCount ?? 0} · START ${adapter?.startCount ?? 0} · STOP ${adapter?.stopCount ?? 0} · LAST ${adapter?.lastCommand ?? "none"}`,
      `INSTANCES EVALUATOR ${evaluator?.activeInstanceIds.length ?? 0} · ADAPTER ${adapter?.activeInstanceIds.length ?? 0} · VISIBLE ${host?.activeRendererCount() ?? 0} · UI/SORT ${components.map((item) => `${item.uiRendererCount}/${item.sorting2DCount}`).join(",") || "0/0"}`,
      `ERROR px PROJECTION ${(host?.maximumProjectionError ?? 0).toFixed(4)} · EFFECT ${(host?.maximumEffectPositionError ?? 0).toFixed(4)} · ROT ${(host?.maximumEffectRotationErrorDegrees ?? 0).toFixed(4)}deg · VIEWPORT ${(host?.maximumViewportOverflowPx ?? 0).toFixed(4)}`,
      `VIOLATIONS DUP START ${adapter?.duplicateStartCount ?? 0} · UNKNOWN STOP ${adapter?.unknownStopCount ?? 0} · LEAKS ${adapter?.leakedInstanceCount ?? 0} · STALE ${this.staleTargetReferenceCount}`,
      `ROOTS ${this.duplicateRuntimeRootCount} · INPUT ${Math.max(0, lifecycle.activeInputHandlerCount - 1)} · VIEWPORT ${this.viewportOverflowCount} · NON-FINITE ${this.nonFiniteCoordinateCount} · VFX DEBUG ${this.vfxDebugEnabled ? "ON" : "OFF"} · TARGET DEBUG ${this.targetDebugEnabled ? "ON" : "OFF"}`,
      `TASK014C ${lifecycle.phase.toUpperCase()} · SETUP ${lifecycle.setupCount} · TEARDOWN ${lifecycle.teardownCount} · REBUILDS ${lifecycle.rebuildCount} · PASS`,
      `CLIPS ${help[0]}`,
      `RUNTIME ${help[1]}`,
      `LOADOUT ${help[2]}`,
      `DEBUG ${help[3]}`,
    ].join("\n");
  }

  private executeTask014CAction(binding: Task014CInputBinding): void {
    const action = binding.action;
    if (action.kind === "select-track") {
      this.switchSemanticTrack(action.trackId);
      this.selectClip(action.clipId, true);
      this.semanticEvaluator?.play();
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null || this.semanticEvaluator === null) {
        throw new Error("TASK_014C_PLAYBACK_NOT_READY");
      }
      if (this.playback.status === "playing") {
        this.applySample(this.playback.pause());
        this.semanticEvaluator.pause();
      } else {
        this.applySample(this.playback.play());
        this.semanticEvaluator.resume();
      }
      this.semanticState.setPlaybackStatus(this.playback.status);
    } else if (action.kind === "exact-reset") {
      this.exactReset();
    } else if (action.kind === "toggle-transform-stress") {
      this.semanticState.toggleStress();
    } else if (action.kind === "rebuild-runtime") {
      this.lifecycleRebuildCount += 1;
      this.rebuildPending = true;
      this.teardownRuntime(false);
      this.beginRuntimeSetup();
      return;
    } else if (action.kind === "toggle-garment") {
      this.semanticState.toggleGarment();
    } else if (action.kind === "toggle-accessories") {
      this.semanticState.toggleAccessories();
    } else if (action.kind === "select-prop-state") {
      this.semanticState.selectPropState(action.propStateId);
    } else if (action.kind === "toggle-vfx-debug") {
      this.vfxDebugEnabled = !this.vfxDebugEnabled;
      this.semanticVfxHost?.setDebugVisible(this.vfxDebugEnabled);
    } else if (action.kind === "toggle-target-debug") {
      this.targetDebugEnabled = !this.targetDebugEnabled;
      if (
        this.semanticState.snapshot().debugEnabled !==
        this.targetDebugEnabled
      ) {
        this.semanticState.toggleDebug();
      }
    } else {
      const exhaustive: never = action;
      throw new Error(`TASK_014C_UNKNOWN_ACTION: ${String(exhaustive)}`);
    }
    this.applyStressTransform();
    this.applyLoadoutState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private switchSemanticTrack(trackId: string): void {
    const evaluator = this.semanticEvaluator;
    if (evaluator === null) {
      throw new Error("TASK_014C_EVENTS_NOT_READY");
    }
    this.dispatchSemanticCommands(evaluator.switchTrack(trackId));
  }

  private dispatchSemanticCommands(
    commands: readonly EvaluatedSemanticEvent[],
  ): void {
    const adapter = this.semanticVfxAdapter;
    if (adapter === null && commands.length > 0) {
      throw new Error("TASK_014C_ADAPTER_NOT_READY");
    }
    for (const command of commands) adapter?.dispatch(command);
  }

  private resolveSemanticTargets(): void {
    this.targetBindings = resolveTask014CTargetBindings(
      this.canonicalPlan(),
      this.semanticState.snapshot().propStateId,
    );
    for (const logicalTargetId of [
      "left-foot",
      "right-foot",
      "body-center",
      "active-hand-tool",
    ] as const) {
      if (this.resolveSemanticTargetNode(logicalTargetId) === undefined) {
        this.staleTargetReferenceCount += 1;
        throw new Task014CTargetError(
          Task014CTargetErrorCode.TARGET_SOURCE_UNAVAILABLE,
          logicalTargetId,
        );
      }
    }
  }

  private resolveSemanticTargetNode(logicalTargetId: string): Node | undefined {
    const runtime = this.runtime;
    if (runtime === null) return undefined;
    const binding = requireTask014CTargetBinding(
      this.targetBindings,
      logicalTargetId,
    );
    if (binding.sourceKind === "joint") {
      return runtime.base.joints.get(binding.sourceId)?.node;
    }
    const prop = runtime.props.attachments.get(binding.sourceId);
    return prop?.attachmentNode.active ? prop.gripNode ?? undefined : undefined;
  }

  private validateRuntimeMeasurements(): void {
    const runtime = this.runtime;
    const host = this.semanticVfxHost;
    if (runtime === null || host === null) return;
    const generatedRoots = this.node.children.filter(
      (node) =>
        node.name === "TASK013R6Generated" ||
        node.name === "TASK013R6DebugOverlayRoot",
    );
    this.duplicateRuntimeRootCount = Math.max(
      0,
      generatedRoots.length - 2,
    );
    this.viewportOverflowCount =
      host.maximumViewportOverflowPx > 0 ? 1 : 0;
    const values = [
      host.maximumProjectionError,
      host.maximumEffectPositionError,
      host.maximumEffectRotationErrorDegrees,
      host.maximumViewportOverflowPx,
    ];
    this.nonFiniteCoordinateCount = values.filter(
      (value) => !Number.isFinite(value),
    ).length;
    if (
      this.duplicateRuntimeRootCount !== 0 ||
      this.viewportOverflowCount !== 0 ||
      this.nonFiniteCoordinateCount !== 0
    ) {
      throw new Error(
        `TASK_014C_RUNTIME_MEASUREMENT_FAILED: ${JSON.stringify({
          duplicateRuntimeRootCount: this.duplicateRuntimeRootCount,
          viewportOverflowCount: this.viewportOverflowCount,
          nonFiniteCoordinateCount: this.nonFiniteCoordinateCount,
        })}`,
      );
    }
  }
}

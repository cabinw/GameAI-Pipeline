import {
  _decorator,
  EventKeyboard,
  KeyCode,
  Node,
  Sprite,
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
  CocosRenderPlanHost,
  type CocosResourceRealization,
} from "../task014d2/task014d2-cocos-vfx-render-plan-adapter";
import {
  TASK014D2_RESOURCE_REGISTRY,
  TASK014D2_SORTING,
  task014d2SpatialErrorsWithinTolerance,
} from "../task014d2/cocos-vfx-harness-contract";
import {
  compileCocosVfxRenderDescriptors,
  type CocosVfxDescriptorPlan,
} from "../task014d2/cocos-vfx-render-descriptor";
import {
  CocosVfxRuntimeState,
} from "../task014d2/cocos-vfx-runtime-state";
import {
  TASK014C_INITIAL_TRACK_ID,
  Task014CTargetError,
  Task014CTargetErrorCode,
  requireTask014CTargetBinding,
  resolveTask014CTargetBindings,
  type Task014CLogicalTargetId,
  type Task014CTargetBinding,
} from "../task014c/canonical-semantic-vfx-contract";
import {
  TASK014D3_INPUT_REGISTRY,
  formatTask014D3InputHelpLines,
  validateTask014D3InputRegistry,
  type Task014D3InputBinding,
} from "./canonical-vfx-input-registry";
import {
  TASK014D3_ADAPTER_ID,
  TASK014D3_INITIAL_TRACK_ID,
  TASK014D3_SEMANTIC_EVENT_CONTEXT,
  TASK014D3_SEMANTIC_EVENT_CONTRACT,
} from "./canonical-vfx-semantic-contract";
import {
  CanonicalVfxRuntimeAdapter,
} from "./canonical-vfx-runtime-adapter";
import {
  Task014D3ComponentTransaction,
  runTask014D3VfxCleanupTransaction,
  type Task014D3CleanupSweep,
} from "./canonical-vfx-component-transaction";
import {
  TASK014D3_AUTHORING_SHA256,
  TASK014D3_RENDER_PLAN,
  TASK014D3_RENDER_PLAN_SHA256,
} from "./render-plan-data";

const { ccclass } = _decorator;
const INPUT_REGISTRY = validateTask014D3InputRegistry();
const BINDING_BY_KEY = new Map(
  INPUT_REGISTRY.map((binding) => [
    KeyCode[binding.cocosKeyCode as keyof typeof KeyCode] as number,
    binding,
  ]),
);

type Task014D3CleanupReason =
  | "exact-reset"
  | "track-switch"
  | "dispose"
  | "rebuild"
  | "target-invalidation";

interface Task014D3ComponentOwnership {
  evaluator: CharacterSemanticEventEvaluator | null;
  adapter: CanonicalVfxRuntimeAdapter | null;
  runtime: CocosVfxRuntimeState | null;
  host: CocosRenderPlanHost | null;
  generatedRoot: Node | null;
  overlayRoot: Node | null;
  generatedRootDetached: boolean;
  overlayRootDetached: boolean;
  generatedRootDestroyed: boolean;
  overlayRootDestroyed: boolean;
}

interface Task014D3TransactionCounts {
  readonly root: number;
  readonly input: number;
  readonly owner: number;
  readonly material: number;
  readonly node: number;
}

type Task014D3CreatorFaultTrigger =
  | "setup-failure"
  | "terminal-failure"
  | "target-invalidation"
  | "exact-reset"
  | "rebuild"
  | "disable"
  | "destroy";

interface Task014D3CreatorFaultCase {
  readonly trigger: Task014D3CreatorFaultTrigger;
  readonly stepId: string;
}

@ccclass("GameAITask014D3CanonicalLoadoutVfxAuthoringIntegration")
export class GameAITask014D3CanonicalLoadoutVfxAuthoringIntegration
  extends GameAIComposableCharacterLoadoutReferenceV2 {
  private targetBindings:
    ReadonlyMap<Task014CLogicalTargetId, Task014CTargetBinding> = new Map();
  private semanticEvaluator: CharacterSemanticEventEvaluator | null = null;
  private descriptorPlan: CocosVfxDescriptorPlan | null = null;
  private vfxHost: CocosRenderPlanHost | null = null;
  private vfxRuntime: CocosVfxRuntimeState | null = null;
  private vfxAdapter: CanonicalVfxRuntimeAdapter | null = null;
  private vfxDebugEnabled = false;
  private targetDebugEnabled = false;
  private activeSemanticTarget = "none";
  private previousEvaluatorCycles = 0;
  private setupCount = 0;
  private teardownCount = 0;
  private rebuildCount = 0;
  private staleTargetCount = 0;
  private targetRebindCount = 0;
  private terminalError = "";
  private primaryError: unknown | null = null;
  private terminal = false;
  private componentTransaction: Task014D3ComponentTransaction | null = null;
  private componentOwnership: Task014D3ComponentOwnership | null = null;
  private componentCleanupReason: Task014D3CleanupReason = "rebuild";
  private readonly retainedCleanupErrors: string[] = [];
  private lastCleanupSweep: Task014D3CleanupSweep | null = null;
  private faultScopedSweep: Task014D3CleanupSweep | null = null;
  private faultCaseExecuted = false;
  private faultCaseActive = false;
  private faultRetryPending = false;
  private faultTargetRebindPrimary = false;
  private readonly injectedFaultAttempts = new Set<string>();
  private faultFailureCounts: Task014D3TransactionCounts | null = null;
  private faultCloseoutRecord: Readonly<Record<string, unknown>> | null = null;
  private lastAction = "Initial Reset";

  protected runtimeDisplayIdentity() {
    return Object.freeze({
      adapterId: TASK014D3_ADAPTER_ID,
      hudTitle: "GAMEAI · CANONICAL LOADOUT · DATA-DRIVEN VFX",
      diagnosticsId: "TASK_014D3",
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
    if (
      this.componentTransaction !== null &&
      !this.componentTransaction.complete
    ) {
      const compensation = this.componentTransaction.cleanup();
      this.recordCleanupSweep(compensation);
      if (!compensation.complete) {
        this.terminal = true;
        this.terminalError =
          this.formatTerminalError("TASK_014D3_PREVIOUS_CLEANUP_INCOMPLETE");
        return;
      }
    }
    this.primaryError = null;
    this.terminal = false;
    this.terminalError = "";
    this.retainedCleanupErrors.length = 0;
    this.componentCleanupReason = "rebuild";
    this.componentOwnership = this.createEmptyOwnership();
    this.componentTransaction = this.createComponentTransaction(
      this.componentOwnership,
    );
    super.beginRuntimeSetup();
  }

  update(deltaSeconds: number): void {
    if (this.terminal) return;
    try {
      super.update(deltaSeconds);
    } catch (error) {
      this.enterTerminalFailure(error, "rebuild");
    }
  }

  protected handleCanonicalRuntimeSetupFailure(error: unknown): boolean {
    this.enterTerminalFailure(error, "rebuild");
    if (this.requestedFaultCase()?.trigger === "setup-failure") {
      this.scheduleFaultRetry();
    }
    return true;
  }

  protected afterCanonicalRuntimeBuilt(): void {
    const runtime = this.runtime;
    if (runtime === null) throw new Error("TASK_014D3_CANONICAL_RUNTIME_MISSING");
    this.captureParentOwnership();
    try {
      const compiled = compileCocosVfxRenderDescriptors(
        TASK014D3_RENDER_PLAN,
        TASK014D2_RESOURCE_REGISTRY,
      );
      if (!compiled.ok) {
        throw new Error(
          `TASK_014D3_DESCRIPTOR_COMPILE_FAILED:${JSON.stringify(compiled.errors)}`,
        );
      }
      this.descriptorPlan = compiled.value;
      this.resolveSemanticTargets(false);
      const spriteFrame = runtime.base.joints.get("head")
        ?.visual.getComponent(Sprite)?.spriteFrame;
      if (spriteFrame === null || spriteFrame === undefined) {
        throw new Error("TASK_014D3_SHARED_TEXTURE_RESOURCE_MISSING");
      }
      const resources = new Map<string, CocosResourceRealization>(
        TASK014D2_RESOURCE_REGISTRY.map((resource) => [
          resource.resourceId,
          {
            resourceId: resource.resourceId,
            recipeKind: resource.recipeKind,
            spriteFrame:
              resource.recipeKind === "textured-sprite" ? spriteFrame : null,
          },
        ]),
      );
      const cueOrder = new Map(
        compiled.value.cues.map((cue, index) => [cue.cueId, index]),
      );
      ensureProjectionTransform(runtime.overlayRoot);
      this.vfxHost = new CocosRenderPlanHost(
        runtime.overlayRoot,
        (targetId) => this.resolveSemanticTargetNode(targetId),
        cueOrder,
        resources,
        () => {},
      );
      if (this.componentOwnership !== null) {
        this.componentOwnership.host = this.vfxHost;
      }
      this.vfxHost.verifyMaterialBlendGate(spriteFrame);
      this.vfxRuntime = new CocosVfxRuntimeState(
        compiled.value,
        this.vfxHost,
      );
      if (this.componentOwnership !== null) {
        this.componentOwnership.runtime = this.vfxRuntime;
      }
      this.vfxAdapter = new CanonicalVfxRuntimeAdapter(this.vfxRuntime);
      if (this.componentOwnership !== null) {
        this.componentOwnership.adapter = this.vfxAdapter;
      }
      this.semanticEvaluator =
        createPrevalidatedCharacterSemanticEventEvaluator(
          TASK014D3_SEMANTIC_EVENT_CONTRACT,
          TASK014D3_SEMANTIC_EVENT_CONTEXT,
          TASK014D3_INITIAL_TRACK_ID,
        );
      if (this.componentOwnership !== null) {
        this.componentOwnership.evaluator = this.semanticEvaluator;
      }
      this.previousEvaluatorCycles = 0;
      this.setupCount += 1;
      if (
        this.requestedFaultCase()?.trigger === "setup-failure" &&
        !this.faultCaseExecuted
      ) {
        this.faultCaseExecuted = true;
        this.faultCaseActive = true;
        throw new Error("TASK_014D3_CREATOR_SETUP_FAILURE");
      }
    } catch (error) {
      throw error;
    }
  }

  protected afterCanonicalRuntimeReady(): void {
    const faultCase = this.requestedFaultCase();
    if (faultCase === null) return;
    if (this.faultRetryPending) {
      this.faultRetryPending = false;
      this.publishCreatorFaultResult("READY");
      return;
    }
    if (!this.faultCaseExecuted) {
      this.faultCaseExecuted = true;
      void Promise.resolve().then(() => this.runCreatorFaultCase(faultCase));
    }
  }

  protected afterCanonicalFrame(deltaSeconds: number): void {
    const evaluator = this.semanticEvaluator;
    const adapter = this.vfxAdapter;
    if (evaluator === null || adapter === null) return;
    if (evaluator.snapshot.status === "playing") {
      this.dispatchSemanticCommands(evaluator.advance(deltaSeconds));
    }
    const cycles = evaluator.snapshot.completedCycles;
    if (
      evaluator.snapshot.trackId === "canonical-aura-events" &&
      cycles > this.previousEvaluatorCycles
    ) {
      for (
        let cycle = this.previousEvaluatorCycles;
        cycle < cycles;
        cycle += 1
      ) {
        adapter.repeatPersistentAttempt();
      }
    }
    this.previousEvaluatorCycles = cycles;
    adapter.tick(deltaSeconds);
    this.validateRuntimeMeasurements();
  }

  protected afterCanonicalLoadoutApplied(): void {
    if (this.runtime === null) return;
    const next = resolveTask014CTargetBindings(
      this.canonicalPlan(),
      this.semanticState.snapshot().propStateId,
    );
    if (this.targetBindings.size === 0) {
      this.assertSemanticTargetNodes(next);
      this.targetBindings = next;
      return;
    }
    if (targetSignature(next) !== targetSignature(this.targetBindings)) {
      let primaryError: unknown = null;
      try {
        if (this.faultTargetRebindPrimary) {
          this.faultTargetRebindPrimary = false;
          throw new Error("TASK_014D3_CREATOR_TARGET_REBIND_FAILURE");
        }
        this.assertSemanticTargetNodes(next);
      } catch (error) {
        primaryError = error;
      }
      const evaluator = this.semanticEvaluator;
      const sweep = this.cleanupActiveVfx(
        "target-invalidation",
        primaryError,
        () => {
          if (evaluator !== null) {
            this.dispatchSemanticCommands(
              evaluator.switchTrack(evaluator.snapshot.trackId),
            );
          }
        },
      );
      this.requireCleanupSuccess(sweep, primaryError);
      this.targetRebindCount += 1;
      this.activeSemanticTarget = "none";
      this.previousEvaluatorCycles = 0;
    }
    this.targetBindings = next;
    this.assertSemanticTargetNodes(this.targetBindings);
  }

  protected afterCanonicalExactReset(): void {
    const evaluator = this.semanticEvaluator;
    const sweep = this.cleanupActiveVfx("exact-reset", null, () => {
      if (evaluator !== null) {
        this.dispatchSemanticCommands(evaluator.exactReset());
        this.dispatchSemanticCommands(
          evaluator.switchTrack(TASK014D3_INITIAL_TRACK_ID),
        );
      }
    });
    this.requireCleanupSuccess(sweep);
    this.vfxAdapter?.setPaused(false);
    this.vfxDebugEnabled = false;
    this.targetDebugEnabled = false;
    this.vfxHost?.setDebug(false);
    this.activeSemanticTarget = "none";
    this.previousEvaluatorCycles = 0;
    this.staleTargetCount = 0;
    this.lastAction = "Exact Reset";
    this.resolveSemanticTargets(false);
  }

  protected teardownRuntime(dispose: boolean): void {
    this.componentCleanupReason = dispose ? "dispose" : "rebuild";
    this.captureParentOwnership();
    const transaction = this.requireComponentTransaction();
    const sweep = transaction.cleanup();
    this.recordCleanupSweep(sweep);
    if (!sweep.complete) {
      this.terminal = true;
      this.terminalError =
        this.formatTerminalError("TASK_014D3_COMPONENT_CLEANUP_INCOMPLETE");
    }
  }

  protected onKeyDown(event: EventKeyboard): void {
    if (!this.readiness.canDispatch(this.runtimeGeneration)) return;
    const binding = BINDING_BY_KEY.get(event.keyCode);
    if (binding === undefined) return;
    this.inputEventCount += 1;
    try {
      this.executeTask014D3Action(binding);
    } catch (error) {
      this.enterTerminalFailure(error, "rebuild");
    }
  }

  protected updateHud(): void {
    super.updateHud();
    const runtime = this.runtime;
    if (runtime === null) return;
    const inherited = runtime.hudLabel.string.split("\n");
    const evaluator = this.semanticEvaluator?.snapshot;
    const adapter = this.vfxAdapter?.snapshot();
    const vfx = this.vfxRuntime?.snapshot();
    const hostCleanup = this.vfxHost?.cleanupDiagnostics();
    const ownership = this.vfxHost?.rendererOwnership() ?? [];
    const help = formatTask014D3InputHelpLines();
    const state = this.semanticState.snapshot();
    const runtimeRootCount =
      this.node.children.includes(runtime.generatedRoot) ? 1 : 0;
    runtime.hudLabel.fontSize = 10;
    runtime.hudLabel.lineHeight = 12;
    runtime.hudLabel.node.getComponent(UITransform)
      ?.setContentSize(1240, 336);
    runtime.hudLabel.string = [
      "GAMEAI · CANONICAL FULL-LOADOUT · D1 AUTHORING → D2 SHARED RUNTIME",
      ...inherited.slice(1, 5),
      `SEMANTIC ${evaluator?.trackId ?? TASK014C_INITIAL_TRACK_ID} · ${(evaluator?.status ?? "stopped").toUpperCase()} ${(evaluator?.localTimeSeconds ?? 0).toFixed(2)}s · TARGET ${this.activeSemanticTarget}`,
      `VFX ATTEMPTS ${adapter?.persistentStartAttempts ?? 0} · ACCEPTED ${adapter?.acceptedPersistentStarts ?? 0} · COALESCED ${adapter?.coalescedPersistentStarts ?? 0} · LAST ${adapter?.lastCommand ?? "none"}`,
      `INSTANCES EVALUATOR ${evaluator?.activeInstanceIds.length ?? 0} · ADAPTER ${vfx?.activeCueKeys.length ?? 0} · VISIBLE ${vfx?.activeCueKeys.length ?? 0} · LAYERS ${vfx?.activeRendererCount ?? 0} · PENDING ${vfx?.pendingRendererCount ?? 0} · REMOVED ${vfx?.removedRendererCount ?? 0}`,
      `OWNERS missing ${vfx?.missingRendererIds.length ?? 0} · extra ${vfx?.extraRendererIds.length ?? 0} · mismatch ${vfx?.mismatchedRendererIds.length ?? 0} · stale ${vfx?.staleRendererCount ?? 0} · total ${ownership.length}`,
      `ROOT ${runtimeRootCount} · INPUT ${this.inputRegistered ? 1 : 0} · SETUP ${this.setupCount} · TEARDOWN ${this.teardownCount} · REBUILDS ${this.rebuildCount} · REBINDS ${this.targetRebindCount}`,
      `SPATIAL position ${(Math.max(this.vfxHost?.maximumProjectionErrorPx ?? 0, this.vfxHost?.maximumPositionErrorPx ?? 0)).toFixed(3)}px · rotation ${(this.vfxHost?.maximumRotationErrorDegrees ?? 0).toFixed(3)}deg · AABB ${(this.vfxHost?.maximumViewportOverflowPx ?? 0).toFixed(3)}px`,
      `CLEANUP ${[...this.retainedCleanupErrors, ...(hostCleanup?.cleanupErrors ?? [])].join(" | ") || "none"} · pending ${this.componentTransaction?.report().pendingStepIds.join(" | ") || hostCleanup?.pendingStepIds.join(" | ") || "none"} · stale-target ${this.staleTargetCount}`,
      `RESOURCES ${TASK014D2_RESOURCE_REGISTRY.length}/6 PASS · PLAN ${this.descriptorPlan?.cues.length ?? 0}/4 PASS · AUTHOR ${TASK014D3_AUTHORING_SHA256.slice(0, 8)} · PLAN ${TASK014D3_RENDER_PLAN_SHA256.slice(0, 8)}`,
      `STATE ${state.garmentStateId} · PROP ${state.propStateId} · Stress ${state.stressEnabled ? "ON" : "OFF"} · Debug VFX ${this.vfxDebugEnabled ? "ON" : "OFF"} / Target ${this.targetDebugEnabled ? "ON" : "OFF"}`,
      this.terminalError || "DIAGNOSTICS PASS · no primary or cleanup error",
      `CLIPS ${help[0]}`,
      `RUNTIME ${help[1]}`,
      `LOADOUT ${help[2]}`,
      `DEBUG ${help[3]} · sorting VFX ${TASK014D2_SORTING.vfxMinimum}-${TASK014D2_SORTING.vfxMaximum} / Debug ${TASK014D2_SORTING.debug} / HUD ${TASK014D2_SORTING.hud}`,
    ].join("\n");
  }

  private executeTask014D3Action(binding: Task014D3InputBinding): void {
    const action = binding.action;
    this.lastAction = binding.actionId;
    if (action.kind === "select-track") {
      this.switchSemanticTrack(action.trackId);
      this.selectClip(action.clipId, true);
      this.semanticEvaluator?.play();
      this.vfxAdapter?.setPaused(false);
    } else if (action.kind === "toggle-playback") {
      if (this.playback === null || this.semanticEvaluator === null) {
        throw new Error("TASK_014D3_PLAYBACK_NOT_READY");
      }
      if (this.playback.status === "playing") {
        this.applySample(this.playback.pause());
        this.semanticEvaluator.pause();
        this.vfxAdapter?.setPaused(true);
      } else {
        this.applySample(this.playback.play());
        this.semanticEvaluator.resume();
        this.vfxAdapter?.setPaused(false);
      }
      this.semanticState.setPlaybackStatus(this.playback.status);
    } else if (action.kind === "exact-reset") {
      this.exactReset();
    } else if (action.kind === "toggle-transform-stress") {
      this.semanticState.toggleStress();
    } else if (action.kind === "rebuild-runtime") {
      this.lifecycleRebuildCount += 1;
      this.rebuildCount += 1;
      this.teardownRuntime(false);
      if (this.componentTransaction?.complete) this.beginRuntimeSetup();
      return;
    } else if (action.kind === "toggle-garment") {
      this.semanticState.toggleGarment();
    } else if (action.kind === "toggle-accessories") {
      this.semanticState.toggleAccessories();
    } else if (action.kind === "select-prop-state") {
      this.semanticState.selectPropState(action.propStateId);
    } else if (action.kind === "toggle-vfx-debug") {
      this.vfxDebugEnabled = !this.vfxDebugEnabled;
      this.vfxHost?.setDebug(this.vfxDebugEnabled);
    } else if (action.kind === "toggle-target-debug") {
      this.targetDebugEnabled = !this.targetDebugEnabled;
      if (this.semanticState.snapshot().debugEnabled !==
          this.targetDebugEnabled) {
        this.semanticState.toggleDebug();
      }
    } else {
      const exhaustive: never = action;
      throw new Error(`TASK_014D3_UNKNOWN_ACTION:${String(exhaustive)}`);
    }
    this.applyStressTransform();
    this.applyLoadoutState();
    this.updateSpatialAndDebug();
    this.updateHud();
  }

  private switchSemanticTrack(trackId: string): void {
    const evaluator = this.semanticEvaluator;
    if (evaluator === null) throw new Error("TASK_014D3_EVENTS_NOT_READY");
    const sweep = this.cleanupActiveVfx("track-switch", null, () => {
      this.dispatchSemanticCommands(evaluator.switchTrack(trackId));
    });
    this.requireCleanupSuccess(sweep);
    this.previousEvaluatorCycles = 0;
    this.activeSemanticTarget = "none";
  }

  private dispatchSemanticCommands(
    commands: readonly EvaluatedSemanticEvent[],
  ): void {
    const adapter = this.vfxAdapter;
    if (adapter === null && commands.length > 0) {
      throw new Error("TASK_014D3_ADAPTER_NOT_READY");
    }
    for (const command of commands) {
      if (command.command !== "stop") {
        this.activeSemanticTarget = command.socketId ?? "none";
      } else if (commands.length === 1) {
        this.activeSemanticTarget = "none";
      }
      adapter?.dispatch(command);
    }
  }

  private resolveSemanticTargets(cleanupChanged: boolean): void {
    const next = resolveTask014CTargetBindings(
      this.canonicalPlan(),
      this.semanticState.snapshot().propStateId,
    );
    if (
      cleanupChanged &&
      this.targetBindings.size > 0 &&
      targetSignature(next) !== targetSignature(this.targetBindings)
    ) {
      const evaluator = this.semanticEvaluator;
      const sweep = this.cleanupActiveVfx(
        "target-invalidation",
        null,
        () => {
          if (evaluator !== null) {
            this.dispatchSemanticCommands(
              evaluator.switchTrack(evaluator.snapshot.trackId),
            );
          }
        },
      );
      this.requireCleanupSuccess(sweep);
      this.targetRebindCount += 1;
    }
    this.assertSemanticTargetNodes(next);
    this.targetBindings = next;
  }

  private assertSemanticTargetNodes(
    bindings = this.targetBindings,
  ): void {
    for (const targetId of [
      "left-foot",
      "right-foot",
      "body-center",
      "active-hand-tool",
    ] as const) {
      if (this.resolveSemanticTargetNode(targetId, bindings) === undefined) {
        this.staleTargetCount += 1;
        throw new Task014CTargetError(
          Task014CTargetErrorCode.TARGET_SOURCE_UNAVAILABLE,
          targetId,
        );
      }
    }
  }

  private resolveSemanticTargetNode(
    targetId: string,
    bindings = this.targetBindings,
  ): Node | undefined {
    const runtime = this.runtime;
    if (runtime === null) return undefined;
    const binding = requireTask014CTargetBinding(
      bindings,
      targetId,
    );
    if (binding.sourceKind === "joint") {
      const node = runtime.base.joints.get(binding.sourceId)?.node;
      return node === undefined ? undefined : ensureProjectionTransform(node);
    }
    const prop = runtime.props.attachments.get(binding.sourceId);
    const node =
      prop?.attachmentNode.active ? prop.gripNode ?? undefined : undefined;
    return node === undefined ? undefined : ensureProjectionTransform(node);
  }

  private createEmptyOwnership(): Task014D3ComponentOwnership {
    return {
      evaluator: null,
      adapter: null,
      runtime: null,
      host: null,
      generatedRoot: null,
      overlayRoot: null,
      generatedRootDetached: false,
      overlayRootDetached: false,
      generatedRootDestroyed: false,
      overlayRootDestroyed: false,
    };
  }

  private captureParentOwnership(): void {
    const ownership = this.componentOwnership;
    const runtime = this.runtime;
    if (ownership === null || runtime === null) return;
    ownership.generatedRoot ??= runtime.generatedRoot;
    ownership.overlayRoot ??= runtime.overlayRoot;
  }

  private requireComponentTransaction(): Task014D3ComponentTransaction {
    if (this.componentOwnership === null) {
      this.componentOwnership = this.createEmptyOwnership();
      this.captureParentOwnership();
    }
    this.componentTransaction ??= this.createComponentTransaction(
      this.componentOwnership,
    );
    return this.componentTransaction;
  }

  private createComponentTransaction(
    ownership: Task014D3ComponentOwnership,
  ): Task014D3ComponentTransaction {
    return new Task014D3ComponentTransaction({
      semanticEvaluator: () => {
        this.injectCleanupFault("semantic-evaluator");
        const evaluator = ownership.evaluator;
        const adapter = ownership.adapter;
        if (evaluator === null) return;
        for (const command of evaluator.dispose()) adapter?.dispatch(command);
      },
      vfxRuntime: () => {
        this.injectCleanupFault("vfx-runtime");
        ownership.adapter?.cleanup(this.componentCleanupReason);
      },
      vfxHost: () => {
        this.injectCleanupFault("vfx-host");
        ownership.host?.destroyAll(this.componentCleanupReason);
      },
      inputHandler: () => {
        this.injectCleanupFault("input-handler");
        this.unregisterInput();
      },
      generatedRootDetach: () => {
        this.injectCleanupFault("generated-root-detach");
        ownership.generatedRoot?.removeFromParent();
        ownership.generatedRootDetached = true;
      },
      overlayRootDetach: () => {
        this.injectCleanupFault("overlay-root-detach");
        ownership.overlayRoot?.removeFromParent();
        ownership.overlayRootDetached = true;
      },
      generatedRootDestroy: () => {
        this.injectCleanupFault("generated-root-destroy");
        if (
          ownership.generatedRoot !== null &&
          !ownership.generatedRootDetached
        ) {
          throw new Error("TASK_014D3_GENERATED_ROOT_DESTROY_WAITING_FOR_DETACH");
        }
        ownership.generatedRoot?.destroy();
        ownership.generatedRootDestroyed = true;
      },
      overlayRootDestroy: () => {
        this.injectCleanupFault("overlay-root-destroy");
        if (
          ownership.overlayRoot !== null &&
          !ownership.overlayRootDetached
        ) {
          throw new Error("TASK_014D3_OVERLAY_ROOT_DESTROY_WAITING_FOR_DETACH");
        }
        ownership.overlayRoot?.destroy();
        ownership.overlayRootDestroyed = true;
      },
      referencesClear: () => {
        this.injectCleanupFault("references-clear");
        this.semanticEvaluator = null;
        this.vfxAdapter = null;
        this.vfxRuntime = null;
        this.vfxHost = null;
        this.descriptorPlan = null;
        this.targetBindings = new Map();
        this.activeSemanticTarget = "none";
        this.clearCanonicalRuntimeReferences();
      },
      parentLifecycle: () => {
        this.injectCleanupFault("parent-lifecycle");
        this.finalizeCanonicalRuntimeTeardown(
          this.componentCleanupReason === "dispose",
        );
        this.teardownCount += 1;
      },
    });
  }

  private cleanupActiveVfx(
    reason: Task014D3CleanupReason,
    primaryError: unknown,
    semanticStop: () => void,
  ): Task014D3CleanupSweep {
    const adapter = this.vfxAdapter;
    const host = this.vfxHost;
    const sweep = runTask014D3VfxCleanupTransaction(
      {
        semanticStop: () => {
          this.injectCleanupFault("semantic-stop");
          semanticStop();
        },
        runtimeCleanup: () => {
          this.injectCleanupFault("runtime-cleanup");
          adapter?.cleanup(reason);
        },
        hostCleanup: () => {
          this.injectCleanupFault("host-cleanup");
          host?.destroyAll(reason);
        },
      },
      primaryError,
    );
    if (this.faultCaseActive) this.faultScopedSweep = sweep;
    this.recordCleanupSweep(sweep);
    return sweep;
  }

  private requireCleanupSuccess(
    sweep: Task014D3CleanupSweep,
    primaryError: unknown = null,
  ): void {
    if (!sweep.primaryErrorIdentityPreserved) {
      throw new Error("TASK_014D3_PRIMARY_ERROR_IDENTITY_LOST");
    }
    if (primaryError !== null && primaryError !== undefined) {
      throw primaryError;
    }
    if (!sweep.complete) {
      throw new Error(
        `TASK_014D3_CLEANUP_INCOMPLETE:${
          sweep.final.pendingStepIds.join("|")
        }`,
      );
    }
  }

  private enterTerminalFailure(
    error: unknown,
    reason: Task014D3CleanupReason,
  ): void {
    if (this.terminal && this.componentTransaction?.complete) return;
    this.primaryError ??= error;
    this.terminal = true;
    this.componentCleanupReason = reason;
    this.captureParentOwnership();
    const sweep = this.requireComponentTransaction().cleanup(
      this.primaryError,
    );
    this.recordCleanupSweep(sweep);
    this.terminalError = this.formatTerminalError(
      error instanceof Error ? error.message : String(error),
    );
  }

  private recordCleanupSweep(sweep: Task014D3CleanupSweep): void {
    this.lastCleanupSweep = sweep;
    for (const entry of sweep.firstCleanupErrors) {
      const formatted = `${entry.stepId}:${entry.message}@${entry.attempt}`;
      if (!this.retainedCleanupErrors.includes(formatted)) {
        this.retainedCleanupErrors.push(formatted);
      }
    }
  }

  private formatTerminalError(fallback: string): string {
    const primary = this.primaryError === null
      ? fallback
      : this.primaryError instanceof Error
      ? this.primaryError.message
      : String(this.primaryError);
    return this.retainedCleanupErrors.length === 0
      ? primary
      : `${primary} · cleanup ${this.retainedCleanupErrors.join(" | ")}`;
  }

  private requestedFaultCase(): Task014D3CreatorFaultCase | null {
    const location = (globalThis as {
      readonly location?: { readonly search?: string };
    }).location;
    const parameters = new URLSearchParams(location?.search ?? "");
    const trigger = parameters.get("task014d3FaultTrigger");
    const stepId = parameters.get("task014d3CleanupFault");
    if (
      stepId === null ||
      ![
        "setup-failure",
        "terminal-failure",
        "target-invalidation",
        "exact-reset",
        "rebuild",
        "disable",
        "destroy",
      ].includes(trigger ?? "")
    ) {
      return null;
    }
    return {
      trigger: trigger as Task014D3CreatorFaultTrigger,
      stepId,
    };
  }

  private injectCleanupFault(stepId: string): void {
    const faultCase = this.requestedFaultCase();
    if (
      !this.faultCaseActive ||
      faultCase?.stepId !== stepId ||
      this.injectedFaultAttempts.has(stepId)
    ) {
      return;
    }
    this.injectedFaultAttempts.add(stepId);
    throw new Error(`TASK_014D3_CREATOR_CLEANUP_FAULT:${stepId}`);
  }

  private runCreatorFaultCase(faultCase: Task014D3CreatorFaultCase): void {
    this.faultCaseActive = true;
    this.faultScopedSweep = null;
    try {
      if (faultCase.trigger === "terminal-failure") {
        this.enterTerminalFailure(
          new Error("TASK_014D3_CREATOR_TERMINAL_FAILURE"),
          "rebuild",
        );
      } else if (faultCase.trigger === "target-invalidation") {
        this.faultTargetRebindPrimary = true;
        const nextPropState = this.semanticState.snapshot().propStateId ===
            "left-hand-prop"
          ? "no-prop"
          : "left-hand-prop";
        this.semanticState.selectPropState(nextPropState);
        this.applyLoadoutState();
      } else if (faultCase.trigger === "exact-reset") {
        this.exactReset();
      } else if (faultCase.trigger === "rebuild") {
        this.teardownRuntime(false);
      } else if (faultCase.trigger === "disable") {
        this.teardownRuntime(false);
      } else if (faultCase.trigger === "destroy") {
        this.teardownRuntime(true);
      }
    } catch (error) {
      this.enterTerminalFailure(error, "rebuild");
    } finally {
      this.faultFailureCounts = this.measureTransactionCounts();
      this.captureFaultCloseout();
      this.faultCaseActive = false;
    }
    if (faultCase.trigger === "exact-reset") {
      this.publishCreatorFaultResult("READY");
    } else if (faultCase.trigger === "destroy") {
      this.publishCreatorFaultResult("DISPOSED");
    } else {
      this.scheduleFaultRetry();
    }
  }

  private scheduleFaultRetry(): void {
    this.faultFailureCounts ??= this.measureTransactionCounts();
    this.captureFaultCloseout();
    if (!this.componentTransaction?.complete) {
      this.publishCreatorFaultResult("FAILED");
      return;
    }
    this.faultCaseActive = false;
    this.faultRetryPending = true;
    void Promise.resolve().then(() => this.beginRuntimeSetup());
  }

  private captureFaultCloseout(): void {
    const faultCase = this.requestedFaultCase();
    const sweep = this.faultScopedSweep ?? this.lastCleanupSweep;
    this.faultCloseoutRecord = Object.freeze({
      trigger: faultCase?.trigger ?? "none",
      injectedStep: faultCase?.stepId ?? "none",
      primaryError:
        sweep?.final.primaryErrorMessage ??
        (this.primaryError instanceof Error
          ? this.primaryError.message
          : this.primaryError === null ? null : String(this.primaryError)),
      primaryErrorIdentityPreserved:
        sweep?.primaryErrorIdentityPreserved ?? true,
      orderedCleanupErrors: Object.freeze([...this.retainedCleanupErrors]),
      firstPendingStepIds: Object.freeze([
        ...(sweep?.first.pendingStepIds ?? []),
      ]),
      attemptsByStepId: Object.freeze({
        ...(sweep?.final.attemptsByStepId ?? {}),
      }),
      compensationCounts: this.measureTransactionCounts(),
    });
  }

  private publishCreatorFaultResult(
    retryState: "READY" | "DISPOSED" | "FAILED",
  ): void {
    const result = Object.freeze({
      id: "task014d3-real-component-transaction-fault",
      ...(this.faultCloseoutRecord ?? {}),
      failureCounts: this.faultFailureCounts,
      retryState,
      finalCounts: this.measureTransactionCounts(),
    });
    (globalThis as {
      __TASK014D3_TRANSACTION_FAULT_RESULT__?: unknown;
    }).__TASK014D3_TRANSACTION_FAULT_RESULT__ = result;
    console.info(
      "TASK_014D3_TRANSACTION_FAULT_RESULT",
      JSON.stringify(result),
    );
  }

  private measureTransactionCounts(): Task014D3TransactionCounts {
    const ownership = this.componentOwnership;
    const hostOwnership = ownership?.host?.rendererOwnership().length ?? 0;
    const rootCount = ownership === null
      ? (this.runtime === null ? 0 : 1)
      : Number(
        ownership.generatedRoot !== null &&
        !ownership.generatedRootDestroyed,
      );
    return Object.freeze({
      root: rootCount,
      input: this.inputRegistered ? 1 : 0,
      owner: ownership?.runtime?.snapshot().activeRendererCount ?? 0,
      material: hostOwnership,
      node: hostOwnership,
    });
  }

  private validateRuntimeMeasurements(): void {
    const snapshot = this.vfxRuntime?.snapshot();
    const host = this.vfxHost;
    if (snapshot === undefined || host === null) return;
    const position = Math.max(
      host.maximumProjectionErrorPx,
      host.maximumPositionErrorPx,
    );
    if (
      !task014d2SpatialErrorsWithinTolerance(
        position,
        host.maximumRotationErrorDegrees,
        host.maximumViewportOverflowPx,
      ) ||
      snapshot.missingRendererIds.length !== 0 ||
      snapshot.extraRendererIds.length !== 0 ||
      snapshot.mismatchedRendererIds.length !== 0 ||
      snapshot.staleRendererCount !== 0 ||
      host.materialBlendMismatches !== 0 ||
      host.duplicateDestroys !== 0 ||
      host.visibilityMismatches !== 0 ||
      (host.cleanupDiagnostics().cleanupErrors.length !== 0)
    ) {
      throw new Error("TASK_014D3_RUNTIME_INVARIANT_FAILED");
    }
  }
}

function targetSignature(
  bindings: ReadonlyMap<Task014CLogicalTargetId, Task014CTargetBinding>,
): string {
  return [...bindings.entries()]
    .map(([id, binding]) =>
      `${id}:${binding.sourceKind}:${binding.sourceId}:${
        "propStateId" in binding ? binding.propStateId : ""
      }`)
    .sort()
    .join("|");
}

function ensureProjectionTransform(node: Node): Node {
  const transform = node.getComponent(UITransform) ??
    node.addComponent(UITransform);
  if (transform.contentSize.width === 0 || transform.contentSize.height === 0) {
    transform.setContentSize(1, 1);
  }
  return node;
}

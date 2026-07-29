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

  protected afterCanonicalRuntimeBuilt(): void {
    const runtime = this.runtime;
    if (runtime === null) throw new Error("TASK_014D3_CANONICAL_RUNTIME_MISSING");
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
      this.vfxHost.verifyMaterialBlendGate(spriteFrame);
      this.vfxRuntime = new CocosVfxRuntimeState(
        compiled.value,
        this.vfxHost,
      );
      this.vfxAdapter = new CanonicalVfxRuntimeAdapter(this.vfxRuntime);
      this.semanticEvaluator =
        createPrevalidatedCharacterSemanticEventEvaluator(
          TASK014D3_SEMANTIC_EVENT_CONTRACT,
          TASK014D3_SEMANTIC_EVENT_CONTEXT,
          TASK014D3_INITIAL_TRACK_ID,
        );
      this.previousEvaluatorCycles = 0;
      this.setupCount += 1;
    } catch (error) {
      this.terminalError =
        error instanceof Error ? error.message : String(error);
      this.cleanupVfx("rebuild");
      throw error;
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
    if (
      this.targetBindings.size > 0 &&
      targetSignature(next) !== targetSignature(this.targetBindings)
    ) {
      const evaluator = this.semanticEvaluator;
      if (evaluator !== null) {
        this.dispatchSemanticCommands(
          evaluator.switchTrack(evaluator.snapshot.trackId),
        );
      }
      this.vfxAdapter?.cleanup("target-invalidation");
      this.targetRebindCount += 1;
      this.activeSemanticTarget = "none";
      this.previousEvaluatorCycles = 0;
    }
    this.targetBindings = next;
    this.assertSemanticTargetNodes();
  }

  protected afterCanonicalExactReset(): void {
    if (this.semanticEvaluator !== null) {
      this.dispatchSemanticCommands(this.semanticEvaluator.exactReset());
      this.dispatchSemanticCommands(
        this.semanticEvaluator.switchTrack(TASK014D3_INITIAL_TRACK_ID),
      );
    }
    this.vfxAdapter?.cleanup("exact-reset");
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

  protected beforeCanonicalRuntimeTeardown(dispose: boolean): void {
    if (this.semanticEvaluator !== null) {
      this.dispatchSemanticCommands(this.semanticEvaluator.dispose());
    }
    this.cleanupVfx(dispose ? "dispose" : "rebuild");
    this.semanticEvaluator = null;
    this.vfxAdapter = null;
    this.vfxRuntime = null;
    this.vfxHost = null;
    this.descriptorPlan = null;
    this.targetBindings = new Map();
    this.activeSemanticTarget = "none";
    this.teardownCount += 1;
  }

  protected onKeyDown(event: EventKeyboard): void {
    if (!this.readiness.canDispatch(this.runtimeGeneration)) return;
    const binding = BINDING_BY_KEY.get(event.keyCode);
    if (binding === undefined) return;
    this.inputEventCount += 1;
    try {
      this.executeTask014D3Action(binding);
    } catch (error) {
      this.terminalError =
        error instanceof Error ? error.message : String(error);
      throw error;
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
      `CLEANUP ${hostCleanup?.cleanupErrors.join(" | ") || "none"} · pending ${hostCleanup?.pendingStepIds.join(" | ") || "none"} · stale-target ${this.staleTargetCount}`,
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
    this.dispatchSemanticCommands(evaluator.switchTrack(trackId));
    this.vfxAdapter?.cleanup("track-switch");
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
      if (evaluator !== null) {
        this.dispatchSemanticCommands(
          evaluator.switchTrack(evaluator.snapshot.trackId),
        );
      }
      this.vfxAdapter?.cleanup("target-invalidation");
      this.targetRebindCount += 1;
    }
    this.targetBindings = next;
    this.assertSemanticTargetNodes();
  }

  private assertSemanticTargetNodes(): void {
    for (const targetId of [
      "left-foot",
      "right-foot",
      "body-center",
      "active-hand-tool",
    ] as const) {
      if (this.resolveSemanticTargetNode(targetId) === undefined) {
        this.staleTargetCount += 1;
        throw new Task014CTargetError(
          Task014CTargetErrorCode.TARGET_SOURCE_UNAVAILABLE,
          targetId,
        );
      }
    }
  }

  private resolveSemanticTargetNode(targetId: string): Node | undefined {
    const runtime = this.runtime;
    if (runtime === null) return undefined;
    const binding = requireTask014CTargetBinding(
      this.targetBindings,
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

  private cleanupVfx(
    reason: "exact-reset" | "track-switch" | "dispose" | "rebuild" |
      "target-invalidation",
  ): void {
    let firstError: unknown = null;
    try {
      this.vfxAdapter?.cleanup(reason);
    } catch (error) {
      firstError = error;
    }
    try {
      this.vfxHost?.destroyAll(reason);
    } catch (error) {
      firstError ??= error;
    }
    if (firstError !== null) throw firstError;
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

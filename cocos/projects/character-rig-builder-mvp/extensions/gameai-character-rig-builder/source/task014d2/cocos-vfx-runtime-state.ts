import {
  compareCodeUnits,
  sampleVfxLayerAtTime,
  type VfxLayerSample,
} from "@gameai/vfx-authoring";

import {
  CocosVfxPlanErrorCode,
  CocosVfxRuntimeError,
} from "./cocos-vfx-diagnostics.js";
import type {
  CocosVfxCueDescriptor,
  CocosVfxDescriptorPlan,
  CocosVfxLayerDescriptor,
} from "./cocos-vfx-render-descriptor.js";

export type CocosVfxSemanticCommand =
  | {
      readonly command: "emit";
      readonly cueId: string;
      readonly commandId: string;
    }
  | {
      readonly command: "start";
      readonly cueId: string;
      readonly commandId: string;
      readonly instanceId: string;
    }
  | {
      readonly command: "stop";
      readonly instanceId: string;
      readonly reason: "semantic-stop" | "reset" | "switch" | "dispose";
    };

export interface CocosVfxRendererOwnership {
  readonly rendererId: string;
  readonly instanceId: string;
  readonly descriptorId: string;
  readonly visibility: CocosVfxLayerVisibility;
}

export type CocosVfxLayerVisibility = "pending" | "active" | "removed";

export interface CocosVfxRuntimeHost {
  createLayer(
    ownership: CocosVfxRendererOwnership,
    descriptor: CocosVfxLayerDescriptor,
  ): void;
  sampleLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    visibility: CocosVfxLayerVisibility,
    commandElapsedSeconds: number,
  ): void;
  destroyLayer(rendererId: string, reason: string): void;
  rendererOwnership(): readonly CocosVfxRendererOwnership[];
}

interface ActiveRenderer {
  ownership: CocosVfxRendererOwnership;
  readonly descriptor: CocosVfxLayerDescriptor;
  visibility: CocosVfxLayerVisibility;
}

interface ActiveCue {
  readonly key: string;
  readonly cue: CocosVfxCueDescriptor;
  readonly renderers: readonly ActiveRenderer[];
  elapsedSeconds: number;
}

export interface CocosVfxDispatchResult {
  readonly accepted: boolean;
  readonly coalesced: boolean;
  readonly instanceId: string | null;
}

export interface CocosVfxRuntimeSnapshot {
  readonly paused: boolean;
  readonly activeCueKeys: readonly string[];
  readonly activeRendererCount: number;
  readonly pendingRendererCount: number;
  readonly removedRendererCount: number;
  readonly missingRendererIds: readonly string[];
  readonly extraRendererIds: readonly string[];
  readonly mismatchedRendererIds: readonly string[];
  readonly staleRendererCount: number;
  readonly generation: number;
  readonly terminalError: string | null;
  readonly cleanupErrors: readonly string[];
}

function ownershipEqual(
  left: CocosVfxRendererOwnership,
  right: CocosVfxRendererOwnership,
): boolean {
  return left.rendererId === right.rendererId &&
    left.instanceId === right.instanceId &&
    left.descriptorId === right.descriptorId &&
    left.visibility === right.visibility;
}

function runtimeError(error: unknown): CocosVfxRuntimeError {
  return error instanceof CocosVfxRuntimeError
    ? error
    : new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.RUNTIME_BUILD_FAILURE,
        error instanceof Error ? error.message : "VFX runtime failed.",
      );
}

export class CocosVfxRuntimeState {
  private readonly cues: ReadonlyMap<string, CocosVfxCueDescriptor>;
  private readonly active = new Map<string, ActiveCue>();
  private paused = false;
  private generation = 1;
  private terminalError: CocosVfxRuntimeError | null = null;
  private readonly cleanupErrors = new Map<string, string>();

  public constructor(
    plan: CocosVfxDescriptorPlan,
    private readonly host: CocosVfxRuntimeHost,
  ) {
    this.cues = new Map(plan.cues.map((cue) => [cue.cueId, cue]));
  }

  public dispatch(
    command: CocosVfxSemanticCommand,
  ): CocosVfxDispatchResult {
    this.assertOperational();
    this.assertOwnershipOrTerminal();
    if (command.command === "stop") {
      const active = this.active.get(command.instanceId);
      if (active === undefined) {
        throw new CocosVfxRuntimeError(
          CocosVfxPlanErrorCode.UNKNOWN_INSTANCE,
          `Unknown Cocos VFX instance ${command.instanceId}.`,
        );
      }
      this.active.delete(command.instanceId);
      this.destroy(active, command.reason);
      this.assertOwnershipOrTerminal();
      return {
        accepted: true,
        coalesced: false,
        instanceId: command.instanceId,
      };
    }
    const cue = this.cues.get(command.cueId);
    if (cue === undefined) {
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.INVALID_COMMAND,
        `Unknown Render Plan cue ${command.cueId}.`,
      );
    }
    if (
      (command.command === "emit" && cue.commandMode !== "emit") ||
      (command.command === "start" && cue.commandMode !== "start-stop")
    ) {
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.INVALID_COMMAND,
        `Command ${command.command} contradicts cue ${cue.cueId}.`,
      );
    }
    const key =
      command.command === "emit" ? command.commandId : command.instanceId;
    if (this.active.has(key)) {
      if (cue.lifecycle === "persistent" && command.command === "start") {
        return { accepted: false, coalesced: true, instanceId: key };
      }
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.DUPLICATE_INSTANCE,
        `Duplicate Cocos VFX instance ${key}.`,
      );
    }

    const renderers = cue.layers.map((descriptor) => ({
      descriptor,
      ownership: {
        rendererId:
          `${this.generation}:${key}:${descriptor.descriptorId}`,
        instanceId: key,
        descriptorId: descriptor.descriptorId,
        visibility: "pending" as const,
      },
      visibility: "pending" as CocosVfxLayerVisibility,
    }));
    const candidate: ActiveCue = {
      key,
      cue,
      renderers,
      elapsedSeconds: 0,
    };
    let inserted = false;
    try {
      for (const renderer of renderers) {
        this.host.createLayer(renderer.ownership, renderer.descriptor);
      }
      this.update(candidate);
      this.active.set(key, candidate);
      inserted = true;
      this.assertOwnership();
    } catch (error) {
      if (inserted) this.active.delete(key);
      const failure = runtimeError(error);
      try {
        this.destroyRenderers(renderers, "partial-build");
        this.assertOwnership();
      } catch (cleanupError) {
        this.cleanupErrors.set(
          "partial-build",
          runtimeError(cleanupError).message,
        );
        this.enterTerminalFailure(failure);
      }
      if (
        failure.code === CocosVfxPlanErrorCode.RUNTIME_OWNERSHIP_MISMATCH
      ) {
        this.enterTerminalFailure(failure);
      }
      throw failure;
    }
    return { accepted: true, coalesced: false, instanceId: key };
  }

  public tick(deltaSeconds: number): void {
    this.assertOperational();
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      this.enterTerminalFailure(new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.INVALID_COMMAND,
        "VFX runtime delta must be finite and non-negative.",
      ));
    }
    if (this.paused) return;
    try {
      this.assertOwnership();
      for (const [key, active] of [...this.active]) {
        active.elapsedSeconds += deltaSeconds;
        if (!Number.isFinite(active.elapsedSeconds)) {
          throw new CocosVfxRuntimeError(
            CocosVfxPlanErrorCode.INVALID_COMMAND,
            "VFX runtime elapsed time overflowed.",
          );
        }
        const removed = this.update(active);
        if (removed) this.active.delete(key);
      }
      this.assertOwnership();
    } catch (error) {
      this.enterTerminalFailure(runtimeError(error));
    }
  }

  public setPaused(paused: boolean): void {
    this.assertOperational();
    this.paused = paused;
  }

  public rebuild(): void {
    this.cleanup("rebuild");
    this.generation += 1;
    this.paused = false;
    this.terminalError = null;
    this.cleanupErrors.clear();
  }

  public cleanup(reason: string): void {
    this.active.clear();
    const rendererIds = [...new Set(
      this.host.rendererOwnership().map((ownership) => ownership.rendererId),
    )].sort(compareCodeUnits);
    let firstError: unknown = null;
    for (const rendererId of rendererIds) {
      try {
        this.host.destroyLayer(rendererId, reason);
        this.cleanupErrors.delete(`renderer:${rendererId}`);
      } catch (error) {
        firstError ??= error;
        this.cleanupErrors.set(
          `renderer:${rendererId}`,
          runtimeError(error).message,
        );
      }
    }
    if (firstError === null) {
      this.cleanupErrors.delete("partial-build");
      this.cleanupErrors.delete("terminal-failure");
    }
    if (firstError !== null) throw runtimeError(firstError);
  }

  public snapshot(): CocosVfxRuntimeSnapshot {
    const expected = new Map<string, CocosVfxRendererOwnership>();
    for (const cue of this.active.values()) {
      for (const renderer of cue.renderers) {
        expected.set(renderer.ownership.rendererId, renderer.ownership);
      }
    }
    const actualEntries = this.host.rendererOwnership();
    const actual = new Map<string, CocosVfxRendererOwnership>(
      actualEntries.map((ownership) => [ownership.rendererId, ownership]),
    );
    const duplicateActual = actualEntries.length !== actual.size;
    const missing = [...expected.keys()]
      .filter((id) => !actual.has(id))
      .sort(compareCodeUnits);
    const extra = [...actual.keys()]
      .filter((id) => !expected.has(id))
      .sort(compareCodeUnits);
    const mismatched = [...expected.entries()]
      .filter(([id, ownership]) => {
        const observed = actual.get(id);
        return observed !== undefined && !ownershipEqual(ownership, observed);
      })
      .map(([id]) => id)
      .sort(compareCodeUnits);
    if (duplicateActual) mismatched.push("<duplicate-renderer-id>");
    return {
      paused: this.paused,
      activeCueKeys: [...this.active.keys()].sort(compareCodeUnits),
      activeRendererCount: actualEntries.filter(
        (ownership) => ownership.visibility === "active",
      ).length,
      pendingRendererCount: actualEntries.filter(
        (ownership) => ownership.visibility === "pending",
      ).length,
      removedRendererCount: actualEntries.filter(
        (ownership) => ownership.visibility === "removed",
      ).length,
      missingRendererIds: missing,
      extraRendererIds: extra,
      mismatchedRendererIds: mismatched,
      staleRendererCount: new Set([
        ...missing,
        ...extra,
        ...mismatched,
      ]).size,
      generation: this.generation,
      terminalError: this.terminalError?.message ?? null,
      cleanupErrors: [...this.cleanupErrors.entries()]
        .sort(([left], [right]) => compareCodeUnits(left, right))
        .map(([stepId, message]) => `${stepId}:${message}`),
    };
  }

  private assertOperational(): void {
    if (this.terminalError !== null) throw this.terminalError;
  }

  private assertOwnership(): void {
    const snapshot = this.snapshot();
    if (
      snapshot.missingRendererIds.length > 0 ||
      snapshot.extraRendererIds.length > 0 ||
      snapshot.mismatchedRendererIds.length > 0
    ) {
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.RUNTIME_OWNERSHIP_MISMATCH,
        `Renderer ownership mismatch: ${JSON.stringify({
          missing: snapshot.missingRendererIds,
          extra: snapshot.extraRendererIds,
          mismatched: snapshot.mismatchedRendererIds,
        })}`,
      );
    }
  }

  private assertOwnershipOrTerminal(): void {
    try {
      this.assertOwnership();
    } catch (error) {
      this.enterTerminalFailure(runtimeError(error));
    }
  }

  private enterTerminalFailure(error: CocosVfxRuntimeError): never {
    if (this.terminalError === null) {
      this.terminalError = error;
      this.paused = true;
      try {
        this.cleanup("terminal-failure");
      } catch (cleanupError) {
        this.cleanupErrors.set(
          "terminal-failure",
          runtimeError(cleanupError).message,
        );
      }
    }
    throw this.terminalError;
  }

  private update(active: ActiveCue): boolean {
    let allRemoved = active.cue.lifecycle === "one-shot";
    for (const renderer of active.renderers) {
      const sample = sampleVfxLayerAtTime(
        renderer.descriptor.layer,
        active.elapsedSeconds,
      );
      const visibility: CocosVfxLayerVisibility = sample.removed
        ? "removed"
        : sample.active
          ? "active"
          : "pending";
      if (visibility !== "removed") allRemoved = false;
      this.host.sampleLayer(
        renderer.ownership.rendererId,
        renderer.descriptor,
        sample,
        visibility,
        active.elapsedSeconds,
      );
      renderer.visibility = visibility;
      renderer.ownership = { ...renderer.ownership, visibility };
    }
    if (allRemoved) this.destroy(active, "one-shot-complete");
    return allRemoved;
  }

  private destroy(active: ActiveCue, reason: string): void {
    this.destroyRenderers(active.renderers, reason);
  }

  private destroyRenderers(
    renderers: readonly ActiveRenderer[],
    reason: string,
  ): void {
    const actualIds = new Set(
      this.host.rendererOwnership().map((ownership) => ownership.rendererId),
    );
    for (const renderer of renderers) {
      if (actualIds.delete(renderer.ownership.rendererId)) {
        this.host.destroyLayer(renderer.ownership.rendererId, reason);
      }
    }
  }
}

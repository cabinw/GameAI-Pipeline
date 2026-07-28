import {
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

export interface CocosVfxRuntimeHost {
  createLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
  ): void;
  updateLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    commandElapsedSeconds: number,
  ): void;
  destroyLayer(rendererId: string, reason: string): void;
  activeRendererCount(): number;
}

interface ActiveCue {
  readonly key: string;
  readonly cue: CocosVfxCueDescriptor;
  readonly rendererIds: readonly string[];
  elapsedSeconds: number;
}

export interface CocosVfxRuntimeSnapshot {
  readonly paused: boolean;
  readonly activeCueKeys: readonly string[];
  readonly activeRendererCount: number;
  readonly staleRendererCount: number;
  readonly generation: number;
}

export class CocosVfxRuntimeState {
  private readonly cues: ReadonlyMap<string, CocosVfxCueDescriptor>;
  private readonly active = new Map<string, ActiveCue>();
  private paused = false;
  private generation = 1;

  public constructor(
    plan: CocosVfxDescriptorPlan,
    private readonly host: CocosVfxRuntimeHost,
  ) {
    this.cues = new Map(plan.cues.map((cue) => [cue.cueId, cue]));
  }

  public dispatch(command: CocosVfxSemanticCommand): void {
    if (command.command === "stop") {
      const active = this.active.get(command.instanceId);
      if (active === undefined) {
        throw new CocosVfxRuntimeError(
          CocosVfxPlanErrorCode.UNKNOWN_INSTANCE,
          `Unknown Cocos VFX instance ${command.instanceId}.`,
        );
      }
      this.destroy(active, command.reason);
      this.active.delete(command.instanceId);
      return;
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
        return;
      }
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.DUPLICATE_INSTANCE,
        `Duplicate Cocos VFX instance ${key}.`,
      );
    }
    const rendererIds = cue.layers.map(
      (layer) => `${this.generation}:${key}:${layer.layerId}`,
    );
    const created: string[] = [];
    try {
      for (const [index, layer] of cue.layers.entries()) {
        const rendererId = rendererIds[index] as string;
        this.host.createLayer(rendererId, layer);
        created.push(rendererId);
      }
      const active: ActiveCue = { key, cue, rendererIds, elapsedSeconds: 0 };
      this.active.set(key, active);
      this.update(active);
    } catch (error) {
      for (const rendererId of created) {
        this.host.destroyLayer(rendererId, "partial-build");
      }
      throw error instanceof CocosVfxRuntimeError
        ? error
        : new CocosVfxRuntimeError(
            CocosVfxPlanErrorCode.RUNTIME_BUILD_FAILURE,
            error instanceof Error ? error.message : "VFX build failed.",
          );
    }
  }

  public tick(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new CocosVfxRuntimeError(
        CocosVfxPlanErrorCode.INVALID_COMMAND,
        "VFX runtime delta must be finite and non-negative.",
      );
    }
    if (this.paused) return;
    for (const [key, active] of [...this.active]) {
      active.elapsedSeconds += deltaSeconds;
      const removed = this.update(active);
      if (removed) this.active.delete(key);
    }
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public rebuild(): void {
    this.cleanup("rebuild");
    this.generation += 1;
    this.paused = false;
  }

  public cleanup(reason: string): void {
    for (const active of this.active.values()) this.destroy(active, reason);
    this.active.clear();
  }

  public snapshot(): CocosVfxRuntimeSnapshot {
    const owned = [...this.active.values()].reduce(
      (count, cue) => count + cue.rendererIds.length,
      0,
    );
    return {
      paused: this.paused,
      activeCueKeys: [...this.active.keys()].sort(),
      activeRendererCount: this.host.activeRendererCount(),
      staleRendererCount: Math.max(
        0,
        this.host.activeRendererCount() - owned,
      ),
      generation: this.generation,
    };
  }

  private update(active: ActiveCue): boolean {
    let allRemoved = active.cue.lifecycle === "one-shot";
    for (const [index, layer] of active.cue.layers.entries()) {
      const sample = sampleVfxLayerAtTime(
        layer.layer,
        active.elapsedSeconds,
      );
      if (!sample.removed) allRemoved = false;
      if (sample.active) {
        this.host.updateLayer(
          active.rendererIds[index] as string,
          layer,
          sample,
          active.elapsedSeconds,
        );
      }
    }
    if (allRemoved) this.destroy(active, "one-shot-complete");
    return allRemoved;
  }

  private destroy(active: ActiveCue, reason: string): void {
    for (const rendererId of active.rendererIds) {
      this.host.destroyLayer(rendererId, reason);
    }
  }
}

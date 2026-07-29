// Generated from the tested TASK-014D3 composition boundary. Do not hand-edit.
import type {
  EvaluatedSemanticEvent,
  StartedSemanticEvent,
} from "@gameai/character-semantic-events";

import {
  CocosVfxRuntimeState,
  type CocosVfxSemanticCommand,
} from "../task014d2/cocos-vfx-runtime-state";

export interface CanonicalVfxAdapterSnapshot {
  readonly emitCount: number;
  readonly startCount: number;
  readonly stopCount: number;
  readonly persistentStartAttempts: number;
  readonly acceptedPersistentStarts: number;
  readonly coalescedPersistentStarts: number;
  readonly lastCommand: string;
}

export class CanonicalVfxRuntimeAdapter {
  private emitCount = 0;
  private startCount = 0;
  private stopCount = 0;
  private persistentStartAttempts = 0;
  private acceptedPersistentStarts = 0;
  private coalescedPersistentStarts = 0;
  private lastCommand = "none";
  private persistentCommand: CocosVfxSemanticCommand | null = null;

  public constructor(private readonly runtime: CocosVfxRuntimeState) {}

  public dispatch(command: EvaluatedSemanticEvent): void {
    this.lastCommand =
      `${command.command}:${command.trackId}:${command.eventId}:${command.cycle}`;
    if (command.command === "stop") {
      this.stopCount += 1;
      this.runtime.dispatch({
        command: "stop",
        instanceId: command.instanceId,
        reason: stopReason(command.reason),
      });
      if (this.persistentCommand?.command === "start" &&
          this.persistentCommand.instanceId === command.instanceId) {
        this.persistentCommand = null;
      }
      return;
    }
    if (command.eventKind !== "vfx" || command.payload.kind !== "vfx") return;
    if (command.command === "emit") {
      this.emitCount += 1;
      this.runtime.dispatch({
        command: "emit",
        cueId: command.payload.cueDefinitionId,
        commandId:
          `${command.trackId}:${command.eventId}:${command.cycle}`,
        ...(command.socketId === undefined
          ? {}
          : { targetId: command.socketId }),
      });
      return;
    }
    this.start(command);
  }

  public repeatPersistentAttempt(): void {
    const command = this.persistentCommand;
    if (command === null || command.command !== "start") return;
    this.persistentStartAttempts += 1;
    const result = this.runtime.dispatch(command);
    if (result.accepted) this.acceptedPersistentStarts += 1;
    if (result.coalesced) this.coalescedPersistentStarts += 1;
  }

  public tick(deltaSeconds: number): void {
    this.runtime.tick(deltaSeconds);
  }

  public setPaused(paused: boolean): void {
    this.runtime.setPaused(paused);
  }

  public cleanup(
    reason: "exact-reset" | "track-switch" | "dispose" | "rebuild" |
      "target-invalidation",
  ): void {
    this.runtime.cleanup(reason);
    this.persistentCommand = null;
  }

  public snapshot(): CanonicalVfxAdapterSnapshot {
    return Object.freeze({
      emitCount: this.emitCount,
      startCount: this.startCount,
      stopCount: this.stopCount,
      persistentStartAttempts: this.persistentStartAttempts,
      acceptedPersistentStarts: this.acceptedPersistentStarts,
      coalescedPersistentStarts: this.coalescedPersistentStarts,
      lastCommand: this.lastCommand,
    });
  }

  private start(command: StartedSemanticEvent): void {
    this.startCount += 1;
    const runtimeCommand: CocosVfxSemanticCommand = {
      command: "start",
      cueId: command.payload.kind === "vfx"
        ? command.payload.cueDefinitionId
        : command.semanticCueId,
      commandId: `${command.trackId}:${command.eventId}:${command.cycle}`,
      instanceId: command.instanceId,
      ...(command.socketId === undefined
        ? {}
        : { targetId: command.socketId }),
    };
    if (command.lifecycle === "persistent") {
      this.persistentStartAttempts += 1;
      this.persistentCommand = runtimeCommand;
    }
    const result = this.runtime.dispatch(runtimeCommand);
    if (command.lifecycle === "persistent") {
      if (result.accepted) this.acceptedPersistentStarts += 1;
      if (result.coalesced) this.coalescedPersistentStarts += 1;
    }
  }
}

function stopReason(
  reason: Extract<EvaluatedSemanticEvent, { command: "stop" }>["reason"],
): Extract<CocosVfxSemanticCommand, { command: "stop" }>["reason"] {
  switch (reason) {
    case "exact-reset": return "reset";
    case "track-switch": return "switch";
    case "dispose": return "dispose";
    case "duration": return "semantic-stop";
  }
}

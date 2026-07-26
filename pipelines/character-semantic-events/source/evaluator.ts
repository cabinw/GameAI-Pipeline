import {
  SemanticEventErrorCode,
  SemanticEventEvaluationError,
  SemanticEventEvaluationErrorCode,
  type SemanticEventResult,
} from "./diagnostics";
import { validateCharacterSemanticEventInput } from "./parser";
import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  CharacterSemanticEventTrack,
  EvaluatedSemanticEvent,
  SemanticEventEvaluatorSnapshot,
  SemanticEventPlaybackStatus,
  SemanticEventStopReason,
  SemanticEventValidationContext,
  StartedSemanticEvent,
  StoppedSemanticEvent,
} from "./types";

const BOUNDARY_EPSILON = 1e-9;

export const MAX_SEMANTIC_EVENT_CYCLES_PER_ADVANCE = 10_000;
export const MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE = 10_000;

interface RuntimeTrack {
  readonly track: CharacterSemanticEventTrack;
  readonly duration: number;
}

interface ActiveInstance {
  readonly schemaVersion: string;
  readonly trackId: string;
  readonly clipId: string;
  readonly event: CharacterSemanticEvent;
  readonly cycle: number;
  readonly instanceId: string;
  readonly stopAbsoluteTimeSeconds?: number;
}

interface AuthoredCandidate {
  readonly type: "authored";
  readonly absoluteTime: number;
  readonly boundaryPhase: number;
  readonly event: CharacterSemanticEvent;
  readonly cycle: number;
}

interface StopCandidate {
  readonly type: "stop";
  readonly absoluteTime: number;
  readonly boundaryPhase: 0;
  readonly instanceId: string;
  readonly reason: "duration";
}

type Candidate = AuthoredCandidate | StopCandidate;

function eventOrder(
  left: CharacterSemanticEvent,
  right: CharacterSemanticEvent,
): number {
  return (
    left.timeSeconds - right.timeSeconds ||
    left.order - right.order ||
    left.eventId.localeCompare(right.eventId)
  );
}

function instanceId(
  trackId: string,
  eventId: string,
  cycle: number,
): string {
  return `${trackId}:${eventId}:${cycle}`;
}

function authoredCommand(
  schemaVersion: string,
  track: CharacterSemanticEventTrack,
  event: CharacterSemanticEvent,
  cycle: number,
): EvaluatedSemanticEvent {
  const common = {
    ...event,
    schemaVersion,
    trackId: track.trackId,
    clipId: track.clipId,
    cycle,
  };
  return event.lifecycle === "one-shot"
    ? { ...common, command: "emit" }
    : {
        ...common,
        command: "start",
        instanceId: instanceId(track.trackId, event.eventId, cycle),
      };
}

function activeFromStart(
  command: StartedSemanticEvent,
  absoluteTime: number,
): ActiveInstance {
  return {
    schemaVersion: command.schemaVersion,
    trackId: command.trackId,
    clipId: command.clipId,
    event: command,
    cycle: command.cycle,
    instanceId: command.instanceId,
    ...(command.lifecycle === "looping"
      ? {
          stopAbsoluteTimeSeconds:
            absoluteTime + command.durationSeconds!,
        }
      : {}),
  };
}

function stopCommand(
  active: ActiveInstance,
  reason: SemanticEventStopReason,
  absoluteTimeSeconds: number,
): StoppedSemanticEvent {
  return {
    command: "stop",
    schemaVersion: active.schemaVersion,
    trackId: active.trackId,
    clipId: active.clipId,
    cycle: active.cycle,
    eventId: active.event.eventId,
    eventKind: "vfx",
    semanticCueId: active.event.semanticCueId,
    lifecycle: active.event.lifecycle as "looping" | "persistent",
    instanceId: active.instanceId,
    reason,
    absoluteTimeSeconds,
  };
}

function candidateOrder(left: Candidate, right: Candidate): number {
  const boundary =
    left.absoluteTime - right.absoluteTime ||
    left.boundaryPhase - right.boundaryPhase;
  if (boundary !== 0) return boundary;
  if (left.type === "stop" && right.type === "stop") {
    return left.instanceId.localeCompare(right.instanceId);
  }
  if (left.type === "authored" && right.type === "authored") {
    return eventOrder(left.event, right.event);
  }
  return left.type === "stop" ? -1 : 1;
}

export class CharacterSemanticEventEvaluator {
  readonly #schemaVersion: string;
  readonly #tracks: ReadonlyMap<string, RuntimeTrack>;
  #active: RuntimeTrack;
  #status: SemanticEventPlaybackStatus = "stopped";
  #absoluteTimeSeconds = 0;
  #activeInstances = new Map<string, ActiveInstance>();

  public constructor(
    contract: CharacterSemanticEventContract,
    context: SemanticEventValidationContext,
    initialTrackId: string,
    validatedToken: symbol,
  ) {
    if (validatedToken !== evaluatorValidationToken) {
      throw new Error(
        "Use createCharacterSemanticEventEvaluator so validation runs before evaluation.",
      );
    }
    this.#schemaVersion = contract.schemaVersion;
    const durations = new Map(
      context.clips.map((clip) => [clip.clipId, clip.durationSeconds] as const),
    );
    this.#tracks = new Map(
      contract.tracks.map((track) => [
        track.trackId,
        {
          track: {
            ...track,
            events: [...track.events].sort(eventOrder),
          },
          duration: durations.get(track.clipId)!,
        },
      ]),
    );
    this.#active = this.#tracks.get(initialTrackId)!;
  }

  public get snapshot(): SemanticEventEvaluatorSnapshot {
    const duration = this.#active.duration;
    const completedCycles = Math.floor(
      (this.#absoluteTimeSeconds + BOUNDARY_EPSILON) / duration,
    );
    const rawLocal = this.#absoluteTimeSeconds - completedCycles * duration;
    const localTimeSeconds =
      Math.abs(rawLocal) <= BOUNDARY_EPSILON ? 0 : rawLocal;
    return {
      trackId: this.#active.track.trackId,
      clipId: this.#active.track.clipId,
      status: this.#status,
      absoluteTimeSeconds: this.#absoluteTimeSeconds,
      localTimeSeconds,
      completedCycles,
      activeInstanceIds: [...this.#activeInstances.keys()].sort(),
    };
  }

  public play(): readonly [] {
    this.#status = "playing";
    return [];
  }

  public pause(): readonly [] {
    if (this.#status === "playing") this.#status = "paused";
    return [];
  }

  public resume(): readonly [] {
    if (this.#status === "paused") this.#status = "playing";
    return [];
  }

  public exactReset(): readonly EvaluatedSemanticEvent[] {
    const cleanup = this.#cleanup("exact-reset");
    this.#absoluteTimeSeconds = 0;
    this.#status = "stopped";
    return cleanup;
  }

  public switchTrack(trackId: string): readonly EvaluatedSemanticEvent[] {
    const next = this.#tracks.get(trackId);
    if (next === undefined) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.UNKNOWN_TRACK_ID,
        `Unknown semantic event track ${trackId}.`,
      );
    }
    const cleanup = this.#cleanup("track-switch");
    this.#active = next;
    this.#absoluteTimeSeconds = 0;
    return cleanup;
  }

  public dispose(): readonly EvaluatedSemanticEvent[] {
    const cleanup = this.#cleanup("dispose");
    this.#status = "stopped";
    return cleanup;
  }

  public seek(_timeSeconds: number): never {
    throw new SemanticEventEvaluationError(
      SemanticEventEvaluationErrorCode.UNSUPPORTED_SEEK,
      "Arbitrary semantic-event seeking is unsupported in TASK-014A.",
    );
  }

  public advance(deltaSeconds: number): readonly EvaluatedSemanticEvent[] {
    if (!Number.isFinite(deltaSeconds)) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.INVALID_DELTA,
        "Semantic-event delta must be finite.",
      );
    }
    if (deltaSeconds < 0) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.UNSUPPORTED_REVERSE_PLAYBACK,
        "Reverse semantic-event playback is unsupported in TASK-014A.",
      );
    }
    if (this.#status !== "playing" || deltaSeconds === 0) return [];

    const start = this.#absoluteTimeSeconds;
    const end = start + deltaSeconds;
    if (!Number.isFinite(end)) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.ACCUMULATED_TIME_OVERFLOW,
        "Semantic-event accumulated time must remain finite.",
      );
    }

    const { duration, track } = this.#active;
    const firstCycle = Math.max(0, Math.floor(start / duration) - 1);
    const lastCycle = Math.floor((end + BOUNDARY_EPSILON) / duration);
    const cycleCount = lastCycle - firstCycle + 1;
    const potentialAuthoredCount = cycleCount * track.events.length;
    if (
      !Number.isSafeInteger(firstCycle) ||
      !Number.isSafeInteger(lastCycle) ||
      cycleCount > MAX_SEMANTIC_EVENT_CYCLES_PER_ADVANCE ||
      potentialAuthoredCount > MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE
    ) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.ADVANCE_BUDGET_EXCEEDED,
        `Semantic-event advance exceeds the ${MAX_SEMANTIC_EVENT_CYCLES_PER_ADVANCE}-cycle or ${MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE}-command budget.`,
      );
    }

    const candidates: Candidate[] = [];
    for (const active of this.#activeInstances.values()) {
      const stop = active.stopAbsoluteTimeSeconds;
      if (
        stop !== undefined &&
        stop > start + BOUNDARY_EPSILON &&
        stop <= end + BOUNDARY_EPSILON
      ) {
        candidates.push({
          type: "stop",
          absoluteTime: stop,
          boundaryPhase: 0,
          instanceId: active.instanceId,
          reason: "duration",
        });
      }
    }

    for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
      for (const event of track.events) {
        const isZero = event.timeSeconds === 0;
        if (isZero && cycle === 0) continue;
        const absoluteTime = cycle * duration + event.timeSeconds;
        if (!Number.isFinite(absoluteTime)) {
          throw new SemanticEventEvaluationError(
            SemanticEventEvaluationErrorCode.ACCUMULATED_TIME_OVERFLOW,
            "Semantic-event boundary time must remain finite.",
          );
        }
        if (
          absoluteTime > start + BOUNDARY_EPSILON &&
          absoluteTime <= end + BOUNDARY_EPSILON
        ) {
          candidates.push({
            type: "authored",
            absoluteTime,
            boundaryPhase: isZero ? 2 : 1,
            event,
            cycle,
          });
          if (event.lifecycle === "looping") {
            const stop = absoluteTime + event.durationSeconds!;
            if (!Number.isFinite(stop)) {
              throw new SemanticEventEvaluationError(
                SemanticEventEvaluationErrorCode.ACCUMULATED_TIME_OVERFLOW,
                "Semantic-event lifecycle stop time must remain finite.",
              );
            }
            if (
              stop > start + BOUNDARY_EPSILON &&
              stop <= end + BOUNDARY_EPSILON
            ) {
              candidates.push({
                type: "stop",
                absoluteTime: stop,
                boundaryPhase: 0,
                instanceId: instanceId(
                  track.trackId,
                  event.eventId,
                  cycle,
                ),
                reason: "duration",
              });
            }
          }
        }
      }
    }

    if (
      candidates.length > MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE ||
      this.#activeInstances.size + candidates.length >
        MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE * 2
    ) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.ADVANCE_BUDGET_EXCEEDED,
        `Semantic-event advance exceeds the ${MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE}-command budget.`,
      );
    }

    candidates.sort(candidateOrder);
    const activeInstances = new Map(this.#activeInstances);
    const commands: EvaluatedSemanticEvent[] = [];
    for (const candidate of candidates) {
      if (candidate.type === "stop") {
        const active = activeInstances.get(candidate.instanceId);
        if (active === undefined) continue;
        activeInstances.delete(candidate.instanceId);
        commands.push(
          stopCommand(active, candidate.reason, candidate.absoluteTime),
        );
        continue;
      }
      const command = authoredCommand(
        this.#schemaVersion,
        track,
        candidate.event,
        candidate.cycle,
      );
      commands.push(command);
      if (command.command === "start") {
        activeInstances.set(
          command.instanceId,
          activeFromStart(command, candidate.absoluteTime),
        );
      }
    }

    if (
      activeInstances.size > MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE
    ) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.ADVANCE_BUDGET_EXCEEDED,
        `Semantic-event active instances exceed the ${MAX_SEMANTIC_EVENT_COMMANDS_PER_ADVANCE}-instance budget.`,
      );
    }

    this.#absoluteTimeSeconds = end;
    this.#activeInstances = activeInstances;
    return commands;
  }

  #cleanup(
    reason: Exclude<SemanticEventStopReason, "duration">,
  ): EvaluatedSemanticEvent[] {
    const commands = [...this.#activeInstances.values()]
      .sort((left, right) => left.instanceId.localeCompare(right.instanceId))
      .map((active) =>
        stopCommand(active, reason, this.#absoluteTimeSeconds),
      );
    this.#activeInstances.clear();
    return commands;
  }
}

const evaluatorValidationToken = Symbol("validated-semantic-events");

export function createCharacterSemanticEventEvaluator(
  contract: unknown,
  context: unknown,
  initialTrackId: string,
): SemanticEventResult<CharacterSemanticEventEvaluator> {
  const validated = validateCharacterSemanticEventInput(contract, context);
  if (!validated.ok) return validated;
  const initialTrack = validated.value.tracks.find(
    (track) => track.trackId === initialTrackId,
  );
  if (initialTrack === undefined) {
    return {
      ok: false,
      errors: [
        {
          code: SemanticEventErrorCode.UNKNOWN_INITIAL_TRACK_ID,
          path: "/initialTrackId",
          message: `Unknown initial semantic-event track ${String(initialTrackId)}.`,
        },
      ],
    };
  }
  return {
    ok: true,
    value: new CharacterSemanticEventEvaluator(
      validated.value,
      context as SemanticEventValidationContext,
      initialTrack.trackId,
      evaluatorValidationToken,
    ),
    errors: [],
  };
}

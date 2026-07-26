import {
  SemanticEventEvaluationError,
  SemanticEventEvaluationErrorCode,
  type SemanticEventResult,
} from "./diagnostics";
import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  CharacterSemanticEventTrack,
  EvaluatedSemanticEvent,
  SemanticEventEvaluatorSnapshot,
  SemanticEventPlaybackStatus,
  SemanticEventValidationContext,
} from "./types";
import { validateCharacterSemanticEvents } from "./validator";

const BOUNDARY_EPSILON = 1e-9;

interface RuntimeTrack {
  readonly track: CharacterSemanticEventTrack;
  readonly duration: number;
}

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

function eventAtCycle(
  schemaVersion: string,
  track: CharacterSemanticEventTrack,
  event: CharacterSemanticEvent,
  cycle: number,
): EvaluatedSemanticEvent {
  return {
    ...event,
    schemaVersion,
    trackId: track.trackId,
    clipId: track.clipId,
    cycle,
  };
}

export class CharacterSemanticEventEvaluator {
  readonly #schemaVersion: string;
  readonly #tracks: ReadonlyMap<string, RuntimeTrack>;
  #active: RuntimeTrack;
  #status: SemanticEventPlaybackStatus = "stopped";
  #absoluteTimeSeconds = 0;

  public constructor(
    contract: CharacterSemanticEventContract,
    context: SemanticEventValidationContext,
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
    this.#active = this.#tracks.values().next().value as RuntimeTrack;
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

  public exactReset(): readonly [] {
    this.#absoluteTimeSeconds = 0;
    this.#status = "stopped";
    return [];
  }

  public switchTrack(trackId: string): readonly [] {
    const next = this.#tracks.get(trackId);
    if (next === undefined) {
      throw new SemanticEventEvaluationError(
        SemanticEventEvaluationErrorCode.UNKNOWN_TRACK_ID,
        `Unknown semantic event track ${trackId}.`,
      );
    }
    this.#active = next;
    this.#absoluteTimeSeconds = 0;
    return [];
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
    const { duration, track } = this.#active;
    const firstCycle = Math.max(0, Math.floor(start / duration) - 1);
    const lastCycle = Math.floor((end + BOUNDARY_EPSILON) / duration);
    const crossed: Array<{
      absoluteTime: number;
      boundaryPhase: number;
      event: CharacterSemanticEvent;
      cycle: number;
    }> = [];

    for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
      for (const event of track.events) {
        const isZero = event.timeSeconds === 0;
        if (isZero && cycle === 0) continue;
        const absoluteTime = cycle * duration + event.timeSeconds;
        if (
          absoluteTime > start + BOUNDARY_EPSILON &&
          absoluteTime <= end + BOUNDARY_EPSILON
        ) {
          crossed.push({
            absoluteTime,
            boundaryPhase: isZero ? 1 : 0,
            event,
            cycle,
          });
        }
      }
    }
    crossed.sort(
      (left, right) =>
        left.absoluteTime - right.absoluteTime ||
        left.boundaryPhase - right.boundaryPhase ||
        eventOrder(left.event, right.event),
    );
    this.#absoluteTimeSeconds = end;
    return crossed.map(({ event, cycle }) =>
      eventAtCycle(this.#schemaVersion, track, event, cycle),
    );
  }
}

const evaluatorValidationToken = Symbol("validated-semantic-events");

export function createCharacterSemanticEventEvaluator(
  contract: CharacterSemanticEventContract,
  context: SemanticEventValidationContext,
): SemanticEventResult<CharacterSemanticEventEvaluator> {
  const errors = validateCharacterSemanticEvents(contract, context);
  return errors.length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: new CharacterSemanticEventEvaluator(
          contract,
          context,
          evaluatorValidationToken,
        ),
        errors: [],
      };
}

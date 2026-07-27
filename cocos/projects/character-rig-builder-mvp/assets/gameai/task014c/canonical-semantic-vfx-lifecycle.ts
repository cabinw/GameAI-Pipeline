// Generated from the tested TASK-014C composition boundary. Do not hand-edit.
export const TASK014C_READINESS_PHASES = Object.freeze([
  "idle",
  "loading",
  "resources-passed",
  "loadout-built",
  "sockets-resolved",
  "events-ready",
  "reset-complete",
  "ready",
  "failed",
  "disposed",
] as const);

export type Task014CReadinessPhase =
  (typeof TASK014C_READINESS_PHASES)[number];

export interface Task014CLifecycleSnapshot {
  readonly generation: number;
  readonly phase: Task014CReadinessPhase;
  readonly setupCount: number;
  readonly teardownCount: number;
  readonly rebuildCount: number;
  readonly activeInputHandlerCount: number;
  readonly staleTargetReferenceCount: number;
}

const ORDER: readonly Task014CReadinessPhase[] = [
  "loading",
  "resources-passed",
  "loadout-built",
  "sockets-resolved",
  "events-ready",
  "reset-complete",
  "ready",
];

export class Task014CLifecycle {
  private generation = 0;
  private phase: Task014CReadinessPhase = "idle";
  private setupCount = 0;
  private teardownCount = 0;
  private rebuildCount = 0;
  private activeInputHandlerCount = 0;
  private staleTargetReferenceCount = 0;

  begin(rebuild = false): number {
    this.generation += 1;
    this.setupCount += 1;
    if (rebuild) this.rebuildCount += 1;
    this.activeInputHandlerCount = 0;
    this.staleTargetReferenceCount = 0;
    this.phase = "loading";
    return this.generation;
  }

  advance(generation: number, next: Task014CReadinessPhase): void {
    this.requireGeneration(generation);
    const currentIndex = ORDER.indexOf(this.phase);
    const nextIndex = ORDER.indexOf(next);
    if (nextIndex !== currentIndex + 1) {
      throw new Error(
        `TASK_014C_READINESS_TRANSITION_INVALID: ${this.phase}->${next}`,
      );
    }
    this.phase = next;
  }

  registerInput(generation: number): void {
    this.requireGeneration(generation);
    if (this.phase !== "ready" || this.activeInputHandlerCount !== 0) {
      throw new Error("TASK_014C_INPUT_REGISTRATION_INVALID");
    }
    this.activeInputHandlerCount = 1;
  }

  teardown(dispose = false): void {
    if (this.phase !== "idle" && this.phase !== "disposed") {
      this.teardownCount += 1;
    }
    this.activeInputHandlerCount = 0;
    this.staleTargetReferenceCount = 0;
    this.phase = dispose ? "disposed" : "idle";
  }

  fail(generation: number): void {
    this.requireGeneration(generation);
    this.activeInputHandlerCount = 0;
    this.staleTargetReferenceCount = 0;
    this.phase = "failed";
  }

  accepts(generation: number): boolean {
    return (
      generation === this.generation &&
      this.phase !== "failed" &&
      this.phase !== "disposed" &&
      this.phase !== "idle"
    );
  }

  snapshot(): Task014CLifecycleSnapshot {
    return Object.freeze({
      generation: this.generation,
      phase: this.phase,
      setupCount: this.setupCount,
      teardownCount: this.teardownCount,
      rebuildCount: this.rebuildCount,
      activeInputHandlerCount: this.activeInputHandlerCount,
      staleTargetReferenceCount: this.staleTargetReferenceCount,
    });
  }

  private requireGeneration(generation: number): void {
    if (!this.accepts(generation)) {
      throw new Error(
        `TASK_014C_STALE_GENERATION: ${generation}->${this.generation}`,
      );
    }
  }
}

// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.
export type HarnessLifecyclePhase =
  | "idle"
  | "loading"
  | "ready"
  | "failed"
  | "disposed";

export interface HarnessLifecycleSnapshot {
  readonly phase: HarnessLifecyclePhase;
  readonly generation: number;
  readonly setupCount: number;
  readonly teardownCount: number;
}

export class HarnessLifecycle {
  private phaseValue: HarnessLifecyclePhase = "idle";
  private generationValue = 0;
  private setupCountValue = 0;
  private teardownCountValue = 0;

  begin(): number {
    if (this.phaseValue === "loading" || this.phaseValue === "ready") {
      throw new Error(`TASK_013R1_LIFECYCLE_DUPLICATE_SETUP: ${this.phaseValue}`);
    }
    if (this.phaseValue === "disposed") {
      throw new Error("TASK_013R1_LIFECYCLE_DISPOSED");
    }
    this.generationValue += 1;
    this.setupCountValue += 1;
    this.phaseValue = "loading";
    return this.generationValue;
  }

  ready(generation: number): void {
    this.requireCurrent(generation, "loading");
    this.phaseValue = "ready";
  }

  fail(generation: number): void {
    this.requireCurrent(generation, "loading");
    this.phaseValue = "failed";
  }

  accepts(generation: number): boolean {
    return (
      generation === this.generationValue &&
      (this.phaseValue === "loading" || this.phaseValue === "ready")
    );
  }

  teardown(dispose = false): void {
    if (this.phaseValue !== "idle" && this.phaseValue !== "disposed") {
      this.teardownCountValue += 1;
    }
    this.generationValue += 1;
    this.phaseValue = dispose ? "disposed" : "idle";
  }

  snapshot(): HarnessLifecycleSnapshot {
    return Object.freeze({
      phase: this.phaseValue,
      generation: this.generationValue,
      setupCount: this.setupCountValue,
      teardownCount: this.teardownCountValue,
    });
  }

  private requireCurrent(
    generation: number,
    expected: HarnessLifecyclePhase,
  ): void {
    if (
      generation !== this.generationValue ||
      this.phaseValue !== expected
    ) {
      throw new Error(
        `TASK_013R1_LIFECYCLE_STALE_GENERATION: ${JSON.stringify({
          generation,
          currentGeneration: this.generationValue,
          phase: this.phaseValue,
          expected,
        })}`,
      );
    }
  }
}

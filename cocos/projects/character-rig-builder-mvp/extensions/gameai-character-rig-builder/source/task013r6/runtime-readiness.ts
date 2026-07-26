export type PropRuntimeReadinessPhase =
  | "inactive"
  | "loading"
  | "resources-passed"
  | "nodes-built"
  | "reset-complete"
  | "ready"
  | "failed"
  | "disposed";

export interface PropRuntimeReadinessSnapshot {
  readonly phase: PropRuntimeReadinessPhase;
  readonly generation: number;
  readonly activeInputHandlerCount: number;
}

export class PropRuntimeReadiness {
  private phaseValue: PropRuntimeReadinessPhase = "inactive";
  private generationValue = 0;
  private activeInputHandlerCountValue = 0;

  begin(): number {
    if (this.phaseValue === "disposed") {
      throw new Error("TASK_013R7_READINESS_DISPOSED");
    }
    if (this.phaseValue !== "inactive" && this.phaseValue !== "failed") {
      throw new Error(`TASK_013R7_READINESS_DUPLICATE_BEGIN:${this.phaseValue}`);
    }
    this.generationValue += 1;
    this.phaseValue = "loading";
    this.activeInputHandlerCountValue = 0;
    return this.generationValue;
  }

  resourcesPassed(generation: number): void {
    this.transition(generation, "loading", "resources-passed");
  }

  nodesBuilt(generation: number): void {
    this.transition(generation, "resources-passed", "nodes-built");
  }

  resetComplete(generation: number, playbackExists: boolean): void {
    if (!playbackExists) {
      throw new Error("TASK_013R7_READINESS_RESET_WITHOUT_PLAYBACK");
    }
    this.transition(generation, "nodes-built", "reset-complete");
  }

  lifecycleReady(generation: number): void {
    this.transition(generation, "reset-complete", "ready");
  }

  activateInput(generation: number): void {
    this.require(generation, "ready");
    if (this.activeInputHandlerCountValue !== 0) {
      throw new Error("TASK_013R7_DUPLICATE_INPUT_HANDLER");
    }
    this.activeInputHandlerCountValue = 1;
  }

  canDispatch(generation: number): boolean {
    return (
      generation === this.generationValue &&
      this.phaseValue === "ready" &&
      this.activeInputHandlerCountValue === 1
    );
  }

  fail(generation: number): void {
    if (generation !== this.generationValue) return;
    this.activeInputHandlerCountValue = 0;
    this.phaseValue = "failed";
  }

  teardown(dispose = false): void {
    this.activeInputHandlerCountValue = 0;
    this.generationValue += 1;
    this.phaseValue = dispose ? "disposed" : "inactive";
  }

  snapshot(): PropRuntimeReadinessSnapshot {
    return Object.freeze({
      phase: this.phaseValue,
      generation: this.generationValue,
      activeInputHandlerCount: this.activeInputHandlerCountValue,
    });
  }

  private transition(
    generation: number,
    expected: PropRuntimeReadinessPhase,
    next: PropRuntimeReadinessPhase,
  ): void {
    this.require(generation, expected);
    this.phaseValue = next;
  }

  private require(
    generation: number,
    expected: PropRuntimeReadinessPhase,
  ): void {
    if (
      generation !== this.generationValue ||
      this.phaseValue !== expected
    ) {
      throw new Error(
        `TASK_013R7_READINESS_STALE_GENERATION:${JSON.stringify({
          generation,
          currentGeneration: this.generationValue,
          phase: this.phaseValue,
          expected,
        })}`,
      );
    }
  }
}

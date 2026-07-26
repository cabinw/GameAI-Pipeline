export interface HarnessPose {
  readonly childPosition: Readonly<{ x: number; y: number }>;
  readonly childRotationDegrees: number;
}

export interface HarnessPlaybackSnapshot {
  readonly state: "stopped" | "playing" | "paused";
  readonly timeSeconds: number;
  readonly stressEnabled: boolean;
  readonly debugEnabled: boolean;
}

export const HARNESS_DURATION_SECONDS = 2;
export const HARNESS_REST_POSE: HarnessPose = Object.freeze({
  childPosition: Object.freeze({ x: 120, y: 0 }),
  childRotationDegrees: 0,
});
export const HARNESS_STRESS_POSE: HarnessPose = Object.freeze({
  childPosition: Object.freeze({ x: 92, y: 64 }),
  childRotationDegrees: 38,
});

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

export function sampleHarnessPose(timeSeconds: number): HarnessPose {
  if (!Number.isFinite(timeSeconds)) {
    throw new Error("TASK_013R1_ANIMATION_TIME_INVALID");
  }
  const canonical =
    ((timeSeconds % HARNESS_DURATION_SECONDS) + HARNESS_DURATION_SECONDS) %
    HARNESS_DURATION_SECONDS;
  const phase = canonical / HARNESS_DURATION_SECONDS;
  const amount = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
  return Object.freeze({
    childPosition: Object.freeze({
      x: lerp(
        HARNESS_REST_POSE.childPosition.x,
        HARNESS_STRESS_POSE.childPosition.x,
        amount,
      ),
      y: lerp(
        HARNESS_REST_POSE.childPosition.y,
        HARNESS_STRESS_POSE.childPosition.y,
        amount,
      ),
    }),
    childRotationDegrees: lerp(
      HARNESS_REST_POSE.childRotationDegrees,
      HARNESS_STRESS_POSE.childRotationDegrees,
      amount,
    ),
  });
}

export class HarnessPlaybackState {
  private stateValue: HarnessPlaybackSnapshot["state"] = "stopped";
  private timeValue = 0;
  private stressValue = true;
  private debugValue = false;

  update(deltaSeconds: number): HarnessPose {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("TASK_013R1_ANIMATION_DELTA_INVALID");
    }
    if (this.stateValue === "playing") {
      this.timeValue =
        (this.timeValue + deltaSeconds) % HARNESS_DURATION_SECONDS;
    }
    return sampleHarnessPose(this.timeValue);
  }

  togglePlayback(): void {
    this.stateValue =
      this.stateValue === "playing" ? "paused" : "playing";
  }

  toggleStress(): void {
    this.stressValue = !this.stressValue;
  }

  toggleDebug(): void {
    this.debugValue = !this.debugValue;
  }

  exactReset(): HarnessPose {
    this.stateValue = "stopped";
    this.timeValue = 0;
    this.stressValue = true;
    this.debugValue = false;
    return HARNESS_REST_POSE;
  }

  snapshot(): HarnessPlaybackSnapshot {
    return Object.freeze({
      state: this.stateValue,
      timeSeconds: this.timeValue,
      stressEnabled: this.stressValue,
      debugEnabled: this.debugValue,
    });
  }
}

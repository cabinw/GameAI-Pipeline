// Exact generated TASK-014D1 source mirror. Do not hand-edit.
import type {
  NormalizedVfxLayer,
  VfxCurveKeyframe,
  VfxExecutableSemantics,
  VfxLayerSample,
} from "./types";

export const VFX_EXECUTABLE_SEMANTICS =
  Object.freeze<VfxExecutableSemantics>({
  curve: {
    interpolation: "linear",
    extrapolation: "clamp",
    requiredEndpoints: [0, 1] as const,
    scaleComposition: "multiply-base-scale",
    rotationComposition: "add-unwrapped-degrees",
  },
  alphaComposition: "color-a-times-opacity",
  timeOrigin: "semantic-command-start",
  canonicalTime: {
    ticksPerSecond: 1_000_000_000_000,
    maximumTick: 9_007_199_254_740_990,
    rounding: "nearest-tick-ties-up",
  },
  exactDurationBoundary: "ending-cycle-phase-one",
  cleanupAuthority: "semantic-stop-reset-switch-dispose",
  particleSchedule: "index-zero-based-delay-plus-index-over-rate",
  zeroRateEmission: "all-at-delay",
  prng: "xorshift32-v1-compiled-uint32",
  });

export const VFX_TIME_TICKS_PER_SECOND = 1_000_000_000_000 as const;
export const VFX_MAX_CANONICAL_TIME_TICK = 9_007_199_254_740_990 as const;
export const VFX_MAX_CANONICAL_TIME_SECONDS =
  VFX_MAX_CANONICAL_TIME_TICK / VFX_TIME_TICKS_PER_SECOND;

export const VfxSamplingErrorCode = {
  INVALID_TIME: "INVALID_VFX_SAMPLE_TIME",
  TIME_RANGE_EXCEEDED: "VFX_SAMPLE_TIME_RANGE_EXCEEDED",
  INVALID_CURVE: "INVALID_VFX_SAMPLE_CURVE",
  INVALID_LAYER: "INVALID_VFX_SAMPLE_LAYER",
} as const;

export type VfxSamplingErrorCode =
  (typeof VfxSamplingErrorCode)[keyof typeof VfxSamplingErrorCode];

export class VfxSamplingError extends Error {
  public constructor(
    public readonly code: VfxSamplingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VfxSamplingError";
  }
}

export function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sampleLinearCurve(
  curve: readonly VfxCurveKeyframe[],
  normalizedTime: number,
): number {
  if (!Number.isFinite(normalizedTime)) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.INVALID_TIME,
      "Normalized curve sample time must be finite.",
    );
  }
  if (
    !Array.isArray(curve) ||
    curve.length < 2 ||
    curve[0]?.time !== 0 ||
    curve[curve.length - 1]?.time !== 1 ||
    curve.some(
      (keyframe, index) =>
        keyframe === null ||
        typeof keyframe !== "object" ||
        !Number.isFinite(keyframe.time) ||
        !Number.isFinite(keyframe.value) ||
        keyframe.time < 0 ||
        keyframe.time > 1 ||
        (index > 0 && keyframe.time <= (curve[index - 1]?.time ?? 1)),
    )
  ) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.INVALID_CURVE,
      "Curve samples require finite, strictly ordered keyframes with endpoints at 0 and 1.",
    );
  }
  const time = Math.max(0, Math.min(1, normalizedTime));
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (first === undefined || last === undefined) throw new Error("Unreachable");
  if (time <= first.time) return first.value;
  if (time >= last.time) return last.value;
  for (let index = 1; index < curve.length; index += 1) {
    const right = curve[index];
    const left = curve[index - 1];
    if (right !== undefined && left !== undefined && time <= right.time) {
      const ratio = (time - left.time) / (right.time - left.time);
      return Number(
        (left.value + (right.value - left.value) * ratio).toFixed(12),
      );
    }
  }
  return last.value;
}

export function canonicalTimeToTicks(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.INVALID_TIME,
      "VFX sample time must be finite and non-negative.",
    );
  }
  const normalizedSeconds = Object.is(seconds, -0) ? 0 : seconds;
  if (normalizedSeconds > VFX_MAX_CANONICAL_TIME_SECONDS) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.TIME_RANGE_EXCEEDED,
      `VFX sample time exceeds canonical tick ${VFX_MAX_CANONICAL_TIME_TICK}.`,
    );
  }
  const ticks = Math.round(
    normalizedSeconds * VFX_TIME_TICKS_PER_SECOND,
  );
  if (
    !Number.isSafeInteger(ticks) ||
    ticks < 0 ||
    ticks > VFX_MAX_CANONICAL_TIME_TICK
  ) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.TIME_RANGE_EXCEEDED,
      `VFX sample time exceeds canonical tick ${VFX_MAX_CANONICAL_TIME_TICK}.`,
    );
  }
  return ticks;
}

export function canonicalTicksToSeconds(ticks: number): number {
  if (
    !Number.isSafeInteger(ticks) ||
    ticks < 0 ||
    ticks > VFX_MAX_CANONICAL_TIME_TICK
  ) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.TIME_RANGE_EXCEEDED,
      "Canonical VFX time tick is outside the portable range.",
    );
  }
  return ticks / VFX_TIME_TICKS_PER_SECOND;
}

function validSampleLayer(layer: NormalizedVfxLayer): boolean {
  if (typeof layer !== "object" || layer === null) return false;
  const numbers = [
    layer.timing.delaySeconds,
    layer.timing.durationSeconds,
    layer.transform.position.x,
    layer.transform.position.y,
    layer.transform.rotationDegrees,
    layer.transform.scale.x,
    layer.transform.scale.y,
    layer.color.r,
    layer.color.g,
    layer.color.b,
    layer.color.a,
    layer.opacity,
    layer.effectiveAlpha,
  ];
  return (
    numbers.every(Number.isFinite) &&
    layer.timing.delaySeconds >= 0 &&
    layer.timing.durationSeconds > 0 &&
    (layer.timing.phaseMode === "once" ||
      layer.timing.phaseMode === "repeat-until-semantic-stop") &&
    layer.transform.scale.x > 0 &&
    layer.transform.scale.y > 0
    &&
    validSampleCurve(layer.scaleCurve) &&
    validSampleCurve(layer.rotationCurve)
  );
}

function validSampleCurve(curve: readonly VfxCurveKeyframe[]): boolean {
  return (
    Array.isArray(curve) &&
    curve.length >= 2 &&
    curve[0]?.time === 0 &&
    curve[curve.length - 1]?.time === 1 &&
    curve.every(
      (keyframe, index) =>
        keyframe !== null &&
        typeof keyframe === "object" &&
        Number.isFinite(keyframe.time) &&
        Number.isFinite(keyframe.value) &&
        keyframe.time >= 0 &&
        keyframe.time <= 1 &&
        (index === 0 ||
          keyframe.time > (curve[index - 1]?.time ?? 1)),
    )
  );
}

export function nextXorshift32(state: number): number {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function sampleVfxLayerAtTime(
  layer: NormalizedVfxLayer,
  commandElapsedSeconds: number,
): VfxLayerSample {
  if (!validSampleLayer(layer)) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.INVALID_LAYER,
      "Normalized VFX layer contains invalid executable sample values.",
    );
  }
  const commandTick = canonicalTimeToTicks(commandElapsedSeconds);
  const delayTick = canonicalTimeToTicks(layer.timing.delaySeconds);
  const durationTick = canonicalTimeToTicks(layer.timing.durationSeconds);
  if (durationTick === 0) {
    throw new VfxSamplingError(
      VfxSamplingErrorCode.INVALID_LAYER,
      "Normalized VFX layer duration must occupy at least one canonical tick.",
    );
  }
  const base = {
    position: { ...layer.transform.position },
    effectiveAlpha: layer.effectiveAlpha,
  };
  if (commandTick < delayTick) {
    return {
      active: false,
      removed: false,
      cycleIndex: null,
      phase: null,
      ...base,
      scale: { ...layer.transform.scale },
      rotationDegrees: layer.transform.rotationDegrees,
    };
  }
  const elapsedTick = commandTick - delayTick;
  if (layer.timing.phaseMode === "once" && elapsedTick > durationTick) {
    return {
      active: false,
      removed: true,
      cycleIndex: null,
      phase: null,
      ...base,
      scale: { ...layer.transform.scale },
      rotationDegrees: layer.transform.rotationDegrees,
    };
  }
  let cycleIndex = 0;
  let phase = elapsedTick / durationTick;
  if (layer.timing.phaseMode === "repeat-until-semantic-stop") {
    const completedCycles = Math.floor(elapsedTick / durationTick);
    const cycleTick = elapsedTick % durationTick;
    const exactPositiveBoundary = elapsedTick > 0 && cycleTick === 0;
    cycleIndex = exactPositiveBoundary
      ? completedCycles - 1
      : completedCycles;
    phase = exactPositiveBoundary ? 1 : cycleTick / durationTick;
  } else {
    phase = Math.max(0, Math.min(1, phase));
  }
  phase = Number(phase.toFixed(12));
  const scaleMultiplier = sampleLinearCurve(layer.scaleCurve, phase);
  const rotationOffset = sampleLinearCurve(layer.rotationCurve, phase);
  return {
    active: true,
    removed: false,
    cycleIndex,
    phase,
    ...base,
    scale: {
      x: Number((layer.transform.scale.x * scaleMultiplier).toFixed(12)),
      y: Number((layer.transform.scale.y * scaleMultiplier).toFixed(12)),
    },
    rotationDegrees: Number(
      (layer.transform.rotationDegrees + rotationOffset).toFixed(12),
    ),
  };
}

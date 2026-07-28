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
  exactDurationBoundary: "ending-cycle-phase-one",
  cleanupAuthority: "semantic-stop-reset-switch-dispose",
  particleSchedule: "index-zero-based-delay-plus-index-over-rate",
  zeroRateEmission: "all-at-delay",
  prng: "xorshift32-v1-compiled-uint32",
  });

export function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sampleLinearCurve(
  curve: readonly VfxCurveKeyframe[],
  normalizedTime: number,
): number {
  const time = Math.max(0, Math.min(1, normalizedTime));
  const first = curve[0];
  const last = curve[curve.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error("Cannot sample an empty normalized VFX curve.");
  }
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
  const base = {
    position: { ...layer.transform.position },
    effectiveAlpha: layer.effectiveAlpha,
  };
  const delay = layer.timing.delaySeconds;
  const duration = layer.timing.durationSeconds;
  if (commandElapsedSeconds < delay) {
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
  const elapsed = commandElapsedSeconds - delay;
  if (layer.timing.phaseMode === "once" && elapsed > duration) {
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
  let phase = elapsed / duration;
  if (layer.timing.phaseMode === "repeat-until-semantic-stop") {
    const quotient = elapsed / duration;
    const exactPositiveBoundary =
      elapsed > 0 && Number.isInteger(quotient);
    cycleIndex = exactPositiveBoundary
      ? quotient - 1
      : Math.floor(quotient);
    phase = exactPositiveBoundary ? 1 : quotient - Math.floor(quotient);
  } else {
    phase = Math.max(0, Math.min(1, phase));
  }
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

import type {
  AnimationVector2,
  NormalizedRigAnimation,
  RigAnimation,
} from "./types";

function round(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeValue(
  value: number | AnimationVector2,
): number | Readonly<AnimationVector2> {
  return typeof value === "number"
    ? round(value)
    : Object.freeze({ x: round(value.x), y: round(value.y) });
}

export function normalizeRigAnimation(
  animation: RigAnimation,
): NormalizedRigAnimation {
  return Object.freeze({
    schemaVersion: animation.schemaVersion,
    animationId: animation.animationId,
    rigId: animation.rig.rigId,
    rigSchemaVersion: animation.rig.schemaVersion,
    duration: round(animation.duration),
    loop: animation.loop,
    tracks: Object.freeze(
      [...animation.tracks]
        .sort(
          (left, right) =>
            left.jointId.localeCompare(right.jointId) ||
            left.property.localeCompare(right.property),
        )
        .map((track) =>
          Object.freeze({
            jointId: track.jointId,
            property: track.property,
            keyframes: Object.freeze(
              track.keyframes.map((keyframe) =>
                Object.freeze({
                  time: round(keyframe.time),
                  value: normalizeValue(keyframe.value),
                  interpolation: keyframe.interpolation,
                  easing: keyframe.easing,
                }),
              ),
            ),
          }),
        ),
    ),
  });
}

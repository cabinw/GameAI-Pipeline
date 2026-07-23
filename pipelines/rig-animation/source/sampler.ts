import type {
  AnimationEasing,
  AnimationVector2,
  JointFinalPose,
  JointRestPose,
  NormalizedAnimationTrack,
  NormalizedRigAnimation,
  RigAnimationSample,
  SampledJointOffset,
} from "./types";

function round(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function ease(value: number, easing: AnimationEasing): number {
  switch (easing) {
    case "ease-in-sine":
      return 1 - Math.cos((value * Math.PI) / 2);
    case "ease-out-sine":
      return Math.sin((value * Math.PI) / 2);
    case "ease-in-out-sine":
      return -(Math.cos(Math.PI * value) - 1) / 2;
    case "linear":
      return value;
  }
}

function interpolate(
  left: number | Readonly<AnimationVector2>,
  right: number | Readonly<AnimationVector2>,
  amount: number,
): number | Readonly<AnimationVector2> {
  return typeof left === "number" && typeof right === "number"
    ? round(left + (right - left) * amount)
    : typeof left === "object" && typeof right === "object"
      ? Object.freeze({
          x: round(left.x + (right.x - left.x) * amount),
          y: round(left.y + (right.y - left.y) * amount),
        })
      : left;
}

function trackValue(
  track: NormalizedAnimationTrack,
  sampleTime: number,
): number | Readonly<AnimationVector2> {
  const first = track.keyframes[0]!;
  if (sampleTime <= first.time) return first.value;
  for (let index = 0; index < track.keyframes.length - 1; index += 1) {
    const left = track.keyframes[index]!;
    const right = track.keyframes[index + 1]!;
    if (sampleTime <= right.time) {
      if (left.interpolation === "step") return left.value;
      const segment = (sampleTime - left.time) / (right.time - left.time);
      return interpolate(left.value, right.value, ease(segment, left.easing));
    }
  }
  return track.keyframes.at(-1)!.value;
}

export function canonicalSampleTime(
  animation: NormalizedRigAnimation,
  inputTime: number,
): number {
  if (!Number.isFinite(inputTime)) return 0;
  if (!animation.loop) return round(Math.min(animation.duration, Math.max(0, inputTime)));
  const wrapped =
    ((inputTime % animation.duration) + animation.duration) % animation.duration;
  const normalized = round(wrapped);
  return normalized === animation.duration ? 0 : normalized;
}

export function sampleRigAnimation(
  animation: NormalizedRigAnimation,
  inputTime: number,
): RigAnimationSample {
  const sampleTime = canonicalSampleTime(animation, inputTime);
  const mutable: Record<string, SampledJointOffset> = {};
  for (const track of animation.tracks) {
    const joint = mutable[track.jointId] ?? {};
    const value = trackValue(track, sampleTime);
    if (track.property === "position" && typeof value === "object") {
      joint.position = value;
    } else if (track.property === "rotation" && typeof value === "number") {
      joint.rotationDegrees = value;
    } else if (track.property === "scale" && typeof value === "object") {
      joint.scale = value;
    }
    mutable[track.jointId] = joint;
  }
  return Object.freeze({
    animationId: animation.animationId,
    inputTime: round(inputTime),
    sampleTime,
    joints: Object.freeze(
      Object.fromEntries(
        Object.entries(mutable)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([jointId, value]) => [jointId, Object.freeze({ ...value })]),
      ),
    ),
  });
}

export function composeJointPose(
  rest: JointRestPose,
  offset: Readonly<SampledJointOffset> | undefined,
): JointFinalPose {
  return Object.freeze({
    position: Object.freeze({
      x: round(rest.position.x + (offset?.position?.x ?? 0)),
      y: round(rest.position.y + (offset?.position?.y ?? 0)),
    }),
    rotationDegrees: round(
      rest.rotationDegrees + (offset?.rotationDegrees ?? 0),
    ),
    scale: Object.freeze({
      x: round(rest.scale.x * (offset?.scale?.x ?? 1)),
      y: round(rest.scale.y * (offset?.scale?.y ?? 1)),
    }),
  });
}

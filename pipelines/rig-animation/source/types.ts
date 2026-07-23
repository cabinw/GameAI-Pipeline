export interface AnimationVector2 {
  x: number;
  y: number;
}

export type AnimationProperty = "position" | "rotation" | "scale";
export type AnimationInterpolation = "linear" | "step";
export type AnimationEasing =
  | "linear"
  | "ease-in-sine"
  | "ease-out-sine"
  | "ease-in-out-sine";

export interface RigAnimationKeyframe {
  time: number;
  value: number | AnimationVector2;
  interpolation: AnimationInterpolation;
  easing: AnimationEasing;
}

export interface RigAnimationTrack {
  jointId: string;
  property: AnimationProperty;
  keyframes: RigAnimationKeyframe[];
}

export interface RigAnimation {
  schemaVersion: string;
  animationId: string;
  rig: {
    rigId: string;
    schemaVersion: string;
  };
  duration: number;
  loop: boolean;
  tracks: RigAnimationTrack[];
}

export interface RigAnimationValidationContext {
  rigId: string;
  rigSchemaVersion: string;
  jointIds: ReadonlySet<string>;
}

export interface NormalizedAnimationKeyframe {
  readonly time: number;
  readonly value: number | Readonly<AnimationVector2>;
  readonly interpolation: AnimationInterpolation;
  readonly easing: AnimationEasing;
}

export interface NormalizedAnimationTrack {
  readonly jointId: string;
  readonly property: AnimationProperty;
  readonly keyframes: readonly NormalizedAnimationKeyframe[];
}

export interface NormalizedRigAnimation {
  readonly schemaVersion: string;
  readonly animationId: string;
  readonly rigId: string;
  readonly rigSchemaVersion: string;
  readonly duration: number;
  readonly loop: boolean;
  readonly tracks: readonly NormalizedAnimationTrack[];
}

export interface SampledJointOffset {
  position?: Readonly<AnimationVector2>;
  rotationDegrees?: number;
  scale?: Readonly<AnimationVector2>;
}

export interface RigAnimationSample {
  readonly animationId: string;
  readonly inputTime: number;
  readonly sampleTime: number;
  readonly joints: Readonly<Record<string, Readonly<SampledJointOffset>>>;
}

export interface JointRestPose {
  readonly position: Readonly<AnimationVector2>;
  readonly rotationDegrees: number;
  readonly scale: Readonly<AnimationVector2>;
}

export interface JointFinalPose {
  readonly position: Readonly<AnimationVector2>;
  readonly rotationDegrees: number;
  readonly scale: Readonly<AnimationVector2>;
}

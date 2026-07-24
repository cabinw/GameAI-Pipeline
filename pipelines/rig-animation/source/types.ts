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

export interface RigHierarchyJoint {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly restPose: JointRestPose;
}

export type RigHierarchyErrorCode =
  | "DUPLICATE_HIERARCHY_JOINT"
  | "INVALID_HIERARCHY_ROOT_COUNT"
  | "UNKNOWN_HIERARCHY_PARENT"
  | "HIERARCHY_PARENT_CYCLE"
  | "NON_FINITE_HIERARCHY_TRANSFORM";

export interface RigHierarchyDiagnostic {
  readonly code: RigHierarchyErrorCode;
  readonly jointId?: string;
  readonly message: string;
}

export interface AffineTransform2D {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly tx: number;
  readonly ty: number;
}

export interface EvaluatedJointPose {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly localPose: JointFinalPose;
  readonly worldTransform: AffineTransform2D;
  readonly worldPivot: Readonly<AnimationVector2>;
}

export interface EvaluatedRigPose {
  readonly joints: Readonly<Record<string, EvaluatedJointPose>>;
  readonly evaluationOrder: readonly string[];
}

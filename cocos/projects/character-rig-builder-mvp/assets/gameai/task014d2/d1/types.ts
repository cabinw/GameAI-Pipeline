// Exact generated TASK-014D1 source mirror. Do not hand-edit.
export type VfxLifecycle = "one-shot" | "looping" | "persistent";
export type SemanticCommandMode = "emit" | "start-stop";
export type VfxPrimitive =
  | "sprite-quad"
  | "ring"
  | "ribbon"
  | "burst-particles";
export type VfxBlendRole = "alpha" | "additive" | "multiply" | "screen";
export type VfxParameterType = "number" | "integer" | "color";
export type VfxBindingTarget = "opacity" | "scale-x" | "scale-y" | "color";
export type VfxBindingOperation = "multiply" | "replace";
export type VfxResourceRecipeKind =
  | "textured-sprite"
  | "procedural-ring"
  | "procedural-ribbon";

export interface VfxVector2 {
  readonly x: number;
  readonly y: number;
}

export interface VfxColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface VfxTransform {
  readonly position?: VfxVector2;
  readonly rotationDegrees?: number;
  readonly scale?: VfxVector2;
}

export interface VfxCurveKeyframe {
  readonly time: number;
  readonly value: number;
}

export interface VfxEmission {
  readonly count: number;
  readonly ratePerSecond: number;
}

export interface VfxParameterDefinition {
  readonly parameterId: string;
  readonly type: VfxParameterType;
  readonly default: unknown;
  readonly minimum?: number;
  readonly maximum?: number;
}

export interface VfxParameterBinding {
  readonly parameterId: string;
  readonly layerId: string;
  readonly target: VfxBindingTarget;
  readonly operation: VfxBindingOperation;
}

export interface VfxAuthoringLayer {
  readonly layerId: string;
  readonly order: number;
  readonly primitive: string;
  readonly logicalResourceId: string;
  readonly durationSeconds: number;
  readonly delaySeconds?: number;
  readonly transform?: VfxTransform;
  readonly color?: VfxColor;
  readonly opacity?: number;
  readonly scaleCurve?: readonly VfxCurveKeyframe[];
  readonly rotationCurve?: readonly VfxCurveKeyframe[];
  readonly emission?: VfxEmission;
  readonly blendRole?: VfxBlendRole;
}

export interface VfxAuthoringCue {
  readonly cueId: string;
  readonly lifecycle: VfxLifecycle;
  readonly deterministicSeed: number;
  readonly parameters?: readonly VfxParameterDefinition[];
  readonly bindings?: readonly VfxParameterBinding[];
  readonly layers: readonly VfxAuthoringLayer[];
}

export interface VfxAuthoringDocument {
  readonly schemaVersion: string;
  readonly cues: readonly VfxAuthoringCue[];
}

export interface SemanticCueDescriptor {
  readonly cueId: string;
  readonly commandMode: SemanticCommandMode;
  readonly lifecycle: VfxLifecycle;
}

export interface VfxResourceDescriptor {
  readonly resourceId: string;
  readonly recipeKind: VfxResourceRecipeKind;
  readonly compatiblePrimitives: readonly VfxPrimitive[];
}

export interface VfxCompileContext {
  readonly semanticCues: readonly SemanticCueDescriptor[];
  readonly resources: readonly VfxResourceDescriptor[];
  readonly parameterOverrides?: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
}

export interface VfxParticleSpawn {
  readonly particleIndex: number;
  readonly spawnTimeSeconds: number;
  readonly randomUint32: number;
}

export interface NormalizedVfxEmission {
  readonly count: number;
  readonly ratePerSecond: number;
  readonly schedule: readonly VfxParticleSpawn[];
  readonly prng: {
    readonly algorithm: "xorshift32-v1";
    readonly streamSeed: number;
    readonly zeroSeedFallback: 1831565813;
  };
}

export interface NormalizedVfxLayer {
  readonly layerId: string;
  readonly order: number;
  readonly primitive: VfxPrimitive;
  readonly resource: {
    readonly resourceId: string;
    readonly recipeKind: VfxResourceRecipeKind;
  };
  readonly timing: {
    readonly delaySeconds: number;
    readonly durationSeconds: number;
    readonly phaseMode: "once" | "repeat-until-semantic-stop";
    readonly exactEnd: "sample-phase-one";
    readonly removal: "after-final-sample" | "semantic-stop-only";
  };
  readonly transform: {
    readonly position: VfxVector2;
    readonly rotationDegrees: number;
    readonly scale: VfxVector2;
  };
  readonly color: VfxColor;
  readonly opacity: number;
  readonly effectiveAlpha: number;
  readonly scaleCurve: readonly VfxCurveKeyframe[];
  readonly rotationCurve: readonly VfxCurveKeyframe[];
  readonly emission: NormalizedVfxEmission | null;
  readonly blendRole: VfxBlendRole;
}

export interface NormalizedVfxCue {
  readonly cueId: string;
  readonly commandMode: SemanticCommandMode;
  readonly lifecycle: VfxLifecycle;
  readonly deterministicSeed: number;
  readonly layers: readonly NormalizedVfxLayer[];
}

export interface VfxExecutableSemantics {
  readonly curve: {
    readonly interpolation: "linear";
    readonly extrapolation: "clamp";
    readonly requiredEndpoints: readonly [0, 1];
    readonly scaleComposition: "multiply-base-scale";
    readonly rotationComposition: "add-unwrapped-degrees";
  };
  readonly alphaComposition: "color-a-times-opacity";
  readonly timeOrigin: "semantic-command-start";
  readonly canonicalTime: {
    readonly ticksPerSecond: 1_000_000_000_000;
    readonly maximumTick: 9_007_199_254_740_990;
    readonly rounding: "nearest-tick-ties-up";
  };
  readonly exactDurationBoundary: "ending-cycle-phase-one";
  readonly cleanupAuthority: "semantic-stop-reset-switch-dispose";
  readonly particleSchedule: "index-zero-based-delay-plus-index-over-rate";
  readonly zeroRateEmission: "all-at-delay";
  readonly prng: "xorshift32-v1-compiled-uint32";
}

export interface VfxRenderPlan {
  readonly planVersion: "1.0.0";
  readonly sourceSchemaVersion: string;
  readonly semantics: VfxExecutableSemantics;
  readonly cues: readonly NormalizedVfxCue[];
}

export interface VfxLayerSample {
  readonly active: boolean;
  readonly removed: boolean;
  readonly cycleIndex: number | null;
  readonly phase: number | null;
  readonly position: VfxVector2;
  readonly scale: VfxVector2;
  readonly rotationDegrees: number;
  readonly effectiveAlpha: number;
}

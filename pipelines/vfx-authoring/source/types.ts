export type VfxLifecycle = "one-shot" | "looping" | "persistent";
export type VfxPrimitive =
  | "sprite-quad"
  | "ring"
  | "ribbon"
  | "burst-particles";
export type VfxBlendRole = "alpha" | "additive" | "multiply" | "screen";
export type VfxParameterType = "number" | "integer" | "boolean" | "color";

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
  readonly layers: readonly VfxAuthoringLayer[];
}

export interface VfxAuthoringDocument {
  readonly schemaVersion: string;
  readonly cues: readonly VfxAuthoringCue[];
}

export interface VfxCompileContext {
  readonly semanticCueIds: readonly string[];
  readonly resourceIds: readonly string[];
  readonly parameterOverrides?: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
}

export interface NormalizedVfxParameter {
  readonly parameterId: string;
  readonly type: VfxParameterType;
  readonly value: unknown;
}

export interface NormalizedVfxLayer {
  readonly layerId: string;
  readonly order: number;
  readonly primitive: VfxPrimitive;
  readonly logicalResourceId: string;
  readonly durationSeconds: number;
  readonly delaySeconds: number;
  readonly transform: {
    readonly position: VfxVector2;
    readonly rotationDegrees: number;
    readonly scale: VfxVector2;
  };
  readonly color: VfxColor;
  readonly opacity: number;
  readonly scaleCurve: readonly VfxCurveKeyframe[];
  readonly rotationCurve: readonly VfxCurveKeyframe[];
  readonly emission: VfxEmission | null;
  readonly blendRole: VfxBlendRole;
}

export interface NormalizedVfxCue {
  readonly cueId: string;
  readonly lifecycle: VfxLifecycle;
  readonly deterministicSeed: number;
  readonly parameters: readonly NormalizedVfxParameter[];
  readonly layers: readonly NormalizedVfxLayer[];
}

export interface VfxRenderPlan {
  readonly planVersion: "1.0.0";
  readonly sourceSchemaVersion: string;
  readonly cues: readonly NormalizedVfxCue[];
}

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

import {
  VfxAuthoringErrorCode,
  sortVfxAuthoringDiagnostics,
  type VfxAuthoringDiagnostic,
  type VfxAuthoringResult,
} from "./diagnostics";
import type {
  NormalizedVfxCue,
  NormalizedVfxLayer,
  NormalizedVfxParameter,
  VfxAuthoringCue,
  VfxAuthoringDocument,
  VfxColor,
  VfxCompileContext,
  VfxCurveKeyframe,
  VfxParameterDefinition,
  VfxParameterType,
  VfxPrimitive,
  VfxRenderPlan,
} from "./types";

export const VFX_AUTHORING_BUDGETS = Object.freeze({
  maxCues: 64,
  maxLayersPerCue: 16,
  maxKeyframesPerCurve: 32,
  maxEmittedParticles: 4096,
  maxSerializedPlanBytes: 1_048_576,
});

const primitives = new Set<VfxPrimitive>([
  "sprite-quad",
  "ring",
  "ribbon",
  "burst-particles",
]);
const localSchema = resolve(__dirname, "schemas/vfx-cue-authoring.schema.json");
const builtSchema = resolve(
  __dirname,
  "../../dist/schemas/vfx-cue-authoring.schema.json",
);

export const vfxCueAuthoringSchema = JSON.parse(
  readFileSync(existsSync(localSchema) ? localSchema : builtSchema, "utf8"),
) as Record<string, unknown>;

const ajv = new Ajv({ allErrors: true, strict: true });
const validateShape = ajv.compile<VfxAuthoringDocument>(
  vfxCueAuthoringSchema,
) as ValidateFunction<VfxAuthoringDocument>;

function diagnostic(
  code: VfxAuthoringDiagnostic["code"],
  path: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): VfxAuthoringDiagnostic {
  return details === undefined
    ? { code, path, message }
    : { code, path, message, details };
}

function schemaPath(error: ErrorObject): string {
  if (error.keyword === "required") {
    return `${error.instancePath}/${String(error.params.missingProperty)}`;
  }
  if (error.keyword === "additionalProperties") {
    return `${error.instancePath}/${String(error.params.additionalProperty)}`;
  }
  return error.instancePath;
}

function schemaDiagnostics(): VfxAuthoringDiagnostic[] {
  return sortVfxAuthoringDiagnostics(
    (validateShape.errors ?? []).map((error) =>
      diagnostic(
        VfxAuthoringErrorCode.SCHEMA_VALIDATION_ERROR,
        schemaPath(error),
        `VFX authoring schema ${error.keyword} validation failed${
          error.message === undefined ? "." : `: ${error.message}.`
        }`,
        { keyword: error.keyword, params: error.params },
      ),
    ),
  );
}

function supportedVersion(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match !== null && Number(match[1]) === 1 && Number(match[2]) === 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validColor(value: unknown): value is VfxColor {
  if (typeof value !== "object" || value === null) return false;
  const color = value as Partial<VfxColor>;
  return [color.r, color.g, color.b, color.a].every(
    (channel) => finite(channel) && channel >= 0 && channel <= 1,
  );
}

function validCurve(
  curve: readonly VfxCurveKeyframe[],
  kind: "scale" | "rotation",
  path: string,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  if (curve.length === 0) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_CURVE,
        path,
        "A curve must contain at least one keyframe.",
      ),
    );
    return errors;
  }
  if (curve.length > VFX_AUTHORING_BUDGETS.maxKeyframesPerCurve) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        path,
        `Curve exceeds ${VFX_AUTHORING_BUDGETS.maxKeyframesPerCurve} keyframes.`,
      ),
    );
  }
  let previous = -Infinity;
  for (const [index, keyframe] of curve.entries()) {
    const keyPath = `${path}/${index}`;
    if (
      !finite(keyframe.time) ||
      keyframe.time < 0 ||
      keyframe.time > 1 ||
      !finite(keyframe.value) ||
      (kind === "scale" &&
        (keyframe.value < 0 || keyframe.value > 1000)) ||
      (kind === "rotation" && Math.abs(keyframe.value) > 36_000)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_CURVE,
          keyPath,
          `Invalid ${kind} curve keyframe.`,
        ),
      );
    }
    if (finite(keyframe.time) && keyframe.time <= previous) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_CURVE_TIME,
          `${keyPath}/time`,
          "Curve times must be unique and strictly increasing.",
        ),
      );
    }
    if (finite(keyframe.time)) previous = keyframe.time;
  }
  return errors;
}

function parameterValueValid(
  type: VfxParameterType,
  value: unknown,
  minimum: number | undefined,
  maximum: number | undefined,
): boolean {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "color") return validColor(value);
  if (!finite(value)) return false;
  if (type === "integer" && !Number.isInteger(value)) return false;
  return (
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  );
}

function validateParameters(
  cue: VfxAuthoringCue,
  cueIndex: number,
  context: VfxCompileContext,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  const seen = new Set<string>();
  const definitions = cue.parameters ?? [];
  for (const [index, parameter] of definitions.entries()) {
    const path = `/cues/${cueIndex}/parameters/${index}`;
    if (seen.has(parameter.parameterId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
          `${path}/parameterId`,
          `Duplicate parameter ${parameter.parameterId}.`,
        ),
      );
    }
    seen.add(parameter.parameterId);
    const numeric = parameter.type === "number" || parameter.type === "integer";
    if (
      (numeric &&
        (!finite(parameter.minimum) ||
          !finite(parameter.maximum) ||
          parameter.minimum > parameter.maximum)) ||
      (!numeric &&
        (parameter.minimum !== undefined || parameter.maximum !== undefined)) ||
      !parameterValueValid(
        parameter.type,
        parameter.default,
        parameter.minimum,
        parameter.maximum,
      )
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
          path,
          `Parameter ${parameter.parameterId} has an invalid type, range, or default.`,
        ),
      );
    }
  }
  const overrides = context.parameterOverrides?.[cue.cueId] ?? {};
  for (const [parameterId, value] of Object.entries(overrides)) {
    const definition = definitions.find(
      (candidate) => candidate.parameterId === parameterId,
    );
    if (
      definition === undefined ||
      !parameterValueValid(
        definition.type,
        value,
        definition.minimum,
        definition.maximum,
      )
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
          `/overrides/${cue.cueId}/${parameterId}`,
          `Override ${parameterId} is unknown or outside its declared type/range.`,
        ),
      );
    }
  }
  return errors;
}

function validateCue(
  cue: VfxAuthoringCue,
  cueIndex: number,
  context: VfxCompileContext,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  const cuePath = `/cues/${cueIndex}`;
  if (!context.semanticCueIds.includes(cue.cueId)) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.UNKNOWN_SEMANTIC_CUE_ID,
        `${cuePath}/cueId`,
        `Semantic cue ${cue.cueId} is not in the validation registry.`,
      ),
    );
  }
  if (
    !finite(cue.deterministicSeed) ||
    !Number.isInteger(cue.deterministicSeed) ||
    cue.deterministicSeed < 0 ||
    cue.deterministicSeed > 0xffff_ffff
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_DETERMINISTIC_SEED,
        `${cuePath}/deterministicSeed`,
        "Deterministic seed must be an unsigned 32-bit integer.",
      ),
    );
  }
  if (cue.layers.length > VFX_AUTHORING_BUDGETS.maxLayersPerCue) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        `${cuePath}/layers`,
        `Cue exceeds ${VFX_AUTHORING_BUDGETS.maxLayersPerCue} layers.`,
      ),
    );
  }
  const layerIds = new Set<string>();
  const orders = new Set<number>();
  for (const [layerIndex, layer] of cue.layers.entries()) {
    const path = `${cuePath}/layers/${layerIndex}`;
    if (layerIds.has(layer.layerId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.DUPLICATE_LAYER_ID,
          `${path}/layerId`,
          `Duplicate layer ID ${layer.layerId}.`,
        ),
      );
    }
    layerIds.add(layer.layerId);
    if (!Number.isInteger(layer.order) || layer.order < 0 || layer.order > 10_000) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.LAYER_ORDER_CONFLICT,
          `${path}/order`,
          "Layer order must be a unique integer from 0 through 10000.",
        ),
      );
    } else if (orders.has(layer.order)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.LAYER_ORDER_CONFLICT,
          `${path}/order`,
          `Layer order ${layer.order} is already used in this cue.`,
        ),
      );
    }
    orders.add(layer.order);
    if (!primitives.has(layer.primitive as VfxPrimitive)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.UNSUPPORTED_PRIMITIVE,
          `${path}/primitive`,
          `Unsupported primitive ${layer.primitive}.`,
        ),
      );
    }
    if (!context.resourceIds.includes(layer.logicalResourceId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.UNKNOWN_RESOURCE_ID,
          `${path}/logicalResourceId`,
          `Logical resource ${layer.logicalResourceId} is not in the registry.`,
        ),
      );
    }
    if (
      !finite(layer.durationSeconds) ||
      layer.durationSeconds <= 0 ||
      layer.durationSeconds > 60 ||
      (layer.delaySeconds !== undefined &&
        (!finite(layer.delaySeconds) ||
          layer.delaySeconds < 0 ||
          layer.delaySeconds > 60))
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_TIMING,
          path,
          "Layer duration must be in (0, 60] and delay in [0, 60] seconds.",
        ),
      );
    }
    const transform = layer.transform;
    if (
      transform !== undefined &&
      ((transform.position !== undefined &&
        (!finite(transform.position.x) ||
          !finite(transform.position.y) ||
          Math.abs(transform.position.x) > 100_000 ||
          Math.abs(transform.position.y) > 100_000)) ||
        (transform.rotationDegrees !== undefined &&
          (!finite(transform.rotationDegrees) ||
            Math.abs(transform.rotationDegrees) > 36_000)) ||
        (transform.scale !== undefined &&
          (!finite(transform.scale.x) ||
            !finite(transform.scale.y) ||
            transform.scale.x <= 0 ||
            transform.scale.y <= 0 ||
            transform.scale.x > 1000 ||
            transform.scale.y > 1000)))
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_TRANSFORM,
          `${path}/transform`,
          "Transform values must be finite and within documented bounds; scale must be positive.",
        ),
      );
    }
    if (
      (layer.color !== undefined && !validColor(layer.color)) ||
      (layer.opacity !== undefined &&
        (!finite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1))
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_COLOR_OR_OPACITY,
          path,
          "Color channels and opacity must be finite values in [0, 1].",
        ),
      );
    }
    if (layer.scaleCurve !== undefined) {
      errors.push(
        ...validCurve(layer.scaleCurve, "scale", `${path}/scaleCurve`),
      );
    }
    if (layer.rotationCurve !== undefined) {
      errors.push(
        ...validCurve(
          layer.rotationCurve,
          "rotation",
          `${path}/rotationCurve`,
        ),
      );
    }
    const isParticles = layer.primitive === "burst-particles";
    if (
      (isParticles &&
        (layer.emission === undefined ||
          !finite(layer.emission.count) ||
          !Number.isInteger(layer.emission.count) ||
          layer.emission.count <= 0 ||
          layer.emission.count > 4096 ||
          !finite(layer.emission.ratePerSecond) ||
          layer.emission.ratePerSecond < 0 ||
          layer.emission.ratePerSecond > 10_000)) ||
      (!isParticles && layer.emission !== undefined)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_EMISSION,
          `${path}/emission`,
          "Burst particles require bounded integer count/rate; other primitives forbid emission.",
        ),
      );
    }
    if (
      layer.primitive === "burst-particles" &&
      cue.lifecycle !== "one-shot"
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INCOMPATIBLE_LIFECYCLE_PRIMITIVE,
          `${path}/primitive`,
          `Primitive ${layer.primitive} is incompatible with ${cue.lifecycle}.`,
        ),
      );
    }
  }
  errors.push(...validateParameters(cue, cueIndex, context));
  return errors;
}

function semanticDiagnostics(
  document: VfxAuthoringDocument,
  context: VfxCompileContext,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  if (!supportedVersion(document.schemaVersion)) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.UNSUPPORTED_SCHEMA_VERSION,
        "/schemaVersion",
        `Unsupported VFX authoring schema version ${document.schemaVersion}.`,
      ),
    );
  }
  if (document.cues.length > VFX_AUTHORING_BUDGETS.maxCues) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        "/cues",
        `Document exceeds ${VFX_AUTHORING_BUDGETS.maxCues} cues.`,
      ),
    );
  }
  const cueIds = new Set<string>();
  let emittedParticles = 0;
  for (const [cueIndex, cue] of document.cues.entries()) {
    if (cueIds.has(cue.cueId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.DUPLICATE_CUE_ID,
          `/cues/${cueIndex}/cueId`,
          `Duplicate cue ID ${cue.cueId}.`,
        ),
      );
    }
    cueIds.add(cue.cueId);
    for (const layer of cue.layers) {
      if (
        layer.primitive === "burst-particles" &&
        finite(layer.emission?.count)
      ) {
        emittedParticles += layer.emission.count;
      }
    }
    errors.push(...validateCue(cue, cueIndex, context));
  }
  if (
    !Number.isSafeInteger(emittedParticles) ||
    emittedParticles > VFX_AUTHORING_BUDGETS.maxEmittedParticles
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        "/cues",
        `Plan exceeds ${VFX_AUTHORING_BUDGETS.maxEmittedParticles} emitted particles.`,
      ),
    );
  }
  return sortVfxAuthoringDiagnostics(errors);
}

function normalizeParameter(
  parameter: VfxParameterDefinition,
  override: unknown,
): NormalizedVfxParameter {
  return {
    parameterId: parameter.parameterId,
    type: parameter.type,
    value: override === undefined ? structuredClone(parameter.default) : structuredClone(override),
  };
}

function normalizeLayer(layer: VfxAuthoringCue["layers"][number]): NormalizedVfxLayer {
  return {
    layerId: layer.layerId,
    order: layer.order,
    primitive: layer.primitive as VfxPrimitive,
    logicalResourceId: layer.logicalResourceId,
    durationSeconds: layer.durationSeconds,
    delaySeconds: layer.delaySeconds ?? 0,
    transform: {
      position: {
        x: layer.transform?.position?.x ?? 0,
        y: layer.transform?.position?.y ?? 0,
      },
      rotationDegrees: layer.transform?.rotationDegrees ?? 0,
      scale: {
        x: layer.transform?.scale?.x ?? 1,
        y: layer.transform?.scale?.y ?? 1,
      },
    },
    color: layer.color === undefined
      ? { r: 1, g: 1, b: 1, a: 1 }
      : { ...layer.color },
    opacity: layer.opacity ?? 1,
    scaleCurve:
      layer.scaleCurve?.map((keyframe) => ({ ...keyframe })) ??
      [{ time: 0, value: 1 }, { time: 1, value: 1 }],
    rotationCurve:
      layer.rotationCurve?.map((keyframe) => ({ ...keyframe })) ??
      [{ time: 0, value: 0 }, { time: 1, value: 0 }],
    emission: layer.emission === undefined ? null : { ...layer.emission },
    blendRole: layer.blendRole ?? "alpha",
  };
}

function normalizeCue(
  cue: VfxAuthoringCue,
  context: VfxCompileContext,
): NormalizedVfxCue {
  const overrides = context.parameterOverrides?.[cue.cueId] ?? {};
  return {
    cueId: cue.cueId,
    lifecycle: cue.lifecycle,
    deterministicSeed: cue.deterministicSeed,
    parameters: [...(cue.parameters ?? [])]
      .sort((left, right) => left.parameterId.localeCompare(right.parameterId))
      .map((parameter) =>
        normalizeParameter(parameter, overrides[parameter.parameterId]),
      ),
    layers: [...cue.layers]
      .sort(
        (left, right) =>
          left.order - right.order ||
          left.layerId.localeCompare(right.layerId),
      )
      .map(normalizeLayer),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

export function serializeVfxRenderPlan(plan: VfxRenderPlan): string {
  return `${JSON.stringify(stableValue(plan))}\n`;
}

export function compileVfxAuthoring(
  value: unknown,
  context: VfxCompileContext,
): VfxAuthoringResult<{
  readonly plan: VfxRenderPlan;
  readonly serialized: string;
}> {
  if (!validateShape(value)) {
    return { ok: false, errors: schemaDiagnostics() };
  }
  const errors = semanticDiagnostics(value, context);
  if (errors.length > 0) return { ok: false, errors };
  const plan: VfxRenderPlan = {
    planVersion: "1.0.0",
    sourceSchemaVersion: value.schemaVersion,
    cues: [...value.cues]
      .sort((left, right) => left.cueId.localeCompare(right.cueId))
      .map((cue) => normalizeCue(cue, context)),
  };
  const serialized = serializeVfxRenderPlan(plan);
  const size = Buffer.byteLength(serialized, "utf8");
  if (size > VFX_AUTHORING_BUDGETS.maxSerializedPlanBytes) {
    return {
      ok: false,
      errors: [
        diagnostic(
          VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
          "",
          `Serialized render plan is ${size} bytes; maximum is ${VFX_AUTHORING_BUDGETS.maxSerializedPlanBytes}.`,
        ),
      ],
    };
  }
  return { ok: true, value: { plan, serialized }, errors: [] };
}

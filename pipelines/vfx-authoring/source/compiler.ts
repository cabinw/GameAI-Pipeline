import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

import {
  VfxAuthoringErrorCode,
  sortVfxAuthoringDiagnostics,
  type VfxAuthoringDiagnostic,
  type VfxAuthoringResult,
} from "./diagnostics";
import {
  VFX_EXECUTABLE_SEMANTICS,
  compareCodeUnits,
  nextXorshift32,
} from "./semantics";
import type {
  NormalizedVfxCue,
  NormalizedVfxEmission,
  NormalizedVfxLayer,
  SemanticCueDescriptor,
  VfxAuthoringCue,
  VfxAuthoringDocument,
  VfxColor,
  VfxCompileContext,
  VfxCurveKeyframe,
  VfxParameterDefinition,
  VfxParameterType,
  VfxPrimitive,
  VfxRenderPlan,
  VfxResourceDescriptor,
  VfxResourceRecipeKind,
} from "./types";

export const VFX_AUTHORING_BUDGETS = Object.freeze({
  maxCues: 64,
  maxLayersPerCue: 16,
  maxParametersPerCue: 32,
  maxBindingsPerCue: 64,
  maxBindingsPerParameter: 16,
  maxOverrideCues: 64,
  maxOverridesPerCue: 32,
  maxSemanticCueDescriptors: 128,
  maxResourceDescriptors: 128,
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
const commandModes = new Set(["emit", "start-stop"]);
const recipeKinds = new Set<VfxResourceRecipeKind>([
  "textured-sprite",
  "procedural-ring",
  "procedural-ribbon",
]);
const recipePrimitiveCapabilities: Readonly<
  Record<VfxResourceRecipeKind, ReadonlySet<VfxPrimitive>>
> = {
  "textured-sprite": new Set(["sprite-quad", "burst-particles"]),
  "procedural-ring": new Set(["ring"]),
  "procedural-ribbon": new Set(["ribbon"]),
};
const identifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const resourcePattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

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

function exactObjectKeys(
  value: object,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort(compareCodeUnits);
  const wanted = [...expected].sort(compareCodeUnits);
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function validColor(value: unknown): value is VfxColor {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !exactObjectKeys(value, ["r", "g", "b", "a"])
  ) {
    return false;
  }
  const color = value as Partial<VfxColor>;
  return [color.r, color.g, color.b, color.a].every(
    (channel) => finite(channel) && channel >= 0 && channel <= 1,
  );
}

function normalizedColor(value: VfxColor): VfxColor {
  return { r: value.r, g: value.g, b: value.b, a: value.a };
}

function canonicalDecimal(value: number): number {
  return Number(value.toFixed(12));
}

function validCurve(
  curve: readonly VfxCurveKeyframe[],
  kind: "scale" | "rotation",
  path: string,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  if (
    curve.length < 2 ||
    curve[0]?.time !== 0 ||
    curve[curve.length - 1]?.time !== 1
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_CURVE,
        path,
        "A curve must contain at least two keyframes with exact endpoints at time 0 and 1.",
      ),
    );
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
  if (type === "color") return validColor(value);
  if (!finite(value)) return false;
  if (type === "integer" && !Number.isInteger(value)) return false;
  return (
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  );
}

interface ValidatedContext {
  readonly context: VfxCompileContext;
  readonly semanticCues: ReadonlyMap<string, SemanticCueDescriptor>;
  readonly resources: ReadonlyMap<string, VfxResourceDescriptor>;
}

function validateContext(
  context: VfxCompileContext,
): VfxAuthoringResult<ValidatedContext> {
  const errors: VfxAuthoringDiagnostic[] = [];
  if (!Array.isArray(context?.semanticCues)) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_SEMANTIC_CUE_REGISTRY,
        "/context/semanticCues",
        "Semantic cue registry must be an array of typed descriptors.",
      ),
    );
  }
  if (!Array.isArray(context?.resources)) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_RESOURCE_REGISTRY,
        "/context/resources",
        "Resource registry must be an array of typed descriptors.",
      ),
    );
  }
  if (errors.length > 0) {
    return { ok: false, errors: sortVfxAuthoringDiagnostics(errors) };
  }
  if (
    context.semanticCues.length >
    VFX_AUTHORING_BUDGETS.maxSemanticCueDescriptors
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        "/context/semanticCues",
        `Semantic cue registry exceeds ${VFX_AUTHORING_BUDGETS.maxSemanticCueDescriptors} descriptors.`,
      ),
    );
  }
  if (
    context.resources.length > VFX_AUTHORING_BUDGETS.maxResourceDescriptors
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        "/context/resources",
        `Resource registry exceeds ${VFX_AUTHORING_BUDGETS.maxResourceDescriptors} descriptors.`,
      ),
    );
  }
  const semanticCues = new Map<string, SemanticCueDescriptor>();
  for (const [index, descriptor] of context.semanticCues.entries()) {
    const path = `/context/semanticCues/${index}`;
    if (
      typeof descriptor !== "object" ||
      descriptor === null ||
      !exactObjectKeys(descriptor, ["cueId", "commandMode"]) ||
      typeof descriptor.cueId !== "string" ||
      descriptor.cueId.length > 80 ||
      !identifierPattern.test(descriptor.cueId) ||
      !commandModes.has(descriptor.commandMode)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_SEMANTIC_CUE_REGISTRY,
          path,
          "Semantic cue descriptor must contain only a valid cueId and commandMode.",
        ),
      );
      continue;
    }
    if (semanticCues.has(descriptor.cueId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_SEMANTIC_CUE_REGISTRY,
          `${path}/cueId`,
          `Duplicate or contradictory semantic cue descriptor ${descriptor.cueId}.`,
        ),
      );
      continue;
    }
    semanticCues.set(descriptor.cueId, descriptor);
  }
  const resources = new Map<string, VfxResourceDescriptor>();
  for (const [index, descriptor] of context.resources.entries()) {
    const path = `/context/resources/${index}`;
    const compatible = descriptor?.compatiblePrimitives;
    if (
      typeof descriptor !== "object" ||
      descriptor === null ||
      !exactObjectKeys(descriptor, [
        "resourceId",
        "recipeKind",
        "compatiblePrimitives",
      ]) ||
      typeof descriptor.resourceId !== "string" ||
      descriptor.resourceId.length > 128 ||
      !resourcePattern.test(descriptor.resourceId) ||
      !recipeKinds.has(descriptor.recipeKind) ||
      !Array.isArray(compatible) ||
      compatible.length === 0 ||
      compatible.some(
        (primitive) => !primitives.has(primitive as VfxPrimitive),
      ) ||
      new Set(compatible).size !== compatible.length ||
      compatible.some(
        (primitive) =>
          !recipePrimitiveCapabilities[
            descriptor.recipeKind as VfxResourceRecipeKind
          ].has(primitive as VfxPrimitive),
      )
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_RESOURCE_REGISTRY,
          path,
          "Resource descriptor must have a valid ID, recipe kind, and unique compatible primitives supported by that recipe.",
        ),
      );
      continue;
    }
    if (resources.has(descriptor.resourceId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_RESOURCE_REGISTRY,
          `${path}/resourceId`,
          `Duplicate or contradictory resource descriptor ${descriptor.resourceId}.`,
        ),
      );
      continue;
    }
    resources.set(descriptor.resourceId, descriptor);
  }
  const overrides = context.parameterOverrides;
  if (
    overrides !== undefined &&
    (typeof overrides !== "object" ||
      overrides === null ||
      Array.isArray(overrides))
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
        "/context/parameterOverrides",
        "Parameter overrides must be an object keyed by cue ID.",
      ),
    );
  } else if (overrides !== undefined) {
    const cueEntries = Object.entries(overrides);
    if (cueEntries.length > VFX_AUTHORING_BUDGETS.maxOverrideCues) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
          "/context/parameterOverrides",
          `Override map exceeds ${VFX_AUTHORING_BUDGETS.maxOverrideCues} cues.`,
        ),
      );
    }
    for (const [cueId, cueOverrides] of cueEntries) {
      if (
        typeof cueOverrides !== "object" ||
        cueOverrides === null ||
        Array.isArray(cueOverrides)
      ) {
        errors.push(
          diagnostic(
            VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
            `/overrides/${cueId}`,
            "Cue overrides must be an object keyed by parameter ID.",
          ),
        );
      } else if (
        Object.keys(cueOverrides).length >
        VFX_AUTHORING_BUDGETS.maxOverridesPerCue
      ) {
        errors.push(
          diagnostic(
            VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
            `/overrides/${cueId}`,
            `Cue exceeds ${VFX_AUTHORING_BUDGETS.maxOverridesPerCue} overrides.`,
          ),
        );
      }
    }
  }
  return errors.length === 0
    ? {
        ok: true,
        value: { context, semanticCues, resources },
        errors: [],
      }
    : { ok: false, errors: sortVfxAuthoringDiagnostics(errors) };
}

function validateParametersAndBindings(
  cue: VfxAuthoringCue,
  cueIndex: number,
  context: VfxCompileContext,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  const definitions = cue.parameters ?? [];
  const bindings = cue.bindings ?? [];
  const definitionById = new Map<string, VfxParameterDefinition>();
  const layerIds = new Set(cue.layers.map((layer) => layer.layerId));
  if (definitions.length > VFX_AUTHORING_BUDGETS.maxParametersPerCue) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        `/cues/${cueIndex}/parameters`,
        `Cue exceeds ${VFX_AUTHORING_BUDGETS.maxParametersPerCue} parameters.`,
      ),
    );
  }
  if (bindings.length > VFX_AUTHORING_BUDGETS.maxBindingsPerCue) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
        `/cues/${cueIndex}/bindings`,
        `Cue exceeds ${VFX_AUTHORING_BUDGETS.maxBindingsPerCue} bindings.`,
      ),
    );
  }
  for (const [index, parameter] of definitions.entries()) {
    const path = `/cues/${cueIndex}/parameters/${index}`;
    if (definitionById.has(parameter.parameterId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
          `${path}/parameterId`,
          `Duplicate parameter ${parameter.parameterId}.`,
        ),
      );
    }
    definitionById.set(parameter.parameterId, parameter);
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
          `Parameter ${parameter.parameterId} has an invalid type, range, or exact default shape.`,
        ),
      );
    }
  }
  const boundCounts = new Map<string, number>();
  const boundTargets = new Set<string>();
  for (const [index, binding] of bindings.entries()) {
    const path = `/cues/${cueIndex}/bindings/${index}`;
    const definition = definitionById.get(binding.parameterId);
    const validNumericTarget =
      definition !== undefined &&
      (definition.type === "number" || definition.type === "integer") &&
      (binding.target === "opacity" ||
        binding.target === "scale-x" ||
        binding.target === "scale-y") &&
      binding.operation === "multiply";
    const validColorTarget =
      definition?.type === "color" &&
      binding.target === "color" &&
      binding.operation === "replace";
    if (
      definition === undefined ||
      !layerIds.has(binding.layerId) ||
      (!validNumericTarget && !validColorTarget)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_PARAMETER_BINDING,
          path,
          "Binding references must exist and use number/integer multiply for opacity/scale or color replace for color.",
        ),
      );
      continue;
    }
    const targetKey = `${binding.layerId}\u0000${binding.target}`;
    if (boundTargets.has(targetKey)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.CONFLICTING_PARAMETER_BINDING,
          path,
          `Layer target ${binding.layerId}.${binding.target} has more than one binding.`,
        ),
      );
    }
    boundTargets.add(targetKey);
    boundCounts.set(
      binding.parameterId,
      (boundCounts.get(binding.parameterId) ?? 0) + 1,
    );
  }
  for (const parameter of definitions) {
    const count = boundCounts.get(parameter.parameterId) ?? 0;
    if (
      count === 0 ||
      count > VFX_AUTHORING_BUDGETS.maxBindingsPerParameter
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_PARAMETER_BINDING,
          `/cues/${cueIndex}/parameters/${parameter.parameterId}`,
          `Parameter ${parameter.parameterId} must bind between 1 and ${VFX_AUTHORING_BUDGETS.maxBindingsPerParameter} concrete layer targets.`,
        ),
      );
    }
  }
  if (definitions.length === 0 && bindings.length > 0) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INVALID_PARAMETER_BINDING,
        `/cues/${cueIndex}/bindings`,
        "Bindings require declared parameters.",
      ),
    );
  }
  const overrides = context.parameterOverrides?.[cue.cueId] ?? {};
  for (const [parameterId, value] of Object.entries(overrides)) {
    const definition = definitionById.get(parameterId);
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
          `Override ${parameterId} is unknown, has extra color fields, or is outside its declared type/range.`,
        ),
      );
    }
  }
  return errors;
}

function validateCue(
  cue: VfxAuthoringCue,
  cueIndex: number,
  validated: ValidatedContext,
): VfxAuthoringDiagnostic[] {
  const errors: VfxAuthoringDiagnostic[] = [];
  const cuePath = `/cues/${cueIndex}`;
  const semanticDescriptor = validated.semanticCues.get(cue.cueId);
  if (semanticDescriptor === undefined) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.UNKNOWN_SEMANTIC_CUE_ID,
        `${cuePath}/cueId`,
        `Semantic cue ${cue.cueId} is not in the descriptor registry.`,
      ),
    );
  } else if (
    (semanticDescriptor.commandMode === "emit" &&
      cue.lifecycle !== "one-shot") ||
    (semanticDescriptor.commandMode === "start-stop" &&
      cue.lifecycle === "one-shot")
  ) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.INCOMPATIBLE_SEMANTIC_LIFECYCLE,
        `${cuePath}/lifecycle`,
        `Semantic ${semanticDescriptor.commandMode} mode is incompatible with ${cue.lifecycle}.`,
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
  if (cue.layers.length === 0) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.EMPTY_CUE_LAYERS,
        `${cuePath}/layers`,
        `Cue ${cue.cueId} must contain at least one layer.`,
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
    if (
      !Number.isInteger(layer.order) ||
      layer.order < 0 ||
      layer.order > 10_000
    ) {
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
    const primitiveSupported = primitives.has(layer.primitive as VfxPrimitive);
    if (!primitiveSupported) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.UNSUPPORTED_PRIMITIVE,
          `${path}/primitive`,
          `Unsupported primitive ${layer.primitive}.`,
        ),
      );
    }
    const resource = validated.resources.get(layer.logicalResourceId);
    if (resource === undefined) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.UNKNOWN_RESOURCE_ID,
          `${path}/logicalResourceId`,
          `Logical resource ${layer.logicalResourceId} is not in the descriptor registry.`,
        ),
      );
    } else if (
      primitiveSupported &&
      !resource.compatiblePrimitives.includes(layer.primitive as VfxPrimitive)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INCOMPATIBLE_RESOURCE_PRIMITIVE,
          `${path}/logicalResourceId`,
          `Resource ${resource.resourceId} does not support ${layer.primitive}.`,
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
          "Color channels and opacity must be exact finite values in [0, 1].",
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
          layer.emission.ratePerSecond > 10_000 ||
          (layer.emission.ratePerSecond > 0 &&
            (layer.emission.count - 1) / layer.emission.ratePerSecond >
              layer.durationSeconds))) ||
      (!isParticles && layer.emission !== undefined)
    ) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.INVALID_EMISSION,
          `${path}/emission`,
          "Burst emission must be bounded and its final delay + index/rate spawn must fit the layer lifetime; rate zero means all particles spawn at delay.",
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
  errors.push(
    ...validateParametersAndBindings(
      cue,
      cueIndex,
      validated.context,
    ),
  );
  return errors;
}

function semanticDiagnostics(
  document: VfxAuthoringDocument,
  validated: ValidatedContext,
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
  if (document.cues.length === 0) {
    errors.push(
      diagnostic(
        VfxAuthoringErrorCode.EMPTY_DOCUMENT,
        "/cues",
        "VFX authoring document must contain at least one cue.",
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
  const authoredCueIds = new Set(document.cues.map((cue) => cue.cueId));
  for (const cueId of Object.keys(
    validated.context.parameterOverrides ?? {},
  )) {
    if (!authoredCueIds.has(cueId)) {
      errors.push(
        diagnostic(
          VfxAuthoringErrorCode.UNKNOWN_OVERRIDE_CUE,
          `/overrides/${cueId}`,
          `Override cue ${cueId} is not declared by the authoring document.`,
        ),
      );
    }
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
    errors.push(...validateCue(cue, cueIndex, validated));
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

function resolveParameterValues(
  cue: VfxAuthoringCue,
  context: VfxCompileContext,
): ReadonlyMap<string, unknown> {
  const overrides = context.parameterOverrides?.[cue.cueId] ?? {};
  return new Map(
    (cue.parameters ?? []).map((parameter) => [
      parameter.parameterId,
      parameter.type === "color"
        ? normalizedColor(
            (overrides[parameter.parameterId] ??
              parameter.default) as VfxColor,
          )
        : (overrides[parameter.parameterId] ?? parameter.default),
    ]),
  );
}

function normalizedEmission(
  cue: VfxAuthoringCue,
  layer: VfxAuthoringCue["layers"][number],
  delaySeconds: number,
): NormalizedVfxEmission | null {
  if (layer.emission === undefined) return null;
  const initialSeed = (cue.deterministicSeed ^ layer.order) >>> 0;
  const streamSeed = initialSeed === 0 ? 1831565813 : initialSeed;
  let state = streamSeed;
  const schedule = Array.from(
    { length: layer.emission.count },
    (_, particleIndex) => {
      state = nextXorshift32(state);
      return {
        particleIndex,
        spawnTimeSeconds:
          layer.emission?.ratePerSecond === 0
            ? delaySeconds
            : canonicalDecimal(
                delaySeconds +
                  particleIndex / (layer.emission?.ratePerSecond ?? 1),
              ),
        randomUint32: state,
      };
    },
  );
  return {
    count: layer.emission.count,
    ratePerSecond: layer.emission.ratePerSecond,
    schedule,
    prng: {
      algorithm: "xorshift32-v1",
      streamSeed,
      zeroSeedFallback: 1831565813,
    },
  };
}

function normalizeLayer(
  cue: VfxAuthoringCue,
  layer: VfxAuthoringCue["layers"][number],
  resource: VfxResourceDescriptor,
  values: ReadonlyMap<string, unknown>,
): NormalizedVfxLayer {
  const transform = {
    position: {
      x: layer.transform?.position?.x ?? 0,
      y: layer.transform?.position?.y ?? 0,
    },
    rotationDegrees: layer.transform?.rotationDegrees ?? 0,
    scale: {
      x: layer.transform?.scale?.x ?? 1,
      y: layer.transform?.scale?.y ?? 1,
    },
  };
  let color: VfxColor =
    layer.color === undefined
      ? { r: 1, g: 1, b: 1, a: 1 }
      : normalizedColor(layer.color);
  let opacity = layer.opacity ?? 1;
  for (const binding of [...(cue.bindings ?? [])]
    .filter((candidate) => candidate.layerId === layer.layerId)
    .sort(
      (left, right) =>
        compareCodeUnits(left.target, right.target) ||
        compareCodeUnits(left.parameterId, right.parameterId),
    )) {
    const value = values.get(binding.parameterId);
    if (binding.target === "color") {
      color = normalizedColor(value as VfxColor);
    } else if (binding.target === "opacity") {
      opacity = canonicalDecimal(opacity * (value as number));
    } else if (binding.target === "scale-x") {
      transform.scale.x = canonicalDecimal(
        transform.scale.x * (value as number),
      );
    } else {
      transform.scale.y = canonicalDecimal(
        transform.scale.y * (value as number),
      );
    }
  }
  const delaySeconds = layer.delaySeconds ?? 0;
  return {
    layerId: layer.layerId,
    order: layer.order,
    primitive: layer.primitive as VfxPrimitive,
    resource: {
      resourceId: resource.resourceId,
      recipeKind: resource.recipeKind,
    },
    timing: {
      delaySeconds,
      durationSeconds: layer.durationSeconds,
      phaseMode:
        cue.lifecycle === "one-shot"
          ? "once"
          : "repeat-until-semantic-stop",
      exactEnd: "sample-phase-one",
      removal:
        cue.lifecycle === "one-shot"
          ? "after-final-sample"
          : "semantic-stop-only",
    },
    transform,
    color,
    opacity,
    effectiveAlpha: canonicalDecimal(color.a * opacity),
    scaleCurve:
      layer.scaleCurve?.map((keyframe) => ({ ...keyframe })) ??
      [{ time: 0, value: 1 }, { time: 1, value: 1 }],
    rotationCurve:
      layer.rotationCurve?.map((keyframe) => ({ ...keyframe })) ??
      [{ time: 0, value: 0 }, { time: 1, value: 0 }],
    emission: normalizedEmission(cue, layer, delaySeconds),
    blendRole: layer.blendRole ?? "alpha",
  };
}

function validNormalizedLayer(layer: NormalizedVfxLayer): boolean {
  return (
    finite(layer.opacity) &&
    layer.opacity >= 0 &&
    layer.opacity <= 1 &&
    finite(layer.transform.scale.x) &&
    finite(layer.transform.scale.y) &&
    layer.transform.scale.x > 0 &&
    layer.transform.scale.y > 0 &&
    layer.transform.scale.x <= 1000 &&
    layer.transform.scale.y <= 1000 &&
    validColor(layer.color) &&
    finite(layer.effectiveAlpha) &&
    layer.effectiveAlpha >= 0 &&
    layer.effectiveAlpha <= 1
  );
}

function normalizeCue(
  cue: VfxAuthoringCue,
  validated: ValidatedContext,
): VfxAuthoringResult<NormalizedVfxCue> {
  const values = resolveParameterValues(cue, validated.context);
  const layers = [...cue.layers]
    .sort(
      (left, right) =>
        left.order - right.order ||
        compareCodeUnits(left.layerId, right.layerId),
    )
    .map((layer) =>
      normalizeLayer(
        cue,
        layer,
        validated.resources.get(layer.logicalResourceId) as VfxResourceDescriptor,
        values,
      ),
    );
  const invalidLayer = layers.find((layer) => !validNormalizedLayer(layer));
  if (invalidLayer !== undefined) {
    return {
      ok: false,
      errors: [
        diagnostic(
          VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
          `/cues/${cue.cueId}/layers/${invalidLayer.layerId}`,
          "Resolved parameter bindings produce an out-of-range concrete layer value.",
        ),
      ],
    };
  }
  return {
    ok: true,
    value: {
      cueId: cue.cueId,
      commandMode: (
        validated.semanticCues.get(cue.cueId) as SemanticCueDescriptor
      ).commandMode,
      lifecycle: cue.lifecycle,
      deterministicSeed: cue.deterministicSeed,
      layers,
    },
    errors: [],
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareCodeUnits(left, right))
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
  const validatedContext = validateContext(context);
  if (!validatedContext.ok) return validatedContext;
  const errors = semanticDiagnostics(value, validatedContext.value);
  if (errors.length > 0) return { ok: false, errors };
  const normalizedCues: NormalizedVfxCue[] = [];
  for (const cue of [...value.cues].sort((left, right) =>
    compareCodeUnits(left.cueId, right.cueId),
  )) {
    const normalized = normalizeCue(cue, validatedContext.value);
    if (!normalized.ok) return normalized;
    normalizedCues.push(normalized.value);
  }
  const plan: VfxRenderPlan = {
    planVersion: "1.0.0",
    sourceSchemaVersion: value.schemaVersion,
    semantics: VFX_EXECUTABLE_SEMANTICS,
    cues: normalizedCues,
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

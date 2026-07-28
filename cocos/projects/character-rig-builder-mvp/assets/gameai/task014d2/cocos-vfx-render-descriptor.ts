// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.
import {
  VFX_EXECUTABLE_SEMANTICS,
  compareCodeUnits,
  type NormalizedVfxLayer,
  type SemanticCommandMode,
  type VfxBlendRole,
  type VfxLifecycle,
  type VfxPrimitive,
  type VfxRenderPlan,
  type VfxResourceRecipeKind,
} from "./d1/index";

import {
  CocosVfxPlanErrorCode,
  type CocosVfxPlanDiagnostic,
  type CocosVfxResult,
} from "./cocos-vfx-diagnostics";

export const COCOS_VFX_PLAN_BUDGETS = Object.freeze({
  maxCues: 64,
  maxLayers: 256,
  maxLayersPerCue: 16,
  maxParticles: 4096,
  maxResources: 128,
  maxCapabilitiesPerResource: 8,
});

export const COCOS_VFX_SORTING = Object.freeze({
  vfxMinimum: 1000,
  vfxMaximum: 1100,
  debug: 2000,
  hud: 3000,
});

export type CocosVfxRendererKind =
  | "sprite"
  | "graphics-ring"
  | "graphics-ribbon"
  | "sprite-particles";

export type CocosVfxBlendFactor =
  | "src-alpha"
  | "one-minus-src-alpha"
  | "one"
  | "dst-color"
  | "one-minus-src-color";

export interface CocosVfxBlendState {
  readonly source: CocosVfxBlendFactor;
  readonly destination: CocosVfxBlendFactor;
}

export interface CocosVfxResourceRecipe {
  readonly resourceId: string;
  readonly recipeKind: VfxResourceRecipeKind;
  readonly compatiblePrimitives: readonly VfxPrimitive[];
  readonly compatibleBlendRoles: readonly VfxBlendRole[];
}

export interface CocosVfxLayerDescriptor {
  readonly descriptorId: string;
  readonly cueId: string;
  readonly layerId: string;
  readonly primitive: VfxPrimitive;
  readonly recipeKind: VfxResourceRecipeKind;
  readonly rendererKind: CocosVfxRendererKind;
  readonly resourceId: string;
  readonly blendRole: VfxBlendRole;
  readonly blendState: CocosVfxBlendState;
  readonly lifecycle: VfxLifecycle;
  readonly commandMode: SemanticCommandMode;
  readonly sortingOrder: number;
  readonly layer: NormalizedVfxLayer;
}

export interface CocosVfxCueDescriptor {
  readonly cueId: string;
  readonly lifecycle: VfxLifecycle;
  readonly commandMode: SemanticCommandMode;
  readonly layers: readonly CocosVfxLayerDescriptor[];
}

export interface CocosVfxDescriptorPlan {
  readonly descriptorVersion: "1.0.0";
  readonly sourcePlanVersion: "1.0.0";
  readonly cues: readonly CocosVfxCueDescriptor[];
}

const lifecycleValues = new Set(["one-shot", "looping", "persistent"]);
const commandValues = new Set(["emit", "start-stop"]);
const primitiveValues = new Set([
  "sprite-quad",
  "ring",
  "ribbon",
  "burst-particles",
]);
const recipeValues = new Set([
  "textured-sprite",
  "procedural-ring",
  "procedural-ribbon",
]);
const blendValues = new Set(["alpha", "additive", "multiply", "screen"]);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function diagnostic(
  code: CocosVfxPlanDiagnostic["code"],
  path: string,
  message: string,
): CocosVfxPlanDiagnostic {
  return { code, path, message };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  const object = record(value);
  if (object === null) return value;
  const stable: Record<string, unknown> = {};
  for (const key of Object.keys(object).sort(compareCodeUnits)) {
    stable[key] = stableValue(object[key]);
  }
  return stable;
}

function stableDiagnostics(
  diagnostics: readonly CocosVfxPlanDiagnostic[],
): CocosVfxPlanDiagnostic[] {
  return [...diagnostics].sort(
    (left, right) =>
      compareCodeUnits(left.path, right.path) ||
      compareCodeUnits(left.code, right.code) ||
      compareCodeUnits(left.message, right.message),
  );
}

function hasDuplicate(values: readonly unknown[]): boolean {
  return new Set(values).size !== values.length;
}

function expectedMode(lifecycle: unknown): SemanticCommandMode | null {
  if (lifecycle === "one-shot") return "emit";
  if (lifecycle === "looping" || lifecycle === "persistent") {
    return "start-stop";
  }
  return null;
}

function validVector(value: unknown, positive: boolean): boolean {
  const object = record(value);
  return (
    object !== null &&
    finite(object.x) &&
    finite(object.y) &&
    (!positive || (object.x > 0 && object.y > 0))
  );
}

function validColor(value: unknown): boolean {
  const object = record(value);
  return (
    object !== null &&
    ["r", "g", "b", "a"].every(
      (key) => finite(object[key]) && (object[key] as number) >= 0 &&
        (object[key] as number) <= 1,
    )
  );
}

function validCurve(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 2) return false;
  let previous = -1;
  for (const [index, entry] of value.entries()) {
    if (!(index in value)) return false;
    const keyframe = record(entry);
    if (
      keyframe === null ||
      !finite(keyframe.time) ||
      !finite(keyframe.value) ||
      keyframe.time < 0 ||
      keyframe.time > 1 ||
      keyframe.time <= previous
    ) {
      return false;
    }
    previous = keyframe.time;
  }
  return record(value[0])?.time === 0 &&
    record(value[value.length - 1])?.time === 1;
}

function validLayerShape(layer: Record<string, unknown>): boolean {
  const timing = record(layer.timing);
  const transform = record(layer.transform);
  const color = record(layer.color);
  return (
    nonEmpty(layer.layerId) &&
    finite(layer.order) &&
    Number.isInteger(layer.order) &&
    timing !== null &&
    finite(timing.delaySeconds) &&
    timing.delaySeconds >= 0 &&
    finite(timing.durationSeconds) &&
    timing.durationSeconds > 0 &&
    transform !== null &&
    validVector(transform.position, false) &&
    finite(transform.rotationDegrees) &&
    validVector(transform.scale, true) &&
    validColor(layer.color) &&
    finite(layer.opacity) &&
    layer.opacity >= 0 &&
    layer.opacity <= 1 &&
    finite(layer.effectiveAlpha) &&
    layer.effectiveAlpha >= 0 &&
    layer.effectiveAlpha <= 1 &&
    color !== null &&
    layer.effectiveAlpha === Math.round(
      (color.a as number) * (layer.opacity as number) * 1e12,
    ) / 1e12 &&
    validCurve(layer.scaleCurve) &&
    validCurve(layer.rotationCurve)
  );
}

function rendererKind(
  recipe: VfxResourceRecipeKind,
  primitive: VfxPrimitive,
): CocosVfxRendererKind | null {
  if (recipe === "textured-sprite") {
    if (primitive === "sprite-quad") return "sprite";
    if (primitive === "burst-particles") return "sprite-particles";
    return null;
  }
  if (recipe === "procedural-ring") {
    return primitive === "ring" ? "graphics-ring" : null;
  }
  if (recipe === "procedural-ribbon") {
    return primitive === "ribbon" ? "graphics-ribbon" : null;
  }
  return null;
}

function blendState(role: VfxBlendRole): CocosVfxBlendState {
  switch (role) {
    case "alpha":
      return { source: "src-alpha", destination: "one-minus-src-alpha" };
    case "additive":
      return { source: "src-alpha", destination: "one" };
    case "multiply":
      return { source: "dst-color", destination: "one-minus-src-alpha" };
    case "screen":
      return { source: "one", destination: "one-minus-src-color" };
    default:
      return assertNever(role);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unreachable Cocos VFX enum ${String(value)}.`);
}

export function compileCocosVfxRenderDescriptors(
  untrustedPlan: unknown,
  untrustedRegistry: unknown,
): CocosVfxResult<CocosVfxDescriptorPlan> {
  const errors: CocosVfxPlanDiagnostic[] = [];
  const plan = record(untrustedPlan);
  if (plan?.planVersion !== "1.0.0") {
    return {
      ok: false,
      errors: [
        diagnostic(
          CocosVfxPlanErrorCode.UNSUPPORTED_PLAN_VERSION,
          "/planVersion",
          "Cocos VFX adapter supports Render Plan 1.0.0 only.",
        ),
      ],
    };
  }
  try {
    if (
      JSON.stringify(stableValue(plan.semantics)) !==
      JSON.stringify(stableValue(VFX_EXECUTABLE_SEMANTICS))
    ) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.INVALID_PLAN,
          "/semantics",
          "Render Plan executable semantics do not match TASK-014D1.",
        ),
      );
    }
  } catch {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.INVALID_PLAN,
        "/semantics",
        "Render Plan semantics must be an acyclic JSON value.",
      ),
    );
  }

  const cues = plan.cues;
  if (!Array.isArray(cues) || cues.length === 0) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.INVALID_PLAN,
        "/cues",
        "Render Plan must contain at least one cue.",
      ),
    );
  } else if (cues.length > COCOS_VFX_PLAN_BUDGETS.maxCues) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.BUDGET_EXCEEDED,
        "/cues",
        "Render Plan cue budget exceeded.",
      ),
    );
  }

  if (
    !Array.isArray(untrustedRegistry) ||
    untrustedRegistry.length > COCOS_VFX_PLAN_BUDGETS.maxResources
  ) {
    errors.push(
      diagnostic(
        Array.isArray(untrustedRegistry)
          ? CocosVfxPlanErrorCode.BUDGET_EXCEEDED
          : CocosVfxPlanErrorCode.INVALID_RESOURCE_REGISTRY,
        "/resources",
        "Cocos resource registry is invalid or over budget.",
      ),
    );
  }
  if (errors.length > 0 || !Array.isArray(cues) ||
      !Array.isArray(untrustedRegistry)) {
    return { ok: false, errors: stableDiagnostics(errors) };
  }

  const resources = new Map<string, CocosVfxResourceRecipe>();
  for (let index = 0; index < untrustedRegistry.length; index += 1) {
    if (!(index in untrustedRegistry)) {
      errors.push(diagnostic(
        CocosVfxPlanErrorCode.INVALID_RESOURCE_REGISTRY,
        `/resources/${index}`,
        "Sparse resource registries are forbidden.",
      ));
      continue;
    }
    const resource = record(untrustedRegistry[index]);
    const primitiveCapabilities = resource?.compatiblePrimitives;
    const blendCapabilities = resource?.compatibleBlendRoles;
    if (
      resource === null ||
      !nonEmpty(resource.resourceId) ||
      typeof resource.recipeKind !== "string" ||
      !recipeValues.has(resource.recipeKind) ||
      !Array.isArray(primitiveCapabilities) ||
      !Array.isArray(blendCapabilities) ||
      primitiveCapabilities.length === 0 ||
      blendCapabilities.length === 0 ||
      primitiveCapabilities.length >
        COCOS_VFX_PLAN_BUDGETS.maxCapabilitiesPerResource ||
      blendCapabilities.length >
        COCOS_VFX_PLAN_BUDGETS.maxCapabilitiesPerResource ||
      primitiveCapabilities.some((value) => !primitiveValues.has(value)) ||
      blendCapabilities.some((value) => !blendValues.has(value)) ||
      Array.from({ length: primitiveCapabilities.length }, (_, index) => index)
        .some((capabilityIndex) =>
          !(capabilityIndex in primitiveCapabilities)) ||
      Array.from({ length: blendCapabilities.length }, (_, index) => index)
        .some((capabilityIndex) =>
          !(capabilityIndex in blendCapabilities)) ||
      hasDuplicate(primitiveCapabilities) ||
      hasDuplicate(blendCapabilities)
    ) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.INVALID_RESOURCE_REGISTRY,
          `/resources/${index}`,
          "Resource descriptor IDs, enums and unique capability arrays must be valid.",
        ),
      );
      continue;
    }
    if (resources.has(resource.resourceId)) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.DUPLICATE_RESOURCE,
          `/resources/${index}/resourceId`,
          `Duplicate Cocos VFX resource ${resource.resourceId}.`,
        ),
      );
      continue;
    }
    resources.set(
      resource.resourceId,
      resource as unknown as CocosVfxResourceRecipe,
    );
  }

  let layerCount = 0;
  let particleCount = 0;
  const cueIds = new Set<string>();
  const validCues: Array<{
    cue: VfxRenderPlan["cues"][number];
    layers: NormalizedVfxLayer[];
  }> = [];
  for (let cueIndex = 0; cueIndex < cues.length; cueIndex += 1) {
    const cuePath = `/cues/${cueIndex}`;
    if (!(cueIndex in cues)) {
      errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN, cuePath,
        "Sparse cue arrays are forbidden."));
      continue;
    }
    const cue = record(cues[cueIndex]);
    if (
      cue === null ||
      !nonEmpty(cue.cueId) ||
      !Number.isInteger(cue.deterministicSeed) ||
      (cue.deterministicSeed as number) < 0 ||
      (cue.deterministicSeed as number) > 0xffff_ffff ||
      typeof cue.lifecycle !== "string" ||
      !lifecycleValues.has(cue.lifecycle) ||
      typeof cue.commandMode !== "string" ||
      !commandValues.has(cue.commandMode)
    ) {
      errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN, cuePath,
        "Cue ID, lifecycle and commandMode must be valid closed values."));
      continue;
    }
    if (cueIds.has(cue.cueId)) {
      errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN,
        `${cuePath}/cueId`, `Duplicate Render Plan cue ${cue.cueId}.`));
    }
    cueIds.add(cue.cueId);
    if (cue.commandMode !== expectedMode(cue.lifecycle)) {
      errors.push(diagnostic(CocosVfxPlanErrorCode.LIFECYCLE_MISMATCH,
        `${cuePath}/lifecycle`,
        "Render Plan lifecycle and commandMode contradict."));
    }
    const layers = cue.layers;
    if (
      !Array.isArray(layers) ||
      layers.length === 0 ||
      layers.length > COCOS_VFX_PLAN_BUDGETS.maxLayersPerCue
    ) {
      errors.push(diagnostic(
        Array.isArray(layers) &&
          layers.length > COCOS_VFX_PLAN_BUDGETS.maxLayersPerCue
          ? CocosVfxPlanErrorCode.BUDGET_EXCEEDED
          : CocosVfxPlanErrorCode.INVALID_PLAN,
        `${cuePath}/layers`,
        "Cue layers are invalid or over budget."));
      continue;
    }
    layerCount += layers.length;
    if (layerCount > COCOS_VFX_PLAN_BUDGETS.maxLayers) {
      errors.push(diagnostic(CocosVfxPlanErrorCode.BUDGET_EXCEEDED,
        "/cues", "Cocos VFX layer budget exceeded."));
      continue;
    }
    const validLayers: NormalizedVfxLayer[] = [];
    const layerIds = new Set<string>();
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
      const path = `${cuePath}/layers/${layerIndex}`;
      if (!(layerIndex in layers)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN, path,
          "Sparse layer arrays are forbidden."));
        continue;
      }
      const layer = record(layers[layerIndex]);
      if (layer === null || !validLayerShape(layer)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN, path,
          "Layer IDs, timing, transforms, colors and curves must be concrete finite values."));
        continue;
      }
      const layerId = layer.layerId as string;
      if (layerIds.has(layerId)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN,
          `${path}/layerId`, `Duplicate Render Plan layer ${layerId}.`));
      }
      layerIds.add(layerId);
      if (typeof layer.primitive !== "string" ||
          !primitiveValues.has(layer.primitive)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.UNSUPPORTED_PRIMITIVE,
          `${path}/primitive`, `Unsupported primitive ${String(layer.primitive)}.`));
        continue;
      }
      const resourceRef = record(layer.resource);
      if (resourceRef === null || !nonEmpty(resourceRef.resourceId) ||
          typeof resourceRef.recipeKind !== "string" ||
          !recipeValues.has(resourceRef.recipeKind)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
          `${path}/resource`, "Layer resource reference is invalid."));
        continue;
      }
      if (typeof layer.blendRole !== "string" ||
          !blendValues.has(layer.blendRole)) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
          `${path}/blendRole`, `Unsupported blend ${String(layer.blendRole)}.`));
        continue;
      }
      const lifecycle = cue.lifecycle as VfxLifecycle;
      const timing = record(layer.timing) as Record<string, unknown>;
      if (
        timing.phaseMode !==
          (lifecycle === "one-shot" ? "once" : "repeat-until-semantic-stop") ||
        timing.exactEnd !== "sample-phase-one" ||
        timing.removal !==
          (lifecycle === "one-shot" ? "after-final-sample" : "semantic-stop-only")
      ) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.LIFECYCLE_MISMATCH,
          `${path}/timing`, "Layer timing policy contradicts cue lifecycle."));
      }
      const emission = layer.emission;
      if (layer.primitive === "burst-particles") {
        const emitted = record(emission);
        const schedule = emitted?.schedule;
        const prng = record(emitted?.prng);
        if (
          emitted === null ||
          !Number.isInteger(emitted.count) ||
          (emitted.count as number) <= 0 ||
          (emitted.count as number) > COCOS_VFX_PLAN_BUDGETS.maxParticles ||
          !finite(emitted.ratePerSecond) ||
          emitted.ratePerSecond < 0 ||
          prng === null ||
          prng.algorithm !== "xorshift32-v1" ||
          !Number.isInteger(prng.streamSeed) ||
          (prng.streamSeed as number) < 0 ||
          (prng.streamSeed as number) > 0xffff_ffff ||
          prng.zeroSeedFallback !== 1831565813 ||
          !Array.isArray(schedule) ||
          schedule.length !== emitted.count
        ) {
          errors.push(diagnostic(
            (emitted?.count as number) > COCOS_VFX_PLAN_BUDGETS.maxParticles
              ? CocosVfxPlanErrorCode.BUDGET_EXCEEDED
              : CocosVfxPlanErrorCode.INVALID_PLAN,
            `${path}/emission`, "Particle schedule shape is invalid or over budget."));
        } else {
          particleCount += emitted.count as number;
          if (particleCount > COCOS_VFX_PLAN_BUDGETS.maxParticles) {
            errors.push(diagnostic(CocosVfxPlanErrorCode.BUDGET_EXCEEDED,
              "/cues", "Cocos VFX particle budget exceeded."));
          } else {
            const delay = timing.delaySeconds as number;
            const end = delay + (timing.durationSeconds as number);
            for (let particleIndex = 0; particleIndex < schedule.length;
              particleIndex += 1) {
              const spawn = record(schedule[particleIndex]);
              if (!(particleIndex in schedule) || spawn === null ||
                  spawn.particleIndex !== particleIndex ||
                  !finite(spawn.spawnTimeSeconds) ||
                  spawn.spawnTimeSeconds < delay ||
                  spawn.spawnTimeSeconds > end ||
                  !Number.isInteger(spawn.randomUint32) ||
                  (spawn.randomUint32 as number) < 0 ||
                  (spawn.randomUint32 as number) > 0xffff_ffff) {
                errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN,
                  `${path}/emission/schedule/${particleIndex}`,
                  "Particle spawn must be finite, indexed and inside layer lifetime."));
                break;
              }
            }
          }
        }
      } else if (emission !== null) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.INVALID_PLAN,
          `${path}/emission`, "Only burst particles may contain an emission schedule."));
      }
      const resource = resources.get(resourceRef.resourceId);
      const primitive = layer.primitive as VfxPrimitive;
      const recipe = resourceRef.recipeKind as VfxResourceRecipeKind;
      const blend = layer.blendRole as VfxBlendRole;
      if (resource === undefined) {
        errors.push(diagnostic(CocosVfxPlanErrorCode.MISSING_RESOURCE,
          `${path}/resource/resourceId`,
          `Missing Cocos resource ${resourceRef.resourceId}.`));
      } else {
        if (
          resource.recipeKind !== recipe ||
          resource.compatiblePrimitives.indexOf(primitive) === -1 ||
          rendererKind(recipe, primitive) === null
        ) {
          errors.push(diagnostic(CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
            `${path}/resource`,
            "Resource recipe has no concrete factory for the primitive."));
        }
        if (resource.compatibleBlendRoles.indexOf(blend) === -1) {
          errors.push(diagnostic(CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
            `${path}/blendRole`, "Resource recipe does not implement this blend."));
        }
      }
      validLayers.push(layer as unknown as NormalizedVfxLayer);
    }
    validCues.push({
      cue: cue as unknown as VfxRenderPlan["cues"][number],
      layers: validLayers,
    });
  }
  if (errors.length > 0) {
    return { ok: false, errors: stableDiagnostics(errors) };
  }

  const rankedLayers: Array<{
    cueId: string;
    layerId: string;
    order: number;
  }> = [];
  for (const { cue, layers } of validCues) {
    for (const layer of layers) {
      rankedLayers.push({
        cueId: cue.cueId,
        layerId: layer.layerId,
        order: layer.order,
      });
    }
  }
  rankedLayers.sort((left, right) =>
      left.order - right.order ||
      compareCodeUnits(left.cueId, right.cueId) ||
      compareCodeUnits(left.layerId, right.layerId));
  if (
    rankedLayers.length >
      COCOS_VFX_SORTING.vfxMaximum - COCOS_VFX_SORTING.vfxMinimum + 1
  ) {
    return { ok: false, errors: [diagnostic(
      CocosVfxPlanErrorCode.SORTING_RANGE_EXCEEDED,
      "/cues",
      "Globally unique Cocos VFX sorting range exceeded.",
    )] };
  }
  const sorting = new Map<string, number>(rankedLayers.map((entry, index) => [
    `${entry.cueId}\u0000${entry.layerId}`,
    COCOS_VFX_SORTING.vfxMinimum + index,
  ]));
  const compiledCues = validCues
    .sort((left, right) => compareCodeUnits(left.cue.cueId, right.cue.cueId))
    .map(({ cue, layers }) => ({
      cueId: cue.cueId,
      lifecycle: cue.lifecycle,
      commandMode: cue.commandMode,
      layers: [...layers]
        .sort((left, right) => left.order - right.order ||
          compareCodeUnits(left.layerId, right.layerId))
        .map((layer): CocosVfxLayerDescriptor => {
          const kind = rendererKind(layer.resource.recipeKind, layer.primitive);
          const order = sorting.get(`${cue.cueId}\u0000${layer.layerId}`);
          if (kind === null || order === undefined) {
            throw new Error("Validated Cocos VFX descriptor realization missing.");
          }
          return {
            descriptorId: `${cue.cueId}:${layer.layerId}`,
            cueId: cue.cueId,
            layerId: layer.layerId,
            primitive: layer.primitive,
            recipeKind: layer.resource.recipeKind,
            rendererKind: kind,
            resourceId: layer.resource.resourceId,
            blendRole: layer.blendRole,
            blendState: blendState(layer.blendRole),
            lifecycle: cue.lifecycle,
            commandMode: cue.commandMode,
            sortingOrder: order,
            layer,
          };
        }),
    }));
  return {
    ok: true,
    value: {
      descriptorVersion: "1.0.0",
      sourcePlanVersion: "1.0.0",
      cues: compiledCues,
    },
    errors: [],
  };
}

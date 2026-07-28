import {
  VFX_EXECUTABLE_SEMANTICS,
  compareCodeUnits,
  type NormalizedVfxLayer,
  type SemanticCommandMode,
  type VfxBlendRole,
  type VfxLifecycle,
  type VfxParticleSpawn,
  type VfxPrimitive,
  type VfxRenderPlan,
  type VfxResourceRecipeKind,
} from "@gameai/vfx-authoring";

import {
  CocosVfxPlanErrorCode,
  type CocosVfxPlanDiagnostic,
  type CocosVfxResult,
} from "./cocos-vfx-diagnostics.js";

export const COCOS_VFX_PLAN_BUDGETS = Object.freeze({
  maxCues: 64,
  maxLayers: 256,
  maxLayersPerCue: 16,
  maxParticles: 4096,
});

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
  readonly resourceId: string;
  readonly blendRole: VfxBlendRole;
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

const primitives = new Set<VfxPrimitive>([
  "sprite-quad",
  "ring",
  "ribbon",
  "burst-particles",
]);
const recipes = new Set<VfxResourceRecipeKind>([
  "textured-sprite",
  "procedural-ring",
  "procedural-ribbon",
]);
const blends = new Set<VfxBlendRole>([
  "alpha",
  "additive",
  "multiply",
  "screen",
]);

function diagnostic(
  code: CocosVfxPlanDiagnostic["code"],
  path: string,
  message: string,
): CocosVfxPlanDiagnostic {
  return { code, path, message };
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validCurve(
  curve: NormalizedVfxLayer["scaleCurve"],
): boolean {
  return (
    Array.isArray(curve) &&
    curve.length >= 2 &&
    curve[0]?.time === 0 &&
    curve[curve.length - 1]?.time === 1 &&
    curve.every(
      (keyframe, index) =>
        finite(keyframe.time) &&
        finite(keyframe.value) &&
        keyframe.time >= 0 &&
        keyframe.time <= 1 &&
        (index === 0 ||
          keyframe.time > (curve[index - 1]?.time ?? 1)),
    )
  );
}

function expectedMode(lifecycle: VfxLifecycle): SemanticCommandMode {
  return lifecycle === "one-shot" ? "emit" : "start-stop";
}

function validLayerNumbers(layer: NormalizedVfxLayer): boolean {
  try {
    const values: number[] = [
      layer.order,
      layer.timing.delaySeconds,
      layer.timing.durationSeconds,
      layer.transform.position.x,
      layer.transform.position.y,
      layer.transform.rotationDegrees,
      layer.transform.scale.x,
      layer.transform.scale.y,
      layer.color.r,
      layer.color.g,
      layer.color.b,
      layer.color.a,
      layer.opacity,
      layer.effectiveAlpha,
    ];
    for (const keyframe of layer.scaleCurve) {
      values.push(keyframe.time, keyframe.value);
    }
    for (const keyframe of layer.rotationCurve) {
      values.push(keyframe.time, keyframe.value);
    }
    for (const spawn of layer.emission?.schedule ?? []) {
      values.push(
        spawn.particleIndex,
        spawn.spawnTimeSeconds,
        spawn.randomUint32,
      );
    }
    return (
      values.every(finite) &&
      Number.isInteger(layer.order) &&
      layer.timing.delaySeconds >= 0 &&
      layer.timing.durationSeconds > 0 &&
      layer.transform.scale.x > 0 &&
      layer.transform.scale.y > 0 &&
      validCurve(layer.scaleCurve) &&
      validCurve(layer.rotationCurve) &&
      [
        layer.color.r,
        layer.color.g,
        layer.color.b,
        layer.color.a,
        layer.opacity,
      ].every((value) => value >= 0 && value <= 1) &&
      layer.effectiveAlpha ===
        Math.round(layer.color.a * layer.opacity * 1e12) / 1e12
    );
  } catch {
    return false;
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  const stable: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort(compareCodeUnits)) {
    stable[key] = stableValue(record[key]);
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

export function compileCocosVfxRenderDescriptors(
  plan: VfxRenderPlan,
  registry: readonly CocosVfxResourceRecipe[],
): CocosVfxResult<CocosVfxDescriptorPlan> {
  const errors: CocosVfxPlanDiagnostic[] = [];
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
  if (!Array.isArray(plan.cues) || plan.cues.length === 0) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.INVALID_PLAN,
        "/cues",
        "Render Plan must contain at least one cue.",
      ),
    );
  } else if (plan.cues.length > COCOS_VFX_PLAN_BUDGETS.maxCues) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.BUDGET_EXCEEDED,
        "/cues",
        "Render Plan cue budget exceeded.",
      ),
    );
  }
  if (!Array.isArray(registry)) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.MISSING_RESOURCE,
        "/resources",
        "Cocos VFX resource registry must be an array.",
      ),
    );
  }
  if (errors.length > 0) {
    return { ok: false, errors: stableDiagnostics(errors) };
  }

  const resources = new Map<string, CocosVfxResourceRecipe>();
  for (const [index, resource] of registry.entries()) {
    if (
      typeof resource?.resourceId !== "string" ||
      !recipes.has(resource.recipeKind) ||
      !Array.isArray(resource.compatiblePrimitives) ||
      !Array.isArray(resource.compatibleBlendRoles)
    ) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
          `/resources/${index}`,
          "Resource recipe descriptor is invalid.",
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
    resources.set(resource.resourceId, resource);
  }

  let layerCount = 0;
  let particleCount = 0;
  const cueIds = new Set<string>();
  for (const [cueIndex, cue] of plan.cues.entries()) {
    const cuePath = `/cues/${cueIndex}`;
    if (cueIds.has(cue.cueId)) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.INVALID_PLAN,
          `${cuePath}/cueId`,
          `Duplicate Render Plan cue ${cue.cueId}.`,
        ),
      );
    }
    cueIds.add(cue.cueId);
    if (cue.commandMode !== expectedMode(cue.lifecycle)) {
      errors.push(
        diagnostic(
          CocosVfxPlanErrorCode.LIFECYCLE_MISMATCH,
          `${cuePath}/lifecycle`,
          "Render Plan lifecycle and commandMode contradict.",
        ),
      );
    }
    if (
      !Array.isArray(cue.layers) ||
      cue.layers.length === 0 ||
      cue.layers.length > COCOS_VFX_PLAN_BUDGETS.maxLayersPerCue
    ) {
      errors.push(
        diagnostic(
          cue.layers?.length > COCOS_VFX_PLAN_BUDGETS.maxLayersPerCue
            ? CocosVfxPlanErrorCode.BUDGET_EXCEEDED
            : CocosVfxPlanErrorCode.INVALID_PLAN,
          `${cuePath}/layers`,
          "Cue layer collection is invalid or over budget.",
        ),
      );
      continue;
    }
    layerCount += cue.layers.length;
    const layerIds = new Set<string>();
    for (const [layerIndex, layer] of cue.layers.entries()) {
      const path = `${cuePath}/layers/${layerIndex}`;
      if (
        typeof layer !== "object" ||
        layer === null ||
        typeof layer.layerId !== "string" ||
        typeof layer.resource !== "object" ||
        layer.resource === null ||
        !validLayerNumbers(layer)
      ) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.INVALID_PLAN,
            path,
            "Layer IDs and all executable numbers must be finite and valid.",
          ),
        );
        continue;
      }
      if (layerIds.has(layer.layerId)) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.INVALID_PLAN,
            `${path}/layerId`,
            `Duplicate Render Plan layer ${layer.layerId}.`,
          ),
        );
      }
      layerIds.add(layer.layerId);
      if (!primitives.has(layer.primitive)) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.UNSUPPORTED_PRIMITIVE,
            `${path}/primitive`,
            `Unsupported primitive ${String(layer.primitive)}.`,
          ),
        );
      }
      if (!recipes.has(layer.resource.recipeKind)) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
            `${path}/resource/recipeKind`,
            `Unsupported recipe ${String(layer.resource.recipeKind)}.`,
          ),
        );
      }
      if (!blends.has(layer.blendRole)) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
            `${path}/blendRole`,
            `Unsupported blend ${String(layer.blendRole)}.`,
          ),
        );
      }
      const expectedPhaseMode =
        cue.lifecycle === "one-shot"
          ? "once"
          : "repeat-until-semantic-stop";
      if (
        layer.timing.phaseMode !== expectedPhaseMode ||
        layer.timing.exactEnd !== "sample-phase-one" ||
        layer.timing.removal !==
          (cue.lifecycle === "one-shot"
            ? "after-final-sample"
            : "semantic-stop-only")
      ) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.LIFECYCLE_MISMATCH,
            `${path}/timing`,
            "Layer timing policy contradicts exact cue lifecycle.",
          ),
        );
      }
      const emission = layer.emission;
      if (
        (layer.primitive === "burst-particles" &&
          (emission === null ||
            !Number.isInteger(emission.count) ||
            emission.count <= 0 ||
            emission.count !== emission.schedule.length ||
            emission.schedule.some(
              (spawn: VfxParticleSpawn, particleIndex: number) =>
                spawn.particleIndex !== particleIndex ||
                !Number.isInteger(spawn.randomUint32) ||
                spawn.randomUint32 < 0 ||
                spawn.randomUint32 > 0xffff_ffff ||
                spawn.spawnTimeSeconds < layer.timing.delaySeconds ||
                spawn.spawnTimeSeconds >
                  layer.timing.delaySeconds +
                    layer.timing.durationSeconds,
            ))) ||
        (layer.primitive !== "burst-particles" && emission !== null)
      ) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.INVALID_PLAN,
            `${path}/emission`,
            "Concrete emission schedule is invalid for the layer primitive or lifetime.",
          ),
        );
      }
      const resource = resources.get(layer.resource.resourceId);
      if (resource === undefined) {
        errors.push(
          diagnostic(
            CocosVfxPlanErrorCode.MISSING_RESOURCE,
            `${path}/resource/resourceId`,
            `Missing Cocos resource ${layer.resource.resourceId}.`,
          ),
        );
      } else {
        if (
          resource.recipeKind !== layer.resource.recipeKind ||
          resource.compatiblePrimitives.indexOf(layer.primitive) === -1
        ) {
          errors.push(
            diagnostic(
              CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
              `${path}/resource`,
              "Resource recipe does not support the layer primitive.",
            ),
          );
        }
        if (resource.compatibleBlendRoles.indexOf(layer.blendRole) === -1) {
          errors.push(
            diagnostic(
              CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
              `${path}/blendRole`,
              "Resource recipe does not support the layer blend role.",
            ),
          );
        }
      }
      particleCount += layer.emission?.count ?? 0;
    }
  }
  if (
    layerCount > COCOS_VFX_PLAN_BUDGETS.maxLayers ||
    particleCount > COCOS_VFX_PLAN_BUDGETS.maxParticles
  ) {
    errors.push(
      diagnostic(
        CocosVfxPlanErrorCode.BUDGET_EXCEEDED,
        "",
        "Cocos VFX layer or particle budget exceeded.",
      ),
    );
  }
  if (errors.length > 0) {
    return { ok: false, errors: stableDiagnostics(errors) };
  }

  return {
    ok: true,
    value: {
      descriptorVersion: "1.0.0",
      sourcePlanVersion: "1.0.0",
      cues: [...plan.cues]
        .sort((left, right) => compareCodeUnits(left.cueId, right.cueId))
        .map((cue) => ({
          cueId: cue.cueId,
          lifecycle: cue.lifecycle,
          commandMode: cue.commandMode,
          layers: [...cue.layers]
            .sort(
              (left, right) =>
                left.order - right.order ||
                compareCodeUnits(left.layerId, right.layerId),
            )
            .map((layer) => ({
              descriptorId: `${cue.cueId}:${layer.layerId}`,
              cueId: cue.cueId,
              layerId: layer.layerId,
              primitive: layer.primitive,
              recipeKind: layer.resource.recipeKind,
              resourceId: layer.resource.resourceId,
              blendRole: layer.blendRole,
              lifecycle: cue.lifecycle,
              commandMode: cue.commandMode,
              sortingOrder: 1000 + layer.order,
              layer,
            })),
        })),
    },
    errors: [],
  };
}

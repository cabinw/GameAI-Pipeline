import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  VFX_AUTHORING_BUDGETS,
  VFX_EXECUTABLE_SEMANTICS,
  VfxAuthoringErrorCode,
  compareCodeUnits,
  compileVfxAuthoring,
  nextXorshift32,
  parseAndCompileVfxAuthoring,
  sampleLinearCurve,
  sampleVfxLayerAtTime,
  serializeVfxRenderPlan,
  sortVfxAuthoringDiagnostics,
  vfxCueAuthoringSchema,
  type VfxAuthoringDocument,
  type VfxCompileContext,
  type VfxRenderPlan,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/vfx-cue-authoring");
const invalidRoot = path.join(fixtureRoot, "invalid");
const goldenRoot = path.join(fixtureRoot, "expected");
const schemaPath = path.join(
  repositoryRoot,
  "schemas/vfx-cue-authoring.schema.json",
);
const builtSchemaPath = path.join(
  packageRoot,
  "dist/schemas/vfx-cue-authoring.schema.json",
);

const context: VfxCompileContext = {
  semanticCues: [
    { cueId: "combined-reference", commandMode: "emit" },
    { cueId: "footstep-dust", commandMode: "emit" },
    { cueId: "hand-tool-trail", commandMode: "start-stop" },
    { cueId: "persistent-aura", commandMode: "start-stop" },
  ],
  resources: [
    {
      resourceId: "vfx.aura-glow",
      recipeKind: "textured-sprite",
      compatiblePrimitives: ["sprite-quad"],
    },
    {
      resourceId: "vfx.aura-ring",
      recipeKind: "procedural-ring",
      compatiblePrimitives: ["ring"],
    },
    {
      resourceId: "vfx.dust-soft",
      recipeKind: "textured-sprite",
      compatiblePrimitives: ["burst-particles"],
    },
    {
      resourceId: "vfx.ribbon-core",
      recipeKind: "procedural-ribbon",
      compatiblePrimitives: ["ribbon"],
    },
    {
      resourceId: "vfx.ring-soft",
      recipeKind: "procedural-ring",
      compatiblePrimitives: ["ring"],
    },
    {
      resourceId: "vfx.spark",
      recipeKind: "textured-sprite",
      compatiblePrimitives: ["burst-particles"],
    },
  ],
};

function fixture(name: string): string {
  return readFileSync(path.join(fixtureRoot, name), "utf8");
}

function invalidFixture(name: string): string {
  return readFileSync(path.join(invalidRoot, name), "utf8");
}

function parseFixture(name: string): VfxAuthoringDocument {
  return JSON.parse(fixture(name)) as VfxAuthoringDocument;
}

function compileInvalidCase(name: string) {
  const text = invalidFixture(name);
  if (!name.endsWith(".case.json")) {
    return parseAndCompileVfxAuthoring(text, context);
  }
  const parsed = JSON.parse(text) as {
    document: VfxAuthoringDocument;
    semanticCues?: VfxCompileContext["semanticCues"];
    resources?: VfxCompileContext["resources"];
    parameterOverrides?: VfxCompileContext["parameterOverrides"];
  };
  return compileVfxAuthoring(parsed.document, {
    semanticCues: parsed.semanticCues ?? context.semanticCues,
    resources: parsed.resources ?? context.resources,
    ...(parsed.parameterOverrides === undefined
      ? {}
      : { parameterOverrides: parsed.parameterOverrides }),
  });
}

function requirePlan(
  result: ReturnType<typeof compileVfxAuthoring>,
): VfxRenderPlan {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a compiled VFX render plan.");
  return result.value.plan;
}

test("canonical schema and built package schema have byte identity", () => {
  assert.deepEqual(readFileSync(builtSchemaPath), readFileSync(schemaPath));
  assert.equal(
    vfxCueAuthoringSchema.$id,
    "https://gameai-pipeline.dev/schemas/vfx-cue-authoring/v1.0.0",
  );
});

test("all four fixtures match golden normalized plans and serialized bytes", () => {
  for (const name of [
    "footstep-dust",
    "hand-trail",
    "persistent-aura",
    "combined-reference",
  ]) {
    const result = parseAndCompileVfxAuthoring(
      fixture(`${name}.json`),
      context,
    );
    assert.equal(result.ok, true, name);
    if (!result.ok) continue;
    const expected = readFileSync(
      path.join(goldenRoot, `${name}.render-plan.json`),
      "utf8",
    );
    assert.equal(result.value.serialized, expected, name);
    assert.deepEqual(result.value.plan, JSON.parse(expected), name);
    assert.doesNotMatch(
      expected,
      /cocos|unity|godot|creator|component|material|asset:|res:\/\//i,
    );
  }
});

test("parameter defaults and overrides resolve into concrete layer values", () => {
  const dustDefault = requirePlan(
    compileVfxAuthoring(parseFixture("footstep-dust.json"), context),
  );
  assert.equal(dustDefault.cues[0]?.layers[0]?.opacity, 0.72);
  assert.equal(dustDefault.cues[0]?.layers[1]?.opacity, 0.52);
  assert.equal("parameters" in (dustDefault.cues[0] ?? {}), false);

  const dustOverride = compileVfxAuthoring(
    parseFixture("footstep-dust.json"),
    {
      ...context,
      parameterOverrides: { "footstep-dust": { intensity: 0.25 } },
    },
  );
  assert.equal(dustOverride.ok, true);
  if (dustOverride.ok) {
    assert.equal(dustOverride.value.plan.cues[0]?.layers[0]?.opacity, 0.225);
    assert.equal(dustOverride.value.plan.cues[0]?.layers[1]?.opacity, 0.1625);
    assert.notEqual(
      dustOverride.value.serialized,
      serializeVfxRenderPlan(dustDefault),
    );
  }

  const trail = requirePlan(
    compileVfxAuthoring(parseFixture("hand-trail.json"), {
      ...context,
      parameterOverrides: { "hand-tool-trail": { "trail-width": 2.5 } },
    }),
  );
  assert.equal(trail.cues[0]?.layers[0]?.transform.scale.y, 2.5);

  const tint = { r: 1, g: 0.25, b: 0.5, a: 0.75 };
  const aura = requirePlan(
    compileVfxAuthoring(parseFixture("persistent-aura.json"), {
      ...context,
      parameterOverrides: { "persistent-aura": { tint } },
    }),
  );
  assert.deepEqual(aura.cues[0]?.layers[0]?.color, tint);
  assert.deepEqual(aura.cues[0]?.layers[1]?.color, tint);
  assert.equal(aura.cues[0]?.layers[0]?.effectiveAlpha, 0.3);
  assert.equal(aura.cues[0]?.layers[1]?.effectiveAlpha, 0.54);
});

test("every public diagnostic has a focused textual invalid case", () => {
  const cases = new Map<string, string>([
    ["json-parse-error.json", VfxAuthoringErrorCode.JSON_PARSE_ERROR],
    [
      "schema-validation-error.json",
      VfxAuthoringErrorCode.SCHEMA_VALIDATION_ERROR,
    ],
    [
      "unsupported-schema-version.json",
      VfxAuthoringErrorCode.UNSUPPORTED_SCHEMA_VERSION,
    ],
    ["duplicate-cue-id.json", VfxAuthoringErrorCode.DUPLICATE_CUE_ID],
    ["duplicate-layer-id.json", VfxAuthoringErrorCode.DUPLICATE_LAYER_ID],
    [
      "unknown-semantic-cue-id.json",
      VfxAuthoringErrorCode.UNKNOWN_SEMANTIC_CUE_ID,
    ],
    ["unknown-resource-id.json", VfxAuthoringErrorCode.UNKNOWN_RESOURCE_ID],
    ["unsupported-primitive.json", VfxAuthoringErrorCode.UNSUPPORTED_PRIMITIVE],
    ["invalid-timing.json", VfxAuthoringErrorCode.INVALID_TIMING],
    ["invalid-transform.json", VfxAuthoringErrorCode.INVALID_TRANSFORM],
    [
      "invalid-color-opacity.json",
      VfxAuthoringErrorCode.INVALID_COLOR_OR_OPACITY,
    ],
    ["invalid-curve.json", VfxAuthoringErrorCode.INVALID_CURVE],
    ["invalid-curve-time.json", VfxAuthoringErrorCode.INVALID_CURVE_TIME],
    ["invalid-emission.json", VfxAuthoringErrorCode.INVALID_EMISSION],
    [
      "invalid-seed.json",
      VfxAuthoringErrorCode.INVALID_DETERMINISTIC_SEED,
    ],
    [
      "incompatible-lifecycle-primitive.json",
      VfxAuthoringErrorCode.INCOMPATIBLE_LIFECYCLE_PRIMITIVE,
    ],
    [
      "layer-order-conflict.json",
      VfxAuthoringErrorCode.LAYER_ORDER_CONFLICT,
    ],
    [
      "parameter-validation-error.json",
      VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
    ],
    [
      "extra-color-field.json",
      VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
    ],
    [
      "compilation-budget-exceeded.json",
      VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
    ],
    ["empty-document.json", VfxAuthoringErrorCode.EMPTY_DOCUMENT],
    ["empty-cue-layers.json", VfxAuthoringErrorCode.EMPTY_CUE_LAYERS],
    [
      "invalid-parameter-binding.json",
      VfxAuthoringErrorCode.INVALID_PARAMETER_BINDING,
    ],
    [
      "conflicting-parameter-binding.json",
      VfxAuthoringErrorCode.CONFLICTING_PARAMETER_BINDING,
    ],
    [
      "unknown-override-cue.case.json",
      VfxAuthoringErrorCode.UNKNOWN_OVERRIDE_CUE,
    ],
    [
      "invalid-semantic-cue-registry.case.json",
      VfxAuthoringErrorCode.INVALID_SEMANTIC_CUE_REGISTRY,
    ],
    [
      "incompatible-semantic-lifecycle.json",
      VfxAuthoringErrorCode.INCOMPATIBLE_SEMANTIC_LIFECYCLE,
    ],
    [
      "invalid-resource-registry.case.json",
      VfxAuthoringErrorCode.INVALID_RESOURCE_REGISTRY,
    ],
    [
      "incompatible-resource-primitive.json",
      VfxAuthoringErrorCode.INCOMPATIBLE_RESOURCE_PRIMITIVE,
    ],
  ]);
  assert.deepEqual(
    [...cases.keys()].sort(compareCodeUnits),
    readdirSync(invalidRoot).sort(compareCodeUnits),
  );
  assert.deepEqual(
    [...new Set(cases.values())].sort(compareCodeUnits),
    Object.values(VfxAuthoringErrorCode).sort(compareCodeUnits),
  );
  for (const [name, code] of cases) {
    const result = compileInvalidCase(name);
    assert.equal(result.ok, false, name);
    if (result.ok) continue;
    assert.deepEqual(
      [...new Set(result.errors.map((error) => error.code))],
      [code],
      name,
    );
    assert.equal("value" in result, false, `${name} leaked partial output`);
  }
});

test("bindings reject unknown IDs, incompatible types, conflicts, and extra color fields", () => {
  const base = parseFixture("footstep-dust.json");
  const mutations: VfxAuthoringDocument[] = [];
  for (const mutation of [
    { parameterId: "missing", layerId: "dust-burst" },
    { parameterId: "intensity", layerId: "missing" },
  ]) {
    const input = structuredClone(base);
    const binding = input.cues[0]?.bindings?.[0] as {
      parameterId: string;
      layerId: string;
    };
    Object.assign(binding, mutation);
    mutations.push(input);
  }
  const incompatible = structuredClone(base);
  const binding = incompatible.cues[0]?.bindings?.[0] as {
    target: string;
    operation: string;
  };
  binding.target = "color";
  binding.operation = "replace";
  mutations.push(incompatible);
  for (const input of mutations) {
    const result = compileVfxAuthoring(input, context);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.errors.some(
          (error) =>
            error.code === VfxAuthoringErrorCode.INVALID_PARAMETER_BINDING,
        ),
      );
      assert.equal("value" in result, false);
    }
  }
  const extra = compileInvalidCase("extra-color-field.json");
  assert.equal(extra.ok, false);
});

test("semantic descriptors enforce command/lifecycle compatibility and registry uniqueness", () => {
  const emitLoop = compileInvalidCase("incompatible-semantic-lifecycle.json");
  assert.equal(emitLoop.ok, false);
  const oneShotStartStop = parseFixture("footstep-dust.json");
  const mismatch = compileVfxAuthoring(oneShotStartStop, {
    ...context,
    semanticCues: context.semanticCues.map((descriptor) =>
      descriptor.cueId === "footstep-dust"
        ? { ...descriptor, commandMode: "start-stop" as const }
        : descriptor,
    ),
  });
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) {
    assert.ok(
      mismatch.errors.some(
        (error) =>
          error.code ===
          VfxAuthoringErrorCode.INCOMPATIBLE_SEMANTIC_LIFECYCLE,
      ),
    );
  }
  const duplicate = compileInvalidCase(
    "invalid-semantic-cue-registry.case.json",
  );
  assert.equal(duplicate.ok, false);
});

test("typed resource descriptors reject unknown, duplicate, contradictory, and incompatible capabilities", () => {
  const mismatch = compileInvalidCase("incompatible-resource-primitive.json");
  assert.equal(mismatch.ok, false);
  const duplicate = compileInvalidCase("invalid-resource-registry.case.json");
  assert.equal(duplicate.ok, false);
  const contradictory = compileVfxAuthoring(
    parseFixture("footstep-dust.json"),
    {
      ...context,
      resources: [
        ...context.resources,
        {
          resourceId: "vfx.bad",
          recipeKind: "procedural-ring",
          compatiblePrimitives: ["ribbon"],
        },
      ],
    },
  );
  assert.equal(contradictory.ok, false);
  if (!contradictory.ok) {
    assert.ok(
      contradictory.errors.some(
        (error) =>
          error.code === VfxAuthoringErrorCode.INVALID_RESOURCE_REGISTRY,
      ),
    );
  }
  const plan = requirePlan(
    compileVfxAuthoring(parseFixture("combined-reference.json"), context),
  );
  assert.deepEqual(plan.cues[0]?.layers[0]?.resource, {
    resourceId: "vfx.aura-glow",
    recipeKind: "textured-sprite",
  });
});

test("curves are linear, clamped, endpoint-complete, and relative to base transform", () => {
  assert.equal(sampleLinearCurve([{ time: 0, value: 2 }, { time: 1, value: 6 }], -1), 2);
  assert.equal(sampleLinearCurve([{ time: 0, value: 2 }, { time: 1, value: 6 }], 0.25), 3);
  assert.equal(sampleLinearCurve([{ time: 0, value: 2 }, { time: 1, value: 6 }], 2), 6);
  const plan = requirePlan(
    compileVfxAuthoring(parseFixture("footstep-dust.json"), context),
  );
  const layer = plan.cues[0]?.layers[0];
  assert.ok(layer);
  const sample = sampleVfxLayerAtTime(layer, 0.225);
  assert.equal(sample.phase, 0.5);
  assert.deepEqual(sample.position, { x: 0, y: 2 });
  assert.equal(sample.scale.x, 0.875);
  assert.equal(sample.scale.y, 0.56875);
  assert.equal(sample.rotationDegrees, 2);
  assert.equal(sample.effectiveAlpha, 0.72);
  assert.deepEqual(plan.semantics, VFX_EXECUTABLE_SEMANTICS);
});

test("layer activation, exact duration, repetition, and removal boundaries are executable", () => {
  const oneShot = requirePlan(
    compileVfxAuthoring(parseFixture("combined-reference.json"), context),
  ).cues[0]?.layers.find((layer) => layer.layerId === "middle-ring");
  assert.ok(oneShot);
  assert.deepEqual(sampleVfxLayerAtTime(oneShot, 0.049), {
    active: false,
    removed: false,
    cycleIndex: null,
    phase: null,
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotationDegrees: 0,
    effectiveAlpha: 1,
  });
  assert.equal(sampleVfxLayerAtTime(oneShot, 0.05).phase, 0);
  assert.equal(sampleVfxLayerAtTime(oneShot, 0.65).phase, 1);
  assert.equal(sampleVfxLayerAtTime(oneShot, 0.650001).removed, true);

  const looping = requirePlan(
    compileVfxAuthoring(parseFixture("hand-trail.json"), context),
  ).cues[0]?.layers[0];
  assert.ok(looping);
  assert.deepEqual(
    {
      cycle: sampleVfxLayerAtTime(looping, 0.24).cycleIndex,
      phase: sampleVfxLayerAtTime(looping, 0.24).phase,
      removed: sampleVfxLayerAtTime(looping, 24).removed,
    },
    { cycle: 0, phase: 1, removed: false },
  );
  assert.equal(sampleVfxLayerAtTime(looping, 0.240001).cycleIndex, 1);
  assert.equal(looping.timing.removal, "semantic-stop-only");
  assert.equal(
    VFX_EXECUTABLE_SEMANTICS.cleanupAuthority,
    "semantic-stop-reset-switch-dispose",
  );
});

test("particle schedule, zero rate, lifetime fit, and xorshift32 vectors are fixed", () => {
  const dust = requirePlan(
    compileVfxAuthoring(parseFixture("footstep-dust.json"), context),
  ).cues[0]?.layers[0];
  assert.ok(dust?.emission);
  assert.deepEqual(
    dust.emission.schedule.map((spawn) => spawn.spawnTimeSeconds),
    [0, 0.03125, 0.0625, 0.09375, 0.125, 0.15625, 0.1875, 0.21875],
  );
  assert.deepEqual(
    dust.emission.schedule.slice(0, 4).map((spawn) => spawn.randomUint32),
    [1465905346, 2176542785, 2060778776, 1267104707],
  );
  assert.deepEqual(
    [1, 2, 3, 4].reduce<number[]>((values) => {
      values.push(nextXorshift32(values.at(-1) ?? 1));
      return values;
    }, []),
    [270369, 67634689, 2647435461, 307599695],
  );
  const instantaneous = parseFixture("footstep-dust.json");
  const emission = instantaneous.cues[0]?.layers[0]?.emission as {
    count: number;
    ratePerSecond: number;
  };
  emission.ratePerSecond = 0;
  const zeroRate = requirePlan(
    compileVfxAuthoring(instantaneous, context),
  ).cues[0]?.layers[0]?.emission;
  assert.ok(zeroRate);
  assert.ok(
    zeroRate.schedule.every(
      (spawn) => spawn.spawnTimeSeconds === zeroRate.schedule[0]?.spawnTimeSeconds,
    ),
  );
  const outsideLifetime = parseFixture("footstep-dust.json");
  const invalidEmission = outsideLifetime.cues[0]?.layers[0]?.emission as {
    count: number;
    ratePerSecond: number;
  };
  invalidEmission.count = 2;
  invalidEmission.ratePerSecond = 1;
  const rejected = compileVfxAuthoring(outsideLifetime, context);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.ok(
      rejected.errors.some(
        (error) => error.code === VfxAuthoringErrorCode.INVALID_EMISSION,
      ),
    );
  }
});

test("input permutations, locale replacement, and repeated compilation preserve bytes", () => {
  const inputs = [
    parseFixture("footstep-dust.json"),
    parseFixture("hand-trail.json"),
    parseFixture("persistent-aura.json"),
    parseFixture("combined-reference.json"),
  ];
  const combined: VfxAuthoringDocument = {
    schemaVersion: "1.0.0",
    cues: inputs.flatMap((input) => input.cues),
  };
  const permuted = structuredClone(combined);
  (permuted.cues as VfxAuthoringDocument["cues"][number][]).reverse();
  for (const cue of permuted.cues) {
    (cue.layers as VfxAuthoringDocument["cues"][number]["layers"][number][]).reverse();
    (cue.parameters as unknown as unknown[] | undefined)?.reverse();
    (cue.bindings as unknown as unknown[] | undefined)?.reverse();
  }
  const first = compileVfxAuthoring(combined, context);
  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = () => {
    throw new Error("localeCompare must not participate in canonical order");
  };
  try {
    const second = compileVfxAuthoring(permuted, {
      ...context,
      semanticCues: [...context.semanticCues].reverse(),
      resources: [...context.resources].reverse(),
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(first.value.serialized, second.value.serialized);
    }
    assert.deepEqual(
      sortVfxAuthoringDiagnostics([
        { code: VfxAuthoringErrorCode.INVALID_CURVE, path: "/ä", message: "b" },
        { code: VfxAuthoringErrorCode.INVALID_CURVE, path: "/z", message: "a" },
      ]).map((error) => error.path),
      ["/z", "/ä"],
    );
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
});

test("input remains immutable and failures never expose partial output", () => {
  const input = parseFixture("persistent-aura.json");
  const before = structuredClone(input);
  const result = compileVfxAuthoring(input, context);
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  const failed = compileInvalidCase("invalid-parameter-binding.json");
  assert.equal(failed.ok, false);
  assert.equal("value" in failed, false);
});

test("all parameter, binding, override, registry, curve, particle, and byte budgets are explicit", () => {
  assert.deepEqual(VFX_AUTHORING_BUDGETS, {
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
  const tooManyDescriptors = Array.from({ length: 129 }, (_, index) => ({
    cueId: `cue-${index}`,
    commandMode: "emit" as const,
  }));
  const descriptorBudget = compileVfxAuthoring(
    parseFixture("footstep-dust.json"),
    { ...context, semanticCues: tooManyDescriptors },
  );
  assert.equal(descriptorBudget.ok, false);
  if (!descriptorBudget.ok) {
    assert.ok(
      descriptorBudget.errors.some(
        (error) =>
          error.code === VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
      ),
    );
  }
  const keyframes = Array.from({ length: 32 }, (_, index) => ({
    time: index / 31,
    value: index,
  }));
  const cues = Array.from({ length: 64 }, (_, cueIndex) => ({
    cueId: `cue-${cueIndex}`,
    lifecycle: "persistent" as const,
    deterministicSeed: cueIndex,
    layers: Array.from({ length: 16 }, (_, layerIndex) => ({
      layerId: `layer-${layerIndex}`,
      order: layerIndex,
      primitive: "ring",
      logicalResourceId: "vfx.ring-soft",
      durationSeconds: 60,
      scaleCurve: keyframes,
      rotationCurve: keyframes,
    })),
  }));
  const byteBudget = compileVfxAuthoring(
    { schemaVersion: "1.0.0", cues },
    {
      semanticCues: cues.map((cue) => ({
        cueId: cue.cueId,
        commandMode: "start-stop",
      })),
      resources: context.resources,
    },
  );
  assert.equal(byteBudget.ok, false);
  if (!byteBudget.ok) {
    assert.deepEqual(
      [...new Set(byteBudget.errors.map((error) => error.code))],
      [VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED],
    );
  }
});

test("package imports no Cocos, Unity, or Godot APIs and never dispatches by resource names", () => {
  const sourceRoot = path.join(packageRoot, "source");
  const source = readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readFileSync(path.join(sourceRoot, name), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    source,
    /from\s+["'](?:cc|cocos|unity|godot)|require\(["'](?:cc|cocos|unity|godot)/i,
  );
  assert.doesNotMatch(
    source,
    /(?:includes|startsWith|endsWith|match|test)\([^)]*(?:dust|trail|aura)/i,
  );
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  assert.deepEqual(Object.keys(manifest.dependencies ?? {}), ["ajv"]);
});

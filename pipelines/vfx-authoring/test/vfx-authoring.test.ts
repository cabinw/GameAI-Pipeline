import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  VFX_AUTHORING_BUDGETS,
  VFX_EXECUTABLE_SEMANTICS,
  VFX_MAX_CANONICAL_TIME_SECONDS,
  VFX_TIME_TICKS_PER_SECOND,
  VfxAuthoringErrorCode,
  VfxSamplingError,
  VfxSamplingErrorCode,
  canonicalTimeToTicks,
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
  type NormalizedVfxLayer,
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
    {
      cueId: "combined-reference",
      commandMode: "emit",
      lifecycle: "one-shot",
    },
    {
      cueId: "footstep-dust",
      commandMode: "emit",
      lifecycle: "one-shot",
    },
    {
      cueId: "hand-tool-trail",
      commandMode: "start-stop",
      lifecycle: "looping",
    },
    {
      cueId: "persistent-aura",
      commandMode: "start-stop",
      lifecycle: "persistent",
    },
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
        ? {
            ...descriptor,
            commandMode: "start-stop" as const,
            lifecycle: "persistent" as const,
          }
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

  for (const [fixtureName, lifecycle] of [
    ["hand-trail.json", "persistent"],
    ["persistent-aura.json", "looping"],
  ] as const) {
    const cueId =
      fixtureName === "hand-trail.json"
        ? "hand-tool-trail"
        : "persistent-aura";
    const exactMismatch = compileVfxAuthoring(parseFixture(fixtureName), {
      ...context,
      semanticCues: context.semanticCues.map((descriptor) =>
        descriptor.cueId === cueId
          ? { ...descriptor, lifecycle }
          : descriptor,
      ),
    });
    assert.equal(exactMismatch.ok, false);
    if (!exactMismatch.ok) {
      assert.ok(
        exactMismatch.errors.some(
          (error) =>
            error.code ===
            VfxAuthoringErrorCode.INCOMPATIBLE_SEMANTIC_LIFECYCLE,
        ),
      );
    }
  }
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

test("canonical tick sampling matches the portable golden boundary vectors", () => {
  const base = requirePlan(
    compileVfxAuthoring(parseFixture("combined-reference.json"), context),
  ).cues[0]?.layers[0];
  assert.ok(base);
  const goldenText = readFileSync(
    path.join(goldenRoot, "sampling-vectors.json"),
    "utf8",
  );
  assert.equal(`${JSON.stringify(JSON.parse(goldenText))}\n`, goldenText);
  const golden = JSON.parse(goldenText) as {
    canonicalTime: typeof VFX_EXECUTABLE_SEMANTICS.canonicalTime;
    vectors: readonly {
      active: boolean;
      cycleIndex: number | null;
      delaySeconds: number;
      durationSeconds: number;
      name: string;
      phase: number | null;
      phaseMode: NormalizedVfxLayer["timing"]["phaseMode"];
      removed: boolean;
      timeSeconds: number;
    }[];
  };
  assert.deepEqual(
    golden.canonicalTime,
    VFX_EXECUTABLE_SEMANTICS.canonicalTime,
  );
  for (const vector of golden.vectors) {
    const layer: NormalizedVfxLayer = {
      ...base,
      timing: {
        ...base.timing,
        delaySeconds: vector.delaySeconds,
        durationSeconds: vector.durationSeconds,
        phaseMode: vector.phaseMode,
      },
    };
    const sampled = sampleVfxLayerAtTime(layer, vector.timeSeconds);
    for (const numeric of [
      sampled.phase,
      sampled.cycleIndex,
      sampled.position.x,
      sampled.position.y,
      sampled.scale.x,
      sampled.scale.y,
      sampled.rotationDegrees,
      sampled.effectiveAlpha,
    ]) {
      assert.equal(
        numeric === null || Number.isFinite(numeric),
        true,
        vector.name,
      );
    }
    assert.deepEqual(
      {
        active: sampled.active,
        cycleIndex: sampled.cycleIndex,
        phase: sampled.phase,
        removed: sampled.removed,
      },
      {
        active: vector.active,
        cycleIndex: vector.cycleIndex,
        phase: vector.phase,
        removed: vector.removed,
      },
      vector.name,
    );
  }

  const boundaryLayer: NormalizedVfxLayer = {
    ...base,
    timing: {
      ...base.timing,
      delaySeconds: 0.1,
      durationSeconds: 0.2,
      phaseMode: "once",
    },
  };
  assert.equal(
    sampleVfxLayerAtTime(boundaryLayer, 0.1 - 1 / VFX_TIME_TICKS_PER_SECOND)
      .active,
    false,
  );
  assert.equal(sampleVfxLayerAtTime(boundaryLayer, 0.1).phase, 0);
  assert.equal(
    sampleVfxLayerAtTime(boundaryLayer, 0.1 + 1 / VFX_TIME_TICKS_PER_SECOND)
      .active,
    true,
  );
  let accumulated = 0;
  for (let index = 0; index < 48; index += 1) accumulated += 1 / 60;
  assert.equal(canonicalTimeToTicks(accumulated), 800_000_000_000);
  assert.equal(canonicalTimeToTicks(-0), 0);
  assert.equal(
    canonicalTimeToTicks(VFX_MAX_CANONICAL_TIME_SECONDS),
    VFX_EXECUTABLE_SEMANTICS.canonicalTime.maximumTick,
  );

  for (const [value, code] of [
    [Number.NaN, VfxSamplingErrorCode.INVALID_TIME],
    [Number.POSITIVE_INFINITY, VfxSamplingErrorCode.INVALID_TIME],
    [Number.NEGATIVE_INFINITY, VfxSamplingErrorCode.INVALID_TIME],
    [-1, VfxSamplingErrorCode.INVALID_TIME],
    [
      VFX_MAX_CANONICAL_TIME_SECONDS +
        2 / VFX_TIME_TICKS_PER_SECOND,
      VfxSamplingErrorCode.TIME_RANGE_EXCEEDED,
    ],
  ] as const) {
    assert.throws(
      () => sampleVfxLayerAtTime(boundaryLayer, value),
      (error: unknown) =>
        error instanceof VfxSamplingError && error.code === code,
    );
  }
  const corrupted = structuredClone(boundaryLayer) as {
    transform: { scale: { x: number } };
  };
  corrupted.transform.scale.x = Number.NaN;
  assert.throws(
    () =>
      sampleVfxLayerAtTime(
        corrupted as unknown as NormalizedVfxLayer,
        0.1,
      ),
    (error: unknown) =>
      error instanceof VfxSamplingError &&
      error.code === VfxSamplingErrorCode.INVALID_LAYER,
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

  const roundingRegression = parseFixture("footstep-dust.json");
  const regressionLayer = roundingRegression.cues[0]?.layers[0] as {
    durationSeconds: number;
    emission: { count: number; ratePerSecond: number };
  };
  regressionLayer.emission.count = 2;
  regressionLayer.emission.ratePerSecond = 1.2469134;
  regressionLayer.durationSeconds = 0.8019803139498147;
  const canonicalRegression = compileVfxAuthoring(
    roundingRegression,
    context,
  );
  assert.equal(canonicalRegression.ok, true);
  if (canonicalRegression.ok) {
    const layer = canonicalRegression.value.plan.cues[0]?.layers[0];
    assert.equal(layer?.timing.durationSeconds, 0.80198031395);
    assert.equal(
      layer?.emission?.schedule[1]?.spawnTimeSeconds,
      0.80198031395,
    );
  }

  const oneTickOverflow = structuredClone(roundingRegression);
  (
    oneTickOverflow.cues[0]?.layers[0] as {
      durationSeconds: number;
    }
  ).durationSeconds = 0.801980313949;
  const overflow = compileVfxAuthoring(oneTickOverflow, context);
  assert.equal(overflow.ok, false);
  assert.equal("value" in overflow, false);

  const maximum = parseFixture("footstep-dust.json");
  const maximumEmission = maximum.cues[0]?.layers[0]?.emission as {
    count: number;
    ratePerSecond: number;
  };
  maximumEmission.count = VFX_AUTHORING_BUDGETS.maxEmittedParticles;
  maximumEmission.ratePerSecond = 10_000;
  const maximumResult = compileVfxAuthoring(maximum, context);
  assert.equal(maximumResult.ok, true);
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

test("adversarial parser, compiler, curve, key, overflow, and preflight inputs fail closed", () => {
  const nonString = parseAndCompileVfxAuthoring(
    42 as unknown as string,
    context,
  );
  assert.equal(nonString.ok, false);
  if (!nonString.ok) {
    assert.equal(
      nonString.errors[0]?.code,
      VfxAuthoringErrorCode.JSON_PARSE_ERROR,
    );
  }

  const nonFinite = parseFixture("footstep-dust.json");
  (
    nonFinite.cues[0]?.layers[0] as { durationSeconds: number }
  ).durationSeconds = Number.POSITIVE_INFINITY;
  const nonFiniteResult = compileVfxAuthoring(nonFinite, context);
  assert.equal(nonFiniteResult.ok, false);
  assert.equal("value" in nonFiniteResult, false);

  const unknownKey = {
    ...parseFixture("footstep-dust.json"),
    undeclared: true,
  };
  const unknownKeyResult = compileVfxAuthoring(unknownKey, context);
  assert.equal(unknownKeyResult.ok, false);
  if (!unknownKeyResult.ok) {
    assert.ok(
      unknownKeyResult.errors.some(
        (error) =>
          error.code === VfxAuthoringErrorCode.SCHEMA_VALIDATION_ERROR,
      ),
    );
  }

  const bindingOverflow = parseFixture("hand-trail.json");
  const parameter = bindingOverflow.cues[0]?.parameters?.[0] as {
    default: number;
    maximum: number;
  };
  parameter.default = 1e308;
  parameter.maximum = 1e308;
  const bindingOverflowResult = compileVfxAuthoring(
    bindingOverflow,
    context,
  );
  assert.equal(bindingOverflowResult.ok, false);
  assert.equal("value" in bindingOverflowResult, false);

  const curveCollision = parseFixture("persistent-aura.json");
  const curve = curveCollision.cues[0]?.layers[0]?.scaleCurve as {
    time: number;
    value: number;
  }[];
  curve.splice(
    1,
    0,
    { time: 0.0000000000001, value: 1 },
    { time: 0.0000000000002, value: 1 },
  );
  const curveCollisionResult = compileVfxAuthoring(
    curveCollision,
    context,
  );
  assert.equal(curveCollisionResult.ok, false);
  assert.equal("value" in curveCollisionResult, false);

  assert.throws(
    () =>
      sampleLinearCurve(
        [{ time: 0, value: 1 }, { time: 1, value: 2 }],
        Number.NaN,
      ),
    (error: unknown) =>
      error instanceof VfxSamplingError &&
      error.code === VfxSamplingErrorCode.INVALID_TIME,
  );
  assert.throws(
    () =>
      sampleLinearCurve(
        [{ time: 0, value: 1 }, { time: 0, value: 2 }],
        0,
      ),
    (error: unknown) =>
      error instanceof VfxSamplingError &&
      error.code === VfxSamplingErrorCode.INVALID_CURVE,
  );

  const preflight = compileVfxAuthoring(
    {
      schemaVersion: "1.0.0",
      cues: Array.from(
        { length: VFX_AUTHORING_BUDGETS.maxCues + 1 },
        () => null,
      ),
    },
    context,
  );
  assert.equal(preflight.ok, false);
  if (!preflight.ok) {
    assert.deepEqual(
      [...new Set(preflight.errors.map((error) => error.code))],
      [VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED],
    );
  }
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
    lifecycle: "one-shot" as const,
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
        lifecycle: "persistent",
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

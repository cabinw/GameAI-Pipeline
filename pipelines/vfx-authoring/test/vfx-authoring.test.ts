import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  VFX_AUTHORING_BUDGETS,
  VfxAuthoringErrorCode,
  compileVfxAuthoring,
  parseAndCompileVfxAuthoring,
  serializeVfxRenderPlan,
  vfxCueAuthoringSchema,
  type VfxAuthoringDocument,
  type VfxCompileContext,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/vfx-cue-authoring");
const invalidRoot = path.join(fixtureRoot, "invalid");
const schemaPath = path.join(
  repositoryRoot,
  "schemas/vfx-cue-authoring.schema.json",
);
const builtSchemaPath = path.join(
  packageRoot,
  "dist/schemas/vfx-cue-authoring.schema.json",
);

const context: VfxCompileContext = {
  semanticCueIds: [
    "combined-reference",
    "footstep-dust",
    "hand-tool-trail",
    "persistent-aura",
  ],
  resourceIds: [
    "vfx.aura-glow",
    "vfx.aura-ring",
    "vfx.dust-soft",
    "vfx.ribbon-core",
    "vfx.ring-soft",
    "vfx.spark",
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

test("canonical schema and built package schema have byte identity", () => {
  assert.deepEqual(
    readFileSync(builtSchemaPath),
    readFileSync(schemaPath),
  );
  assert.equal(
    vfxCueAuthoringSchema.$id,
    "https://gameai-pipeline.dev/schemas/vfx-cue-authoring/v1.0.0",
  );
});

test("all four textual references compile to engine-neutral plans", () => {
  for (const name of [
    "footstep-dust.json",
    "hand-trail.json",
    "persistent-aura.json",
    "combined-reference.json",
  ]) {
    const result = parseAndCompileVfxAuthoring(fixture(name), context);
    assert.equal(result.ok, true, name);
    if (!result.ok) continue;
    assert.equal(result.value.plan.cues.length, 1);
    assert.doesNotMatch(
      result.value.serialized,
      /cocos|unity|godot|creator|component|material|asset:|res:\/\//i,
    );
  }
});

test("every stable diagnostic has one focused invalid fixture", () => {
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
      "compilation-budget-exceeded.json",
      VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
    ],
  ]);
  assert.deepEqual(
    [...cases.keys()].sort(),
    readdirSync(invalidRoot).sort(),
  );
  assert.equal(
    cases.size,
    Object.keys(VfxAuthoringErrorCode).length,
  );
  for (const [name, code] of cases) {
    const result = parseAndCompileVfxAuthoring(invalidFixture(name), context);
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

test("normalization is explicit, stable, and leaves input immutable", () => {
  const input = parseFixture("persistent-aura.json");
  const before = structuredClone(input);
  const result = compileVfxAuthoring(input, context);
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  if (!result.ok) return;
  const cue = result.value.plan.cues[0];
  assert.ok(cue);
  assert.deepEqual(
    cue.layers.map((layer) => [layer.order, layer.layerId]),
    [[0, "inner-glow"], [10, "outer-ring"]],
  );
  const inner = cue.layers[0];
  assert.ok(inner);
  assert.deepEqual(inner.transform, {
    position: { x: 0, y: 0 },
    rotationDegrees: 0,
    scale: { x: 1, y: 1 },
  });
  assert.deepEqual(inner.color, { r: 1, g: 1, b: 1, a: 1 });
  assert.equal(inner.opacity, 0.4);
  assert.equal(inner.delaySeconds, 0);
  assert.equal(inner.emission, null);
  assert.deepEqual(inner.scaleCurve, [
    { time: 0, value: 1 },
    { time: 1, value: 1 },
  ]);
  assert.deepEqual(inner.rotationCurve, [
    { time: 0, value: 0 },
    { time: 1, value: 0 },
  ]);
  assert.deepEqual(
    cue.parameters.map((parameter) => parameter.parameterId),
    ["enabled", "tint"],
  );
});

test("repeated compilation and serialization are byte-identical", () => {
  const input = parseFixture("combined-reference.json");
  const first = compileVfxAuthoring(input, context);
  const second = compileVfxAuthoring(structuredClone(input), context);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.value.serialized, second.value.serialized);
  assert.equal(
    serializeVfxRenderPlan(first.value.plan),
    first.value.serialized,
  );
  assert.ok(first.value.serialized.endsWith("\n"));
});

test("parameter defaults and bounded overrides compile deterministically", () => {
  const input = parseFixture("footstep-dust.json");
  const overridden = compileVfxAuthoring(input, {
    ...context,
    parameterOverrides: { "footstep-dust": { intensity: 0.25 } },
  });
  assert.equal(overridden.ok, true);
  if (overridden.ok) {
    assert.equal(overridden.value.plan.cues[0]?.parameters[0]?.value, 0.25);
  }
  const invalid = compileVfxAuthoring(input, {
    ...context,
    parameterOverrides: { "footstep-dust": { intensity: 2 } },
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(
      invalid.errors[0]?.code,
      VfxAuthoringErrorCode.PARAMETER_VALIDATION_ERROR,
    );
  }
});

test("curve endpoints are accepted and duplicate or outside times fail closed", () => {
  const valid = compileVfxAuthoring(parseFixture("footstep-dust.json"), context);
  assert.equal(valid.ok, true);
  const duplicate = parseAndCompileVfxAuthoring(
    invalidFixture("invalid-curve-time.json"),
    context,
  );
  assert.equal(duplicate.ok, false);
  const outside = parseFixture("footstep-dust.json");
  const layer = outside.cues[0]?.layers[0];
  assert.ok(layer?.scaleCurve);
  (layer.scaleCurve as { time: number; value: number }[])[0]!.time = -0.01;
  const rejected = compileVfxAuthoring(outside, context);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.ok(
      rejected.errors.some(
        (error) => error.code === VfxAuthoringErrorCode.INVALID_CURVE,
      ),
    );
  }
});

test("direct non-finite values and missing resource registry entries reject", () => {
  const input = parseFixture("footstep-dust.json");
  const layer = input.cues[0]?.layers[0];
  assert.ok(layer?.transform?.position);
  (layer.transform.position as { x: number; y: number }).x = Number.NaN;
  const nonFinite = compileVfxAuthoring(input, context);
  assert.equal(nonFinite.ok, false);
  const missingResource = compileVfxAuthoring(
    parseFixture("footstep-dust.json"),
    { ...context, resourceIds: [] },
  );
  assert.equal(missingResource.ok, false);
  if (!missingResource.ok) {
    assert.ok(
      missingResource.errors.every(
        (error) => error.code === VfxAuthoringErrorCode.UNKNOWN_RESOURCE_ID,
      ),
    );
  }
});

test("lifecycle compatibility and particle budgets reject before output", () => {
  const incompatible = parseAndCompileVfxAuthoring(
    invalidFixture("incompatible-lifecycle-primitive.json"),
    context,
  );
  assert.equal(incompatible.ok, false);
  const input = parseFixture("footstep-dust.json");
  const layer = input.cues[0]?.layers[0];
  assert.ok(layer?.emission);
  (layer.emission as { count: number; ratePerSecond: number }).count = 4097;
  const overBudget = compileVfxAuthoring(input, context);
  assert.equal(overBudget.ok, false);
  if (!overBudget.ok) {
    assert.ok(
      overBudget.errors.some(
        (error) =>
          error.code === VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED,
      ),
    );
    assert.equal("value" in overBudget, false);
  }
});

test("all explicit compilation budget constants are enforced or bounded", () => {
  assert.deepEqual(VFX_AUTHORING_BUDGETS, {
    maxCues: 64,
    maxLayersPerCue: 16,
    maxKeyframesPerCurve: 32,
    maxEmittedParticles: 4096,
    maxSerializedPlanBytes: 1_048_576,
  });
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
  const result = compileVfxAuthoring(
    { schemaVersion: "1.0.0", cues },
    {
      semanticCueIds: cues.map((cue) => cue.cueId),
      resourceIds: ["vfx.ring-soft"],
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(
      [...new Set(result.errors.map((error) => error.code))],
      [VfxAuthoringErrorCode.COMPILATION_BUDGET_EXCEEDED],
    );
    assert.equal("value" in result, false);
  }
});

test("package source and manifest import no Cocos, Unity, or Godot APIs", () => {
  const sourceRoot = path.join(packageRoot, "source");
  const source = readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readFileSync(path.join(sourceRoot, name), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    source,
    /from\s+["'](?:cc|cocos|unity|godot)|require\(["'](?:cc|cocos|unity|godot)/i,
  );
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  assert.deepEqual(Object.keys(manifest.dependencies ?? {}), ["ajv"]);
});

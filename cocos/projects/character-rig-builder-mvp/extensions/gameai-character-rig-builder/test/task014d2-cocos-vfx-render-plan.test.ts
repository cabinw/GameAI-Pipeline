import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  VFX_TIME_TICKS_PER_SECOND,
  compareCodeUnits,
  compileVfxAuthoring,
  sampleVfxLayerAtTime,
  type VfxAuthoringDocument,
  type VfxCompileContext,
  type VfxLayerSample,
  type VfxRenderPlan,
} from "@gameai/vfx-authoring";

import {
  CocosVfxPlanErrorCode,
  CocosVfxRuntimeError,
} from "../source/task014d2/cocos-vfx-diagnostics";
import {
  TASK014D2_INPUT_REGISTRY,
  TASK014D2_RESOURCE_REGISTRY,
  TASK014D2_SORTING,
  createTask014D2RuntimeDiagnostics,
  composeTask014D2Affine,
  formatTask014D2Diagnostics,
  measureTask014D2RoiDifference,
  projectTask014D2WorldToOverlay,
  runTask014D2FailureCleanup,
  task014d2BoundsOverflowPx,
  task014d2MaterialBlendMatches,
  task014d2PointInsideSafeViewport,
  task014d2SpatialErrorsWithinTolerance,
  task014d2VisibilityRequiresSpatialMeasurement,
  transformTask014D2Bounds,
  transformTask014D2NestedBounds,
} from "../source/task014d2/cocos-vfx-harness-contract";
import {
  COCOS_VFX_PLAN_BUDGETS,
  compileCocosVfxRenderDescriptors,
  cocosVfxBlendState,
  cocosVfxRendererKind,
  rankCocosVfxRuntimeSorting,
  type CocosVfxLayerDescriptor,
  type CocosVfxResourceRecipe,
} from "../source/task014d2/cocos-vfx-render-descriptor";
import {
  CocosVfxRuntimeState,
  type CocosVfxLayerVisibility,
  type CocosVfxRendererOwnership,
  type CocosVfxRuntimeHost,
} from "../source/task014d2/cocos-vfx-runtime-state";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/vfx-cue-authoring",
);
const sourceRoot = path.join(extensionRoot, "source/task014d2");
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/task014d2",
);
const fixtureNames = [
  "footstep-dust.json",
  "hand-trail.json",
  "persistent-aura.json",
  "combined-reference.json",
] as const;
const compileContext: VfxCompileContext = {
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
  resources: TASK014D2_RESOURCE_REGISTRY.map((resource) => ({
    resourceId: resource.resourceId,
    recipeKind: resource.recipeKind,
    compatiblePrimitives: resource.compatiblePrimitives,
  })),
};

function authoringDocument(): VfxAuthoringDocument {
  const fixtures = fixtureNames.map(
    (name) =>
      JSON.parse(
        readFileSync(path.join(fixtureRoot, name), "utf8"),
      ) as VfxAuthoringDocument,
  );
  return {
    schemaVersion: "1.0.0",
    cues: fixtures.flatMap((fixture) => fixture.cues),
  };
}

function renderPlan(): VfxRenderPlan {
  const result = compileVfxAuthoring(
    authoringDocument(),
    compileContext,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("D1 fixture compilation failed.");
  return result.value.plan;
}

function descriptorPlan(
  plan: VfxRenderPlan = renderPlan(),
  resources: readonly CocosVfxResourceRecipe[] =
    TASK014D2_RESOURCE_REGISTRY,
) {
  const result = compileCocosVfxRenderDescriptors(plan, resources);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("D2 descriptor compilation failed.");
  return result.value;
}

class FakeHost implements CocosVfxRuntimeHost {
  readonly descriptors = new Map<string, CocosVfxLayerDescriptor>();
  readonly ownership = new Map<string, CocosVfxRendererOwnership>();
  readonly samples = new Map<string, VfxLayerSample>();
  readonly destroyed: Array<readonly [string, string]> = [];
  failAtCreate = Number.POSITIVE_INFINITY;
  failAfterCreate = Number.POSITIVE_INFINITY;
  failAtUpdate = Number.POSITIVE_INFINITY;
  createCount = 0;
  updateCount = 0;

  createLayer(
    ownership: CocosVfxRendererOwnership,
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (this.createCount++ === this.failAtCreate) {
      throw new Error("synthetic partial build failure");
    }
    const rendererId = ownership.rendererId;
    if (this.descriptors.has(rendererId)) {
      throw new Error(`duplicate renderer ${rendererId}`);
    }
    this.descriptors.set(rendererId, descriptor);
    this.ownership.set(rendererId, ownership);
    if (this.createCount - 1 === this.failAfterCreate) {
      throw new Error("synthetic post-registration create failure");
    }
  }

  sampleLayer(
    rendererId: string,
    _descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    visibility: CocosVfxLayerVisibility,
    _commandElapsedSeconds: number,
  ): void {
    if (this.updateCount++ === this.failAtUpdate) {
      throw new Error("synthetic update failure");
    }
    assert.ok(this.descriptors.has(rendererId));
    this.samples.set(rendererId, sample);
    const ownership = this.ownership.get(rendererId);
    assert.ok(ownership);
    this.ownership.set(rendererId, { ...ownership, visibility });
  }

  destroyLayer(rendererId: string, reason: string): void {
    this.descriptors.delete(rendererId);
    this.ownership.delete(rendererId);
    this.samples.delete(rendererId);
    this.destroyed.push([rendererId, reason]);
  }

  activeRendererCount(): number {
    return [...this.ownership.values()].filter(
      (ownership) => ownership.visibility === "active",
    ).length;
  }

  ownedRendererCount(): number {
    return this.descriptors.size;
  }

  visibility(layerId: string): CocosVfxLayerVisibility | undefined {
    const rendererId = [...this.descriptors.entries()].find(
      ([, descriptor]) => descriptor.layerId === layerId,
    )?.[0];
    return rendererId === undefined
      ? undefined
      : this.ownership.get(rendererId)?.visibility;
  }

  rendererOwnership(): readonly CocosVfxRendererOwnership[] {
    return [...this.ownership.values()];
  }
}

function expectCode(
  plan: VfxRenderPlan,
  code: CocosVfxPlanErrorCode,
  resources: readonly CocosVfxResourceRecipe[] =
    TASK014D2_RESOURCE_REGISTRY,
): void {
  const result = compileCocosVfxRenderDescriptors(plan, resources);
  assert.equal(result.ok, false);
  assert.equal("value" in result, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => error.code === code));
  }
}

test("all four D1 fixtures compile into one deterministic concrete descriptor plan", () => {
  const first = descriptorPlan();
  assert.deepEqual(
    first.cues.map((cue) => cue.lifecycle),
    ["one-shot", "one-shot", "looping", "persistent"],
  );
  assert.deepEqual(
    [
      ...new Set(
        first.cues.flatMap((cue) =>
          cue.layers.map((layer) => layer.primitive),
        ),
      ),
    ].sort(),
    ["burst-particles", "ribbon", "ring", "sprite-quad"],
  );
  const permuted = structuredClone(renderPlan());
  (permuted.cues as VfxRenderPlan["cues"][number][]).reverse();
  for (const cue of permuted.cues) {
    (cue.layers as VfxRenderPlan["cues"][number]["layers"][number][]).reverse();
  }
  assert.deepEqual(
    compileCocosVfxRenderDescriptors(
      permuted,
      [...TASK014D2_RESOURCE_REGISTRY].reverse(),
    ),
    { ok: true, value: first, errors: [] },
  );
});

test("descriptor compiler rejects plan, lifecycle, primitive, recipe, blend, and resource corruption", () => {
  const mutations: readonly [
    CocosVfxPlanErrorCode,
    (plan: VfxRenderPlan) => void,
  ][] = [
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_PLAN_VERSION,
      (plan) =>
        Object.assign(plan, { planVersion: "2.0.0" }),
    ],
    [
      CocosVfxPlanErrorCode.INVALID_PLAN,
      (plan) =>
        Object.assign(plan.cues[0]?.layers[0]?.transform.position ?? {}, {
          x: Number.NaN,
        }),
    ],
    [
      CocosVfxPlanErrorCode.LIFECYCLE_MISMATCH,
      (plan) =>
        Object.assign(plan.cues[0] ?? {}, { commandMode: "start-stop" }),
    ],
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_PRIMITIVE,
      (plan) =>
        Object.assign(plan.cues[0]?.layers[0] ?? {}, {
          primitive: "mesh",
        }),
    ],
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
      (plan) =>
        Object.assign(plan.cues[0]?.layers[0]?.resource ?? {}, {
          recipeKind: "engine-prefab",
        }),
    ],
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
      (plan) =>
        Object.assign(plan.cues[0]?.layers[0] ?? {}, {
          blendRole: "subtract",
        }),
    ],
  ];
  for (const [code, mutate] of mutations) {
    const corrupted = structuredClone(renderPlan());
    mutate(corrupted);
    expectCode(corrupted, code);
  }

  const missing = TASK014D2_RESOURCE_REGISTRY.slice(1);
  expectCode(
    renderPlan(),
    CocosVfxPlanErrorCode.MISSING_RESOURCE,
    missing,
  );
  expectCode(
    renderPlan(),
    CocosVfxPlanErrorCode.DUPLICATE_RESOURCE,
    [
      ...TASK014D2_RESOURCE_REGISTRY,
      TASK014D2_RESOURCE_REGISTRY[0] as CocosVfxResourceRecipe,
    ],
  );
  const unsupportedBlend = TASK014D2_RESOURCE_REGISTRY.map((resource) =>
    resource.resourceId === "vfx.aura-glow"
      ? { ...resource, compatibleBlendRoles: ["alpha"] as const }
      : resource,
  );
  expectCode(
    renderPlan(),
    CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
    unsupportedBlend,
  );
});

test("untrusted plan and registry values fail closed, stably, and without mutation", () => {
  const malformed: unknown[] = [
    null,
    7,
    "plan",
    { planVersion: "1.0.0", semantics: {}, cues: [null] },
    { planVersion: "1.0.0", semantics: {}, cues: [,] },
    {
      planVersion: "1.0.0",
      sourceSchemaVersion: "",
      semantics: {},
      cues: [],
    },
  ];
  for (const value of malformed) {
    assert.doesNotThrow(() =>
      compileCocosVfxRenderDescriptors(value, TASK014D2_RESOURCE_REGISTRY));
    assert.equal(
      compileCocosVfxRenderDescriptors(
        value,
        TASK014D2_RESOURCE_REGISTRY,
      ).ok,
      false,
    );
  }
  const mutations: Array<(value: Record<string, unknown>) => void> = [
    (cue) => { cue.cueId = ""; },
    (cue) => { cue.lifecycle = "forever"; },
    (cue) => { cue.commandMode = "toggle"; },
    (cue) => { cue.deterministicSeed = Number.POSITIVE_INFINITY; },
  ];
  for (const mutate of mutations) {
    const plan = structuredClone(renderPlan()) as unknown as {
      cues: Record<string, unknown>[];
    };
    mutate(plan.cues[0] as Record<string, unknown>);
    const before = structuredClone(plan);
    const result = compileCocosVfxRenderDescriptors(
      plan,
      TASK014D2_RESOURCE_REGISTRY,
    );
    assert.equal(result.ok, false);
    assert.deepEqual(plan, before);
    assert.equal("value" in result, false);
  }

  const badRegistries: unknown[] = [
    null,
    [{ ...TASK014D2_RESOURCE_REGISTRY[0], resourceId: "" }],
    [{
      ...TASK014D2_RESOURCE_REGISTRY[0],
      compatiblePrimitives: ["sprite-quad", "sprite-quad"],
    }],
    [{
      ...TASK014D2_RESOURCE_REGISTRY[0],
      compatibleBlendRoles: ["alpha", "alpha"],
    }],
    [{
      ...TASK014D2_RESOURCE_REGISTRY[0],
      compatiblePrimitives: ["mesh"],
    }],
    [{
      ...TASK014D2_RESOURCE_REGISTRY[0],
      compatibleBlendRoles: ["subtract"],
    }],
  ];
  for (const registry of badRegistries) {
    const result = compileCocosVfxRenderDescriptors(renderPlan(), registry);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.some((error) =>
        error.code === CocosVfxPlanErrorCode.INVALID_RESOURCE_REGISTRY));
    }
  }
});

test("unused registry recipe capabilities must each have a concrete renderer factory", () => {
  const cases: readonly [
    CocosVfxResourceRecipe["recipeKind"],
    CocosVfxResourceRecipe["compatiblePrimitives"][number],
  ][] = [
    ["procedural-ring", "sprite-quad"],
    ["procedural-ribbon", "ring"],
    ["textured-sprite", "ring"],
    ["textured-sprite", "ribbon"],
  ];
  for (const [recipeKind, primitive] of cases) {
    const registry = [
      ...TASK014D2_RESOURCE_REGISTRY,
      {
        resourceId: `unused.${recipeKind}.${primitive}`,
        recipeKind,
        compatiblePrimitives: [primitive],
        compatibleBlendRoles: ["alpha"] as const,
      },
    ];
    const before = structuredClone(registry);
    const result = compileCocosVfxRenderDescriptors(renderPlan(), registry);
    assert.equal(result.ok, false);
    assert.equal("value" in result, false);
    assert.deepEqual(registry, before);
    if (!result.ok) {
      assert.ok(result.errors.some((error) =>
        error.code === CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE &&
        error.path.includes("compatiblePrimitives")));
    }
  }
});

test("malformed concrete layer fields and schedules never throw or emit partial descriptors", () => {
  const mutations: Array<(layer: Record<string, unknown>) => void> = [
    (layer) => { layer.order = 0.5; },
    (layer) => { layer.order = -1; },
    (layer) => { layer.order = 10_001; },
    (layer) => { layer.timing = null; },
    (layer) => {
      layer.timing = { ...(layer.timing as object), durationSeconds: 61 };
    },
    (layer) => { layer.transform = { position: { x: 0, y: 0 } }; },
    (layer) => {
      const transform = layer.transform as {
        position: { x: number; y: number };
      };
      transform.position.x = 100_001;
    },
    (layer) => { layer.color = { r: 1, g: 1, b: 1, a: Number.NaN }; },
    (layer) => { layer.opacity = Number.POSITIVE_INFINITY; },
    (layer) => { layer.scaleCurve = [{ time: 0, value: 1 }]; },
    (layer) => {
      layer.scaleCurve = [{ time: 0, value: 1001 }, { time: 1, value: 1 }];
    },
    (layer) => {
      layer.rotationCurve = [
        { time: 0, value: 36_001 },
        { time: 1, value: 0 },
      ];
    },
  ];
  for (const mutate of mutations) {
    const plan = structuredClone(renderPlan()) as unknown as {
      cues: { layers: Record<string, unknown>[] }[];
    };
    mutate(plan.cues[0]?.layers[0] as Record<string, unknown>);
    const result = compileCocosVfxRenderDescriptors(
      plan,
      TASK014D2_RESOURCE_REGISTRY,
    );
    assert.equal(result.ok, false);
    assert.equal("value" in result, false);
  }
  const plan = structuredClone(renderPlan());
  const layer = plan.cues.flatMap((cue) => cue.layers)
    .find((candidate) => candidate.emission !== null);
  assert.ok(layer?.emission);
  Object.assign(layer.emission, {
    count: COCOS_VFX_PLAN_BUDGETS.maxParticles + 1,
    schedule: new Proxy([], {
      get() {
        throw new Error("schedule traversal occurred before budget rejection");
      },
    }),
  });
  assert.doesNotThrow(() =>
    expectCode(plan, CocosVfxPlanErrorCode.BUDGET_EXCEEDED));

  const duplicateOrder = structuredClone(renderPlan());
  const duplicateCue = duplicateOrder.cues.find(
    (candidate) => candidate.layers.length > 1,
  );
  assert.ok(duplicateCue);
  (duplicateCue.layers[1] as { order: number }).order =
    duplicateCue.layers[0]?.order as number;
  expectCode(duplicateOrder, CocosVfxPlanErrorCode.INVALID_PLAN);

  for (const mutate of [
    (emission: NonNullable<typeof layer.emission>) => {
      Object.assign(emission.prng, {
        streamSeed: emission.prng.streamSeed ^ 1,
      });
    },
    (emission: NonNullable<typeof layer.emission>) => {
      (emission.schedule[0] as { randomUint32: number }).randomUint32 ^= 1;
    },
    (emission: NonNullable<typeof layer.emission>) => {
      (emission.schedule[0] as { spawnTimeSeconds: number })
        .spawnTimeSeconds += 0.001;
    },
  ]) {
    const corrupted = structuredClone(renderPlan());
    const corruptedLayer = corrupted.cues.flatMap((cue) => cue.layers)
      .find((candidate) => candidate.emission !== null);
    assert.ok(corruptedLayer?.emission);
    mutate(corruptedLayer.emission);
    expectCode(corrupted, CocosVfxPlanErrorCode.INVALID_PLAN);
  }
});

test("every accepted layer compiles to its typed recipe and material-pass blend target", () => {
  const descriptors = descriptorPlan().cues.flatMap((cue) => cue.layers);
  const expected = new Map([
    ["textured-sprite:sprite-quad", "sprite"],
    ["textured-sprite:burst-particles", "sprite-particles"],
    ["procedural-ring:ring", "graphics-ring"],
    ["procedural-ribbon:ribbon", "graphics-ribbon"],
  ]);
  for (const descriptor of descriptors) {
    assert.equal(
      cocosVfxRendererKind(
        descriptor.recipeKind,
        descriptor.primitive,
      ),
      descriptor.rendererKind,
    );
    assert.equal(
      descriptor.rendererKind,
      expected.get(`${descriptor.recipeKind}:${descriptor.primitive}`),
    );
    assert.deepEqual(
      descriptor.blendState,
      descriptor.blendRole === "alpha"
        ? { source: "src-alpha", destination: "one-minus-src-alpha" }
        : descriptor.blendRole === "additive"
          ? { source: "src-alpha", destination: "one" }
          : { source: "one", destination: "one-minus-src-color" },
    );
    const source = descriptor.blendState.source === "src-alpha"
      ? 1
      : descriptor.blendState.source === "one"
        ? 2
        : 3;
    const destination =
      descriptor.blendState.destination === "one-minus-src-alpha"
        ? 4
        : descriptor.blendState.destination === "one"
          ? 2
          : 5;
    const actualPassTarget = { blendSrc: source, blendDst: destination };
    assert.equal(
      task014d2MaterialBlendMatches(
        actualPassTarget,
        source,
        destination,
      ),
      true,
    );
    assert.equal(
      task014d2MaterialBlendMatches(
        { ...actualPassTarget, blendDst: -1 },
        source,
        destination,
      ),
      false,
    );
  }
  assert.ok(descriptors.some((descriptor) =>
    descriptor.rendererKind === "sprite"));
  assert.ok(descriptors.some((descriptor) =>
    descriptor.rendererKind === "sprite-particles"));
  assert.equal(cocosVfxRendererKind("procedural-ring", "ribbon"), null);
  assert.equal(cocosVfxRendererKind("procedural-ribbon", "ring"), null);
  assert.equal(cocosVfxRendererKind("textured-sprite", "ring"), null);
  assert.deepEqual(
    ["alpha", "additive", "multiply", "screen"].map((role) =>
      cocosVfxBlendState(
        role as Parameters<typeof cocosVfxBlendState>[0],
      )),
    [
      { source: "src-alpha", destination: "one-minus-src-alpha" },
      { source: "src-alpha", destination: "one" },
      { source: "dst-color", destination: "one-minus-src-alpha" },
      { source: "one", destination: "one-minus-src-color" },
    ],
  );
});

test("descriptor budgets and concrete particle schedules fail without partial output", () => {
  const layerBudget = structuredClone(renderPlan());
  const cue = layerBudget.cues[0] as unknown as {
    layers: VfxRenderPlan["cues"][number]["layers"][number][];
  };
  const baseLayer = cue.layers[0];
  assert.ok(baseLayer);
  cue.layers = Array.from(
    { length: COCOS_VFX_PLAN_BUDGETS.maxLayersPerCue + 1 },
    (_, index) => ({
      ...structuredClone(baseLayer),
      layerId: `layer-${index}`,
      order: index,
    }),
  );
  expectCode(layerBudget, CocosVfxPlanErrorCode.BUDGET_EXCEEDED);

  const particleBudget = structuredClone(renderPlan());
  const emission = particleBudget.cues
    .flatMap((candidate) => candidate.layers)
    .find((layer) => layer.emission !== null)?.emission as unknown as {
    count: number;
    schedule: {
      particleIndex: number;
      spawnTimeSeconds: number;
      randomUint32: number;
    }[];
  };
  emission.count = COCOS_VFX_PLAN_BUDGETS.maxParticles + 1;
  emission.schedule = Array.from(
    { length: emission.count },
    (_, particleIndex) => ({
      particleIndex,
      spawnTimeSeconds: 0,
      randomUint32: particleIndex,
    }),
  );
  expectCode(particleBudget, CocosVfxPlanErrorCode.BUDGET_EXCEEDED);

  const outsideLifetime = structuredClone(renderPlan());
  const outsideEmission = outsideLifetime.cues
    .flatMap((candidate) => candidate.layers)
    .find((layer) => layer.emission !== null)?.emission;
  assert.ok(outsideEmission);
  (
    outsideEmission.schedule.at(-1) as { spawnTimeSeconds: number }
  ).spawnTimeSeconds = 100;
  expectCode(outsideLifetime, CocosVfxPlanErrorCode.INVALID_PLAN);
});

test("D2 consumes exact D1 sampling vectors and exact final-boundary behavior", () => {
  const vectors = JSON.parse(
    readFileSync(
      path.join(fixtureRoot, "expected/sampling-vectors.json"),
      "utf8",
    ),
  ) as {
    vectors: {
      delaySeconds: number;
      durationSeconds: number;
      phaseMode: "once" | "repeat-until-semantic-stop";
      timeSeconds: number;
      active: boolean;
      removed: boolean;
      phase: number | null;
      cycleIndex: number | null;
    }[];
  };
  const base = renderPlan().cues[0]?.layers[0];
  assert.ok(base);
  for (const vector of vectors.vectors) {
    const layer = {
      ...base,
      timing: {
        ...base.timing,
        delaySeconds: vector.delaySeconds,
        durationSeconds: vector.durationSeconds,
        phaseMode: vector.phaseMode,
      },
    };
    const sample = sampleVfxLayerAtTime(layer, vector.timeSeconds);
    assert.deepEqual(
      {
        active: sample.active,
        removed: sample.removed,
        phase: sample.phase,
        cycleIndex: sample.cycleIndex,
      },
      {
        active: vector.active,
        removed: vector.removed,
        phase: vector.phase,
        cycleIndex: vector.cycleIndex,
      },
    );
  }
});

test("one-shot uses the final sample and removes exactly one canonical tick later", () => {
  const plan = descriptorPlan();
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "emit",
    cueId: plan.cues[0]?.cueId as string,
    commandId: "one",
  });
  assert.equal(host.activeRendererCount(), 2);
  assert.equal(host.ownedRendererCount(), 4);
  runtime.tick(0.8);
  assert.equal(host.activeRendererCount(), 1);
  assert.ok([...host.samples.values()].some((sample) => sample.phase === 1));
  runtime.tick(1 / VFX_TIME_TICKS_PER_SECOND);
  assert.equal(host.activeRendererCount(), 0);
  assert.deepEqual(runtime.snapshot().activeCueKeys, []);
});

test("delayed layers remain pending and cannot render before their delay", () => {
  assert.equal(task014d2VisibilityRequiresSpatialMeasurement("pending"), false);
  assert.equal(task014d2VisibilityRequiresSpatialMeasurement("removed"), false);
  assert.equal(task014d2VisibilityRequiresSpatialMeasurement("active"), true);
  const plan = structuredClone(renderPlan());
  const cue = plan.cues.find((candidate) =>
    candidate.layers.some((layer) => layer.primitive === "sprite-quad"));
  const layer = cue?.layers.find(
    (candidate) => candidate.primitive === "sprite-quad",
  );
  assert.ok(cue);
  assert.ok(layer);
  (layer.timing as { delaySeconds: number }).delaySeconds = 0.1;
  const compiled = descriptorPlan(plan);
  const descriptorCue = compiled.cues.find(
    (candidate) => candidate.cueId === cue.cueId,
  );
  assert.ok(descriptorCue);
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(compiled, host);
  runtime.dispatch({
    command: "emit",
    cueId: descriptorCue.cueId,
    commandId: "delayed-sprite",
  });
  assert.equal(host.visibility(layer.layerId), "pending");
  assert.equal(
    [...host.ownership.values()].filter(
      (ownership) => ownership.visibility === "pending",
    ).length,
    3,
  );
  assert.equal(runtime.snapshot().pendingRendererCount, 3);
  assert.equal(runtime.snapshot().activeRendererCount, 1);
  runtime.tick(0.1);
  assert.equal(host.visibility(layer.layerId), "active");
  assert.equal(runtime.snapshot().pendingRendererCount, 0);
});

test("one-shot layers leave independently at their exact D1 boundaries", () => {
  const plan = descriptorPlan();
  const footstep = plan.cues.find((cue) =>
    cue.layers.some((layer) => layer.layerId === "ground-ring"));
  const combined = plan.cues.find((cue) =>
    cue.layers.some((layer) => layer.layerId === "front-ribbon"));
  assert.ok(footstep);
  assert.ok(combined);
  const tick = 1 / VFX_TIME_TICKS_PER_SECOND;

  const sampleAt = (
    cue: typeof footstep,
    seconds: number,
  ): FakeHost => {
    const host = new FakeHost();
    const runtime = new CocosVfxRuntimeState(plan, host);
    runtime.dispatch({
      command: "emit",
      cueId: cue.cueId,
      commandId: `sample-${seconds}`,
    });
    runtime.tick(seconds);
    return host;
  };

  let host = sampleAt(footstep, 0.3);
  assert.equal(host.visibility("ground-ring"), "active");
  assert.equal(host.visibility("dust-burst"), "active");
  host = sampleAt(footstep, 0.3 + tick);
  assert.equal(host.visibility("ground-ring"), "removed");
  assert.equal(host.visibility("dust-burst"), "active");
  assert.equal(host.activeRendererCount(), 1);
  host = sampleAt(footstep, 0.45);
  assert.equal(host.visibility("dust-burst"), "active");
  host = sampleAt(footstep, 0.45 + tick);
  assert.equal(host.ownedRendererCount(), 0);

  const boundaries = [
    ["front-ribbon", 0.5],
    ["spark-burst", 0.5],
    ["middle-ring", 0.65],
    ["back-glow", 0.8],
  ] as const;
  for (const [layerId, boundary] of boundaries) {
    assert.equal(sampleAt(combined, boundary).visibility(layerId), "active");
    const following = sampleAt(combined, boundary + tick);
    if (boundary === 0.8) {
      assert.equal(following.ownedRendererCount(), 0);
    } else {
      assert.equal(following.visibility(layerId), "removed");
    }
  }
  assert.equal(sampleAt(combined, 0.5 + tick).activeRendererCount(), 2);
  assert.equal(sampleAt(combined, 0.65 + tick).activeRendererCount(), 1);
});

test("looping skipped frames repeat until authoritative stop", () => {
  const plan = descriptorPlan();
  const cue = plan.cues.find((candidate) => candidate.lifecycle === "looping");
  assert.ok(cue);
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "start",
    cueId: cue.cueId,
    commandId: "loop-start",
    instanceId: "loop-instance",
  });
  runtime.tick(2.4);
  assert.equal(host.activeRendererCount(), 1);
  assert.equal([...host.samples.values()][0]?.phase, 1);
  runtime.dispatch({
    command: "stop",
    instanceId: "loop-instance",
    reason: "semantic-stop",
  });
  assert.equal(host.activeRendererCount(), 0);
});

test("switching start-stop references stops the previous instance before persistent coalescing", () => {
  const plan = descriptorPlan();
  const looping = plan.cues.find((cue) => cue.lifecycle === "looping");
  const persistent = plan.cues.find((cue) => cue.lifecycle === "persistent");
  assert.ok(looping);
  assert.ok(persistent);
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "start",
    cueId: looping.cueId,
    commandId: "looping-start",
    instanceId: "looping-instance",
  });
  runtime.dispatch({
    command: "stop",
    instanceId: "looping-instance",
    reason: "switch",
  });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    runtime.dispatch({
      command: "start",
      cueId: persistent.cueId,
      commandId: `persistent-start-${attempt}`,
      instanceId: "persistent-instance",
    });
  }
  assert.deepEqual(runtime.snapshot().activeCueKeys, ["persistent-instance"]);
  assert.equal(host.activeRendererCount(), persistent.layers.length);
});

test("persistent starts coalesce across six loops and cleanup is symmetric", () => {
  const plan = descriptorPlan();
  const cue = plan.cues.find(
    (candidate) => candidate.lifecycle === "persistent",
  );
  assert.ok(cue);
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  for (let cycle = 0; cycle < 6; cycle += 1) {
    runtime.dispatch({
      command: "start",
      cueId: cue.cueId,
      commandId: `persistent-${cycle}`,
      instanceId: "persistent-instance",
    });
    runtime.tick(1.5);
  }
  assert.equal(runtime.snapshot().activeCueKeys.length, 1);
  assert.equal(host.activeRendererCount(), 2);
  runtime.setPaused(true);
  const before = structuredClone([...host.samples.values()]);
  runtime.tick(10);
  assert.deepEqual([...host.samples.values()], before);
  runtime.setPaused(false);
  runtime.dispatch({
    command: "stop",
    instanceId: "persistent-instance",
    reason: "reset",
  });
  assert.equal(host.activeRendererCount(), 0);
  runtime.rebuild();
  assert.deepEqual(runtime.snapshot(), {
    paused: false,
    activeCueKeys: [],
    activeRendererCount: 0,
    pendingRendererCount: 0,
    removedRendererCount: 0,
    missingRendererIds: [],
    extraRendererIds: [],
    mismatchedRendererIds: [],
    staleRendererCount: 0,
    generation: 2,
    terminalError: null,
  });
});

test("partial construction, duplicate commands, unknown stops, reset, switch, and dispose fail cleanly", () => {
  const plan = descriptorPlan();
  const host = new FakeHost();
  host.failAtCreate = 2;
  const runtime = new CocosVfxRuntimeState(plan, host);
  assert.throws(
    () =>
      runtime.dispatch({
        command: "emit",
        cueId: plan.cues[0]?.cueId as string,
        commandId: "partial",
      }),
    (error: unknown) =>
      error instanceof CocosVfxRuntimeError &&
      error.code === CocosVfxPlanErrorCode.RUNTIME_BUILD_FAILURE,
  );
  assert.equal(host.activeRendererCount(), 0);

  const healthyHost = new FakeHost();
  const healthy = new CocosVfxRuntimeState(plan, healthyHost);
  const cue = plan.cues.find((candidate) => candidate.lifecycle === "looping");
  assert.ok(cue);
  healthy.dispatch({
    command: "start",
    cueId: cue.cueId,
    commandId: "start",
    instanceId: "instance",
  });
  assert.throws(
    () =>
      healthy.dispatch({
        command: "start",
        cueId: cue.cueId,
        commandId: "duplicate",
        instanceId: "instance",
      }),
    (error: unknown) =>
      error instanceof CocosVfxRuntimeError &&
      error.code === CocosVfxPlanErrorCode.DUPLICATE_INSTANCE,
  );
  healthy.cleanup("switch");
  assert.equal(healthyHost.activeRendererCount(), 0);
  assert.throws(
    () =>
      healthy.dispatch({
        command: "stop",
        instanceId: "missing",
        reason: "dispose",
      }),
    (error: unknown) =>
      error instanceof CocosVfxRuntimeError &&
      error.code === CocosVfxPlanErrorCode.UNKNOWN_INSTANCE,
  );
});

test("create plus initial update is atomic, destroy-once, and retryable with the same ID", () => {
  const plan = descriptorPlan();
  const cue = plan.cues.find((candidate) => candidate.layers.length > 1);
  assert.ok(cue);
  const postRegistrationHost = new FakeHost();
  postRegistrationHost.failAfterCreate = 0;
  const postRegistrationRuntime = new CocosVfxRuntimeState(
    plan,
    postRegistrationHost,
  );
  const postRegistrationCommand = {
    command: "emit" as const,
    cueId: cue.cueId,
    commandId: "post-registration-retry",
  };
  assert.throws(
    () => postRegistrationRuntime.dispatch(postRegistrationCommand),
    CocosVfxRuntimeError,
  );
  assert.equal(postRegistrationHost.ownedRendererCount(), 0);
  assert.deepEqual(postRegistrationRuntime.snapshot().activeCueKeys, []);
  postRegistrationHost.failAfterCreate = Number.POSITIVE_INFINITY;
  assert.doesNotThrow(() =>
    postRegistrationRuntime.dispatch(postRegistrationCommand));
  postRegistrationRuntime.cleanup("reset");
  assert.equal(postRegistrationHost.ownedRendererCount(), 0);

  for (const failedUpdate of [0, 1]) {
    const host = new FakeHost();
    host.failAtUpdate = failedUpdate;
    const runtime = new CocosVfxRuntimeState(plan, host);
    const command = {
      command: "emit" as const,
      cueId: cue.cueId,
      commandId: "retryable",
    };
    assert.throws(
      () => runtime.dispatch(command),
      (error: unknown) =>
        error instanceof CocosVfxRuntimeError &&
        error.code === CocosVfxPlanErrorCode.RUNTIME_BUILD_FAILURE,
    );
    assert.equal(host.activeRendererCount(), 0);
    assert.deepEqual(runtime.snapshot().activeCueKeys, []);
    assert.equal(
      new Set(host.destroyed.map(([rendererId]) => rendererId)).size,
      cue.layers.length,
    );
    assert.equal(host.destroyed.length, cue.layers.length);
    host.failAtUpdate = Number.POSITIVE_INFINITY;
    assert.doesNotThrow(() => runtime.dispatch(command));
    assert.equal(runtime.snapshot().activeCueKeys.length, 1);
    runtime.cleanup("reset");
    const destroyCounts = new Map<string, number>();
    for (const [rendererId] of host.destroyed) {
      destroyCounts.set(rendererId, (destroyCounts.get(rendererId) ?? 0) + 1);
    }
    assert.ok([...destroyCounts.values()].every((count) => count === 2));
  }
});

test("tick-time sampler or host failure enters one terminal cleanup path", () => {
  const plan = descriptorPlan();
  const cue = plan.cues.find((candidate) => candidate.lifecycle === "looping");
  assert.ok(cue);
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "start",
    cueId: cue.cueId,
    commandId: "start",
    instanceId: "terminal",
  });
  host.failAtUpdate = host.updateCount;
  assert.throws(() => runtime.tick(1 / 60), CocosVfxRuntimeError);
  assert.equal(host.activeRendererCount(), 0);
  const snapshot = runtime.snapshot();
  assert.deepEqual(snapshot.activeCueKeys, []);
  assert.match(snapshot.terminalError ?? "", /synthetic update failure/u);
  const destroyCount = host.destroyed.length;
  assert.throws(() => runtime.tick(1 / 60), CocosVfxRuntimeError);
  assert.equal(host.destroyed.length, destroyCount);

  const invalidHost = new FakeHost();
  const invalidRuntime = new CocosVfxRuntimeState(plan, invalidHost);
  invalidRuntime.dispatch({
    command: "start",
    cueId: cue.cueId,
    commandId: "invalid",
    instanceId: "invalid-time",
  });
  assert.throws(() => invalidRuntime.tick(Number.NaN), CocosVfxRuntimeError);
  assert.equal(invalidHost.activeRendererCount(), 0);
  assert.notEqual(invalidRuntime.snapshot().terminalError, null);
});

test("ownership snapshots detect missing, extra, and mismatched IDs even at equal counts", () => {
  const plan = descriptorPlan();
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "emit",
    cueId: plan.cues[0]?.cueId as string,
    commandId: "ownership",
  });
  const first = host.rendererOwnership()[0];
  assert.ok(first);
  const firstDescriptor = host.descriptors.get(first.rendererId);
  assert.ok(firstDescriptor);
  const expectedActive = host.activeRendererCount();
  host.ownership.delete(first.rendererId);
  host.descriptors.delete(first.rendererId);
  host.ownership.set("extra", {
    rendererId: "extra",
    instanceId: "other",
    descriptorId: "other",
    visibility: first.visibility,
  });
  host.descriptors.set("extra", firstDescriptor);
  let snapshot = runtime.snapshot();
  assert.deepEqual(snapshot.missingRendererIds, [first.rendererId]);
  assert.deepEqual(snapshot.extraRendererIds, ["extra"]);
  assert.equal(snapshot.staleRendererCount, 2);
  assert.equal(snapshot.activeRendererCount, expectedActive);
  assert.throws(() => runtime.tick(0), CocosVfxRuntimeError);
  assert.equal(host.ownedRendererCount(), 0);
  assert.notEqual(runtime.snapshot().terminalError, null);

  const mismatchHost = new FakeHost();
  const mismatchRuntime = new CocosVfxRuntimeState(plan, mismatchHost);
  mismatchRuntime.dispatch({
    command: "emit",
    cueId: plan.cues[0]?.cueId as string,
    commandId: "mismatch",
  });
  const mismatched = mismatchHost.rendererOwnership()[0];
  assert.ok(mismatched);
  mismatchHost.ownership.set(mismatched.rendererId, {
    ...mismatched,
    instanceId: "wrong-owner",
  });
  snapshot = mismatchRuntime.snapshot();
  assert.deepEqual(snapshot.mismatchedRendererIds, [mismatched.rendererId]);
});

test("input, sorting, nested transforms, projection, and viewport contracts are deterministic", () => {
  assert.equal(new Set(TASK014D2_INPUT_REGISTRY.map((entry) => entry.key)).size, 9);
  assert.equal(
    new Set(TASK014D2_INPUT_REGISTRY.map((entry) => entry.action)).size,
    9,
  );
  assert.ok(TASK014D2_SORTING.vfxMaximum < TASK014D2_SORTING.debug);
  assert.ok(TASK014D2_SORTING.debug < TASK014D2_SORTING.hud);
  const parent = {
    x: 100,
    y: -50,
    rotationDegrees: 30,
    scaleX: 1.5,
    scaleY: 0.75,
  };
  const local = {
    x: 80,
    y: 20,
    rotationDegrees: -15,
    scaleX: 0.8,
    scaleY: 1.2,
  };
  const world = composeTask014D2Affine(parent, local);
  assert.ok(task014d2PointInsideSafeViewport(world));
  const projected = projectTask014D2WorldToOverlay(
    { x: world.x, y: world.y },
    parent,
  );
  assert.ok(Math.abs(projected.x - local.x) < 1e-9);
  assert.ok(Math.abs(projected.y - local.y) < 1e-9);
  assert.equal(
    task014d2PointInsideSafeViewport({
      x: Number.POSITIVE_INFINITY,
      y: 0,
    }),
    false,
  );
});

test("global sorting is unique, bounded, and independent of cue activation permutations", () => {
  const plan = descriptorPlan();
  const all = plan.cues.flatMap((cue) => cue.layers);
  assert.equal(
    new Set(all.map((descriptor) => descriptor.sortingOrder)).size,
    all.length,
  );
  assert.ok(all.every((descriptor) =>
    descriptor.sortingOrder >= TASK014D2_SORTING.vfxMinimum &&
    descriptor.sortingOrder <= TASK014D2_SORTING.vfxMaximum));
  const expected = new Map(all.map((descriptor) => [
    descriptor.descriptorId,
    descriptor.sortingOrder,
  ]));
  for (const cueOrder of [
    [...renderPlan().cues].reverse(),
    [...renderPlan().cues].sort((left, right) =>
      right.cueId < left.cueId ? -1 : 1),
  ]) {
    const permuted = { ...renderPlan(), cues: cueOrder };
    const compiled = descriptorPlan(permuted);
    assert.deepEqual(
      new Map(compiled.cues.flatMap((cue) => cue.layers).map((descriptor) => [
        descriptor.descriptorId,
        descriptor.sortingOrder,
      ])),
      expected,
    );
  }

  const runtimeEntries = all.map((descriptor, index) => ({
    rendererId: `renderer-${index}`,
    cueId: descriptor.cueId,
    layerId: descriptor.layerId,
    instanceId: `instance-${descriptor.cueId}`,
    authoredOrder: descriptor.layer.order,
  }));
  const duplicatedLayer = runtimeEntries[0];
  assert.ok(duplicatedLayer);
  runtimeEntries.push({
    ...duplicatedLayer,
    rendererId: "renderer-duplicate-instance",
    instanceId: "instance-z",
  });
  const runtimeExpected = rankCocosVfxRuntimeSorting(runtimeEntries);
  for (const permutation of [
    [...runtimeEntries].reverse(),
    [...runtimeEntries].sort((left, right) =>
      compareCodeUnits(right.rendererId, left.rendererId)),
  ]) {
    assert.deepEqual(
      rankCocosVfxRuntimeSorting(permutation),
      runtimeExpected,
    );
  }
  assert.equal(new Set(runtimeExpected.values()).size, runtimeEntries.length);
  assert.ok([...runtimeExpected.values()].every((order) =>
    order >= TASK014D2_SORTING.vfxMinimum &&
    order <= TASK014D2_SORTING.vfxMaximum));

  const capacity =
    TASK014D2_SORTING.vfxMaximum - TASK014D2_SORTING.vfxMinimum + 1;
  assert.throws(
    () => rankCocosVfxRuntimeSorting(Array.from(
      { length: capacity + 1 },
      (_, index) => ({
        rendererId: `overflow-${index}`,
        cueId: "cue",
        layerId: "layer",
        instanceId: `instance-${index}`,
        authoredOrder: 0,
      }),
    )),
    new RegExp(CocosVfxPlanErrorCode.SORTING_RANGE_EXCEEDED, "u"),
  );
});

test("transformed primitive bounds include rotation, non-uniform scale, and safe-inset overflow", () => {
  const transformed = transformTask014D2Bounds(
    { minimumX: -100, minimumY: -10, maximumX: 100, maximumY: 10 },
    {
      x: 0,
      y: 0,
      rotationDegrees: 90,
      scaleX: 1.5,
      scaleY: 0.5,
    },
  );
  assert.ok(Math.abs(transformed.minimumX + 5) < 1e-9);
  assert.ok(Math.abs(transformed.maximumY - 150) < 1e-9);
  assert.equal(task014d2BoundsOverflowPx(transformed), 0);
  assert.equal(
    task014d2BoundsOverflowPx({
      minimumX: -620,
      minimumY: -10,
      maximumX: 620,
      maximumY: 10,
    }),
    12,
  );
  assert.equal(
    task014d2BoundsOverflowPx({
      minimumX: Number.NaN,
      minimumY: 0,
      maximumX: 1,
      maximumY: 1,
    }),
    Number.POSITIVE_INFINITY,
  );

  const localBounds = {
    minimumX: -80,
    minimumY: -20,
    maximumX: 80,
    maximumY: 20,
  };
  const child = {
    x: 70,
    y: 35,
    rotationDegrees: -12,
    scaleX: 1.1,
    scaleY: 0.85,
  };
  const stress = {
    x: 55,
    y: -25,
    rotationDegrees: 18,
    scaleX: 1.18,
    scaleY: 0.82,
  };
  const exactNested = transformTask014D2NestedBounds(
    localBounds,
    [child, stress],
  );
  const lossyCollapsed = transformTask014D2Bounds(
    localBounds,
    composeTask014D2Affine(stress, child),
  );
  assert.notDeepEqual(
    Object.values(exactNested).map((value) => value.toFixed(6)),
    Object.values(lossyCollapsed).map((value) => value.toFixed(6)),
  );
  assert.equal(task014d2BoundsOverflowPx(exactNested), 0);
  assert.ok(Object.values(exactNested).every(Number.isFinite));
  assert.equal(task014d2SpatialErrorsWithinTolerance(0.5, 0.25, 0.5), true);
  assert.equal(task014d2SpatialErrorsWithinTolerance(0, 0, 0.500001), false);
});

test("HUD and tests consume one typed diagnostic model", () => {
  const diagnostics = createTask014D2RuntimeDiagnostics();
  diagnostics.setupCount = 3;
  diagnostics.teardownCount = 2;
  diagnostics.rebuildCount = 2;
  diagnostics.persistentStartAttempts = 6;
  diagnostics.acceptedPersistentStarts = 1;
  diagnostics.coalescedPersistentStarts = 5;
  diagnostics.activeRecipeBlendSummary = "sprite/additive";
  const hud = formatTask014D2Diagnostics(diagnostics, {
    ready: true,
    playing: false,
    elapsedSeconds: 0,
    stress: false,
    debug: false,
  });
  for (const text of [
    "Setup 3",
    "Teardown 2",
    "Rebuild 2",
    "Persistent attempts 6",
    "accepted 1",
    "coalesced 5",
    "sprite/additive",
    "STOPPED 0.00s",
    "No errors",
  ]) {
    assert.match(hud, new RegExp(text, "u"));
  }
});

test("setup faults preserve the first error and sweep every partial owner before retry", () => {
  for (const fault of [
    "material-mismatch",
    "registered-before-throw",
    "initial-sample",
    "hud-input-setup",
    "cleanup-failure",
  ]) {
    const state = {
      input: fault === "registered-before-throw" ? 1 : 0,
      root: 1,
      runtime: 1,
      hostBindings: 2,
      materials: 2,
      generation: 4,
    };
    const result = runTask014D2FailureCleanup(
      new Error(`first:${fault}`),
      [
        {
          id: "runtime",
          run: () => {
            state.runtime = 0;
            if (fault === "cleanup-failure") {
              throw new Error("later cleanup failure");
            }
          },
        },
        { id: "input", run: () => { state.input = 0; } },
        {
          id: "host",
          run: () => {
            state.hostBindings = 0;
            state.materials = 0;
          },
        },
        { id: "root", run: () => { state.root = 0; } },
        { id: "generation", run: () => { state.generation += 1; } },
        { id: "root", run: () => { throw new Error("duplicate step"); } },
      ],
    );
    assert.equal(result.firstError, `first:${fault}`);
    assert.deepEqual(
      result.completedStepIds,
      ["runtime", "input", "host", "root", "generation"],
    );
    assert.deepEqual(state, {
      input: 0,
      root: 0,
      runtime: 0,
      hostBindings: 0,
      materials: 0,
      generation: 5,
    });
    const retry = {
      root: state.root + 1,
      input: state.input + 1,
      ready: true,
      terminalError: "",
    };
    assert.deepEqual(retry, {
      root: 1,
      input: 1,
      ready: true,
      terminalError: "",
    });
  }
});

test("Trail ROI gate requires visible pixels, stable Pause, and changing Resume", () => {
  const reset = new Uint8Array(4_000);
  const active = new Uint8Array(reset);
  for (let pixel = 0; pixel < 640; pixel += 1) {
    active[pixel * 4 + 1] = 32;
    active[pixel * 4 + 3] = 255;
  }
  const visible = measureTask014D2RoiDifference(reset, active);
  assert.ok(visible.maxChannelDifference >= 20);
  assert.ok(visible.changedPixels >= 500);
  assert.deepEqual(measureTask014D2RoiDifference(active, active), {
    maxChannelDifference: 0,
    changedPixels: 0,
  });
  const resumed = new Uint8Array(active);
  resumed[900 * 4 + 1] = 48;
  assert.ok(
    measureTask014D2RoiDifference(active, resumed).changedPixels > 0,
  );
  assert.throws(
    () => measureTask014D2RoiDifference(reset, new Uint8Array(3)),
    /TASK_014D2_INVALID_ROI_PIXEL_BUFFER/u,
  );
});

test("generated D2 mirrors, exact D1 sampler source, and concrete plan data are closed", () => {
  const modules = readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".ts"))
    .sort();
  for (const moduleName of modules) {
    const source = readFileSync(path.join(sourceRoot, moduleName), "utf8");
    const generated = readFileSync(
      path.join(runtimeRoot, moduleName),
      "utf8",
    );
    const expected = `// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.\n${source
      .replace(/from "(\.\.?\/[^"]+)\.js";/gu, 'from "$1";')
      .replace(
        /from "@gameai\/vfx-authoring";/gu,
        'from "./d1/index";',
      )}`;
    assert.equal(generated, expected, moduleName);
  }
  for (const moduleName of ["semantics.ts", "types.ts"]) {
    assert.equal(
      readFileSync(path.join(runtimeRoot, "d1", moduleName), "utf8"),
      `// Exact generated TASK-014D1 source mirror. Do not hand-edit.\n${readFileSync(
        path.join(
          repositoryRoot,
          "pipelines/vfx-authoring/source",
          moduleName,
        ),
        "utf8",
      )}`,
    );
  }
  const compiled = compileVfxAuthoring(
    authoringDocument(),
    compileContext,
  );
  assert.equal(compiled.ok, true);
  if (compiled.ok) {
    assert.equal(
      readFileSync(path.join(runtimeRoot, "render-plan-data.ts"), "utf8"),
      [
        "// Generated from all four accepted TASK-014D1 fixtures. Do not hand-edit.",
        'import type { VfxRenderPlan } from "./d1/types";',
        `export const TASK014D2_RENDER_PLAN = ${compiled.value.serialized.trim()} as const satisfies VfxRenderPlan;`,
        "",
      ].join("\n"),
    );
  }
});

test("primitive dispatch is exhaustive and contains no cue-name conditional branch", () => {
  const actualRuntime = readFileSync(
    path.join(
      runtimeRoot,
      "task014d2-cocos-vfx-render-plan-adapter.ts",
    ),
    "utf8",
  );
  const runtimeSource = [
    ...readdirSync(sourceRoot)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(path.join(sourceRoot, name), "utf8")),
    actualRuntime,
  ].join("\n");
  assert.doesNotMatch(
    runtimeSource,
    /(?:if|switch)[^{;\n]*(?:dust|trail|aura|hand|foot)/iu,
  );
  assert.match(actualRuntime, /addComponent\(Sprite\)/u);
  assert.match(actualRuntime, /srcBlendFactor/u);
  assert.match(actualRuntime, /dstBlendFactor/u);
  assert.match(actualRuntime, /rendererKind/u);
  assert.match(actualRuntime, /recipeKind/u);
  assert.match(actualRuntime, /switch \(descriptor\.recipeKind\)/u);
  assert.match(actualRuntime, /cocosVfxRendererKind/u);
  assert.match(actualRuntime, /rankCocosVfxRuntimeSorting/u);
  assert.match(actualRuntime, /node\.setParent\(target\)/u);
  assert.match(actualRuntime, /descriptor\.blendRole/u);
  assert.match(actualRuntime, /descriptor\.lifecycle/u);
  assert.match(actualRuntime, /observedAxisInTarget/u);
  assert.match(
    actualRuntime,
    /renderer instanceof Graphics[\s\S]*getMaterialInstance\(0\)\?\.recompileShaders/u,
  );
  assert.match(actualRuntime, /addComponent\(Graphics\);\s*graphics\.stroke\(\)/u);
  assert.match(actualRuntime, /showFailureHud/u);
  assert.match(actualRuntime, /destroyAll\("terminal-failure"\)/u);
  for (const fault of [
    "material-mismatch",
    "registered-before-throw",
    "initial-sample",
    "hud-input-setup",
    "cleanup-failure",
  ]) {
    assert.match(actualRuntime, new RegExp(`injectSetupFault\\("${fault}"\\)`, "u"));
  }
  assert.doesNotMatch(actualRuntime, /getWorldRotation/u);
  assert.match(actualRuntime, /activeStartStop/u);
  assert.match(
    actualRuntime,
    /command:\s*"stop"[\s\S]*activeStartStop[\s\S]*command:\s*"start"/u,
  );
  const primitives = descriptorPlan().cues.flatMap((cue) =>
    cue.layers.map((layer) => layer.primitive),
  );
  for (const primitive of [
    "sprite-quad",
    "ring",
    "ribbon",
    "burst-particles",
  ] as const) {
    assert.ok(primitives.includes(primitive));
  }
});

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  VFX_TIME_TICKS_PER_SECOND,
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
  composeTask014D2Affine,
  projectTask014D2WorldToOverlay,
  task014d2PointInsideSafeViewport,
} from "../source/task014d2/cocos-vfx-harness-contract";
import {
  COCOS_VFX_PLAN_BUDGETS,
  compileCocosVfxRenderDescriptors,
  type CocosVfxLayerDescriptor,
  type CocosVfxResourceRecipe,
} from "../source/task014d2/cocos-vfx-render-descriptor";
import {
  CocosVfxRuntimeState,
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
  readonly samples = new Map<string, VfxLayerSample>();
  readonly destroyed: Array<readonly [string, string]> = [];
  failAtCreate = Number.POSITIVE_INFINITY;
  createCount = 0;

  createLayer(
    rendererId: string,
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (this.createCount++ === this.failAtCreate) {
      throw new Error("synthetic partial build failure");
    }
    if (this.descriptors.has(rendererId)) {
      throw new Error(`duplicate renderer ${rendererId}`);
    }
    this.descriptors.set(rendererId, descriptor);
  }

  updateLayer(
    rendererId: string,
    _descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    _commandElapsedSeconds: number,
  ): void {
    assert.ok(this.descriptors.has(rendererId));
    this.samples.set(rendererId, sample);
  }

  destroyLayer(rendererId: string, reason: string): void {
    this.descriptors.delete(rendererId);
    this.samples.delete(rendererId);
    this.destroyed.push([rendererId, reason]);
  }

  activeRendererCount(): number {
    return this.descriptors.size;
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
  assert.equal(host.activeRendererCount(), 4);
  runtime.tick(0.8);
  assert.equal(host.activeRendererCount(), 4);
  assert.ok([...host.samples.values()].some((sample) => sample.phase === 1));
  runtime.tick(1 / VFX_TIME_TICKS_PER_SECOND);
  assert.equal(host.activeRendererCount(), 0);
  assert.deepEqual(runtime.snapshot().activeCueKeys, []);
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
    staleRendererCount: 0,
    generation: 2,
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
  const runtimeSource = [
    ...readdirSync(sourceRoot)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(path.join(sourceRoot, name), "utf8")),
  ].join("\n");
  assert.doesNotMatch(
    runtimeSource,
    /(?:if|switch)[^{;\n]*(?:dust|trail|aura|hand|foot)/iu,
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

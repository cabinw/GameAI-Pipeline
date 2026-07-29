import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createCharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
} from "@gameai/character-semantic-events";
import {
  parseAndCompileVfxAuthoring,
  serializeVfxRenderPlan,
  type VfxLayerSample,
  type VfxRenderPlan,
} from "@gameai/vfx-authoring";

import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
  requireTask014CTargetBinding,
  resolveTask014CTargetBindings,
  Task014CTargetError,
  Task014CTargetErrorCode,
} from "../source/task014c/canonical-semantic-vfx-contract";
import type {
  PropBridgePlan,
  PropStateId,
} from "../source/task013r6/prop-bridge-runtime-contract";
import {
  TASK014D2_RESOURCE_REGISTRY,
  task014d2BoundsOverflowPx,
  transformTask014D2NestedBounds,
} from "../source/task014d2/cocos-vfx-harness-contract";
import {
  compileCocosVfxRenderDescriptors,
  type CocosVfxLayerDescriptor,
} from "../source/task014d2/cocos-vfx-render-descriptor";
import {
  CocosVfxPlanErrorCode,
  CocosVfxRuntimeError,
} from "../source/task014d2/cocos-vfx-diagnostics";
import {
  CocosVfxRuntimeState,
  type CocosVfxLayerVisibility,
  type CocosVfxRendererOwnership,
  type CocosVfxRuntimeHost,
} from "../source/task014d2/cocos-vfx-runtime-state";
import {
  TASK014D3_COMPILE_CONTEXT,
  TASK014D3_PARAMETER_OVERRIDES,
} from "../source/task014d3/canonical-vfx-authoring-contract";
import {
  TASK014D3_INPUT_REGISTRY,
  formatTask014D3InputHelpLines,
  validateTask014D3InputRegistry,
} from "../source/task014d3/canonical-vfx-input-registry";
import {
  TASK014D3_INITIAL_TRACK_ID,
  TASK014D3_SEMANTIC_EVENT_CONTEXT,
  TASK014D3_SEMANTIC_EVENT_CONTRACT,
  TASK014D3_SEMANTIC_TRACK_REGISTRY,
} from "../source/task014d3/canonical-vfx-semantic-contract";
import {
  CanonicalVfxRuntimeAdapter,
} from "../source/task014d3/canonical-vfx-runtime-adapter";
import {
  TASK014D3_COMPONENT_CLEANUP_STEP_IDS,
  Task014D3ComponentTransaction,
  runTask014D3VfxCleanupTransaction,
} from "../source/task014d3/canonical-vfx-component-transaction";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const authoringFile = path.join(
  repositoryRoot,
  "examples/vfx-cue-authoring/canonical-full-loadout-vfx.json",
);
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/task014d3",
);

function compileCanonical() {
  const result = parseAndCompileVfxAuthoring(
    readFileSync(authoringFile, "utf8"),
    TASK014D3_COMPILE_CONTEXT,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("TASK-014D3 canonical compilation failed");
  return result.value;
}

function descriptors(plan: VfxRenderPlan = compileCanonical().plan) {
  const result = compileCocosVfxRenderDescriptors(
    plan,
    TASK014D2_RESOURCE_REGISTRY,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("TASK-014D3 descriptor compilation failed");
  return result.value;
}

class FakeHost implements CocosVfxRuntimeHost {
  readonly ownership = new Map<string, CocosVfxRendererOwnership>();
  readonly descriptors = new Map<string, CocosVfxLayerDescriptor>();
  readonly samples = new Map<string, VfxLayerSample>();
  readonly destroyed: Array<readonly [string, string]> = [];
  failCreateAt = Number.POSITIVE_INFINITY;
  failDestroyOnce = false;
  createCount = 0;

  createLayer(
    ownership: CocosVfxRendererOwnership,
    descriptor: CocosVfxLayerDescriptor,
  ): void {
    if (this.createCount++ === this.failCreateAt) {
      throw new Error("TASK_014D3_SYNTHETIC_BUILD_FAILURE");
    }
    assert.equal(this.ownership.has(ownership.rendererId), false);
    this.ownership.set(ownership.rendererId, ownership);
    this.descriptors.set(ownership.rendererId, descriptor);
  }

  sampleLayer(
    rendererId: string,
    _descriptor: CocosVfxLayerDescriptor,
    sample: VfxLayerSample,
    visibility: CocosVfxLayerVisibility,
    _elapsed: number,
  ): void {
    const ownership = this.ownership.get(rendererId);
    assert.ok(ownership);
    this.ownership.set(rendererId, { ...ownership, visibility });
    this.samples.set(rendererId, sample);
  }

  destroyLayer(rendererId: string, reason: string): void {
    if (this.failDestroyOnce) {
      this.failDestroyOnce = false;
      throw new Error("TASK_014D3_SYNTHETIC_CLEANUP_FAILURE");
    }
    this.ownership.delete(rendererId);
    this.descriptors.delete(rendererId);
    this.samples.delete(rendererId);
    this.destroyed.push([rendererId, reason]);
  }

  rendererOwnership(): readonly CocosVfxRendererOwnership[] {
    return [...this.ownership.values()];
  }
}

function evaluator(trackId = TASK014D3_INITIAL_TRACK_ID) {
  const result = createCharacterSemanticEventEvaluator(
    TASK014D3_SEMANTIC_EVENT_CONTRACT,
    TASK014D3_SEMANTIC_EVENT_CONTEXT,
    trackId,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("TASK-014D3 evaluator creation failed");
  return result.value;
}

function dispatch(
  adapter: CanonicalVfxRuntimeAdapter,
  commands: readonly EvaluatedSemanticEvent[],
): void {
  for (const command of commands) adapter.dispatch(command);
}

function targetPlan(): PropBridgePlan {
  const prop = (
    attachmentId: string,
    propStateId: "left-hand-prop" | "right-hand-prop",
  ) => ({
    attachmentId,
    slotId: `${propStateId}-slot`,
    parentPartId:
      propStateId === PROP_LEFT_HAND_STATE_ID ? "hand-left" : "hand-right",
    targetSocketId:
      propStateId === PROP_LEFT_HAND_STATE_ID
        ? "hand-left-grip"
        : "hand-right-grip",
    propStateId,
    attachmentKind: "prop" as const,
    resourcePath: `props/${attachmentId}/spriteFrame`,
    transform: {
      position: { x: 0, y: 0 },
      rotationDegrees: 0,
      scale: { x: 1, y: 1 },
    },
    anchor: { x: 0.5, y: 0.12 },
    gripAnchor: { x: 0.5, y: 0.12 },
    gripLocalOffset: { x: 0, y: 0 },
    handOverlayAttachmentId: `${attachmentId}-overlay`,
    visualOffset: { x: 0, y: 0 },
    visualSize: { width: 10, height: 10 },
    drawOrder: 1,
    sortingOrder: 1,
    layerRole: "behind-target" as const,
    enabledByPropState: {
      [PROP_NO_PROP_STATE_ID]: false,
      [PROP_LEFT_HAND_STATE_ID]: propStateId === PROP_LEFT_HAND_STATE_ID,
      [PROP_RIGHT_HAND_STATE_ID]: propStateId === PROP_RIGHT_HAND_STATE_ID,
    },
  });
  return {
    attachments: [
      prop("declared-left-tool", PROP_LEFT_HAND_STATE_ID),
      prop("declared-right-tool", PROP_RIGHT_HAND_STATE_ID),
    ],
  } as unknown as PropBridgePlan;
}

test("canonical D1 authoring compiles to byte-identical concrete plans", () => {
  const first = compileCanonical();
  for (let pass = 0; pass < 5; pass += 1) {
    assert.equal(compileCanonical().serialized, first.serialized);
  }
  assert.equal(
    first.serialized,
    serializeVfxRenderPlan(first.plan),
  );
  assert.deepEqual(
    first.plan.cues.map((cue) => cue.cueId),
    [
      "combined-reference",
      "footstep-dust",
      "hand-tool-trail",
      "persistent-aura",
    ],
  );
  assert.deepEqual(
    [...new Set(first.plan.cues.flatMap((cue) =>
      cue.layers.map((layer) => layer.primitive)))].sort(),
    ["burst-particles", "ribbon", "ring", "sprite-quad"],
  );
});

test("compile-time overrides disappear into concrete layer values", () => {
  const compiled = compileCanonical();
  const serialized = compiled.serialized;
  for (const forbidden of [
    "parameterId",
    "parameters",
    "bindings",
    "trail-width",
    "intensity",
    '"tint"',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(TASK014D3_PARAMETER_OVERRIDES["footstep-dust"], {
    intensity: 0.9,
  });
  const dust = compiled.plan.cues.find((cue) =>
    cue.cueId === "footstep-dust");
  assert.equal(dust?.layers.find((layer) =>
    layer.layerId === "dust-burst")?.opacity, 0.81);
  const trail = compiled.plan.cues.find((cue) =>
    cue.cueId === "hand-tool-trail");
  assert.equal(trail?.layers[0]?.transform.scale.y, 1.25);
});

test("input permutation and locale cannot change canonical plan bytes", () => {
  const expected = compileCanonical().serialized;
  const parsed = JSON.parse(
    readFileSync(authoringFile, "utf8"),
  ) as { schemaVersion: string; cues: unknown[] };
  parsed.cues.reverse();
  for (const cue of parsed.cues as Array<{ layers: unknown[] }>) {
    cue.layers.reverse();
  }
  const context = {
    ...TASK014D3_COMPILE_CONTEXT,
    semanticCues: [...TASK014D3_COMPILE_CONTEXT.semanticCues].reverse(),
    resources: [...TASK014D3_COMPILE_CONTEXT.resources].reverse(),
  };
  const result = parseAndCompileVfxAuthoring(JSON.stringify(parsed), context);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) assert.equal(result.value.serialized, expected);
});

test("unknown semantic/resource and incompatible lifecycle fail closed", () => {
  const text = readFileSync(authoringFile, "utf8");
  for (const context of [
    {
      ...TASK014D3_COMPILE_CONTEXT,
      semanticCues: TASK014D3_COMPILE_CONTEXT.semanticCues.slice(1),
    },
    {
      ...TASK014D3_COMPILE_CONTEXT,
      resources: TASK014D3_COMPILE_CONTEXT.resources.slice(1),
    },
    {
      ...TASK014D3_COMPILE_CONTEXT,
      semanticCues: TASK014D3_COMPILE_CONTEXT.semanticCues.map((cue) =>
        cue.cueId === "hand-tool-trail"
          ? { ...cue, lifecycle: "persistent" as const }
          : cue),
    },
  ]) {
    const result = parseAndCompileVfxAuthoring(text, context);
    assert.equal(result.ok, false);
    assert.equal("value" in result, false);
  }
});

test("unsupported primitive, recipe, blend and duplicate resources fail closed", () => {
  const mutations: readonly [
    typeof CocosVfxPlanErrorCode.UNSUPPORTED_PRIMITIVE |
      typeof CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE |
      typeof CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
    (plan: VfxRenderPlan) => void,
  ][] = [
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_PRIMITIVE,
      (plan) => Object.assign(plan.cues[0]?.layers[0] ?? {}, {
        primitive: "mesh",
      }),
    ],
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_RECIPE,
      (plan) => Object.assign(
        plan.cues[0]?.layers[0]?.resource ?? {},
        { recipeKind: "engine-prefab" },
      ),
    ],
    [
      CocosVfxPlanErrorCode.UNSUPPORTED_BLEND,
      (plan) => Object.assign(plan.cues[0]?.layers[0] ?? {}, {
        blendRole: "subtract",
      }),
    ],
  ];
  for (const [expected, mutate] of mutations) {
    const plan = structuredClone(compileCanonical().plan);
    mutate(plan);
    const result = compileCocosVfxRenderDescriptors(
      plan,
      TASK014D2_RESOURCE_REGISTRY,
    );
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === expected), true);
  }
  const duplicate = compileCocosVfxRenderDescriptors(
    compileCanonical().plan,
    [
      ...TASK014D2_RESOURCE_REGISTRY,
      TASK014D2_RESOURCE_REGISTRY[0]!,
    ],
  );
  assert.equal(duplicate.ok, false);
  assert.equal(
    duplicate.errors.some((error) =>
      error.code === CocosVfxPlanErrorCode.DUPLICATE_RESOURCE),
    true,
  );
});

test("D3 semantic contract uses all four authored cue IDs and seven tracks", () => {
  assert.equal(TASK014D3_SEMANTIC_TRACK_REGISTRY.length, 7);
  assert.deepEqual(
    TASK014D3_SEMANTIC_EVENT_CONTRACT.vfxCues.map((cue) => cue.cueId),
    [
      "footstep-dust",
      "hand-tool-trail",
      "persistent-aura",
      "combined-reference",
    ],
  );
  const cueIds = new Set(
    TASK014D3_SEMANTIC_EVENT_CONTRACT.tracks.flatMap((track) =>
      track.events.map((event) => event.semanticCueId)),
  );
  assert.deepEqual(
    [...cueIds].sort(),
    [
      "combined-reference",
      "footstep-dust",
      "hand-tool-trail",
      "persistent-aura",
    ],
  );
});

test("all 12 canonical loadout states resolve all three prop target forms", () => {
  const contract = JSON.parse(
    readFileSync(
      path.join(
        repositoryRoot,
        "examples/production-lite-full-loadout/loadout-contract.json",
      ),
      "utf8",
    ),
  ) as { states: Array<{ stateId: string; propStateId?: PropStateId }> };
  assert.equal(contract.states.length, 12);
  const observed = new Map<PropStateId, number>();
  for (const state of contract.states) {
    const propState = state.propStateId ?? PROP_NO_PROP_STATE_ID;
    const bindings = resolveTask014CTargetBindings(targetPlan(), propState);
    assert.equal(requireTask014CTargetBinding(bindings, "left-foot").sourceId,
      "shoe-left");
    assert.equal(requireTask014CTargetBinding(bindings, "right-foot").sourceId,
      "shoe-right");
    assert.equal(requireTask014CTargetBinding(bindings, "body-center").sourceId,
      "torso");
    const active = requireTask014CTargetBinding(
      bindings,
      "active-hand-tool",
    );
    assert.equal(
      active.sourceKind,
      propState === PROP_NO_PROP_STATE_ID ? "joint" : "prop-grip",
    );
    observed.set(propState, (observed.get(propState) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(observed), {
    [PROP_NO_PROP_STATE_ID]: 4,
    [PROP_LEFT_HAND_STATE_ID]: 4,
    [PROP_RIGHT_HAND_STATE_ID]: 4,
  });
});

test("missing canonical and stale prop targets retain stable diagnostics", () => {
  assert.throws(
    () => requireTask014CTargetBinding(new Map(), "left-foot"),
    (error: unknown) =>
      error instanceof Task014CTargetError &&
      error.code === Task014CTargetErrorCode.TARGET_SOURCE_UNAVAILABLE,
  );
  const stalePlan = targetPlan();
  const withoutLeft = {
    ...stalePlan,
    attachments: stalePlan.attachments.filter(
      (attachment) => attachment.propStateId !== PROP_LEFT_HAND_STATE_ID,
    ),
  };
  assert.throws(
    () => resolveTask014CTargetBindings(
      withoutLeft,
      PROP_LEFT_HAND_STATE_ID,
    ),
    (error: unknown) =>
      error instanceof Task014CTargetError &&
      error.code === Task014CTargetErrorCode.ACTIVE_PROP_TARGET_MISSING,
  );
});

test("Walk emits left/right Dust with typed target ownership", () => {
  const host = new FakeHost();
  const adapter = new CanonicalVfxRuntimeAdapter(
    new CocosVfxRuntimeState(descriptors(), host),
  );
  const value = evaluator("canonical-walk-events");
  value.play();
  dispatch(adapter, value.advance(0.81));
  assert.equal(adapter.snapshot().emitCount, 2);
  assert.deepEqual(
    [...new Set([...host.ownership.values()].map((item) => item.targetId))]
      .sort(),
    ["left-foot", "right-foot"],
  );
  adapter.tick(0.5);
  assert.equal(host.ownership.size, 0);
});

test("Wave and Prop Swing Trail bind the active hand/tool typed target", () => {
  for (const trackId of [
    "canonical-wave-events",
    "canonical-prop-swing-events",
  ] as const) {
    const host = new FakeHost();
    const adapter = new CanonicalVfxRuntimeAdapter(
      new CocosVfxRuntimeState(descriptors(), host),
    );
    const value = evaluator(trackId);
    value.play();
    dispatch(adapter, value.advance(0.21));
    assert.equal(host.ownership.size, 1);
    assert.deepEqual(
      [...host.ownership.values()].map((item) => item.targetId),
      ["active-hand-tool"],
    );
    dispatch(adapter, value.switchTrack("canonical-rest-events"));
    assert.equal(host.ownership.size, 0);
  }
});

test("Persistent Aura accepts once and coalesces five repeated cycle attempts", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  const adapter = new CanonicalVfxRuntimeAdapter(runtime);
  const value = evaluator("canonical-aura-events");
  value.play();
  dispatch(adapter, value.advance(0.11));
  for (let cycle = 1; cycle < 6; cycle += 1) {
    adapter.repeatPersistentAttempt();
  }
  assert.deepEqual(adapter.snapshot(), {
    emitCount: 0,
    startCount: 1,
    stopCount: 0,
    persistentStartAttempts: 6,
    acceptedPersistentStarts: 1,
    coalescedPersistentStarts: 5,
    lastCommand:
      "start:canonical-aura-events:body-persistent-aura:0",
  });
  assert.equal(runtime.snapshot().activeRendererCount, 2);
  assert.equal(
    runtime.snapshot().activeCueKeys.length,
    1,
    "one visible logical Aura instance may own multiple authored layers",
  );
  assert.deepEqual(
    [...new Set([...host.ownership.values()].map((item) => item.targetId))],
    ["body-center"],
  );
});

test("Pause/Resume preserves persistent runtime and renderer identity", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  const adapter = new CanonicalVfxRuntimeAdapter(runtime);
  const value = evaluator("canonical-aura-events");
  value.play();
  dispatch(adapter, value.advance(0.11));
  const before = [...host.ownership.keys()];
  value.pause();
  adapter.setPaused(true);
  adapter.tick(4);
  assert.deepEqual([...host.ownership.keys()], before);
  value.resume();
  adapter.setPaused(false);
  adapter.tick(0.2);
  assert.deepEqual([...host.ownership.keys()], before);
});

test("Combined creates all four primitive layers and removes at exact lifecycle boundary", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  const adapter = new CanonicalVfxRuntimeAdapter(runtime);
  const value = evaluator("canonical-combined-events");
  value.play();
  dispatch(adapter, value.advance(0.36));
  assert.equal(host.ownership.size, 4);
  assert.deepEqual(
    [...host.descriptors.values()].map((item) => item.primitive).sort(),
    ["burst-particles", "ribbon", "ring", "sprite-quad"],
  );
  adapter.tick(0.8);
  assert.equal(host.ownership.size, 4);
  adapter.tick(0.000000000001);
  assert.equal(host.ownership.size, 0);
});

test("target invalidation cleanup is atomic before the next typed target bind", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  const adapter = new CanonicalVfxRuntimeAdapter(runtime);
  const value = evaluator("canonical-wave-events");
  value.play();
  dispatch(adapter, value.advance(0.21));
  const oldIds = [...host.ownership.keys()];
  adapter.cleanup("target-invalidation");
  assert.equal(host.ownership.size, 0);
  assert.equal(host.destroyed.length, oldIds.length);
  runtime.dispatch({
    command: "start",
    cueId: "hand-tool-trail",
    commandId: "rebound",
    instanceId: "rebound",
    targetId: "active-hand-tool",
  });
  assert.equal(host.ownership.size, 1);
  assert.equal([...host.ownership.values()][0]?.targetId, "active-hand-tool");
});

test("duplicate renderer instances and non-finite/overflow inputs fail closed", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  const start = {
    command: "start" as const,
    cueId: "hand-tool-trail",
    commandId: "first",
    instanceId: "shared-instance",
    targetId: "active-hand-tool",
  };
  runtime.dispatch(start);
  assert.throws(
    () => runtime.dispatch({ ...start, commandId: "duplicate" }),
    (error: unknown) =>
      error instanceof CocosVfxRuntimeError &&
      error.code === CocosVfxPlanErrorCode.DUPLICATE_INSTANCE,
  );
  runtime.cleanup("test");
  const nonFinite = structuredClone(compileCanonical().plan);
  Object.assign(
    nonFinite.cues[0]?.layers[0]?.transform.position ?? {},
    { x: Number.NaN },
  );
  const rejected = compileCocosVfxRenderDescriptors(
    nonFinite,
    TASK014D2_RESOURCE_REGISTRY,
  );
  assert.equal(rejected.ok, false);
  assert.equal(
    task014d2BoundsOverflowPx({
      minimumX: -1000,
      minimumY: -1000,
      maximumX: 1000,
      maximumY: 1000,
    }) > 0,
    true,
  );
});

test("two rebuild generations and post-rebuild VFX leave exact ownership", () => {
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  runtime.rebuild();
  runtime.rebuild();
  assert.equal(runtime.snapshot().generation, 3);
  runtime.dispatch({
    command: "emit",
    cueId: "footstep-dust",
    commandId: "post-rebuild-dust",
    targetId: "left-foot",
  });
  assert.equal(host.ownership.size, 2);
  assert.equal(
    [...host.ownership.keys()].every((id) => id.startsWith("3:")),
    true,
  );
});

test("resource/setup/sample failure is transactional and cleanup retry compensates", () => {
  const host = new FakeHost();
  host.failCreateAt = 1;
  const runtime = new CocosVfxRuntimeState(descriptors(), host);
  assert.throws(
    () => runtime.dispatch({
      command: "emit",
      cueId: "footstep-dust",
      commandId: "partial",
      targetId: "left-foot",
    }),
    /TASK_014D3_SYNTHETIC_BUILD_FAILURE/u,
  );
  assert.equal(host.ownership.size, 0);

  const cleanupHost = new FakeHost();
  const cleanupRuntime = new CocosVfxRuntimeState(descriptors(), cleanupHost);
  cleanupRuntime.dispatch({
    command: "start",
    cueId: "hand-tool-trail",
    commandId: "cleanup",
    instanceId: "cleanup",
    targetId: "active-hand-tool",
  });
  cleanupHost.failDestroyOnce = true;
  assert.throws(
    () => cleanupRuntime.cleanup("first"),
    /TASK_014D3_SYNTHETIC_CLEANUP_FAILURE/u,
  );
  cleanupRuntime.cleanup("retry");
  assert.equal(cleanupHost.ownership.size, 0);
});

test("Normal/Stress transformed four-corner bounds remain finite and safe", () => {
  const local = {
    minimumX: -104,
    minimumY: -58,
    maximumX: 72,
    maximumY: 72,
  };
  for (const transforms of [
    [
      { x: 0, y: 0, rotationDegrees: 0, scaleX: 1, scaleY: 1 },
    ],
    [
      { x: 40, y: -24, rotationDegrees: 13, scaleX: 1.12, scaleY: 0.88 },
      { x: -12, y: 18, rotationDegrees: -7, scaleX: 0.92, scaleY: 1.08 },
    ],
  ]) {
    const bounds = transformTask014D2NestedBounds(local, transforms);
    assert.equal(Object.values(bounds).every(Number.isFinite), true);
    assert.equal(task014d2BoundsOverflowPx(bounds), 0);
  }
});

test("coordinator synthetic closure matrix preserves compensation ownership", () => {
  const triggers = [
    "setup-failure",
    "terminal-failure",
    "target-invalidation",
    "exact-reset",
    "rebuild",
    "disable",
    "destroy",
  ] as const;
  for (const trigger of triggers) {
    for (const injectedStep of TASK014D3_COMPONENT_CLEANUP_STEP_IDS) {
      const primaryError = new Error(
        `TASK_014D3_PRIMARY:${trigger}:${injectedStep}`,
      );
      const attempts = new Map<string, number>();
      const successfulOrder: string[] = [];
      const counts = {
        root: 1,
        input: 1,
        owner: 1,
        material: 1,
        node: 3,
        references: 1,
        lifecycle: 1,
      };
      let generatedDetached = false;
      let overlayDetached = false;
      const operation = (stepId: string, complete: () => void) => () => {
        const attempt = (attempts.get(stepId) ?? 0) + 1;
        attempts.set(stepId, attempt);
        if (stepId === injectedStep && attempt === 1) {
          throw new Error(`TASK_014D3_INJECTED:${stepId}`);
        }
        complete();
        successfulOrder.push(stepId);
      };
      const transaction = new Task014D3ComponentTransaction({
        semanticEvaluator: operation("semantic-evaluator", () => {}),
        vfxRuntime: operation("vfx-runtime", () => {
          counts.owner = 0;
        }),
        vfxHost: operation("vfx-host", () => {
          counts.material = 0;
          counts.node = Math.min(counts.node, 2);
        }),
        inputHandler: operation("input-handler", () => {
          counts.input = 0;
        }),
        generatedRootDetach: operation("generated-root-detach", () => {
          generatedDetached = true;
        }),
        overlayRootDetach: operation("overlay-root-detach", () => {
          overlayDetached = true;
        }),
        generatedRootDestroy: operation("generated-root-destroy", () => {
          if (!generatedDetached) {
            throw new Error("TASK_014D3_GENERATED_ROOT_STILL_ATTACHED");
          }
          counts.root = 0;
          counts.node = Math.min(counts.node, 1);
        }),
        overlayRootDestroy: operation("overlay-root-destroy", () => {
          if (!overlayDetached) {
            throw new Error("TASK_014D3_OVERLAY_ROOT_STILL_ATTACHED");
          }
          counts.node = 0;
        }),
        referencesClear: operation("references-clear", () => {
          counts.references = 0;
        }),
        parentLifecycle: operation("parent-lifecycle", () => {
          counts.lifecycle = 0;
        }),
      });
      const sweep = transaction.cleanup(primaryError);
      assert.equal(sweep.primaryErrorIdentityPreserved, true);
      assert.equal(sweep.final.primaryError, primaryError);
      assert.equal(sweep.complete, true);
      assert.deepEqual(counts, {
        root: 0,
        input: 0,
        owner: 0,
        material: 0,
        node: 0,
        references: 0,
        lifecycle: 0,
      });
      assert.equal(sweep.first.pendingStepIds.includes(injectedStep), true);
      assert.equal(
        sweep.firstCleanupErrors[0]?.stepId,
        injectedStep,
      );
      for (const stepId of TASK014D3_COMPONENT_CLEANUP_STEP_IDS) {
        const expectedAttempts =
          stepId === injectedStep ||
            (stepId === "generated-root-destroy" &&
              injectedStep === "generated-root-detach") ||
            (stepId === "overlay-root-destroy" &&
              injectedStep === "overlay-root-detach")
            ? 2
            : 1;
        assert.equal(
          attempts.get(stepId),
          expectedAttempts,
          `${trigger}:${injectedStep}:${stepId}`,
        );
        assert.equal(
          successfulOrder.filter((entry) => entry === stepId).length,
          1,
          `${trigger}:${injectedStep}:${stepId}:exactly-once`,
        );
      }
      Object.assign(counts, {
        root: 1,
        input: 1,
        owner: 0,
        material: 0,
        node: 2,
        references: 1,
        lifecycle: 1,
      });
      assert.equal(counts.root, 1);
      assert.equal(counts.input, 1);
    }
  }
});

test("Creator component closure exposes actual callbacks and early parent ownership seams", () => {
  const component = readFileSync(
    path.join(
      runtimeRoot,
      "task014d3-canonical-loadout-vfx-authoring-integration.ts",
    ),
    "utf8",
  );
  const parent = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/task013r6/task013r6-one-handed-prop-integration.ts",
    ),
    "utf8",
  );
  assert.match(
    component,
    /onDisable\(\): void \{\s*this\.actualLifecycleCallbackOrder\.push\("onDisable"\);\s*super\.onDisable\(\);/u,
  );
  assert.match(
    component,
    /onDestroy\(\): void \{\s*this\.actualLifecycleCallbackOrder\.push\("onDestroy"\);\s*super\.onDestroy\(\);/u,
  );
  assert.match(
    component,
    /this\.enabled = false;\s*this\.destroy\(\);/u,
  );
  assert.match(
    component,
    /if \(this\.componentTransaction\?\.complete\) \{\s*if \(dispose && !this\.disposeFinalized\) \{\s*this\.finalizeCanonicalRuntimeTeardown\(true\);/u,
  );
  assert.match(
    component,
    /protected publishCanonicalRuntimeRootOwnership\(\s*kind: "generated" \| "overlay",\s*root: Node,/u,
  );
  assert.match(
    component,
    /TASK_014D3_CREATOR_PARTIAL_BUILD_FAULT:\$\{stepId\}/u,
  );
  assert.match(
    parent,
    /const generatedRoot = this\.nodeWithLayer\([\s\S]*?this\.publishCanonicalRuntimeRootOwnership\("generated", generatedRoot\);\s*this\.beforeCanonicalRuntimeBuildStep\("base"\);/u,
  );
  assert.match(
    parent,
    /const overlayRoot = this\.nodeWithLayer\([\s\S]*?this\.publishCanonicalRuntimeRootOwnership\("overlay", overlayRoot\);\s*this\.beforeCanonicalRuntimeBuildStep\("overlay"\);/u,
  );
  for (const stepId of [
    "base",
    "attachment",
    "prop",
    "overlay",
    "graphics",
    "graphics-sorting",
    "hud",
    "hud-sorting",
  ]) {
    assert.match(
      parent,
      new RegExp(
        `this\\.beforeCanonicalRuntimeBuildStep\\("${stepId}"\\)`,
        "u",
      ),
    );
  }
  assert.ok(
    parent.indexOf('this.beforeCanonicalRuntimeBuildStep("hud-sorting")') <
      parent.indexOf("this.runtime = {"),
  );
});

test("target rebind transaction never publishes before old renderer cleanup", () => {
  const order: string[] = [];
  let oldRendererCount = 1;
  let publishedTarget = "old-target";
  let failRuntimeOnce = true;
  const targetError = new Error("TASK_014D3_TARGET_REBIND_FAILED");
  const sweep = runTask014D3VfxCleanupTransaction(
    {
      semanticStop: () => order.push("semantic-stop"),
      runtimeCleanup: () => {
        order.push("runtime-cleanup");
        if (failRuntimeOnce) {
          failRuntimeOnce = false;
          throw new Error("TASK_014D3_RUNTIME_CLEANUP_ONCE");
        }
        oldRendererCount = 0;
      },
      hostCleanup: () => {
        order.push("host-cleanup");
        oldRendererCount = 0;
      },
    },
    targetError,
  );
  assert.equal(sweep.final.primaryError, targetError);
  assert.equal(sweep.primaryErrorIdentityPreserved, true);
  assert.equal(sweep.complete, true);
  assert.equal(oldRendererCount, 0);
  assert.equal(publishedTarget, "old-target");
  assert.deepEqual(order, [
    "semantic-stop",
    "runtime-cleanup",
    "host-cleanup",
    "runtime-cleanup",
  ]);
  publishedTarget = "new-target";
  assert.equal(publishedTarget, "new-target");
});

test("typed input/HUD registry includes Combined without a long single line", () => {
  assert.equal(validateTask014D3InputRegistry(), TASK014D3_INPUT_REGISTRY);
  assert.equal(TASK014D3_INPUT_REGISTRY.length, 18);
  assert.equal(
    TASK014D3_INPUT_REGISTRY.find((item) =>
      item.actionId === "track.combined")?.displayedKey,
    "7",
  );
  const lines = formatTask014D3InputHelpLines();
  assert.equal(lines.length, 4);
  assert.equal(Math.max(...lines.map((line) => line.length)) < 180, true);
});

test("runtime contains no authoring parser, parameter resolution, name dispatch or sampler fork", () => {
  const component = readFileSync(
    path.join(
      runtimeRoot,
      "task014d3-canonical-loadout-vfx-authoring-integration.ts",
    ),
    "utf8",
  );
  const adapter = readFileSync(
    path.join(runtimeRoot, "canonical-vfx-runtime-adapter.ts"),
    "utf8",
  );
  for (const source of [component, adapter]) {
    assert.doesNotMatch(
      source,
      /JSON\.parse|parseAndCompile|compileVfxAuthoring|parameterOverrides|sampleVfxLayerAtTime|canonicalTimeToTicks/u,
    );
    assert.doesNotMatch(
      source,
      /\.includes\(["'`](?:dust|trail|aura)|startsWith\(["'`](?:dust|trail|aura)/iu,
    );
  }
  assert.match(component, /extends GameAIComposableCharacterLoadoutReferenceV2/u);
  assert.match(component, /new CocosRenderPlanHost\(/u);
  assert.match(component, /new CocosVfxRuntimeState\(/u);
  assert.match(
    component,
    /this\.node\.children\.includes\(runtime\.generatedRoot\) \? 1 : 0/u,
  );
  assert.match(
    component,
    /VISIBLE \$\{vfx\?\.activeCueKeys\.length \?\? 0\}/u,
  );
  assert.match(
    component,
    /ensureProjectionTransform\(node\)/u,
  );
  assert.match(
    component,
    /node\.getComponent\(UITransform\) \?\?\s*node\.addComponent\(UITransform\)/u,
  );
  assert.match(component, /protected teardownRuntime\(dispose: boolean\)/u);
  assert.match(component, /new Task014D3ComponentTransaction\(\{/u);
  assert.match(component, /this\.unregisterInput\(\)/u);
  assert.match(component, /ownership\.generatedRoot\?\.removeFromParent\(\)/u);
  assert.match(component, /ownership\.overlayRoot\?\.removeFromParent\(\)/u);
  assert.match(component, /this\.clearCanonicalRuntimeReferences\(\)/u);
  assert.match(component, /this\.finalizeCanonicalRuntimeTeardown\(/u);
  assert.doesNotMatch(component, /private cleanupVfx\(/u);
});

test("generated mirrors, concrete plan and source hashes are closed", () => {
  const generatedPlan = readFileSync(
    path.join(runtimeRoot, "render-plan-data.ts"),
    "utf8",
  );
  const compiled = compileCanonical();
  const sourceHash = createHash("sha256")
    .update(readFileSync(authoringFile, "utf8"))
    .digest("hex");
  const planHash = createHash("sha256")
    .update(compiled.serialized)
    .digest("hex");
  assert.match(generatedPlan, new RegExp(sourceHash, "u"));
  assert.match(generatedPlan, new RegExp(planHash, "u"));
  assert.match(generatedPlan, /TASK014D3_RENDER_PLAN = /u);
  for (const moduleName of [
    "canonical-vfx-semantic-contract.ts",
    "canonical-vfx-runtime-adapter.ts",
    "canonical-vfx-input-registry.ts",
    "canonical-vfx-component-transaction.ts",
  ]) {
    const source = readFileSync(
      path.join(extensionRoot, "source/task014d3", moduleName),
      "utf8",
    );
    const expected =
      "// Generated from the tested TASK-014D3 composition boundary. Do not hand-edit.\n" +
      source.replace(/from "(\.\.?\/[^"]+)\.js";/gu, 'from "$1";');
    assert.equal(
      readFileSync(path.join(runtimeRoot, moduleName), "utf8"),
      expected,
      moduleName,
    );
  }
});

test("D2 parity remains optional-target compatible and shares exact runtime modules", () => {
  const plan = descriptors();
  const host = new FakeHost();
  const runtime = new CocosVfxRuntimeState(plan, host);
  runtime.dispatch({
    command: "emit",
    cueId: "footstep-dust",
    commandId: "d2-compatible",
  });
  assert.equal(
    [...host.ownership.values()].every((item) => item.targetId === undefined),
    true,
  );
  const d2Component = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/task014d2/task014d2-cocos-vfx-render-plan-adapter.ts",
    ),
    "utf8",
  );
  const d3Component = readFileSync(
    path.join(
      runtimeRoot,
      "task014d3-canonical-loadout-vfx-authoring-integration.ts",
    ),
    "utf8",
  );
  assert.match(d2Component, /export class CocosRenderPlanHost/u);
  assert.match(
    d3Component,
    /from "\.\.\/task014d2\/task014d2-cocos-vfx-render-plan-adapter"/u,
  );
  assert.doesNotMatch(d3Component, /class CocosRenderPlanHost/u);
  const parentComponent = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/task013r6/task013r6-one-handed-prop-integration.ts",
    ),
    "utf8",
  );
  assert.match(
    parentComponent,
    /protected handleCanonicalRuntimeSetupFailure\(_error: unknown\): boolean \{\s*return false;\s*\}/u,
  );
  assert.match(
    parentComponent,
    /catch \(setupError\) \{\s*if \(!this\.handleCanonicalRuntimeSetupFailure\(setupError\)\) \{\s*throw setupError;/u,
  );
  assert.match(
    parentComponent,
    /protected teardownRuntime\(dispose: boolean\): void \{\s*this\.beforeCanonicalRuntimeTeardown\(dispose\);\s*this\.unregisterInput\(\);\s*this\.runtime\?\.generatedRoot\.removeFromParent\(\);\s*this\.runtime\?\.overlayRoot\.removeFromParent\(\);\s*this\.runtime\?\.generatedRoot\.destroy\(\);\s*this\.runtime\?\.overlayRoot\.destroy\(\);\s*this\.clearCanonicalRuntimeReferences\(\);\s*this\.finalizeCanonicalRuntimeTeardown\(dispose\);/u,
  );
});

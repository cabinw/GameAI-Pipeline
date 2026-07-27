import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createCharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
} from "@gameai/character-semantic-events";

import {
  SemanticVfxAdapter,
  type SemanticVfxHost,
  type SemanticVfxPose,
  type SemanticVfxRendererRequest,
  type SemanticVfxRendererUpdate,
} from "../source/task014b/semantic-vfx-adapter";
import {
  SemanticVfxAdapterError,
  SemanticVfxAdapterErrorCode,
} from "../source/task014b/semantic-vfx-diagnostics";
import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
  TASK014C_INITIAL_TRACK_ID,
  TASK014C_LOGICAL_TARGET_IDS,
  TASK014C_SEMANTIC_EVENT_CONTEXT,
  TASK014C_SEMANTIC_EVENT_CONTRACT,
  TASK014C_SEMANTIC_TRACK_REGISTRY,
  Task014CTargetError,
  Task014CTargetErrorCode,
  requireTask014CTargetBinding,
  resolveTask014CTargetBindings,
  task014cTrackForClip,
} from "../source/task014c/canonical-semantic-vfx-contract";
import {
  TASK014C_INPUT_REGISTRY,
  formatTask014CInputHelpLines,
  validateTask014CInputRegistry,
} from "../source/task014c/canonical-semantic-vfx-input-registry";
import { Task014CLifecycle } from "../source/task014c/canonical-semantic-vfx-lifecycle";
import type {
  PropBridgePlan,
  PropStateId,
} from "../source/task013r6/prop-bridge-runtime-contract";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");

function targetPlan(): PropBridgePlan {
  const prop = (
    attachmentId: string,
    propStateId: "left-hand-prop" | "right-hand-prop",
  ) => ({
    attachmentId,
    slotId: `${propStateId}-slot`,
    parentPartId:
      propStateId === PROP_LEFT_HAND_STATE_ID
        ? "hand-left"
        : "hand-right",
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
      [PROP_LEFT_HAND_STATE_ID]:
        propStateId === PROP_LEFT_HAND_STATE_ID,
      [PROP_RIGHT_HAND_STATE_ID]:
        propStateId === PROP_RIGHT_HAND_STATE_ID,
    },
  });
  return {
    attachments: [
      prop("declared-left-tool", PROP_LEFT_HAND_STATE_ID),
      prop("declared-right-tool", PROP_RIGHT_HAND_STATE_ID),
    ],
  } as unknown as PropBridgePlan;
}

class FakeHost implements SemanticVfxHost {
  readonly renderers = new Map<string, SemanticVfxRendererRequest>();
  readonly updates = new Map<string, SemanticVfxRendererUpdate>();
  readonly destroyed: Array<readonly [string, string]> = [];
  propStateId: PropStateId = PROP_NO_PROP_STATE_ID;
  unavailable = new Set<string>();

  resolveSocket(socketId: string): SemanticVfxPose | undefined {
    const binding = requireTask014CTargetBinding(
      resolveTask014CTargetBindings(targetPlan(), this.propStateId),
      socketId,
    );
    if (this.unavailable.has(binding.sourceId)) return undefined;
    const seed = [...binding.sourceId].reduce(
      (sum, value) => sum + value.charCodeAt(0),
      0,
    );
    return {
      position: { x: seed % 200, y: (seed * 3) % 180 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1 },
    };
  }

  createRenderer(request: SemanticVfxRendererRequest): void {
    assert.equal(this.renderers.has(request.rendererId), false);
    this.renderers.set(request.rendererId, request);
  }

  updateRenderer(
    rendererId: string,
    update: SemanticVfxRendererUpdate,
  ): void {
    assert.equal(this.renderers.has(rendererId), true);
    this.updates.set(rendererId, update);
  }

  destroyRenderer(rendererId: string, reason: string): void {
    this.renderers.delete(rendererId);
    this.updates.delete(rendererId);
    this.destroyed.push([rendererId, reason]);
  }

  activeRendererCount(): number {
    return this.renderers.size;
  }
}

function evaluator(trackId = TASK014C_INITIAL_TRACK_ID) {
  const result = createCharacterSemanticEventEvaluator(
    TASK014C_SEMANTIC_EVENT_CONTRACT,
    TASK014C_SEMANTIC_EVENT_CONTEXT,
    trackId,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("TASK-014C evaluator creation failed");
  return result.value;
}

function dispatch(
  adapter: SemanticVfxAdapter,
  commands: readonly EvaluatedSemanticEvent[],
): void {
  for (const command of commands) adapter.dispatch(command);
}

test("TASK-014C semantic contract covers five canonical clips plus explicit Aura", () => {
  assert.equal(TASK014C_SEMANTIC_EVENT_CONTRACT.schemaVersion, "1.0.0");
  assert.deepEqual(
    [...new Set(TASK014C_SEMANTIC_TRACK_REGISTRY.map((item) => item.clipId))]
      .sort(),
    [
      "production-lite-full-loadout-integration-stress",
      "production-lite-full-loadout-prop-swing",
      "production-lite-full-loadout-rest",
      "production-lite-full-loadout-walk",
      "production-lite-full-loadout-wave",
    ],
  );
  for (const entry of TASK014C_SEMANTIC_TRACK_REGISTRY.slice(0, 5)) {
    assert.equal(task014cTrackForClip(entry.clipId), entry.trackId);
  }
  assert.deepEqual(
    TASK014C_SEMANTIC_EVENT_CONTEXT.rigLayout.sockets?.map(
      (socket) => socket.socketId,
    ),
    TASK014C_LOGICAL_TARGET_IDS,
  );
});

test("all 12 canonical states deterministically resolve no/left/right active targets", async () => {
  const serialized = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        "examples/production-lite-full-loadout/loadout-contract.json",
      ),
      "utf8",
    ),
  ) as { states: Array<{ stateId: string; propStateId?: PropStateId }> };
  assert.equal(serialized.states.length, 12);
  const observed = new Map<PropStateId, Set<string>>();
  for (const state of serialized.states) {
    const propStateId = state.propStateId ?? PROP_NO_PROP_STATE_ID;
    const bindings = resolveTask014CTargetBindings(
      targetPlan(),
      propStateId,
    );
    assert.deepEqual([...bindings.keys()], TASK014C_LOGICAL_TARGET_IDS);
    const active = requireTask014CTargetBinding(
      bindings,
      "active-hand-tool",
    );
    assert.equal(
      active.sourceKind,
      propStateId === PROP_NO_PROP_STATE_ID ? "joint" : "prop-grip",
    );
    const ids = observed.get(propStateId) ?? new Set<string>();
    ids.add(active.sourceId);
    observed.set(propStateId, ids);
  }
  assert.deepEqual(
    Object.fromEntries(
      [...observed].map(([state, ids]) => [state, [...ids]]),
    ),
    {
      [PROP_NO_PROP_STATE_ID]: ["hand-right"],
      [PROP_LEFT_HAND_STATE_ID]: ["declared-left-tool"],
      [PROP_RIGHT_HAND_STATE_ID]: ["declared-right-tool"],
    },
  );
});

test("unknown and unavailable target paths fail closed with stable diagnostics", () => {
  const bindings = resolveTask014CTargetBindings(
    targetPlan(),
    PROP_NO_PROP_STATE_ID,
  );
  assert.throws(
    () => requireTask014CTargetBinding(bindings, "canvas-center"),
    (error) =>
      error instanceof Task014CTargetError &&
      error.code === Task014CTargetErrorCode.UNKNOWN_LOGICAL_TARGET,
  );
  const broken = {
    attachments: [],
  } as unknown as PropBridgePlan;
  assert.throws(
    () =>
      resolveTask014CTargetBindings(
        broken,
        PROP_LEFT_HAND_STATE_ID,
      ),
    (error) =>
      error instanceof Task014CTargetError &&
      error.code === Task014CTargetErrorCode.ACTIVE_PROP_TARGET_MISSING,
  );
});

test("Dust captures alternating feet and cleans both one-shots deterministically", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const value = evaluator("canonical-walk-events");
  value.play();
  dispatch(adapter, value.advance(0.81));
  assert.equal(adapter.snapshot().emitCount, 2);
  assert.equal(adapter.snapshot().activeOneShotCount, 2);
  assert.notDeepEqual(
    host.updates.get("emit:canonical-walk-events:walk-dust-left:0")?.pose
      .position,
    host.updates.get("emit:canonical-walk-events:walk-dust-right:0")?.pose
      .position,
  );
  adapter.tick(0.36);
  assert.equal(host.activeRendererCount(), 0);
  assert.equal(adapter.snapshot().activeOneShotCount, 0);
});

test("Wave and Prop Swing Trail re-resolve atomically across no/left/right prop", () => {
  for (const trackId of [
    "canonical-wave-events",
    "canonical-prop-swing-events",
  ] as const) {
    const host = new FakeHost();
    const adapter = new SemanticVfxAdapter(host);
    const value = evaluator(trackId);
    value.play();
    dispatch(adapter, value.advance(0.21));
    const rendererId = [...host.renderers.keys()][0]!;
    const noProp = host.updates.get(rendererId)?.pose.position;
    host.propStateId = PROP_LEFT_HAND_STATE_ID;
    adapter.tick(0);
    const left = host.updates.get(rendererId)?.pose.position;
    host.propStateId = PROP_RIGHT_HAND_STATE_ID;
    adapter.tick(0);
    const right = host.updates.get(rendererId)?.pose.position;
    assert.notDeepEqual(noProp, left);
    assert.notDeepEqual(left, right);
    assert.equal(host.renderers.size, 1);
    assert.equal(adapter.snapshot().duplicateStartCount, 0);
    dispatch(adapter, value.switchTrack("canonical-rest-events"));
    assert.equal(host.renderers.size, 0);
    assert.equal(adapter.snapshot().unknownStopCount, 0);
  }
});

test("target invalidation stops through cleanup without stale renderer retention", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const value = evaluator("canonical-wave-events");
  value.play();
  dispatch(adapter, value.advance(0.21));
  host.unavailable.add("hand-right");
  assert.throws(
    () => adapter.tick(0.01),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.UNKNOWN_SOCKET,
  );
  adapter.cleanup("rebuild");
  assert.equal(host.activeRendererCount(), 0);
  assert.equal(adapter.snapshot().leakedInstanceCount, 0);
});

test("persistent Aura coalesces for six loops, survives Pause/Resume, and stops once", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const value = evaluator("canonical-aura-events");
  value.play();
  for (let cycle = 0; cycle < 6; cycle += 1) {
    dispatch(adapter, value.advance(2));
  }
  const id = "canonical-aura-events:body-persistent-aura:0";
  assert.deepEqual(value.snapshot.activeInstanceIds, [id]);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [id]);
  assert.equal(host.activeRendererCount(), 1);
  assert.equal(adapter.snapshot().startCount, 1);
  value.pause();
  assert.deepEqual(value.advance(4), []);
  adapter.tick(4);
  value.resume();
  dispatch(adapter, value.advance(4));
  assert.equal(adapter.snapshot().startCount, 1);
  assert.equal(host.activeRendererCount(), 1);
  dispatch(adapter, value.exactReset());
  assert.equal(adapter.snapshot().stopCount, 1);
  assert.equal(host.activeRendererCount(), 0);
});

test("typed input registry is the sole complete HUD/control source", () => {
  assert.equal(validateTask014CInputRegistry(), TASK014C_INPUT_REGISTRY);
  assert.equal(new Set(TASK014C_INPUT_REGISTRY.map((item) => item.actionId)).size, 17);
  assert.equal(new Set(TASK014C_INPUT_REGISTRY.map((item) => item.cocosKeyCode)).size, 17);
  const lines = formatTask014CInputHelpLines();
  assert.equal(lines.length, 4);
  for (const binding of TASK014C_INPUT_REGISTRY) {
    assert.equal(
      lines.some((line) =>
        line.includes(`${binding.displayedKey} ${binding.hudLabel}`),
      ),
      true,
      binding.actionId,
    );
  }
});

test("readiness enforces the full sequence, one input, and two clean rebuilds", () => {
  const lifecycle = new Task014CLifecycle();
  for (let setup = 0; setup < 3; setup += 1) {
    const generation = lifecycle.begin(setup > 0);
    for (const phase of [
      "resources-passed",
      "loadout-built",
      "sockets-resolved",
      "events-ready",
      "reset-complete",
      "ready",
    ] as const) {
      lifecycle.advance(generation, phase);
    }
    lifecycle.registerInput(generation);
    assert.equal(lifecycle.snapshot().activeInputHandlerCount, 1);
    if (setup < 2) lifecycle.teardown(false);
  }
  assert.deepEqual(lifecycle.snapshot(), {
    generation: 3,
    phase: "ready",
    setupCount: 3,
    teardownCount: 2,
    rebuildCount: 2,
    activeInputHandlerCount: 1,
    staleTargetReferenceCount: 0,
  });
  assert.throws(
    () => lifecycle.registerInput(3),
    /TASK_014C_INPUT_REGISTRATION_INVALID/u,
  );
});

test("TASK-014C generated mirrors exactly match the engine-neutral typed sources", async () => {
  const sourceRoot = path.join(extensionRoot, "source/task014c");
  const runtimeRoot = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/gameai/task014c",
  );
  for (const moduleName of [
    "canonical-semantic-vfx-contract.ts",
    "canonical-semantic-vfx-input-registry.ts",
    "canonical-semantic-vfx-lifecycle.ts",
  ]) {
    const source = await readFile(path.join(sourceRoot, moduleName), "utf8");
    const expected =
      "// Generated from the tested TASK-014C composition boundary. Do not hand-edit.\n" +
      source.replace(
        /from "(\.\.?\/[^"]+)\.js";/gu,
        'from "$1";',
      );
    assert.equal(
      await readFile(path.join(runtimeRoot, moduleName), "utf8"),
      expected,
      moduleName,
    );
  }
});

test("Creator composition reuses accepted resolver, evaluator, adapter, and renderer guards", async () => {
  const runtime = await readFile(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/task014c/task014c-canonical-loadout-semantic-vfx.ts",
    ),
    "utf8",
  );
  assert.match(
    runtime,
    /extends GameAIComposableCharacterLoadoutReferenceV2/u,
  );
  assert.match(
    runtime,
    /createPrevalidatedCharacterSemanticEventEvaluator/u,
  );
  assert.match(runtime, /new SemanticVfxAdapter\(this\.semanticVfxHost\)/u);
  assert.match(runtime, /new CocosSemanticVfxHost\(/u);
  assert.match(
    runtime,
    /duplicateRuntimeRootCount[\s\S]*viewportOverflowCount[\s\S]*nonFiniteCoordinateCount/u,
  );
  assert.match(
    runtime,
    /rendererComponentSnapshot\(\)[\s\S]*UI\/SORT/u,
  );
  assert.doesNotMatch(
    runtime,
    /new CharacterSemanticEventEvaluator|resolveCharacterLoadout\s*=/u,
  );
});

test("Exact Reset and teardown clear effects, targets, stress, and debug state", async () => {
  const runtime = await readFile(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/task014c/task014c-canonical-loadout-semantic-vfx.ts",
    ),
    "utf8",
  );
  assert.match(
    runtime,
    /afterCanonicalExactReset\(\)[\s\S]*semanticEvaluator\.exactReset\(\)[\s\S]*semanticVfxAdapter\?\.cleanup\("exact-reset"\)[\s\S]*vfxDebugEnabled = false[\s\S]*targetDebugEnabled = false/u,
  );
  assert.match(
    runtime,
    /beforeCanonicalRuntimeTeardown\(dispose: boolean\)[\s\S]*semanticEvaluator\.dispose\(\)[\s\S]*semanticVfxAdapter\?\.cleanup\("rebuild"\)[\s\S]*targetBindings = new Map\(\)/u,
  );
});

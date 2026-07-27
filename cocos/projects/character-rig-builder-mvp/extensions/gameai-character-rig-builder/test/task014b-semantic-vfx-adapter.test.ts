import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  createCharacterSemanticEventEvaluator,
  type EvaluatedSemanticEvent,
} from "@gameai/character-semantic-events";

import {
  SemanticVfxAdapter,
  composeSemanticVfxRotation,
  createSortedGraphicsRenderer,
  resolveSemanticVfxPose,
  type SemanticVfxHost,
  type SemanticVfxPose,
  type SemanticVfxRendererRequest,
  type SemanticVfxRendererUpdate,
} from "../source/task014b/semantic-vfx-adapter";
import {
  SEMANTIC_VFX_CUE_REGISTRY,
  type SemanticVfxRendererKind,
} from "../source/task014b/semantic-vfx-cue-registry";
import {
  SemanticVfxAdapterError,
  SemanticVfxAdapterErrorCode,
} from "../source/task014b/semantic-vfx-diagnostics";
import {
  TASK014B_TRANSFORM_STRESS,
  TASK014B_VISUAL_ACCEPTANCE,
  SEMANTIC_VFX_INPUT_REGISTRY,
  composeTask014BTransformAabb,
  composeTask014BTransformPoint,
  formatSemanticVfxInputHelp,
  formatSemanticVfxInputHelpLines,
  nextTask014BTransformStressState,
  task014bViewportOverflowPx,
  task014bTransformStressPose,
  transformTask014BAabb,
  validateSemanticVfxInputRegistry,
} from "../source/task014b/semantic-vfx-input-registry";
import {
  TASK014B_INITIAL_TRACK_ID,
  TASK014B_SEMANTIC_TRACK_REGISTRY,
  TASK014B_TRACK_ORDER,
  TASK014B_SEMANTIC_EVENT_CONTEXT,
  TASK014B_SEMANTIC_EVENT_CONTRACT,
  resolveTask014BSemanticTrackId,
  type Task014BSemanticTrackId,
} from "../source/task014b/semantic-vfx-reference-contract";
import { resolveSemanticVfxResourceManifest } from "../source/task014b/semantic-vfx-resource-manifest";
import {
  SEMANTIC_VFX_SORTING_POLICY,
  semanticVfxSortingOrder,
} from "../source/task014b/semantic-vfx-sorting";

class FakeHost implements SemanticVfxHost {
  readonly renderers = new Map<string, SemanticVfxRendererRequest>();
  readonly updates = new Map<string, SemanticVfxRendererUpdate>();
  readonly destroyed: Array<readonly [string, string]> = [];
  readonly sockets = new Map<string, SemanticVfxPose>(
    TASK014B_SEMANTIC_EVENT_CONTEXT.rigLayout.sockets?.map((socket) => [
      socket.socketId,
      {
        position: { x: 100, y: 200 },
        rotation: {
          x: 0,
          y: 0,
          z: Math.sin(Math.PI / 12),
          w: Math.cos(Math.PI / 12),
        },
        scale: { x: 2, y: 3 },
      },
    ]),
  );
  failCreate = false;

  resolveSocket(socketId: string): SemanticVfxPose | undefined {
    return this.sockets.get(socketId);
  }

  createRenderer(request: SemanticVfxRendererRequest): void {
    if (this.failCreate) throw new Error("synthetic create failure");
    if (this.renderers.has(request.rendererId)) {
      throw new Error(`duplicate renderer ${request.rendererId}`);
    }
    this.renderers.set(request.rendererId, request);
  }

  updateRenderer(
    rendererId: string,
    update: SemanticVfxRendererUpdate,
  ): void {
    assert.ok(this.renderers.has(rendererId), rendererId);
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

function evaluator(trackId: string) {
  const result = createCharacterSemanticEventEvaluator(
    TASK014B_SEMANTIC_EVENT_CONTRACT,
    TASK014B_SEMANTIC_EVENT_CONTEXT,
    trackId,
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("Evaluator creation failed.");
  return result.value;
}

test("dispatches emit/start/stop exhaustively and keeps audio/gameplay typed", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const walk = evaluator("walk-semantic-events");
  walk.play();
  for (const command of walk.advance(0.81)) adapter.dispatch(command);
  assert.deepEqual(adapter.snapshot(), {
    emitCount: 2,
    startCount: 0,
    stopCount: 0,
    audioCount: 1,
    gameplayCount: 2,
    duplicateStartCount: 0,
    unknownStopCount: 0,
    activeInstanceIds: [],
    activeOneShotCount: 2,
    leakedInstanceCount: 0,
    lastCommand: "emit:walk-semantic-events:walk-dust-right:0",
  });
  adapter.tick(0.36);
  assert.equal(host.activeRendererCount(), 0);

  const wave = evaluator("wave-semantic-events");
  wave.play();
  for (const command of wave.advance(0.26)) adapter.dispatch(command);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [
    "wave-semantic-events:wave-hand-trail:0",
  ]);
  for (const command of wave.advance(0.75)) adapter.dispatch(command);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, []);
  assert.equal(adapter.snapshot().startCount, 1);
  assert.equal(adapter.snapshot().stopCount, 1);
});

test("merged evaluator keeps one persistent Aura across six cycles and exact cleanup", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const aura = evaluator("aura-semantic-events");
  aura.play();

  const commands: EvaluatedSemanticEvent[] = [];
  for (let cycle = 0; cycle < 6; cycle += 1) {
    commands.push(...aura.advance(2));
  }
  for (const command of commands) adapter.dispatch(command);

  const expectedId =
    "aura-semantic-events:torso-persistent-aura:0";
  assert.equal(
    commands.filter((command) => command.command === "start").length,
    1,
  );
  assert.deepEqual(aura.snapshot.activeInstanceIds, [expectedId]);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [expectedId]);
  assert.equal(host.activeRendererCount(), 1);
  assert.equal(adapter.snapshot().startCount, 1);
  assert.equal(adapter.snapshot().duplicateStartCount, 0);

  aura.pause();
  assert.deepEqual(aura.advance(4), []);
  assert.deepEqual(aura.snapshot.activeInstanceIds, [expectedId]);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [expectedId]);
  aura.resume();
  const resumed = aura.advance(4);
  assert.deepEqual(resumed, []);
  assert.deepEqual(aura.snapshot.activeInstanceIds, [expectedId]);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [expectedId]);
  assert.equal(host.activeRendererCount(), 1);

  const reset = aura.exactReset();
  assert.equal(reset.length, 1);
  assert.equal(reset[0]?.command, "stop");
  for (const command of reset) adapter.dispatch(command);
  assert.deepEqual(aura.snapshot.activeInstanceIds, []);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, []);
  assert.equal(host.activeRendererCount(), 0);
  assert.equal(adapter.snapshot().stopCount, 1);
  assert.equal(adapter.snapshot().unknownStopCount, 0);

  aura.play();
  for (const command of aura.advance(0.11)) adapter.dispatch(command);
  const switched = aura.switchTrack("rest-semantic-events");
  assert.equal(switched.length, 1);
  for (const command of switched) adapter.dispatch(command);
  assert.deepEqual(aura.snapshot.activeInstanceIds, []);
  assert.equal(host.activeRendererCount(), 0);

  aura.switchTrack("aura-semantic-events");
  aura.play();
  for (const command of aura.advance(0.11)) adapter.dispatch(command);
  const disposed = aura.dispose();
  assert.equal(disposed.length, 1);
  for (const command of disposed) adapter.dispatch(command);
  assert.deepEqual(aura.dispose(), []);
  adapter.cleanup("rebuild");
  assert.deepEqual(adapter.snapshot().activeInstanceIds, []);
  assert.equal(host.activeRendererCount(), 0);
  assert.equal(adapter.snapshot().duplicateStartCount, 0);
  assert.equal(adapter.snapshot().unknownStopCount, 0);
  assert.equal(adapter.snapshot().leakedInstanceCount, 0);
});

test("registered renderer kinds have one reachable typed runtime branch", async () => {
  const expectedKinds: readonly SemanticVfxRendererKind[] = [
    "footstep-dust",
    "hand-trail",
    "persistent-aura",
  ];
  assert.deepEqual(
    SEMANTIC_VFX_CUE_REGISTRY.map((cue) => cue.rendererKind).sort(),
    [...expectedKinds].sort(),
  );

  const cases = [
    {
      trackId: "walk-semantic-events",
      advanceSeconds: 0.21,
      expectedKind: "footstep-dust",
      expectedRendererId:
        "emit:walk-semantic-events:walk-dust-left:0",
    },
    {
      trackId: "wave-semantic-events",
      advanceSeconds: 0.26,
      expectedKind: "hand-trail",
      expectedRendererId:
        "instance:wave-semantic-events:wave-hand-trail:0",
    },
    {
      trackId: "aura-semantic-events",
      advanceSeconds: 0.11,
      expectedKind: "persistent-aura",
      expectedRendererId:
        "instance:aura-semantic-events:torso-persistent-aura:0",
    },
  ] as const;
  for (const entry of cases) {
    const host = new FakeHost();
    const adapter = new SemanticVfxAdapter(host);
    const value = evaluator(entry.trackId);
    value.play();
    for (const command of value.advance(entry.advanceSeconds)) {
      adapter.dispatch(command);
    }
    assert.equal(host.renderers.size, 1);
    assert.equal(
      host.renderers.get(entry.expectedRendererId)?.rendererKind,
      entry.expectedKind,
    );
  }

  const projectRoot = resolve(process.cwd(), "../..");
  const runtime = await readFile(
    resolve(
      projectRoot,
      "assets/gameai/task014b/task014b-semantic-vfx-reference.ts",
    ),
    "utf8",
  );
  const rendererSwitch = runtime.slice(
    runtime.indexOf("switch (request.rendererKind)"),
    runtime.indexOf("if (this.debugVisible)"),
  );
  const runtimeKinds = [
    ...rendererSwitch.matchAll(/case "([^"]+)"/gu),
  ].map((match) => match[1]);
  assert.deepEqual(runtimeKinds, expectedKinds);
  assert.match(
    rendererSwitch,
    /default:\s*assertNeverSemanticVfxRendererKind\(request\.rendererKind\)/u,
  );
  assert.doesNotMatch(
    runtime,
    new RegExp(["dust", "burst"].join("-"), "u"),
  );
});

test("sorted Graphics construction is ordered, singular, and fail-closed", () => {
  class FakeUIRenderer {}
  class FakeGraphics extends FakeUIRenderer {}
  class FakeSorting {
    renderer: FakeUIRenderer | null = null;
    sortingLayer = -1;
    sortingOrder = -1;
  }

  const operations: string[] = [];
  const renderers: FakeUIRenderer[] = [];
  const sortings: FakeSorting[] = [];
  let destroyed = false;
  const result = createSortedGraphicsRenderer<
    FakeUIRenderer,
    FakeGraphics,
    FakeSorting
  >(
    {
      currentRenderer: () => renderers[0] ?? null,
      renderers: () => renderers,
      sortings: () => sortings,
      addGraphics: () => {
        operations.push("Graphics");
        const graphics = new FakeGraphics();
        renderers.push(graphics);
        return graphics;
      },
      addSorting: () => {
        operations.push("Sorting2D");
        const sorting = new FakeSorting();
        sorting.renderer = renderers[0] ?? null;
        sortings.push(sorting);
        return sorting;
      },
      configureSorting: (sorting, layer, order) => {
        sorting.sortingLayer = layer;
        sorting.sortingOrder = order;
      },
      destroyPartial: () => {
        destroyed = true;
      },
    },
    0,
    70,
  );
  assert.deepEqual(operations, ["Graphics", "Sorting2D"]);
  assert.equal(renderers.length, 1);
  assert.equal(sortings.length, 1);
  assert.equal(result.graphics, renderers[0]);
  assert.equal(result.sorting, sortings[0]);
  assert.equal(result.sorting.renderer, result.graphics);
  assert.equal(result.sorting.sortingLayer, 0);
  assert.equal(result.sorting.sortingOrder, 70);
  assert.equal(destroyed, false);

  let partialDestroyed = false;
  let partialGraphics: FakeGraphics | null = null;
  assert.throws(
    () =>
      createSortedGraphicsRenderer<
        FakeUIRenderer,
        FakeGraphics,
        FakeSorting
      >(
        {
          currentRenderer: () => partialGraphics,
          renderers: () =>
            partialGraphics === null ? [] : [partialGraphics],
          sortings: () => [],
          addGraphics: () => {
            partialGraphics = new FakeGraphics();
            return partialGraphics;
          },
          addSorting: () => {
            throw new Error("synthetic Sorting2D failure");
          },
          configureSorting: () => {},
          destroyPartial: () => {
            partialDestroyed = true;
          },
        },
        0,
        5,
      ),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.RENDERER_FAILURE,
  );
  assert.equal(partialDestroyed, true);

  const preexistingRenderer = new FakeGraphics();
  let conflictDestroyed = false;
  assert.throws(
    () =>
      createSortedGraphicsRenderer<
        FakeUIRenderer,
        FakeGraphics,
        FakeSorting
      >(
        {
          currentRenderer: () => preexistingRenderer,
          renderers: () => [preexistingRenderer],
          sortings: () => [],
          addGraphics: () => new FakeGraphics(),
          addSorting: () => new FakeSorting(),
          configureSorting: () => {},
          destroyPartial: () => {
            conflictDestroyed = true;
          },
        },
        0,
        5,
      ),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code ===
        SemanticVfxAdapterErrorCode.RENDERABLE_COMPONENT_CONFLICT,
  );
  assert.equal(conflictDestroyed, true);
});

test("TASK-014B runtime creates concrete renderers before Sorting2D", async () => {
  const projectRoot = resolve(process.cwd(), "../..");
  const runtime = await readFile(
    resolve(
      projectRoot,
      "assets/gameai/task014b/task014b-semantic-vfx-reference.ts",
    ),
    "utf8",
  );
  assert.match(
    runtime,
    /createSortedGraphicsRenderer<UIRenderer, Graphics, Sorting2D>/u,
  );
  assert.doesNotMatch(
    runtime,
    /addComponent\(Sorting2D\)[\s\S]{0,240}addComponent\(Graphics\)/u,
  );
  assert.doesNotMatch(runtime, /addComponent\(UIRenderer\)/u);
  assert.doesNotMatch(
    runtime,
    /console\.(?:warn|error)\s*=|filterWarnings|suppressWarnings/u,
  );
  assert.match(
    runtime,
    /addGraphics: \(\) => node\.addComponent\(Graphics\),[\s\S]*addSorting: \(\) => node\.addComponent\(Sorting2D\)/u,
  );
  assert.match(
    runtime,
    /getComponents\(UIRenderer\)\.length/u,
  );
  assert.match(
    runtime,
    /getComponents\(Sorting2D\)\.length/u,
  );

  const graphicsCreation = runtime.indexOf(
    "this.createSortedGraphics(",
  );
  for (const drawCommand of [
    'case "footstep-dust"',
    'case "hand-trail"',
    'case "persistent-aura"',
  ]) {
    assert.ok(runtime.indexOf(drawCommand) > graphicsCreation, drawCommand);
  }
  assert.ok(runtime.indexOf("graphics.circle(-18") > graphicsCreation);
  assert.ok(runtime.indexOf("graphics.bezierCurveTo") > graphicsCreation);
  assert.ok(
    runtime.indexOf("graphics.circle(0, 0, radius)") >
      graphicsCreation,
  );
  assert.match(runtime, /TASK_014B_VFX_VIEWPORT_OVERFLOW/u);
  assert.match(runtime, /\.\.\.formatSemanticVfxInputHelpLines\(\)/u);
});

test("typed stop removes the matching hand-trail renderer instance", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const wave = evaluator("wave-semantic-events");
  wave.play();
  for (const command of wave.advance(0.26)) adapter.dispatch(command);
  const rendererId =
    "instance:wave-semantic-events:wave-hand-trail:0";
  assert.equal(
    host.renderers.get(rendererId)?.rendererKind,
    "hand-trail",
  );
  for (const command of wave.advance(0.75)) adapter.dispatch(command);
  assert.equal(host.renderers.has(rendererId), false);
  assert.deepEqual(host.destroyed.at(-1), [
    rendererId,
    "duration",
  ]);
});

test("track registry owns initial state, controls, order, and validation", () => {
  assert.equal(TASK014B_INITIAL_TRACK_ID, "rest-semantic-events");
  assert.deepEqual(
    TASK014B_TRACK_ORDER,
    TASK014B_SEMANTIC_TRACK_REGISTRY.map((entry) => entry.trackId),
  );
  assert.equal(
    [...TASK014B_SEMANTIC_TRACK_REGISTRY]
      .reverse()
      .find((entry) => entry.initial)?.trackId,
    TASK014B_INITIAL_TRACK_ID,
  );

  const controlTracks = SEMANTIC_VFX_INPUT_REGISTRY.flatMap((binding) =>
    binding.action.kind === "select-track"
      ? [binding.action.trackId]
      : [],
  );
  assert.deepEqual(controlTracks, TASK014B_TRACK_ORDER);
  assert.deepEqual(
    TASK014B_SEMANTIC_EVENT_CONTRACT.tracks.map(
      (track) => track.trackId,
    ),
    TASK014B_TRACK_ORDER,
  );

  for (const definition of TASK014B_SEMANTIC_TRACK_REGISTRY) {
    const active: Task014BSemanticTrackId =
      resolveTask014BSemanticTrackId(definition.trackId);
    assert.equal(active, definition.trackId);
    assert.equal(evaluator(active).snapshot.trackId, active);
  }

  let activeTrackId: Task014BSemanticTrackId =
    TASK014B_INITIAL_TRACK_ID;
  assert.throws(
    () => {
      activeTrackId = resolveTask014BSemanticTrackId(
        "unknown-semantic-track",
      );
    },
    /TASK_014B_TRACK_UNKNOWN/u,
  );
  assert.equal(activeTrackId, TASK014B_INITIAL_TRACK_ID);
});

test("rejects unsupported kind, unknown cue/socket, duplicate start, and unknown stop", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const wave = evaluator("wave-semantic-events");
  wave.play();
  const start = wave.advance(0.26)[0]!;
  adapter.dispatch(start);
  assert.throws(
    () => adapter.dispatch(start),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.DUPLICATE_START,
  );
  const stop = wave.advance(0.75)[0]!;
  adapter.dispatch(stop);
  assert.throws(
    () => adapter.dispatch(stop),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.UNKNOWN_STOP,
  );

  const invalidKind = {
    ...start,
    command: "emit",
    eventKind: "physics",
  } as unknown as EvaluatedSemanticEvent;
  assert.throws(
    () => adapter.dispatch(invalidKind),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.UNSUPPORTED_EVENT_KIND,
  );
  const unknownCue = structuredClone(start);
  if (unknownCue.command !== "stop" && unknownCue.payload.kind === "vfx") {
    unknownCue.payload.cueDefinitionId = "unknown-cue";
  }
  assert.throws(
    () => new SemanticVfxAdapter(new FakeHost()).dispatch(unknownCue),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.UNKNOWN_CUE,
  );
  const missingSocketHost = new FakeHost();
  missingSocketHost.sockets.clear();
  assert.throws(
    () => new SemanticVfxAdapter(missingSocketHost).dispatch(start),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.UNKNOWN_SOCKET,
  );
});

test("persistent instances survive pause and clean on reset, switch, dispose, and rebuild", () => {
  for (const reason of [
    "exact-reset",
    "track-switch",
    "dispose",
    "rebuild",
  ] as const) {
    const host = new FakeHost();
    const adapter = new SemanticVfxAdapter(host);
    const aura = evaluator("aura-semantic-events");
    aura.play();
    for (const command of aura.advance(0.11)) adapter.dispatch(command);
    const ids = adapter.snapshot().activeInstanceIds;
    assert.deepEqual(ids, [
      "aura-semantic-events:torso-persistent-aura:0",
    ]);
    aura.pause();
    adapter.tick(0.5);
    assert.deepEqual(adapter.snapshot().activeInstanceIds, ids);
    aura.resume();
    assert.deepEqual(adapter.snapshot().activeInstanceIds, ids);
    adapter.cleanup(reason);
    assert.equal(host.activeRendererCount(), 0);
    assert.equal(adapter.snapshot().leakedInstanceCount, 0);
  }
});

test("repeated loop/replay and stop-before-start leave no stale instances", () => {
  const host = new FakeHost();
  const adapter = new SemanticVfxAdapter(host);
  const wave = evaluator("wave-semantic-events");
  wave.play();
  for (const command of wave.advance(4.26)) adapter.dispatch(command);
  assert.deepEqual(adapter.snapshot().activeInstanceIds, [
    "wave-semantic-events:wave-hand-trail:2",
  ]);
  adapter.cleanup("exact-reset");
  assert.equal(host.activeRendererCount(), 0);

  const sameTimeContract = structuredClone(
    TASK014B_SEMANTIC_EVENT_CONTRACT,
  );
  sameTimeContract.tracks[2]!.events[0]!.durationSeconds = 2;
  const same = createCharacterSemanticEventEvaluator(
    sameTimeContract,
    TASK014B_SEMANTIC_EVENT_CONTEXT,
    "wave-semantic-events",
  );
  assert.equal(same.ok, true);
  if (!same.ok) return;
  same.value.play();
  const commands = same.value.advance(2.26);
  assert.deepEqual(
    commands.map((command) => [command.command, command.cycle]),
    [["start", 0], ["stop", 0], ["start", 1]],
  );
});

test("applies local transform/follow axes and deterministic registries", () => {
  const captured = {
    position: { x: 10, y: 20 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 5, y: 7 },
  };
  const pose = resolveSemanticVfxPose(
    {
      position: { x: 100, y: 200 },
      rotation: {
        x: 0,
        y: 0,
        z: Math.SQRT1_2,
        w: Math.SQRT1_2,
      },
      scale: { x: 2, y: 3 },
    },
    captured,
    {
      position: { x: 4, y: 5 },
      rotationDegrees: 10,
      scale: { x: 1.5, y: 0.5 },
    },
    { position: true, rotation: false, scale: true },
  );
  assert.ok(Math.abs(pose.position.x - 85) < 1e-9);
  assert.ok(Math.abs(pose.position.y - 208) < 1e-9);
  const rotation = composeSemanticVfxRotation(pose.rotation);
  assert.ok(Math.abs(rotation.z - Math.sin(Math.PI / 36)) < 1e-9);
  assert.ok(Math.abs(rotation.w - Math.cos(Math.PI / 36)) < 1e-9);
  assert.deepEqual(pose.scale, { x: 3, y: 1.5 });

  assert.deepEqual(
    [
      semanticVfxSortingOrder("behind-character"),
      semanticVfxSortingOrder("character-overlay"),
      semanticVfxSortingOrder("in-front-of-character"),
    ],
    [
      SEMANTIC_VFX_SORTING_POLICY.behindCharacter,
      SEMANTIC_VFX_SORTING_POLICY.characterOverlay,
      SEMANTIC_VFX_SORTING_POLICY.inFrontOfCharacter,
    ],
  );
  assert.equal(SEMANTIC_VFX_INPUT_REGISTRY.length, 13);
  assert.match(formatSemanticVfxInputHelp(), /1 Rest.*4 Persistent Aura/u);
  assert.deepEqual(
    resolveSemanticVfxResourceManifest().map((entry) => entry.cocosPath),
    ["task014b/semantic-vfx-config"],
  );
});

test("Transform Stress is one typed registry-owned X action", () => {
  const stressBindings = SEMANTIC_VFX_INPUT_REGISTRY.filter(
    (binding) =>
      binding.action.kind === "toggle-transform-stress",
  );
  assert.deepEqual(stressBindings, [
    {
      semanticActionId: "transform-stress.toggle",
      displayedKey: "X",
      cocosKeyCode: "KEY_X",
      hudLabel: "Transform Stress",
      action: { kind: "toggle-transform-stress" },
      displayOrder: 8,
    },
  ]);
  assert.equal(
    new Set(
      SEMANTIC_VFX_INPUT_REGISTRY.map(
        (binding) => binding.cocosKeyCode,
      ),
    ).size,
    SEMANTIC_VFX_INPUT_REGISTRY.length,
  );
  assert.match(
    formatSemanticVfxInputHelp(),
    /X Transform Stress/u,
  );
  assert.throws(
    () =>
      validateSemanticVfxInputRegistry(
        SEMANTIC_VFX_INPUT_REGISTRY.slice(0, 12),
      ),
    /TASK_014B_INPUT_REGISTRY_INCOMPLETE/u,
  );
});

test("Transform Stress state, finite nested composition, and fail-closed transition are deterministic", () => {
  let enabled = false;
  assert.deepEqual(
    task014bTransformStressPose(enabled),
    TASK014B_TRANSFORM_STRESS.off,
  );
  enabled = nextTask014BTransformStressState(enabled, {
    kind: "toggle-transform-stress",
  });
  assert.equal(enabled, true);
  assert.deepEqual(
    task014bTransformStressPose(enabled),
    TASK014B_TRANSFORM_STRESS.on,
  );
  enabled = nextTask014BTransformStressState(enabled, {
    kind: "toggle-transform-stress",
  });
  assert.equal(enabled, false);

  const baselineRig = {
    position: { x: 100, y: 60 },
    rotationDegrees: 0,
    scale: { x: 1.35, y: 1.35 },
  };
  const localSocket = { x: 24, y: -16 };
  const normal = composeTask014BTransformPoint(
    TASK014B_TRANSFORM_STRESS.off,
    baselineRig,
    localSocket,
  );
  const stressed = composeTask014BTransformPoint(
    TASK014B_TRANSFORM_STRESS.on,
    baselineRig,
    localSocket,
  );
  assert.deepEqual(normal, { x: 132.4, y: 38.4 });
  assert.notDeepEqual(stressed, normal);
  assert.notEqual(TASK014B_TRANSFORM_STRESS.on.position.x, 0);
  assert.notEqual(TASK014B_TRANSFORM_STRESS.on.position.y, 0);
  assert.notEqual(TASK014B_TRANSFORM_STRESS.on.rotationDegrees, 0);
  assert.notEqual(
    TASK014B_TRANSFORM_STRESS.on.scale.x,
    TASK014B_TRANSFORM_STRESS.on.scale.y,
  );
  assert.ok(
    [
      stressed.x,
      stressed.y,
      TASK014B_TRANSFORM_STRESS.on.scale.x,
      TASK014B_TRANSFORM_STRESS.on.scale.y,
      TASK014B_TRANSFORM_STRESS.on.rotationDegrees,
    ].every(Number.isFinite),
  );

  const beforeUnknown = enabled;
  assert.throws(
    () =>
      nextTask014BTransformStressState(
        enabled,
        { kind: "unknown" } as never,
      ),
    /TASK_014B_ACTION_UNKNOWN/u,
  );
  assert.equal(enabled, beforeUnknown);
});

test("visual acceptance bounds keep Normal, Stress, HUD, and effect ROIs inside the design viewport", () => {
  const normalCharacter = composeTask014BTransformAabb(
    TASK014B_TRANSFORM_STRESS.off,
    TASK014B_VISUAL_ACCEPTANCE.authoredRig,
    TASK014B_VISUAL_ACCEPTANCE.characterLocalBounds,
  );
  const stressedCharacter = composeTask014BTransformAabb(
    TASK014B_TRANSFORM_STRESS.on,
    TASK014B_VISUAL_ACCEPTANCE.authoredRig,
    TASK014B_VISUAL_ACCEPTANCE.characterLocalBounds,
  );
  assert.equal(task014bViewportOverflowPx(normalCharacter), 0);
  assert.equal(task014bViewportOverflowPx(stressedCharacter), 0);
  assert.equal(
    task014bViewportOverflowPx(TASK014B_VISUAL_ACCEPTANCE.hudBounds),
    0,
  );

  const helpLines = formatSemanticVfxInputHelpLines();
  assert.equal(helpLines.length, 3);
  assert.ok(
    helpLines.every(
      (line) =>
        line.length <=
        TASK014B_VISUAL_ACCEPTANCE.maximumHelpLineCharacters,
    ),
  );
  for (const binding of SEMANTIC_VFX_INPUT_REGISTRY) {
    assert.equal(
      helpLines.filter((line) =>
        line.includes(`${binding.displayedKey} ${binding.hudLabel}`),
      ).length,
      1,
      binding.semanticActionId,
    );
  }

  const rendererSamples = {
    "footstep-dust": {
      position: { x: 86, y: -286 },
      rotationDegrees: 0,
      scale: { x: 1, y: 1 },
    },
    "hand-trail": {
      position: { x: 220, y: 30 },
      rotationDegrees: 100,
      scale: { x: 1.35, y: 1.35 },
    },
    "persistent-aura": {
      position: { x: 100, y: -91 },
      rotationDegrees: 0,
      scale: { x: 1.35, y: 1.35 },
    },
  } as const;
  for (const rendererKind of Object.keys(
    TASK014B_VISUAL_ACCEPTANCE.rendererLocalBounds,
  ) as Array<
    keyof typeof TASK014B_VISUAL_ACCEPTANCE.rendererLocalBounds
  >) {
    const transformed = transformTask014BAabb(
      rendererSamples[rendererKind],
      TASK014B_VISUAL_ACCEPTANCE.rendererLocalBounds[rendererKind],
    );
    assert.equal(task014bViewportOverflowPx(transformed), 0);
    assert.ok(
      TASK014B_VISUAL_ACCEPTANCE.minimumRoiPixelDelta[
        rendererKind
      ] > 0,
    );
    assert.ok(
      [
        transformed.minX,
        transformed.minY,
        transformed.maxX,
        transformed.maxY,
      ].every(Number.isFinite),
    );
  }

  assert.ok(
    task014bViewportOverflowPx({
      minX: 500,
      minY: -420,
      maxX: 760,
      maxY: -50,
    }) > 0,
    "the rejected right-bottom evidence framing must fail",
  );
  assert.throws(
    () =>
      transformTask014BAabb(
        {
          position: { x: Number.NaN, y: 0 },
          rotationDegrees: 0,
          scale: { x: 1, y: 1 },
        },
        TASK014B_VISUAL_ACCEPTANCE.characterLocalBounds,
      ),
    /TASK_014B_VISUAL_AABB_INVALID/u,
  );
});

test("stressed socket world pose is shared by dust, trail, and Aura without lifecycle duplication", () => {
  const baselineRig = {
    position: { x: 100, y: 60 },
    rotationDegrees: 0,
    scale: { x: 1.35, y: 1.35 },
  };
  const position = composeTask014BTransformPoint(
    TASK014B_TRANSFORM_STRESS.on,
    baselineRig,
    { x: 18, y: 12 },
  );
  const rotationRadians =
    (TASK014B_TRANSFORM_STRESS.on.rotationDegrees * Math.PI) /
    180;
  const stressedSocket: SemanticVfxPose = {
    position,
    rotation: {
      x: 0,
      y: 0,
      z: Math.sin(rotationRadians / 2),
      w: Math.cos(rotationRadians / 2),
    },
    scale: {
      x:
        TASK014B_TRANSFORM_STRESS.on.scale.x *
        baselineRig.scale.x,
      y:
        TASK014B_TRANSFORM_STRESS.on.scale.y *
        baselineRig.scale.y,
    },
  };

  for (const entry of [
    {
      trackId: "walk-semantic-events",
      socketId: "foot-left-contact",
      seconds: 0.21,
      rendererId:
        "emit:walk-semantic-events:walk-dust-left:0",
    },
    {
      trackId: "wave-semantic-events",
      socketId: "hand-right-trail",
      seconds: 0.26,
      rendererId:
        "instance:wave-semantic-events:wave-hand-trail:0",
    },
    {
      trackId: "aura-semantic-events",
      socketId: "torso-aura",
      seconds: 0.11,
      rendererId:
        "instance:aura-semantic-events:torso-persistent-aura:0",
    },
  ] as const) {
    const host = new FakeHost();
    host.sockets.set(entry.socketId, stressedSocket);
    const adapter = new SemanticVfxAdapter(host);
    const value = evaluator(entry.trackId);
    value.play();
    for (const command of value.advance(entry.seconds)) {
      adapter.dispatch(command);
    }
    assert.deepEqual(
      host.updates.get(entry.rendererId)?.pose.position,
      stressedSocket.position,
    );
    assert.equal(host.activeRendererCount(), 1);

    if (entry.trackId === "aura-semantic-events") {
      for (let cycle = 0; cycle < 6; cycle += 1) {
        for (const command of value.advance(2)) {
          adapter.dispatch(command);
        }
      }
      assert.equal(host.activeRendererCount(), 1);
      assert.equal(adapter.snapshot().duplicateStartCount, 0);
    }
    adapter.cleanup("exact-reset");
    assert.equal(host.activeRendererCount(), 0);
    assert.equal(adapter.snapshot().leakedInstanceCount, 0);
  }
});

test("Creator runtime applies one nested Stress root, preserves rebuild state, and resets physical state", async () => {
  const projectRoot = resolve(process.cwd(), "../..");
  const runtime = await readFile(
    resolve(
      projectRoot,
      "assets/gameai/task014b/task014b-semantic-vfx-reference.ts",
    ),
    "utf8",
  );
  assert.match(
    runtime,
    /private transformStressEnabled = false;/u,
  );
  assert.match(
    runtime,
    /const transformStressRoot = this\.makeNode\([\s\S]*TRANSFORM_STRESS_ROOT_NAME,[\s\S]*root,[\s\S]*\);[\s\S]*const rigRoot = this\.makeNode\([\s\S]*"MinimalStickmanRig",[\s\S]*transformStressRoot/u,
  );
  assert.match(
    runtime,
    /private rebuild\(\): void \{[\s\S]*this\.teardown\(false, "rebuild"\);[\s\S]*this\.beginSetup\(true\);/u,
  );
  assert.match(
    runtime,
    /private beginSetup\(preserveTransformStress: boolean\): void \{[\s\S]*if \(!this\.inputRegistered\) this\.registerInput\(\);/u,
  );
  assert.match(
    runtime,
    /private exactReset\(preserveTransformStress = false\): void \{[\s\S]*if \(!preserveTransformStress\) \{[\s\S]*this\.transformStressEnabled = false;[\s\S]*\}[\s\S]*this\.applyTransformStress\(\);[\s\S]*this\.debugJoints = false;/u,
  );
  assert.match(
    runtime,
    /this\.generatedRoot = null;\s*this\.transformStressRoot = null;/u,
  );
  assert.match(
    runtime,
    /const generatedRoot = this\.generatedRoot;[\s\S]*generatedRoot\.setParent\(null\);[\s\S]*generatedRoot\.destroy\(\);[\s\S]*this\.generatedRoot = null;/u,
  );
  assert.match(
    runtime,
    /if \(reason !== "rebuild"\) this\.unregisterInput\(\);[\s\S]*this\.lifecycle\.teardown\(dispose\);/u,
  );
  assert.match(
    runtime,
    /`STRESS \$\{this\.transformStressEnabled \? "ON" : "OFF"\}/u,
  );
  assert.doesNotMatch(
    runtime,
    /Canvas.*(?:offset|compensation)|canvasCompensation/iu,
  );
});

test("follow axes are independent and authored local Z rotation composes deterministically", () => {
  const captured = {
    position: { x: 10, y: 20 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 2, y: 3 },
  };
  const current = {
    position: { x: 100, y: 200 },
    rotation: { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 },
    scale: { x: 5, y: 7 },
  };
  const local = {
    position: { x: 2, y: 0 },
    rotationDegrees: 30,
    scale: { x: 3, y: 4 },
  };
  const positionOnly = resolveSemanticVfxPose(
    current,
    captured,
    local,
    { position: true, rotation: false, scale: false },
  );
  assert.ok(Math.abs(positionOnly.position.x - 100) < 1e-9);
  assert.ok(Math.abs(positionOnly.position.y - 210) < 1e-9);
  assert.deepEqual(positionOnly.scale, { x: 6, y: 12 });
  const positionRotation = composeSemanticVfxRotation(
    positionOnly.rotation,
  );
  assert.ok(Math.abs(positionRotation.z - Math.sin(Math.PI / 12)) < 1e-9);

  const rotationScaleOnly = resolveSemanticVfxPose(
    current,
    captured,
    local,
    { position: false, rotation: true, scale: true },
  );
  assert.deepEqual(rotationScaleOnly.position, { x: 14, y: 20 });
  assert.deepEqual(rotationScaleOnly.scale, { x: 15, y: 28 });
  const followedRotation = composeSemanticVfxRotation(
    rotationScaleOnly.rotation,
  );
  assert.ok(
    Math.abs(followedRotation.z - Math.sin((120 * Math.PI) / 360)) <
      1e-9,
  );
});

test("non-finite and zero socket quaternions fail with stable diagnostics", () => {
  const local = {
    position: { x: 0, y: 0 },
    rotationDegrees: 0,
    scale: { x: 1, y: 1 },
  };
  for (const rotation of [
    { x: Number.NaN, y: 0, z: 0, w: 1 },
    { x: 0, y: 0, z: 0, w: 0 },
  ]) {
    const socket = {
      position: { x: 0, y: 0 },
      rotation,
      scale: { x: 1, y: 1 },
    };
    assert.throws(
      () =>
        resolveSemanticVfxPose(
          socket,
          socket,
          local,
          { position: true, rotation: true, scale: true },
        ),
      (error) =>
        error instanceof SemanticVfxAdapterError &&
        error.code ===
          SemanticVfxAdapterErrorCode.INVALID_SOCKET_TRANSFORM,
    );
  }
});

test("one-shot captures disabled follow axes while trail and aura follow runtime transforms", () => {
  const oneShotHost = new FakeHost();
  const oneShotAdapter = new SemanticVfxAdapter(oneShotHost);
  const walk = evaluator("walk-semantic-events");
  walk.play();
  const dust = structuredClone(walk.advance(0.21)[0]!);
  if (dust.command === "stop") throw new Error("Expected dust emit.");
  dust.followPolicy = { position: false, rotation: false, scale: false };
  oneShotAdapter.dispatch(dust);
  const dustId = "emit:walk-semantic-events:walk-dust-left:0";
  const spawned = structuredClone(oneShotHost.updates.get(dustId)!);
  oneShotHost.sockets.set("foot-left-contact", {
    position: { x: 900, y: 800 },
    rotation: { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 },
    scale: { x: 9, y: 8 },
  });
  oneShotAdapter.tick(0.1);
  assert.deepEqual(oneShotHost.updates.get(dustId)!.pose, spawned.pose);

  for (const [trackId, socketId] of [
    ["wave-semantic-events", "hand-right-trail"],
    ["aura-semantic-events", "torso-aura"],
  ] as const) {
    const host = new FakeHost();
    const adapter = new SemanticVfxAdapter(host);
    const value = evaluator(trackId);
    value.play();
    for (const command of value.advance(0.26)) adapter.dispatch(command);
    const rendererId =
      trackId === "wave-semantic-events"
        ? "instance:wave-semantic-events:wave-hand-trail:0"
        : "instance:aura-semantic-events:torso-persistent-aura:0";
    const before = structuredClone(host.updates.get(rendererId)!.pose);
    host.sockets.set(socketId, {
      position: { x: 320, y: 410 },
      rotation: {
        x: 0,
        y: 0,
        z: Math.sin(Math.PI / 5),
        w: Math.cos(Math.PI / 5),
      },
      scale: { x: 1.25, y: 0.75 },
    });
    adapter.tick(0.1);
    const after = host.updates.get(rendererId)!.pose;
    assert.notDeepEqual(after.position, before.position);
    assert.notDeepEqual(after.rotation, before.rotation);
    assert.notDeepEqual(after.scale, before.scale);
  }
});

test("tracked Creator runtime uses supported quaternion APIs and neutral packages stay Cocos-free", async () => {
  const projectRoot = resolve(process.cwd(), "../..");
  const runtime = await readFile(
    resolve(
      projectRoot,
      "assets/gameai/task014b/task014b-semantic-vfx-reference.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(runtime, /\.getEuler\(/u);
  assert.match(runtime, /getWorldRotation\(this\.socketWorldRotation\)/u);
  assert.match(runtime, /Quat\.fromEuler\(/u);
  assert.match(runtime, /Quat\.multiply\(/u);
  assert.match(runtime, /setWorldRotation\(this\.composedWorldRotation\)/u);

  const declarations = await readFile(
    resolve(projectRoot, "types/cc-ci.d.ts"),
    "utf8",
  );
  assert.doesNotMatch(declarations, /getEuler/u);
  assert.match(declarations, /static fromEuler<Out extends Quat>/u);
  assert.match(declarations, /static multiply<Out extends Quat>/u);
  assert.match(declarations, /static normalize<Out extends Quat>/u);
  assert.match(declarations, /getWorldRotation\(out\?: Quat\): Quat/u);
  assert.match(
    declarations,
    /setWorldRotation\(rotation: Readonly<Quat>\): void/u,
  );

  const neutralRoot = resolve(
    process.cwd(),
    "../../../../../pipelines/character-semantic-events/source",
  );
  const names = await readdir(neutralRoot);
  for (const name of names.filter((entry) => entry.endsWith(".ts"))) {
    const source = await readFile(resolve(neutralRoot, name), "utf8");
    assert.doesNotMatch(source, /from ["']cc["']|\\bQuat\\b/u, name);
    assert.doesNotMatch(
      source,
      /Transform Stress|toggle-transform-stress|KEY_X/u,
      name,
    );
  }
});

test("TASK-014B generated mirrors exactly match typed sources", async () => {
  const extensionRoot = resolve(process.cwd());
  const projectRoot = resolve(extensionRoot, "../..");
  const sourceRoot = resolve(extensionRoot, "source/task014b");
  const runtimeRoot = resolve(projectRoot, "assets/gameai/task014b");
  const modules = [
    "semantic-vfx-adapter.ts",
    "semantic-vfx-cue-registry.ts",
    "semantic-vfx-diagnostics.ts",
    "semantic-vfx-input-registry.ts",
    "semantic-vfx-reference-contract.ts",
    "semantic-vfx-resource-manifest.ts",
    "semantic-vfx-sorting.ts",
  ];
  for (const moduleName of modules) {
    const source = await readFile(resolve(sourceRoot, moduleName), "utf8");
    const expected =
      "// Generated from the tested TASK-014B semantic VFX adapter boundary. Do not hand-edit.\n" +
      source.replace(
        /from "(\.\.?\/[^"]+)\.js";/gu,
        'from "$1";',
      );
    assert.equal(
      await readFile(resolve(runtimeRoot, moduleName), "utf8"),
      expected,
      moduleName,
    );
  }

  const stabilizedSources = await Promise.all(
    [
      "semantic-vfx-cue-registry.ts",
      "semantic-vfx-input-registry.ts",
      "semantic-vfx-reference-contract.ts",
    ].map((name) => readFile(resolve(sourceRoot, name), "utf8")),
  );
  for (const source of stabilizedSources) {
    assert.doesNotMatch(source, /\bas any\b|\bas string\b/u);
  }
});

test("partial renderer failure is cleaned without adapter state mutation", () => {
  const host = new FakeHost();
  host.failCreate = true;
  const adapter = new SemanticVfxAdapter(host);
  const walk = evaluator("walk-semantic-events");
  walk.play();
  const emit = walk.advance(0.21)[0]!;
  assert.throws(
    () => adapter.dispatch(emit),
    (error) =>
      error instanceof SemanticVfxAdapterError &&
      error.code === SemanticVfxAdapterErrorCode.RENDERER_FAILURE,
  );
  assert.equal(host.activeRendererCount(), 0);
  assert.equal(adapter.snapshot().activeOneShotCount, 0);
});

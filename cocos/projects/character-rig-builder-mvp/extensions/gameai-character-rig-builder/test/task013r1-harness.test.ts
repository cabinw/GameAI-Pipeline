import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  formatHarnessInputHelp,
  HARNESS_INPUT_REGISTRY,
  resolveHarnessInputByCocosKey,
  validateHarnessInputRegistry,
} from "../source/task013r1/harness-input-registry";
import { HarnessLifecycle } from "../source/task013r1/harness-lifecycle";
import {
  HARNESS_LOGICAL_RESOURCE_MANIFEST,
  HarnessResourceCoordinator,
  resolveHarnessResourceManifest,
} from "../source/task013r1/harness-resource-manifest";
import {
  HARNESS_SORTING_POLICY,
  harnessSortingOrder,
  validateHarnessSortingPolicy,
} from "../source/task013r1/harness-sorting-registry";
import {
  harnessBounds,
  harnessBoundsIntersect,
  harnessDistance,
  validateHarnessSpatialMeasurement,
} from "../source/task013r1/harness-spatial";
import {
  HARNESS_REST_POSE,
  HARNESS_STRESS_POSE,
  HarnessPlaybackState,
  sampleHarnessPose,
} from "../source/task013r1/harness-state";

const extensionRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(extensionRoot, "../..");

test("TASK-013R1 lifecycle rejects duplicate setup and stale callbacks", () => {
  const lifecycle = new HarnessLifecycle();
  const first = lifecycle.begin();
  assert.equal(first, 1);
  assert.throws(
    () => lifecycle.begin(),
    /TASK_013R1_LIFECYCLE_DUPLICATE_SETUP/u,
  );
  lifecycle.ready(first);
  assert.equal(lifecycle.snapshot().phase, "ready");
  lifecycle.teardown();
  assert.equal(lifecycle.accepts(first), false);
  const second = lifecycle.begin();
  assert.equal(second, 3);
  assert.throws(
    () => lifecycle.ready(first),
    /TASK_013R1_LIFECYCLE_STALE_GENERATION/u,
  );
  lifecycle.ready(second);
  lifecycle.teardown(true);
  assert.deepEqual(lifecycle.snapshot(), {
    phase: "disposed",
    generation: 4,
    setupCount: 2,
    teardownCount: 2,
  });
});

test("TASK-013R1 manifest resolves one frozen logical resource and requires terminal completion", () => {
  const manifest = resolveHarnessResourceManifest();
  assert.deepEqual(manifest, [
    {
      logicalId: "harness-config",
      relativePath: "harness-config",
      kind: "json",
      cocosPath: "task013r1/harness-config",
    },
  ]);
  const coordinator = new HarnessResourceCoordinator(manifest);
  assert.equal(coordinator.snapshot().terminal, "pending");
  coordinator.request("harness-config");
  assert.throws(
    () => coordinator.request("harness-config"),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
  coordinator.succeed("harness-config");
  assert.deepEqual(coordinator.snapshot(), {
    expected: 1,
    requested: 1,
    loaded: 1,
    failed: 0,
    duplicateRequests: 1,
    terminal: "passed",
  });
});

test("TASK-013R1 manifest rejects duplicate IDs, paths, and unknown results", () => {
  assert.throws(
    () =>
      resolveHarnessResourceManifest([
        ...HARNESS_LOGICAL_RESOURCE_MANIFEST,
        { ...HARNESS_LOGICAL_RESOURCE_MANIFEST[0]! },
      ]),
    /TASK_013R1_RESOURCE_MANIFEST_DUPLICATE_ID/u,
  );
  assert.throws(
    () =>
      resolveHarnessResourceManifest([
        ...HARNESS_LOGICAL_RESOURCE_MANIFEST,
        {
          logicalId: "other-config",
          relativePath: "harness-config",
          kind: "json",
        },
      ]),
    /TASK_013R1_RESOURCE_MANIFEST_DUPLICATE_PATH/u,
  );
  const coordinator = new HarnessResourceCoordinator(
    resolveHarnessResourceManifest(),
  );
  assert.throws(
    () => coordinator.succeed("unknown"),
    /TASK_013R1_RESOURCE_UNKNOWN_ID/u,
  );
});

test("TASK-013R1 semantic registry is the HUD and dispatcher source of truth", () => {
  assert.deepEqual(
    HARNESS_INPUT_REGISTRY.map((binding) => [
      binding.semanticActionId,
      binding.displayedKey,
      binding.cocosKeyCode,
      binding.action.kind,
    ]),
    [
      ["debug.toggle", "D", "KEY_D", "toggle-debug"],
      ["playback.toggle", "Space", "SPACE", "toggle-playback"],
      ["reset.exact", "Esc", "ESCAPE", "exact-reset"],
      ["stress.toggle", "T", "KEY_T", "toggle-stress"],
      ["lifecycle.rebuild", "E", "KEY_E", "rebuild-runtime"],
    ],
  );
  assert.equal(
    formatHarnessInputHelp(),
    "D Debug · Space Pause/Resume · Esc Exact Reset · T Transform Stress · E Lifecycle Rebuild",
  );
  assert.equal(
    resolveHarnessInputByCocosKey("KEY_D").semanticActionId,
    "debug.toggle",
  );
  assert.throws(
    () =>
      validateHarnessInputRegistry([
        ...HARNESS_INPUT_REGISTRY,
        { ...HARNESS_INPUT_REGISTRY[0]!, semanticActionId: "other" },
      ]),
    /TASK_013R1_INPUT_REGISTRY_DUPLICATE/u,
  );
});

test("TASK-013R1 sorting registry owns disjoint production, debug, and HUD ranges", () => {
  assert.doesNotThrow(() => validateHarnessSortingPolicy());
  assert.ok(
    HARNESS_SORTING_POLICY.production.maximum <
      HARNESS_SORTING_POLICY.debug.minimum,
  );
  assert.ok(
    HARNESS_SORTING_POLICY.debug.maximum <
      HARNESS_SORTING_POLICY.hud.minimum,
  );
  assert.equal(harnessSortingOrder("production-attachment"), 12);
  assert.equal(harnessSortingOrder("debug-geometry"), 100);
  assert.equal(harnessSortingOrder("hud"), 200);
  assert.throws(
    () =>
      validateHarnessSortingPolicy({
        ...HARNESS_SORTING_POLICY,
        debug: { minimum: 19, maximum: 109 },
      }),
    /TASK_013R1_SORTING_POLICY_INVALID/u,
  );
});

test("TASK-013R1 animation samples two poses deterministically and exact Reset is stopped at zero", () => {
  assert.deepEqual(sampleHarnessPose(0), HARNESS_REST_POSE);
  assert.deepEqual(sampleHarnessPose(1), HARNESS_STRESS_POSE);
  assert.deepEqual(sampleHarnessPose(2), HARNESS_REST_POSE);
  const playback = new HarnessPlaybackState();
  playback.togglePlayback();
  playback.update(0.75);
  assert.equal(playback.snapshot().state, "playing");
  assert.equal(playback.snapshot().timeSeconds, 0.75);
  playback.toggleDebug();
  playback.toggleStress();
  assert.deepEqual(playback.exactReset(), HARNESS_REST_POSE);
  assert.deepEqual(playback.snapshot(), {
    state: "stopped",
    timeSeconds: 0,
    stressEnabled: true,
    debugEnabled: false,
  });
});

test("TASK-013R1 spatial measurement validates finite round trips, locked grip, and intersecting bounds", () => {
  const root = { x: -50, y: 20 };
  const child = { x: 70, y: 20 };
  const socket = { x: 190, y: 20 };
  assert.equal(harnessDistance(socket, socket), 0);
  const characterBounds = harnessBounds([root, child, socket], 20);
  const debugBounds = harnessBounds([root, child, socket], 10);
  assert.equal(harnessBoundsIntersect(characterBounds, debugBounds), true);
  assert.doesNotThrow(() =>
    validateHarnessSpatialMeasurement({
      markerError: 0,
      skeletonRootError: 0,
      skeletonChildError: 0,
      gripError: 0,
      characterBounds,
      debugBounds,
    }),
  );
  assert.throws(
    () =>
      validateHarnessSpatialMeasurement({
        markerError: 0.51,
        skeletonRootError: 0,
        skeletonChildError: 0,
        gripError: 0,
        characterBounds,
        debugBounds,
      }),
    /TASK_013R1_SPATIAL_TOLERANCE_EXCEEDED/u,
  );
  assert.throws(
    () =>
      validateHarnessSpatialMeasurement({
        markerError: Number.NaN,
        skeletonRootError: 0,
        skeletonChildError: 0,
        gripError: 0,
        characterBounds,
        debugBounds,
      }),
    /TASK_013R1_SPATIAL_NON_FINITE/u,
  );
});

test("TASK-013R1 generated runtime mirrors every tested pure boundary", () => {
  for (const moduleName of [
    "harness-input-registry.ts",
    "harness-lifecycle.ts",
    "harness-resource-manifest.ts",
    "harness-sorting-registry.ts",
    "harness-spatial.ts",
    "harness-state.ts",
  ]) {
    const source = readFileSync(
      path.join(extensionRoot, "source/task013r1", moduleName),
      "utf8",
    );
    const generated = readFileSync(
      path.join(projectRoot, "assets/gameai/task013r1", moduleName),
      "utf8",
    );
    assert.equal(
      generated,
      `// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.\n${source}`,
      moduleName,
    );
  }
});

test("TASK-013R1 runtime source does not contain Full Loadout or fixed skeleton compensation", () => {
  const runtime = readFileSync(
    path.join(
      projectRoot,
      "assets/gameai/task013r1/task013r1-harness.ts",
    ),
    "utf8",
  );
  const projector = readFileSync(
    path.join(
      projectRoot,
      "assets/gameai/task013r1/debug-space-projector.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    runtime,
    /composable-loadout|full-loadout|toolbox|jacket|sunglasses/iu,
  );
  assert.match(projector, /convertToNodeSpaceAR/u);
  assert.match(projector, /convertToWorldSpaceAR/u);
  assert.match(projector, /getWorldPosition/u);
  assert.match(runtime, /harnessDistance\(socketWorld, gripWorld\)/u);
  assert.doesNotMatch(runtime, /lineTo\(0,\s*-\s*Math\.max/gu);
});

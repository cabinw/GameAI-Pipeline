import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { RigAnimation } from "@gameai/rig-animation";
import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../source/production-lite-character-adapter";
import {
  BASE_RIG_REQUIRED_CLIP_IDS,
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
} from "../source/task013r2/base-rig-contract";
import {
  BASE_RIG_INPUT_REGISTRY,
  formatBaseRigInputHelp,
  validateBaseRigInputRegistry,
} from "../source/task013r2/base-rig-input-registry";
import {
  createBaseRigResourceManifest,
} from "../source/task013r2/base-rig-resource-manifest";
import { BaseRigBridgeState } from "../source/task013r2/base-rig-state";
import { HarnessResourceCoordinator } from "../source/task013r1/harness-resource-manifest";
import {
  HARNESS_SORTING_POLICY,
  harnessProductionSortingOrder,
} from "../source/task013r1/harness-sorting-registry";
import {
  harnessBounds,
  validateHierarchySpatialMeasurement,
} from "../source/task013r1/harness-spatial";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const projectRoot = path.resolve(extensionRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);

async function realPlan(): Promise<
  ReturnType<typeof buildCocosProductionLiteCharacterPlan>
> {
  const layout = JSON.parse(
    await readFileAsync(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
  ) as Parameters<typeof buildCocosProductionLiteCharacterPlan>[0];
  const clips = await Promise.all(
    ["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
      JSON.parse(
        await readFileAsync(
          path.join(fixtureRoot, `animations/${name}.json`),
          "utf8",
        ),
      ) as RigAnimation,
    ),
  );
  const dimensions = Object.fromEntries(
    await Promise.all(
      layout.parts.map(async (part) => {
        const metadata = await sharp(
          path.join(fixtureRoot, part.file),
        ).metadata();
        return [
          part.partId,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
  return buildCocosProductionLiteCharacterPlan(layout, clips, dimensions);
}

test("TASK-013R2 validates the real engine-neutral base hierarchy and explicit semantic clips", async () => {
  const plan = await realPlan();
  assert.deepEqual(validateBaseRigBridgePlan(plan), {
    rigId: "production-lite-character-layout",
    rootJointId: "pelvis",
    partCount: 17,
    jointCount: 17,
    skeletonSegmentCount: 16,
    clipIds: [...BASE_RIG_REQUIRED_CLIP_IDS].sort(),
  });
});

test("TASK-013R2 fails closed for unknown parents, cycles, tracks, and missing semantic clips", async () => {
  const source = await realPlan();
  const unknownParent = structuredClone(source) as unknown as BaseRigBridgePlan;
  (unknownParent.parts[0] as { parentId: string }).parentId = "missing";
  assert.throws(
    () => validateBaseRigBridgePlan(unknownParent),
    /TASK_013R2_UNKNOWN_PARENT/u,
  );

  const cycle = structuredClone(source) as unknown as BaseRigBridgePlan;
  const root = cycle.parts.find((part) => part.parentId === null)!;
  (root as { parentId: string }).parentId = cycle.parts[0]!.jointId;
  assert.throws(
    () => validateBaseRigBridgePlan(cycle),
    /TASK_013R2_INVALID_ROOT_COUNT|TASK_013R2_PARENT_CYCLE/u,
  );

  const unknownTrack = structuredClone(source) as unknown as BaseRigBridgePlan;
  (
    unknownTrack.clips[0]!.tracks[0] as { jointId: string }
  ).jointId = "missing";
  assert.throws(
    () => validateBaseRigBridgePlan(unknownTrack),
    /TASK_013R2_UNKNOWN_CLIP_JOINT/u,
  );

  const missingClip = {
    ...source,
    clips: source.clips.filter(
      (clip) => clip.animationId !== BASE_RIG_REQUIRED_CLIP_IDS[0],
    ),
  };
  assert.throws(
    () => validateBaseRigBridgePlan(missingClip),
    /TASK_013R2_REQUIRED_CLIP_MISSING/u,
  );
});

test("TASK-013R2 manifest is deterministic, complete, and rejects duplicate requests", async () => {
  const plan = await realPlan();
  const manifest = createBaseRigResourceManifest(plan);
  assert.equal(manifest.length, 17);
  assert.deepEqual(
    manifest.map((entry) => entry.logicalId),
    [...manifest.map((entry) => entry.logicalId)].sort(),
  );
  assert.equal(
    manifest.find((entry) => entry.logicalId === "part-head")?.cocosPath,
    "production-lite-character/parts/head/spriteFrame",
  );
  const coordinator = new HarnessResourceCoordinator(manifest);
  for (const entry of manifest) {
    coordinator.request(entry.logicalId);
    coordinator.succeed(entry.logicalId);
  }
  assert.equal(coordinator.snapshot().terminal, "passed");
  assert.equal(coordinator.snapshot().loaded, 17);
  assert.throws(
    () => coordinator.request(manifest[0]!.logicalId),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
});

test("TASK-013R2 semantic input registry is the single HUD and dispatcher definition", () => {
  assert.doesNotThrow(() => validateBaseRigInputRegistry());
  assert.deepEqual(
    BASE_RIG_INPUT_REGISTRY.map((binding) => [
      binding.actionId,
      binding.displayedKey,
      binding.cocosKeyCode,
      binding.hudLabel,
      binding.action.kind,
    ]),
    [
      ["select-rest", "1", "DIGIT_1", "Rest", "select-clip"],
      ["select-wave", "2", "DIGIT_2", "Wave", "select-clip"],
      [
        "select-integration-stress",
        "3",
        "DIGIT_3",
        "Integration Stress",
        "select-clip",
      ],
      ["toggle-playback", "Space", "SPACE", "Pause/Resume", "toggle-playback"],
      ["exact-reset", "R", "KEY_R", "Exact Reset", "exact-reset"],
      ["toggle-debug", "D", "KEY_D", "Debug", "toggle-debug"],
      [
        "toggle-transform-stress",
        "T",
        "KEY_T",
        "Transform Stress",
        "toggle-stress",
      ],
      [
        "rebuild-runtime",
        "E",
        "KEY_E",
        "Lifecycle Rebuild",
        "rebuild-runtime",
      ],
    ],
  );
  for (const binding of BASE_RIG_INPUT_REGISTRY) {
    assert.match(formatBaseRigInputHelp(), new RegExp(binding.hudLabel, "u"));
  }
});

test("TASK-013R2 deterministic state fails on unknown clips and Exact Reset is Rest/stopped/time-zero", () => {
  const state = new BaseRigBridgeState();
  state.selectClip(BASE_RIG_REQUIRED_CLIP_IDS[1]!);
  state.setTime(0.75);
  state.toggleDebug();
  state.toggleStress();
  assert.deepEqual(state.exactReset(), {
    clipId: "production-lite-rest-idle",
    playbackStatus: "stopped",
    timeSeconds: 0,
    debugEnabled: false,
    stressEnabled: true,
  });
  assert.throws(
    () => state.selectClip("unknown"),
    /TASK_013R2_UNKNOWN_SEMANTIC_CLIP/u,
  );
});

test("TASK-013R2 all production draw orders fit the accepted global registry and hierarchy measurements fail closed", async () => {
  const plan = await realPlan();
  const orders = plan.parts.map((part) =>
    harnessProductionSortingOrder(part.drawOrder),
  );
  assert.equal(new Set(orders).size, 17);
  assert.ok(
    orders.every(
      (order) =>
        order >= HARNESS_SORTING_POLICY.production.minimum &&
        order <= HARNESS_SORTING_POLICY.production.maximum,
    ),
  );
  const characterBounds = harnessBounds(
    [
      { x: -100, y: -200 },
      { x: 100, y: 200 },
    ],
    10,
  );
  const debugBounds = harnessBounds(
    [
      { x: -80, y: -180 },
      { x: 80, y: 180 },
    ],
    5,
  );
  assert.doesNotThrow(() =>
    validateHierarchySpatialMeasurement({
      markerErrors: [0, 0.1],
      skeletonEndpointErrors: [0, 0.2],
      characterBounds,
      debugBounds,
      unknownParentCount: 0,
      parentCycleCount: 0,
      nonFinitePositionCount: 0,
      sortingViolationCount: 0,
    }),
  );
  assert.throws(
    () =>
      validateHierarchySpatialMeasurement({
        markerErrors: [0],
        skeletonEndpointErrors: [0],
        characterBounds,
        debugBounds,
        unknownParentCount: 1,
        parentCycleCount: 0,
        nonFinitePositionCount: 0,
        sortingViolationCount: 0,
      }),
    /TASK_013R2_SPATIAL_HIERARCHY_INVALID/u,
  );
});

test("TASK-013R2 generated runtime mirrors every tested pure boundary", () => {
  for (const moduleName of [
    "base-rig-contract.ts",
    "base-rig-input-registry.ts",
    "base-rig-resource-manifest.ts",
    "base-rig-state.ts",
  ]) {
    const source = readFileSync(
      path.join(extensionRoot, "source/task013r2", moduleName),
      "utf8",
    );
    const generated = readFileSync(
      path.join(projectRoot, "assets/gameai/task013r2", moduleName),
      "utf8",
    );
    const creatorSource = source.replace(
      /from "(\.\.?\/[^"]+)\.js";/gu,
      'from "$1";',
    );
    assert.equal(
      generated,
      `// Generated from the tested TASK-013R2 base-rig bridge boundary. Do not hand-edit.\n${creatorSource}`,
      moduleName,
    );
  }
});

test("TASK-013R2 runtime composes the accepted boundaries without old Full Loadout logic", () => {
  const runtime = readFileSync(
    path.join(
      projectRoot,
      "assets/gameai/task013r2/task013r2-base-rig-bridge.ts",
    ),
    "utf8",
  );
  assert.match(runtime, /HarnessLifecycle/u);
  assert.match(runtime, /HarnessResourceCoordinator/u);
  assert.match(runtime, /projectNodeToOverlayLocal/u);
  assert.match(runtime, /composeJointPose/u);
  assert.match(runtime, /PRODUCTION_LITE_CHARACTER_PLAN/u);
  assert.doesNotMatch(runtime, /executeInEditMode|toolbox|briefcase|jacket|sunglasses|garment|loadout/iu);
  assert.doesNotMatch(runtime, /CanvasCompensation|characterOffset|magicOffset/iu);
});

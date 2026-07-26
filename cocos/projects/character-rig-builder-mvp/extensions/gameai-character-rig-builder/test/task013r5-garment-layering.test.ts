import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type {
  AttachmentLayout,
  RigLayout,
} from "@gameai/character-contracts";
import type { RigAnimation } from "@gameai/rig-animation";
import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../source/production-lite-character-adapter";
import {
  buildGarmentBridgePlan,
  type GarmentStateDefinition,
} from "../source/task013r5/garment-bridge-contract";
import {
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
  GARMENT_ONLY_STATE_ID,
  validateGarmentBridgePlan,
  type GarmentBridgePlan,
} from "../source/task013r5/garment-bridge-runtime-contract";
import {
  createGarmentResourceManifest,
} from "../source/task013r5/garment-resource-manifest";
import {
  formatGarmentInputHelpLines,
  GARMENT_INPUT_REGISTRY,
  validateGarmentInputRegistry,
} from "../source/task013r5/garment-input-registry";
import { GarmentBridgeState } from "../source/task013r5/garment-state";
import {
  garmentSeamError,
  garmentSeamOverlap,
  validateGarmentSpatialMeasurement,
} from "../source/task013r5/garment-spatial";
import { HarnessResourceCoordinator } from "../source/task013r1/harness-resource-manifest";
import { harnessBounds } from "../source/task013r1/harness-spatial";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const projectRoot = path.resolve(extensionRoot, "../..");
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const garmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);

const stateDefinitions: readonly GarmentStateDefinition[] =
  Object.freeze([
    Object.freeze({
      stateId: GARMENT_BASE_ONLY_STATE_ID,
      hudLabel: "Base Only",
      garmentEnabled: false,
      accessoriesEnabled: false,
      slotEnabled: Object.freeze({
        headwear: false,
        "face-accessory": false,
      }),
      wearableSetEnabled: Object.freeze({
        "casual-jacket": false,
      }),
    }),
    Object.freeze({
      stateId: GARMENT_ONLY_STATE_ID,
      hudLabel: "Garment Only",
      garmentEnabled: true,
      accessoriesEnabled: false,
      slotEnabled: Object.freeze({
        headwear: false,
        "face-accessory": false,
      }),
      wearableSetEnabled: Object.freeze({
        "casual-jacket": true,
      }),
    }),
    Object.freeze({
      stateId: GARMENT_ACCESSORIES_ONLY_STATE_ID,
      hudLabel: "Accessories Only",
      garmentEnabled: false,
      accessoriesEnabled: true,
      slotEnabled: Object.freeze({
        headwear: true,
        "face-accessory": true,
      }),
      wearableSetEnabled: Object.freeze({
        "casual-jacket": false,
      }),
    }),
    Object.freeze({
      stateId: GARMENT_COMBINED_STATE_ID,
      hudLabel: "Garment + Accessories",
      garmentEnabled: true,
      accessoriesEnabled: true,
      slotEnabled: Object.freeze({
        headwear: true,
        "face-accessory": true,
      }),
      wearableSetEnabled: Object.freeze({
        "casual-jacket": true,
      }),
    }),
  ]);

async function fixtureInputs(): Promise<{
  readonly rigLayout: RigLayout;
  readonly attachmentLayout: AttachmentLayout;
  readonly basePlan: ReturnType<
    typeof buildCocosProductionLiteCharacterPlan
  >;
  readonly baseDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >;
  readonly attachmentDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >;
}> {
  const rigLayout = JSON.parse(
    await readFile(path.join(baseFixtureRoot, "rig-layout.json"), "utf8"),
  ) as RigLayout;
  const attachmentLayout = JSON.parse(
    await readFile(
      path.join(garmentFixtureRoot, "attachment-layout.json"),
      "utf8",
    ),
  ) as AttachmentLayout;
  const clips = await Promise.all(
    ["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
      JSON.parse(
        await readFile(
          path.join(baseFixtureRoot, `animations/${name}.json`),
          "utf8",
        ),
      ) as RigAnimation,
    ),
  );
  const baseDimensions = Object.fromEntries(
    await Promise.all(
      rigLayout.parts.map(async (part) => {
        const metadata = await sharp(
          path.join(baseFixtureRoot, part.file),
        ).metadata();
        return [
          part.partId,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
  const attachmentDimensions = Object.fromEntries(
    await Promise.all(
      attachmentLayout.attachments.map(async (attachment) => {
        const metadata = await sharp(
          path.join(garmentFixtureRoot, attachment.file),
        ).metadata();
        return [
          attachment.attachmentId,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
  return {
    rigLayout,
    attachmentLayout,
    basePlan: buildCocosProductionLiteCharacterPlan(
      rigLayout,
      clips,
      baseDimensions,
    ),
    baseDimensions,
    attachmentDimensions,
  };
}

async function realPlan(): Promise<GarmentBridgePlan> {
  const inputs = await fixtureInputs();
  return buildGarmentBridgePlan(
    inputs.basePlan,
    inputs.rigLayout,
    inputs.attachmentLayout,
    stateDefinitions,
    inputs.baseDimensions,
    inputs.attachmentDimensions,
  );
}

test("TASK-013R5 resolves all four garment/accessory states through one generic plan", async () => {
  const plan = await realPlan();
  assert.deepEqual(validateGarmentBridgePlan(plan), {
    rigId: "production-lite-character-layout",
    partCount: 17,
    jointCount: 17,
    slotCount: 12,
    attachmentCount: 14,
    garmentPartCount: 11,
    accessoryPartCount: 3,
    seamCount: 10,
    resourceCount: 31,
    stateCounts: {
      [GARMENT_BASE_ONLY_STATE_ID]: {
        garment: 0,
        accessories: 0,
        total: 0,
      },
      [GARMENT_ONLY_STATE_ID]: {
        garment: 11,
        accessories: 0,
        total: 11,
      },
      [GARMENT_ACCESSORIES_ONLY_STATE_ID]: {
        garment: 0,
        accessories: 3,
        total: 3,
      },
      [GARMENT_COMBINED_STATE_ID]: {
        garment: 11,
        accessories: 3,
        total: 14,
      },
    },
    defaultStateId: GARMENT_COMBINED_STATE_ID,
  });
  assert.deepEqual(
    plan.states.map((state) => [
      state.stateId,
      state.garmentEnabled,
      state.accessoriesEnabled,
      state.enabledAttachmentIds.length,
    ]),
    [
      [GARMENT_BASE_ONLY_STATE_ID, false, false, 0],
      [GARMENT_ONLY_STATE_ID, true, false, 11],
      [GARMENT_ACCESSORIES_ONLY_STATE_ID, false, true, 3],
      [GARMENT_COMBINED_STATE_ID, true, true, 14],
    ],
  );
});

test("TASK-013R5 resolution ignores state, slot, set, attachment, and seam declaration order", async () => {
  const inputs = await fixtureInputs();
  const reordered = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  reordered.slots.reverse();
  reordered.attachments.reverse();
  reordered.wearableSets?.reverse();
  reordered.seams?.reverse();
  assert.deepEqual(
    buildGarmentBridgePlan(
      inputs.basePlan,
      inputs.rigLayout,
      reordered,
      [...stateDefinitions].reverse(),
      inputs.baseDimensions,
      inputs.attachmentDimensions,
    ),
    await realPlan(),
  );
});

test("TASK-013R5 fails closed for invalid attachment, wearable, seam, state, and resource data", async () => {
  const inputs = await fixtureInputs();
  const duplicate = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  duplicate.attachments[1]!.attachmentId =
    duplicate.attachments[0]!.attachmentId;
  assert.throws(
    () =>
      buildGarmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        duplicate,
        stateDefinitions,
        inputs.baseDimensions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R5_ATTACHMENT_CONTRACT_INVALID|DUPLICATE_ATTACHMENT_ID/u,
  );

  const missingSet = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  missingSet.wearableSets = [];
  assert.throws(
    () =>
      buildGarmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        missingSet,
        stateDefinitions,
        inputs.baseDimensions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R5_ATTACHMENT_CONTRACT_INVALID|UNKNOWN_WEARABLE_SET|WEARABLE_OR_SEAM/u,
  );

  const badSeam = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  badSeam.seams![0]!.firstItemId = "missing";
  assert.throws(
    () =>
      buildGarmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        badSeam,
        stateDefinitions,
        inputs.baseDimensions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R5_ATTACHMENT_CONTRACT_INVALID|UNKNOWN_SEAM_ITEM/u,
  );

  const invalidState = structuredClone(
    stateDefinitions,
  ) as GarmentStateDefinition[];
  invalidState[0] = {
    ...invalidState[0]!,
    wearableSetEnabled: { missing: true },
  };
  assert.throws(
    () =>
      buildGarmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        inputs.attachmentLayout,
        invalidState,
        inputs.baseDimensions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R5_STATE_DEFINITION_INVALID/u,
  );
  assert.throws(
    () =>
      buildGarmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        inputs.attachmentLayout,
        stateDefinitions,
        inputs.baseDimensions,
        {
          ...inputs.attachmentDimensions,
          "jacket-front": undefined as never,
        },
      ),
    /TASK_013R5_ATTACHMENT_DIMENSIONS_MISSING/u,
  );
});

test("TASK-013R5 manifest is deterministic, complete, and requested once", async () => {
  const manifest = createGarmentResourceManifest(await realPlan());
  assert.equal(manifest.length, 31);
  assert.deepEqual(
    manifest.map((entry) => entry.logicalId),
    [...manifest.map((entry) => entry.logicalId)].sort(),
  );
  assert.equal(new Set(manifest.map((entry) => entry.cocosPath)).size, 31);
  const coordinator = new HarnessResourceCoordinator(manifest);
  for (const entry of manifest) {
    coordinator.request(entry.logicalId);
    coordinator.succeed(entry.logicalId);
  }
  assert.deepEqual(
    {
      terminal: coordinator.snapshot().terminal,
      loaded: coordinator.snapshot().loaded,
      duplicates: coordinator.snapshot().duplicateRequests,
    },
    { terminal: "passed", loaded: 31, duplicates: 0 },
  );
  assert.throws(
    () => coordinator.request(manifest[0]!.logicalId),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
});

test("TASK-013R5 global ordering is unique and preserves every declared role", async () => {
  const plan = await realPlan();
  const orders = [
    ...Object.values(plan.baseSortingOrders),
    ...plan.attachments.map((attachment) => attachment.sortingOrder),
  ];
  assert.equal(new Set(orders).size, 31);
  for (const attachment of plan.attachments) {
    assert.ok(
      attachment.layerRole === undefined ||
        ["back", "front", "cover"].includes(attachment.layerRole),
    );
  }
  assert.deepEqual(
    [...plan.attachments]
      .sort(
        (left, right) =>
          left.sortingOrder - right.sortingOrder,
      )
      .map((attachment) => attachment.attachmentId),
    [...plan.attachments]
      .sort(
        (left, right) =>
          left.drawOrder - right.drawOrder ||
          left.attachmentId.localeCompare(right.attachmentId),
      )
      .map((attachment) => attachment.attachmentId),
  );
});

test("TASK-013R5 semantic registry owns all states, group toggles, HUD labels, and dispatcher keys", () => {
  assert.doesNotThrow(() => validateGarmentInputRegistry());
  const [runtimeHelp, stateHelp, toggleHelp] =
    formatGarmentInputHelpLines();
  assert.match(runtimeHelp, /1 Rest/u);
  assert.match(stateHelp, /4 Base Only/u);
  assert.match(stateHelp, /7 Garment \+ Accessories/u);
  assert.match(toggleHelp, /G Toggle Garment/u);
  assert.match(toggleHelp, /A Toggle Accessories/u);
  assert.equal(
    new Set(GARMENT_INPUT_REGISTRY.map((binding) => binding.actionId))
      .size,
    GARMENT_INPUT_REGISTRY.length,
  );
});

test("TASK-013R5 state toggles compose the matrix and exact Reset is clean", () => {
  const state = new GarmentBridgeState(GARMENT_COMBINED_STATE_ID);
  assert.equal(
    state.toggleGarment().loadoutStateId,
    GARMENT_ACCESSORIES_ONLY_STATE_ID,
  );
  assert.equal(
    state.toggleAccessories().loadoutStateId,
    GARMENT_BASE_ONLY_STATE_ID,
  );
  assert.equal(
    state.toggleGarment().loadoutStateId,
    GARMENT_ONLY_STATE_ID,
  );
  assert.equal(
    state.toggleAccessories().loadoutStateId,
    GARMENT_COMBINED_STATE_ID,
  );
  state.selectClip("production-lite-arm-wave");
  state.setTime(0.75);
  state.toggleDebug();
  state.toggleStress();
  assert.deepEqual(state.exactReset(), {
    clipId: "production-lite-rest-idle",
    playbackStatus: "stopped",
    timeSeconds: 0,
    loadoutStateId: GARMENT_COMBINED_STATE_ID,
    debugEnabled: false,
    stressEnabled: false,
  });
  assert.throws(
    () => state.selectState("missing" as never),
    /TASK_013R5_UNKNOWN_LOADOUT_STATE/u,
  );
});

test("TASK-013R5 seam and spatial validation measure overlap deficit at runtime tolerance", () => {
  const first = { left: 0, right: 10, bottom: 0, top: 10 };
  const second = { left: 7, right: 17, bottom: 6, top: 16 };
  assert.equal(garmentSeamOverlap(first, second), 3);
  assert.equal(garmentSeamError(first, second, 3), 0);
  assert.ok(
    Math.abs(garmentSeamError(first, second, 3.4) - 0.4) <
      Number.EPSILON * 4,
  );
  const characterBounds = harnessBounds(
    [
      { x: -100, y: -100 },
      { x: 100, y: 100 },
    ],
    10,
  );
  const valid = {
    markerErrors: [0, 0],
    skeletonEndpointErrors: [0, 0],
    accessorySocketToAnchorErrors: [0, 0, 0],
    garmentSeamErrors: Array.from({ length: 10 }, () => 0),
    characterBounds,
    debugBounds: harnessBounds(
      [
        { x: -90, y: -90 },
        { x: 90, y: 90 },
      ],
      0,
    ),
    unknownParentCount: 0,
    parentCycleCount: 0,
    nonFinitePositionCount: 0,
    sortingViolationCount: 0,
    unknownSlotCount: 0,
    duplicateActiveGarmentCount: 0,
    duplicateActiveAccessoryCount: 0,
    frontBackRoleViolationCount: 0,
  };
  assert.doesNotThrow(() => validateGarmentSpatialMeasurement(valid));
  assert.doesNotThrow(() =>
    validateGarmentSpatialMeasurement({
      ...valid,
      garmentSeamErrors: [],
      accessorySocketToAnchorErrors: [],
    }),
  );
  assert.throws(
    () =>
      validateGarmentSpatialMeasurement({
        ...valid,
        garmentSeamErrors: [0.51],
      }),
    /TASK_013R5_SPATIAL_TOLERANCE_EXCEEDED/u,
  );
  assert.throws(
    () =>
      validateGarmentSpatialMeasurement({
        ...valid,
        duplicateActiveGarmentCount: 1,
      }),
    /TASK_013R5_RUNTIME_INVALID/u,
  );
});

test("TASK-013R5 generated mirrors are deterministic and generic core has no fixture branches", () => {
  const sourceRoot = path.join(extensionRoot, "source/task013r5");
  const runtimeRoot = path.join(projectRoot, "assets/gameai/task013r5");
  for (const moduleName of [
    "garment-bridge-runtime-contract.ts",
    "garment-input-registry.ts",
    "garment-resource-manifest.ts",
    "garment-spatial.ts",
    "garment-state.ts",
  ]) {
    const source = readFileSync(
      path.join(sourceRoot, moduleName),
      "utf8",
    );
    const expected =
      "// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.\n" +
      source.replace(
        /from "(\.\.?\/[^"]+)\.js";/gu,
        'from "$1";',
      );
    assert.equal(
      readFileSync(path.join(runtimeRoot, moduleName), "utf8"),
      expected,
    );
  }
  const core = [
    "garment-bridge-contract.ts",
    "garment-bridge-runtime-contract.ts",
    "garment-resource-manifest.ts",
    "garment-spatial.ts",
    "garment-state.ts",
  ]
    .map((moduleName) =>
      readFileSync(path.join(sourceRoot, moduleName), "utf8"),
    )
    .join("\n");
  assert.doesNotMatch(
    core,
    /\b(?:jacket|collar|sleeve|cuff|cap|sunglasses)\b/iu,
  );
  const runtimeBuilder = readFileSync(
    path.join(runtimeRoot, "garment-runtime-builder.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    runtimeBuilder,
    /\b(?:jacket|collar|sleeve|cuff|cap|sunglasses)\b/iu,
  );
});

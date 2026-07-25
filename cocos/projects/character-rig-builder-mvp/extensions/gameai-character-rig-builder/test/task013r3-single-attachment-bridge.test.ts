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
  buildSingleAttachmentBridgePlan,
} from "../source/task013r3/single-attachment-contract";
import {
  SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
  SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  validateSingleAttachmentBridgePlan,
  type SingleAttachmentBridgePlan,
} from "../source/task013r3/single-attachment-runtime-contract";
import {
  createSingleAttachmentResourceManifest,
} from "../source/task013r3/single-attachment-resource-manifest";
import {
  formatSingleAttachmentInputHelp,
  SINGLE_ATTACHMENT_INPUT_REGISTRY,
  validateSingleAttachmentInputRegistry,
} from "../source/task013r3/single-attachment-input-registry";
import { SingleAttachmentBridgeState } from "../source/task013r3/single-attachment-state";
import {
  validateSingleAttachmentSpatialMeasurement,
} from "../source/task013r3/single-attachment-spatial";
import { HarnessResourceCoordinator } from "../source/task013r1/harness-resource-manifest";
import {
  resolveHarnessProductionSortingOrders,
} from "../source/task013r1/harness-sorting-registry";
import {
  harnessBounds,
} from "../source/task013r1/harness-spatial";

const extensionRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const projectRoot = path.resolve(extensionRoot, "../..");
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const attachmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);

async function fixtureInputs(): Promise<{
  readonly rigLayout: RigLayout;
  readonly attachmentLayout: AttachmentLayout;
  readonly basePlan: ReturnType<
    typeof buildCocosProductionLiteCharacterPlan
  >;
  readonly selectedDimensions: Readonly<{ width: number; height: number }>;
}> {
  const rigLayout = JSON.parse(
    await readFile(path.join(baseFixtureRoot, "rig-layout.json"), "utf8"),
  ) as RigLayout;
  const attachmentLayout = JSON.parse(
    await readFile(
      path.join(attachmentFixtureRoot, "attachment-layout.json"),
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
  const selected = attachmentLayout.attachments.find(
    (attachment) => attachment.attachmentId === "sunglasses",
  )!;
  const selectedMetadata = await sharp(
    path.join(attachmentFixtureRoot, selected.file),
  ).metadata();
  return {
    rigLayout,
    attachmentLayout,
    basePlan: buildCocosProductionLiteCharacterPlan(
      rigLayout,
      clips,
      baseDimensions,
    ),
    selectedDimensions: {
      width: selectedMetadata.width!,
      height: selectedMetadata.height!,
    },
  };
}

async function realPlan(): Promise<SingleAttachmentBridgePlan> {
  const inputs = await fixtureInputs();
  return buildSingleAttachmentBridgePlan(
    inputs.basePlan,
    inputs.rigLayout,
    inputs.attachmentLayout,
    "sunglasses",
    inputs.selectedDimensions,
  );
}

test("TASK-013R3 resolves one real attachment through the existing engine-neutral contract", async () => {
  const plan = await realPlan();
  assert.deepEqual(validateSingleAttachmentBridgePlan(plan), {
    rigId: "production-lite-character-layout",
    partCount: 17,
    jointCount: 17,
    attachmentCount: 1,
    resourceCount: 18,
    defaultStateId: SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  });
  assert.equal(plan.attachment.parentPartId, plan.slot.parentPartId);
  assert.equal(
    plan.attachment.enabledByState[SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID],
    false,
  );
  assert.equal(
    plan.attachment.enabledByState[SINGLE_ATTACHMENT_ENABLED_STATE_ID],
    true,
  );
  assert.ok(
    plan.attachment.sortingOrder >
      plan.baseSortingOrders[plan.slot.parentPartId]!,
  );
  assert.ok(
    plan.attachment.sortingOrder <
      plan.baseSortingOrders["hair-front"]!,
  );
});

test("TASK-013R3 fails clearly for unknown attachment, parent, and incompatible rig", async () => {
  const inputs = await fixtureInputs();
  assert.throws(
    () =>
      buildSingleAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        inputs.attachmentLayout,
        "missing",
        inputs.selectedDimensions,
      ),
    /TASK_013R3_ATTACHMENT_NOT_UNIQUE/u,
  );
  const unknownParent = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  unknownParent.slots.find(
    (slot) => slot.slotId === "face-accessory",
  )!.parentPartId = "missing";
  assert.throws(
    () =>
      buildSingleAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        unknownParent,
        "sunglasses",
        inputs.selectedDimensions,
      ),
    /TASK_013R3_ATTACHMENT_CONTRACT_INVALID|UNKNOWN_PARENT/u,
  );
  const incompatible = {
    ...inputs.basePlan,
    rigId: "different-rig",
  };
  assert.throws(
    () =>
      buildSingleAttachmentBridgePlan(
        incompatible,
        inputs.rigLayout,
        inputs.attachmentLayout,
        "sunglasses",
        inputs.selectedDimensions,
      ),
    /TASK_013R3_INCOMPATIBLE_BASE_RIG/u,
  );
});

test("TASK-013R3 manifest is deterministic, complete, and requested once", async () => {
  const manifest = createSingleAttachmentResourceManifest(
    await realPlan(),
  );
  assert.equal(manifest.length, 18);
  assert.deepEqual(
    manifest.map((entry) => entry.logicalId),
    [...manifest.map((entry) => entry.logicalId)].sort(),
  );
  assert.equal(
    manifest.find(
      (entry) => entry.logicalId === "attachment-sunglasses",
    )?.cocosPath,
    "production-lite-head-accessories/attachments/sunglasses/spriteFrame",
  );
  const coordinator = new HarnessResourceCoordinator(manifest);
  for (const entry of manifest) {
    coordinator.request(entry.logicalId);
    coordinator.succeed(entry.logicalId);
  }
  assert.equal(coordinator.snapshot().terminal, "passed");
  assert.equal(coordinator.snapshot().loaded, 18);
  assert.throws(
    () => coordinator.request(manifest[0]!.logicalId),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
});

test("TASK-013R3 semantic registry owns clips, attachment states, HUD, and dispatcher keys", () => {
  assert.doesNotThrow(() => validateSingleAttachmentInputRegistry());
  assert.deepEqual(
    SINGLE_ATTACHMENT_INPUT_REGISTRY.filter(
      (binding) => binding.action.kind === "select-attachment-state",
    ).map((binding) => [
      binding.actionId,
      binding.displayedKey,
      binding.cocosKeyCode,
      binding.hudLabel,
      binding.action.kind === "select-attachment-state"
        ? binding.action.stateId
        : null,
    ]),
    [
      [
        "select-base-only",
        "4",
        "DIGIT_4",
        "Base Only",
        SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
      ],
      [
        "select-attachment-enabled",
        "5",
        "DIGIT_5",
        "Attachment Enabled",
        SINGLE_ATTACHMENT_ENABLED_STATE_ID,
      ],
    ],
  );
  for (const binding of SINGLE_ATTACHMENT_INPUT_REGISTRY) {
    assert.match(
      formatSingleAttachmentInputHelp(),
      new RegExp(binding.hudLabel, "u"),
    );
  }
});

test("TASK-013R3 exact Reset restores stopped Rest, default attachment, transform stress, and debug OFF", () => {
  const state = new SingleAttachmentBridgeState(
    SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  );
  state.selectAttachmentState(SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID);
  state.selectClip("production-lite-arm-wave");
  state.setTime(0.75);
  state.toggleDebug();
  state.toggleStress();
  assert.deepEqual(state.exactReset(), {
    clipId: "production-lite-rest-idle",
    playbackStatus: "stopped",
    timeSeconds: 0,
    attachmentStateId: SINGLE_ATTACHMENT_ENABLED_STATE_ID,
    debugEnabled: false,
    stressEnabled: true,
  });
  assert.throws(
    () => state.selectAttachmentState("missing" as never),
    /TASK_013R3_UNKNOWN_ATTACHMENT_STATE/u,
  );
});

test("TASK-013R3 fractional global ordering is deterministic and reorder-independent", () => {
  const entries = [
    { semanticId: "body", drawOrder: 12 },
    { semanticId: "attachment", drawOrder: 12.5 },
    { semanticId: "foreground", drawOrder: 13 },
  ];
  const first = resolveHarnessProductionSortingOrders(entries);
  const reordered = resolveHarnessProductionSortingOrders(
    [...entries].reverse(),
  );
  assert.deepEqual([...first], [...reordered]);
  assert.deepEqual([...first], [
    ["body", 10],
    ["attachment", 11],
    ["foreground", 12],
  ]);
  assert.throws(
    () =>
      resolveHarnessProductionSortingOrders([
        ...entries,
        { semanticId: "duplicate-order", drawOrder: 12.5 },
      ]),
    /TASK_013R1_PRODUCTION_SORT_ENTRY_INVALID/u,
  );
});

test("TASK-013R3 spatial validation accepts exact runtime observations and rejects drift or duplicates", () => {
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
    socketToAnchorErrors: [0],
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
    duplicateAttachmentNodeCount: 0,
  };
  assert.doesNotThrow(() =>
    validateSingleAttachmentSpatialMeasurement(valid),
  );
  assert.throws(
    () =>
      validateSingleAttachmentSpatialMeasurement({
        ...valid,
        socketToAnchorErrors: [0.51],
      }),
    /TASK_013R3_SOCKET_TOLERANCE_EXCEEDED/u,
  );
  assert.throws(
    () =>
      validateSingleAttachmentSpatialMeasurement({
        ...valid,
        duplicateAttachmentNodeCount: 1,
      }),
    /TASK_013R3_ATTACHMENT_RUNTIME_INVALID/u,
  );
});

test("TASK-013R3 generated mirrors are deterministic and runtime core is fixture-neutral", () => {
  const sourceRoot = path.join(extensionRoot, "source/task013r3");
  const runtimeRoot = path.join(
    projectRoot,
    "assets/gameai/task013r3",
  );
  for (const moduleName of [
    "single-attachment-input-registry.ts",
    "single-attachment-resource-manifest.ts",
    "single-attachment-runtime-contract.ts",
    "single-attachment-spatial.ts",
    "single-attachment-state.ts",
  ]) {
    const source = readFileSync(
      path.join(sourceRoot, moduleName),
      "utf8",
    );
    const expected =
      "// Generated from the tested TASK-013R3 single-attachment boundary. Do not hand-edit.\n" +
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
    "base-rig-runtime-builder.ts",
    "single-attachment-runtime-builder.ts",
    "single-attachment-runtime-contract.ts",
    "single-attachment-resource-manifest.ts",
    "single-attachment-spatial.ts",
  ]
    .map((name) => readFileSync(path.join(runtimeRoot, name), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    core,
    /sunglasses|glasses|head|face-accessory|cap|garment|prop/iu,
  );
  const component = readFileSync(
    path.join(runtimeRoot, "task013r3-single-attachment-bridge.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    component,
    /Full Loadout|composable-loadout|head-accessory-layering/iu,
  );
});

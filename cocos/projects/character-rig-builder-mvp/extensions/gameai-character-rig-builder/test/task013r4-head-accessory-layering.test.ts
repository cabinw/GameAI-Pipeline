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
  buildMultiAttachmentBridgePlan,
  type MultiAttachmentStateDefinition,
} from "../source/task013r4/multi-attachment-contract";
import {
  MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
  MULTI_ATTACHMENT_COMBINED_STATE_ID,
  MULTI_ATTACHMENT_GROUP_A_STATE_ID,
  MULTI_ATTACHMENT_GROUP_B_STATE_ID,
  validateMultiAttachmentBridgePlan,
  type MultiAttachmentBridgePlan,
} from "../source/task013r4/multi-attachment-runtime-contract";
import {
  createMultiAttachmentResourceManifest,
} from "../source/task013r4/multi-attachment-resource-manifest";
import {
  formatMultiAttachmentInputHelp,
  formatMultiAttachmentInputHelpLines,
  MULTI_ATTACHMENT_INPUT_REGISTRY,
  validateMultiAttachmentInputRegistry,
} from "../source/task013r4/multi-attachment-input-registry";
import { MultiAttachmentBridgeState } from "../source/task013r4/multi-attachment-state";
import {
  validateMultiAttachmentSpatialMeasurement,
} from "../source/task013r4/multi-attachment-spatial";
import { HarnessResourceCoordinator } from "../source/task013r1/harness-resource-manifest";
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

const stateDefinitions: readonly MultiAttachmentStateDefinition[] =
  Object.freeze([
    Object.freeze({
      stateId: MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
      hudLabel: "Base Only",
      slotEnabled: Object.freeze({
        headwear: false,
        "face-accessory": false,
      }),
    }),
    Object.freeze({
      stateId: MULTI_ATTACHMENT_GROUP_A_STATE_ID,
      hudLabel: "Cap Only",
      slotEnabled: Object.freeze({
        headwear: true,
        "face-accessory": false,
      }),
    }),
    Object.freeze({
      stateId: MULTI_ATTACHMENT_GROUP_B_STATE_ID,
      hudLabel: "Sunglasses Only",
      slotEnabled: Object.freeze({
        headwear: false,
        "face-accessory": true,
      }),
    }),
    Object.freeze({
      stateId: MULTI_ATTACHMENT_COMBINED_STATE_ID,
      hudLabel: "Cap + Sunglasses",
      slotEnabled: Object.freeze({
        headwear: true,
        "face-accessory": true,
      }),
    }),
  ]);

async function fixtureInputs(): Promise<{
  readonly rigLayout: RigLayout;
  readonly attachmentLayout: AttachmentLayout;
  readonly basePlan: ReturnType<
    typeof buildCocosProductionLiteCharacterPlan
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
  const attachmentDimensions = Object.fromEntries(
    await Promise.all(
      attachmentLayout.attachments.map(async (attachment) => {
        const metadata = await sharp(
          path.join(attachmentFixtureRoot, attachment.file),
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
    attachmentDimensions,
  };
}

async function realPlan(): Promise<MultiAttachmentBridgePlan> {
  const inputs = await fixtureInputs();
  return buildMultiAttachmentBridgePlan(
    inputs.basePlan,
    inputs.rigLayout,
    inputs.attachmentLayout,
    stateDefinitions,
    inputs.attachmentDimensions,
  );
}

test("TASK-013R4 resolves all four states through one generic collection plan", async () => {
  const plan = await realPlan();
  assert.deepEqual(validateMultiAttachmentBridgePlan(plan), {
    rigId: "production-lite-character-layout",
    partCount: 17,
    jointCount: 17,
    slotCount: 2,
    attachmentCount: 3,
    resourceCount: 20,
    stateAttachmentCounts: {
      [MULTI_ATTACHMENT_BASE_ONLY_STATE_ID]: 0,
      [MULTI_ATTACHMENT_GROUP_A_STATE_ID]: 2,
      [MULTI_ATTACHMENT_GROUP_B_STATE_ID]: 1,
      [MULTI_ATTACHMENT_COMBINED_STATE_ID]: 3,
    },
    defaultStateId: MULTI_ATTACHMENT_COMBINED_STATE_ID,
  });
  assert.deepEqual(
    plan.attachments.map((attachment) => attachment.attachmentId),
    ["cap-back", "sunglasses", "cap-front"],
  );
  assert.deepEqual(
    plan.states.map((state) => [
      state.stateId,
      state.enabledAttachmentIds.length,
    ]),
    [
      [MULTI_ATTACHMENT_BASE_ONLY_STATE_ID, 0],
      [MULTI_ATTACHMENT_GROUP_A_STATE_ID, 2],
      [MULTI_ATTACHMENT_GROUP_B_STATE_ID, 1],
      [MULTI_ATTACHMENT_COMBINED_STATE_ID, 3],
    ],
  );
});

test("TASK-013R4 resolution is deterministic under reordered state, slot, and attachment inputs", async () => {
  const inputs = await fixtureInputs();
  const canonical = await realPlan();
  const reordered = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  reordered.slots.reverse();
  reordered.attachments.reverse();
  const output = buildMultiAttachmentBridgePlan(
    inputs.basePlan,
    inputs.rigLayout,
    reordered,
    [...stateDefinitions].reverse(),
    inputs.attachmentDimensions,
  );
  assert.deepEqual(output, canonical);
});

test("TASK-013R4 fails closed for duplicate IDs, unknown roles, slots, parents, and resources", async () => {
  const inputs = await fixtureInputs();
  const duplicate = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  duplicate.attachments[1]!.attachmentId =
    duplicate.attachments[0]!.attachmentId;
  assert.throws(
    () =>
      buildMultiAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        duplicate,
        stateDefinitions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R4_ATTACHMENT_CONTRACT_INVALID|DUPLICATE_ATTACHMENT_ID/u,
  );
  const invalidRole = structuredClone(
    inputs.attachmentLayout,
  ) as AttachmentLayout;
  invalidRole.attachments[0]!.layerRole = "invalid";
  assert.throws(
    () =>
      buildMultiAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        invalidRole,
        stateDefinitions,
        inputs.attachmentDimensions,
      ),
    /TASK_013R4_ATTACHMENT_CONTRACT_INVALID/u,
  );
  assert.throws(
    () =>
      buildMultiAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        inputs.attachmentLayout,
        stateDefinitions,
        {
          ...inputs.attachmentDimensions,
          sunglasses: undefined as never,
        },
      ),
    /TASK_013R4_ATTACHMENT_DIMENSIONS_MISSING/u,
  );
  const invalidState = structuredClone(
    stateDefinitions,
  ) as MultiAttachmentStateDefinition[];
  invalidState[0] = {
    ...invalidState[0]!,
    slotEnabled: { missing: true },
  };
  assert.throws(
    () =>
      buildMultiAttachmentBridgePlan(
        inputs.basePlan,
        inputs.rigLayout,
        inputs.attachmentLayout,
        invalidState,
        inputs.attachmentDimensions,
      ),
    /TASK_013R4_STATE_DEFINITION_INVALID/u,
  );
});

test("TASK-013R4 manifest is deterministic, complete, and requested once", async () => {
  const manifest = createMultiAttachmentResourceManifest(await realPlan());
  assert.equal(manifest.length, 20);
  assert.deepEqual(
    manifest.map((entry) => entry.logicalId),
    [...manifest.map((entry) => entry.logicalId)].sort(),
  );
  for (const attachmentId of [
    "cap-back",
    "cap-front",
    "sunglasses",
  ]) {
    assert.ok(
      manifest.some(
        (entry) =>
          entry.logicalId === `attachment-${attachmentId}` &&
          entry.cocosPath.endsWith(
            `/attachments/${attachmentId}/spriteFrame`,
          ),
      ),
    );
  }
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
    { terminal: "passed", loaded: 20, duplicates: 0 },
  );
  assert.throws(
    () => coordinator.request(manifest[0]!.logicalId),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
});

test("TASK-013R4 global front/back order is stable and role driven", async () => {
  const plan = await realPlan();
  const order = new Map([
    ...Object.entries(plan.baseSortingOrders),
    ...plan.attachments.map(
      (attachment) =>
        [attachment.attachmentId, attachment.sortingOrder] as const,
    ),
  ]);
  assert.ok(order.get("hair-back")! < order.get("cap-back")!);
  assert.ok(order.get("cap-back")! < order.get("head")!);
  assert.ok(order.get("head")! < order.get("sunglasses")!);
  assert.ok(order.get("sunglasses")! < order.get("hair-front")!);
  assert.ok(order.get("hair-front")! < order.get("cap-front")!);
  assert.equal(
    plan.attachments.find(
      (attachment) => attachment.attachmentId === "cap-back",
    )?.layerRole,
    "back",
  );
  assert.ok(
    plan.attachments
      .filter((attachment) => attachment.layerRole === "front")
      .every(
        (attachment) =>
          attachment.drawOrder >
          plan.base.parts.find(
            (part) => part.jointId === attachment.parentPartId,
          )!.drawOrder,
      ),
  );
});

test("TASK-013R4 semantic registry is the HUD and dispatcher source for all four states", () => {
  assert.doesNotThrow(() => validateMultiAttachmentInputRegistry());
  assert.deepEqual(
    MULTI_ATTACHMENT_INPUT_REGISTRY.filter(
      (binding) => binding.action.kind === "select-attachment-state",
    ).map((binding) => [
      binding.displayedKey,
      binding.cocosKeyCode,
      binding.hudLabel,
      binding.action.kind === "select-attachment-state"
        ? binding.action.stateId
        : null,
    ]),
    [
      ["4", "DIGIT_4", "Base Only", MULTI_ATTACHMENT_BASE_ONLY_STATE_ID],
      ["5", "DIGIT_5", "Cap Only", MULTI_ATTACHMENT_GROUP_A_STATE_ID],
      [
        "6",
        "DIGIT_6",
        "Sunglasses Only",
        MULTI_ATTACHMENT_GROUP_B_STATE_ID,
      ],
      [
        "7",
        "DIGIT_7",
        "Cap + Sunglasses",
        MULTI_ATTACHMENT_COMBINED_STATE_ID,
      ],
    ],
  );
  for (const binding of MULTI_ATTACHMENT_INPUT_REGISTRY) {
    assert.match(
      formatMultiAttachmentInputHelp(),
      new RegExp(binding.hudLabel.replace("+", "\\+"), "u"),
    );
  }
  const [runtimeHelp, stateHelp] =
    formatMultiAttachmentInputHelpLines();
  assert.match(runtimeHelp, /1 Rest/u);
  assert.doesNotMatch(runtimeHelp, /4 Base Only/u);
  assert.match(stateHelp, /4 Base Only/u);
  assert.match(stateHelp, /7 Cap \+ Sunglasses/u);
  assert.equal(
    `${runtimeHelp} · ${stateHelp}`,
    formatMultiAttachmentInputHelp(),
  );
});

test("TASK-013R4 exact Reset restores stopped Rest, default collection, stress, and Debug OFF", () => {
  const state = new MultiAttachmentBridgeState(
    MULTI_ATTACHMENT_COMBINED_STATE_ID,
  );
  state.selectAttachmentState(MULTI_ATTACHMENT_BASE_ONLY_STATE_ID);
  state.selectClip("production-lite-arm-wave");
  state.setTime(0.75);
  state.toggleDebug();
  state.toggleStress();
  assert.deepEqual(state.exactReset(), {
    clipId: "production-lite-rest-idle",
    playbackStatus: "stopped",
    timeSeconds: 0,
    attachmentStateId: MULTI_ATTACHMENT_COMBINED_STATE_ID,
    debugEnabled: false,
    stressEnabled: true,
  });
  assert.throws(
    () => state.selectAttachmentState("missing" as never),
    /TASK_013R4_UNKNOWN_ATTACHMENT_STATE/u,
  );
});

test("TASK-013R4 spatial validation accepts base-only and multi-attachment observations", () => {
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
    socketToAnchorErrors: [0, 0, 0],
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
    duplicateActiveAttachmentCount: 0,
    frontBackRoleViolationCount: 0,
  };
  assert.doesNotThrow(() =>
    validateMultiAttachmentSpatialMeasurement(valid),
  );
  assert.doesNotThrow(() =>
    validateMultiAttachmentSpatialMeasurement({
      ...valid,
      socketToAnchorErrors: [],
    }),
  );
  assert.throws(
    () =>
      validateMultiAttachmentSpatialMeasurement({
        ...valid,
        socketToAnchorErrors: [0.51],
      }),
    /TASK_013R4_SOCKET_TOLERANCE_EXCEEDED/u,
  );
  assert.throws(
    () =>
      validateMultiAttachmentSpatialMeasurement({
        ...valid,
        frontBackRoleViolationCount: 1,
      }),
    /TASK_013R4_ATTACHMENT_RUNTIME_INVALID/u,
  );
});

test("TASK-013R4 generated mirrors are deterministic and generic core has no fixture branches", () => {
  const sourceRoot = path.join(extensionRoot, "source/task013r4");
  const runtimeRoot = path.join(projectRoot, "assets/gameai/task013r4");
  for (const moduleName of [
    "multi-attachment-input-registry.ts",
    "multi-attachment-resource-manifest.ts",
    "multi-attachment-runtime-contract.ts",
    "multi-attachment-spatial.ts",
    "multi-attachment-state.ts",
  ]) {
    const source = readFileSync(
      path.join(sourceRoot, moduleName),
      "utf8",
    );
    const expected =
      "// Generated from the tested TASK-013R4 multi-attachment boundary. Do not hand-edit.\n" +
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
    "multi-attachment-runtime-builder.ts",
    "multi-attachment-runtime-contract.ts",
    "multi-attachment-resource-manifest.ts",
    "multi-attachment-spatial.ts",
    "multi-attachment-state.ts",
  ]
    .map((name) => readFileSync(path.join(runtimeRoot, name), "utf8"))
    .join("\n");
  assert.doesNotMatch(
    core,
    /sunglasses|glasses|headwear|face-accessory|cap|garment|prop/iu,
  );
  const component = readFileSync(
    path.join(
      runtimeRoot,
      "task013r4-head-accessory-layering-bridge.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    component,
    /Full Loadout|composable-loadout|head-accessory-layering-demo/iu,
  );
});

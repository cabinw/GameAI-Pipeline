import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  composeAttachmentWorldTransform,
  multiplyAttachmentTransforms,
  resolveCharacterLoadout,
  type AttachmentLayout,
  type CharacterLoadoutContract,
  type RigLayout,
} from "@gameai/character-contracts";
import {
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  RigAnimationPlayback,
  type RigAnimation,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
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
} from "../source/task013r5/garment-bridge-runtime-contract";
import { HarnessResourceCoordinator } from "../source/task013r1/harness-resource-manifest";
import { harnessBounds } from "../source/task013r1/harness-spatial";
import { buildPropBridgePlan } from "../source/task013r6/prop-bridge-contract";
import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_REQUIRED_STATE_IDS,
  PROP_RIGHT_HAND_STATE_ID,
  propLoadoutStateId,
  validatePropBridgePlan,
  type PropBridgePlan,
} from "../source/task013r6/prop-bridge-runtime-contract";
import {
  createPropResourceManifest,
} from "../source/task013r6/prop-resource-manifest";
import {
  formatPropInputHelpLines,
  PROP_INPUT_REGISTRY,
  validatePropInputRegistry,
} from "../source/task013r6/prop-input-registry";
import {
  PropBridgeState,
  PROP_INTEGRATION_STRESS_CLIP_ID,
  PROP_SWING_CLIP_ID,
} from "../source/task013r6/prop-state";
import {
  validatePropSpatialMeasurement,
} from "../source/task013r6/prop-spatial";
import { PropRuntimeReadiness } from "../source/task013r6/runtime-readiness";

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
const propFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const fullLoadoutFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);

test("TASK-013R7 input remains unavailable throughout loading and terminal failure", () => {
  const readiness = new PropRuntimeReadiness();
  const generation = readiness.begin();
  assert.equal(readiness.canDispatch(generation), false);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 0);
  readiness.fail(generation);
  assert.equal(readiness.canDispatch(generation), false);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 0);
});

test("TASK-013R7 resource failure reaches one explicit terminal failure", async () => {
  const manifest = createPropResourceManifest((await fixtureInputs()).plan);
  const coordinator = new HarnessResourceCoordinator(manifest);
  for (const entry of manifest) coordinator.request(entry.logicalId);
  coordinator.reject(manifest[0]!.logicalId);
  coordinator.rejectPending();
  const snapshot = coordinator.snapshot();
  assert.equal(snapshot.terminal, "failed");
  assert.equal(snapshot.requested, 35);
  assert.equal(snapshot.loaded, 0);
  assert.equal(snapshot.failed, 35);
  assert.equal(snapshot.duplicateRequests, 0);
});

test("TASK-013R7 activates exactly one handler only after complete readiness", () => {
  const readiness = new PropRuntimeReadiness();
  const generation = readiness.begin();
  readiness.resourcesPassed(generation);
  assert.equal(readiness.canDispatch(generation), false);
  readiness.nodesBuilt(generation);
  readiness.resetComplete(generation, true);
  readiness.lifecycleReady(generation);
  assert.equal(readiness.canDispatch(generation), false);
  readiness.activateInput(generation);
  assert.equal(readiness.canDispatch(generation), true);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 1);
  assert.throws(
    () => readiness.activateInput(generation),
    /TASK_013R7_DUPLICATE_INPUT_HANDLER/u,
  );
});

test("TASK-013R7 rebuild, disable, and destroy invalidate old handlers and generations", () => {
  const readiness = new PropRuntimeReadiness();
  const first = readiness.begin();
  readiness.resourcesPassed(first);
  readiness.nodesBuilt(first);
  readiness.resetComplete(first, true);
  readiness.lifecycleReady(first);
  readiness.activateInput(first);
  readiness.teardown();
  assert.equal(readiness.canDispatch(first), false);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 0);

  const second = readiness.begin();
  assert.notEqual(second, first);
  assert.equal(readiness.canDispatch(second), false);
  readiness.resourcesPassed(second);
  readiness.nodesBuilt(second);
  readiness.resetComplete(second, true);
  readiness.lifecycleReady(second);
  readiness.activateInput(second);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 1);
  readiness.teardown(true);
  assert.equal(readiness.snapshot().activeInputHandlerCount, 0);
  assert.equal(readiness.canDispatch(second), false);
});

const garmentStateDefinitions: readonly GarmentStateDefinition[] =
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

interface FixtureInputs {
  readonly rigLayout: RigLayout;
  readonly garmentLayout: AttachmentLayout;
  readonly propLayout: AttachmentLayout;
  readonly clips: readonly RigAnimation[];
  readonly plan: PropBridgePlan;
  readonly resolvedLoadoutStates: Parameters<
    typeof buildPropBridgePlan
  >[5];
}

async function engineNeutralLoadoutStates(
  rigLayout: RigLayout,
): Promise<Parameters<typeof buildPropBridgePlan>[5]> {
  const serialized = JSON.parse(
    await readFile(
      path.join(fullLoadoutFixtureRoot, "loadout-contract.json"),
      "utf8",
    ),
  );
  const contract: CharacterLoadoutContract = {
    ...serialized,
    families: await Promise.all(
      serialized.families.map(async (family: any) => ({
        familyId: family.familyId,
        attachmentLayout: JSON.parse(
          await readFile(
            path.join(
              fullLoadoutFixtureRoot,
              family.attachmentLayoutFile,
            ),
            "utf8",
          ),
        ),
      })),
    ),
  };
  return contract.states.map((state) => {
    const resolved = resolveCharacterLoadout(
      rigLayout,
      contract,
      state.stateId,
    );
    const garment = state.enabledFamilyIds.includes("garment");
    const accessories = state.enabledFamilyIds.includes("accessories");
    const garmentStateId = garment && accessories
      ? GARMENT_COMBINED_STATE_ID
      : garment
        ? GARMENT_ONLY_STATE_ID
        : accessories
          ? GARMENT_ACCESSORIES_ONLY_STATE_ID
          : GARMENT_BASE_ONLY_STATE_ID;
    const propStateId =
      (state.propStateId ?? PROP_NO_PROP_STATE_ID) as
        Parameters<typeof buildPropBridgePlan>[5][number]["propStateId"];
    return {
      stateId: state.stateId,
      garmentStateId,
      propStateId,
      hudLabel: state.stateId,
      enabledAttachmentIds: resolved.enabledAttachments.map(
        (attachment) => attachment.attachmentId,
      ),
    } satisfies Parameters<typeof buildPropBridgePlan>[5][number];
  });
}

async function fixtureInputs(): Promise<FixtureInputs> {
  const rigLayout = JSON.parse(
    await readFile(path.join(propFixtureRoot, "rig-layout.json"), "utf8"),
  ) as RigLayout;
  const garmentLayout = JSON.parse(
    await readFile(
      path.join(garmentFixtureRoot, "attachment-layout.json"),
      "utf8",
    ),
  ) as AttachmentLayout;
  const propLayout = JSON.parse(
    await readFile(
      path.join(propFixtureRoot, "attachment-layout.json"),
      "utf8",
    ),
  ) as AttachmentLayout;
  const clips = await Promise.all([
    ...["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
      JSON.parse(
        await readFile(
          path.join(baseFixtureRoot, `animations/${name}.json`),
          "utf8",
        ),
      ) as RigAnimation,
    ),
    JSON.parse(
      await readFile(
        path.join(propFixtureRoot, "animations/prop-swing.json"),
        "utf8",
      ),
    ) as RigAnimation,
  ]);
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
  const garmentDimensions = Object.fromEntries(
    await Promise.all(
      garmentLayout.attachments.map(async (attachment) => {
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
  const propDimensions = Object.fromEntries(
    await Promise.all(
      propLayout.attachments.map(async (attachment) => {
        const metadata = await sharp(
          path.join(propFixtureRoot, attachment.file),
        ).metadata();
        return [
          attachment.attachmentId,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
  const basePlan = buildCocosProductionLiteCharacterPlan(
    rigLayout,
    clips,
    baseDimensions,
  );
  const garment = buildGarmentBridgePlan(
    basePlan,
    rigLayout,
    garmentLayout,
    garmentStateDefinitions,
    baseDimensions,
    garmentDimensions,
  );
  const resolvedLoadoutStates = await engineNeutralLoadoutStates(rigLayout);
  const plan = buildPropBridgePlan(
    garment,
    rigLayout,
    propLayout,
    propDimensions,
    "production-lite-one-handed-prop",
    resolvedLoadoutStates,
  );
  return {
    rigLayout,
    garmentLayout,
    propLayout,
    clips,
    plan,
    resolvedLoadoutStates,
  };
}

test("TASK-013R6 resolves the deterministic 12-state garment/accessory/prop cross-product", async () => {
  const { plan } = await fixtureInputs();
  const validation = validatePropBridgePlan(plan);
  assert.deepEqual(
    {
      partCount: validation.partCount,
      jointCount: validation.jointCount,
      garmentAttachments: validation.garmentAttachmentCount,
      propAttachments: validation.propAttachmentCount,
      primaryProps: validation.primaryPropCount,
      overlays: validation.handOverlayCount,
      resources: validation.resourceCount,
      states: validation.stateCount,
      defaultState: validation.defaultStateId,
    },
    {
      partCount: 17,
      jointCount: 17,
      garmentAttachments: 14,
      propAttachments: 4,
      primaryProps: 2,
      overlays: 2,
      resources: 35,
      states: 12,
      defaultState: propLoadoutStateId(
        GARMENT_COMBINED_STATE_ID,
        PROP_NO_PROP_STATE_ID,
      ),
    },
  );
  for (const garmentState of plan.garment.states) {
    for (const propStateId of PROP_REQUIRED_STATE_IDS) {
      const stateId = propLoadoutStateId(
        garmentState.stateId,
        propStateId,
      );
      const counts = validation.stateCounts[stateId];
      assert.ok(counts, stateId);
      assert.equal(
        counts.prop,
        propStateId === PROP_NO_PROP_STATE_ID ? 0 : 1,
      );
      assert.equal(
        counts.overlays,
        propStateId === PROP_NO_PROP_STATE_ID ? 0 : 1,
      );
    }
  }
});

test("TASK-013R6 resolution is stable under reordered prop declarations", async () => {
  const inputs = await fixtureInputs();
  const reordered = structuredClone(inputs.propLayout);
  reordered.slots.reverse();
  reordered.attachments.reverse();
  reordered.propStates?.reverse();
  const dimensions = Object.fromEntries(
    await Promise.all(
      reordered.attachments.map(async (attachment) => {
        const metadata = await sharp(
          path.join(propFixtureRoot, attachment.file),
        ).metadata();
        return [
          attachment.attachmentId,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
  assert.deepEqual(
    buildPropBridgePlan(
      inputs.plan.garment,
      inputs.rigLayout,
      reordered,
      dimensions,
      "production-lite-one-handed-prop",
      inputs.resolvedLoadoutStates,
    ),
    inputs.plan,
  );
});

test("TASK-013R6 rejects unknown prop state, hand socket, and duplicate prop IDs", async () => {
  const inputs = await fixtureInputs();
  const dimensions = Object.fromEntries(
    inputs.propLayout.attachments.map((attachment) => [
      attachment.attachmentId,
      { width: 64, height: 64 },
    ]),
  );
  const unknownState = structuredClone(inputs.propLayout);
  unknownState.attachments[0]!.propStateId = "missing";
  assert.throws(
    () =>
      buildPropBridgePlan(
        inputs.plan.garment,
        inputs.rigLayout,
        unknownState,
        dimensions,
        "production-lite-one-handed-prop",
        inputs.resolvedLoadoutStates,
      ),
    /TASK_013R6_PROP_CONTRACT_INVALID|UNKNOWN_PROP_STATE/u,
  );
  const unknownSocket = structuredClone(inputs.propLayout);
  unknownSocket.slots[0]!.target!.id = "missing";
  assert.throws(
    () =>
      buildPropBridgePlan(
        inputs.plan.garment,
        inputs.rigLayout,
        unknownSocket,
        dimensions,
        "production-lite-one-handed-prop",
        inputs.resolvedLoadoutStates,
      ),
    /TASK_013R6_PROP_CONTRACT_INVALID|UNKNOWN_ATTACHMENT_SOCKET/u,
  );
  const duplicate = structuredClone(inputs.propLayout);
  duplicate.attachments[1]!.attachmentId =
    duplicate.attachments[0]!.attachmentId;
  assert.throws(
    () =>
      buildPropBridgePlan(
        inputs.plan.garment,
        inputs.rigLayout,
        duplicate,
        dimensions,
        "production-lite-one-handed-prop",
        inputs.resolvedLoadoutStates,
      ),
    /TASK_013R6_PROP_CONTRACT_INVALID|DUPLICATE_ATTACHMENT_ID/u,
  );
  const missingDimensions = Object.fromEntries(
    Object.entries(dimensions).filter(
      ([attachmentId]) => attachmentId !== "toolbox-left",
    ),
  );
  assert.throws(
    () =>
      buildPropBridgePlan(
        inputs.plan.garment,
        inputs.rigLayout,
        inputs.propLayout,
        missingDimensions,
        "production-lite-one-handed-prop",
        inputs.resolvedLoadoutStates,
      ),
    /TASK_013R6_PROP_DIMENSIONS_MISSING/u,
  );
});

test("TASK-013R6 manifest is frozen, complete, and requested exactly once", async () => {
  const manifest = createPropResourceManifest(
    (await fixtureInputs()).plan,
  );
  assert.equal(manifest.length, 35);
  assert.deepEqual(
    manifest.map((entry) => entry.logicalId),
    [...manifest.map((entry) => entry.logicalId)].sort(),
  );
  assert.equal(new Set(manifest.map((entry) => entry.cocosPath)).size, 35);
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
    { terminal: "passed", loaded: 35, duplicates: 0 },
  );
  assert.throws(
    () => coordinator.request(manifest[0]!.logicalId),
    /TASK_013R1_RESOURCE_DUPLICATE_REQUEST/u,
  );
});

test("TASK-013R6 semantic registry owns clips, groups, prop states, HUD, and dispatcher keys", () => {
  assert.doesNotThrow(() => validatePropInputRegistry());
  const [runtimeHelp, propHelp, groupHelp] = formatPropInputHelpLines();
  assert.match(runtimeHelp, /1 Rest/u);
  assert.match(runtimeHelp, /3 Prop Swing/u);
  assert.match(runtimeHelp, /4 Integration Stress/u);
  assert.match(propHelp, /Z No Prop/u);
  assert.match(propHelp, /X Left Prop/u);
  assert.match(propHelp, /C Right Prop/u);
  assert.match(groupHelp, /G Garment OFF\/ON/u);
  assert.match(groupHelp, /A Accessories OFF\/ON/u);
  assert.equal(
    new Set(PROP_INPUT_REGISTRY.map((binding) => binding.actionId)).size,
    PROP_INPUT_REGISTRY.length,
  );
});

test("TASK-013R6 state composes all groups and Exact Reset restores documented defaults", () => {
  const state = new PropBridgeState(
    GARMENT_COMBINED_STATE_ID,
    PROP_NO_PROP_STATE_ID,
  );
  assert.equal(
    state.selectPropState(PROP_LEFT_HAND_STATE_ID).propStateId,
    PROP_LEFT_HAND_STATE_ID,
  );
  assert.equal(
    state.toggleGarment().garmentStateId,
    GARMENT_ACCESSORIES_ONLY_STATE_ID,
  );
  assert.equal(
    state.toggleAccessories().garmentStateId,
    GARMENT_BASE_ONLY_STATE_ID,
  );
  state.selectPropState(PROP_RIGHT_HAND_STATE_ID);
  state.selectClip(PROP_SWING_CLIP_ID);
  state.setTime(1.25);
  state.toggleDebug();
  state.toggleStress();
  assert.deepEqual(state.exactReset(), {
    clipId: "production-lite-rest-idle",
    playbackStatus: "stopped",
    timeSeconds: 0,
    garmentStateId: GARMENT_COMBINED_STATE_ID,
    propStateId: PROP_NO_PROP_STATE_ID,
    loadoutStateId: propLoadoutStateId(
      GARMENT_COMBINED_STATE_ID,
      PROP_NO_PROP_STATE_ID,
    ),
    debugEnabled: false,
    stressEnabled: false,
  });
  assert.throws(
    () => state.selectPropState("missing" as never),
    /TASK_013R6_UNKNOWN_PROP_STATE/u,
  );
});

test("TASK-013R6 global sorting is unique and preserves generic prop layer roles", async () => {
  const { plan } = await fixtureInputs();
  const entries = [
    ...plan.garment.base.parts.map((part) => ({
      id: part.jointId,
      drawOrder: part.drawOrder,
      sortingOrder: plan.garment.baseSortingOrders[part.jointId]!,
    })),
    ...plan.garment.attachments.map((attachment) => ({
      id: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
      sortingOrder: attachment.sortingOrder,
    })),
    ...plan.attachments.map((attachment) => ({
      id: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
      sortingOrder: attachment.sortingOrder,
    })),
  ];
  assert.equal(entries.length, 35);
  assert.equal(
    new Set(entries.map((entry) => entry.sortingOrder)).size,
    entries.length,
  );
  assert.deepEqual(
    [...entries]
      .sort(
        (left, right) =>
          left.sortingOrder - right.sortingOrder,
      )
      .map((entry) => entry.id),
    [...entries]
      .sort(
        (left, right) =>
          left.drawOrder - right.drawOrder ||
          left.id.localeCompare(right.id),
      )
      .map((entry) => entry.id),
  );
  assert.equal(
    plan.attachments.every((attachment) =>
      ["behind-target", "in-front-of-target", "target-overlay"].includes(
        attachment.layerRole,
      ),
    ),
    true,
  );
});

test("TASK-013R6 measures actual grip lock at 60 Hz for Prop Swing and Integration Stress", async () => {
  const { plan, rigLayout } = await fixtureInputs();
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const clipFiles = [
    path.join(propFixtureRoot, "animations/prop-swing.json"),
    path.join(baseFixtureRoot, "animations/articulation-stress.json"),
  ];
  let sampleCount = 0;
  let maximumGripError = 0;
  for (const clipFile of clipFiles) {
    const parsed = parseRigAnimation(await readFile(clipFile, "utf8"), {
      rigId: rigLayout.layoutId,
      rigSchemaVersion: rigLayout.schemaVersion,
      jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
    });
    assert.equal(parsed.ok, true, clipFile);
    if (!parsed.ok) continue;
    assert.ok(
      [PROP_SWING_CLIP_ID, PROP_INTEGRATION_STRESS_CLIP_ID].includes(
        parsed.value.animationId,
      ),
    );
    const playback = new RigAnimationPlayback(
      normalizeRigAnimation(parsed.value),
    );
    const frames = Math.ceil(parsed.value.duration * 60);
    for (const prop of plan.attachments.filter(
      (attachment) => attachment.attachmentKind === "prop",
    )) {
      const slot = plan.slots.find(
        (candidate) => candidate.slotId === prop.slotId,
      )!;
      for (let frame = 0; frame <= frames; frame += 1) {
        const time = Math.min(parsed.value.duration, frame / 60);
        const pose = evaluateRigPose(hierarchy, playback.seek(time));
        const parent = pose.joints[prop.parentPartId]!.worldTransform;
        const socket = composeAttachmentWorldTransform(
          parent,
          slot.transform,
          {
            position: { x: 0, y: 0 },
            rotationDegrees: 0,
            scale: { x: 1, y: 1 },
          },
        );
        const attachment = composeAttachmentWorldTransform(
          parent,
          slot.transform,
          prop.transform,
        );
        const offset = prop.gripLocalOffset!;
        const grip = multiplyAttachmentTransforms(
          attachment,
          {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            tx: offset.x,
            ty: offset.y,
          },
        );
        const error = Math.hypot(
          socket.tx - grip.tx,
          socket.ty - grip.ty,
        );
        maximumGripError = Math.max(maximumGripError, error);
        assert.ok(error <= 0.000001, `${clipFile}@${time}`);
        sampleCount += 1;
      }
    }
  }
  assert.ok(sampleCount >= 500, String(sampleCount));
  assert.equal(maximumGripError, 0);
});

test("TASK-013R6 spatial guard includes prop grip, duplicates, sockets, seams, and hierarchy", () => {
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
    propSocketToGripErrors: [0],
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
    unknownHandSocketCount: 0,
    duplicateActivePropCount: 0,
    duplicateHandOverlayCount: 0,
    activePrimaryPropCount: 1,
    expectedPrimaryPropCount: 1,
  };
  assert.doesNotThrow(() => validatePropSpatialMeasurement(valid));
  assert.doesNotThrow(() =>
    validatePropSpatialMeasurement({
      ...valid,
      propSocketToGripErrors: [],
      activePrimaryPropCount: 0,
      expectedPrimaryPropCount: 0,
    }),
  );
  assert.throws(
    () =>
      validatePropSpatialMeasurement({
        ...valid,
        propSocketToGripErrors: [0.51],
      }),
    /TASK_013R6_GRIP_TOLERANCE_EXCEEDED/u,
  );
  assert.throws(
    () =>
      validatePropSpatialMeasurement({
        ...valid,
        duplicateHandOverlayCount: 1,
      }),
    /TASK_013R6_PROP_RUNTIME_INVALID/u,
  );
  assert.throws(
    () =>
      validatePropSpatialMeasurement({
        ...valid,
        duplicateActivePropCount: 1,
      }),
    /TASK_013R6_PROP_RUNTIME_INVALID/u,
  );
});

test("TASK-013R6 generated mirrors are deterministic and shared core has no item-specific branch", () => {
  const sourceRoot = path.join(extensionRoot, "source/task013r6");
  const runtimeRoot = path.join(projectRoot, "assets/gameai/task013r6");
  for (const moduleName of [
    "prop-bridge-runtime-contract.ts",
    "prop-input-registry.ts",
    "prop-resource-manifest.ts",
    "prop-spatial.ts",
    "prop-state.ts",
  ]) {
    const source = readFileSync(path.join(sourceRoot, moduleName), "utf8");
    const expected =
      "// Generated from the tested TASK-013R6 prop boundary. Do not hand-edit.\n" +
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
    "prop-bridge-contract.ts",
    "prop-bridge-runtime-contract.ts",
    "prop-resource-manifest.ts",
    "prop-spatial.ts",
    "prop-state.ts",
  ]
    .map((moduleName) =>
      readFileSync(path.join(sourceRoot, moduleName), "utf8"),
    )
    .join("\n");
  assert.doesNotMatch(core, /\b(?:toolbox|briefcase|red-cap)\b/iu);
  const runtime = readFileSync(
    path.join(runtimeRoot, "task013r6-one-handed-prop-integration.ts"),
    "utf8",
  );
  assert.match(
    runtime,
    /harnessDistance\(\s*runtimeWorldPoint\(binding\.slotNode[\s\S]*runtimeWorldPoint\(binding\.gripNode/u,
  );
  assert.doesNotMatch(runtime, /Canvas(?:Offset|Compensation)/u);
});

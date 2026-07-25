import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type {
  AttachmentLayout,
  RigLayout,
} from "@gameai/character-contracts";
import type {
  RigAnimation,
} from "@gameai/rig-animation";
import sharp from "sharp";

import {
  CANONICAL_LOADOUT_ADAPTER_ID,
  CANONICAL_LOADOUT_ADAPTER_VERSION,
  CANONICAL_LOADOUT_DISPLAY_IDENTITY,
  CANONICAL_LOADOUT_SCENE_PATH,
  createCanonicalLoadoutAdapter,
} from "../source/composable-loadout/canonical-loadout-adapter";
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
import {
  HARNESS_SORTING_POLICY,
} from "../source/task013r1/harness-sorting-registry";
import {
  HARNESS_SPATIAL_TOLERANCE_PX,
} from "../source/task013r1/harness-spatial";
import { buildPropBridgePlan } from "../source/task013r6/prop-bridge-contract";
import {
  PROP_INPUT_REGISTRY,
} from "../source/task013r6/prop-input-registry";
import {
  createPropResourceManifest,
} from "../source/task013r6/prop-resource-manifest";
import {
  PROP_REQUIRED_STATE_IDS,
  validatePropBridgePlan,
} from "../source/task013r6/prop-bridge-runtime-contract";
import {
  PropBridgeState,
  PROP_REQUIRED_CLIP_IDS,
} from "../source/task013r6/prop-state";

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

const garmentStates: readonly GarmentStateDefinition[] = Object.freeze([
  Object.freeze({
    stateId: GARMENT_BASE_ONLY_STATE_ID,
    hudLabel: "Base Only",
    garmentEnabled: false,
    accessoriesEnabled: false,
    slotEnabled: Object.freeze({
      headwear: false,
      "face-accessory": false,
    }),
    wearableSetEnabled: Object.freeze({ "casual-jacket": false }),
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
    wearableSetEnabled: Object.freeze({ "casual-jacket": true }),
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
    wearableSetEnabled: Object.freeze({ "casual-jacket": false }),
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
    wearableSetEnabled: Object.freeze({ "casual-jacket": true }),
  }),
]);

async function dimensions(
  root: string,
  entries: readonly Readonly<{
    readonly id: string;
    readonly file: string;
  }>[],
): Promise<Readonly<Record<string, { width: number; height: number }>>> {
  return Object.fromEntries(
    await Promise.all(
      entries.map(async (entry) => {
        const metadata = await sharp(path.join(root, entry.file)).metadata();
        return [
          entry.id,
          { width: metadata.width!, height: metadata.height! },
        ] as const;
      }),
    ),
  );
}

async function acceptedR6Plan() {
  const [rigLayout, garmentLayout, propLayout] = await Promise.all([
    readFile(path.join(propFixtureRoot, "rig-layout.json"), "utf8").then(
      (value) => JSON.parse(value) as RigLayout,
    ),
    readFile(
      path.join(garmentFixtureRoot, "attachment-layout.json"),
      "utf8",
    ).then((value) => JSON.parse(value) as AttachmentLayout),
    readFile(
      path.join(propFixtureRoot, "attachment-layout.json"),
      "utf8",
    ).then((value) => JSON.parse(value) as AttachmentLayout),
  ]);
  const clips = await Promise.all(
    [
      path.join(baseFixtureRoot, "animations/rest-idle.json"),
      path.join(baseFixtureRoot, "animations/arm-wave.json"),
      path.join(baseFixtureRoot, "animations/articulation-stress.json"),
      path.join(propFixtureRoot, "animations/prop-swing.json"),
    ].map(async (file) =>
      JSON.parse(await readFile(file, "utf8")) as RigAnimation,
    ),
  );
  const [baseDimensions, garmentDimensions, propDimensions] =
    await Promise.all([
      dimensions(
        baseFixtureRoot,
        rigLayout.parts.map((part) => ({
          id: part.partId,
          file: part.file,
        })),
      ),
      dimensions(
        garmentFixtureRoot,
        garmentLayout.attachments.map((attachment) => ({
          id: attachment.attachmentId,
          file: attachment.file,
        })),
      ),
      dimensions(
        propFixtureRoot,
        propLayout.attachments.map((attachment) => ({
          id: attachment.attachmentId,
          file: attachment.file,
        })),
      ),
    ]);
  const base = buildCocosProductionLiteCharacterPlan(
    rigLayout,
    clips,
    baseDimensions,
  );
  const garment = buildGarmentBridgePlan(
    base,
    rigLayout,
    garmentLayout,
    garmentStates,
    baseDimensions,
    garmentDimensions,
  );
  return buildPropBridgePlan(
    garment,
    rigLayout,
    propLayout,
    propDimensions,
    "production-lite-one-handed-prop",
  );
}

test("TASK-013R7 canonical facade preserves accepted R6 semantics exactly", async () => {
  const plan = await acceptedR6Plan();
  const canonical = createCanonicalLoadoutAdapter(plan);
  assert.equal(canonical.adapterId, CANONICAL_LOADOUT_ADAPTER_ID);
  assert.equal(
    canonical.adapterVersion,
    CANONICAL_LOADOUT_ADAPTER_VERSION,
  );
  assert.equal(canonical.scenePath, CANONICAL_LOADOUT_SCENE_PATH);
  assert.deepEqual(
    canonical.displayIdentity,
    CANONICAL_LOADOUT_DISPLAY_IDENTITY,
  );
  assert.equal(canonical.plan, plan);
  assert.deepEqual(canonical.validation, validatePropBridgePlan(plan));
  assert.deepEqual(canonical.resources, createPropResourceManifest(plan));
  assert.deepEqual(canonical.inputRegistry, PROP_INPUT_REGISTRY);
  assert.deepEqual(canonical.sortingPolicy, HARNESS_SORTING_POLICY);
  assert.deepEqual(canonical.semanticClipIds, PROP_REQUIRED_CLIP_IDS);
  assert.equal(
    canonical.spatialTolerancePx,
    HARNESS_SPATIAL_TOLERANCE_PX,
  );
  assert.deepEqual(
    canonical.resetDefaults,
    new PropBridgeState(
      plan.defaultGarmentStateId,
      plan.defaultPropStateId,
    ).exactReset(),
  );
});

test("TASK-013R7 canonical adapter owns a neutral production display identity", () => {
  assert.deepEqual(CANONICAL_LOADOUT_DISPLAY_IDENTITY, {
    adapterId: CANONICAL_LOADOUT_ADAPTER_ID,
    hudTitle: "GAMEAI · COMPOSABLE CHARACTER LOADOUT V2",
    diagnosticsId: "GAMEAI_COMPOSABLE_CHARACTER_LOADOUT_V2",
  });
  const serialized = JSON.stringify(CANONICAL_LOADOUT_DISPLAY_IDENTITY);
  assert.doesNotMatch(serialized, /TASK-013R6/iu);
  assert.doesNotMatch(serialized, /recovery\/task-013r/iu);
});

test("TASK-013R7 canonical and R6 state membership and resolved order are identical", async () => {
  const plan = await acceptedR6Plan();
  const canonical = createCanonicalLoadoutAdapter(plan);
  assert.equal(canonical.plan.states.length, 12);
  assert.deepEqual(
    canonical.plan.states.map((state) => ({
      stateId: state.stateId,
      garmentStateId: state.garmentStateId,
      propStateId: state.propStateId,
      garment: state.enabledGarmentAttachmentIds,
      prop: state.enabledPropAttachmentIds,
      primary: state.activePrimaryPropCount,
    })),
    plan.states.map((state) => ({
      stateId: state.stateId,
      garmentStateId: state.garmentStateId,
      propStateId: state.propStateId,
      garment: state.enabledGarmentAttachmentIds,
      prop: state.enabledPropAttachmentIds,
      primary: state.activePrimaryPropCount,
    })),
  );
  assert.deepEqual(
    [...new Set(canonical.plan.states.map((state) => state.propStateId))],
    PROP_REQUIRED_STATE_IDS,
  );
  assert.deepEqual(
    canonical.plan.garment.baseSortingOrders,
    plan.garment.baseSortingOrders,
  );
  assert.deepEqual(
    canonical.plan.garment.attachments.map((item) => [
      item.attachmentId,
      item.sortingOrder,
    ]),
    plan.garment.attachments.map((item) => [
      item.attachmentId,
      item.sortingOrder,
    ]),
  );
  assert.deepEqual(
    canonical.plan.attachments.map((item) => [
      item.attachmentId,
      item.sortingOrder,
      item.layerRole,
    ]),
    plan.attachments.map((item) => [
      item.attachmentId,
      item.sortingOrder,
      item.layerRole,
    ]),
  );
});

test("TASK-013R7 generated canonical runtime facade is byte-derived from tested source", async () => {
  const source = await readFile(
    path.join(
      extensionRoot,
      "source/composable-loadout/canonical-loadout-adapter.ts",
    ),
    "utf8",
  );
  const expected =
    "// Generated from the tested canonical loadout adapter boundary. Do not hand-edit.\n" +
    source.replace(
      /from "(\.\.?\/[^"]+)\.js";/gu,
      'from "$1";',
    );
  const generated = await readFile(
    path.join(
      projectRoot,
      "assets/gameai/composable-character-loadout-v2/canonical-loadout-adapter.ts",
    ),
    "utf8",
  );
  assert.equal(generated, expected);
});

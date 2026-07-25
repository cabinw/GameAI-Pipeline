import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../dist/production-lite-character-adapter.js";
import { buildGarmentBridgePlan } from "../dist/task013r5/garment-bridge-contract.js";
import {
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
  GARMENT_ONLY_STATE_ID,
} from "../dist/task013r5/garment-bridge-runtime-contract.js";
import { buildPropBridgePlan } from "../dist/task013r6/prop-bridge-contract.js";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task013r6");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r6",
);
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
const modules = [
  "prop-bridge-runtime-contract.ts",
  "prop-input-registry.ts",
  "prop-resource-manifest.ts",
  "prop-spatial.ts",
  "prop-state.ts",
];

await mkdir(runtimeRoot, { recursive: true });
for (const moduleName of modules) {
  const source = await readFile(path.join(sourceRoot, moduleName), "utf8");
  const creatorSource = source.replace(
    /from "(\.\.?\/[^"]+)\.js";/gu,
    'from "$1";',
  );
  await writeFile(
    path.join(runtimeRoot, moduleName),
    `// Generated from the tested TASK-013R6 prop boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const rigLayout = JSON.parse(
  await readFile(path.join(propFixtureRoot, "rig-layout.json"), "utf8"),
);
const garmentLayout = JSON.parse(
  await readFile(
    path.join(garmentFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const propLayout = JSON.parse(
  await readFile(
    path.join(propFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const clips = await Promise.all([
  ...["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(baseFixtureRoot, `animations/${name}.json`),
        "utf8",
      ),
    ),
  ),
  JSON.parse(
    await readFile(
      path.join(propFixtureRoot, "animations/prop-swing.json"),
      "utf8",
    ),
  ),
]);
const baseDimensions = Object.fromEntries(
  await Promise.all(
    rigLayout.parts.map(async (part) => {
      const metadata = await sharp(
        path.join(baseFixtureRoot, part.file),
      ).metadata();
      return [
        part.partId,
        { width: metadata.width, height: metadata.height },
      ];
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
        { width: metadata.width, height: metadata.height },
      ];
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
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const basePlan = buildCocosProductionLiteCharacterPlan(
  rigLayout,
  clips,
  baseDimensions,
);
const stateDefinitions = Object.freeze([
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
const garmentPlan = buildGarmentBridgePlan(
  basePlan,
  rigLayout,
  garmentLayout,
  stateDefinitions,
  baseDimensions,
  garmentDimensions,
);
const plan = buildPropBridgePlan(
  garmentPlan,
  rigLayout,
  propLayout,
  propDimensions,
  "production-lite-one-handed-prop",
);
await writeFile(
  path.join(runtimeRoot, "prop-bridge-plan-data.ts"),
  [
    "// Generated from tracked engine-neutral rig, animation, garment, accessory, prop, socket, and grip contracts. Do not hand-edit.",
    'import type { PropBridgePlan } from "./prop-bridge-runtime-contract";',
    "",
    `export const PROP_BRIDGE_PLAN = ${JSON.stringify(plan, null, 2)} as unknown as PropBridgePlan;`,
    "",
  ].join("\n"),
);

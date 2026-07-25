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

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task013r5");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r5",
);
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const garmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const modules = [
  "garment-bridge-runtime-contract.ts",
  "garment-input-registry.ts",
  "garment-resource-manifest.ts",
  "garment-spatial.ts",
  "garment-state.ts",
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
    `// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const rigLayout = JSON.parse(
  await readFile(path.join(baseFixtureRoot, "rig-layout.json"), "utf8"),
);
const attachmentLayout = JSON.parse(
  await readFile(
    path.join(garmentFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const clips = await Promise.all(
  ["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(baseFixtureRoot, `animations/${name}.json`),
        "utf8",
      ),
    ),
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
        { width: metadata.width, height: metadata.height },
      ];
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
const plan = buildGarmentBridgePlan(
  basePlan,
  rigLayout,
  attachmentLayout,
  stateDefinitions,
  baseDimensions,
  attachmentDimensions,
);
await writeFile(
  path.join(runtimeRoot, "garment-bridge-plan-data.ts"),
  [
    "// Generated from tracked engine-neutral rig, animation, attachment, wearable-set, and seam contracts. Do not hand-edit.",
    'import type { GarmentBridgePlan } from "./garment-bridge-runtime-contract";',
    "",
    `export const GARMENT_BRIDGE_PLAN = ${JSON.stringify(plan, null, 2)} as unknown as GarmentBridgePlan;`,
    "",
  ].join("\n"),
);

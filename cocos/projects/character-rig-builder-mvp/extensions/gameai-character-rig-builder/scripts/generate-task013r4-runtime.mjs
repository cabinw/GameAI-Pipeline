import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../dist/production-lite-character-adapter.js";
import { buildMultiAttachmentBridgePlan } from "../dist/task013r4/multi-attachment-contract.js";
import {
  MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
  MULTI_ATTACHMENT_COMBINED_STATE_ID,
  MULTI_ATTACHMENT_GROUP_A_STATE_ID,
  MULTI_ATTACHMENT_GROUP_B_STATE_ID,
} from "../dist/task013r4/multi-attachment-runtime-contract.js";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task013r4");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r4",
);
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const attachmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const modules = [
  "multi-attachment-input-registry.ts",
  "multi-attachment-resource-manifest.ts",
  "multi-attachment-runtime-contract.ts",
  "multi-attachment-spatial.ts",
  "multi-attachment-state.ts",
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
    `// Generated from the tested TASK-013R4 multi-attachment boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const rigLayout = JSON.parse(
  await readFile(path.join(baseFixtureRoot, "rig-layout.json"), "utf8"),
);
const attachmentLayout = JSON.parse(
  await readFile(
    path.join(attachmentFixtureRoot, "attachment-layout.json"),
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
        path.join(attachmentFixtureRoot, attachment.file),
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
const plan = buildMultiAttachmentBridgePlan(
  basePlan,
  rigLayout,
  attachmentLayout,
  stateDefinitions,
  attachmentDimensions,
);
await writeFile(
  path.join(runtimeRoot, "multi-attachment-plan-data.ts"),
  [
    "// Generated from tracked engine-neutral rig, animation, and attachment contracts. Do not hand-edit.",
    'import type { MultiAttachmentBridgePlan } from "./multi-attachment-runtime-contract";',
    "",
    `export const MULTI_ATTACHMENT_BRIDGE_PLAN = ${JSON.stringify(plan, null, 2)} as unknown as MultiAttachmentBridgePlan;`,
    "",
  ].join("\n"),
);

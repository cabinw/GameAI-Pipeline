import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosHeadAccessoryLayeringPlan } from "../dist/head-accessory-layering-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const baseFixtureRoot = path.join(repositoryRoot, "examples/production-lite-character");
const accessoryFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/head-accessory-layering",
);
const readJson = async (root, file) =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));
const rigLayout = await readJson(baseFixtureRoot, "rig-layout.json");
const attachmentLayout = await readJson(accessoryFixtureRoot, "attachment-layout.json");
const clips = await Promise.all([
  ...["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map((name) =>
    readJson(baseFixtureRoot, `animations/${name}.json`),
  ),
  readJson(accessoryFixtureRoot, "animations/head-accessory-stress.json"),
]);
const baseAssetDimensions = Object.fromEntries(
  await Promise.all(
    rigLayout.parts.map(async (part) => {
      const metadata = await sharp(path.join(baseFixtureRoot, part.file)).metadata();
      return [part.partId, { width: metadata.width, height: metadata.height }];
    }),
  ),
);
const attachmentAssetDimensions = Object.fromEntries(
  await Promise.all(
    attachmentLayout.attachments.map(async (attachment) => {
      const metadata = await sharp(
        path.join(accessoryFixtureRoot, attachment.file),
      ).metadata();
      return [
        attachment.attachmentId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const plan = buildCocosHeadAccessoryLayeringPlan(
  rigLayout,
  attachmentLayout,
  clips,
  baseAssetDimensions,
  attachmentAssetDimensions,
);
const source = `// Generated from the TASK-009 fixture plus the TASK-010 attachment contract. Do not hand-edit.
export const HEAD_ACCESSORY_LAYERING_PLAN = ${JSON.stringify(plan, null, 2)} as const;
`;
await mkdir(runtimeRoot, { recursive: true });
await writeFile(path.join(runtimeRoot, "head-accessory-layering-data.ts"), source);

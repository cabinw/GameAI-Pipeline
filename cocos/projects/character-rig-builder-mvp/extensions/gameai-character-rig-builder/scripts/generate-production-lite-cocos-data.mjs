import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../dist/production-lite-character-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const fixtureRoot = path.join(repositoryRoot, "examples/production-lite-character");
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/production-lite-character",
);
const readJson = async (file) =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
const layout = await readJson("rig-layout.json");
const clips = await Promise.all(
  ["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map((name) =>
    readJson(`animations/${name}.json`),
  ),
);
const assetDimensions = Object.fromEntries(
  await Promise.all(
    layout.parts.map(async (part) => {
      const metadata = await sharp(path.join(fixtureRoot, part.file)).metadata();
      return [
        part.partId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const plan = buildCocosProductionLiteCharacterPlan(
  layout,
  clips,
  assetDimensions,
);
const source = `// Generated from examples/production-lite-character by TASK-009. Do not hand-edit.
export const PRODUCTION_LITE_CHARACTER_PLAN = ${JSON.stringify(plan, null, 2)} as const;
`;
await mkdir(runtimeRoot, { recursive: true });
await writeFile(path.join(runtimeRoot, "production-lite-character-data.ts"), source);

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCocosSimpleSpriteCharacterPlan } from "../dist/simple-sprite-character-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const fixtureRoot = path.join(repositoryRoot, "examples/simple-sprite-character");
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/simple-sprite-character",
);
const readJson = async (file) =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
const layout = await readJson("rig-layout.json");
const clips = await Promise.all(
  ["rest-idle", "arm-wave", "walk-cycle"].map((name) =>
    readJson(`animations/${name}.json`),
  ),
);
const plan = buildCocosSimpleSpriteCharacterPlan(layout, clips);
const source = `// Generated from examples/simple-sprite-character by TASK-008. Do not hand-edit.
export const SIMPLE_SPRITE_CHARACTER_PLAN = ${JSON.stringify(plan, null, 2)} as const;
`;
await mkdir(runtimeRoot, { recursive: true });
await writeFile(path.join(runtimeRoot, "simple-sprite-character-data.ts"), source);

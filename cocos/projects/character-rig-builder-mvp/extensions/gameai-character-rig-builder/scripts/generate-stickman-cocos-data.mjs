import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCocosStickmanReferencePlan } from "../dist/stickman-reference-adapter.js";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const fixtureRoot = path.join(repositoryRoot, "examples/stickman-reference");
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/stickman-reference",
);
const readJson = async (file) =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
const layout = await readJson("rig-layout.json");
const visuals = await readJson("visuals.json");
const clips = await Promise.all(
  ["rest-idle", "arm-wave", "walk-cycle"].map((name) =>
    readJson(`animations/${name}.json`),
  ),
);
const plan = buildCocosStickmanReferencePlan(layout, visuals, clips);
const source = `// Generated from examples/stickman-reference by TASK-007. Do not hand-edit.
export const STICKMAN_REFERENCE_PLAN = ${JSON.stringify(plan, null, 2)} as const;
`;
await mkdir(runtimeRoot, { recursive: true });
await writeFile(path.join(runtimeRoot, "stickman-reference-data.ts"), source);

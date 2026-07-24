import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { reconstructProductionLiteRest } from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const roots = [
  path.join(repositoryRoot, "examples/production-lite-character"),
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-character",
  ),
];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

for (const root of roots) {
  const layout = JSON.parse(await readFile(path.join(root, "rig-layout.json"), "utf8"));
  const reference = await readFile(
    path.join(root, "reference/reference-composite.png"),
  );
  const result = await reconstructProductionLiteRest(root, layout, reference);
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(
    path.join(root, "reference/reconstructed-rest.png"),
    result.reconstructed,
  );
  await writeFile(
    path.join(root, "reference/reconstruction-diff.png"),
    result.comparison,
  );
  await writeFile(
    path.join(root, "reference/reconstruction-report.json"),
    json(result.metrics),
  );
  if (result.metrics.status !== "passed") {
    throw new Error(json(result.metrics));
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAttachmentLayout } from "@gameai/character-contracts";
import { reconstructAttachmentVariant } from "../dist/index.js";
import { atomicWriteFile } from "../../../cocos/projects/character-rig-builder-mvp/extensions/gameai-character-rig-builder/scripts/atomic-write.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`MISSING_OPTION_VALUE:${name}`);
  }
  return path.resolve(value);
};
const inputExamplesRoot = option(
  "--input-examples-root",
  path.join(repositoryRoot, "examples"),
);
const baseRoot = option(
  "--base-asset-root",
  path.join(inputExamplesRoot, "production-lite-character"),
);
const fixtureRoot = option(
  "--fixture-output-root",
  path.join(inputExamplesRoot, "production-lite-one-handed-prop"),
);
const cocosRoot = option(
  "--cocos-output-root",
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-one-handed-prop",
  ),
);
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const rigLayout = await json(path.join(fixtureRoot, "rig-layout.json"));
const attachmentLayout = await json(path.join(fixtureRoot, "attachment-layout.json"));
const parsed = parseAttachmentLayout(JSON.stringify(attachmentLayout), rigLayout);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));

const variants = {
  "no-prop": { "left-hand-prop": false, "right-hand-prop": false },
  "left-hand": { "left-hand-prop": true, "right-hand-prop": false },
  "right-hand": { "left-hand-prop": false, "right-hand-prop": true },
};
for (const [variantId, propStateOverrides] of Object.entries(variants)) {
  const reference = await readFile(
    path.join(fixtureRoot, `reference/${variantId}.png`),
  );
  const result = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    rigLayout,
    parsed.value,
    {},
    reference,
    undefined,
    {},
    propStateOverrides,
  );
  if (result.metrics.status !== "passed") {
    throw new Error(`${variantId}:${JSON.stringify(result.metrics)}`);
  }
  const report = `${JSON.stringify(result.metrics, null, 2)}\n`;
  for (const root of [fixtureRoot, cocosRoot]) {
    await atomicWriteFile(
      path.join(root, `reference/${variantId}-reconstructed.png`),
      result.reconstructed,
    );
    await atomicWriteFile(
      path.join(root, `reference/${variantId}-diff.png`),
      result.comparison,
    );
    await atomicWriteFile(
      path.join(root, `reference/${variantId}-report.json`),
      report,
    );
  }
}
console.log("TASK-012 prop reconstruction: 3 variants exact");

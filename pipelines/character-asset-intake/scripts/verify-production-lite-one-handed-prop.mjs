import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAttachmentLayout } from "@gameai/character-contracts";
import { reconstructAttachmentVariant } from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-one-handed-prop",
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
    await writeFile(
      path.join(root, `reference/${variantId}-reconstructed.png`),
      result.reconstructed,
    );
    await writeFile(
      path.join(root, `reference/${variantId}-diff.png`),
      result.comparison,
    );
    await writeFile(
      path.join(root, `reference/${variantId}-report.json`),
      report,
    );
  }
}
console.log("TASK-012 prop reconstruction: 3 variants exact");

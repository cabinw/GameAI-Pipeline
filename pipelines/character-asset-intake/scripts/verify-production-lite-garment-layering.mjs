import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseAttachmentLayout,
  parseRigLayout,
} from "@gameai/character-contracts";

import { reconstructAttachmentVariant } from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-garment-layering",
);
const source = JSON.parse(
  await readFile(path.join(fixtureRoot, "source/garment-source.json"), "utf8"),
);
const rigText = await readFile(path.join(baseRoot, "rig-layout.json"), "utf8");
const attachmentText = await readFile(
  path.join(fixtureRoot, "attachment-layout.json"),
  "utf8",
);
const parsedRig = parseRigLayout(rigText);
if (!parsedRig.ok) throw new Error(JSON.stringify(parsedRig.errors));
const parsedAttachments = parseAttachmentLayout(attachmentText, parsedRig.value);
if (!parsedAttachments.ok) {
  throw new Error(JSON.stringify(parsedAttachments.errors));
}

for (const variant of source.variants) {
  const reference = await readFile(
    path.join(fixtureRoot, `reference/${variant.variantId}.png`),
  );
  const result = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    parsedRig.value,
    parsedAttachments.value,
    variant.slotOverrides,
    reference,
    undefined,
    variant.wearableSetOverrides,
  );
  if (result.metrics.status !== "passed") {
    throw new Error(`${variant.variantId}:${JSON.stringify(result.metrics)}`);
  }
  const report = `${JSON.stringify(result.metrics, null, 2)}\n`;
  for (const root of [fixtureRoot, cocosRoot]) {
    await writeFile(
      path.join(root, `reference/${variant.variantId}-reconstructed.png`),
      result.reconstructed,
    );
    await writeFile(
      path.join(root, `reference/${variant.variantId}-diff.png`),
      result.comparison,
    );
    await writeFile(
      path.join(root, `reference/${variant.variantId}-report.json`),
      report,
    );
  }
}

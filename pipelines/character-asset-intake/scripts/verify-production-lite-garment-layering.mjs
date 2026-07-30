import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseAttachmentLayout,
  parseRigLayout,
} from "@gameai/character-contracts";

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
const sourceFixtureRoot = path.join(
  inputExamplesRoot,
  "production-lite-garment-layering",
);
const fixtureRoot = option(
  "--fixture-output-root",
  sourceFixtureRoot,
);
const baseRoot = option(
  "--base-asset-root",
  path.join(inputExamplesRoot, "production-lite-character"),
);
const cocosRoot = option(
  "--cocos-output-root",
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-garment-layering",
  ),
);
const source = JSON.parse(
  await readFile(
    path.join(sourceFixtureRoot, "source/garment-source.json"),
    "utf8",
  ),
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
    await atomicWriteFile(
      path.join(root, `reference/${variant.variantId}-reconstructed.png`),
      result.reconstructed,
    );
    await atomicWriteFile(
      path.join(root, `reference/${variant.variantId}-diff.png`),
      result.comparison,
    );
    await atomicWriteFile(
      path.join(root, `reference/${variant.variantId}-report.json`),
      report,
    );
  }
}

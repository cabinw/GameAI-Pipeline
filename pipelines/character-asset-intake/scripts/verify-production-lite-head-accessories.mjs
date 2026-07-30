import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  "production-lite-head-accessories",
);
const baseRoot = option(
  "--base-asset-root",
  path.join(inputExamplesRoot, "production-lite-character"),
);
const fixtureRoot = option(
  "--fixture-output-root",
  sourceFixtureRoot,
);
const cocosRoot = option(
  "--cocos-output-root",
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-head-accessories",
  ),
);
const roots = [
  fixtureRoot,
  cocosRoot,
];
const rigLayout = JSON.parse(
  await readFile(path.join(baseRoot, "rig-layout.json"), "utf8"),
);
const source = JSON.parse(
  await readFile(
    path.join(sourceFixtureRoot, "source/accessory-source.json"),
    "utf8",
  ),
);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

for (const root of roots) {
  const attachmentLayout = JSON.parse(
    await readFile(path.join(root, "attachment-layout.json"), "utf8"),
  );
  for (const variant of source.variants) {
    const reference = await readFile(
      path.join(root, `reference/${variant.variantId}.png`),
    );
    const result = await reconstructAttachmentVariant(
      baseRoot,
      root,
      rigLayout,
      attachmentLayout,
      variant.slotOverrides,
      reference,
    );
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
      json(result.metrics),
    );
    if (result.metrics.status !== "passed") {
      throw new Error(`${variant.variantId}\n${json(result.metrics)}`);
    }
  }
}

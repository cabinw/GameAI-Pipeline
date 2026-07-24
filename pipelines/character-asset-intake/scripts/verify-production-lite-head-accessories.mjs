import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { reconstructAttachmentVariant } from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const roots = [
  path.join(repositoryRoot, "examples/production-lite-head-accessories"),
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-head-accessories",
  ),
];
const rigLayout = JSON.parse(
  await readFile(path.join(baseRoot, "rig-layout.json"), "utf8"),
);
const source = JSON.parse(
  await readFile(
    path.join(roots[0], "source/accessory-source.json"),
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
      json(result.metrics),
    );
    if (result.metrics.status !== "passed") {
      throw new Error(`${variant.variantId}\n${json(result.metrics)}`);
    }
  }
}

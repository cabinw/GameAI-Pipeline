import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target-remade");
const layout = JSON.parse(
  await readFile(resolve(fixtureRoot, "rig-layout.json"), "utf8"),
);

if (layout.visualPlacementMode !== "source-canvas-rect") {
  throw new Error(
    "Red Cap Remade reconstruction requires visualPlacementMode source-canvas-rect.",
  );
}

const ordered = [...layout.parts].sort(
  (left, right) =>
    left.drawOrder - right.drawOrder ||
    left.partId.localeCompare(right.partId),
);
const compositeInputs = [];
for (const part of ordered) {
  if (part.trimOffset.x !== 0 || part.trimOffset.y !== 0) {
    throw new Error(
      `${part.partId} applies a nonzero trimOffset in exact reconstruction mode.`,
    );
  }
  const rect = part.originalRect;
  const resized = await sharp(resolve(fixtureRoot, part.file), {
    failOn: "error",
  })
    .resize(rect.width, rect.height, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  compositeInputs.push({ input: resized, left: rect.x, top: rect.y });
}

const reconstructed = await sharp({
  create: {
    width: layout.sourceCanvas.width,
    height: layout.sourceCanvas.height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(compositeInputs)
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toBuffer();

const referencePath = resolve(fixtureRoot, "reference/full_character.png");
const reconstructedPath = resolve(
  fixtureRoot,
  "reference/reconstructed-neutral.png",
);
const comparisonPath = resolve(
  fixtureRoot,
  "reference/reference-comparison.png",
);
const metricsPath = resolve(
  fixtureRoot,
  "reference/reconstruction-metrics.json",
);
await writeFile(reconstructedPath, reconstructed);

const reference = await sharp(referencePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const actual = await sharp(reconstructed)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (
  reference.info.width !== actual.info.width ||
  reference.info.height !== actual.info.height
) {
  throw new Error("Reference and reconstruction canvas dimensions differ.");
}
let intersection = 0;
let union = 0;
for (let index = 3; index < reference.data.length; index += 4) {
  const expectedVisible = (reference.data[index] ?? 0) > 0;
  const actualVisible = (actual.data[index] ?? 0) > 0;
  if (expectedVisible && actualVisible) intersection += 1;
  if (expectedVisible || actualVisible) union += 1;
}
const alphaSilhouetteIoU = intersection / union;
await writeFile(
  metricsPath,
  `${JSON.stringify(
    {
      sourceCanvas: layout.sourceCanvas,
      reference: "full_character.png",
      reconstruction: "reconstructed-neutral.png",
      alphaSilhouetteIoU: Math.round(alphaSilhouetteIoU * 1_000_000) / 1_000_000,
    },
    null,
    2,
  )}\n`,
);

await sharp({
  create: {
    width: layout.sourceCanvas.width * 2,
    height: layout.sourceCanvas.height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: await readFile(referencePath), left: 0, top: 0 },
    { input: reconstructed, left: layout.sourceCanvas.width, top: 0 },
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(comparisonPath);

if (alphaSilhouetteIoU < 0.8) {
  throw new Error(
    `Reconstructed alpha silhouette IoU ${alphaSilhouetteIoU} is below 0.8.`,
  );
}

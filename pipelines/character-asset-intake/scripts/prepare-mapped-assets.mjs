import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

const mappingArgument = process.argv[2];
if (mappingArgument === undefined) {
  throw new Error(
    "Usage: node scripts/prepare-mapped-assets.mjs <source-asset-map.json>",
  );
}

const mappingPath = resolve(process.cwd(), mappingArgument);
const fixtureRoot = dirname(mappingPath);
const mapping = JSON.parse(await readFile(mappingPath, "utf8"));

if (mapping.mappingVersion !== "1.0.0" || !Array.isArray(mapping.parts)) {
  throw new Error("Unsupported or invalid source asset map.");
}

for (const entry of mapping.parts) {
  const sourcePath = resolve(fixtureRoot, entry.sourceFile);
  const outputPath = resolve(fixtureRoot, entry.importFile);
  const metadata = await sharp(sourcePath, { failOn: "error" }).metadata();
  const crop = entry.cropRect;
  if (
    metadata.format !== "png" ||
    metadata.width === undefined ||
    metadata.height === undefined ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > metadata.width ||
    crop.y + crop.height > metadata.height
  ) {
    throw new Error(`Invalid explicit crop for ${entry.sourceFile}.`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  if (
    crop.x === 0 &&
    crop.y === 0 &&
    crop.width === metadata.width &&
    crop.height === metadata.height
  ) {
    await copyFile(sourcePath, outputPath);
  } else {
    await sharp(sourcePath, { failOn: "error" })
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toFile(outputPath);
  }
}

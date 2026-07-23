import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (sourceArgument === undefined || destinationArgument === undefined) {
  throw new Error(
    "Usage: node scripts/sync-cocos-fixture.mjs <source-root> <destination-root>",
  );
}

const sourceRoot = resolve(process.cwd(), sourceArgument);
const destinationRoot = resolve(process.cwd(), destinationArgument);
const mapping = JSON.parse(
  await readFile(resolve(sourceRoot, "source-asset-map.json"), "utf8"),
);
if (mapping.mappingVersion !== "1.0.0" || !Array.isArray(mapping.parts)) {
  throw new Error("Unsupported or invalid source asset map.");
}

const files = [
  "README.md",
  "assembled-preview.svg",
  "character-rig.json",
  "rig-layout.json",
  "source-annotation.json",
  "source-asset-map.json",
  "animations/idle-subtle.json",
  "reference/reconstructed-neutral.png",
  "reference/reconstruction-metrics.json",
  "reference/reference-comparison.png",
  ...mapping.parts.map((part) => part.importFile),
];
for (const relativePath of files) {
  const destination = resolve(destinationRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(sourceRoot, relativePath), destination);
}

console.log(
  JSON.stringify(
    {
      sourceRoot,
      destinationRoot,
      copiedFileCount: files.length,
    },
    null,
    2,
  ),
);

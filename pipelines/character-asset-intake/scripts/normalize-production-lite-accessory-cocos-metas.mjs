import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const root = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-head-accessories",
);
const source = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-head-accessories/source/accessory-source.json",
    ),
    "utf8",
  ),
);
const baseSource = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-character/source/character-source.json",
    ),
    "utf8",
  ),
);
const images = [
  ...source.attachments.map((attachment) => ({
    file: attachment.file,
    width: attachment.size.width,
    height: attachment.size.height,
  })),
  ...source.variants.flatMap((variant) =>
    [
      `${variant.variantId}.png`,
      `${variant.variantId}-reconstructed.png`,
      `${variant.variantId}-diff.png`,
    ].map((file) => ({
      file: `reference/${file}`,
      width: baseSource.sourceCanvas.width,
      height: baseSource.sourceCanvas.height,
    })),
  ),
];

for (const image of images) {
  const metaPath = path.join(root, `${image.file}.meta`);
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  const sprite = meta.subMetas.f9941.userData;
  sprite.offsetX = 0;
  sprite.offsetY = 0;
  sprite.trimX = 0;
  sprite.trimY = 0;
  sprite.width = image.width;
  sprite.height = image.height;
  sprite.rawWidth = image.width;
  sprite.rawHeight = image.height;
  sprite.vertices = {
    rawPosition: [
      -image.width / 2,
      -image.height / 2,
      0,
      image.width / 2,
      -image.height / 2,
      0,
      -image.width / 2,
      image.height / 2,
      0,
      image.width / 2,
      image.height / 2,
      0,
    ],
    indexes: [0, 1, 2, 2, 1, 3],
    uv: [0, image.height, image.width, image.height, 0, 0, image.width, 0],
    nuv: [0, 0, 1, 0, 0, 1, 1, 1],
    minPos: [-image.width / 2, -image.height / 2, 0],
    maxPos: [image.width / 2, image.height / 2, 0],
  };
  sprite.trimType = "none";
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}

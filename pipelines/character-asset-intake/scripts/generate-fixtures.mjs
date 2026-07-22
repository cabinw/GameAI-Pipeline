import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const exampleRoot = path.join(repositoryRoot, "examples/red-cap-target");
const layout = JSON.parse(await readFile(path.join(exampleRoot, "rig-layout.json"), "utf8"));

for (const [index, part] of layout.parts.entries()) {
  const width = part.originalRect.width - part.trimOffset.x;
  const height = part.originalRect.height - part.trimOffset.y;
  const outputPath = path.join(exampleRoot, part.file);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: {
        r: (index * 47 + 31) % 256,
        g: (index * 83 + 67) % 256,
        b: (index * 29 + 101) % 256,
        alpha: 0,
      },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: Math.max(1, width - 2),
            height: Math.max(1, height - 2),
            channels: 4,
            background: {
              r: (index * 47 + 31) % 256,
              g: (index * 83 + 67) % 256,
              b: (index * 29 + 101) % 256,
              alpha: 1,
            },
          },
        },
        left: width > 2 ? 1 : 0,
        top: height > 2 ? 1 : 0,
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(outputPath);
}

const imageFixtureRoot = path.join(packageRoot, "test/fixtures/images");
await mkdir(imageFixtureRoot, { recursive: true });

await sharp({
  create: { width: 10, height: 8, channels: 4, background: { r: 30, g: 120, b: 220, alpha: 0 } },
})
  .composite([
    {
      input: {
        create: { width: 6, height: 4, channels: 4, background: { r: 30, g: 120, b: 220, alpha: 1 } },
      },
      left: 2,
      top: 2,
    },
  ])
  .webp({ lossless: true })
  .toFile(path.join(imageFixtureRoot, "valid-alpha.webp"));

await sharp({
  create: { width: 181, height: 150, channels: 4, background: { r: 200, g: 40, b: 80, alpha: 1 } },
})
  .png()
  .toFile(path.join(imageFixtureRoot, "dimension-mismatch.png"));

await sharp({
  create: { width: 168, height: 142, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .png()
  .toFile(path.join(imageFixtureRoot, "fully-transparent.png"));

await sharp({
  create: { width: 168, height: 142, channels: 3, background: { r: 180, g: 90, b: 30 } },
})
  .jpeg({ quality: 90 })
  .toFile(path.join(imageFixtureRoot, "no-alpha.jpg"));

await sharp({
  create: { width: 168, height: 142, channels: 4, background: { r: 80, g: 180, b: 40, alpha: 1 } },
})
  .gif()
  .toFile(path.join(imageFixtureRoot, "unsupported.png"));

await writeFile(
  path.join(imageFixtureRoot, "decode-error.png"),
  Buffer.from("not-a-decodable-image\n", "utf8"),
);

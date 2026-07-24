import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

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
const outputRoots = [fixtureRoot, cocosRoot];
const sourceText = await readFile(
  path.join(fixtureRoot, "source/garment-source.json"),
  "utf8",
);
const source = JSON.parse(sourceText);
const baseSource = JSON.parse(
  await readFile(path.join(baseRoot, "source/character-source.json"), "utf8"),
);
const baseLayoutText = await readFile(
  path.join(baseRoot, "rig-layout.json"),
  "utf8",
);
const baseLayout = JSON.parse(baseLayoutText);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function paletteSvg(markup) {
  return Object.entries(source.palette).reduce(
    (result, [name, color]) => result.replaceAll(`{${name}}`, color),
    markup,
  );
}

const attachmentLayout = {
  schemaVersion: source.schemaVersion,
  attachmentLayoutId: source.attachmentLayoutId,
  rig: source.rig,
  wearableSets: source.wearableSets,
  slots: source.slots,
  attachments: source.attachments.map(
    ({
      sourceTopLeft: _sourceTopLeft,
      size: _size,
      svg: _svg,
      ...attachment
    }) => attachment,
  ),
  seams: source.seams,
};

const attachmentPngs = new Map();
for (const attachment of source.attachments) {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${attachment.size.width}" height="${attachment.size.height}" viewBox="0 0 ${attachment.size.width} ${attachment.size.height}">${paletteSvg(attachment.svg)}</svg>`,
  );
  attachmentPngs.set(
    attachment.attachmentId,
    await sharp(svg)
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer(),
  );
}

const basePngs = new Map();
for (const part of baseSource.parts) {
  basePngs.set(
    part.partId,
    await readFile(path.join(baseRoot, `parts/${part.partId}.png`)),
  );
}
const layerItems = [
  ...baseSource.parts.map((part) => ({
    itemId: part.partId,
    slotId: null,
    wearableSetId: null,
    drawOrder: part.drawOrder,
    x: part.originalRect.x + part.trimOffset.x,
    y: part.originalRect.y + part.trimOffset.y,
    width: part.trimSize.width,
    height: part.trimSize.height,
    png: basePngs.get(part.partId),
  })),
  ...source.attachments.map((attachment) => ({
    itemId: attachment.attachmentId,
    slotId: attachment.slotId,
    wearableSetId: attachment.wearableSetId ?? null,
    drawOrder: attachment.drawOrder,
    x: attachment.sourceTopLeft.x,
    y: attachment.sourceTopLeft.y,
    width: attachment.size.width,
    height: attachment.size.height,
    png: attachmentPngs.get(attachment.attachmentId),
  })),
];

const references = new Map();
for (const variant of source.variants) {
  const elements = layerItems
    .filter(
      (item) =>
        item.slotId === null ||
        (variant.slotOverrides[item.slotId] !== false &&
          (item.wearableSetId === null ||
            variant.wearableSetOverrides[item.wearableSetId] !== false)),
    )
    .sort(
      (left, right) =>
        left.drawOrder - right.drawOrder ||
        left.itemId.localeCompare(right.itemId),
    )
    .map(
      (item) =>
        `<image width="${item.width}" height="${item.height}" href="data:image/png;base64,${item.png.toString("base64")}" transform="translate(${item.x} ${item.y})"/>`,
    )
    .join("");
  const authoredSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${baseLayout.sourceCanvas.width}" height="${baseLayout.sourceCanvas.height}" viewBox="0 0 ${baseLayout.sourceCanvas.width} ${baseLayout.sourceCanvas.height}"><g style="image-rendering:pixelated">${elements}</g></svg>`,
  );
  references.set(
    variant.variantId,
    await sharp(authoredSvg)
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer(),
  );
}

const duration = 2.8;
const keyframes = (values) =>
  values.map(([time, value]) => ({
    time,
    value,
    interpolation: "linear",
    easing: "ease-in-out-sine",
  }));
const garmentStress = {
  schemaVersion: "1.0.0",
  animationId: "production-lite-garment-stress",
  rig: { rigId: baseLayout.layoutId, schemaVersion: baseLayout.schemaVersion },
  duration,
  loop: true,
  tracks: [
    {
      jointId: "torso",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, -6], [1.4, 7], [2.1, -5], [2.8, 0],
      ]),
    },
    {
      jointId: "head",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, 9], [1.4, -8], [2.1, 6], [2.8, 0],
      ]),
    },
    {
      jointId: "upper-arm-right",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, -58], [1.4, 34], [2.1, -38], [2.8, 0],
      ]),
    },
    {
      jointId: "lower-arm-right",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, 82], [1.4, 38], [2.1, 72], [2.8, 0],
      ]),
    },
    {
      jointId: "upper-arm-left",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, 68], [1.4, -42], [2.1, 52], [2.8, 0],
      ]),
    },
    {
      jointId: "lower-arm-left",
      property: "rotation",
      keyframes: keyframes([
        [0, 0], [0.7, -76], [1.4, -92], [2.1, -48], [2.8, 0],
      ]),
    },
  ],
};

const provenance = {
  schemaVersion: "1.0.0",
  sourceDigest: createHash("sha256").update(sourceText).digest("hex"),
  baseLayoutDigest: createHash("sha256").update(baseLayoutText).digest("hex"),
  attachmentLayoutDigest: createHash("sha256")
    .update(json(attachmentLayout))
    .digest("hex"),
  variants: Object.fromEntries(
    [...references].map(([variantId, png]) => [
      variantId,
      createHash("sha256").update(png).digest("hex"),
    ]),
  ),
  renderer: "sharp-svg-authored-and-contract-reconstruction",
  tolerance: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    boundsExpansionPixels: 0,
    seamMismatchPixels: 0,
  },
  supportedGarmentRangesDegrees: {
    torso: [-7, 7],
    head: [-9, 9],
    "upper-arm-right": [-58, 34],
    "lower-arm-right": [0, 82],
    "upper-arm-left": [-42, 68],
    "lower-arm-left": [-92, 0],
  },
};

for (const root of outputRoots) {
  await mkdir(path.join(root, "attachments"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(path.join(root, "attachment-layout.json"), json(attachmentLayout));
  await writeFile(
    path.join(root, "animations/garment-stress.json"),
    json(garmentStress),
  );
  await writeFile(
    path.join(root, "reference/authoring-provenance.json"),
    json(provenance),
  );
  for (const [attachmentId, png] of attachmentPngs) {
    await writeFile(path.join(root, `attachments/${attachmentId}.png`), png);
  }
  for (const [variantId, png] of references) {
    await writeFile(path.join(root, `reference/${variantId}.png`), png);
  }
}

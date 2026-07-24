import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-head-accessories",
);
const outputRoots = [fixtureRoot, cocosRoot];
const sourceText = await readFile(
  path.join(fixtureRoot, "source/accessory-source.json"),
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
  slots: source.slots,
  attachments: source.attachments.map(
    ({ sourceTopLeft: _sourceTopLeft, size: _size, svg: _svg, ...attachment }) =>
      attachment,
  ),
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
        item.slotId === null || variant.slotOverrides[item.slotId] === true,
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

const duration = 2.4;
const keyframes = (values) =>
  values.map(([time, value]) => ({
    time,
    value,
    interpolation: "linear",
    easing: "ease-in-out-sine",
  }));
const accessoryStress = {
  schemaVersion: "1.0.0",
  animationId: "production-lite-head-accessory-stress",
  rig: { rigId: baseLayout.layoutId, schemaVersion: baseLayout.schemaVersion },
  duration,
  loop: true,
  tracks: [
    {
      jointId: "torso",
      property: "rotation",
      keyframes: keyframes([
        [0, 0],
        [0.6, -5],
        [1.2, 5],
        [1.8, -5],
        [2.4, 0],
      ]),
    },
    {
      jointId: "head",
      property: "rotation",
      keyframes: keyframes([
        [0, 0],
        [0.6, 14],
        [1.2, -14],
        [1.8, 10],
        [2.4, 0],
      ]),
    },
    {
      jointId: "head",
      property: "position",
      keyframes: keyframes([
        [0, { x: 0, y: 0 }],
        [0.6, { x: 2, y: 1 }],
        [1.2, { x: -2, y: 1 }],
        [1.8, { x: 1, y: 0 }],
        [2.4, { x: 0, y: 0 }],
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
  renderer: "sharp-svg-independent-authored-and-contract-reconstruction-paths",
  tolerance: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    boundsExpansionPixels: 0,
    seamMismatchPixels: 0,
  },
};

for (const root of outputRoots) {
  await mkdir(path.join(root, "attachments"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(path.join(root, "attachment-layout.json"), json(attachmentLayout));
  await writeFile(
    path.join(root, "animations/head-accessory-stress.json"),
    json(accessoryStress),
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

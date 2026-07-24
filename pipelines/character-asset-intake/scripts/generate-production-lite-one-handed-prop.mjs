import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-one-handed-prop",
);
const outputRoots = [fixtureRoot, cocosRoot];
const sourceText = await readFile(
  path.join(fixtureRoot, "source/prop-source.json"),
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

const rigLayout = {
  ...baseLayout,
  sockets: source.sockets,
};
const attachmentLayout = {
  schemaVersion: source.schemaVersion,
  attachmentLayoutId: source.attachmentLayoutId,
  rig: source.rig,
  propStates: source.propStates,
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
    stateId: null,
    drawOrder: part.drawOrder,
    x: part.originalRect.x + part.trimOffset.x,
    y: part.originalRect.y + part.trimOffset.y,
    width: part.trimSize.width,
    height: part.trimSize.height,
    png: basePngs.get(part.partId),
  })),
  ...source.attachments.map((attachment) => ({
    itemId: attachment.attachmentId,
    stateId: attachment.propStateId ?? null,
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
        item.stateId === null ||
        variant.propStateOverrides[item.stateId] === true,
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
  references.set(
    variant.variantId,
    await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${baseLayout.sourceCanvas.width}" height="${baseLayout.sourceCanvas.height}" viewBox="0 0 ${baseLayout.sourceCanvas.width} ${baseLayout.sourceCanvas.height}"><g style="image-rendering:pixelated">${elements}</g></svg>`,
      ),
    )
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer(),
  );
}

const keyframes = (values) =>
  values.map(([time, value]) => ({
    time,
    value,
    interpolation: "linear",
    easing: "ease-in-out-sine",
  }));
const clip = (animationId, duration, tracks) => ({
  schemaVersion: "1.0.0",
  animationId,
  rig: { rigId: baseLayout.layoutId, schemaVersion: baseLayout.schemaVersion },
  duration,
  loop: true,
  tracks,
});
const propRest = clip("production-lite-prop-rest", 2, [
  {
    jointId: "pelvis",
    property: "position",
    keyframes: keyframes([[0, { x: 0, y: 0 }], [1, { x: 0, y: 2 }], [2, { x: 0, y: 0 }]]),
  },
]);
const propWalk = {
  ...JSON.parse(
    await readFile(path.join(baseRoot, "animations/walk-cycle.json"), "utf8"),
  ),
  animationId: "production-lite-prop-walk",
};
const propSwing = clip("production-lite-prop-swing", 2.4, [
  {
    jointId: "upper-arm-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.6, -32], [1.2, 28], [1.8, -20], [2.4, 0]]),
  },
  {
    jointId: "lower-arm-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.6, 24], [1.2, -36], [1.8, 18], [2.4, 0]]),
  },
  {
    jointId: "hand-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.6, 18], [1.2, -22], [1.8, 14], [2.4, 0]]),
  },
]);
const propStress = clip("production-lite-prop-stress", 3.2, [
  {
    jointId: "torso",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.8, -8], [1.6, 10], [2.4, -6], [3.2, 0]]),
  },
  {
    jointId: "upper-arm-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.8, 78], [1.6, -54], [2.4, 62], [3.2, 0]]),
  },
  {
    jointId: "lower-arm-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.8, -104], [1.6, 72], [2.4, -88], [3.2, 0]]),
  },
  {
    jointId: "hand-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.8, 58], [1.6, -66], [2.4, 72], [3.2, 0]]),
  },
  {
    jointId: "thigh-left",
    property: "rotation",
    keyframes: keyframes([[0, 0], [0.8, 20], [1.6, -26], [2.4, 16], [3.2, 0]]),
  },
]);
const clips = [
  ["prop-rest", propRest],
  ["prop-walk", propWalk],
  ["prop-swing", propSwing],
  ["prop-stress", propStress],
];

const provenance = {
  schemaVersion: "1.0.0",
  sourceDigest: createHash("sha256").update(sourceText).digest("hex"),
  baseLayoutDigest: createHash("sha256").update(baseLayoutText).digest("hex"),
  attachmentLayoutDigest: createHash("sha256")
    .update(json(attachmentLayout))
    .digest("hex"),
  renderer: "sharp-svg-authored-and-contract-reconstruction",
  gripSamplingHz: 60,
  tolerance: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    boundsExpansionPixels: 0,
    seamMismatchPixels: 0,
  },
  variants: Object.fromEntries(
    [...references].map(([variantId, png]) => [
      variantId,
      createHash("sha256").update(png).digest("hex"),
    ]),
  ),
};

for (const root of outputRoots) {
  await mkdir(path.join(root, "attachments"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(path.join(root, "rig-layout.json"), json(rigLayout));
  await writeFile(path.join(root, "attachment-layout.json"), json(attachmentLayout));
  await writeFile(
    path.join(root, "reference/authoring-provenance.json"),
    json(provenance),
  );
  for (const [attachmentId, png] of attachmentPngs) {
    const attachment = source.attachments.find(
      (candidate) => candidate.attachmentId === attachmentId,
    );
    await writeFile(path.join(root, attachment.file), png);
  }
  for (const [variantId, png] of references) {
    await writeFile(path.join(root, `reference/${variantId}.png`), png);
  }
  for (const [name, value] of clips) {
    await writeFile(path.join(root, `animations/${name}.json`), json(value));
  }
}

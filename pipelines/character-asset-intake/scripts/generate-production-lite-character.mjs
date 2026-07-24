import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/production-lite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-character",
);
const outputRoots = [fixtureRoot, cocosRoot];
const sourceText = await readFile(
  path.join(fixtureRoot, "source/character-source.json"),
  "utf8",
);
const source = JSON.parse(sourceText);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function paletteSvg(markup) {
  return Object.entries(source.palette).reduce(
    (result, [name, color]) => result.replaceAll(`{${name}}`, color),
    markup,
  );
}

function svgFor(part) {
  const pivotX = part.pivot.x - part.originalRect.x - part.trimOffset.x;
  const pivotY = part.pivot.y - part.originalRect.y - part.trimOffset.y;
  const joint =
    part.jointRadius > 0
      ? `<circle cx="${pivotX}" cy="${pivotY}" r="${part.jointRadius}" fill="${source.palette.shirt}"/>`
      : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${part.trimSize.width}" height="${part.trimSize.height}" viewBox="0 0 ${part.trimSize.width} ${part.trimSize.height}">${joint}${paletteSvg(part.svg)}</svg>`,
  );
}

function world(point) {
  return {
    x: (point.x - source.sourceCanvas.width / 2) * source.referenceScale,
    y: (source.sourceCanvas.height / 2 - point.y) * source.referenceScale,
  };
}

const byId = new Map(source.parts.map((part) => [part.partId, part]));
function restPose(part) {
  const pivot = world(part.pivot);
  const parent =
    part.parentId === null ? null : world(byId.get(part.parentId).pivot);
  return {
    position:
      parent === null
        ? pivot
        : { x: pivot.x - parent.x, y: pivot.y - parent.y },
    rotationDegrees: 0,
    scale: { x: 1, y: 1 },
    opacity: 1,
  };
}

const layout = {
  schemaVersion: "1.0.0",
  layoutId: source.layoutId,
  sourceCanvas: source.sourceCanvas,
  referenceScale: source.referenceScale,
  drawOrderPolicy: "unique",
  visualPlacementMode: "trimmed-pixels",
  parts: source.parts.map((part) => ({
    partId: part.partId,
    file: `parts/${part.partId}.png`,
    parentId: part.parentId,
    originalRect: part.originalRect,
    trimOffset: part.trimOffset,
    anchor: {
      x: (part.pivot.x - part.originalRect.x) / part.originalRect.width,
      y: (part.pivot.y - part.originalRect.y) / part.originalRect.height,
    },
    restPose: restPose(part),
    drawOrder: part.drawOrder,
  })),
  sockets: [],
  hitAreas: [],
};

const characterRig = {
  schemaVersion: "1.0.0",
  characterId: source.characterId,
  displayName: "Production-Lite Layered Character",
  rigLayoutFile: "rig-layout.json",
  requiredParts: source.parts.map((part) => part.partId).sort(),
  requiredAnimationTargets: source.parts.map((part) => part.partId).sort(),
  animationTargets: source.parts
    .map((part) => ({ targetId: part.partId, partId: part.partId }))
    .sort((left, right) => left.targetId.localeCompare(right.targetId)),
};

const keyframes = (values, duration = 2) =>
  values.map(([time, value]) => ({
    time,
    value,
    interpolation: "linear",
    easing: "ease-in-out-sine",
  }));
const rotationTrack = (jointId, values, duration) => ({
  jointId,
  property: "rotation",
  keyframes: keyframes(values, duration),
});
const positionTrack = (jointId, values, duration) => ({
  jointId,
  property: "position",
  keyframes: keyframes(values, duration),
});
const clip = (animationId, duration, tracks) => ({
  schemaVersion: "1.0.0",
  animationId,
  rig: { rigId: source.layoutId, schemaVersion: "1.0.0" },
  duration,
  loop: true,
  tracks,
});

const clips = [
  clip("production-lite-rest-idle", 2, [
    positionTrack("pelvis", [
      [0, { x: 0, y: 0 }],
      [1, { x: 0, y: 2 }],
      [2, { x: 0, y: 0 }],
    ]),
    rotationTrack("head", [[0, 0], [1, 1.5], [2, 0]]),
  ]),
  clip("production-lite-arm-wave", 1.2, [
    rotationTrack("upper-arm-left", [[0, 0], [0.3, 118], [0.6, 92], [0.9, 118], [1.2, 0]], 1.2),
    rotationTrack("lower-arm-left", [[0, 0], [0.3, -72], [0.6, -112], [0.9, -72], [1.2, 0]], 1.2),
    rotationTrack("hand-left", [[0, 0], [0.3, 12], [0.6, -12], [0.9, 12], [1.2, 0]], 1.2),
  ]),
  clip("production-lite-walk-cycle", 1.2, [
    rotationTrack("upper-arm-left", [[0, -22], [0.6, 22], [1.2, -22]], 1.2),
    rotationTrack("upper-arm-right", [[0, 22], [0.6, -22], [1.2, 22]], 1.2),
    rotationTrack("lower-arm-left", [[0, -10], [0.6, -26], [1.2, -10]], 1.2),
    rotationTrack("lower-arm-right", [[0, -26], [0.6, -10], [1.2, -26]], 1.2),
    rotationTrack("thigh-left", [[0, 24], [0.6, -24], [1.2, 24]], 1.2),
    rotationTrack("thigh-right", [[0, -24], [0.6, 24], [1.2, -24]], 1.2),
    rotationTrack("shin-left", [[0, 5], [0.3, 25], [0.6, 8], [0.9, 42], [1.2, 5]], 1.2),
    rotationTrack("shin-right", [[0, 8], [0.3, 42], [0.6, 5], [0.9, 25], [1.2, 8]], 1.2),
    rotationTrack("shoe-left", [[0, -4], [0.6, 8], [1.2, -4]], 1.2),
    rotationTrack("shoe-right", [[0, 8], [0.6, -4], [1.2, 8]], 1.2),
  ]),
  clip("production-lite-articulation-stress", 2.4, [
    rotationTrack("head", [[0, 0], [0.6, -8], [1.2, 8], [1.8, -8], [2.4, 0]], 2.4),
    rotationTrack("upper-arm-left", [[0, 0], [0.6, 62], [1.2, -34], [1.8, 44], [2.4, 0]], 2.4),
    rotationTrack("lower-arm-left", [[0, 0], [0.6, -68], [1.2, 38], [1.8, -44], [2.4, 0]], 2.4),
    rotationTrack("upper-arm-right", [[0, 0], [0.6, -42], [1.2, 58], [1.8, -58], [2.4, 0]], 2.4),
    rotationTrack("lower-arm-right", [[0, 0], [0.6, 52], [1.2, -64], [1.8, 48], [2.4, 0]], 2.4),
    rotationTrack("thigh-left", [[0, 0], [0.6, 30], [1.2, -30], [1.8, 22], [2.4, 0]], 2.4),
    rotationTrack("shin-left", [[0, 0], [0.6, 34], [1.2, 12], [1.8, 46], [2.4, 0]], 2.4),
    rotationTrack("shoe-left", [[0, 0], [0.6, -12], [1.2, 10], [1.8, -8], [2.4, 0]], 2.4),
    rotationTrack("thigh-right", [[0, 0], [0.6, -30], [1.2, 30], [1.8, -22], [2.4, 0]], 2.4),
    rotationTrack("shin-right", [[0, 0], [0.6, 12], [1.2, 34], [1.8, 46], [2.4, 0]], 2.4),
    rotationTrack("shoe-right", [[0, 0], [0.6, 10], [1.2, -12], [1.8, 8], [2.4, 0]], 2.4),
  ]),
];

const generatedParts = new Map();
for (const part of source.parts) {
  generatedParts.set(
    part.partId,
    await sharp(svgFor(part))
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer(),
  );
}

const authoredReferenceSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${source.sourceCanvas.width}" height="${source.sourceCanvas.height}" viewBox="0 0 ${source.sourceCanvas.width} ${source.sourceCanvas.height}"><g style="image-rendering:pixelated">${[...source.parts]
    .sort((left, right) => left.drawOrder - right.drawOrder)
    .map(
      (part) =>
        `<image width="${part.trimSize.width}" height="${part.trimSize.height}" href="data:image/png;base64,${generatedParts.get(part.partId).toString("base64")}" transform="translate(${part.originalRect.x + part.trimOffset.x} ${part.originalRect.y + part.trimOffset.y})"/>`,
    )
    .join("")}</g></svg>`,
);
const reference = await sharp(authoredReferenceSvg)
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();

const authoringDigest = createHash("sha256").update(sourceText).digest("hex");
const layoutDigest = createHash("sha256").update(json(layout)).digest("hex");
const referenceDigest = createHash("sha256").update(reference).digest("hex");
const provenance = {
  schemaVersion: "1.0.0",
  authoringDigest,
  layoutDigest,
  referenceDigest,
  renderer: "sharp-svg-independent-authored-and-contract-reconstruction-paths",
  tolerance: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    boundsExpansionPixels: 0,
    seamMismatchPixels: 0,
  },
};

for (const root of outputRoots) {
  await mkdir(path.join(root, "parts"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(path.join(root, "rig-layout.json"), json(layout));
  await writeFile(path.join(root, "character-rig.json"), json(characterRig));
  await writeFile(path.join(root, "reference/reference-composite.png"), reference);
  await writeFile(path.join(root, "reference/authoring-provenance.json"), json(provenance));
  for (const [partId, png] of generatedParts) {
    await writeFile(path.join(root, `parts/${partId}.png`), png);
  }
  for (const generatedClip of clips) {
    const file = generatedClip.animationId.replace("production-lite-", "");
    await writeFile(path.join(root, `animations/${file}.json`), json(generatedClip));
  }
}

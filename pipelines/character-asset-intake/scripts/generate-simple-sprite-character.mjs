import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/simple-sprite-character");
const source = JSON.parse(
  await readFile(path.join(fixtureRoot, "source/mannequin-source.json"), "utf8"),
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/simple-sprite-character",
);
const outputRoots = [fixtureRoot, cocosRoot];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function local(point, rect) {
  return { x: point.x - rect.x, y: point.y - rect.y };
}

function svgFor(part) {
  const { rect } = part;
  const fill = part.color;
  let shape;
  if (part.shape?.kind === "rounded-rect") {
    shape = `<rect x="${part.shape.x - rect.x}" y="${part.shape.y - rect.y}" width="${part.shape.width}" height="${part.shape.height}" rx="${part.shape.radius}" fill="${fill}"/>`;
  } else {
    const start = local(part.pivot, rect);
    const end = local(part.distal, rect);
    shape = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${fill}" stroke-width="${part.radius * 2}" stroke-linecap="round"/>`;
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}">${shape}</svg>`,
  );
}

function restPose(part, byId) {
  const canvas = source.sourceCanvas;
  const world = (point) => ({
    x: (point.x - canvas.width / 2) * source.referenceScale,
    y: (canvas.height / 2 - point.y) * source.referenceScale,
  });
  const pivot = world(part.pivot);
  const parent = part.parentId === null ? null : world(byId.get(part.parentId).pivot);
  return {
    position: parent === null
      ? pivot
      : { x: pivot.x - parent.x, y: pivot.y - parent.y },
    rotationDegrees: 0,
    scale: { x: 1, y: 1 },
    opacity: 1,
  };
}

const byId = new Map(source.parts.map((part) => [part.partId, part]));
const layout = {
  schemaVersion: "1.0.0",
  layoutId: source.layoutId,
  sourceCanvas: source.sourceCanvas,
  referenceScale: source.referenceScale,
  drawOrderPolicy: "unique",
  visualPlacementMode: "source-canvas-rect",
  parts: source.parts.map((part) => ({
    partId: part.partId,
    file: `parts/${part.partId}.png`,
    parentId: part.parentId,
    originalRect: part.rect,
    trimOffset: { x: 0, y: 0 },
    anchor: {
      x: (part.pivot.x - part.rect.x) / part.rect.width,
      y: (part.pivot.y - part.rect.y) / part.rect.height,
    },
    restPose: restPose(part, byId),
    drawOrder: part.drawOrder,
  })),
  sockets: [],
  hitAreas: [],
};
const characterRig = {
  schemaVersion: "1.0.0",
  characterId: "simple-sprite-character",
  displayName: "Simple Sprite Character",
  rigLayoutFile: "rig-layout.json",
  requiredParts: source.parts.map((part) => part.partId).sort(),
  requiredAnimationTargets: source.parts.map((part) => part.partId).sort(),
  animationTargets: source.parts
    .map((part) => ({ targetId: part.partId, partId: part.partId }))
    .sort((left, right) => left.targetId.localeCompare(right.targetId)),
};

const sourceClips = await Promise.all(
  ["rest-idle", "arm-wave", "walk-cycle"].map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(repositoryRoot, `examples/stickman-reference/animations/${name}.json`),
        "utf8",
      ),
    ),
  ),
);
const clips = sourceClips.map((clip) => {
  const next = structuredClone(clip);
  next.animationId = next.animationId.replace("stickman-", "simple-sprite-");
  next.rig.rigId = source.layoutId;
  for (const track of next.tracks) {
    if (track.jointId === "root") track.jointId = "pelvis";
  }
  return next;
});

for (const root of outputRoots) {
  await mkdir(path.join(root, "parts"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await writeFile(path.join(root, "rig-layout.json"), json(layout));
  await writeFile(path.join(root, "character-rig.json"), json(characterRig));
  for (const clip of clips) {
    const file = clip.animationId.replace("simple-sprite-", "");
    await writeFile(path.join(root, `animations/${file}.json`), json(clip));
  }
  for (const part of source.parts) {
    await sharp(svgFor(part))
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toFile(path.join(root, `parts/${part.partId}.png`));
  }
}

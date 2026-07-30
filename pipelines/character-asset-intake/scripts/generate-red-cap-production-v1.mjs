import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-production-v1");
const cocosProjectRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets",
);
const mapPath = path.join(fixtureRoot, "source-authority-map.json");
const authorityText = await readFile(mapPath, "utf8");
const authority = JSON.parse(authorityText);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

if (
  authority.schemaVersion !== "1.0.0" ||
  authority.mapId !== "red-cap-production-v1-source-authority" ||
  authority.parts?.length !== 19
) {
  throw new Error("Invalid PROGRAM-015 source-authority map.");
}

const ids = authority.parts.map((part) => part.partId);
if (new Set(ids).size !== ids.length) {
  throw new Error("Duplicate PROGRAM-015 part ID.");
}
const byId = new Map(authority.parts.map((part) => [part.partId, part]));
for (const part of authority.parts) {
  if (part.parent !== null && !byId.has(part.parent)) {
    throw new Error(`Unknown parent ${part.parent} for ${part.partId}.`);
  }
}

const masterPath = path.join(
  fixtureRoot,
  authority.authorities.neutralAppearance.file,
);
const { data: master, info } = await sharp(masterPath, { failOn: "error" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (
  info.width !== authority.coordinateSystem.masterWidth ||
  info.height !== authority.coordinateSystem.masterHeight ||
  info.channels !== 4
) {
  throw new Error("PROGRAM-015 master dimensions or channels drifted.");
}

const ordered = authority.parts
  .slice()
  .sort((left, right) => left.drawOrder - right.drawOrder);
for (let index = 0; index < ordered.length; index += 1) {
  if (ordered[index].drawOrder !== index) {
    throw new Error("PROGRAM-015 draw orders must be contiguous and unique.");
  }
}
const fallback = byId.get(authority.fallbackPartId);
if (!fallback) {
  throw new Error("Unknown PROGRAM-015 fallback part.");
}
if (
  authority.ownershipOrder?.length !== ids.length ||
  new Set(authority.ownershipOrder).size !== ids.length ||
  authority.ownershipOrder.some((id) => !byId.has(id))
) {
  throw new Error("PROGRAM-015 ownership order is incomplete or duplicated.");
}
const ownershipOrdered = authority.ownershipOrder.map((id) => byId.get(id));

const ownerByPixel = new Int16Array(info.width * info.height).fill(-1);
const ownerPixels = new Map(ids.map((id) => [id, []]));
let visiblePixelCount = 0;
let fallbackPixelCount = 0;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const pixelIndex = y * info.width + x;
    if (master[pixelIndex * 4 + 3] === 0) {
      continue;
    }
    visiblePixelCount += 1;
    const matches = ownershipOrdered.filter((part) =>
      pointInPolygon(
        x + 0.5,
        y + 0.5,
        part.visibleAuthority.visibleRegion,
      ),
    );
    const owner = matches.length === 0 ? fallback : matches[0];
    if (matches.length === 0) {
      fallbackPixelCount += 1;
    }
    ownerByPixel[pixelIndex] = owner.drawOrder;
    ownerPixels.get(owner.partId).push([x, y]);
  }
}

const palette = [
  [230, 25, 75],
  [60, 180, 75],
  [255, 225, 25],
  [0, 130, 200],
  [245, 130, 48],
  [145, 30, 180],
  [70, 240, 240],
  [240, 50, 230],
  [210, 245, 60],
  [250, 190, 212],
  [0, 128, 128],
  [220, 190, 255],
  [170, 110, 40],
  [255, 250, 200],
  [128, 0, 0],
  [170, 255, 195],
  [128, 128, 0],
  [255, 215, 180],
  [0, 0, 128]
];
const ownershipPreview = Buffer.alloc(info.width * info.height * 4);
const generatedParts = new Map();
const extractionParts = [];

for (const part of ordered) {
  const [left, top, width, height] = part.visibleAuthority.sourceRect;
  if (
    ![left, top, width, height].every(Number.isInteger) ||
    left < 0 ||
    top < 0 ||
    width <= 0 ||
    height <= 0 ||
    left + width > info.width ||
    top + height > info.height
  ) {
    throw new Error(`Invalid sourceRect for ${part.partId}.`);
  }
  const output = Buffer.alloc(width * height * 4);
  let owned = 0;
  let duplicatedHidden = 0;
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      const pixelIndex = y * info.width + x;
      const alpha = master[pixelIndex * 4 + 3];
      const isOwner = ownerByPixel[pixelIndex] === part.drawOrder;
      const isHiddenOverlap =
        alpha === 255 &&
        pointInPolygon(
          x + 0.5,
          y + 0.5,
          part.hiddenOverlapRegion,
        );
      if (!isOwner && !isHiddenOverlap) {
        continue;
      }
      const sourceOffset = pixelIndex * 4;
      const outputOffset = ((y - top) * width + (x - left)) * 4;
      master.copy(output, outputOffset, sourceOffset, sourceOffset + 4);
      if (isOwner) {
        owned += 1;
        const color = palette[part.drawOrder % palette.length];
        ownershipPreview[sourceOffset] = color[0];
        ownershipPreview[sourceOffset + 1] = color[1];
        ownershipPreview[sourceOffset + 2] = color[2];
        ownershipPreview[sourceOffset + 3] = 255;
      } else {
        duplicatedHidden += 1;
      }
    }
  }
  if (owned !== ownerPixels.get(part.partId).length || owned === 0) {
    throw new Error(
      `Source rectangle does not close visible ownership for ${part.partId}.`,
    );
  }
  if (
    [
      "upper-arm-left",
      "upper-arm-right",
      "forearm-left",
      "forearm-right",
      "thigh-left",
      "thigh-right",
      "shin-left",
      "shin-right",
    ].includes(part.partId) &&
    owned < 2_500
  ) {
    throw new Error(
      `PROGRAM-015 articulation owner ${part.partId} is too small: ${owned}.`,
    );
  }
  const png = await sharp(output, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  generatedParts.set(part.partId, png);
  extractionParts.push({
    partId: part.partId,
    sourceFile: authority.authorities.neutralAppearance.file,
    sourceRect: { x: left, y: top, width, height },
    pivot: { x: part.pivotCandidate[0], y: part.pivotCandidate[1] },
    visiblePixelCount: owned,
    duplicatedHiddenPixelCount: duplicatedHidden,
    sha256: digest(png),
  });
}

const composite = Buffer.alloc(master.length);
for (const part of ordered) {
  const [left, top, width, height] = part.visibleAuthority.sourceRect;
  const decoded = await sharp(generatedParts.get(part.partId))
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 4;
      const targetOffset = ((y + top) * info.width + x + left) * 4;
      compositeOver(composite, targetOffset, decoded, sourceOffset);
    }
  }
}

let rgbaMismatchPixels = 0;
let alphaMismatchPixels = 0;
let maximumChannelDelta = 0;
const diff = Buffer.alloc(master.length);
for (let offset = 0; offset < master.length; offset += 4) {
  const alphaMismatch = master[offset + 3] !== composite[offset + 3];
  let mismatch = alphaMismatch;
  let pixelMax = 0;
  for (let channel = 0; channel < 4; channel += 1) {
    const delta = Math.abs(master[offset + channel] - composite[offset + channel]);
    pixelMax = Math.max(pixelMax, delta);
    maximumChannelDelta = Math.max(maximumChannelDelta, delta);
    mismatch ||= delta > 2;
  }
  if (alphaMismatch) {
    alphaMismatchPixels += 1;
  }
  if (mismatch) {
    rgbaMismatchPixels += 1;
    diff[offset] = 255;
    diff[offset + 1] = 0;
    diff[offset + 2] = 255;
    diff[offset + 3] = 255;
  }
}
if (rgbaMismatchPixels !== 0 || alphaMismatchPixels !== 0) {
  throw new Error(
    `PROGRAM-015 neutral reconstruction drifted: ${rgbaMismatchPixels}/${alphaMismatchPixels}.`,
  );
}

const referenceScale = 0.4;
const world = ([x, y]) => ({
  x: round((x - info.width / 2) * referenceScale),
  y: round((info.height / 2 - y) * referenceScale),
});
const restPose = (part) => {
  const pivot = world(part.pivotCandidate);
  const parent =
    part.parent === null ? null : world(byId.get(part.parent).pivotCandidate);
  return {
    position:
      parent === null
        ? pivot
        : { x: round(pivot.x - parent.x), y: round(pivot.y - parent.y) },
    rotationDegrees: 0,
    scale: { x: 1, y: 1 },
    opacity: 1,
  };
};

const rigLayout = {
  schemaVersion: "1.0.0",
  layoutId: "red-cap-production-v1-layout",
  sourceCanvas: { width: info.width, height: info.height },
  referenceScale,
  drawOrderPolicy: "unique",
  visualPlacementMode: "source-canvas-rect",
  parts: ordered.map((part) => {
    const [x, y, width, height] = part.visibleAuthority.sourceRect;
    return {
      partId: part.partId,
      file: `parts/${part.partId}.png`,
      parentId: part.parent,
      originalRect: { x, y, width, height },
      trimOffset: { x: 0, y: 0 },
      anchor: {
        x: round((part.pivotCandidate[0] - x) / width),
        y: round((part.pivotCandidate[1] - y) / height),
      },
      restPose: restPose(part),
      drawOrder: part.drawOrder,
    };
  }),
  sockets: [
    {
      socketId: "left-grip",
      parentPartId: "hand-left",
      position: { x: 8.8, y: -22.8 },
      rotationDegrees: 0,
    },
    {
      socketId: "right-grip",
      parentPartId: "hand-right",
      position: { x: -8.8, y: -22.8 },
      rotationDegrees: 0,
    },
    {
      socketId: "torso-vfx",
      parentPartId: "torso",
      position: { x: 0, y: 32 },
      rotationDegrees: 0,
    },
  ],
  hitAreas: [
    {
      hitAreaId: "body-hit",
      parentPartId: "torso",
      shape: { type: "rect", x: -48, y: -50, width: 96, height: 110 },
    },
    {
      hitAreaId: "head-hit",
      parentPartId: "head",
      shape: { type: "circle", x: 0, y: 32, radius: 54 },
    },
  ],
};
const characterRig = {
  schemaVersion: "1.0.0",
  characterId: "red-cap-production-v1",
  displayName: "Red Cap Production v1",
  rigLayoutFile: "rig-layout.json",
  requiredParts: ids.slice().sort(),
  requiredAnimationTargets: ids.slice().sort(),
  animationTargets: ids
    .map((partId) => ({ targetId: partId, partId }))
    .sort((left, right) => left.targetId.localeCompare(right.targetId)),
};

const reconstructedPng = await sharp(composite, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();
const diffPng = await sharp(diff, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();
const ownershipPng = await sharp(ownershipPreview, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();
const atlasWidth = 2048;
const atlasPadding = 4;
let atlasX = atlasPadding;
let atlasY = atlasPadding;
let atlasRowHeight = 0;
const atlasEntries = [];
for (const part of ordered) {
  const [sourceX, sourceY, width, height] = part.visibleAuthority.sourceRect;
  if (atlasX + width + atlasPadding > atlasWidth) {
    atlasX = atlasPadding;
    atlasY += atlasRowHeight + atlasPadding;
    atlasRowHeight = 0;
  }
  atlasEntries.push({
    partId: part.partId,
    rect: { x: atlasX, y: atlasY, width, height },
    originalRect: { x: sourceX, y: sourceY, width, height },
    pivot: {
      x: round((part.pivotCandidate[0] - sourceX) / width),
      y: round(1 - (part.pivotCandidate[1] - sourceY) / height),
    },
    drawOrder: part.drawOrder,
  });
  atlasX += width + atlasPadding;
  atlasRowHeight = Math.max(atlasRowHeight, height);
}
const atlasHeight = atlasY + atlasRowHeight + atlasPadding;
const atlasRaw = Buffer.alloc(atlasWidth * atlasHeight * 4);
for (const entry of atlasEntries) {
  const decoded = await sharp(generatedParts.get(entry.partId))
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (let y = 0; y < entry.rect.height; y += 1) {
    const sourceOffset = y * entry.rect.width * 4;
    const targetOffset =
      ((entry.rect.y + y) * atlasWidth + entry.rect.x) * 4;
    decoded.copy(
      atlasRaw,
      targetOffset,
      sourceOffset,
      sourceOffset + entry.rect.width * 4,
    );
  }
}
const atlasPng = await sharp(atlasRaw, {
  raw: { width: atlasWidth, height: atlasHeight, channels: 4 },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();
const atlasMap = {
  schemaVersion: "1.0.0",
  atlasId: "red-cap-production-v1-parts",
  image: "parts-atlas.png",
  width: atlasWidth,
  height: atlasHeight,
  padding: atlasPadding,
  coordinateSystem: "top-left",
  parts: atlasEntries,
};
const cocosPlan = {
  planVersion: "1.0.0",
  rigId: rigLayout.layoutId,
  rootName: "CHR_red_cap_production_v1",
  sourceCanvas: rigLayout.sourceCanvas,
  referenceScale,
  atlasResourcePath: "red-cap-production-v1/parts-atlas/spriteFrame",
  atlas: {
    width: atlasWidth,
    height: atlasHeight,
    coordinateSystem: "top-left",
  },
  reconstructionStatus: "EXACT · 0 RGBA / 0 ALPHA / 0 OWNERSHIP DUPLICATES",
  parts: atlasEntries.map((entry) => {
    const part = rigLayout.parts.find(
      (candidate) => candidate.partId === entry.partId,
    );
    return {
      jointId: entry.partId,
      parentId: part.parentId,
      drawOrder: entry.drawOrder,
      atlasRect: entry.rect,
      restPose: part.restPose,
      visualOffset: {
        x: round(
          (part.originalRect.x +
            part.originalRect.width / 2 -
            partJointX(part)) *
            referenceScale,
        ),
        y: round(
          (partJointY(part) -
            (part.originalRect.y + part.originalRect.height / 2)) *
            referenceScale,
        ),
      },
      visualSize: {
        width: round(part.originalRect.width * referenceScale),
        height: round(part.originalRect.height * referenceScale),
      },
      anchor: {
        x: part.anchor.x,
        y: round(1 - part.anchor.y),
      },
    };
  }),
};
const cocosData = `// Generated by generate-red-cap-production-v1.mjs. Do not hand-edit.\nexport const RED_CAP_PRODUCTION_STATIC_PLAN = ${JSON.stringify(cocosPlan, null, 2)} as const;\n`;
const report = {
  status: "passed",
  characterId: characterRig.characterId,
  sourceCanvas: rigLayout.sourceCanvas,
  masterSha256: digest(await readFile(masterPath)),
  authorityMapSha256: digest(Buffer.from(authorityText)),
  visiblePixelCount,
  assignedVisiblePixelCount: [...ownerPixels.values()].reduce(
    (sum, pixels) => sum + pixels.length,
    0,
  ),
  fallbackPixelCount,
  duplicateOwnershipPixelCount: 0,
  alphaSilhouetteIoU: 1,
  alphaMismatchPixels,
  rgbaMismatchPixels,
  maximumChannelDelta,
  parts: extractionParts,
  atlas: atlasMap,
  reconstructedSha256: digest(reconstructedPng),
};
const manifest = {
  schemaVersion: "1.0.0",
  generator: "generate-red-cap-production-v1.mjs",
  sourceAuthorityMapSha256: digest(Buffer.from(authorityText)),
  masterSha256: report.masterSha256,
  files: [
    ...extractionParts.map((part) => ({
      path: `parts/${part.partId}.png`,
      sha256: part.sha256,
    })),
    { path: "character-rig.json", sha256: digest(Buffer.from(json(characterRig))) },
    { path: "rig-layout.json", sha256: digest(Buffer.from(json(rigLayout))) },
    { path: "reference/reconstructed-neutral.png", sha256: digest(reconstructedPng) },
    { path: "provenance/part-ownership.png", sha256: digest(ownershipPng) },
    { path: "atlas/parts-atlas.png", sha256: digest(atlasPng) },
  ].sort((left, right) => left.path.localeCompare(right.path)),
  cocosMirrors: [
    {
      path: "assets/resources/red-cap-production-v1/parts-atlas.png",
      sha256: digest(atlasPng),
    },
    {
      path:
        "assets/gameai/red-cap-production/red-cap-production-static-data.ts",
      sha256: digest(Buffer.from(cocosData)),
    },
  ],
};

await mkdir(path.join(fixtureRoot, "parts"), { recursive: true });
await mkdir(path.join(fixtureRoot, "atlas"), { recursive: true });
await mkdir(path.join(fixtureRoot, "reference"), { recursive: true });
await mkdir(path.join(fixtureRoot, "provenance"), { recursive: true });
await mkdir(
  path.join(cocosProjectRoot, "resources/red-cap-production-v1"),
  { recursive: true },
);
await mkdir(
  path.join(cocosProjectRoot, "gameai/red-cap-production"),
  { recursive: true },
);
for (const [partId, png] of generatedParts) {
  await writeFile(path.join(fixtureRoot, `parts/${partId}.png`), png);
}
await writeFile(path.join(fixtureRoot, "character-rig.json"), json(characterRig));
await writeFile(path.join(fixtureRoot, "rig-layout.json"), json(rigLayout));
await writeFile(
  path.join(fixtureRoot, "reference/reconstructed-neutral.png"),
  reconstructedPng,
);
await writeFile(path.join(fixtureRoot, "atlas/parts-atlas.png"), atlasPng);
await writeFile(
  path.join(
    cocosProjectRoot,
    "resources/red-cap-production-v1/parts-atlas.png",
  ),
  atlasPng,
);
await writeFile(
  path.join(
    cocosProjectRoot,
    "gameai/red-cap-production/red-cap-production-static-data.ts",
  ),
  cocosData,
);
await writeFile(
  path.join(fixtureRoot, "reference/reconstruction-report.json"),
  json(report),
);
await writeFile(
  path.join(fixtureRoot, "provenance/part-ownership.png"),
  ownershipPng,
);
await writeFile(
  path.join(fixtureRoot, "provenance/generated-manifest.json"),
  json(manifest),
);

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const [currentX, currentY] = polygon[current];
    const [previousX, previousY] = polygon[previous];
    if (
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY) +
          currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function compositeOver(target, targetOffset, source, sourceOffset) {
  const sourceAlpha = source[sourceOffset + 3] / 255;
  if (sourceAlpha === 0) {
    return;
  }
  const targetAlpha = target[targetOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    const value =
      (source[sourceOffset + channel] * sourceAlpha +
        target[targetOffset + channel] *
          targetAlpha *
          (1 - sourceAlpha)) /
      outputAlpha;
    target[targetOffset + channel] = Math.round(value);
  }
  target[targetOffset + 3] = Math.round(outputAlpha * 255);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function round(value) {
  return Number(value.toFixed(6));
}

function partJointX(part) {
  return part.originalRect.x + part.anchor.x * part.originalRect.width;
}

function partJointY(part) {
  return part.originalRect.y + part.anchor.y * part.originalRect.height;
}

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(
  repositoryRoot,
  process.argv[2] ?? "examples/red-cap-target-remade",
);
const annotationPath = resolve(fixtureRoot, "source-annotation.json");
const mappingPath = resolve(fixtureRoot, "source-asset-map.json");
const segmentationPath = resolve(
  fixtureRoot,
  "canonical-part-segmentation.json",
);

const [annotation, mapping, segmentation] = await Promise.all([
  readJson(annotationPath),
  readJson(mappingPath),
  readJson(segmentationPath),
]);
if (
  segmentation.schemaVersion !== "1.0.0" ||
  typeof segmentation.reference !== "string" ||
  !Array.isArray(segmentation.parts)
) {
  throw new Error("Unsupported or invalid canonical segmentation document.");
}

const annotationByPart = indexUnique(annotation.parts, "annotation");
const mappingByPart = indexUnique(mapping.parts, "source asset map");
const segmentationByPart = indexUnique(
  segmentation.parts,
  "canonical segmentation",
);
const expectedPartIds = [...annotationByPart.keys()].sort();
for (const [label, values] of [
  ["source asset map", mappingByPart],
  ["canonical segmentation", segmentationByPart],
]) {
  const actual = [...values.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedPartIds)) {
    throw new Error(
      `${label} part IDs do not match the source annotation: ${actual.join(", ")}`,
    );
  }
}
if (!segmentationByPart.has(segmentation.fallbackPartId)) {
  throw new Error(
    `Unknown fallback partId ${String(segmentation.fallbackPartId)}.`,
  );
}

const referencePath = resolve(fixtureRoot, segmentation.reference);
const { data: referencePixels, info } = await sharp(referencePath, {
  failOn: "error",
})
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (
  info.width !== annotation.sourceCanvas.width ||
  info.height !== annotation.sourceCanvas.height ||
  info.channels !== 4
) {
  throw new Error("Canonical reference does not match annotation sourceCanvas.");
}

const orderedSegments = segmentation.parts.map((part) => {
  if (
    !Array.isArray(part.polygons) ||
    part.polygons.length === 0 ||
    part.polygons.some(
      (polygon) =>
        !Array.isArray(polygon) ||
        polygon.length < 3 ||
        polygon.some(
          (point) =>
            !Array.isArray(point) ||
            point.length !== 2 ||
            !point.every(Number.isFinite),
        ),
    )
  ) {
    throw new Error(`Invalid ownership polygon for ${part.partId}.`);
  }
  return part;
});

const ownerByPixel = new Int16Array(info.width * info.height).fill(-1);
const ownedCoordinates = new Map(
  expectedPartIds.map((partId) => [partId, []]),
);
let canonicalVisiblePixelCount = 0;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const pixelIndex = y * info.width + x;
    if (referencePixels[pixelIndex * 4 + 3] === 0) {
      continue;
    }
    canonicalVisiblePixelCount += 1;
    let ownerIndex = orderedSegments.findIndex((segment) =>
      segment.polygons.some((polygon) =>
        pointInPolygon(x + 0.5, y + 0.5, polygon),
      ),
    );
    if (ownerIndex < 0) {
      ownerIndex = orderedSegments.findIndex(
        (segment) => segment.partId === segmentation.fallbackPartId,
      );
    }
    const owner = orderedSegments[ownerIndex];
    ownerByPixel[pixelIndex] = ownerIndex;
    ownedCoordinates.get(owner.partId).push([x, y]);
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
  [0, 0, 128],
];
const ownershipPreview = Buffer.alloc(info.width * info.height * 4);
const extractionParts = [];

for (const [partIndex, partId] of expectedPartIds.entries()) {
  const coordinates = ownedCoordinates.get(partId);
  if (coordinates.length === 0) {
    throw new Error(`Canonical segmentation produced empty part ${partId}.`);
  }
  const annotationPart = annotationByPart.get(partId);
  const xs = coordinates.map(([x]) => x);
  const ys = coordinates.map(([, y]) => y);
  const requiredPoints = [
    annotationPart.joint,
    ...(annotationPart.childAttachments ?? []).map(
      (attachment) => attachment.position,
    ),
  ];
  const left = Math.max(
    0,
    Math.min(...xs, ...requiredPoints.map(({ x }) => Math.floor(x))),
  );
  const top = Math.max(
    0,
    Math.min(...ys, ...requiredPoints.map(({ y }) => Math.floor(y))),
  );
  const right = Math.min(
    info.width,
    Math.max(
      ...xs.map((x) => x + 1),
      ...requiredPoints.map(({ x }) => Math.ceil(x) + 1),
    ),
  );
  const bottom = Math.min(
    info.height,
    Math.max(
      ...ys.map((y) => y + 1),
      ...requiredPoints.map(({ y }) => Math.ceil(y) + 1),
    ),
  );
  const width = right - left;
  const height = bottom - top;
  const outputPixels = Buffer.alloc(width * height * 4);
  const ownerIndex = orderedSegments.findIndex(
    (segment) => segment.partId === partId,
  );
  const color = palette[partIndex % palette.length];

  for (const [x, y] of coordinates) {
    const sourceOffset = (y * info.width + x) * 4;
    const outputOffset = ((y - top) * width + (x - left)) * 4;
    referencePixels.copy(
      outputPixels,
      outputOffset,
      sourceOffset,
      sourceOffset + 4,
    );
    const previewOffset = (y * info.width + x) * 4;
    ownershipPreview[previewOffset] = color[0];
    ownershipPreview[previewOffset + 1] = color[1];
    ownershipPreview[previewOffset + 2] = color[2];
    ownershipPreview[previewOffset + 3] = 255;
    if (ownerByPixel[y * info.width + x] !== ownerIndex) {
      throw new Error(`Ownership index drift for ${partId} at ${x},${y}.`);
    }
  }

  const mappingPart = mappingByPart.get(partId);
  const outputPath = resolve(fixtureRoot, mappingPart.sourceFile);
  await mkdir(dirname(outputPath), { recursive: true });
  const png = await sharp(outputPixels, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await writeFile(outputPath, png);

  annotationPart.sourceRect = { x: left, y: top, width, height };
  annotationPart.trim = {
    offset: { x: 0, y: 0 },
    size: { width, height },
  };
  mappingPart.cropRect = { x: 0, y: 0, width, height };
  extractionParts.push({
    partId,
    sourceFile: mappingPart.sourceFile,
    originalRect: { x: left, y: top, width, height },
    visiblePixelCount: coordinates.length,
    sha256: createHash("sha256").update(png).digest("hex"),
  });
}

const evidenceRoot = resolve(fixtureRoot, "provenance");
await mkdir(evidenceRoot, { recursive: true });
await Promise.all([
  writeFile(annotationPath, `${JSON.stringify(annotation, null, 2)}\n`),
  writeFile(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`),
  sharp(ownershipPreview, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(resolve(evidenceRoot, "part-ownership.png")),
  writeFile(
    resolve(evidenceRoot, "canonical-extraction-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: "1.0.0",
        reference: segmentation.reference,
        sourceCanvas: annotation.sourceCanvas,
        canonicalVisiblePixelCount,
        assignedVisiblePixelCount: extractionParts.reduce(
          (sum, part) => sum + part.visiblePixelCount,
          0,
        ),
        parts: extractionParts,
      },
      null,
      2,
    )}\n`,
  ),
]);

console.log(
  JSON.stringify(
    {
      canonicalVisiblePixelCount,
      partCount: extractionParts.length,
      parts: extractionParts.map(({ partId, visiblePixelCount }) => ({
        partId,
        visiblePixelCount,
      })),
    },
    null,
    2,
  ),
);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function indexUnique(parts, label) {
  if (!Array.isArray(parts)) {
    throw new Error(`${label} parts must be an array.`);
  }
  const result = new Map();
  for (const part of parts) {
    if (
      typeof part?.partId !== "string" ||
      part.partId.length === 0 ||
      result.has(part.partId)
    ) {
      throw new Error(`Invalid or duplicate ${label} partId.`);
    }
    result.set(part.partId, part);
  }
  return result;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const [currentX, currentY] = polygon[current];
    const [previousX, previousY] = polygon[previous];
    const crosses =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY) +
          currentX;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

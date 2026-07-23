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

const paths = {
  annotation: resolve(fixtureRoot, "source-annotation.json"),
  mapping: resolve(fixtureRoot, "source-asset-map.json"),
  provenance: resolve(fixtureRoot, "asset-provenance.json"),
  specification: resolve(fixtureRoot, "articulation-safety.json"),
};
const [annotation, mapping, provenance, specification] = await Promise.all(
  Object.values(paths).map(readJson),
);
if (
  specification.schemaVersion !== "1.0.0" ||
  !Number.isInteger(specification.extensionRadius) ||
  specification.extensionRadius <= 0 ||
  !Array.isArray(specification.joints)
) {
  throw new Error("Unsupported or invalid articulation-safety specification.");
}

const annotationByPart = indexUnique(annotation.parts, "annotation");
const mappingByPart = indexUnique(mapping.parts, "mapping");
const parentByChild = new Map();
for (const parent of annotation.parts) {
  for (const attachment of parent.childAttachments ?? []) {
    parentByChild.set(attachment.childPartId, parent.partId);
  }
}
const order = [...annotation.parts].sort(
  (left, right) =>
    left.overrides.drawOrder - right.overrides.drawOrder ||
    left.partId.localeCompare(right.partId),
);
const orderIndex = new Map(order.map((part, index) => [part.partId, index]));
const decoded = new Map();
for (const part of annotation.parts) {
  const mappingPart = mappingByPart.get(part.partId);
  const canonicalSourceFile =
    mappingPart.canonicalSourceFile ?? mappingPart.sourceFile;
  const image = await sharp(resolve(fixtureRoot, canonicalSourceFile), {
    failOn: "error",
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    image.info.width !== part.sourceRect.width ||
    image.info.height !== part.sourceRect.height
  ) {
    throw new Error(
      `${part.partId} is not a canonical extraction matching sourceRect.`,
    );
  }
  decoded.set(part.partId, image);
}

const canvasWidth = annotation.sourceCanvas.width;
const canvasHeight = annotation.sourceCanvas.height;
const owner = new Int16Array(canvasWidth * canvasHeight).fill(-1);
const ownerAlpha = new Uint8Array(canvasWidth * canvasHeight);
for (const [index, part] of order.entries()) {
  const image = decoded.get(part.partId);
  for (let y = 0; y < image.info.height; y += 1) {
    for (let x = 0; x < image.info.width; x += 1) {
      if ((image.data[(y * image.info.width + x) * 4 + 3] ?? 0) === 0) {
        continue;
      }
      const canvasIndex =
        (part.sourceRect.y + y) * canvasWidth + part.sourceRect.x + x;
      owner[canvasIndex] = index;
      ownerAlpha[canvasIndex] =
        image.data[(y * image.info.width + x) * 4 + 3] ?? 0;
    }
  }
}

const hiddenExtensions = [];
const generatedParts = [];
for (const joint of specification.joints) {
  const part = annotationByPart.get(joint.partId);
  const cover = annotationByPart.get(joint.coverPartId);
  if (
    part === undefined ||
    cover === undefined ||
    parentByChild.get(part.partId) !== cover.partId ||
    (orderIndex.get(cover.partId) ?? -1) <=
      (orderIndex.get(part.partId) ?? Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(
      `Invalid parent or covering draw order for ${joint.jointId}.`,
    );
  }

  const radius = specification.extensionRadius;
  const oldRect = { ...part.sourceRect };
  const left = Math.max(0, Math.min(oldRect.x, Math.floor(part.joint.x - radius)));
  const top = Math.max(0, Math.min(oldRect.y, Math.floor(part.joint.y - radius)));
  const right = Math.min(
    canvasWidth,
    Math.max(oldRect.x + oldRect.width, Math.ceil(part.joint.x + radius)),
  );
  const bottom = Math.min(
    canvasHeight,
    Math.max(oldRect.y + oldRect.height, Math.ceil(part.joint.y + radius)),
  );
  const width = right - left;
  const height = bottom - top;
  const pixels = Buffer.alloc(width * height * 4);
  const generatedMask = new Uint8Array(width * height);
  const oldImage = decoded.get(part.partId);
  for (let y = 0; y < oldImage.info.height; y += 1) {
    const sourceStart = y * oldImage.info.width * 4;
    const destinationStart =
      ((oldRect.y - top + y) * width + oldRect.x - left) * 4;
    oldImage.data.copy(
      pixels,
      destinationStart,
      sourceStart,
      sourceStart + oldImage.info.width * 4,
    );
  }

  const nearest = nearestOpaqueColors(pixels, width, height);
  const coverImage = decoded.get(cover.partId);
  const coverIndex = orderIndex.get(cover.partId);
  let generatedPixelCount = 0;
  for (
    let canvasY = Math.max(0, Math.floor(part.joint.y - radius));
    canvasY < Math.min(canvasHeight, Math.ceil(part.joint.y + radius));
    canvasY += 1
  ) {
    for (
      let canvasX = Math.max(0, Math.floor(part.joint.x - radius));
      canvasX < Math.min(canvasWidth, Math.ceil(part.joint.x + radius));
      canvasX += 1
    ) {
      const deltaX = canvasX + 0.5 - part.joint.x;
      const deltaY = canvasY + 0.5 - part.joint.y;
      if (deltaX * deltaX + deltaY * deltaY > radius * radius) continue;
      const canvasIndex = canvasY * canvasWidth + canvasX;
      if (
        owner[canvasIndex] !== coverIndex ||
        ownerAlpha[canvasIndex] !== 255
      ) {
        continue;
      }
      const localX = canvasX - left;
      const localY = canvasY - top;
      const offset = (localY * width + localX) * 4;
      if ((pixels[offset + 3] ?? 0) > 0) continue;
      if (nearest.distance[localY * width + localX] > 32) continue;
      const coverX = canvasX - cover.sourceRect.x;
      const coverY = canvasY - cover.sourceRect.y;
      const coverOffset =
        (coverY * coverImage.info.width + coverX) * 4;
      pixels[offset] = coverImage.data[coverOffset] ?? 0;
      pixels[offset + 1] = coverImage.data[coverOffset + 1] ?? 0;
      pixels[offset + 2] = coverImage.data[coverOffset + 2] ?? 0;
      pixels[offset + 3] = 255;
      generatedMask[localY * width + localX] = 1;
      generatedPixelCount += 1;
    }
  }
  if (generatedPixelCount === 0) {
    throw new Error(`No hidden extension pixels were generated for ${joint.jointId}.`);
  }

  const png = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const mappingPart = mappingByPart.get(part.partId);
  const canonicalSourceFile =
    mappingPart.canonicalSourceFile ?? mappingPart.sourceFile;
  const extensionFile = `articulation/source-parts/${part.partId}.png`;
  await mkdir(dirname(resolve(fixtureRoot, extensionFile)), { recursive: true });
  await writeFile(resolve(fixtureRoot, extensionFile), png);
  mappingPart.canonicalSourceFile = canonicalSourceFile;
  mappingPart.sourceFile = extensionFile;
  part.sourceRect = { x: left, y: top, width, height };
  part.trim = {
    offset: { x: 0, y: 0 },
    size: { width, height },
  };
  mappingPart.cropRect = { x: 0, y: 0, width, height };
  const regions = maskToRectangles(generatedMask, width, height);
  hiddenExtensions.push({
    partId: part.partId,
    jointId: joint.jointId,
    coverPartId: cover.partId,
    regions,
  });
  generatedParts.push({
    jointId: joint.jointId,
    partId: part.partId,
    coverPartId: cover.partId,
    generatedPixelCount,
    originalRect: oldRect,
    extendedRect: part.sourceRect,
    regionCount: regions.length,
    sha256: createHash("sha256").update(png).digest("hex"),
  });
}

provenance.hiddenExtensions = hiddenExtensions;
await Promise.all([
  writeFile(paths.annotation, `${JSON.stringify(annotation, null, 2)}\n`),
  writeFile(paths.mapping, `${JSON.stringify(mapping, null, 2)}\n`),
  writeFile(paths.provenance, `${JSON.stringify(provenance, null, 2)}\n`),
  mkdir(resolve(fixtureRoot, "articulation"), { recursive: true }).then(() =>
    writeFile(
      resolve(fixtureRoot, "articulation/generated-overlaps.json"),
      `${JSON.stringify(
        {
          schemaVersion: "1.0.0",
          specification: "articulation-safety.json",
          extensionRadius: specification.extensionRadius,
          generatedPixelCount: generatedParts.reduce(
            (sum, part) => sum + part.generatedPixelCount,
            0,
          ),
          parts: generatedParts,
        },
        null,
        2,
      )}\n`,
    ),
  ),
]);

console.log(
  JSON.stringify(
    {
      jointCount: generatedParts.length,
      generatedPixelCount: generatedParts.reduce(
        (sum, part) => sum + part.generatedPixelCount,
        0,
      ),
    },
    null,
    2,
  ),
);

function nearestOpaqueColors(pixels, width, height) {
  const count = width * height;
  const nearest = new Int32Array(count).fill(-1);
  const distance = new Uint16Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  for (let index = 0; index < count; index += 1) {
    if ((pixels[index * 4 + 3] ?? 0) >= 192) {
      nearest[index] = index;
      queue[tail++] = index;
    }
  }
  if (tail === 0) throw new Error("Cannot extend a fully transparent part.");
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    for (const next of [
      x > 0 ? index - 1 : -1,
      x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y + 1 < height ? index + width : -1,
    ]) {
      if (next < 0 || nearest[next] >= 0) continue;
      nearest[next] = nearest[index];
      distance[next] = distance[index] + 1;
      queue[tail++] = next;
    }
  }
  return { nearest, distance };
}

function maskToRectangles(mask, width, height) {
  const rectangles = [];
  const active = new Map();
  for (let y = 0; y < height; y += 1) {
    const runs = [];
    let x = 0;
    while (x < width) {
      while (x < width && mask[y * width + x] === 0) x += 1;
      if (x >= width) break;
      const start = x;
      while (x < width && mask[y * width + x] !== 0) x += 1;
      runs.push({ x: start, width: x - start });
    }
    const next = new Map();
    for (const run of runs) {
      const key = `${run.x}:${run.width}`;
      const existing = active.get(key);
      if (existing === undefined) {
        next.set(key, { x: run.x, y, width: run.width, height: 1 });
      } else {
        existing.height += 1;
        next.set(key, existing);
      }
    }
    for (const [key, rectangle] of active) {
      if (!next.has(key)) rectangles.push(rectangle);
    }
    active.clear();
    for (const [key, rectangle] of next) active.set(key, rectangle);
  }
  rectangles.push(...active.values());
  return rectangles.sort(
    (left, right) =>
      left.y - right.y ||
      left.x - right.x ||
      left.height - right.height ||
      left.width - right.width,
  );
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function indexUnique(parts, label) {
  const result = new Map();
  for (const part of parts ?? []) {
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

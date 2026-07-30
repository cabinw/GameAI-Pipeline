import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-production-v1");
const layout = JSON.parse(
  await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
);
const padding = 96;
const width = layout.sourceCanvas.width + padding * 2;
const height = layout.sourceCanvas.height + padding * 2;
const pixelCount = width * height;
const ordered = layout.parts
  .slice()
  .sort(
    (left, right) =>
      left.drawOrder - right.drawOrder ||
      left.partId.localeCompare(right.partId),
  );
const byId = new Map(ordered.map((part) => [part.partId, part]));
const images = new Map();
for (const part of ordered) {
  images.set(
    part.partId,
    await sharp(path.join(fixtureRoot, part.file), { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  );
}

const jointParts = [
  "upper-arm-right",
  "forearm-right",
  "hand-right",
  "upper-arm-left",
  "forearm-left",
  "hand-left",
  "thigh-right",
  "shin-right",
  "foot-right",
  "thigh-left",
  "shin-left",
  "foot-left",
];
const positive = {
  "upper-arm-right": 12,
  "forearm-right": 12,
  "hand-right": 8,
  "upper-arm-left": -12,
  "forearm-left": -12,
  "hand-left": -8,
  "thigh-right": 8,
  "shin-right": 8,
  "foot-right": 6,
  "thigh-left": -8,
  "shin-left": -8,
  "foot-left": -6,
};
const poses = [
  { poseId: "positive", rotations: positive },
  {
    poseId: "negative",
    rotations: Object.fromEntries(
      Object.entries(positive).map(([partId, degrees]) => [partId, -degrees]),
    ),
  },
];
const observations = [];
await rm(
  path.join(fixtureRoot, "reference/static-stress-negative.png"),
  { force: true },
);
for (const pose of poses) {
  const render = renderScene(pose.rotations);
  const joints = jointParts.map((partId) => observeJoint(partId, render));
  const png = await sharp(render.composite, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  if (pose.poseId === "positive") {
    await writeFile(
      path.join(fixtureRoot, "reference/static-stress-positive.png"),
      png,
    );
  }
  observations.push({
    poseId: pose.poseId,
    rotations: pose.rotations,
    withinCanvas: [...render.withinCanvas.entries()].map(
      ([partId, value]) => ({ partId, value }),
    ),
    joints,
    decodedPixelSha256: digest(render.composite),
    pngSha256: digest(png),
  });
}

const failures = [];
for (const pose of observations) {
  for (const part of pose.withinCanvas) {
    if (!part.value) {
      failures.push(`${pose.poseId}:${part.partId}:out-of-bounds`);
    }
  }
  for (const joint of pose.joints) {
    if (joint.transparentTwoPixelCrossing) {
      failures.push(`${pose.poseId}:${joint.partId}:transparent-crossing`);
    }
  }
}
const report = {
  schemaVersion: "1.0.0",
  status: failures.length === 0 ? "passed" : "failed",
  fixtureId: "red-cap-production-v1",
  canvas: { width, height, padding },
  oracle: {
    pivotRoi: { width: 12, height: 12 },
    maximumChannelDelta: 2,
    rule: "No two-pixel transparent crossing perpendicular to the parent-child axis.",
  },
  poses: observations,
  failures,
};
await writeFile(
  path.join(fixtureRoot, "reference/static-stress-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    status: report.status,
    poseCount: report.poses.length,
    jointObservationCount: report.poses.reduce(
      (sum, pose) => sum + pose.joints.length,
      0,
    ),
    failures,
  }),
);
if (failures.length > 0) {
  process.exitCode = 1;
}

function renderScene(rotations) {
  const matrices = worldMatrices(rotations);
  const masks = new Map();
  const withinCanvas = new Map();
  const composite = Buffer.alloc(pixelCount * 4);
  for (const part of ordered) {
    const mask = new Uint8Array(pixelCount);
    masks.set(part.partId, mask);
    withinCanvas.set(
      part.partId,
      renderPart(
        part,
        images.get(part.partId),
        matrices.get(part.partId),
        mask,
        composite,
      ),
    );
  }
  return { matrices, masks, withinCanvas, composite };
}

function observeJoint(partId, render) {
  const part = byId.get(partId);
  const parent = byId.get(part.parentId);
  const pivot = partJoint(part);
  const center = apply(render.matrices.get(partId), pivot.x, pivot.y);
  const childCenter = apply(
    render.matrices.get(partId),
    part.originalRect.x + part.originalRect.width / 2,
    part.originalRect.y + part.originalRect.height / 2,
  );
  const parentCenter = apply(
    render.matrices.get(parent.partId),
    parent.originalRect.x + parent.originalRect.width / 2,
    parent.originalRect.y + parent.originalRect.height / 2,
  );
  const axis = normalize({
    x: childCenter.x - parentCenter.x,
    y: childCenter.y - parentCenter.y,
  });
  const perpendicular = { x: -axis.y, y: axis.x };
  const childMask = render.masks.get(partId);
  const parentMask = render.masks.get(parent.partId);
  let intersectionPixelCount = 0;
  let contactPixelCount = 0;
  let coveredPixelCount = 0;
  for (let y = -6; y < 6; y += 1) {
    for (let x = -6; x < 6; x += 1) {
      const index = pixelIndex(center.x + x, center.y + y);
      if (index === null) continue;
      if (childMask[index] > 0 || parentMask[index] > 0) {
        coveredPixelCount += 1;
      }
      if (childMask[index] > 0 && parentMask[index] > 0) {
        intersectionPixelCount += 1;
      }
      if (
        (childMask[index] > 0 &&
          hasNeighbor(parentMask, center.x + x, center.y + y, 2)) ||
        (parentMask[index] > 0 &&
          hasNeighbor(childMask, center.x + x, center.y + y, 2))
      ) {
        contactPixelCount += 1;
      }
    }
  }
  let transparentTwoPixelCrossing = true;
  for (let distance = -6; distance <= 6; distance += 1) {
    const first = pixelIndex(
      center.x + perpendicular.x * distance - axis.x * 0.5,
      center.y + perpendicular.y * distance - axis.y * 0.5,
    );
    const second = pixelIndex(
      center.x + perpendicular.x * distance + axis.x * 0.5,
      center.y + perpendicular.y * distance + axis.y * 0.5,
    );
    if (
      first === null ||
      second === null ||
      childMask[first] > 0 ||
      parentMask[first] > 0 ||
      childMask[second] > 0 ||
      parentMask[second] > 0
    ) {
      transparentTwoPixelCrossing = false;
      break;
    }
  }
  return {
    partId,
    parentPartId: parent.partId,
    worldPivot: { x: round(center.x), y: round(center.y) },
    intersectionPixelCount,
    contactPixelCount,
    overlapOrContactPixelCount: intersectionPixelCount + contactPixelCount,
    coveredPixelCount,
    coverageRatio: round(coveredPixelCount / 144),
    transparentTwoPixelCrossing,
  };
}

function hasNeighbor(mask, x, y, distance) {
  for (let offsetY = -distance; offsetY <= distance; offsetY += 1) {
    for (let offsetX = -distance; offsetX <= distance; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY > distance * distance) continue;
      const index = pixelIndex(x + offsetX, y + offsetY);
      if (index !== null && mask[index] > 0) return true;
    }
  }
  return false;
}

function renderPart(part, image, matrix, mask, composite) {
  const corners = [
    [part.originalRect.x, part.originalRect.y],
    [part.originalRect.x + part.originalRect.width, part.originalRect.y],
    [part.originalRect.x, part.originalRect.y + part.originalRect.height],
    [
      part.originalRect.x + part.originalRect.width,
      part.originalRect.y + part.originalRect.height,
    ],
  ].map(([x, y]) => apply(matrix, x, y));
  const rawMinX = Math.floor(
    Math.min(...corners.map((point) => point.x)) + padding - 1,
  );
  const rawMaxX = Math.ceil(
    Math.max(...corners.map((point) => point.x)) + padding + 1,
  );
  const rawMinY = Math.floor(
    Math.min(...corners.map((point) => point.y)) + padding - 1,
  );
  const rawMaxY = Math.ceil(
    Math.max(...corners.map((point) => point.y)) + padding + 1,
  );
  const withinCanvas =
    rawMinX >= 0 &&
    rawMinY >= 0 &&
    rawMaxX <= width &&
    rawMaxY <= height;
  const inverse = invert(matrix);
  for (
    let outputY = Math.max(0, rawMinY);
    outputY < Math.min(height, rawMaxY);
    outputY += 1
  ) {
    for (
      let outputX = Math.max(0, rawMinX);
      outputX < Math.min(width, rawMaxX);
      outputX += 1
    ) {
      const source = apply(
        inverse,
        outputX + 0.5 - padding,
        outputY + 0.5 - padding,
      );
      const localX = Math.floor(source.x - part.originalRect.x);
      const localY = Math.floor(source.y - part.originalRect.y);
      if (
        localX < 0 ||
        localY < 0 ||
        localX >= image.info.width ||
        localY >= image.info.height
      ) {
        continue;
      }
      const sourceOffset = (localY * image.info.width + localX) * 4;
      const alpha = image.data[sourceOffset + 3];
      if (alpha === 0) continue;
      const targetIndex = outputY * width + outputX;
      const targetOffset = targetIndex * 4;
      mask[targetIndex] = alpha;
      compositeOver(composite, targetOffset, image.data, sourceOffset);
    }
  }
  return withinCanvas;
}

function worldMatrices(rotations) {
  const result = new Map();
  const resolveMatrix = (part) => {
    if (result.has(part.partId)) return result.get(part.partId);
    const parent =
      part.parentId === null ? null : resolveMatrix(byId.get(part.parentId));
    const pivot = partJoint(part);
    const radians = (-(rotations[part.partId] ?? 0) * Math.PI) / 180;
    const matrix = multiply(parent ?? identity(), around(pivot.x, pivot.y, radians));
    result.set(part.partId, matrix);
    return matrix;
  };
  for (const part of ordered) resolveMatrix(part);
  return result;
}

function pixelIndex(x, y) {
  const outputX = Math.floor(x + padding);
  const outputY = Math.floor(y + padding);
  return outputX < 0 || outputY < 0 || outputX >= width || outputY >= height
    ? null
    : outputY * width + outputX;
}

function partJoint(part) {
  return {
    x: part.originalRect.x + part.anchor.x * part.originalRect.width,
    y: part.originalRect.y + part.anchor.y * part.originalRect.height,
  };
}

function identity() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function around(x, y, radians) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: x - cosine * x + sine * y,
    f: y - sine * x - cosine * y,
  };
}

function multiply(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function invert(matrix) {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

function apply(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0
    ? { x: 0, y: 1 }
    : { x: vector.x / length, y: vector.y / length };
}

function compositeOver(target, targetOffset, source, sourceOffset) {
  const sourceAlpha = source[sourceOffset + 3] / 255;
  if (sourceAlpha === 0) return;
  const targetAlpha = target[targetOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    target[targetOffset + channel] = Math.round(
      (source[sourceOffset + channel] * sourceAlpha +
        target[targetOffset + channel] * targetAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    );
  }
  target[targetOffset + 3] = Math.round(outputAlpha * 255);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function round(value) {
  return Number(value.toFixed(6));
}

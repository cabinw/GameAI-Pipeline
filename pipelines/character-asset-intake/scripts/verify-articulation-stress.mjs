import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import sharp from "sharp";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(
  repositoryRoot,
  process.argv[2] ?? "examples/red-cap-target-remade",
);
const require = createRequire(import.meta.url);
const {
  intakeCharacterAssets,
  validateArticulationSafety,
} = require("../dist/index.js");

const [layout, provenance, specification] = await Promise.all([
  readJson(resolve(fixtureRoot, "rig-layout.json")),
  readJson(resolve(fixtureRoot, "asset-provenance.json")),
  readJson(resolve(fixtureRoot, "articulation-safety.json")),
]);
const intake = await intakeCharacterAssets({
  rigLayout: layout,
  sourceRoot: fixtureRoot,
  rigLayoutPath: resolve(fixtureRoot, "rig-layout.json"),
});
if (!intake.ok) {
  throw new Error(`Fixture intake failed: ${JSON.stringify(intake.diagnostics)}`);
}

const images = new Map();
for (const part of intake.manifest.parts) {
  images.set(
    part.partId,
    await sharp(part.resolvedPath, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  );
}
const padding = 140;
const outputWidth = layout.sourceCanvas.width + padding * 2;
const outputHeight = layout.sourceCanvas.height + padding * 2;
const ordered = [...intake.manifest.parts].sort(
  (left, right) =>
    left.drawOrder - right.drawOrder ||
    left.partId.localeCompare(right.partId),
);
const observations = [];
const outputRoot = resolve(fixtureRoot, "articulation");
await mkdir(outputRoot, { recursive: true });

for (const pose of specification.stressPoses) {
  const matrices = worldMatrices(intake.manifest.parts, pose.rotations);
  const masks = new Map();
  const composite = Buffer.alloc(outputWidth * outputHeight * 4);
  for (const part of ordered) {
    const mask = new Uint8Array(outputWidth * outputHeight);
    masks.set(part.partId, mask);
    renderPart(
      part,
      images.get(part.partId),
      matrices.get(part.partId),
      mask,
      composite,
    );
  }
  const joints = specification.joints.map((joint) => {
    const part = intake.manifest.parts.find(
      (candidate) => candidate.partId === joint.partId,
    );
    const pivot = partJoint(part);
    const worldPivot = apply(matrices.get(part.partId), pivot.x, pivot.y);
    const childMask = masks.get(joint.partId);
    const coverMask = masks.get(joint.coverPartId);
    let overlapPixelCount = 0;
    let proximalCovered = 0;
    let proximalPixelCount = 0;
    for (
      let y = Math.floor(worldPivot.y + padding - 60);
      y <= Math.ceil(worldPivot.y + padding + 60);
      y += 1
    ) {
      for (
        let x = Math.floor(worldPivot.x + padding - 60);
        x <= Math.ceil(worldPivot.x + padding + 60);
        x += 1
      ) {
        if (x < 0 || y < 0 || x >= outputWidth || y >= outputHeight) continue;
        const deltaX = x + 0.5 - (worldPivot.x + padding);
        const deltaY = y + 0.5 - (worldPivot.y + padding);
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        const index = y * outputWidth + x;
        if (
          distanceSquared <= 60 * 60 &&
          childMask[index] > 0 &&
          coverMask[index] > 0
        ) {
          overlapPixelCount += 1;
        }
        if (distanceSquared <= 9 * 9) {
          proximalPixelCount += 1;
          if (childMask[index] > 0 || coverMask[index] > 0) {
            proximalCovered += 1;
          }
        }
      }
    }
    return {
      jointId: joint.jointId,
      partId: joint.partId,
      coverPartId: joint.coverPartId,
      overlapPixelCount,
      proximalCoverageRatio: round(
        proximalCovered / Math.max(proximalPixelCount, 1),
      ),
    };
  });
  const hand = intake.manifest.parts.find(
    (candidate) => candidate.partId === "hand-right",
  );
  const briefcase = intake.manifest.parts.find(
    (candidate) => candidate.partId === "briefcase",
  );
  const briefcasePivot = partJoint(briefcase);
  const inheritedPivot = apply(
    matrices.get("hand-right"),
    briefcasePivot.x,
    briefcasePivot.y,
  );
  const actualPivot = apply(
    matrices.get("briefcase"),
    briefcasePivot.x,
    briefcasePivot.y,
  );
  const briefcaseAttachmentError = round(
    Math.hypot(
      inheritedPivot.x - actualPivot.x,
      inheritedPivot.y - actualPivot.y,
    ),
  );
  const png = await sharp(composite, {
    raw: { width: outputWidth, height: outputHeight, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await writeFile(resolve(outputRoot, `stress-${pose.poseId}.png`), png);
  observations.push({
    poseId: pose.poseId,
    joints,
    briefcaseAttachmentError,
  });
}

const diagnostics = validateArticulationSafety(
  intake.manifest,
  provenance,
  specification,
  { poses: observations },
);
const neutral = await decode(
  resolve(fixtureRoot, "provenance/flat-composite.png"),
);
const canonical = await decode(
  resolve(fixtureRoot, "reference/full_character.png"),
);
if (
  neutral.info.width !== canonical.info.width ||
  neutral.info.height !== canonical.info.height
) {
  throw new Error("Neutral composite and canonical reference dimensions differ.");
}
const neutralDiff = Buffer.alloc(neutral.data.length);
let neutralPixelDifferenceCount = 0;
for (let offset = 0; offset < neutral.data.length; offset += 4) {
  if (
    neutral.data[offset + 3] === 0 &&
    canonical.data[offset + 3] === 0
  ) {
    continue;
  }
  let differs = false;
  for (let channel = 0; channel < 4; channel += 1) {
    if (neutral.data[offset + channel] !== canonical.data[offset + channel]) {
      differs = true;
    }
  }
  if (differs) {
    neutralPixelDifferenceCount += 1;
    neutralDiff[offset] = 255;
    neutralDiff[offset + 3] = 255;
  }
}
await sharp(neutralDiff, {
  raw: {
    width: neutral.info.width,
    height: neutral.info.height,
    channels: 4,
  },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(resolve(outputRoot, "neutral-pixel-diff.png"));

const report = {
  schemaVersion: "1.0.0",
  status:
    diagnostics.length === 0 && neutralPixelDifferenceCount === 0
      ? "passed"
      : "failed",
  neutral: {
    canonical: "reference/full_character.png",
    composite: "provenance/flat-composite.png",
    diff: "articulation/neutral-pixel-diff.png",
    pixelDifferenceCount: neutralPixelDifferenceCount,
    canonicalPixelSha256: createHash("sha256")
      .update(canonical.data)
      .digest("hex"),
    compositePixelSha256: createHash("sha256")
      .update(neutral.data)
      .digest("hex"),
  },
  poses: observations,
  diagnostics,
};
await writeFile(
  resolve(outputRoot, "stress-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "passed") {
  process.exitCode = 1;
}

function worldMatrices(parts, rotations) {
  const byPartId = new Map(parts.map((part) => [part.partId, part]));
  const result = new Map();
  const resolveMatrix = (part) => {
    const existing = result.get(part.partId);
    if (existing !== undefined) return existing;
    const parent =
      part.parentId === null ? undefined : byPartId.get(part.parentId);
    const parentMatrix =
      parent === undefined ? identity() : resolveMatrix(parent);
    const pivot = partJoint(part);
    const radians = (-(rotations[part.partId] ?? 0) * Math.PI) / 180;
    const own = around(pivot.x, pivot.y, radians);
    const matrix = multiply(parentMatrix, own);
    result.set(part.partId, matrix);
    return matrix;
  };
  for (const part of parts) resolveMatrix(part);
  return result;
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
  const minX = Math.max(
    0,
    Math.floor(Math.min(...corners.map((point) => point.x)) + padding - 1),
  );
  const maxX = Math.min(
    outputWidth,
    Math.ceil(Math.max(...corners.map((point) => point.x)) + padding + 1),
  );
  const minY = Math.max(
    0,
    Math.floor(Math.min(...corners.map((point) => point.y)) + padding - 1),
  );
  const maxY = Math.min(
    outputHeight,
    Math.ceil(Math.max(...corners.map((point) => point.y)) + padding + 1),
  );
  const inverse = invert(matrix);
  for (let outputY = minY; outputY < maxY; outputY += 1) {
    for (let outputX = minX; outputX < maxX; outputX += 1) {
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
      const alpha = image.data[sourceOffset + 3] ?? 0;
      if (alpha === 0) continue;
      const outputIndex = outputY * outputWidth + outputX;
      const outputOffset = outputIndex * 4;
      mask[outputIndex] = alpha;
      const destinationAlpha = composite[outputOffset + 3] ?? 0;
      const sourceWeight = alpha / 255;
      const destinationWeight = (destinationAlpha / 255) * (1 - sourceWeight);
      const combined = sourceWeight + destinationWeight;
      for (let channel = 0; channel < 3; channel += 1) {
        composite[outputOffset + channel] =
          combined === 0
            ? 0
            : Math.round(
                ((image.data[sourceOffset + channel] ?? 0) * sourceWeight +
                  (composite[outputOffset + channel] ?? 0) *
                    destinationWeight) /
                  combined,
              );
      }
      composite[outputOffset + 3] = Math.round(combined * 255);
    }
  }
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

function partJoint(part) {
  return {
    x: part.originalRect.x + part.anchor.x * part.originalRect.width,
    y: part.originalRect.y + part.anchor.y * part.originalRect.height,
  };
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function decode(path) {
  return sharp(path, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

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
const invalidFixtureRoot = resolve(
  packageRoot,
  "test/fixtures/articulation-invalid",
);
const require = createRequire(import.meta.url);
const { intakeCharacterAssets, validateArticulationSafety } =
  require("../dist/index.js");

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
const pixelCount = outputWidth * outputHeight;
const ordered = [...intake.manifest.parts].sort(
  (left, right) => {
    return (
      left.drawOrder - right.drawOrder ||
      left.partId.localeCompare(right.partId)
    );
  },
);
const orderIndex = new Map(ordered.map((part, index) => [part.partId, index]));
const outputRoot = resolve(fixtureRoot, "articulation");
await mkdir(outputRoot, { recursive: true });

const neutralRender = renderScene({});
const neutralVisible = finalPartStats(neutralRender);
const neutralOwn = new Map(
  ordered.map((part) => [
    part.partId,
    maskStats(neutralRender.masks.get(part.partId)),
  ]),
);
const observations = [];
const acceptedBuffers = new Map();

for (const pose of specification.stressPoses) {
  const render = renderScene(pose.rotations);
  const visible = finalPartStats(render);
  const parts = ordered.map((part) => {
    const ownStats = maskStats(render.masks.get(part.partId));
    const expectedOwn = neutralOwn.get(part.partId);
    const expected = neutralVisible.get(part.partId);
    const actual = visible.get(part.partId);
    const transformed = hasRotatedSelfOrAncestor(
      part,
      pose.rotations,
      intake.manifest.parts,
    );
    return {
      partId: part.partId,
      renderedAlphaCount: ownStats.alphaCount,
      visibleAlphaCount: actual.alphaCount,
      sourceAlphaCount: sourceAlphaCount(images.get(part.partId)),
      renderedBounds: ownStats.bounds,
      expectedRenderedBounds: expectedOwn.bounds,
      visibleBounds: actual.bounds,
      expectedVisibleBounds: expected.bounds,
      expectedVisibleAlphaCount: expected.alphaCount,
      finalVisiblePixelCount: actual.alphaCount,
      expectedFinalVisiblePixelCount: expected.alphaCount,
      finalVisibleBounds: actual.bounds,
      expectedFinalVisibleBounds: expected.bounds,
      finalVisiblePixelHash: actual.hash,
      expectedFinalVisiblePixelHash: expected.hash,
      occludingParts: actual.occludingParts,
      expectedOccludingParts: expected.occludingParts,
      transformPreserved: matrixIsIdentity(render.matrices.get(part.partId)),
      hasRotatedAncestor: transformed,
      withinCanvas: render.withinCanvas.get(part.partId),
    };
  });
  const joints = specification.joints.map((joint) =>
    observeJoint(joint, render),
  );
  const briefcaseAttachmentError = attachmentError(render.matrices);
  const briefcaseConnected = masksTouchWithin(
    render.masks.get("hand-right"),
    render.masks.get("briefcase"),
    4,
  );
  const png = await sharp(render.composite, {
    raw: { width: outputWidth, height: outputHeight, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const encoded = await sharp(png, { failOn: "error" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const finalCompositePixelHash = sha256(render.composite);
  const encodedCompositePixelHash = sha256(encoded.data);
  const finalCompositeMatchesEncoded =
    encoded.info.width === outputWidth &&
    encoded.info.height === outputHeight &&
    encoded.data.equals(render.composite);
  const ownerCoverageMatchesComposite = ownerMatchesComposite(render);
  await writeFile(resolve(outputRoot, `stress-${pose.poseId}.png`), png);
  acceptedBuffers.set(pose.poseId, render.composite);
  observations.push({
    poseId: pose.poseId,
    parts,
    joints,
    briefcaseAttachmentError,
    briefcaseConnected,
    finalCompositePixelHash,
    encodedCompositePixelHash,
    finalCompositeMatchesEncoded,
    ownerCoverageMatchesComposite,
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
  if (neutral.data[offset + 3] === 0 && canonical.data[offset + 3] === 0) {
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

const rejectedRegressions = await Promise.all([
  analyzeRejectedFixture("task006-stress-positive.png", "combined-positive"),
  analyzeRejectedFixture("task006-stress-negative.png", "combined-negative"),
  analyzeRejectedFixture(
    "task0061-stress-combined-negative.png",
    "combined-negative",
  ),
  analyzeRejectedFixture(
    "task0061-stress-right-arm-negative.png",
    "right-arm-negative",
  ),
  analyzeRejectedFixture(
    "task0061-stress-right-leg-negative.png",
    "right-leg-negative",
  ),
  analyzeRejectedFixture(
    "task0061-stress-combined-positive.png",
    "combined-positive",
  ),
]);
const report = {
  schemaVersion: "1.1.0",
  status:
    diagnostics.length === 0 &&
    neutralPixelDifferenceCount === 0 &&
    rejectedRegressions.every((item) => item.status === "rejected")
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
  rejectedRegressions,
  poses: observations,
  diagnostics,
};
await writeFile(
  resolve(outputRoot, "stress-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status: report.status,
      poseCount: report.poses.length,
      neutralPixelDifferenceCount,
      rejectedRegressionCount: rejectedRegressions.filter(
        (item) => item.status === "rejected",
      ).length,
      diagnostics: Object.fromEntries(
        [...new Set(diagnostics.map((item) => item.code))].map((code) => [
          code,
          diagnostics.filter((item) => item.code === code).length,
        ]),
      ),
    },
    null,
    2,
  ),
);
if (report.status !== "passed") process.exitCode = 1;

function renderScene(rotations) {
  const matrices = worldMatrices(intake.manifest.parts, rotations);
  const masks = new Map();
  const withinCanvas = new Map();
  const composite = Buffer.alloc(pixelCount * 4);
  const owner = new Int16Array(pixelCount).fill(-1);
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
        owner,
        orderIndex.get(part.partId),
      ),
    );
  }
  return { matrices, masks, composite, owner, withinCanvas };
}

function observeJoint(joint, render) {
  const part = intake.manifest.parts.find(
    (candidate) => candidate.partId === joint.partId,
  );
  const cover = intake.manifest.parts.find(
    (candidate) => candidate.partId === joint.coverPartId,
  );
  const pivot = partJoint(part);
  const worldPivot = apply(render.matrices.get(part.partId), pivot.x, pivot.y);
  const center = {
    x: worldPivot.x + padding,
    y: worldPivot.y + padding,
  };
  const childMask = render.masks.get(joint.partId);
  const coverMask = render.masks.get(joint.coverPartId);
  // Thirty-two pixels is the maximum declared seam neighborhood. This is
  // intentionally far smaller than TASK-006's permissive 60-pixel search.
  const seamRadius = 32;
  let seamIntersectionPixelCount = 0;
  let nearestIntersectionDistance = null;
  let nearestIntersectionPoint = null;
  let broadIntersectionCount = 0;
  let broadIntersectionX = 0;
  let broadIntersectionY = 0;
  let proximalCovered = 0;
  let proximalPixelCount = 0;
  forEachDisk(center, seamRadius, (index, distanceSquared) => {
    if (childMask[index] > 0 && coverMask[index] > 0) {
      broadIntersectionCount += 1;
      broadIntersectionX += (index % outputWidth) + 0.5 - padding;
      broadIntersectionY +=
        Math.floor(index / outputWidth) + 0.5 - padding;
      seamIntersectionPixelCount += 1;
    }
    if (distanceSquared <= 8 * 8) {
      proximalPixelCount += 1;
      if (childMask[index] > 0 || coverMask[index] > 0) proximalCovered += 1;
    }
  });
  forEachDisk(center, 59, (index, distanceSquared) => {
    if (childMask[index] > 0 && coverMask[index] > 0) {
      const distance = Math.sqrt(distanceSquared);
      if (
        nearestIntersectionDistance === null ||
        distance < nearestIntersectionDistance
      ) {
        nearestIntersectionDistance = distance;
        nearestIntersectionPoint = {
          x: (index % outputWidth) + 0.5 - padding,
          y: Math.floor(index / outputWidth) + 0.5 - padding,
        };
      }
    }
  });
  const childCenter = apply(
    render.matrices.get(part.partId),
    part.originalRect.x + part.originalRect.width / 2,
    part.originalRect.y + part.originalRect.height / 2,
  );
  const direction = normalize({
    x: childCenter.x - worldPivot.x,
    y: childCenter.y - worldPivot.y,
  });
  const corridorTransparentCrossing = corridorHasGap(
    center,
    direction,
    childMask,
    coverMask,
  );
  const intersectionConnectedToChild = intersectionReachesPart(
    center,
    childMask,
    coverMask,
    childMask,
  );
  const intersectionConnectedToCover = intersectionReachesPart(
    center,
    childMask,
    coverMask,
    coverMask,
  );
  const branchConnected =
    seamIntersectionPixelCount > 0 &&
    intersectionConnectedToChild &&
    intersectionConnectedToCover &&
    (!corridorTransparentCrossing || seamIntersectionPixelCount >= 25);
  return {
    jointId: joint.jointId,
    partId: joint.partId,
    coverPartId: joint.coverPartId,
    overlapPixelCount: seamIntersectionPixelCount,
    proximalCoverageRatio: round(
      proximalCovered / Math.max(proximalPixelCount, 1),
    ),
    seamIntersectionPixelCount,
    nearestIntersectionDistance:
      nearestIntersectionDistance === null
        ? null
        : round(nearestIntersectionDistance),
    nearestIntersectionPoint,
    broadIntersectionCentroid:
      broadIntersectionCount === 0
        ? null
        : {
            x: round(broadIntersectionX / broadIntersectionCount),
            y: round(broadIntersectionY / broadIntersectionCount),
          },
    intersectionConnectedToChild,
    intersectionConnectedToCover,
    corridorTransparentCrossing,
    branchConnected,
    longestVisibleCutEdge: longestVisibleCutEdge(
      center,
      childMask,
      render.owner,
      orderIndex.get(joint.partId),
    ),
  };
}

function intersectionReachesPart(center, childMask, coverMask, targetMask) {
  const radius = 36;
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(outputWidth - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(outputHeight - 1, Math.ceil(center.y + radius));
  const seen = new Uint8Array((maxX - minX + 1) * (maxY - minY + 1));
  const queue = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const index = y * outputWidth + x;
      if (childMask[index] > 0 && coverMask[index] > 0) {
        queue.push(index);
        seen[(y - minY) * (maxX - minX + 1) + x - minX] = 1;
      }
    }
  }
  let reaches = false;
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);
    if (
      targetMask[index] > 0 &&
      Math.hypot(x + 0.5 - center.x, y + 0.5 - center.y) >= 20
    ) {
      reaches = true;
    }
    for (const [nextX, nextY] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (
        nextX < minX ||
        nextX > maxX ||
        nextY < minY ||
        nextY > maxY
      ) {
        continue;
      }
      const local =
        (nextY - minY) * (maxX - minX + 1) + nextX - minX;
      const next = nextY * outputWidth + nextX;
      if (seen[local] || targetMask[next] === 0) continue;
      seen[local] = 1;
      queue.push(next);
    }
  }
  return reaches;
}

function corridorHasGap(center, direction, childMask, coverMask) {
  const perpendicular = { x: -direction.y, y: direction.x };
  for (let distance = -6; distance <= 10; distance += 1) {
    let covered = false;
    for (let width = -4; width <= 4; width += 1) {
      const x = Math.round(
        center.x + direction.x * distance + perpendicular.x * width,
      );
      const y = Math.round(
        center.y + direction.y * distance + perpendicular.y * width,
      );
      if (x < 0 || y < 0 || x >= outputWidth || y >= outputHeight) continue;
      const index = y * outputWidth + x;
      if (childMask[index] > 0 || coverMask[index] > 0) {
        covered = true;
        break;
      }
    }
    if (!covered) return true;
  }
  return false;
}

function longestVisibleCutEdge(center, mask, owner, partIndex) {
  const points = new Set();
  const radius = 20;
  forEachDisk(center, radius, (index) => {
    if (mask[index] === 0 || owner[index] !== partIndex) return;
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);
    if (
      [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(
        ([nextX, nextY]) =>
          nextX < 0 ||
          nextY < 0 ||
          nextX >= outputWidth ||
          nextY >= outputHeight ||
          mask[nextY * outputWidth + nextX] === 0,
      )
    ) {
      points.add(`${x}:${y}`);
    }
  });
  let longest = 0;
  for (const key of points) {
    const [x, y] = key.split(":").map(Number);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ]) {
      if (points.has(`${x - dx}:${y - dy}`)) continue;
      let length = 0;
      while (points.has(`${x + dx * length}:${y + dy * length}`)) length += 1;
      longest = Math.max(longest, length);
    }
  }
  return longest;
}

async function analyzeRejectedFixture(filename, acceptedPoseId) {
  const rejected = await decode(resolve(invalidFixtureRoot, filename));
  const accepted = acceptedBuffers.get(acceptedPoseId);
  if (
    rejected.info.width !== outputWidth ||
    rejected.info.height !== outputHeight
  ) {
    return {
      fixture: filename,
      status: "rejected",
      diagnostics: ["ARTICULATION_PART_OUT_OF_BOUNDS"],
      pixelDifferenceCount: pixelCount,
    };
  }
  let pixelDifferenceCount = 0;
  let unexpectedAlphaLoss = 0;
  for (let offset = 0; offset < accepted.length; offset += 4) {
    let differs = false;
    for (let channel = 0; channel < 4; channel += 1) {
      if (accepted[offset + channel] !== rejected.data[offset + channel]) {
        differs = true;
      }
    }
    if (differs) pixelDifferenceCount += 1;
    if (accepted[offset + 3] > 0 && rejected.data[offset + 3] === 0) {
      unexpectedAlphaLoss += 1;
    }
  }
  const regressionDiagnostics = [];
  if (unexpectedAlphaLoss > 0) {
    regressionDiagnostics.push("ARTICULATION_FINAL_PART_INVISIBLE");
  }
  if (pixelDifferenceCount > unexpectedAlphaLoss) {
    regressionDiagnostics.push("ARTICULATION_FINAL_COMPOSITE_MISMATCH");
  }
  return {
    fixture: filename,
    acceptedPoseId,
    status: regressionDiagnostics.length > 0 ? "rejected" : "unexpected-pass",
    diagnostics: regressionDiagnostics,
    pixelDifferenceCount,
    unexpectedAlphaLoss,
  };
}

function finalPartStats(render) {
  const stats = new Map(
    ordered.map((part) => [
      part.partId,
      {
        alphaCount: 0,
        minX: outputWidth,
        minY: outputHeight,
        maxX: -1,
        maxY: -1,
        visiblePixels: [],
        occluders: new Map(),
      },
    ]),
  );
  for (let index = 0; index < render.owner.length; index += 1) {
    const partIndex = render.owner[index];
    if (partIndex < 0) continue;
    const stat = stats.get(ordered[partIndex].partId);
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);
    stat.alphaCount += 1;
    stat.minX = Math.min(stat.minX, x);
    stat.minY = Math.min(stat.minY, y);
    stat.maxX = Math.max(stat.maxX, x);
    stat.maxY = Math.max(stat.maxY, y);
    const offset = index * 4;
    stat.visiblePixels.push(
      index,
      render.composite[offset],
      render.composite[offset + 1],
      render.composite[offset + 2],
      render.composite[offset + 3],
    );
  }
  for (const [partIndex, part] of ordered.entries()) {
    const stat = stats.get(part.partId);
    const mask = render.masks.get(part.partId);
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index] === 0 || render.owner[index] === partIndex) continue;
      const occluderIndex = render.owner[index];
      const occluder =
        occluderIndex < 0 ? "__transparent__" : ordered[occluderIndex].partId;
      stat.occluders.set(
        occluder,
        (stat.occluders.get(occluder) ?? 0) + 1,
      );
    }
  }
  return new Map(
    [...stats].map(([partId, stat]) => [
      partId,
      {
        alphaCount: stat.alphaCount,
        hash: sha256(JSON.stringify(stat.visiblePixels)),
        occludingParts: [...stat.occluders]
          .map(([partId, pixelCount]) => ({ partId, pixelCount }))
          .sort((left, right) => left.partId.localeCompare(right.partId)),
        bounds:
          stat.alphaCount === 0
            ? null
            : {
                x: stat.minX,
                y: stat.minY,
                width: stat.maxX - stat.minX + 1,
                height: stat.maxY - stat.minY + 1,
              },
      },
    ]),
  );
}

function ownerMatchesComposite(render) {
  for (let index = 0; index < render.owner.length; index += 1) {
    const hasOwner = render.owner[index] >= 0;
    const hasAlpha = render.composite[index * 4 + 3] > 0;
    if (hasOwner !== hasAlpha) return false;
  }
  return true;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maskStats(mask) {
  let alphaCount = 0;
  let minX = outputWidth;
  let minY = outputHeight;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue;
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);
    alphaCount += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    alphaCount,
    bounds:
      alphaCount === 0
        ? null
        : {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
  };
}

function sourceAlphaCount(image) {
  let count = 0;
  for (let offset = 3; offset < image.data.length; offset += 4) {
    if (image.data[offset] > 0) count += 1;
  }
  return count;
}

function hasRotatedSelfOrAncestor(part, rotations, parts) {
  const byPartId = new Map(parts.map((item) => [item.partId, item]));
  let current = part;
  while (current !== undefined) {
    if ((rotations[current.partId] ?? 0) !== 0) return true;
    current =
      current.parentId === null ? undefined : byPartId.get(current.parentId);
  }
  return false;
}

function masksTouchWithin(left, right, distance) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === 0) continue;
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);
    for (let dy = -distance; dy <= distance; dy += 1) {
      for (let dx = -distance; dx <= distance; dx += 1) {
        if (dx * dx + dy * dy > distance * distance) continue;
        const nextX = x + dx;
        const nextY = y + dy;
        if (
          nextX >= 0 &&
          nextY >= 0 &&
          nextX < outputWidth &&
          nextY < outputHeight &&
          right[nextY * outputWidth + nextX] > 0
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function attachmentError(matrices) {
  const briefcase = intake.manifest.parts.find(
    (candidate) => candidate.partId === "briefcase",
  );
  const pivot = partJoint(briefcase);
  const inherited = apply(matrices.get("hand-right"), pivot.x, pivot.y);
  const actual = apply(matrices.get("briefcase"), pivot.x, pivot.y);
  return round(Math.hypot(inherited.x - actual.x, inherited.y - actual.y));
}

function forEachDisk(center, radius, callback) {
  for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y += 1) {
    for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x += 1) {
      if (x < 0 || y < 0 || x >= outputWidth || y >= outputHeight) continue;
      const dx = x + 0.5 - center.x;
      const dy = y + 0.5 - center.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= radius * radius) {
        callback(y * outputWidth + x, distanceSquared);
      }
    }
  }
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0
    ? { x: 0, y: 1 }
    : { x: vector.x / length, y: vector.y / length };
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

function renderPart(part, image, matrix, mask, composite, owner, partIndex) {
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
    rawMaxX <= outputWidth &&
    rawMaxY <= outputHeight;
  const minX = Math.max(0, rawMinX);
  const maxX = Math.min(outputWidth, rawMaxX);
  const minY = Math.max(0, rawMinY);
  const maxY = Math.min(outputHeight, rawMaxY);
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
      owner[outputIndex] = partIndex;
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
  return withinCanvas;
}

function matrixIsIdentity(matrix) {
  return (
    Math.abs(matrix.a - 1) < 1e-9 &&
    Math.abs(matrix.b) < 1e-9 &&
    Math.abs(matrix.c) < 1e-9 &&
    Math.abs(matrix.d - 1) < 1e-9 &&
    Math.abs(matrix.e) < 1e-9 &&
    Math.abs(matrix.f) < 1e-9
  );
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

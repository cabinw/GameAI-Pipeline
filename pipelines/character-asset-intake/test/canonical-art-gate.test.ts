import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  AssetDiagnosticCode,
  auditCanonicalArt,
  intakeCharacterAssets,
  type CanonicalArtProvenance,
  type CharacterAssetManifest,
  type CharacterAssetPart,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");

interface FixturePart {
  partId: string;
  rect: { x: number; y: number; width: number; height: number };
  pixels: Buffer;
}

function rgba(
  width: number,
  height: number,
  fill: { r: number; g: number; b: number; a: number },
): Buffer {
  const result = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < result.length; offset += 4) {
    result[offset] = fill.r;
    result[offset + 1] = fill.g;
    result[offset + 2] = fill.b;
    result[offset + 3] = fill.a;
  }
  return result;
}

function setPixel(
  pixels: Buffer,
  width: number,
  x: number,
  y: number,
  value: { r: number; g: number; b: number; a: number },
): void {
  const offset = (y * width + x) * 4;
  pixels[offset] = value.r;
  pixels[offset + 1] = value.g;
  pixels[offset + 2] = value.b;
  pixels[offset + 3] = value.a;
}

async function png(pixels: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function manifestPart(
  root: string,
  fixture: FixturePart,
  drawOrder: number,
): CharacterAssetPart {
  return {
    partId: fixture.partId,
    parentId: drawOrder === 0 ? null : "base",
    sourceRelativePath: `parts/${fixture.partId}.png`,
    resolvedPath: path.join(root, `parts/${fixture.partId}.png`),
    imageFormat: "png",
    width: fixture.rect.width,
    height: fixture.rect.height,
    hasAlpha: true,
    hasTransparency: true,
    transparentPixelCount: 1,
    contentBounds: {
      x: 0,
      y: 0,
      width: fixture.rect.width,
      height: fixture.rect.height,
    },
    originalRect: { ...fixture.rect },
    trimOffset: { x: 0, y: 0 },
    anchor: { x: 0.5, y: 0.5 },
    restPose: {
      position: { x: 0, y: 0 },
      rotationDegrees: 0,
      scale: { x: 1, y: 1 },
      opacity: 1,
    },
    drawOrder,
  };
}

async function fixture(
  canonical: Buffer,
  parts: readonly FixturePart[],
  hiddenExtensions: CanonicalArtProvenance["hiddenExtensions"] = [],
): Promise<{
  root: string;
  manifest: CharacterAssetManifest;
  provenance: CanonicalArtProvenance;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "gameai-canonical-art-"));
  await mkdir(path.join(root, "parts"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await writeFile(path.join(root, "reference/canonical-reference.png"), canonical);
  for (const part of parts) {
    await writeFile(
      path.join(root, `parts/${part.partId}.png`),
      await png(part.pixels, part.rect.width, part.rect.height),
    );
  }
  const manifest: CharacterAssetManifest = {
    characterId: "canonical-test",
    schemaVersions: { characterRig: "1.0.0", rigLayout: "1.0.0" },
    sourceRoot: root,
    characterRig: {
      sourceRelativePath: "character-rig.json",
      resolvedPath: path.join(root, "character-rig.json"),
    },
    rigLayout: {
      sourceRelativePath: "rig-layout.json",
      resolvedPath: path.join(root, "rig-layout.json"),
    },
    sourceCanvas: { width: 4, height: 4 },
    referenceScale: 1,
    drawOrderPolicy: "unique",
    visualPlacementMode: "source-canvas-rect",
    parts: parts.map((part, index) => manifestPart(root, part, index)),
    sockets: [],
    hitAreas: [],
  };
  return {
    root,
    manifest,
    provenance: {
      schemaVersion: "1.0.0",
      canonicalReference: "reference/canonical-reference.png",
      drawOrder: parts.map((part) => part.partId),
      hiddenExtensions,
      tolerance: {
        maxChannelDelta: 2,
        maxVisiblePixelMismatchRatio: 0.001,
        maxSilhouetteMismatchRatio: 0,
        minExactCanonicalPixelRatio: 0.999,
      },
    },
  };
}

test("passes direct canonical extraction and emits deterministic PNG artifacts", async () => {
  const pixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(pixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  const value = await fixture(await png(pixels, 4, 4), [
    {
      partId: "base",
      rect: { x: 0, y: 0, width: 4, height: 4 },
      pixels,
    },
  ]);
  try {
    const result = await auditCanonicalArt(value);
    const repeated = await auditCanonicalArt(value);
    assert.equal(result.ok, true);
    assert.deepEqual(repeated, result);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.report.status, "passed");
    assert.equal(result.report.mismatchPercentage, 0);
    assert.deepEqual(result.report.mismatchedParts, []);
    const compositeMetadata = await sharp(
      result.artifacts.flatCompositePng,
    ).metadata();
    assert.equal(compositeMetadata.width, 4);
    assert.equal(compositeMetadata.height, 4);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("passes all remade Red Cap parts with byte-stable canonical metrics", async () => {
  const sourceRoot = path.join(repositoryRoot, "examples/red-cap-target-remade");
  const intake = await intakeCharacterAssets({ sourceRoot });
  assert.equal(intake.ok, true);
  if (!intake.ok) return;
  const provenance = JSON.parse(
    await readFile(path.join(sourceRoot, "asset-provenance.json"), "utf8"),
  ) as CanonicalArtProvenance;
  const result = await auditCanonicalArt({
    manifest: intake.manifest,
    provenance,
  });
  assert.equal(result.ok, true);
  assert.notEqual(result.report, null);
  assert.equal(result.report?.status, "passed");
  assert.equal(result.report?.mismatchPercentage, 0);
  assert.equal(result.report?.silhouetteMismatchRatio, 0);
  assert.equal(result.report?.visiblePixelMismatchRatio, 0);
  assert.deepEqual(result.report?.mismatchedParts, []);
  assert.ok(
    result.report?.parts.every(
      (part) =>
        part.directCanonicalPixels === true &&
        part.exactCanonicalPixelRatio === 1 &&
        part.generatedVisiblePixelCount === 0,
    ),
  );
  assert.deepEqual(result.diagnostics, []);
});

test("assigns every canonical Red Cap pixel to exactly one nonempty part", async () => {
  const sourceRoot = path.join(repositoryRoot, "examples/red-cap-target-remade");
  const extraction = JSON.parse(
    await readFile(
      path.join(
        sourceRoot,
        "provenance/canonical-extraction-manifest.json",
      ),
      "utf8",
    ),
  ) as {
    canonicalVisiblePixelCount: number;
    assignedVisiblePixelCount: number;
    parts: Array<{
      partId: string;
      sourceFile: string;
      originalRect: { x: number; y: number; width: number; height: number };
      visiblePixelCount: number;
      sha256: string;
    }>;
  };
  const { data: canonical, info } = await sharp(
    path.join(sourceRoot, "reference/full_character.png"),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const owners = new Uint8Array(info.width * info.height);
  assert.equal(extraction.parts.length, 19);
  assert.equal(extraction.canonicalVisiblePixelCount, 162968);
  assert.equal(
    extraction.assignedVisiblePixelCount,
    extraction.canonicalVisiblePixelCount,
  );

  for (const part of extraction.parts) {
    const encoded = await readFile(path.join(sourceRoot, part.sourceFile));
    assert.equal(
      createHash("sha256").update(encoded).digest("hex"),
      part.sha256,
      part.partId,
    );
    const decoded = await sharp(encoded)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.width, part.originalRect.width, part.partId);
    assert.equal(decoded.info.height, part.originalRect.height, part.partId);
    let visiblePixelCount = 0;
    for (let y = 0; y < decoded.info.height; y += 1) {
      for (let x = 0; x < decoded.info.width; x += 1) {
        const partOffset = (y * decoded.info.width + x) * 4;
        if (decoded.data[partOffset + 3] === 0) continue;
        visiblePixelCount += 1;
        const sourceX = part.originalRect.x + x;
        const sourceY = part.originalRect.y + y;
        const sourceIndex = sourceY * info.width + sourceX;
        const sourceOffset = sourceIndex * 4;
        assert.deepEqual(
          decoded.data.subarray(partOffset, partOffset + 4),
          canonical.subarray(sourceOffset, sourceOffset + 4),
          `${part.partId}@${sourceX},${sourceY}`,
        );
        owners[sourceIndex] = (owners[sourceIndex] ?? 0) + 1;
      }
    }
    assert.equal(visiblePixelCount, part.visiblePixelCount, part.partId);
    assert.ok(visiblePixelCount > 0, part.partId);
  }

  for (let index = 0; index < owners.length; index += 1) {
    assert.equal(
      owners[index],
      canonical[index * 4 + 3] === 0 ? 0 : 1,
      `canonical pixel ${index}`,
    );
  }
});

test("fails closed when the canonical transparent PNG is missing", async () => {
  const pixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(pixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  const value = await fixture(await png(pixels, 4, 4), [
    {
      partId: "base",
      rect: { x: 0, y: 0, width: 4, height: 4 },
      pixels,
    },
  ]);
  value.provenance.canonicalReference = "reference/missing.png";
  try {
    const result = await auditCanonicalArt(value);
    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics[0]?.code,
      AssetDiagnosticCode.CANONICAL_REFERENCE_MISSING,
    );
    assert.equal(result.report, null);
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("rejects a visible color substitution with provenance and pixel-diff codes", async () => {
  const canonicalPixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(canonicalPixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  const substituted = Buffer.from(canonicalPixels);
  setPixel(substituted, 4, 2, 2, { r: 20, g: 30, b: 190, a: 255 });
  const value = await fixture(await png(canonicalPixels, 4, 4), [
    {
      partId: "base",
      rect: { x: 0, y: 0, width: 4, height: 4 },
      pixels: substituted,
    },
  ]);
  try {
    const result = await auditCanonicalArt(value);
    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some(
        (item) => item.code === AssetDiagnosticCode.PART_PIXEL_PROVENANCE_MISMATCH,
      ),
    );
    assert.ok(
      result.diagnostics.some(
        (item) => item.code === AssetDiagnosticCode.FLAT_COMPOSITE_PIXEL_DIFF_EXCEEDED,
      ),
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("rejects generated pixels visible outside the canonical silhouette", async () => {
  const canonicalPixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(canonicalPixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  const extended = Buffer.from(canonicalPixels);
  setPixel(extended, 4, 0, 0, { r: 190, g: 20, b: 30, a: 255 });
  const value = await fixture(await png(canonicalPixels, 4, 4), [
    {
      partId: "base",
      rect: { x: 0, y: 0, width: 4, height: 4 },
      pixels: extended,
    },
  ]);
  try {
    const result = await auditCanonicalArt(value);
    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some(
        (item) =>
          item.code === AssetDiagnosticCode.UNDECLARED_GENERATED_VISIBLE_REGION,
      ),
    );
    assert.ok(
      result.diagnostics.some(
        (item) =>
          item.code === AssetDiagnosticCode.FLAT_COMPOSITE_SILHOUETTE_MISMATCH,
      ),
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("allows a declared generated extension only while a higher part covers it", async () => {
  const canonicalPixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(canonicalPixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  for (let y = 1; y < 3; y += 1) {
    for (let x = 1; x < 3; x += 1) {
      setPixel(canonicalPixels, 4, x, y, { r: 20, g: 150, b: 50, a: 255 });
    }
  }
  const base = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(base, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  for (let y = 1; y < 3; y += 1) {
    for (let x = 1; x < 3; x += 1) {
      setPixel(base, 4, x, y, { r: 50, g: 60, b: 220, a: 255 });
    }
  }
  const cover = rgba(2, 2, { r: 20, g: 150, b: 50, a: 255 });
  const value = await fixture(
    await png(canonicalPixels, 4, 4),
    [
      {
        partId: "base",
        rect: { x: 0, y: 0, width: 4, height: 4 },
        pixels: base,
      },
      {
        partId: "cover",
        rect: { x: 1, y: 1, width: 2, height: 2 },
        pixels: cover,
      },
    ],
    [{ partId: "base", regions: [{ x: 1, y: 1, width: 2, height: 2 }] }],
  );
  try {
    const result = await auditCanonicalArt(value);
    assert.equal(result.ok, true);
    assert.equal(
      result.report.parts.find((part) => part.partId === "base")
        ?.ignoredDeclaredHiddenPixelCount,
      4,
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

test("rejects a declared extension when it remains visible in the neutral pose", async () => {
  const canonicalPixels = rgba(4, 4, { r: 190, g: 20, b: 30, a: 255 });
  setPixel(canonicalPixels, 4, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
  const value = await fixture(
    await png(canonicalPixels, 4, 4),
    [
      {
        partId: "base",
        rect: { x: 0, y: 0, width: 4, height: 4 },
        pixels: canonicalPixels,
      },
    ],
    [{ partId: "base", regions: [{ x: 1, y: 1, width: 1, height: 1 }] }],
  );
  try {
    const result = await auditCanonicalArt(value);
    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some(
        (item) =>
          item.code === AssetDiagnosticCode.UNDECLARED_GENERATED_VISIBLE_REGION,
      ),
    );
  } finally {
    await rm(value.root, { recursive: true, force: true });
  }
});

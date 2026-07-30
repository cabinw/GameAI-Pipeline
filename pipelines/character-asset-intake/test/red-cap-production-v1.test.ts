import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseCharacterContract } from "@gameai/character-contracts";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-production-v1");
const generator = path.join(
  packageRoot,
  "scripts/generate-red-cap-production-v1.mjs",
);
const staticVerifier = path.join(
  packageRoot,
  "scripts/verify-red-cap-production-static.mjs",
);

interface AuthorityPart {
  partId: string;
  parent: string | null;
  pivotCandidate: [number, number];
  drawOrder: number;
  visibleAuthority: {
    file: string;
    sourceRect: [number, number, number, number];
    visibleRegion: [number, number][];
  };
  hiddenOverlapRegion: [number, number][];
  confidence: number;
}

const authority = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source-authority-map.json"), "utf8"),
) as {
  fallbackPartId: string;
  ownershipOrder: string[];
  drawOrder: string[];
  parts: AuthorityPart[];
  audit: {
    status: string;
    requiredParts: number;
    mappedParts: number;
    missingSegments: string[];
    ambiguousAcceptedConnectors: string[];
  };
};
const generatedFiles = [
  "character-rig.json",
  "rig-layout.json",
  "reference/reconstructed-neutral.png",
  "reference/reconstruction-report.json",
  "provenance/part-ownership.png",
  "provenance/generated-manifest.json",
  "atlas/parts-atlas.png",
  ...authority.parts.map((part) => `parts/${part.partId}.png`),
].sort();

async function digests(): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      generatedFiles.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(fixtureRoot, file)))
          .digest("hex"),
      ]),
    ),
  );
}

test("locks reviewed rights, governed hashes, and complete source authority", async () => {
  const provenanceBytes = await readFile(
    path.join(fixtureRoot, "source/provenance.json"),
  );
  const provenance = JSON.parse(provenanceBytes.toString()) as {
    rightsReview: {
      status: string;
      commercialUseAllowed: boolean;
      modificationAllowed: boolean;
      redistributionAllowed: boolean;
    };
    files: Array<{ path: string; sha256: string }>;
  };
  assert.deepEqual(provenance.rightsReview, {
    ...provenance.rightsReview,
    status: "confirmed-by-project-owner",
    commercialUseAllowed: true,
    modificationAllowed: true,
    redistributionAllowed: true,
  });
  const assertion = await readFile(
    path.join(fixtureRoot, "source/rights-assertion.md"),
    "utf8",
  );
  assert.match(
    assertion,
    new RegExp(
      createHash("sha256").update(provenanceBytes).digest("hex"),
    ),
  );
  assert.equal((assertion.match(/- \[x\]/g) ?? []).length, 5);
  for (const file of provenance.files) {
    const actual = createHash("sha256")
      .update(await readFile(path.join(fixtureRoot, "source", file.path)))
      .digest("hex");
    assert.equal(actual, file.sha256, file.path);
  }

  assert.equal(authority.parts.length, 19);
  assert.equal(new Set(authority.parts.map((part) => part.partId)).size, 19);
  assert.equal(new Set(authority.parts.map((part) => part.drawOrder)).size, 19);
  assert.equal(authority.ownershipOrder.length, 19);
  assert.equal(new Set(authority.ownershipOrder).size, 19);
  assert.deepEqual(authority.audit, {
    ...authority.audit,
    status: "passed",
    requiredParts: 19,
    mappedParts: 19,
    missingSegments: [],
    ambiguousAcceptedConnectors: [],
  });
  for (const part of authority.parts) {
    assert.ok(part.confidence >= 0.95, part.partId);
    assert.ok(part.visibleAuthority.visibleRegion.length >= 3, part.partId);
    assert.ok(part.hiddenOverlapRegion.length >= 3, part.partId);
    if (part.parent !== null) {
      assert.ok(
        authority.parts.some((candidate) => candidate.partId === part.parent),
        part.partId,
      );
    }
  }
});

test("regenerates exact master-owned parts and byte-stable closure", async () => {
  const before = await digests();
  await execFileAsync(process.execPath, [generator], { cwd: packageRoot });
  assert.deepEqual(await digests(), before);

  const report = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "reference/reconstruction-report.json"),
      "utf8",
    ),
  ) as {
    status: string;
    visiblePixelCount: number;
    assignedVisiblePixelCount: number;
    duplicateOwnershipPixelCount: number;
    alphaSilhouetteIoU: number;
    alphaMismatchPixels: number;
    rgbaMismatchPixels: number;
    maximumChannelDelta: number;
    parts: Array<{
      partId: string;
      visiblePixelCount: number;
      duplicatedHiddenPixelCount: number;
    }>;
  };
  assert.deepEqual(
    {
      status: report.status,
      visiblePixelCount: report.visiblePixelCount,
      assignedVisiblePixelCount: report.assignedVisiblePixelCount,
      duplicateOwnershipPixelCount: report.duplicateOwnershipPixelCount,
      alphaSilhouetteIoU: report.alphaSilhouetteIoU,
      alphaMismatchPixels: report.alphaMismatchPixels,
      rgbaMismatchPixels: report.rgbaMismatchPixels,
      maximumChannelDelta: report.maximumChannelDelta,
    },
    {
      status: "passed",
      visiblePixelCount: 282476,
      assignedVisiblePixelCount: 282476,
      duplicateOwnershipPixelCount: 0,
      alphaSilhouetteIoU: 1,
      alphaMismatchPixels: 0,
      rgbaMismatchPixels: 0,
      maximumChannelDelta: 0,
    },
  );
  assert.equal(report.parts.length, 19);
  for (const part of report.parts) {
    assert.ok(part.visiblePixelCount > 0, part.partId);
  }
  for (const partId of [
    "upper-arm-left",
    "upper-arm-right",
    "forearm-left",
    "forearm-right",
    "thigh-left",
    "thigh-right",
    "shin-left",
    "shin-right",
  ]) {
    assert.ok(
      report.parts.find((part) => part.partId === partId)!.visiblePixelCount >=
        2500,
      partId,
    );
  }
});

test("validates the 19-part rig, source canvas, pivots, and sprite geometry", async () => {
  const contract = parseCharacterContract(
    await readFile(path.join(fixtureRoot, "character-rig.json"), "utf8"),
    await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
  );
  assert.equal(contract.ok, true, JSON.stringify(contract));
  const layout = JSON.parse(
    await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
  ) as {
    sourceCanvas: { width: number; height: number };
    visualPlacementMode: string;
    parts: Array<{
      partId: string;
      parentId: string | null;
      file: string;
      originalRect: { width: number; height: number };
      anchor: { x: number; y: number };
    }>;
  };
  assert.deepEqual(layout.sourceCanvas, { width: 1254, height: 1254 });
  assert.equal(layout.visualPlacementMode, "source-canvas-rect");
  assert.equal(layout.parts.length, 19);
  assert.equal(
    layout.parts.filter((part) => part.parentId === null)[0]?.partId,
    "pelvis",
  );
  for (const part of layout.parts) {
    assert.ok(part.anchor.x >= 0 && part.anchor.x <= 1, part.partId);
    assert.ok(part.anchor.y >= 0 && part.anchor.y <= 1, part.partId);
    const metadata = await sharp(path.join(fixtureRoot, part.file)).metadata();
    assert.equal(metadata.width, part.originalRect.width, part.partId);
    assert.equal(metadata.height, part.originalRect.height, part.partId);
    assert.equal(metadata.hasAlpha, true, part.partId);
  }
});

test("packs every generated part once into the deterministic Creator atlas", async () => {
  const report = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "reference/reconstruction-report.json"),
      "utf8",
    ),
  ) as {
    atlas: {
    image: string;
    width: number;
    height: number;
    padding: number;
    coordinateSystem: string;
    parts: Array<{
      partId: string;
      rect: { x: number; y: number; width: number; height: number };
      pivot: { x: number; y: number };
      drawOrder: number;
    }>;
    };
  };
  const atlas = report.atlas;
  assert.equal(atlas.coordinateSystem, "top-left");
  assert.equal(atlas.parts.length, 19);
  assert.equal(new Set(atlas.parts.map((part) => part.partId)).size, 19);
  assert.equal(new Set(atlas.parts.map((part) => part.drawOrder)).size, 19);
  const metadata = await sharp(
    path.join(fixtureRoot, "atlas", atlas.image),
  ).metadata();
  assert.equal(metadata.width, atlas.width);
  assert.equal(metadata.height, atlas.height);
  assert.equal(metadata.hasAlpha, true);
  for (const part of atlas.parts) {
    assert.ok(part.rect.x >= atlas.padding, part.partId);
    assert.ok(part.rect.y >= atlas.padding, part.partId);
    assert.ok(part.rect.x + part.rect.width <= atlas.width, part.partId);
    assert.ok(part.rect.y + part.rect.height <= atlas.height, part.partId);
    assert.ok(part.pivot.x >= 0 && part.pivot.x <= 1, part.partId);
    assert.ok(part.pivot.y >= 0 && part.pivot.y <= 1, part.partId);
  }
  for (let left = 0; left < atlas.parts.length; left += 1) {
    for (let right = left + 1; right < atlas.parts.length; right += 1) {
      const leftPart = atlas.parts[left]!;
      const rightPart = atlas.parts[right]!;
      const a = leftPart.rect;
      const b = rightPart.rect;
      assert.ok(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
        `${leftPart.partId}/${rightPart.partId}`,
      );
    }
  }
});

test("passes byte-stable positive and negative joint-seam stress", async () => {
  const files = [
    "reference/static-stress-positive.png",
    "reference/static-stress-report.json",
  ];
  const before = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(fixtureRoot, file)))
          .digest("hex"),
      ]),
    ),
  );
  await execFileAsync(process.execPath, [staticVerifier], { cwd: packageRoot });
  const after = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(fixtureRoot, file)))
          .digest("hex"),
      ]),
    ),
  );
  assert.deepEqual(after, before);
  const report = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "reference/static-stress-report.json"),
      "utf8",
    ),
  ) as {
    status: string;
    failures: string[];
    poses: Array<{
      joints: Array<{
        intersectionPixelCount: number;
        overlapOrContactPixelCount: number;
        coverageRatio: number;
        transparentTwoPixelCrossing: boolean;
      }>;
      withinCanvas: Array<{ value: boolean }>;
    }>;
  };
  assert.equal(report.status, "passed");
  assert.deepEqual(report.failures, []);
  assert.equal(report.poses.length, 2);
  for (const pose of report.poses) {
    assert.equal(pose.joints.length, 12);
    assert.ok(pose.withinCanvas.every((part) => part.value));
    for (const joint of pose.joints) {
      assert.ok(joint.coverageRatio >= 0.65);
      assert.equal(joint.transparentTwoPixelCrossing, false);
    }
  }
});

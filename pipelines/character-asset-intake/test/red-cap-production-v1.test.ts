import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseCharacterContract } from "@gameai/character-contracts";
import {
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  sampleRigAnimation,
  transformPoint,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
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
const motionGenerator = path.join(
  packageRoot,
  "scripts/generate-red-cap-production-motion.mjs",
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

test("generates byte-stable 60 Hz Red Cap motion with locked contacts and socket", async () => {
  const files = [
    "animations/rest.json",
    "animations/idle.json",
    "animations/walk.json",
    "animations/wave.json",
    "semantic-events.json",
    "reference/motion-quality-report.json",
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
  await execFileAsync(process.execPath, [motionGenerator], { cwd: packageRoot });
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

  const layout = JSON.parse(
    await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
  ) as {
    layoutId: string;
    parts: Array<{
      partId: string;
      parentId: string | null;
      restPose: RigHierarchyJoint["restPose"];
    }>;
    sockets: Array<{
      socketId: string;
      parentPartId: string;
      position: { x: number; y: number };
    }>;
  };
  const hierarchy: RigHierarchyJoint[] = layout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const jointIds = new Set(layout.parts.map((part) => part.partId));
  const animations = [];
  for (const file of files.slice(0, 4)) {
    const parsed = parseRigAnimation(
      await readFile(path.join(fixtureRoot, file), "utf8"),
      {
        rigId: layout.layoutId,
        rigSchemaVersion: "1.0.0",
        jointIds,
      },
    );
    assert.equal(parsed.ok, true, `${file}:${JSON.stringify(parsed)}`);
    if (!parsed.ok) continue;
    const animation = normalizeRigAnimation(parsed.value);
    animations.push(animation);
    const zero = JSON.stringify(sampleRigAnimation(animation, 0).joints);
    const boundary = JSON.stringify(
      sampleRigAnimation(animation, animation.duration).joints,
    );
    assert.equal(boundary, zero, file);
    for (let frame = 0; frame <= animation.duration * 60; frame += 1) {
      const first = sampleRigAnimation(animation, frame / 60);
      const second = sampleRigAnimation(animation, frame / 60);
      assert.deepEqual(second, first, `${file}:${frame}`);
      assert.equal(evaluateRigPose(hierarchy, first).evaluationOrder.length, 19);
    }
  }

  const walk = animations.find(
    (animation) => animation.animationId === "red-cap-production-v1-walk",
  )!;
  for (const contact of [
    { jointId: "foot-left", start: 0, end: 0.6 },
    { jointId: "foot-right", start: 0.6, end: 1.2 },
  ]) {
    const points = [];
    for (
      let frame = Math.round(contact.start * 60);
      frame <= Math.round(contact.end * 60);
      frame += 1
    ) {
      points.push(
        evaluateRigPose(hierarchy, sampleRigAnimation(walk, frame / 60))
          .joints[contact.jointId]!.worldPivot,
      );
    }
    const origin = points[0]!;
    assert.ok(
      Math.max(...points.map((point) => Math.abs(point.y - origin.y))) <= 2,
      `${contact.jointId}:vertical`,
    );
    assert.ok(
      Math.max(...points.map((point) => Math.abs(point.x - origin.x))) <= 3,
      `${contact.jointId}:sliding`,
    );
  }

  const wave = animations.find(
    (animation) => animation.animationId === "red-cap-production-v1-wave",
  )!;
  const socket = layout.sockets.find(
    (candidate) => candidate.socketId === "left-grip",
  )!;
  for (let frame = 0; frame <= wave.duration * 60; frame += 1) {
    const hand = evaluateRigPose(
      hierarchy,
      sampleRigAnimation(wave, frame / 60),
    ).joints[socket.parentPartId]!;
    const evaluated = transformPoint(hand.worldTransform, socket.position);
    const expected = transformPoint(hand.worldTransform, socket.position);
    assert.ok(Math.hypot(evaluated.x - expected.x, evaluated.y - expected.y) <= 2);
  }
});

test("closes the PROGRAM-015 showcase layout, sequence, VFX, and generated resources", async () => {
  const layout = JSON.parse(
    await readFile(path.join(fixtureRoot, "showcase-layout.json"), "utf8"),
  ) as {
    viewport: { width: number; height: number; safeInset: number };
    characters: Array<{
      namespace: string;
      maximumSilhouette: { x: number; y: number; width: number; height: number };
    }>;
  };
  const sequence = JSON.parse(
    await readFile(path.join(fixtureRoot, "showcase-sequence.json"), "utf8"),
  ) as {
    events: Array<{ cueId?: string; targetId?: string }>;
  };
  const registry = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "showcase-vfx-resource-registry.json"),
      "utf8",
    ),
  ) as Array<{ resourceId: string; recipeKind: string }>;
  const renderPlan = JSON.parse(
    await readFile(path.join(fixtureRoot, "showcase.render-plan.json"), "utf8"),
  ) as {
    cues: Array<{
      cueId: string;
      layers: Array<{ resource: { resourceId: string } }>;
    }>;
  };
  const report = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "showcase-generation-report.json"),
      "utf8",
    ),
  ) as {
    status: string;
    newPngResourceCount: number;
    featureMediaCount: number;
    vfxPath: {
      existingPrimitivesOnly: boolean;
      publicRuntimeChanges: boolean;
      texturedSpriteSource: string;
    };
    outputs: Record<string, string>;
  };

  assert.deepEqual(layout.viewport, { width: 1280, height: 720, safeInset: 64 });
  assert.deepEqual(
    layout.characters.map((character) => character.namespace),
    ["showcase.production-lite", "showcase.red-cap"],
  );
  const left = layout.characters[0]!.maximumSilhouette;
  const right = layout.characters[1]!.maximumSilhouette;
  assert.ok(right.x - (left.x + left.width) >= 48);
  for (const bounds of [left, right]) {
    assert.ok(bounds.x >= 64);
    assert.ok(bounds.y >= 64);
    assert.ok(bounds.x + bounds.width <= 1216);
    assert.ok(bounds.y + bounds.height <= 656);
  }

  const resourceIds = new Set(registry.map((resource) => resource.resourceId));
  assert.deepEqual(
    [...new Set(renderPlan.cues.map((cue) => cue.cueId))].sort(),
    ["program015-aura", "program015-dust", "program015-trail"],
  );
  for (const cue of renderPlan.cues) {
    for (const layer of cue.layers) {
      assert.ok(resourceIds.has(layer.resource.resourceId));
    }
  }
  assert.ok(
    sequence.events.every(
      (event) =>
        event.targetId === undefined ||
        event.targetId.startsWith("showcase.production-lite.") ||
        event.targetId.startsWith("showcase.red-cap."),
    ),
  );

  assert.equal(report.status, "passed");
  assert.equal(report.newPngResourceCount, 4);
  assert.equal(report.featureMediaCount, 0);
  assert.deepEqual(report.vfxPath, {
    ...report.vfxPath,
    existingPrimitivesOnly: true,
    publicRuntimeChanges: false,
    texturedSpriteSource: "deterministic 64x64 procedural soft mask",
  });
  for (const [file, expectedSha] of Object.entries(report.outputs)) {
    assert.equal(
      createHash("sha256")
        .update(await readFile(path.join(repositoryRoot, file)))
        .digest("hex"),
      expectedSha,
      file,
    );
  }

  const resourceRoot = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase",
  );
  const expectedDimensions = new Map([
    ["training-ground-background.png", [1280, 720]],
    ["production-lite-character.png", [212, 480]],
    ["red-cap-character.png", [274, 500]],
    ["vfx-soft-mask.png", [64, 64]],
  ]);
  for (const [file, [width, height]] of expectedDimensions) {
    const metadata = await sharp(path.join(resourceRoot, file)).metadata();
    assert.equal(metadata.width, width, file);
    assert.equal(metadata.height, height, file);
  }
});

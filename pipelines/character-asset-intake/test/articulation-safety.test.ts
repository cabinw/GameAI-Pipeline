import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  AssetDiagnosticCode,
  intakeCharacterAssets,
  validateArticulationSafety,
  type ArticulationSafetyEvidence,
  type ArticulationSafetySpecification,
  type CanonicalArtProvenance,
  type CharacterAssetManifest,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/red-cap-target-remade",
);

async function acceptedInputs(): Promise<{
  manifest: CharacterAssetManifest;
  provenance: CanonicalArtProvenance;
  specification: ArticulationSafetySpecification;
  evidence: ArticulationSafetyEvidence;
}> {
  const intake = await intakeCharacterAssets({ sourceRoot: fixtureRoot });
  assert.equal(intake.ok, true);
  if (!intake.ok) throw new Error("Red Cap fixture intake failed.");
  const [provenance, specification, report] = await Promise.all([
    readJson<CanonicalArtProvenance>("asset-provenance.json"),
    readJson<ArticulationSafetySpecification>("articulation-safety.json"),
    readJson<{
      status: string;
      neutral: { pixelDifferenceCount: number };
      poses: ArticulationSafetyEvidence["poses"];
    }>("articulation/stress-report.json"),
  ]);
  assert.equal(report.status, "passed");
  assert.equal(report.neutral.pixelDifferenceCount, 0);
  return {
    manifest: intake.manifest,
    provenance,
    specification,
    evidence: { poses: report.poses },
  };
}

test("accepts all twelve hidden overlap seams and branch-isolated stress directions", async () => {
  const input = await acceptedInputs();
  assert.equal(input.specification.joints.length, 12);
  assert.deepEqual(
    input.specification.stressPoses.map((pose) => pose.poseId),
    [
      "left-arm-positive",
      "left-arm-negative",
      "right-arm-positive",
      "right-arm-negative",
      "left-leg-positive",
      "left-leg-negative",
      "right-leg-positive",
      "right-leg-negative",
      "combined-positive",
      "combined-negative",
    ],
  );
  assert.equal(input.provenance.hiddenExtensions.length, 12);
  assert.equal(
    input.provenance.hiddenExtensions.some((extension) =>
      extension.jointId?.startsWith("briefcase-occlusion-"),
    ),
    false,
  );
  assert.deepEqual(
    validateArticulationSafety(
      input.manifest,
      input.provenance,
      input.specification,
      input.evidence,
    ),
    [],
  );

  const generated = await readJson<{
    generatedPixelCount: number;
    textureDilationRadius: number;
    textureDilationRadiusOverrides: Record<string, number>;
    textureExtensionMethod: string;
    parts: Array<{ jointId: string; generatedPixelCount: number }>;
  }>("articulation/generated-overlaps.json");
  assert.ok(generated.generatedPixelCount > 0);
  assert.equal(
    generated.textureExtensionMethod,
    "nearest-original-opaque-child-texel-manhattan",
  );
  assert.equal(generated.textureDilationRadius, 24);
  assert.deepEqual(generated.textureDilationRadiusOverrides, {
    "shoulder-left": 80,
    "shoulder-right": 80,
  });
  assert.equal(generated.parts.length, 12);
  assert.ok(generated.parts.every((part) => part.generatedPixelCount > 0));
});

test("detects gaps, exposed cut edges, bad draw order, and briefcase drift", async () => {
  const input = await acceptedInputs();
  const evidence = structuredClone(input.evidence);
  const first = evidence.poses[0]?.joints[0];
  assert.notEqual(first, undefined);
  if (first === undefined) return;
  first.overlapPixelCount = 0;
  first.seamIntersectionPixelCount = 0;
  first.intersectionConnectedToChild = false;
  first.intersectionConnectedToCover = false;
  first.corridorTransparentCrossing = true;
  first.branchConnected = false;
  first.longestVisibleCutEdge = 20;
  first.proximalCoverageRatio = 0;
  const firstPose = evidence.poses[0];
  assert.notEqual(firstPose, undefined);
  if (firstPose === undefined) return;
  const briefcasePose = evidence.poses.find(
    (pose) => pose.poseId === "right-arm-positive",
  );
  assert.notEqual(briefcasePose, undefined);
  if (briefcasePose === undefined) return;
  briefcasePose.briefcaseAttachmentError = 1;
  briefcasePose.briefcaseConnected = false;
  const [missingPart, outOfBoundsPart, alphaLossPart, finalInvisiblePart] =
    firstPose.parts;
  assert.notEqual(missingPart, undefined);
  assert.notEqual(outOfBoundsPart, undefined);
  assert.notEqual(alphaLossPart, undefined);
  if (
    missingPart === undefined ||
    outOfBoundsPart === undefined ||
    alphaLossPart === undefined ||
    finalInvisiblePart === undefined
  ) {
    return;
  }
  missingPart.renderedAlphaCount = 0;
  missingPart.visibleAlphaCount = 0;
  outOfBoundsPart.withinCanvas = false;
  alphaLossPart.renderedAlphaCount = 1;
  finalInvisiblePart.finalVisiblePixelCount = 0;
  finalInvisiblePart.finalVisibleBounds = null;
  alphaLossPart.finalVisiblePixelHash = "mutated";
  alphaLossPart.occludingParts = [
    { partId: "mutating-occluder", pixelCount: 1 },
  ];
  firstPose.finalCompositeMatchesEncoded = false;
  firstPose.ownerCoverageMatchesComposite = false;
  const protectedPart = firstPose.parts.find((part) => part.partId === "head");
  assert.ok(protectedPart);
  protectedPart.occludingParts = [
    { partId: "mutating-occluder", pixelCount: 1 },
  ];

  const manifest = structuredClone(input.manifest);
  const cover = manifest.parts.find((part) => part.partId === first.coverPartId);
  const child = manifest.parts.find((part) => part.partId === first.partId);
  assert.notEqual(cover, undefined);
  assert.notEqual(child, undefined);
  if (cover === undefined || child === undefined) return;
  cover.drawOrder = child.drawOrder;
  const specification = {
    ...structuredClone(input.specification),
    briefcaseBranch: input.specification.briefcaseBranch.slice(0, -1),
  };

  const diagnostics = validateArticulationSafety(
    manifest,
    input.provenance,
    specification,
    evidence,
  );
  const codes = new Set(diagnostics.map((item) => item.code));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_BRANCH_DISCONNECTED));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_VISIBLE_CUT_EDGE));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_PART_MISSING));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_PART_OUT_OF_BOUNDS));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_UNEXPECTED_ALPHA_LOSS));
  assert.ok(
    codes.has(AssetDiagnosticCode.ARTICULATION_FINAL_PART_INVISIBLE),
  );
  assert.ok(
    codes.has(AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH),
  );
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_UNEXPECTED_OCCLUSION));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_DRAW_ORDER_INVALID));
  assert.ok(
    codes.has(AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID),
  );
});

test("ships unmasked Cocos rest and stress scenes with autoplay disabled", async () => {
  const specification =
    await readJson<ArticulationSafetySpecification>("articulation-safety.json");
  const cocosAssets = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets",
  );
  for (const pose of [
    { poseId: "rest", rotations: {} },
    {
      poseId: "positive",
      rotations: specification.stressPoses.find(
        (candidate) => candidate.poseId === "combined-positive",
      )?.rotations ?? {},
    },
    {
      poseId: "negative",
      rotations: specification.stressPoses.find(
        (candidate) => candidate.poseId === "combined-negative",
      )?.rotations ?? {},
    },
  ]) {
    const scene = JSON.parse(
      await readFile(
        path.join(cocosAssets, `red-cap-articulation-${pose.poseId}.scene`),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const player = scene.find(
      (entry) =>
        Object.hasOwn(entry, "validatedAnimationJson") &&
        Object.hasOwn(entry, "autoplay"),
    );
    assert.equal(player?.autoplay, false);
    const acceptanceComposite = scene.find(
      (entry) =>
        typeof entry._name === "string" &&
        entry._name.startsWith("AcceptanceComposite_"),
    );
    assert.equal(acceptanceComposite, undefined);
    const sprites = scene.filter((entry) => entry.__type__ === "cc.Sprite");
    assert.equal(sprites.length, 19);
    assert.ok(
      sprites.every((sprite) => sprite._isTrimmedMode === false),
      "articulated SpriteFrames must preserve untrimmed extension placement",
    );
    assert.ok(
      sprites.every((sprite) => {
        const nodeReference = sprite.node as { __id__?: number } | undefined;
        const node =
          nodeReference?.__id__ === undefined
            ? undefined
            : scene[nodeReference.__id__];
        return (
          typeof node?._name === "string" &&
          node._name.startsWith("Visual_")
        );
      }),
    );
    const sortingOrders = scene
      .filter((entry) => entry.__type__ === "cc.Sorting2D")
      .map((entry) => entry._sortingOrder as number);
    assert.ok(sortingOrders.every((order) => order < 1000));
    for (const [partId, degrees] of Object.entries(pose.rotations)) {
      const node = scene.find((entry) => entry._name === `Joint_${partId}`) as
        | { _euler?: { z?: number } }
        | undefined;
      assert.equal(node?._euler?.z, degrees);
    }
  }
  for (const overlay of [
    "gameai/red-cap-target-remade/articulation/stress-combined-positive.png",
    "gameai/red-cap-target-remade/articulation/stress-combined-positive.png.meta",
    "gameai/red-cap-target-remade/articulation/stress-combined-negative.png",
    "gameai/red-cap-target-remade/articulation/stress-combined-negative.png.meta",
  ]) {
    await assert.rejects(
      readFile(path.join(cocosAssets, overlay)),
      (error: NodeJS.ErrnoException) => error.code === "ENOENT",
    );
  }
  const generator = await readFile(
    path.join(
      packageRoot,
      "scripts/generate-cocos-articulation-scenes.mjs",
    ),
    "utf8",
  );
  assert.doesNotMatch(generator, /appendAcceptanceComposite/);
  assert.doesNotMatch(generator, /installAcceptanceComposite/);
});

test("rejects TASK-006 and TASK-006.1 stress renders as visual regressions", async () => {
  const report = await readJson<{
    rejectedRegressions: Array<{
      fixture: string;
      status: string;
      diagnostics: string[];
    }>;
  }>("articulation/stress-report.json");
  assert.deepEqual(
    report.rejectedRegressions.map((item) => item.fixture),
    [
      "task006-stress-positive.png",
      "task006-stress-negative.png",
      "task0061-stress-combined-negative.png",
      "task0061-stress-right-arm-negative.png",
      "task0061-stress-right-leg-negative.png",
      "task0061-stress-combined-positive.png",
    ],
  );
  assert.ok(
    report.rejectedRegressions.every((item) => item.status === "rejected"),
  );
  assert.ok(
    report.rejectedRegressions.every((item) =>
      item.diagnostics.some((code) =>
        [
          AssetDiagnosticCode.ARTICULATION_FINAL_PART_INVISIBLE,
          AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH,
        ].includes(
          code as
            | typeof AssetDiagnosticCode.ARTICULATION_FINAL_PART_INVISIBLE
            | typeof AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH,
        ),
      ),
    ),
  );
});

test("preserves unrelated siblings in the final draw-ordered composite", async () => {
  const input = await acceptedInputs();
  const rightArm = input.evidence.poses.find(
    (pose) => pose.poseId === "right-arm-negative",
  );
  const rightLeg = input.evidence.poses.find(
    (pose) => pose.poseId === "right-leg-negative",
  );
  assert.ok(rightArm);
  assert.ok(rightLeg);
  for (const [pose, partIds] of [
    [rightArm, ["head", "cap", "hair", "sunglasses"]],
    [rightLeg, ["head", "cap", "hair", "sunglasses", "torso"]],
  ] as const) {
    assert.equal(pose.finalCompositeMatchesEncoded, true);
    assert.equal(pose.ownerCoverageMatchesComposite, true);
    for (const partId of partIds) {
      const part = pose.parts.find((candidate) => candidate.partId === partId);
      assert.ok(part);
      assert.equal(part.transformPreserved, true);
      assert.equal(
        part.finalVisiblePixelCount,
        part.expectedFinalVisiblePixelCount,
      );
      assert.deepEqual(part.finalVisibleBounds, part.expectedFinalVisibleBounds);
      assert.equal(
        part.finalVisiblePixelHash,
        part.expectedFinalVisiblePixelHash,
      );
      assert.deepEqual(part.occludingParts, part.expectedOccludingParts);
    }
  }
  for (const pose of input.evidence.poses) {
    assert.equal(pose.ownerCoverageMatchesComposite, true);
    assert.ok(
      pose.parts
        .filter((part) => !part.hasRotatedAncestor)
        .every((part) => part.finalVisiblePixelCount > 0),
    );
  }
});

test("uses meaningful minimum joint stress amplitudes", async () => {
  const input = await acceptedInputs();
  for (const pose of input.specification.stressPoses) {
    for (const [partId, rotation] of Object.entries(pose.rotations)) {
      const minimum =
        partId.startsWith("upper-arm-") || partId.startsWith("thigh-")
          ? 8
          : partId.startsWith("forearm-") || partId.startsWith("shin-")
            ? 12
            : partId.startsWith("hand-") || partId.startsWith("foot-")
              ? 6
              : 0;
      assert.ok(Math.abs(rotation) >= minimum, `${pose.poseId}:${partId}`);
    }
  }
});

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, relativePath), "utf8"),
  ) as T;
}

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
  assert.equal(input.provenance.hiddenExtensions.length, 14);
  assert.deepEqual(
    input.provenance.hiddenExtensions
      .filter((extension) =>
        extension.jointId?.startsWith("briefcase-occlusion-"),
      )
      .map((extension) => [
        extension.partId,
        extension.coverPartId,
      ]),
    [
      ["thigh-right", "briefcase"],
      ["shin-right", "briefcase"],
    ],
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
    textureExtensionMethod: string;
    parts: Array<{ jointId: string; generatedPixelCount: number }>;
  }>("articulation/generated-overlaps.json");
  assert.ok(generated.generatedPixelCount > 0);
  assert.equal(
    generated.textureExtensionMethod,
    "nearest-original-opaque-child-texel-manhattan",
  );
  assert.equal(generated.textureDilationRadius, 24);
  assert.equal(generated.parts.length, 14);
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
  const [missingPart, outOfBoundsPart, alphaLossPart] = firstPose.parts;
  assert.notEqual(missingPart, undefined);
  assert.notEqual(outOfBoundsPart, undefined);
  assert.notEqual(alphaLossPart, undefined);
  if (
    missingPart === undefined ||
    outOfBoundsPart === undefined ||
    alphaLossPart === undefined
  ) {
    return;
  }
  missingPart.renderedAlphaCount = 0;
  missingPart.visibleAlphaCount = 0;
  outOfBoundsPart.withinCanvas = false;
  alphaLossPart.renderedAlphaCount = 1;

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
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_DRAW_ORDER_INVALID));
  assert.ok(
    codes.has(AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID),
  );
});

test("ships fixed Cocos rest and stress scenes with autoplay disabled", async () => {
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
      (entry) => entry._name === `AcceptanceComposite_${pose.poseId}`,
    );
    assert.notEqual(acceptanceComposite, undefined);
    const acceptanceSorting = scene.find(
      (entry) =>
        entry.__type__ === "cc.Sorting2D" &&
        entry.node &&
        typeof entry.node === "object" &&
        acceptanceComposite &&
        (entry.node as { __id__?: number }).__id__ ===
          scene.indexOf(acceptanceComposite),
    );
    assert.equal(acceptanceSorting?._sortingOrder, 1000);
    for (const [partId, degrees] of Object.entries(pose.rotations)) {
      const node = scene.find((entry) => entry._name === `Joint_${partId}`) as
        | { _euler?: { z?: number } }
        | undefined;
      assert.equal(node?._euler?.z, degrees);
    }
  }
});

test("rejects the two TASK-006 stress renders as visual regressions", async () => {
  const report = await readJson<{
    rejectedRegressions: Array<{
      fixture: string;
      status: string;
      diagnostics: string[];
    }>;
  }>("articulation/stress-report.json");
  assert.deepEqual(
    report.rejectedRegressions.map((item) => item.fixture),
    ["task006-stress-positive.png", "task006-stress-negative.png"],
  );
  assert.ok(
    report.rejectedRegressions.every((item) => item.status === "rejected"),
  );
  assert.ok(
    report.rejectedRegressions.every((item) =>
      item.diagnostics.some((code) =>
        [
          AssetDiagnosticCode.ARTICULATION_UNEXPECTED_ALPHA_LOSS,
          AssetDiagnosticCode.ARTICULATION_VISIBLE_CUT_EDGE,
        ].includes(code as typeof AssetDiagnosticCode.ARTICULATION_VISIBLE_CUT_EDGE),
      ),
    ),
  );
});

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, relativePath), "utf8"),
  ) as T;
}

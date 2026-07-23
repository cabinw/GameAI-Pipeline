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

test("accepts all twelve hidden overlap seams and both stress directions", async () => {
  const input = await acceptedInputs();
  assert.equal(input.specification.joints.length, 12);
  assert.deepEqual(
    input.specification.stressPoses.map((pose) => pose.poseId),
    ["positive", "negative"],
  );
  assert.equal(input.provenance.hiddenExtensions.length, 12);
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
    parts: Array<{ jointId: string; generatedPixelCount: number }>;
  }>("articulation/generated-overlaps.json");
  assert.ok(generated.generatedPixelCount > 0);
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
  first.proximalCoverageRatio = 0;
  const firstPose = evidence.poses[0];
  assert.notEqual(firstPose, undefined);
  if (firstPose === undefined) return;
  firstPose.briefcaseAttachmentError = 1;

  const manifest = structuredClone(input.manifest);
  const cover = manifest.parts.find((part) => part.partId === first.coverPartId);
  const child = manifest.parts.find((part) => part.partId === first.partId);
  assert.notEqual(cover, undefined);
  assert.notEqual(child, undefined);
  if (cover === undefined || child === undefined) return;
  cover.drawOrder = child.drawOrder;

  const diagnostics = validateArticulationSafety(
    manifest,
    input.provenance,
    input.specification,
    evidence,
  );
  const codes = new Set(diagnostics.map((item) => item.code));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_TRANSPARENT_GAP));
  assert.ok(codes.has(AssetDiagnosticCode.ARTICULATION_EXPOSED_CUT_EDGE));
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
    ...specification.stressPoses,
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
    for (const [partId, degrees] of Object.entries(pose.rotations)) {
      const node = scene.find((entry) => entry._name === `Joint_${partId}`) as
        | { _euler?: { z?: number } }
        | undefined;
      assert.equal(node?._euler?.z, degrees);
    }
  }
});

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(fixtureRoot, relativePath), "utf8"),
  ) as T;
}

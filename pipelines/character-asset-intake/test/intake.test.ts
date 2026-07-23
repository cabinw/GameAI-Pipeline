import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AssetDiagnosticCode,
  inspectImage,
  intakeCharacterAssets,
  sourcePointToReference,
  validateSourceCanvasReconstruction,
  type CharacterAssetManifest,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const validFixtureRoot = path.join(repositoryRoot, "examples/red-cap-target");
const imageFixtureRoot = path.join(packageRoot, "test/fixtures/images");
const invalidFixtureRoot = path.join(packageRoot, "test/fixtures/invalid");

interface InvalidFixture {
  expectedCode: string;
  action:
    | "remove-pelvis-image"
    | "symlink-pelvis-outside-root"
    | "replace-pelvis-image"
    | "increase-pelvis-trim-offset"
    | "duplicate-pelvis-reference";
  image?: string;
}

interface FixtureLayout {
  parts: Array<{
    partId: string;
    file: string;
    trimOffset: { x: number; y: number };
  }>;
}

async function fixtureDigest(root: string): Promise<string> {
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(root, file));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function readLayout(root: string): Promise<FixtureLayout> {
  return JSON.parse(await readFile(path.join(root, "rig-layout.json"), "utf8")) as FixtureLayout;
}

async function writeLayout(root: string, layout: FixtureLayout): Promise<void> {
  await writeFile(path.join(root, "rig-layout.json"), `${JSON.stringify(layout, null, 2)}\n`);
}

async function prepareInvalidFixture(
  temporaryParent: string,
  fixture: InvalidFixture,
): Promise<string> {
  const sourceRoot = path.join(temporaryParent, "source");
  await cp(validFixtureRoot, sourceRoot, { recursive: true });
  const pelvisPath = path.join(sourceRoot, "assets/parts/pelvis.png");

  switch (fixture.action) {
    case "remove-pelvis-image":
      await unlink(pelvisPath);
      break;
    case "symlink-pelvis-outside-root": {
      const outsidePath = path.join(temporaryParent, "outside.png");
      await copyFile(pelvisPath, outsidePath);
      await unlink(pelvisPath);
      await symlink(outsidePath, pelvisPath);
      break;
    }
    case "replace-pelvis-image":
      assert.ok(fixture.image);
      await copyFile(path.join(imageFixtureRoot, fixture.image), pelvisPath);
      break;
    case "increase-pelvis-trim-offset": {
      const layout = await readLayout(sourceRoot);
      const pelvis = layout.parts.find((part) => part.partId === "pelvis");
      assert.ok(pelvis);
      pelvis.trimOffset.x += 1;
      await writeLayout(sourceRoot, layout);
      break;
    }
    case "duplicate-pelvis-reference": {
      const layout = await readLayout(sourceRoot);
      const pelvis = layout.parts.find((part) => part.partId === "pelvis");
      const torso = layout.parts.find((part) => part.partId === "torso");
      assert.ok(pelvis);
      assert.ok(torso);
      torso.file = pelvis.file;
      await writeLayout(sourceRoot, layout);
      break;
    }
  }

  return sourceRoot;
}

test("loads the Red Cap fixture without mutation and returns a deterministic manifest", async () => {
  const digestBefore = await fixtureDigest(validFixtureRoot);
  const first = await intakeCharacterAssets({ sourceRoot: validFixtureRoot });
  const second = await intakeCharacterAssets({ sourceRoot: validFixtureRoot });
  const digestAfter = await fixtureDigest(validFixtureRoot);

  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  assert.equal(digestAfter, digestBefore);
  if (!first.ok) {
    return;
  }

  assert.equal(first.manifest.characterId, "red-cap-target");
  assert.deepEqual(first.manifest.schemaVersions, {
    characterRig: "1.0.0",
    rigLayout: "1.0.0",
  });
  assert.equal(first.manifest.parts.length, 18);
  assert.equal(first.manifest.sockets.length, 3);
  assert.equal(first.manifest.hitAreas.length, 2);
  assert.equal(first.manifest.parts[0]?.partId, "pelvis");
  assert.equal(first.manifest.parts[0]?.imageFormat, "png");
  assert.equal(first.manifest.parts[0]?.width, 168);
  assert.equal(first.manifest.parts[0]?.height, 142);
  assert.equal(first.manifest.parts[0]?.hasAlpha, true);
  assert.equal(first.manifest.parts[0]?.hasTransparency, true);
  assert.ok((first.manifest.parts[0]?.transparentPixelCount ?? 0) > 0);
  assert.deepEqual(first.manifest.parts[0]?.contentBounds, {
    x: 1,
    y: 1,
    width: 166,
    height: 140,
  });
  assert.equal(first.manifest.parts[1]?.parentId, "pelvis");
  assert.equal(first.manifest.parts[1]?.drawOrder, 10);
  assert.deepEqual(first.manifest.parts[1]?.anchor, { x: 0.5, y: 0.12 });
  assert.deepEqual(first.manifest.parts[1]?.restPose.position, { x: 0, y: 108 });
});

test("converts source-canvas coordinates with positive Y up and applies scale once", () => {
  assert.deepEqual(
    sourcePointToReference(
      { x: 163, y: 446 },
      { width: 326, height: 892 },
      0.01,
    ),
    { x: 0, y: 0 },
  );
  assert.deepEqual(
    sourcePointToReference(
      { x: 263, y: 346 },
      { width: 326, height: 892 },
      0.01,
    ),
    { x: 1, y: 1 },
  );
});

test("inspects a valid alpha WebP and calculates content bounds", async () => {
  const result = await inspectImage(
    path.join(imageFixtureRoot, "valid-alpha.webp"),
    "valid-alpha.webp",
    "webp-part",
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  if (result.ok) {
    assert.equal(result.value.imageFormat, "webp");
    assert.equal(result.value.width, 10);
    assert.equal(result.value.height, 8);
    assert.equal(result.value.hasAlpha, true);
    assert.equal(result.value.hasTransparency, true);
    assert.equal(result.value.transparentPixelCount, 56);
    assert.deepEqual(result.value.contentBounds, { x: 2, y: 2, width: 6, height: 4 });
  }
});

test("every required asset diagnostic has a deterministic invalid fixture", async (context) => {
  const fixtureFiles = (await readdir(invalidFixtureRoot))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const fixtureBackedCodes = Object.keys(AssetDiagnosticCode).filter(
    (code) =>
      code !== AssetDiagnosticCode.SOURCE_CANVAS_METADATA_INCONSISTENT &&
      code !== AssetDiagnosticCode.TRIM_METADATA_INCONSISTENT &&
      code !== AssetDiagnosticCode.CANONICAL_REFERENCE_MISSING &&
      code !== AssetDiagnosticCode.PART_PIXEL_PROVENANCE_MISMATCH &&
      code !== AssetDiagnosticCode.FLAT_COMPOSITE_SILHOUETTE_MISMATCH &&
      code !== AssetDiagnosticCode.FLAT_COMPOSITE_PIXEL_DIFF_EXCEEDED &&
      code !== AssetDiagnosticCode.UNDECLARED_GENERATED_VISIBLE_REGION &&
      code !== AssetDiagnosticCode.ARTICULATION_SPEC_INVALID &&
      code !== AssetDiagnosticCode.ARTICULATION_TRANSPARENT_GAP &&
      code !== AssetDiagnosticCode.ARTICULATION_EXPOSED_CUT_EDGE &&
      code !== AssetDiagnosticCode.ARTICULATION_DRAW_ORDER_INVALID &&
      code !== AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID &&
      code !== AssetDiagnosticCode.ARTICULATION_PART_MISSING &&
      code !== AssetDiagnosticCode.ARTICULATION_PART_OUT_OF_BOUNDS &&
      code !== AssetDiagnosticCode.ARTICULATION_UNEXPECTED_ALPHA_LOSS &&
      code !== AssetDiagnosticCode.ARTICULATION_BRANCH_DISCONNECTED &&
      code !== AssetDiagnosticCode.ARTICULATION_VISIBLE_CUT_EDGE &&
      code !== AssetDiagnosticCode.ARTICULATION_FINAL_PART_INVISIBLE &&
      code !== AssetDiagnosticCode.ARTICULATION_UNEXPECTED_OCCLUSION &&
      code !== AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH,
  );
  assert.equal(fixtureFiles.length, fixtureBackedCodes.length);

  for (const fixtureFile of fixtureFiles) {
    await context.test(fixtureFile, async () => {
      const fixture = JSON.parse(
        await readFile(path.join(invalidFixtureRoot, fixtureFile), "utf8"),
      ) as InvalidFixture;
      const temporaryParent = await mkdtemp(path.join(os.tmpdir(), "gameai-asset-intake-"));
      try {
        const sourceRoot = await prepareInvalidFixture(temporaryParent, fixture);
        const first = await intakeCharacterAssets({ sourceRoot });
        const second = await intakeCharacterAssets({ sourceRoot });
        assert.deepEqual(second, first);
        assert.equal(first.ok, false);
        assert.equal(first.manifest, null);
        assert.ok(
          first.diagnostics.some((diagnostic) => diagnostic.code === fixture.expectedCode),
          `${fixtureFile} did not emit ${fixture.expectedCode}: ${JSON.stringify(first.diagnostics)}`,
        );
      } finally {
        await rm(temporaryParent, { recursive: true, force: true });
      }
    });
  }
});

test("reports stable source-canvas and trim metadata diagnostics", async () => {
  const result = await intakeCharacterAssets({ sourceRoot: validFixtureRoot });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const invalidManifest = structuredClone(result.manifest) as CharacterAssetManifest;
  invalidManifest.visualPlacementMode = "source-canvas-rect";
  invalidManifest.parts = [invalidManifest.parts[0]!];
  invalidManifest.parts[0]!.originalRect.x = invalidManifest.sourceCanvas.width;
  invalidManifest.parts[0]!.trimOffset.x = 1;

  const diagnostics = validateSourceCanvasReconstruction(invalidManifest);
  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    [
      AssetDiagnosticCode.SOURCE_CANVAS_METADATA_INCONSISTENT,
      AssetDiagnosticCode.TRIM_METADATA_INCONSISTENT,
    ],
  );
});

test("rejects an entry contract path outside the selected source root", async () => {
  const result = await intakeCharacterAssets({
    sourceRoot: validFixtureRoot,
    characterRigFile: "../character-rig.json",
  });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0]?.code, AssetDiagnosticCode.ASSET_PATH_OUTSIDE_ROOT);
});

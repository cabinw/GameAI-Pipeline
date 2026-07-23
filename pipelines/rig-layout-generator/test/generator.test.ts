import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { CharacterRig, RigLayout } from "@gameai/character-contracts";

import {
  RigLayoutDiagnosticCode,
  generateRigLayout,
  maleNormalV1,
  parseSkeletonTemplate,
  parseSourceCanvasAnnotation,
  renderAssembledPreviewSvg,
  serializeRigLayout,
  skeletonTemplateSchema,
  sourceCanvasAnnotationSchema,
  type SkeletonTemplate,
  type SourceCanvasAnnotation,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-target");
const invalidFixtureRoot = path.join(packageRoot, "test/fixtures/invalid");

interface InvalidFixture {
  expectedCode: string;
  action:
    | "remove-required-part"
    | "add-unknown-part"
    | "move-joint-outside-canvas"
    | "move-joint-outside-part"
    | "mismatch-trim-size"
    | "warn-on-overlap"
    | "reference-missing-parent"
    | "cycle-template-hierarchy"
    | "duplicate-generated-draw-order"
    | "duplicate-annotation-part-id"
    | "overflow-normalized-hit-area";
  warning?: boolean;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function loadInputs(): Promise<{
  annotation: SourceCanvasAnnotation;
  characterRig: CharacterRig;
  golden: RigLayout;
  goldenText: string;
}> {
  const goldenPath = path.join(fixtureRoot, "rig-layout.generated.json");
  const goldenText = await readFile(goldenPath, "utf8");
  return {
    annotation: await readJson(path.join(fixtureRoot, "source-annotation.json")),
    characterRig: await readJson(path.join(fixtureRoot, "character-rig.json")),
    golden: JSON.parse(goldenText) as RigLayout,
    goldenText,
  };
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mutateFixture(
  fixture: InvalidFixture,
  annotation: SourceCanvasAnnotation,
  template: SkeletonTemplate,
): void {
  const pelvis = annotation.parts.find((part) => part.partId === "pelvis");
  const torso = annotation.parts.find((part) => part.partId === "torso");
  assert.ok(pelvis);
  assert.ok(torso);

  switch (fixture.action) {
    case "remove-required-part":
      annotation.parts = annotation.parts.filter((part) => part.partId !== "foot-right");
      break;
    case "add-unknown-part":
      annotation.parts.push({
        partId: "tail",
        file: pelvis.file,
        sourceRect: { x: 10, y: 10, width: 20, height: 20 },
        trimmedRect: { x: 10, y: 10, width: 20, height: 20 },
        joint: { x: 20, y: 20 },
      });
      break;
    case "move-joint-outside-canvas":
      pelvis.joint = { x: annotation.sourceCanvas.width + 1, y: 500 };
      break;
    case "move-joint-outside-part":
      pelvis.joint = { x: 10, y: 10 };
      break;
    case "mismatch-trim-size":
      assert.ok("trimmedRect" in pelvis && pelvis.trimmedRect);
      pelvis.trimmedRect.width -= 1;
      break;
    case "warn-on-overlap":
      annotation.overrides = {
        ...annotation.overrides,
        sourceRectOverlapPolicy: "warn",
      };
      break;
    case "reference-missing-parent":
      torso.overrides = { ...torso.overrides, parentId: "ghost-part" };
      break;
    case "cycle-template-hierarchy": {
      const templatePelvis = template.parts.find((part) => part.partId === "pelvis");
      assert.ok(templatePelvis);
      templatePelvis.parentId = "torso";
      break;
    }
    case "duplicate-generated-draw-order": {
      const cap = annotation.parts.find((part) => part.partId === "cap");
      assert.ok(cap);
      cap.overrides = { ...cap.overrides, drawOrder: 17 };
      break;
    }
    case "duplicate-annotation-part-id":
      annotation.parts.push(structuredClone(torso));
      break;
    case "overflow-normalized-hit-area": {
      const bodyHit = template.hitAreas?.find((hitArea) => hitArea.hitAreaId === "body-hit");
      assert.ok(bodyHit?.normalizedShape.type === "rect");
      bodyHit.normalizedShape.width = 0.9;
      break;
    }
  }
}

test("generates the byte-stable Red Cap golden layout and validated manifest", async () => {
  const inputs = await loadInputs();
  const annotationTextBefore = await readFile(path.join(fixtureRoot, "source-annotation.json"), "utf8");
  const result = await generateRigLayout({
    annotation: inputs.annotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  const annotationTextAfter = await readFile(path.join(fixtureRoot, "source-annotation.json"), "utf8");

  assert.equal(result.ok, true);
  assert.equal(digest(annotationTextAfter), digest(annotationTextBefore));
  if (!result.ok) return;
  assert.deepEqual(result.rigLayout, inputs.golden);
  assert.equal(serializeRigLayout(result.rigLayout), inputs.goldenText);
  assert.equal(result.manifest.parts.length, 18);
  assert.equal(result.animationTargets.length, 8);
  assert.deepEqual(result.diagnostics, []);
});

test("uses proximal source joints for anchors and named child attachments for parent deltas", async () => {
  const inputs = await loadInputs();
  const result = await generateRigLayout({
    annotation: inputs.annotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const pelvis = result.rigLayout.parts.find((part) => part.partId === "pelvis");
  const torso = result.rigLayout.parts.find((part) => part.partId === "torso");
  const upperArmLeft = result.rigLayout.parts.find((part) => part.partId === "upper-arm-left");
  assert.ok(pelvis);
  assert.ok(torso);
  assert.ok(upperArmLeft);
  assert.deepEqual(pelvis.anchor, { x: 0.5, y: 0.5 });
  assert.deepEqual(pelvis.restPose.position, { x: -0.02, y: -0.43 });
  assert.deepEqual(torso.restPose.position, { x: 0, y: 0.35 });
  assert.deepEqual(upperArmLeft.restPose.position, { x: -1, y: 1.8 });
  assert.deepEqual(result.rigLayout.sockets?.[0]?.position, { x: -0.175, y: -0.325 });
  assert.deepEqual(result.rigLayout.hitAreas?.[0]?.shape, {
    type: "rect",
    x: -0.805,
    y: 0.06,
    width: 1.61,
    height: 2.08,
  });
});

test("calibrates limb anchors to shoulders, elbows, hips, and knees", async () => {
  const inputs = await loadInputs();
  const result = await generateRigLayout({
    annotation: inputs.annotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const anchors = new Map(
    result.rigLayout.parts.map((part) => [part.partId, part.anchor]),
  );
  assert.deepEqual(anchors.get("upper-arm-left"), { x: 0.862069, y: 0.119048 });
  assert.deepEqual(anchors.get("upper-arm-right"), { x: 0.068966, y: 0.119048 });
  assert.deepEqual(anchors.get("forearm-left"), { x: 0.777778, y: 0.170732 });
  assert.deepEqual(anchors.get("forearm-right"), { x: 0.222222, y: 0.170732 });
  assert.deepEqual(anchors.get("thigh-left"), { x: 0.64, y: 0.068182 });
  assert.deepEqual(anchors.get("thigh-right"), { x: 0.36, y: 0.068182 });
  assert.deepEqual(anchors.get("shin-left"), { x: 0.583333, y: 0.121951 });
  assert.deepEqual(anchors.get("shin-right"), { x: 0.416667, y: 0.121951 });
});

test("keeps parent child attachments distinct from proximal pivots and validates correspondence", async () => {
  const inputs = await loadInputs();
  const torso = inputs.annotation.parts.find((part) => part.partId === "torso");
  const upperArmLeft = inputs.annotation.parts.find(
    (part) => part.partId === "upper-arm-left",
  );
  const shoulder = torso?.childAttachments?.find(
    (attachment) => attachment.childPartId === "upper-arm-left",
  );
  assert.ok(torso);
  assert.ok(upperArmLeft);
  assert.ok(shoulder);
  assert.notDeepEqual(torso.joint, shoulder.position);
  assert.deepEqual(shoulder.position, upperArmLeft.joint);

  const mismatched = structuredClone(inputs.annotation);
  const mismatchedTorso = mismatched.parts.find((part) => part.partId === "torso");
  const mismatchedShoulder = mismatchedTorso?.childAttachments?.find(
    (attachment) => attachment.childPartId === "upper-arm-left",
  );
  assert.ok(mismatchedShoulder);
  mismatchedShoulder.position.x += 1;
  const mismatchResult = await generateRigLayout({
    annotation: mismatched,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(mismatchResult.ok, false);
  assert.ok(
    mismatchResult.diagnostics.some(
      (item) => item.code === RigLayoutDiagnosticCode.CHILD_ATTACHMENT_MISMATCH,
    ),
  );
});

test("keeps the assembled Red Cap acceptance preview byte-stable", async () => {
  const inputs = await loadInputs();
  const result = await generateRigLayout({
    annotation: inputs.annotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    renderAssembledPreviewSvg(inputs.annotation, result.rigLayout),
    await readFile(path.join(fixtureRoot, "assembled-preview.svg"), "utf8"),
  );
});

test("rejects out-of-range normalized sockets and circle hit areas", async () => {
  const inputs = await loadInputs();
  const invalidSocketTemplate = structuredClone(maleNormalV1);
  assert.ok(invalidSocketTemplate.sockets?.[0]);
  invalidSocketTemplate.sockets[0].normalizedPosition.x = 1.01;
  const invalidSocket = await generateRigLayout({
    annotation: inputs.annotation,
    template: invalidSocketTemplate,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(invalidSocket.ok, false);
  assert.ok(
    invalidSocket.diagnostics.some(
      (item) =>
        item.code === RigLayoutDiagnosticCode.INVALID_NORMALIZED_TEMPLATE_GEOMETRY,
    ),
  );

  const invalidCircleTemplate = structuredClone(maleNormalV1);
  const headHit = invalidCircleTemplate.hitAreas?.find(
    (hitArea) => hitArea.hitAreaId === "head-hit",
  );
  assert.ok(headHit?.normalizedShape.type === "circle");
  headHit.normalizedShape.radius = 0.6;
  const invalidCircle = await generateRigLayout({
    annotation: inputs.annotation,
    template: invalidCircleTemplate,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(invalidCircle.ok, false);
  assert.ok(
    invalidCircle.diagnostics.some(
      (item) =>
        item.code === RigLayoutDiagnosticCode.INVALID_NORMALIZED_TEMPLATE_GEOMETRY,
    ),
  );
});

test("keeps 1.0 annotations compatible through the child-joint fallback", async () => {
  const inputs = await loadInputs();
  const legacyAnnotation = structuredClone(inputs.annotation);
  legacyAnnotation.schemaVersion = "1.0.0";
  for (const part of legacyAnnotation.parts) {
    delete part.childAttachments;
  }
  const result = await generateRigLayout({
    annotation: legacyAnnotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.rigLayout, inputs.golden);
  }
});

test("ignores visual centers when deriving pivots and transforms", async () => {
  const inputs = await loadInputs();
  const changed = structuredClone(inputs.annotation);
  for (const part of changed.parts) {
    part.visualCenter = { x: 0, y: 0 };
  }
  const result = await generateRigLayout({
    annotation: changed,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.rigLayout, inputs.golden);
  }
});

test("parses both versioned generator contracts and exposes canonical schemas", async () => {
  const inputs = await loadInputs();
  assert.equal(parseSourceCanvasAnnotation(inputs.annotation).ok, true);
  assert.equal(parseSkeletonTemplate(maleNormalV1).ok, true);
  assert.equal(sourceCanvasAnnotationSchema.$id, "https://gameai.dev/schemas/source-canvas-annotation.schema.json");
  assert.equal(skeletonTemplateSchema.$id, "https://gameai.dev/schemas/skeleton-template.schema.json");
  for (const file of [
    "source-canvas-annotation.schema.json",
    "skeleton-template.schema.json",
  ]) {
    assert.equal(
      await readFile(path.join(packageRoot, "dist/schemas", file), "utf8"),
      await readFile(path.join(repositoryRoot, "schemas", file), "utf8"),
    );
  }
});

test("every required diagnostic has a deterministic invalid fixture", async (context) => {
  const fixtureFiles = (await readdir(invalidFixtureRoot))
    .filter((file) => file.endsWith(".json"))
    .sort();
  assert.equal(fixtureFiles.length, 11);

  for (const fixtureFile of fixtureFiles) {
    await context.test(fixtureFile, async () => {
      const fixture = await readJson<InvalidFixture>(path.join(invalidFixtureRoot, fixtureFile));
      const inputs = await loadInputs();
      const annotation = structuredClone(inputs.annotation);
      const template = structuredClone(maleNormalV1);
      mutateFixture(fixture, annotation, template);
      const first = await generateRigLayout({
        annotation,
        template,
        characterRig: inputs.characterRig,
        sourceRoot: fixtureRoot,
      });
      const second = await generateRigLayout({
        annotation,
        template,
        characterRig: inputs.characterRig,
        sourceRoot: fixtureRoot,
      });
      assert.deepEqual(second, first);
      assert.equal(first.ok, fixture.warning === true);
      assert.ok(
        first.diagnostics.some((item) => item.code === fixture.expectedCode),
        `${fixtureFile} did not emit ${fixture.expectedCode}: ${JSON.stringify(first.diagnostics)}`,
      );
      if (fixture.warning === true) {
        assert.ok(first.diagnostics.every((item) => item.severity === "warning"));
      }
    });
  }
});

test("rejects unsupported annotation contract minors deterministically", async () => {
  const inputs = await loadInputs();
  inputs.annotation.schemaVersion = "1.2.0";
  const result = await generateRigLayout({
    annotation: inputs.annotation,
    template: maleNormalV1,
    characterRig: inputs.characterRig,
    sourceRoot: fixtureRoot,
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.diagnostics[0]?.code,
    RigLayoutDiagnosticCode.UNSUPPORTED_GENERATOR_SCHEMA_VERSION,
  );
});

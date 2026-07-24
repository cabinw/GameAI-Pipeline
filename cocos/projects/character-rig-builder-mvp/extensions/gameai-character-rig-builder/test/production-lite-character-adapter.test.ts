import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { RigAnimation } from "@gameai/rig-animation";
import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../source/production-lite-character-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const fixtureRoot = path.join(repositoryRoot, "examples/production-lite-character");
const json = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));

async function inputs(): Promise<{
  layout: Parameters<typeof buildCocosProductionLiteCharacterPlan>[0];
  clips: RigAnimation[];
  dimensions: Parameters<typeof buildCocosProductionLiteCharacterPlan>[2];
}> {
  const layout = (await json("rig-layout.json")) as Parameters<
    typeof buildCocosProductionLiteCharacterPlan
  >[0];
  return {
    layout,
    clips: (await Promise.all(
      ["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map(
        (name) => json(`animations/${name}.json`) as Promise<RigAnimation>,
      ),
    )) as RigAnimation[],
    dimensions: Object.fromEntries(
      await Promise.all(
        layout.parts.map(async (part) => {
          const metadata = await sharp(path.join(fixtureRoot, part.file)).metadata();
          return [
            part.partId,
            { width: metadata.width!, height: metadata.height! },
          ] as const;
        }),
      ),
    ),
  };
}

test("builds a deterministic trimmed-sprite plan only from contracts and decoded assets", async () => {
  const { layout, clips, dimensions } = await inputs();
  const first = buildCocosProductionLiteCharacterPlan(layout, clips, dimensions);
  const second = buildCocosProductionLiteCharacterPlan(
    structuredClone(layout),
    structuredClone(clips),
    structuredClone(dimensions),
  );
  assert.deepEqual(second, first);
  assert.equal(first.parts.length, 17);
  assert.equal(first.parts.filter((part) => part.parentId === null).length, 1);
  assert.equal(first.parts.find((part) => part.parentId === null)?.jointId, "pelvis");
  assert.deepEqual(
    first.parts.map((part) => part.drawOrder),
    [...Array(17).keys()],
  );
  assert.deepEqual(
    first.clips.map((clip) => clip.animationId),
    [
      "production-lite-arm-wave",
      "production-lite-articulation-stress",
      "production-lite-rest-idle",
      "production-lite-walk-cycle",
    ],
  );
  assert.equal(first.reconstructionStatus, "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM");
});

test("derives trimmed visual placement generically and fails closed without dimensions", async () => {
  const { layout, clips, dimensions } = await inputs();
  const plan = buildCocosProductionLiteCharacterPlan(layout, clips, dimensions);
  for (const part of layout.parts) {
    const actual = plan.parts.find((candidate) => candidate.jointId === part.partId)!;
    const size = dimensions[part.partId]!;
    const jointX = part.originalRect.x + part.anchor.x * part.originalRect.width;
    const jointY = part.originalRect.y + part.anchor.y * part.originalRect.height;
    assert.deepEqual(actual.visualOffset, {
      x:
        (part.originalRect.x + part.trimOffset.x + size.width / 2 - jointX) *
        layout.referenceScale,
      y:
        (jointY -
          (part.originalRect.y + part.trimOffset.y + size.height / 2)) *
        layout.referenceScale,
    });
    assert.deepEqual(actual.visualSize, {
      width: size.width * layout.referenceScale,
      height: size.height * layout.referenceScale,
    });
  }
  const missing = structuredClone(dimensions) as Record<
    string,
    { width: number; height: number }
  >;
  delete missing.head;
  assert.throws(
    () => buildCocosProductionLiteCharacterPlan(layout, clips, missing),
    /PRODUCTION_LITE_ASSET_DIMENSIONS_MISSING:head/,
  );
});

test("runtime drives sprites and skeleton from one sample and exposes the complete surface", async () => {
  const runtimePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/gameai/production-lite-character/production-lite-character-demo.ts",
  );
  const scenePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/production-lite-layered-character-reference.scene",
  );
  const [runtime, scene] = await Promise.all([
    readFile(runtimePath, "utf8"),
    readFile(scenePath, "utf8"),
  ]);
  assert.doesNotThrow(() => JSON.parse(scene));
  assert.match(scene, /ProductionLiteGenerated/);
  assert.match(scene, /9d77cGiO0xNXo\+QEjRWeJq8/);
  assert.match(runtime, /this\.setPose\(binding\.spriteJoint, pose\)/);
  assert.match(runtime, /this\.setPose\(binding\.skeletonJoint, pose\)/);
  assert.match(runtime, /ReferenceAssembledOverlay/);
  assert.match(runtime, /reconstructionStatus/);
  for (const label of [
    "AuthoredReferenceView",
    "AssembledSpriteView",
    "SkeletonDebugView",
    "JointMarker_",
    "Bounds_",
    "PivotMarker_",
    "ParentLink_",
    "drawOrder",
  ]) {
    assert.match(runtime, new RegExp(label));
  }
  for (const control of [
    "DIGIT_1",
    "DIGIT_2",
    "DIGIT_3",
    "DIGIT_4",
    "SPACE",
    "KEY_R",
    "KEY_Q",
    "KEY_E",
    "KEY_O",
    "KEY_J",
    "KEY_B",
    "KEY_A",
    "KEY_L",
    "KEY_D",
    "KEY_V",
  ]) {
    assert.match(runtime, new RegExp(`KeyCode\\.${control}`));
  }
  assert.doesNotMatch(
    runtime,
    /partCorrections|correctionByPart|switch\s*\(\s*part|red[ -]?cap|briefcase|sunglasses|jacket/i,
  );
});

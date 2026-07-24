import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { RigAnimation } from "@gameai/rig-animation";

import { buildCocosSimpleSpriteCharacterPlan } from "../source/simple-sprite-character-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const fixtureRoot = path.join(repositoryRoot, "examples/simple-sprite-character");
const json = async (file: string): Promise<unknown> =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));

async function inputs(): Promise<{
  layout: Parameters<typeof buildCocosSimpleSpriteCharacterPlan>[0];
  clips: RigAnimation[];
}> {
  return {
    layout: (await json("rig-layout.json")) as Parameters<
      typeof buildCocosSimpleSpriteCharacterPlan
    >[0],
    clips: (await Promise.all(
      ["rest-idle", "arm-wave", "walk-cycle"].map(
        (name) => json(`animations/${name}.json`) as Promise<RigAnimation>,
      ),
    )) as RigAnimation[],
  };
}

test("builds a deterministic real-sprite plan only from contract fields", async () => {
  const { layout, clips } = await inputs();
  const first = buildCocosSimpleSpriteCharacterPlan(layout, clips);
  const second = buildCocosSimpleSpriteCharacterPlan(
    structuredClone(layout),
    structuredClone(clips),
  );
  assert.deepEqual(second, first);
  assert.equal(first.parts.length, 15);
  assert.equal(first.parts.filter((part) => part.parentId === null).length, 1);
  assert.equal(first.parts.find((part) => part.parentId === null)?.jointId, "pelvis");
  assert.deepEqual(
    first.parts.map((part) => part.drawOrder),
    [...Array(15).keys()],
  );
  assert.ok(
    first.parts.every((part) =>
      part.resourcePath.endsWith(`${part.jointId}/spriteFrame`),
    ),
  );
  assert.deepEqual(
    first.clips.map((clip) => clip.animationId),
    [
      "simple-sprite-arm-wave",
      "simple-sprite-rest-idle",
      "simple-sprite-walk-cycle",
    ],
  );
});

test("derives visual placement generically and fails closed on contract policy", async () => {
  const { layout, clips } = await inputs();
  const plan = buildCocosSimpleSpriteCharacterPlan(layout, clips);
  for (const part of layout.parts) {
    const actual = plan.parts.find((candidate) => candidate.jointId === part.partId)!;
    const jointX = part.originalRect.x + part.anchor.x * part.originalRect.width;
    const jointY = part.originalRect.y + part.anchor.y * part.originalRect.height;
    assert.deepEqual(actual.visualOffset, {
      x:
        (part.originalRect.x + part.originalRect.width / 2 - jointX) *
        layout.referenceScale,
      y:
        (jointY - (part.originalRect.y + part.originalRect.height / 2)) *
        layout.referenceScale,
    });
  }
  assert.throws(
    () =>
      buildCocosSimpleSpriteCharacterPlan(
        { ...layout, visualPlacementMode: "trimmed-pixels" },
        clips,
      ),
    /SIMPLE_SPRITE_SOURCE_CANVAS_PLACEMENT_REQUIRED/,
  );
});

test("runtime applies one sampled pose identically to sprite and skeleton joints", async () => {
  const runtime = await readFile(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/simple-sprite-character/simple-sprite-character-demo.ts",
    ),
    "utf8",
  );
  assert.match(runtime, /this\.setPose\(binding\.spriteJoint, pose\)/);
  assert.match(runtime, /this\.setPose\(binding\.skeletonJoint, pose\)/);
  assert.match(runtime, /resources\.load\(/);
  assert.match(runtime, /SpriteFrame/);
  assert.doesNotMatch(runtime, /(?:partCorrections|correctionByPart|switch\s*\(\s*part)/);
  assert.doesNotMatch(runtime, /red[ -]?cap|briefcase|sunglasses|jacket|hat/i);
});

test("dedicated scene and runtime expose the complete verification surface", async () => {
  const scenePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/simple-sprite-character-bridge.scene",
  );
  const runtimePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/gameai/simple-sprite-character/simple-sprite-character-demo.ts",
  );
  const scene = await readFile(scenePath, "utf8");
  const runtime = await readFile(runtimePath, "utf8");
  assert.doesNotThrow(() => JSON.parse(scene));
  assert.match(scene, /SimpleSpriteGenerated/);
  assert.match(scene, /59b5aM2JgFJK5uq30lFpDa4/);
  for (const label of [
    "SpriteView",
    "SkeletonDebugView",
    "JointMarker_",
    "Bounds_",
    "PivotMarker_",
    "ParentLink_",
  ]) {
    assert.match(scene, new RegExp(label));
    assert.match(runtime, new RegExp(label));
  }
  for (const control of [
    "DIGIT_1",
    "DIGIT_2",
    "DIGIT_3",
    "SPACE",
    "KEY_R",
    "KEY_J",
    "KEY_B",
    "KEY_A",
    "KEY_L",
    "KEY_V",
  ]) {
    assert.match(runtime, new RegExp(`KeyCode\\.${control}`));
  }
  assert.match(runtime, /`CLIP /);
  assert.match(runtime, /`STATE /);
  assert.match(runtime, /`TIME /);
  assert.doesNotMatch(
    `${scene}\n${runtime}`,
    /red[ -]?cap|briefcase|sunglasses|jacket|hat/i,
  );
});

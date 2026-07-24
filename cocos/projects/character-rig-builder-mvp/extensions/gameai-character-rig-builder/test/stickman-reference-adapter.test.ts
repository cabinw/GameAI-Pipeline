import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { RigAnimation } from "@gameai/rig-animation";

import { buildCocosStickmanReferencePlan } from "../source/stickman-reference-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const fixtureRoot = path.join(repositoryRoot, "examples/stickman-reference");

async function json(file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
}

test("builds a deterministic Cocos-only primitive plan from engine-neutral data", async () => {
  const layout = (await json("rig-layout.json")) as Parameters<
    typeof buildCocosStickmanReferencePlan
  >[0];
  const visuals = (await json("visuals.json")) as Parameters<
    typeof buildCocosStickmanReferencePlan
  >[1];
  const clips = (await Promise.all(
    ["rest-idle", "arm-wave", "walk-cycle"].map(
      (name) => json(`animations/${name}.json`) as Promise<RigAnimation>,
    ),
  )) as RigAnimation[];
  const first = buildCocosStickmanReferencePlan(layout, visuals, clips);
  const second = buildCocosStickmanReferencePlan(
    structuredClone(layout),
    structuredClone(visuals),
    structuredClone(clips),
  );

  assert.deepEqual(second, first);
  assert.equal(first.rigId, "stickman-reference-layout");
  assert.equal(first.parts.length, 16);
  assert.deepEqual(
    first.clips.map((clip) => clip.animationId),
    ["stickman-arm-wave", "stickman-rest-idle", "stickman-walk-cycle"],
  );
  assert.deepEqual(
    first.parts.map((part) => part.drawOrder),
    [...Array(16).keys()],
  );
  assert.equal(first.parts.filter((part) => part.parentId === null).length, 1);
  assert.equal(first.parts.every((part) => part.visual.partId === part.jointId), true);
  assert.deepEqual(first.mirrorPairs[0], [
    "upper-arm-left",
    "upper-arm-right",
  ]);
});

test("fails closed when a primitive visual is missing", async () => {
  const layout = (await json("rig-layout.json")) as Parameters<
    typeof buildCocosStickmanReferencePlan
  >[0];
  const visuals = structuredClone(
    (await json("visuals.json")) as Parameters<
      typeof buildCocosStickmanReferencePlan
    >[1],
  ) as {
    parts: Array<{ partId: string }>;
  } & Parameters<typeof buildCocosStickmanReferencePlan>[1];
  visuals.parts.pop();
  assert.throws(
    () => buildCocosStickmanReferencePlan(layout, visuals, []),
    /STICKMAN_VISUAL_PART_MISMATCH/,
  );
});

test("commits one Cocos scene with the complete primitive hierarchy and runtime controls", async () => {
  const projectRoot = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp",
  );
  const scene = await readFile(
    path.join(projectRoot, "assets/stickman-articulation-reference.scene"),
    "utf8",
  );
  const runtime = await readFile(
    path.join(
      projectRoot,
      "assets/gameai/stickman-reference/stickman-articulation-demo.ts",
    ),
    "utf8",
  );
  for (const prefix of ["Joint_", "Visual_", "Marker_"]) {
    assert.equal(
      new Set(
        scene.match(new RegExp(`"_name": "${prefix}[^"]+"`, "g")) ?? [],
      ).size,
      16,
      prefix,
    );
  }
  assert.doesNotMatch(scene, /red-cap/i);
  assert.match(runtime, /class GameAIStickmanArticulationDemo/);
  assert.match(runtime, /new RigAnimationPlayback/);
  assert.match(runtime, /addComponent\(Graphics\)/);
  assert.match(runtime, /ClipAndPlaybackState/);
  assert.match(runtime, /KeyCode\.DIGIT_1/);
  assert.match(runtime, /KeyCode\.DIGIT_2/);
  assert.match(runtime, /KeyCode\.DIGIT_3/);
  assert.match(runtime, /exact authored rest pose/);
});

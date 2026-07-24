import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  RigAnimationPlayback,
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  transformPoint,
  validateRigHierarchy,
  type RigAnimation,
  type RigHierarchyJoint,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/simple-sprite-character");
const layout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
) as {
  schemaVersion: string;
  layoutId: string;
  parts: Array<{
    partId: string;
    parentId: string | null;
    restPose: RigHierarchyJoint["restPose"] & { opacity: number };
  }>;
};
const hierarchy: RigHierarchyJoint[] = layout.parts.map((part) => ({
  jointId: part.partId,
  parentId: part.parentId,
  restPose: {
    position: { ...part.restPose.position },
    rotationDegrees: part.restPose.rotationDegrees,
    scale: { ...part.restPose.scale },
  },
}));
const jointIds = new Set(hierarchy.map((joint) => joint.jointId));
const artwork = JSON.parse(
  readFileSync(
    path.join(fixtureRoot, "source/mannequin-source.json"),
    "utf8",
  ),
) as {
  parts: Array<{
    partId: string;
    parentId: string | null;
    radius?: number;
    shape?: { radius: number };
  }>;
};

async function clip(name: string): Promise<RigAnimation> {
  const result = parseRigAnimation(
    await readFile(path.join(fixtureRoot, `animations/${name}.json`), "utf8"),
    {
      rigId: layout.layoutId,
      rigSchemaVersion: layout.schemaVersion,
      jointIds,
    },
  );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(`${name} did not parse`);
  return result.value;
}

test("evaluates the valid 15-part sprite hierarchy deterministically", () => {
  assert.deepEqual(validateRigHierarchy(hierarchy), []);
  const first = evaluateRigPose(hierarchy);
  const second = evaluateRigPose(structuredClone(hierarchy));
  assert.deepEqual(second, first);
  assert.equal(first.evaluationOrder[0], "pelvis");
  assert.equal(Object.keys(first.joints).length, 15);
});

test("keeps anatomical mirror rest and walk semantics explicit", async () => {
  const part = (id: string) => hierarchy.find((joint) => joint.jointId === id)!;
  for (const base of ["upper-arm", "thigh"]) {
    const left = part(`${base}-left`).restPose.position;
    const right = part(`${base}-right`).restPose.position;
    assert.equal(left.x, -right.x, base);
    assert.equal(left.y, right.y, base);
  }

  const walk = normalizeRigAnimation(await clip("walk-cycle"));
  const track = (id: string) =>
    walk.tracks.find(
      (candidate) =>
        candidate.jointId === id && candidate.property === "rotation",
    )!;
  for (const base of ["upper-arm", "thigh"]) {
    const left = track(`${base}-left`).keyframes;
    const right = track(`${base}-right`).keyframes;
    assert.deepEqual(
      left.map((frame) => frame.time),
      right.map((frame) => frame.time),
    );
    assert.deepEqual(
      left.map((frame) => frame.value),
      right.map((frame) => -(frame.value as number)),
    );
  }
});

test("pause is exact and reset restores authored local and world rest pose", async () => {
  const animation = normalizeRigAnimation(await clip("walk-cycle"));
  const playback = new RigAnimationPlayback(animation);
  playback.play();
  const moving = playback.update(0.37);
  const paused = playback.pause();
  assert.deepEqual(paused, moving);
  assert.deepEqual(playback.update(0.8), paused);
  playback.play();
  assert.notDeepEqual(playback.update(0.1), paused);
  const reset = playback.stop();
  assert.equal(playback.status, "stopped");
  assert.equal(reset.sampleTime, 0);

  const authored = evaluateRigPose(hierarchy);
  // The Cocos Reset command intentionally writes authored rest directly after
  // stopping, because walk's valid time-zero keyframes are already in motion.
  const exactReset = evaluateRigPose(hierarchy);
  const timeZero = evaluateRigPose(
    hierarchy,
    new RigAnimationPlayback(
      normalizeRigAnimation(await clip("rest-idle")),
    ).stop(),
  );
  assert.deepEqual(exactReset, authored);
  assert.deepEqual(timeZero, authored);
});

test("all three clips produce repeatable world pivots at intended sample ranges", async () => {
  for (const name of ["rest-idle", "arm-wave", "walk-cycle"]) {
    const animation = normalizeRigAnimation(await clip(name));
    for (let index = 0; index <= 12; index += 1) {
      const time = (animation.duration * index) / 12;
      const first = new RigAnimationPlayback(animation);
      const second = new RigAnimationPlayback(animation);
      const poseA = evaluateRigPose(hierarchy, first.seek(time));
      const poseB = evaluateRigPose(hierarchy, second.seek(time));
      assert.deepEqual(poseB, poseA, `${name}@${time}`);
      for (const value of Object.values(poseA.joints)) {
        assert.ok(Number.isFinite(value.worldPivot.x));
        assert.ok(Number.isFinite(value.worldPivot.y));
      }
    }
  }
});

test("every animated joint keeps a positive rounded overlap centered on its parent link", async () => {
  for (const name of ["rest-idle", "arm-wave", "walk-cycle"]) {
    const animation = normalizeRigAnimation(await clip(name));
    for (let index = 0; index <= 24; index += 1) {
      const playback = new RigAnimationPlayback(animation);
      const pose = evaluateRigPose(
        hierarchy,
        playback.seek((animation.duration * index) / 24),
      );
      for (const part of artwork.parts) {
        if (part.parentId === null) continue;
        const joint = pose.joints[part.partId]!;
        const parent = pose.joints[part.parentId]!;
        const expectedJoint = transformPoint(
          parent.worldTransform,
          joint.localPose.position,
        );
        assert.deepEqual(
          joint.worldPivot,
          expectedJoint,
          `${name}:${part.parentId}->${part.partId}@${index}`,
        );
        assert.ok(
          (part.radius ?? part.shape?.radius ?? 0) > 0,
          `${part.partId} must keep a visible rounded cap`,
        );
      }
    }
  }
});

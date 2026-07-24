import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ONE_HANDED_PROP_CONTROL_CLIP_IDS,
  OneHandedPropControlError,
  resolveOneHandedPropControlClips,
  type OneHandedPropControl,
} from "../source/one-handed-prop-controls";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop/animations",
);
const runtimePath = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/one-handed-prop/one-handed-prop-demo.ts",
);
const clips = ["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map(
  (name) =>
    JSON.parse(
      readFileSync(path.join(fixtureRoot, `${name}.json`), "utf8"),
    ) as { readonly animationId: string },
);

for (const control of [1, 2, 3, 4] as const) {
  test(`prop demo control ${control} activates its documented semantic clip`, () => {
    const resolved = resolveOneHandedPropControlClips(clips);
    assert.equal(
      resolved[control].animationId,
      ONE_HANDED_PROP_CONTROL_CLIP_IDS[control],
    );
  });
}

test("prop demo controls remain semantic when generated clips are reordered", () => {
  const deliberatelyReordered = [clips[0]!, clips[3]!, clips[2]!, clips[1]!];
  const resolved = resolveOneHandedPropControlClips(deliberatelyReordered);
  assert.deepEqual(
    ([1, 2, 3, 4] as OneHandedPropControl[]).map(
      (control) => resolved[control].animationId,
    ),
    [
      "production-lite-prop-rest",
      "production-lite-prop-walk",
      "production-lite-prop-swing",
      "production-lite-prop-stress",
    ],
  );
});

test("missing required prop demo clip has a stable error", () => {
  assert.throws(
    () => resolveOneHandedPropControlClips(clips.slice(0, 3)),
    (error) =>
      error instanceof OneHandedPropControlError &&
      error.code === "PROP_DEMO_REQUIRED_CLIP_MISSING" &&
      error.animationId === "production-lite-prop-stress",
  );
});

test("duplicate required prop demo clip has a stable error", () => {
  assert.throws(
    () => resolveOneHandedPropControlClips([...clips, clips[1]!]),
    (error) =>
      error instanceof OneHandedPropControlError &&
      error.code === "PROP_DEMO_REQUIRED_CLIP_DUPLICATE" &&
      error.animationId === "production-lite-prop-walk",
  );
});

test("runtime keys use semantic controls and HUD identity comes from playback", () => {
  const runtime = readFileSync(runtimePath, "utf8");
  for (const control of [1, 2, 3, 4] as const) {
    assert.match(
      runtime,
      new RegExp(`KeyCode\\.DIGIT_${control}\\) this\\.selectClip\\(${control}\\)`),
    );
  }
  assert.match(runtime, /this\.playback\.animation\.animationId/);
  assert.doesNotMatch(runtime, /ONE_HANDED_PROP_CONTROL_CLIP_IDS.*status/);
});

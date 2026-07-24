import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type {
  AttachmentLayout,
  CharacterLoadoutContract,
  RigLayout,
} from "@gameai/character-contracts";
import {
  normalizeRigAnimation,
  RigAnimationPlayback,
  type RigAnimation,
} from "@gameai/rig-animation";

import { buildCocosComposableCharacterLoadoutPlan } from "../source/composable-character-loadout-adapter";
import {
  ComposableLoadoutControlError,
  resolveComposableLoadoutControlClips,
} from "../source/composable-character-loadout-controls";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const readJson = (root: string, file: string) =>
  JSON.parse(readFileSync(path.join(root, file), "utf8"));
const rig = readJson(fixtureRoot, "rig-layout.json") as RigLayout;
const serialized = readJson(fixtureRoot, "loadout-contract.json") as any;
const contract: CharacterLoadoutContract = {
  ...serialized,
  families: serialized.families.map(
    (family: { familyId: string; attachmentLayoutFile: string }) => ({
      familyId: family.familyId,
      attachmentLayout: readJson(
        fixtureRoot,
        family.attachmentLayoutFile,
      ) as AttachmentLayout,
    }),
  ),
};
const clips = [
  "rest",
  "walk",
  "wave",
  "prop-swing",
  "integration-stress",
].map(
  (name) =>
    readJson(fixtureRoot, `animations/${name}.json`) as RigAnimation,
);
const baseSource = readJson(
  path.join(repositoryRoot, "examples/production-lite-character"),
  "source/character-source.json",
);
const garmentSource = readJson(
  path.join(repositoryRoot, "examples/production-lite-garment-layering"),
  "source/garment-source.json",
);
const propSource = readJson(
  path.join(repositoryRoot, "examples/production-lite-one-handed-prop"),
  "source/prop-source.json",
);
const baseDimensions = Object.fromEntries(
  baseSource.parts.map((part: any) => [part.partId, part.trimSize]),
);
const attachmentDimensions = Object.fromEntries(
  [...garmentSource.attachments, ...propSource.attachments].map(
    (attachment: any) => [attachment.attachmentId, attachment.size],
  ),
);

test("generic Cocos adapter consumes one resolved loadout result for every state", () => {
  const plan = buildCocosComposableCharacterLoadoutPlan(
    rig,
    contract,
    clips,
    baseDimensions,
    attachmentDimensions,
    "production-lite-full-loadout",
    [
      "base-only",
      "accessories-only",
      "garment-only",
      "prop-only",
      "garment-accessories",
      "garment-prop",
      "accessories-prop",
      "full-loadout",
    ],
  );
  assert.equal(plan.planVersion, "1.0.0");
  assert.equal(Object.keys(plan.reconstructionStatus).length, 8);
  assert.equal(plan.states["base-only"]!.enabledAttachmentIds.length, 0);
  assert.equal(plan.states["full-loadout"]!.enabledAttachmentIds.length, 16);
  assert.equal(
    plan.states["full-loadout-right"]!.enabledAttachmentIds.includes(
      "toolbox-right",
    ),
    true,
  );
  assert.equal(
    plan.states["full-loadout-no-prop"]!.enabledAttachmentIds.some((id) =>
      id.startsWith("toolbox"),
    ),
    false,
  );
  assert.deepEqual(
    plan.base.parts.map((part) => part.sortingOrder),
    [...plan.base.parts.map((part) => part.sortingOrder)].sort(
      (left, right) => left - right,
    ),
  );
});

test("semantic controls ignore animation-array order and reject missing/duplicate IDs", () => {
  const reordered = [...clips].reverse();
  const controls = resolveComposableLoadoutControlClips(reordered);
  assert.equal(controls[1].animationId, "production-lite-full-loadout-rest");
  assert.equal(
    controls[5].animationId,
    "production-lite-full-loadout-integration-stress",
  );
  assert.throws(
    () => resolveComposableLoadoutControlClips(reordered.slice(1)),
    (error) =>
      error instanceof ComposableLoadoutControlError &&
      error.code === "LOADOUT_REQUIRED_CLIP_MISSING",
  );
  assert.throws(
    () => resolveComposableLoadoutControlClips([...reordered, reordered[0]!]),
    (error) =>
      error instanceof ComposableLoadoutControlError &&
      error.code === "LOADOUT_REQUIRED_CLIP_DUPLICATE",
  );
});

test("exact Reset is stopped at 0.00 with the authored Rest sample", () => {
  const rest = clips.find(
    (clip) => clip.animationId === "production-lite-full-loadout-rest",
  )!;
  const playback = new RigAnimationPlayback(normalizeRigAnimation(rest));
  const authored = playback.sample();
  playback.play();
  playback.update(1.25);
  const reset = playback.stop();
  assert.equal(playback.status, "stopped");
  assert.equal(playback.time, 0);
  assert.deepEqual(reset, authored);
});

test("generic adapter source contains no fixture attachment names", () => {
  const source = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/extensions/gameai-character-rig-builder/source/composable-character-loadout-adapter.ts",
    ),
    "utf8",
  ).toLowerCase();
  for (const forbidden of [
    "cap-",
    "sunglasses",
    "jacket",
    "collar",
    "toolbox",
    "briefcase",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("integrated Cocos scene exposes the complete loadout and debug surface", () => {
  const runtime = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-demo.ts",
    ),
    "utf8",
  );
  const scene = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/composable-full-loadout-reference.scene",
    ),
    "utf8",
  );
  for (const token of [
    "base-only",
    "accessories-only",
    "garment-only",
    "prop-only",
    "garment-accessories",
    "garment-prop",
    "accessories-prop",
    "full-loadout",
    "full-loadout-no-prop",
    "full-loadout-left",
    "full-loadout-right",
    "ReferenceAssembledOverlay",
    "joints",
    "bounds",
    "pivots",
    "parent links",
    "global layer labels",
    "attachment slots",
    "garment seams",
    "sockets",
    "grip markers",
    "skeleton",
    "Exact Reset",
    "playback?.animation.animationId",
  ]) {
    assert.equal(runtime.includes(token), true, token);
  }
  assert.equal(scene.includes("composable-full-loadout-reference"), true);
  assert.equal(scene.includes("TASK-013"), true);
});

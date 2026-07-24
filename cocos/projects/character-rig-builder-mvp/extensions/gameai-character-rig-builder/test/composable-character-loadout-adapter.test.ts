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
  calculateComposableLoadoutHudBounds,
  COMPOSABLE_LOADOUT_HUD_LAYOUT,
  ComposableLoadoutControlError,
  resolveComposableLoadoutControlClips,
  TASK_013_HUD_RUNTIME_BOUNDS_INVALID,
  validateComposableLoadoutHudRuntimeBounds,
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

test("TASK-013 HUD stays inside the 1280x720 design Canvas", () => {
  const layout = COMPOSABLE_LOADOUT_HUD_LAYOUT;
  const bounds = calculateComposableLoadoutHudBounds(
    layout.designWidth,
    layout.designHeight,
  );
  const canvas = {
    left: -layout.designWidth / 2,
    right: layout.designWidth / 2,
    top: layout.designHeight / 2,
    bottom: -layout.designHeight / 2,
  };
  assert.equal(bounds.position.x, -615);
  assert.equal(bounds.position.y, 346);
  assert.equal(bounds.left, -615);
  assert.equal(bounds.right, 615);
  assert.equal(bounds.top, 346);
  assert.equal(bounds.bottom, 191);
  assert.ok(bounds.left >= canvas.left);
  assert.ok(bounds.right <= canvas.right);
  assert.ok(bounds.top <= canvas.top);
  assert.ok(bounds.bottom >= canvas.bottom);
});

test("TASK-013 HUD declares non-overlapping in-bounds status rows", () => {
  const layout = COMPOSABLE_LOADOUT_HUD_LAYOUT;
  const bounds = calculateComposableLoadoutHudBounds();
  assert.deepEqual(layout.rows, [
    "task-title",
    "runtime-status",
    "validation-status",
    "shortcuts",
  ]);
  assert.equal(bounds.rowBounds.length, layout.rows.length);
  for (const [index, row] of bounds.rowBounds.entries()) {
    assert.ok(row.top <= bounds.top, row.rowId);
    assert.ok(row.bottom >= bounds.bottom, row.rowId);
    assert.ok(row.top > row.bottom, row.rowId);
    if (index > 0) {
      assert.equal(bounds.rowBounds[index - 1]!.bottom, row.top, row.rowId);
    }
  }
  assert.ok(
    layout.rows.length * layout.lineHeight <= layout.height,
    "all rows fit inside HUD content height",
  );
});

test("TASK-013 runtime HUD guard accepts final bounds and rejects the observed centered bounds", () => {
  const expected = {
    left: -615,
    right: 615,
    top: 346,
    bottom: 191,
  };
  const containerContentBounds = {
    left: 0,
    right: 1230,
    top: 0,
    bottom: -155,
  };
  assert.doesNotThrow(() =>
    validateComposableLoadoutHudRuntimeBounds({
      canvasSafeBounds: expected,
      containerBounds: expected,
      labelBounds: expected,
      labelBoundsInContainer: containerContentBounds,
      containerContentBounds,
      labelContentHeight: 155,
    }),
  );
  assert.throws(
    () =>
      validateComposableLoadoutHudRuntimeBounds({
        canvasSafeBounds: expected,
        containerBounds: expected,
        labelBounds: {
          left: -1230,
          right: 0,
          top: 423.5,
          bottom: 268.5,
        },
        labelBoundsInContainer: {
          left: -615,
          right: 615,
          top: 77.5,
          bottom: -77.5,
        },
        containerContentBounds,
        labelContentHeight: 155,
      }),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_HUD_RUNTIME_BOUNDS_INVALID) &&
      error.message.includes("-1230") &&
      error.message.includes("423.5"),
  );
});

test("generated TASK-013 runtime owns the repaired HUD configuration", () => {
  const sourceControls = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/extensions/gameai-character-rig-builder/source/composable-character-loadout-controls.ts",
    ),
    "utf8",
  );
  const generatedControls = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-controls.ts",
    ),
    "utf8",
  );
  assert.equal(
    generatedControls,
    `// Generated from the tested semantic control resolver. Do not hand-edit.\n${sourceControls}`,
  );
  const runtime = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-demo.ts",
    ),
    "utf8",
  );
  assert.equal(
    runtime.includes('from "./composable-loadout-controls"'),
    true,
  );
  assert.equal(runtime.includes("this.hud(this.node)"), true);
  assert.equal(runtime.includes("this.hud(root)"), false);
});

test("generated TASK-013 runtime scene graph stabilizes Label-owned transform state", () => {
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
  const generatedControls = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-controls.ts",
    ),
    "utf8",
  );
  const containerCreation = runtime.indexOf(
    "new Node(COMPOSABLE_LOADOUT_HUD_LAYOUT.containerName)",
  );
  const labelCreation = runtime.indexOf(
    "new Node(COMPOSABLE_LOADOUT_HUD_LAYOUT.labelName)",
  );
  const labelParenting = runtime.indexOf("labelNode.setParent(container)");
  const labelCreationCall = runtime.indexOf("labelNode.addComponent(Label)");
  const labelConfiguration = runtime.indexOf(
    "this.status.overflow = Label.Overflow.CLAMP",
  );
  const finalTransform = runtime.indexOf(
    "labelNode.getComponent(UITransform)",
  );
  const finalAnchor = runtime.indexOf(
    "labelTransform.setAnchorPoint",
  );
  const finalSize = runtime.indexOf("labelTransform.setContentSize");
  const finalPosition = runtime.indexOf("labelNode.setPosition(0, 0, 0)");
  const finalString = runtime.indexOf("this.updateHud()", finalPosition);
  assert.ok(containerCreation >= 0);
  assert.ok(labelCreation > containerCreation);
  assert.ok(labelParenting > labelCreation);
  assert.ok(labelCreationCall > labelParenting);
  assert.ok(labelConfiguration > labelCreationCall);
  assert.ok(finalTransform > labelConfiguration);
  assert.ok(finalAnchor > finalTransform);
  assert.ok(finalSize > finalAnchor);
  assert.ok(finalPosition > finalSize);
  assert.ok(finalString > finalPosition);
  assert.equal(runtime.includes("container.addComponent(Label)"), false);
  assert.equal(generatedControls.includes('containerName: "HUDContainer"'), true);
  assert.equal(generatedControls.includes('labelName: "HUDLabel"'), true);
  assert.equal(runtime.includes("this.status.enableWrapText = false"), true);
  assert.equal(runtime.includes("Label.Overflow.CLAMP"), true);
  assert.equal(runtime.includes("Director.EVENT_AFTER_DRAW"), true);
  assert.equal(
    runtime.includes("validateComposableLoadoutHudRuntimeBounds(measurement)"),
    true,
  );
  assert.equal(
    runtime.includes("TASK_013_HUD_RUNTIME_BOUNDS"),
    true,
  );
  assert.equal(scene.includes("TASK-013"), true);
  assert.equal(
    scene.includes("c83e6PqIb5JVZNMf1hkxheW"),
    true,
    "generated scene retains the runtime component that emits HUDContainer/HUDLabel",
  );
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
    "calculateComposableLoadoutHudBounds",
    "setAnchorPoint",
    "HorizontalTextAlignment.LEFT",
    "VerticalTextAlignment.TOP",
    "PRESET ${this.presetId}",
    "PROP ${this.propState}",
    "CLIP ID ${clipId}",
    "GRIP PASS",
    "SEAMS PASS",
    "ACCESSORY SOCKETS PASS",
    "GLOBAL LAYERS PASS",
    "F1–F8 presets",
    "Label.Overflow.CLAMP",
  ]) {
    assert.equal(runtime.includes(token), true, token);
  }
  assert.equal(scene.includes("composable-full-loadout-reference"), true);
  assert.equal(scene.includes("TASK-013"), true);
});

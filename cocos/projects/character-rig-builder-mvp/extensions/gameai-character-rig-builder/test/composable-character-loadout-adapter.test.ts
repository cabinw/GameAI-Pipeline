import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  COMPOSABLE_LOADOUT_CHARACTER_ACCEPTANCE_BOUNDS,
  COMPOSABLE_LOADOUT_CONTROL_BINDINGS,
  COMPOSABLE_LOADOUT_HUD_LAYOUT,
  deriveComposableLoadoutResourceManifest,
  formatComposableLoadoutControlHelpLines,
  formatComposableLoadoutHudLines,
  ComposableLoadoutControlError,
  resolveComposableLoadoutControlClips,
  TASK_013_CONTROL_BINDINGS_INVALID,
  TASK_013_RESOURCE_LOAD_FAILED,
  TASK_013_RESOURCE_MANIFEST_INVALID,
  TASK_013_HUD_RUNTIME_BOUNDS_INVALID,
  TASK_013_HUD_TEXT_OVERFLOW,
  validateComposableLoadoutHudLines,
  validateComposableLoadoutHudRuntimeBounds,
  validateComposableLoadoutHudTextLayout,
  validateComposableLoadoutControlBindings,
  type ComposableLoadoutControlBinding,
} from "../source/composable-character-loadout-controls";
import {
  composableLoadoutResourcePngPath,
  validateComposableLoadoutResourceObservations,
  type ComposableLoadoutResourceObservation,
} from "../source/composable-character-loadout-resource-manifest";

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
const completeHudResourceState = {
  resourceExpectedCount: 43,
  resourceLoadedCount: 43,
  resourceFailedCount: 0,
  resourceDuplicateRequestCount: 0,
} as const;
const exactReferenceStateIds = [
  "base-only",
  "accessories-only",
  "garment-only",
  "prop-only",
  "garment-accessories",
  "garment-prop",
  "accessories-prop",
  "full-loadout",
] as const;
const composablePlan = buildCocosComposableCharacterLoadoutPlan(
  rig,
  contract,
  clips,
  baseDimensions,
  attachmentDimensions,
  "production-lite-full-loadout",
  exactReferenceStateIds,
);

test("generic Cocos adapter consumes one resolved loadout result for every state", () => {
  const plan = composablePlan;
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

test("TASK-013 resource manifest resolves every tracked SpriteFrame resource", () => {
  const manifest = deriveComposableLoadoutResourceManifest(composablePlan);
  assert.equal(manifest.length, 43);
  assert.equal(
    manifest.filter((entry) => entry.category === "base-part").length,
    17,
  );
  assert.equal(
    manifest.filter((entry) => entry.category === "attachment").length,
    18,
  );
  assert.equal(
    manifest.filter((entry) => entry.category === "reference").length,
    8,
  );
  assert.equal(new Set(manifest.map((entry) => entry.resourcePath)).size, 43);
  const resourcesRoot = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources",
  );
  const observations = manifest.map((entry) => {
    const relativePng = composableLoadoutResourcePngPath(entry.resourcePath);
    const png = path.join(resourcesRoot, relativePng);
    const metaFile = `${png}.meta`;
    const pngExists = existsSync(png);
    const metaExists = existsSync(metaFile);
    if (!metaExists) {
      return {
        resourcePath: entry.resourcePath,
        pngExists,
        metaExists,
        assetUuid: null,
        spriteFrameName: null,
        spriteFrameUuid: null,
      };
    }
    const meta = JSON.parse(readFileSync(metaFile, "utf8")) as {
      readonly uuid?: unknown;
      readonly subMetas?: Readonly<
        Record<
          string,
          {
            readonly importer?: unknown;
            readonly name?: unknown;
            readonly uuid?: unknown;
          }
        >
      >;
    };
    const spriteFrame = Object.values(meta.subMetas ?? {}).find(
      (subMeta) =>
        subMeta.name === "spriteFrame" &&
        subMeta.importer === "sprite-frame",
    );
    return {
      resourcePath: entry.resourcePath,
      pngExists,
      metaExists,
      assetUuid: typeof meta.uuid === "string" ? meta.uuid : null,
      spriteFrameName:
        typeof spriteFrame?.name === "string" ? spriteFrame.name : null,
      spriteFrameUuid:
        typeof spriteFrame?.uuid === "string" ? spriteFrame.uuid : null,
    };
  });
  assert.doesNotThrow(() =>
    validateComposableLoadoutResourceObservations(manifest, observations),
  );
});

test("TASK-013 resource manifest rejects missing files, bad subMeta, suffix, and duplicate UUIDs", () => {
  const manifest = deriveComposableLoadoutResourceManifest(composablePlan);
  const valid = manifest.map(
    (entry, index): ComposableLoadoutResourceObservation => ({
      resourcePath: entry.resourcePath,
      pngExists: true,
      metaExists: true,
      assetUuid: `asset-${index}`,
      spriteFrameName: "spriteFrame",
      spriteFrameUuid: `sprite-${index}`,
    }),
  );
  const rejects = (
    observations: readonly ComposableLoadoutResourceObservation[],
    reason: string,
  ) =>
    assert.throws(
      () =>
        validateComposableLoadoutResourceObservations(
          manifest,
          observations,
        ),
      (error) =>
        error instanceof Error &&
        error.message.startsWith(TASK_013_RESOURCE_MANIFEST_INVALID) &&
        error.message.includes(reason),
    );
  rejects(
    valid.map((entry, index) =>
      index === 0 ? { ...entry, pngExists: false } : entry,
    ),
    "MISSING_PNG",
  );
  rejects(
    valid.map((entry, index) =>
      index === 0 ? { ...entry, metaExists: false } : entry,
    ),
    "MISSING_META",
  );
  rejects(
    valid.map((entry, index) =>
      index === 0 ? { ...entry, spriteFrameName: null } : entry,
    ),
    "MISSING_SPRITE_FRAME_SUBMETA",
  );
  rejects(
    valid.map((entry, index) =>
      index === 1
        ? { ...entry, assetUuid: valid[0]!.assetUuid }
        : entry,
    ),
    "duplicateAssetUuids",
  );
  rejects(
    valid.map((entry, index) =>
      index === 1
        ? { ...entry, spriteFrameUuid: valid[0]!.spriteFrameUuid }
        : entry,
    ),
    "duplicateSpriteFrameUuids",
  );
  assert.throws(
    () => composableLoadoutResourcePngPath("parts/head.png/spriteFrame"),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_RESOURCE_MANIFEST_INVALID) &&
      error.message.includes("INCORRECT_RESOURCE_SUFFIX"),
  );
  assert.throws(
    () =>
      deriveComposableLoadoutResourceManifest({
        ...composablePlan,
        attachments: [
          ...composablePlan.attachments,
          {
            ...composablePlan.attachments[0]!,
            attachmentId: "duplicate-logical-resource",
          },
        ],
      }),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_RESOURCE_MANIFEST_INVALID) &&
      error.message.includes("duplicatePaths"),
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

test("TASK-013 shared bindings define every documented control and canonical K/Y actions", () => {
  const actual = Object.fromEntries(
    COMPOSABLE_LOADOUT_CONTROL_BINDINGS.map((entry) => [
      entry.displayedKey,
      {
        cocosKeyCode: entry.cocosKeyCode,
        runtimeAction: entry.runtimeAction,
      },
    ]),
  );
  assert.deepEqual(actual, {
    F1: {
      cocosKeyCode: "F1",
      runtimeAction: { kind: "set-preset", presetId: "base-only" },
    },
    F2: {
      cocosKeyCode: "F2",
      runtimeAction: { kind: "set-preset", presetId: "accessories-only" },
    },
    F3: {
      cocosKeyCode: "F3",
      runtimeAction: { kind: "set-preset", presetId: "garment-only" },
    },
    F4: {
      cocosKeyCode: "F4",
      runtimeAction: { kind: "set-preset", presetId: "prop-only" },
    },
    F5: {
      cocosKeyCode: "F5",
      runtimeAction: {
        kind: "set-preset",
        presetId: "garment-accessories",
      },
    },
    F6: {
      cocosKeyCode: "F6",
      runtimeAction: { kind: "set-preset", presetId: "garment-prop" },
    },
    F7: {
      cocosKeyCode: "F7",
      runtimeAction: { kind: "set-preset", presetId: "accessories-prop" },
    },
    F8: {
      cocosKeyCode: "F8",
      runtimeAction: { kind: "set-preset", presetId: "full-loadout" },
    },
    Q: {
      cocosKeyCode: "KEY_Q",
      runtimeAction: { kind: "set-prop-state", propState: "no-prop" },
    },
    W: {
      cocosKeyCode: "KEY_W",
      runtimeAction: { kind: "set-prop-state", propState: "left-hand" },
    },
    E: {
      cocosKeyCode: "KEY_E",
      runtimeAction: { kind: "set-prop-state", propState: "right-hand" },
    },
    "1": {
      cocosKeyCode: "DIGIT_1",
      runtimeAction: { kind: "select-clip", control: 1 },
    },
    "2": {
      cocosKeyCode: "DIGIT_2",
      runtimeAction: { kind: "select-clip", control: 2 },
    },
    "3": {
      cocosKeyCode: "DIGIT_3",
      runtimeAction: { kind: "select-clip", control: 3 },
    },
    "4": {
      cocosKeyCode: "DIGIT_4",
      runtimeAction: { kind: "select-clip", control: 4 },
    },
    "5": {
      cocosKeyCode: "DIGIT_5",
      runtimeAction: { kind: "select-clip", control: 5 },
    },
    Space: {
      cocosKeyCode: "SPACE",
      runtimeAction: { kind: "toggle-playback" },
    },
    Esc: {
      cocosKeyCode: "ESCAPE",
      runtimeAction: { kind: "exact-reset" },
    },
    R: {
      cocosKeyCode: "KEY_R",
      runtimeAction: { kind: "toggle-view", view: "reference" },
    },
    A: {
      cocosKeyCode: "KEY_A",
      runtimeAction: { kind: "toggle-view", view: "assembled" },
    },
    O: {
      cocosKeyCode: "KEY_O",
      runtimeAction: { kind: "toggle-view", view: "overlay" },
    },
    J: {
      cocosKeyCode: "KEY_J",
      runtimeAction: { kind: "toggle-debug", group: "joints" },
    },
    B: {
      cocosKeyCode: "KEY_B",
      runtimeAction: { kind: "toggle-debug", group: "bounds" },
    },
    P: {
      cocosKeyCode: "KEY_P",
      runtimeAction: { kind: "toggle-debug", group: "pivots" },
    },
    L: {
      cocosKeyCode: "KEY_L",
      runtimeAction: { kind: "toggle-debug", group: "parent links" },
    },
    G: {
      cocosKeyCode: "KEY_G",
      runtimeAction: { kind: "toggle-debug", group: "global layer labels" },
    },
    T: {
      cocosKeyCode: "KEY_T",
      runtimeAction: { kind: "toggle-debug", group: "attachment slots" },
    },
    M: {
      cocosKeyCode: "KEY_M",
      runtimeAction: { kind: "toggle-debug", group: "garment seams" },
    },
    S: {
      cocosKeyCode: "KEY_S",
      runtimeAction: { kind: "toggle-debug", group: "sockets" },
    },
    K: {
      cocosKeyCode: "KEY_K",
      runtimeAction: { kind: "toggle-debug", group: "skeleton" },
    },
    Y: {
      cocosKeyCode: "KEY_Y",
      runtimeAction: { kind: "toggle-debug", group: "grip markers" },
    },
  });
  assert.notDeepEqual(actual.K.runtimeAction, {
    kind: "toggle-debug",
    group: "grip markers",
  });
  assert.notDeepEqual(actual.Y.runtimeAction, {
    kind: "toggle-debug",
    group: "skeleton",
  });
});

test("TASK-013 HUD help derives from the same bindings independent of declaration order", () => {
  const canonical = formatComposableLoadoutControlHelpLines();
  assert.deepEqual(
    formatComposableLoadoutControlHelpLines([
      ...COMPOSABLE_LOADOUT_CONTROL_BINDINGS,
    ].reverse()),
    canonical,
  );
  const byId = Object.fromEntries(
    canonical.map((line) => [line.rowId, line.text]),
  );
  assert.equal(
    byId["debug-controls-secondary"],
    "DEBUG T Slots · M Seams · S Sockets · K Skeleton · Y Grip",
  );
  const relabeled = COMPOSABLE_LOADOUT_CONTROL_BINDINGS.map((entry) =>
    entry.semanticActionId === "debug.skeleton"
      ? { ...entry, hudLabel: "Bones" }
      : entry,
  );
  assert.equal(
    formatComposableLoadoutControlHelpLines(relabeled).find(
      (line) => line.rowId === "debug-controls-secondary",
    )?.text,
    "DEBUG T Slots · M Seams · S Sockets · K Bones · Y Grip",
  );
});

test("TASK-013 shared bindings reject duplicate keys/actions and missing controls", () => {
  const mutate = (
    semanticActionId: string,
    update: Partial<ComposableLoadoutControlBinding>,
  ) =>
    COMPOSABLE_LOADOUT_CONTROL_BINDINGS.map((entry) =>
      entry.semanticActionId === semanticActionId
        ? { ...entry, ...update }
        : entry,
    );
  const rejects = (
    bindings: readonly ComposableLoadoutControlBinding[],
    detail: string,
  ) =>
    assert.throws(
      () => validateComposableLoadoutControlBindings(bindings),
      (error) =>
        error instanceof Error &&
        error.message.startsWith(TASK_013_CONTROL_BINDINGS_INVALID) &&
        error.message.includes(detail),
    );
  rejects(
    mutate("debug.prop-grip-markers", { displayedKey: "K" }),
    "duplicateDisplayedKeys",
  );
  rejects(
    mutate("debug.prop-grip-markers", { cocosKeyCode: "KEY_K" }),
    "duplicateCocosKeyCodes",
  );
  rejects(
    mutate("debug.prop-grip-markers", {
      semanticActionId: "debug.skeleton",
    }),
    "duplicateSemanticActions",
  );
  rejects(
    mutate("debug.prop-grip-markers", {
      runtimeAction: { kind: "toggle-debug", group: "skeleton" },
    }),
    "duplicateRuntimeActions",
  );
  rejects(COMPOSABLE_LOADOUT_CONTROL_BINDINGS.slice(1), "missingRequiredActions");
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
    "preset-prop-controls",
    "clip-controls",
    "playback-controls",
    "view-controls",
    "debug-controls-primary",
    "debug-controls-secondary",
  ]);
  assert.equal(layout.fontSize, 14);
  assert.equal(layout.lineHeight, 17);
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
  assert.ok(
    bounds.bottom > COMPOSABLE_LOADOUT_CHARACTER_ACCEPTANCE_BOUNDS.top,
    "HUD remains above the configured visible character acceptance bounds",
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
  const statusLabelBoundsInContainer = {
    left: 0,
    right: 1230,
    top: 0,
    bottom: -51,
  };
  const helpLabelBoundsInContainer = {
    left: 0,
    right: 1230,
    top: -51,
    bottom: -153,
  };
  const statusLabelBounds = {
    left: -615,
    right: 615,
    top: 346,
    bottom: 295,
  };
  const helpLabelBounds = {
    left: -615,
    right: 615,
    top: 295,
    bottom: 193,
  };
  assert.doesNotThrow(() =>
    validateComposableLoadoutHudRuntimeBounds({
      canvasSafeBounds: expected,
      containerBounds: expected,
      statusLabelBounds,
      helpLabelBounds,
      statusLabelBoundsInContainer,
      helpLabelBoundsInContainer,
      containerContentBounds,
      statusLabelContentHeight: 51,
      helpLabelContentHeight: 102,
    }),
  );
  assert.throws(
    () =>
      validateComposableLoadoutHudRuntimeBounds({
        canvasSafeBounds: expected,
        containerBounds: expected,
        statusLabelBounds: {
          left: -1230,
          right: 0,
          top: 423.5,
          bottom: 372.5,
        },
        helpLabelBounds,
        statusLabelBoundsInContainer: {
          left: -615,
          right: 615,
          top: 77.5,
          bottom: 26.5,
        },
        helpLabelBoundsInContainer,
        containerContentBounds,
        statusLabelContentHeight: 51,
        helpLabelContentHeight: 102,
      }),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_HUD_RUNTIME_BOUNDS_INVALID) &&
      error.message.includes("-1230") &&
      error.message.includes("423.5"),
  );
});

test("TASK-013 HUD formatter returns every required logical row within budgets", () => {
  const lines = formatComposableLoadoutHudLines({
    ...completeHudResourceState,
    presetId: "full-loadout",
    propState: "left-hand",
    clipId: "production-lite-full-loadout-integration-stress",
    playbackState: "PLAYING",
    timeSeconds: 12.5,
  });
  assert.deepEqual(
    lines.map((line) => line.rowId),
    COMPOSABLE_LOADOUT_HUD_LAYOUT.rows,
  );
  assert.equal(lines.length, 9);
  assert.equal(lines.filter((line) => line.region === "status").length, 3);
  assert.equal(lines.filter((line) => line.region === "help").length, 6);
  assert.equal(
    lines.some((line) =>
      line.text.includes("production-lite-full-loadout-integration-stress"),
    ),
    true,
    "actual semantic clip ID is preserved",
  );
  assert.equal(
    lines.find((line) => line.rowId === "validation-status")?.text,
    "RESOURCES 43/43 PASS · GRIP PASS · SEAMS PASS · SOCKETS PASS · LAYERS PASS · EXACT PASS",
  );
  for (const line of lines) {
    const maximum =
      line.region === "status"
        ? COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumStatusLineCharacters
        : COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumHelpLineCharacters;
    assert.ok(line.text.length <= maximum, `${line.rowId}: ${line.text}`);
    assert.equal(line.text.includes("\n"), false, line.rowId);
  }
});

test("TASK-013 HUD reports deterministic resource loading and failure states", () => {
  const state = {
    presetId: "full-loadout",
    propState: "left-hand",
    clipId: "production-lite-full-loadout-rest",
    playbackState: "STOPPED",
    timeSeconds: 0,
    resourceExpectedCount: 43,
    resourceDuplicateRequestCount: 0,
  } as const;
  const loading = formatComposableLoadoutHudLines({
    ...state,
    resourceLoadedCount: 17,
    resourceFailedCount: 0,
  });
  const failed = formatComposableLoadoutHudLines({
    ...state,
    resourceLoadedCount: 42,
    resourceFailedCount: 1,
  });
  assert.equal(
    loading.find((line) => line.rowId === "validation-status")?.text,
    "RESOURCES 17/43 LOADING · GRIP PASS · SEAMS PASS · SOCKETS PASS · LAYERS PASS · EXACT PASS",
  );
  assert.equal(
    failed.find((line) => line.rowId === "validation-status")?.text,
    "RESOURCES 42/43 FAIL · GRIP PASS · SEAMS PASS · SOCKETS PASS · LAYERS PASS · EXACT PASS",
  );
});

test("TASK-013 HUD formatter documents exact runtime keys", () => {
  const lines = formatComposableLoadoutHudLines({
    ...completeHudResourceState,
    presetId: "full-loadout",
    propState: "left-hand",
    clipId: "production-lite-full-loadout-rest",
    playbackState: "STOPPED",
    timeSeconds: 0,
  });
  const byId = Object.fromEntries(
    lines.map((line) => [line.rowId, line.text]),
  );
  assert.equal(
    byId["preset-prop-controls"],
    "PRESETS F1–F8 · PROP Q None · W Left · E Right",
  );
  assert.equal(
    byId["clip-controls"],
    "CLIPS 1 Rest · 2 Walk · 3 Wave · 4 Swing · 5 Stress",
  );
  assert.equal(
    byId["playback-controls"],
    "PLAY Space Pause/Resume · Esc Exact Reset",
  );
  assert.equal(
    byId["view-controls"],
    "VIEWS R Reference · A Assembled · O Overlay",
  );
  assert.equal(
    byId["debug-controls-primary"],
    "DEBUG J Joints · B Bounds · P Pivots · L Links · G Layers",
  );
  assert.equal(
    byId["debug-controls-secondary"],
    "DEBUG T Slots · M Seams · S Sockets · K Skeleton · Y Grip",
  );
});

test("TASK-013 HUD rejects the old clipped shortcut row and oversized semantic IDs", () => {
  const valid = formatComposableLoadoutHudLines({
    ...completeHudResourceState,
    presetId: "full-loadout",
    propState: "left-hand",
    clipId: "production-lite-full-loadout-rest",
    playbackState: "STOPPED",
    timeSeconds: 0,
  });
  const oldShortcut =
    "F1–F8 presets · Q/W/E prop · 1–5 clips · Space Pause/Resume · " +
    "Esc exact Reset · R/A/O views · J/B/P/L/G/T/M/S/K/Y debug · note";
  const invalid = valid.map((line) =>
    line.rowId === "preset-prop-controls"
      ? { ...line, text: oldShortcut }
      : line,
  );
  assert.throws(
    () => validateComposableLoadoutHudLines(invalid),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_HUD_TEXT_OVERFLOW) &&
      error.message.includes("maximumHelpLineCharacters"),
  );
  assert.throws(
    () =>
      formatComposableLoadoutHudLines({
        ...completeHudResourceState,
        presetId: "full-loadout",
        propState: "left-hand",
        clipId: `production-lite-${"x".repeat(80)}`,
        playbackState: "STOPPED",
        timeSeconds: 0,
      }),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_HUD_TEXT_OVERFLOW) &&
      error.message.includes("clipId"),
  );
});

test("TASK-013 HUD content guard keeps status/help regions separate and above the character", () => {
  const lines = formatComposableLoadoutHudLines({
    ...completeHudResourceState,
    presetId: "full-loadout",
    propState: "left-hand",
    clipId: "production-lite-full-loadout-rest",
    playbackState: "STOPPED",
    timeSeconds: 0,
  });
  const validMeasurement = {
    lines,
    containerBounds: {
      left: -615,
      right: 615,
      top: 346,
      bottom: 191,
    },
    statusLabelBoundsInContainer: {
      left: 0,
      right: 1230,
      top: 0,
      bottom: -51,
    },
    helpLabelBoundsInContainer: {
      left: 0,
      right: 1230,
      top: -51,
      bottom: -153,
    },
    containerContentBounds: {
      left: 0,
      right: 1230,
      top: 0,
      bottom: -155,
    },
    characterAcceptanceBounds:
      COMPOSABLE_LOADOUT_CHARACTER_ACCEPTANCE_BOUNDS,
  };
  assert.doesNotThrow(() =>
    validateComposableLoadoutHudTextLayout(validMeasurement),
  );
  assert.throws(
    () =>
      validateComposableLoadoutHudTextLayout({
        ...validMeasurement,
        helpLabelBoundsInContainer: {
          ...validMeasurement.helpLabelBoundsInContainer,
          top: -40,
        },
      }),
    (error) =>
      error instanceof Error &&
      error.message.startsWith(TASK_013_HUD_TEXT_OVERFLOW) &&
      error.message.includes("statusAndHelpDoNotOverlap"),
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

test("TASK-013 runtime dispatch and HUD consume the shared semantic bindings", () => {
  const runtime = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-demo.ts",
    ),
    "utf8",
  );
  const controls = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-controls.ts",
    ),
    "utf8",
  );
  assert.equal(
    runtime.includes("COMPOSABLE_LOADOUT_BINDINGS_BY_KEY_CODE.get(event.keyCode)"),
    true,
  );
  assert.equal(runtime.includes("executeControlAction(binding.runtimeAction)"), true);
  assert.equal(runtime.includes("const toggles:"), false);
  assert.equal(runtime.includes("event.keyCode === KeyCode."), false);
  assert.equal(controls.includes("COMPOSABLE_LOADOUT_STATIC_HELP_LINES"), false);
  assert.equal(
    controls.includes("formatComposableLoadoutControlHelpLines()"),
    true,
  );
});

test("TASK-013 separates runtime resource loading from Creator edit mode", () => {
  const runtime = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-demo.ts",
    ),
    "utf8",
  );
  const controls = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout/composable-loadout-controls.ts",
    ),
    "utf8",
  );
  assert.equal(runtime.includes("@executeInEditMode"), false);
  assert.equal(runtime.includes("executeInEditMode"), false);
  assert.equal(runtime.split("resources.load(").length - 1, 1);
  assert.equal(runtime.includes("private loadResources()"), true);
  assert.equal(runtime.includes("private finishResourceLoad()"), true);
  assert.equal(runtime.includes("private assignResource("), true);
  assert.equal(
    runtime.includes("COMPOSABLE_LOADOUT_RESOURCE_MANIFEST.length"),
    true,
  );
  assert.equal(runtime.includes("resourceLoadedCount"), true);
  assert.equal(runtime.includes("resourceFailedCount"), true);
  assert.equal(runtime.includes("resourceDuplicateRequestCount"), true);
  assert.equal(runtime.includes("failedResourcePaths"), true);
  assert.equal(runtime.includes(TASK_013_RESOURCE_LOAD_FAILED), true);
  assert.equal(runtime.includes("console.error("), true);
  assert.equal(runtime.includes("console.warn("), false);
  assert.equal(runtime.includes("TASK_013_RESOURCE_LOAD_ERROR"), false);
  assert.equal(runtime.includes("this.resourceLoadAttempt += 1"), true);
  assert.equal(
    controls.includes(
      "RESOURCES ${state.resourceLoadedCount}/${state.resourceExpectedCount}",
    ),
    true,
  );
  const onLoad = runtime.indexOf("onLoad(): void");
  const hud = runtime.indexOf("this.hud(this.node)", onLoad);
  const load = runtime.indexOf("this.loadResources()", onLoad);
  const finish = runtime.indexOf("private finishResourceLoad");
  const build = runtime.indexOf("this.build()", finish);
  assert.ok(onLoad >= 0);
  assert.ok(hud > onLoad);
  assert.ok(load > hud);
  assert.ok(finish > load);
  assert.ok(build > finish);
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
  const statusRegion = runtime.indexOf(
    "COMPOSABLE_LOADOUT_HUD_LAYOUT.statusLabelName",
  );
  const helpRegion = runtime.indexOf(
    "COMPOSABLE_LOADOUT_HUD_LAYOUT.helpLabelName",
  );
  const hudRegionMethod = runtime.indexOf("private hudRegion");
  const labelCreation = runtime.indexOf(
    "const node = new Node(name)",
    hudRegionMethod,
  );
  const labelParenting = runtime.indexOf(
    "node.setParent(container)",
    hudRegionMethod,
  );
  const labelCreationCall = runtime.indexOf(
    "node.addComponent(Label)",
    hudRegionMethod,
  );
  const labelConfiguration = runtime.indexOf(
    "label.overflow = Label.Overflow.CLAMP",
    hudRegionMethod,
  );
  const finalTransform = runtime.indexOf(
    "node.getComponent(UITransform)",
    hudRegionMethod,
  );
  const finalAnchor = runtime.indexOf(
    "transform.setAnchorPoint",
    hudRegionMethod,
  );
  const finalSize = runtime.indexOf(
    "transform.setContentSize",
    hudRegionMethod,
  );
  const finalPosition = runtime.indexOf(
    "node.setPosition(0, y, 0)",
    hudRegionMethod,
  );
  const finalString = runtime.indexOf("this.updateHud()", helpRegion);
  assert.ok(containerCreation >= 0);
  assert.ok(statusRegion > containerCreation);
  assert.ok(helpRegion > statusRegion);
  assert.ok(finalString > helpRegion);
  assert.ok(labelCreation > finalString);
  assert.ok(labelParenting > labelCreation);
  assert.ok(labelCreationCall > labelParenting);
  assert.ok(labelConfiguration > labelCreationCall);
  assert.ok(finalTransform > labelConfiguration);
  assert.ok(finalAnchor > finalTransform);
  assert.ok(finalSize > finalAnchor);
  assert.ok(finalPosition > finalSize);
  assert.equal(runtime.includes("container.addComponent(Label)"), false);
  assert.equal(generatedControls.includes('containerName: "HUDContainer"'), true);
  assert.equal(
    generatedControls.includes('statusLabelName: "HUDStatusLabel"'),
    true,
  );
  assert.equal(
    generatedControls.includes('helpLabelName: "HUDHelpLabel"'),
    true,
  );
  assert.equal(runtime.includes("label.enableWrapText = false"), true);
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
  assert.equal(
    runtime.includes("validateComposableLoadoutHudTextLayout"),
    true,
  );
  assert.equal(runtime.includes("TASK_013_HUD_TEXT_LAYOUT"), true);
  assert.equal(
    runtime.includes(
      "F1–F8 presets · Q/W/E prop · 1–5 clips · Space Pause/Resume",
    ),
    false,
  );
  assert.equal(scene.includes("TASK-013"), true);
  assert.equal(
    scene.includes("c83e6PqIb5JVZNMf1hkxheW"),
    true,
    "generated scene retains the runtime component that emits the split HUD labels",
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
    "this.exactReset()",
    "playback?.animation.animationId",
    "calculateComposableLoadoutHudBounds",
    "formatComposableLoadoutHudLines",
    "validateComposableLoadoutHudTextLayout",
    "setAnchorPoint",
    "HorizontalTextAlignment.LEFT",
    "VerticalTextAlignment.TOP",
    "Label.Overflow.CLAMP",
    "COMPOSABLE_LOADOUT_CONTROL_BINDINGS",
    "executeControlAction",
  ]) {
    assert.equal(runtime.includes(token), true, token);
  }
  assert.equal(scene.includes("composable-full-loadout-reference"), true);
  assert.equal(scene.includes("TASK-013"), true);
});

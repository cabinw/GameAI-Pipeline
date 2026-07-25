import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compressCocosUuid,
  validateTrackedCocosScenes,
} from "../scripts/cocos-scene-metadata.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const projectRoot = path.resolve(extensionRoot, "../..");
const assetsRoot = path.join(projectRoot, "assets");
const sceneFile = path.join(
  assetsRoot,
  "task-013r1-minimal-cocos-runtime-harness.scene",
);
const sceneMetaFile = `${sceneFile}.meta`;
const scriptFile = path.join(
  assetsRoot,
  "gameai/task013r1/task013r1-harness.ts",
);
const scriptMetaFile = `${scriptFile}.meta`;
const configFile = path.join(
  assetsRoot,
  "resources/task013r1/harness-config.json",
);

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

test("TASK-013R1 Creator-owned scene identity resolves the tracked runtime component", async () => {
  const [scene, sceneMeta, scriptMeta] = await Promise.all([
    json(sceneFile),
    json(sceneMetaFile),
    json(scriptMetaFile),
  ]);
  assert.equal(sceneMeta.importer, "scene");
  assert.equal(scriptMeta.importer, "typescript");
  const classId = compressCocosUuid(scriptMeta.uuid);
  const sceneAsset = scene[0];
  const root = scene[sceneAsset.scene.__id__];
  assert.equal(sceneAsset.__type__, "cc.SceneAsset");
  assert.equal(root.__type__, "cc.Scene");
  assert.equal(root._id, sceneMeta.uuid);
  const components = scene
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry?.__type__ === classId);
  assert.equal(components.length, 1);
  const component = components[0];
  const owner = scene[component.entry.node.__id__];
  assert.equal(owner.__type__, "cc.Node");
  assert.equal(owner._name, "Canvas");
  assert.equal(
    owner._components.some(
      (reference) => reference.__id__ === component.index,
    ),
    true,
  );
});

test("TASK-013R1 scene is independent, minimal, and contains no old demo identity", async () => {
  const sceneText = await readFile(sceneFile, "utf8");
  const scene = JSON.parse(sceneText);
  const nodeNames = scene
    .filter((entry) => entry?.__type__ === "cc.Node")
    .map((entry) => entry._name)
    .sort();
  assert.deepEqual(nodeNames, ["Camera", "Canvas"]);
  assert.match(sceneText, /GameAITask013R1Harness|f012f/iu);
  assert.doesNotMatch(
    sceneText,
    /composable-full-loadout|one-handed-prop|TASK-012|TASK-013 ·/iu,
  );
});

test("TASK-013R1 resource and runtime metadata are Creator-owned and complete", async () => {
  const config = await json(configFile);
  const configMeta = await json(`${configFile}.meta`);
  assert.deepEqual(config, {
    schemaVersion: "1.0.0",
    harnessId: "task-013r1-minimal-cocos-runtime-harness",
    designResolution: { width: 1280, height: 720 },
    runtimeTolerancePx: 0.5,
  });
  assert.equal(configMeta.importer, "json");
  assert.equal(typeof configMeta.uuid, "string");
  assert.equal(configMeta.imported, true);
  for (const moduleName of [
    "harness-input-registry.ts",
    "harness-lifecycle.ts",
    "harness-resource-manifest.ts",
    "harness-sorting-registry.ts",
    "harness-spatial.ts",
    "harness-state.ts",
    "task013r1-harness.ts",
  ]) {
    const meta = await json(
      path.join(
        assetsRoot,
        "gameai/task013r1",
        `${moduleName}.meta`,
      ),
    );
    assert.equal(meta.importer, "typescript", moduleName);
    assert.equal(meta.imported, true, moduleName);
    assert.equal(typeof meta.uuid, "string", moduleName);
  }
});

test("TASK-013R1 tracked scene participates in the global Cocos metadata audit", async () => {
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 13);
  assert.ok(result.customComponentCount >= 12);
  assert.ok(result.scriptClassCount >= 24);
});

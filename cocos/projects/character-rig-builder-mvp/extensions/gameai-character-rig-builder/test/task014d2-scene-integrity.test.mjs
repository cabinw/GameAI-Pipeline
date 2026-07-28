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
  "task-014d2-cocos-vfx-render-plan-adapter.scene",
);
const runtimeRoot = path.join(assetsRoot, "gameai/task014d2");
const scriptFile = path.join(
  runtimeRoot,
  "task014d2-cocos-vfx-render-plan-adapter.ts",
);

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

test("TASK-014D2 Creator-owned scene resolves exactly one adapter component", async () => {
  const [scene, sceneMeta, scriptMeta] = await Promise.all([
    json(sceneFile),
    json(`${sceneFile}.meta`),
    json(`${scriptFile}.meta`),
  ]);
  assert.equal(sceneMeta.importer, "scene");
  assert.equal(sceneMeta.imported, true);
  assert.equal(scriptMeta.importer, "typescript");
  assert.equal(scriptMeta.imported, true);
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
  assert.equal(owner._name, "Canvas");
  assert.equal(
    owner._components.some(
      (reference) => reference.__id__ === component.index,
    ),
    true,
  );
});

test("TASK-014D2 scene is minimal and runtime metadata is complete and unique", async () => {
  const scene = await json(sceneFile);
  assert.deepEqual(
    scene
      .filter((entry) => entry?.__type__ === "cc.Node")
      .map((entry) => entry._name)
      .sort(),
    ["Camera", "Canvas"],
  );
  const uuids = new Set();
  for (const moduleName of [
    "cocos-vfx-diagnostics.ts",
    "cocos-vfx-harness-contract.ts",
    "cocos-vfx-render-descriptor.ts",
    "cocos-vfx-runtime-state.ts",
    "render-plan-data.ts",
    "task014d2-cocos-vfx-render-plan-adapter.ts",
    "d1/index.ts",
    "d1/semantics.ts",
    "d1/types.ts",
  ]) {
    const meta = await json(path.join(runtimeRoot, `${moduleName}.meta`));
    assert.equal(meta.importer, "typescript", moduleName);
    assert.equal(meta.imported, true, moduleName);
    assert.equal(uuids.has(meta.uuid), false, moduleName);
    uuids.add(meta.uuid);
  }
});

test("TASK-014D2 runtime removes a deferred root before rebuilding", async () => {
  const source = await readFile(scriptFile, "utf8");
  assert.match(source, /private destroyRuntimeRoot\(\): void/);
  assert.match(source, /root\.removeFromParent\(\);\s*root\.destroy\(\);/);
  assert.match(source, /this\.destroyRuntimeRoot\(\);[\s\S]*this\.beginSetup\(\);/);
});

test("TASK-014D2 scene participates in tracked Creator metadata audit", async () => {
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 22);
  assert.ok(result.customComponentCount >= 21);
  assert.ok(result.scriptClassCount >= 72);
});

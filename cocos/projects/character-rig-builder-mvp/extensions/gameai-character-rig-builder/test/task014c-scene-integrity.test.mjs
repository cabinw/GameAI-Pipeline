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
  "task-014c-canonical-loadout-semantic-vfx.scene",
);
const sceneMetaFile = `${sceneFile}.meta`;
const scriptFile = path.join(
  assetsRoot,
  "gameai/task014c/task014c-canonical-loadout-semantic-vfx.ts",
);
const scriptMetaFile = `${scriptFile}.meta`;

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

test("TASK-014C Creator-owned scene resolves exactly one canonical semantic VFX component", async () => {
  const [scene, sceneMeta, scriptMeta] = await Promise.all([
    json(sceneFile),
    json(sceneMetaFile),
    json(scriptMetaFile),
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
  assert.equal(owner.__type__, "cc.Node");
  assert.equal(owner._name, "Canvas");
  assert.equal(
    owner._components.some(
      (reference) => reference.__id__ === component.index,
    ),
    true,
  );
});

test("TASK-014C scene is isolated and contains only Canvas plus Camera", async () => {
  const sceneText = await readFile(sceneFile, "utf8");
  const scene = JSON.parse(sceneText);
  const nodeNames = scene
    .filter((entry) => entry?.__type__ === "cc.Node")
    .map((entry) => entry._name)
    .sort();
  assert.deepEqual(nodeNames, ["Camera", "Canvas"]);
  assert.doesNotMatch(
    sceneText,
    /GameAITask014BSemanticVfxReference|task-014b-semantic-vfx-reference/iu,
  );
});

test("TASK-014C runtime modules have Creator-owned imported metadata and unique UUIDs", async () => {
  const uuids = new Set();
  for (const moduleName of [
    "canonical-semantic-vfx-contract.ts",
    "canonical-semantic-vfx-input-registry.ts",
    "canonical-semantic-vfx-lifecycle.ts",
    "task014c-canonical-loadout-semantic-vfx.ts",
  ]) {
    const meta = await json(
      path.join(assetsRoot, "gameai/task014c", `${moduleName}.meta`),
    );
    assert.equal(meta.importer, "typescript", moduleName);
    assert.equal(meta.imported, true, moduleName);
    assert.equal(typeof meta.uuid, "string", moduleName);
    assert.equal(uuids.has(meta.uuid), false, moduleName);
    uuids.add(meta.uuid);
  }
});

test("TASK-014C scene participates in the complete tracked-files metadata audit", async () => {
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 21);
  assert.ok(result.customComponentCount >= 20);
  assert.ok(result.scriptClassCount >= 63);
});

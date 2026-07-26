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
  "task-013r6-one-handed-prop-integration.scene",
);
const sceneMetaFile = `${sceneFile}.meta`;
const scriptFile = path.join(
  assetsRoot,
  "gameai/task013r6/task013r6-one-handed-prop-integration.ts",
);
const scriptMetaFile = `${scriptFile}.meta`;

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

test("TASK-013R6 Creator-owned scene resolves exactly one prop integration component", async () => {
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

test("TASK-013R6 scene is Creator-owned, isolated, and contains only Canvas plus Camera", async () => {
  const sceneText = await readFile(sceneFile, "utf8");
  const scene = JSON.parse(sceneText);
  const nodeNames = scene
    .filter((entry) => entry?.__type__ === "cc.Node")
    .map((entry) => entry._name)
    .sort();
  assert.deepEqual(nodeNames, ["Camera", "Canvas"]);
  assert.doesNotMatch(
    sceneText,
    /composable-full-loadout|task-013r5-garment-layering-bridge|GameAITask013R5/iu,
  );
});

test("TASK-013R6 every runtime module has Creator-owned imported metadata", async () => {
  for (const moduleName of [
    "prop-bridge-plan-data.ts",
    "prop-bridge-runtime-contract.ts",
    "prop-input-registry.ts",
    "prop-resource-manifest.ts",
    "prop-runtime-builder.ts",
    "prop-spatial.ts",
    "prop-state.ts",
    "runtime-readiness.ts",
    "task013r6-one-handed-prop-integration.ts",
  ]) {
    const meta = await json(
      path.join(assetsRoot, "gameai/task013r6", `${moduleName}.meta`),
    );
    assert.equal(meta.importer, "typescript", moduleName);
    assert.equal(meta.imported, true, moduleName);
    assert.equal(typeof meta.uuid, "string", moduleName);
  }
});

test("TASK-013R6 scene participates in the tracked-files-only metadata audit", async () => {
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 18);
  assert.ok(result.customComponentCount >= 17);
  assert.ok(result.scriptClassCount >= 59);
});

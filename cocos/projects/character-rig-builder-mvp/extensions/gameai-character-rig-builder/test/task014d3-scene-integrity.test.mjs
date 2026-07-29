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
  "task-014d3-canonical-loadout-vfx-authoring-integration.scene",
);
const runtimeRoot = path.join(assetsRoot, "gameai/task014d3");
const scriptFile = path.join(
  runtimeRoot,
  "task014d3-canonical-loadout-vfx-authoring-integration.ts",
);

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

test("TASK-014D3 has one independent Creator-owned canonical component", async () => {
  const [scene, sceneMeta, scriptMeta] = await Promise.all([
    json(sceneFile),
    json(`${sceneFile}.meta`),
    json(`${scriptFile}.meta`),
  ]);
  const classId = compressCocosUuid(scriptMeta.uuid);
  assert.equal(scene[scene[0].scene.__id__]._id, sceneMeta.uuid);
  const components = scene.filter((entry) => entry?.__type__ === classId);
  assert.equal(components.length, 1);
  assert.equal(
    scene.some((entry) =>
      entry?._name ===
        "task-014d3-canonical-loadout-vfx-authoring-integration"),
    true,
  );
});

test("TASK-014D3 metadata is complete, unique and tracked by the global audit", async () => {
  const uuids = new Set();
  for (const moduleName of [
    "canonical-vfx-semantic-contract.ts",
    "canonical-vfx-runtime-adapter.ts",
    "canonical-vfx-input-registry.ts",
    "render-plan-data.ts",
    "task014d3-canonical-loadout-vfx-authoring-integration.ts",
  ]) {
    const meta = await json(path.join(runtimeRoot, `${moduleName}.meta`));
    assert.equal(meta.importer, "typescript", moduleName);
    assert.equal(meta.imported, true, moduleName);
    assert.equal(uuids.has(meta.uuid), false, moduleName);
    uuids.add(meta.uuid);
  }
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 23);
  assert.ok(result.customComponentCount >= 22);
  assert.ok(result.scriptClassCount >= 77);
});

test("TASK-014C accepted Scene and D3 template differ only in owned identity", async () => {
  const [task014c, task014d3] = await Promise.all([
    json(path.join(
      assetsRoot,
      "task-014c-canonical-loadout-semantic-vfx.scene",
    )),
    json(sceneFile),
  ]);
  const nodeNames = (scene) =>
    scene.filter((entry) => entry?.__type__ === "cc.Node")
      .map((entry) => entry._name)
      .sort();
  assert.deepEqual(nodeNames(task014d3), nodeNames(task014c));
  assert.notEqual(task014d3[1]._id, task014c[1]._id);
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CocosSceneMetadataError,
  compressCocosUuid,
  readCocosMeta,
  validateTrackedCocosScenes,
} from "../scripts/cocos-scene-metadata.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const assetsRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets",
);
const generator = path.join(
  extensionRoot,
  "scripts/generate-composable-loadout-scene.mjs",
);
const sceneFile = path.join(
  assetsRoot,
  "composable-full-loadout-reference.scene",
);
const sceneMetaFile = `${sceneFile}.meta`;
const sourceScriptMetaFile = path.join(
  assetsRoot,
  "gameai/one-handed-prop/one-handed-prop-demo.ts.meta",
);
const targetScriptMetaFile = path.join(
  assetsRoot,
  "gameai/composable-loadout/composable-loadout-demo.ts.meta",
);
const rejectedSyntheticIds = [
  "e54305e6-7f80-4192-c345-6789abcdef01",
  "a65416f7-8091-42a3-d456-789abcdef012",
  "d98749fa-b3c4-45d6-a789-abcdef012345",
];

test("all tracked character-pipeline scenes have resolvable Creator metadata", async () => {
  const result = await validateTrackedCocosScenes(assetsRoot);
  assert.ok(result.sceneCount >= 10);
  assert.ok(result.customComponentCount >= 10);
  assert.ok(result.scriptClassCount >= result.customComponentCount);
});

test("TASK-013 component identity and node ownership resolve from tracked metadata", async () => {
  const scriptMeta = await readCocosMeta(targetScriptMetaFile, "typescript");
  const sceneMeta = await readCocosMeta(sceneMetaFile, "scene");
  const document = JSON.parse(readFileSync(sceneFile, "utf8"));
  const componentType = compressCocosUuid(scriptMeta.uuid);
  const componentIndex = document.findIndex(
    (entry) => entry?.__type__ === componentType,
  );
  assert.notEqual(componentIndex, -1);
  const component = document[componentIndex];
  const nodeIndex = component.node.__id__;
  assert.equal(document[nodeIndex].__type__, "cc.Node");
  assert.equal(
    document[nodeIndex]._components.some(
      (reference) => reference.__id__ === componentIndex,
    ),
    true,
  );
  assert.equal(document[document[0].scene.__id__]._id, sceneMeta.uuid);
});

test("TASK-013 generator is idempotent and preserves Creator-owned metadata", () => {
  const metadataFiles = [
    sceneMetaFile,
    sourceScriptMetaFile,
    targetScriptMetaFile,
  ];
  const beforeMetadata = metadataFiles.map((file) => readFileSync(file, "utf8"));
  execFileSync(process.execPath, [generator]);
  const firstScene = readFileSync(sceneFile, "utf8");
  execFileSync(process.execPath, [generator]);
  assert.equal(readFileSync(sceneFile, "utf8"), firstScene);
  assert.deepEqual(
    metadataFiles.map((file) => readFileSync(file, "utf8")),
    beforeMetadata,
  );
});

test("TASK-013 generator and output reject the known synthetic identities", () => {
  const generatorSource = readFileSync(generator, "utf8");
  const scene = readFileSync(sceneFile, "utf8");
  assert.equal(generatorSource.includes(".replaceAll("), false);
  for (const uuid of rejectedSyntheticIds) {
    assert.equal(generatorSource.includes(uuid), false, uuid);
    assert.equal(scene.includes(uuid), false, uuid);
    assert.equal(scene.includes(compressCocosUuid(uuid)), false, uuid);
  }
});

test("metadata property order does not alter compressed component identity", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "gameai-cocos-meta-order-"));
  const first = path.join(root, "first.ts.meta");
  const second = path.join(root, "second.ts.meta");
  const uuid = "c83e63ea-21be-4955-934c-7f5864c61796";
  writeFileSync(
    first,
    `${JSON.stringify({ importer: "typescript", uuid, ver: "4.0.24" })}\n`,
  );
  writeFileSync(
    second,
    `${JSON.stringify({ ver: "4.0.24", uuid, importer: "typescript" })}\n`,
  );
  assert.equal(
    compressCocosUuid((await readCocosMeta(first, "typescript")).uuid),
    compressCocosUuid((await readCocosMeta(second, "typescript")).uuid),
  );
});

test("duplicate tracked asset UUIDs fail with a stable diagnostic", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "gameai-cocos-meta-duplicate-"));
  const meta = {
    ver: "1.2.0",
    importer: "directory",
    imported: true,
    uuid: "2e0fbf5a-c769-43d6-8743-587c3d93c98e",
  };
  writeFileSync(path.join(root, "one.meta"), JSON.stringify(meta));
  writeFileSync(path.join(root, "two.meta"), JSON.stringify(meta));
  await assert.rejects(
    validateTrackedCocosScenes(root),
    (error) =>
      error instanceof CocosSceneMetadataError &&
      error.code === "DUPLICATE_ASSET_UUID",
  );
});

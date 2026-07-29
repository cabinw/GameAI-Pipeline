import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compressCocosUuid } from "./cocos-scene-metadata.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const assetsRoot = path.resolve(extensionRoot, "../..", "assets");
const sourceFile = path.join(
  assetsRoot,
  "task-014c-canonical-loadout-semantic-vfx.scene",
);
const outputFile = path.join(
  assetsRoot,
  "task-014d3-canonical-loadout-vfx-authoring-integration.scene",
);
const sourceComponentUuid = "ecb7edd5-d255-496e-a68c-1bf11ed97a73";
const componentUuid = "0f1c5a7b-2d3e-4f60-8a91-b2c3d4e5f607";
const metadata = JSON.parse(await readFile(`${outputFile}.meta`, "utf8"));
if (typeof metadata.uuid !== "string") {
  throw new Error("TASK_014D3_SCENE_META_UUID_INVALID");
}

const source = JSON.parse(await readFile(sourceFile, "utf8"));
const document = structuredClone(source);
const sourceType = compressCocosUuid(sourceComponentUuid);
const componentType = compressCocosUuid(componentUuid);
for (const entry of document) {
  if (entry?._name === "task-014c-canonical-loadout-semantic-vfx") {
    entry._name =
      "task-014d3-canonical-loadout-vfx-authoring-integration";
  }
  if (entry?.__type__ === sourceType) entry.__type__ = componentType;
}
const sceneAsset = document[0];
const scene = document[sceneAsset.scene.__id__];
if (
  sceneAsset?.__type__ !== "cc.SceneAsset" ||
  scene?.__type__ !== "cc.Scene" ||
  !document.some((entry) => entry?.__type__ === componentType)
) {
  throw new Error("TASK_014D3_SCENE_TEMPLATE_INVALID");
}
scene._id = metadata.uuid;
await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`);

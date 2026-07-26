import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compressCocosUuid,
  readCocosMeta,
} from "./cocos-scene-metadata.mjs";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.resolve(extensionRoot, "../..", "assets");
const sourceScene = path.join(assets, "one-handed-prop-reference.scene");
const outputScene = path.join(assets, "composable-full-loadout-reference.scene");
const sourceScriptMeta = path.join(
  assets,
  "gameai/one-handed-prop/one-handed-prop-demo.ts.meta",
);
const outputScriptMeta = path.join(
  assets,
  "gameai/composable-loadout/composable-loadout-demo.ts.meta",
);

const sourceSceneMeta = await readCocosMeta(`${sourceScene}.meta`, "scene");
const outputSceneMeta = await readCocosMeta(`${outputScene}.meta`, "scene");
const sourceComponentMeta = await readCocosMeta(sourceScriptMeta, "typescript");
const outputComponentMeta = await readCocosMeta(outputScriptMeta, "typescript");
const sourceComponentType = compressCocosUuid(sourceComponentMeta.uuid);
const outputComponentType = compressCocosUuid(outputComponentMeta.uuid);
const document = JSON.parse(await readFile(sourceScene, "utf8"));
const sourceComponents = document
  .map((entry, index) => ({ entry, index }))
  .filter(({ entry }) => entry?.__type__ === sourceComponentType);
if (sourceComponents.length !== 1) {
  throw new Error(
    `TASK_013_SOURCE_COMPONENT_COUNT: expected 1 ${sourceComponentType}, received ${sourceComponents.length}`,
  );
}
const sceneAsset = document[0];
const sceneRoot = document[sceneAsset?.scene?.__id__];
if (
  sceneAsset?.__type__ !== "cc.SceneAsset" ||
  sceneRoot?.__type__ !== "cc.Scene" ||
  sceneRoot._id !== sourceSceneMeta.uuid
) {
  throw new Error("TASK_013_SOURCE_SCENE_IDENTITY_MISMATCH");
}

const { entry: component, index: componentIndex } = sourceComponents[0];
const nodeIndex = component?.node?.__id__;
const node = Number.isInteger(nodeIndex) ? document[nodeIndex] : undefined;
if (
  node?.__type__ !== "cc.Node" ||
  !node._components?.some((reference) => reference?.__id__ === componentIndex)
) {
  throw new Error("TASK_013_SOURCE_COMPONENT_NODE_INVALID");
}

const replacements = new Map([
  ["one-handed-prop-reference", "composable-full-loadout-reference"],
  ["PropGenerated", "LoadoutGenerated"],
  [
    "TASK-012 · One-Handed Prop Attachment Reference",
    "TASK-013 · Composable Full Character Loadout Reference",
  ],
]);
for (const entry of document) {
  for (const [key, value] of Object.entries(entry)) {
    if (typeof value === "string" && replacements.has(value)) {
      entry[key] = replacements.get(value);
    }
  }
}

component.__type__ = outputComponentType;
for (const key of Object.keys(component)) {
  if (!key.startsWith("_") && key !== "__type__" && key !== "node") {
    delete component[key];
  }
}
sceneRoot._id = outputSceneMeta.uuid;

if (
  component.node?.__id__ !== nodeIndex ||
  !node._components.some((reference) => reference?.__id__ === componentIndex)
) {
  throw new Error("TASK_013_OUTPUT_COMPONENT_NODE_INVALID");
}
if (
  document.filter((entry) => entry?.__type__ === outputComponentType).length !==
    1 ||
  document.some((entry) => entry?.__type__ === sourceComponentType)
) {
  throw new Error("TASK_013_OUTPUT_COMPONENT_IDENTITY_INVALID");
}

await writeFile(outputScene, `${JSON.stringify(document, null, 2)}\n`);

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectAssets = path.resolve(extensionRoot, "../..", "assets");
const sourceScene = path.join(projectAssets, "simple-sprite-character-bridge.scene");
const outputScene = path.join(
  projectAssets,
  "production-lite-layered-character-reference.scene",
);
const outputMeta = `${outputScene}.meta`;
let scene = await readFile(sourceScene, "utf8");
scene = scene
  .replaceAll("simple-sprite-character-bridge", "production-lite-layered-character-reference")
  .replaceAll("SimpleSpriteGenerated", "ProductionLiteGenerated")
  .replaceAll("59b5aM2JgFJK5uq30lFpDa4", "9d77cGiO0xNXo+QEjRWeJq8")
  .replaceAll("f445d1c8-cdab-40c7-a4cf-59968f84b41d", "aa991bc2-4d31-49cc-a198-e5b631742009")
  .replaceAll("TASK-008 · Transparent PNG Sprite Bridge", "TASK-009 · Production-Lite Layered Character Reference");
const sceneDocument = JSON.parse(scene);
const component = sceneDocument.find(
  (entry) => entry.__type__ === "9d77cGiO0xNXo+QEjRWeJq8",
);
component.showJointMarkers = false;
component.showSpriteBounds = false;
component.showPivotMarkers = false;
component.showParentLinks = false;
component.showLayerLabels = false;
await writeFile(outputScene, `${JSON.stringify(sceneDocument, null, 2)}\n`);
await writeFile(
  outputMeta,
  `${JSON.stringify(
    {
      ver: "1.1.50",
      importer: "scene",
      imported: true,
      uuid: "aa991bc2-4d31-49cc-a198-e5b631742009",
      files: [".json"],
      subMetas: {},
      userData: {},
    },
    null,
    2,
  )}\n`,
);

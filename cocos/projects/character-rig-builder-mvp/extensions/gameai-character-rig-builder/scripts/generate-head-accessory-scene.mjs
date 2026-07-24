import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function compressUuid(uuid) {
  const hex = uuid.replaceAll("-", "");
  let compressed = hex.slice(0, 5);
  for (let index = 5; index < 32; index += 3) {
    const value = Number.parseInt(hex.slice(index, index + 3), 16);
    compressed += base64[(value >> 6) & 63] + base64[value & 63];
  }
  return compressed;
}

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectAssets = path.resolve(extensionRoot, "../..", "assets");
const sourceScene = path.join(
  projectAssets,
  "production-lite-layered-character-reference.scene",
);
const outputScene = path.join(
  projectAssets,
  "head-accessory-layering-reference.scene",
);
const outputMeta = `${outputScene}.meta`;
const componentUuid = "a107c1a2-3b4c-4d5e-8f90-123456789abc";
const componentType = compressUuid(componentUuid);
const sceneUuid = "b210d2b3-4c5d-4e6f-9012-3456789abcde";
let scene = await readFile(sourceScene, "utf8");
scene = scene
  .replaceAll(
    "production-lite-layered-character-reference",
    "head-accessory-layering-reference",
  )
  .replaceAll("ProductionLiteGenerated", "HeadAccessoryGenerated")
  .replaceAll("9d77cGiO0xNXo+QEjRWeJq8", componentType)
  .replaceAll("aa991bc2-4d31-49cc-a198-e5b631742009", sceneUuid)
  .replaceAll(
    "TASK-009 · Production-Lite Layered Character Reference",
    "TASK-010 · Head Accessory Layering Reference",
  );
const sceneDocument = JSON.parse(scene);
const component = sceneDocument.find((entry) => entry.__type__ === componentType);
if (component === undefined) throw new Error("TASK_010_COMPONENT_NOT_FOUND");
component.showJointMarkers = false;
component.showSpriteBounds = false;
component.showPivotMarkers = false;
component.showParentLinks = false;
component.showLayerLabels = false;
component.showAttachmentSockets = false;
await writeFile(outputScene, `${JSON.stringify(sceneDocument, null, 2)}\n`);
await writeFile(
  outputMeta,
  `${JSON.stringify(
    {
      ver: "1.1.50",
      importer: "scene",
      imported: true,
      uuid: sceneUuid,
      files: [".json"],
      subMetas: {},
      userData: {},
    },
    null,
    2,
  )}\n`,
);

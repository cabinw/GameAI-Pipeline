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
const assets = path.resolve(extensionRoot, "../..", "assets");
const sourceScene = path.join(assets, "head-accessory-layering-reference.scene");
const outputScene = path.join(assets, "garment-layering-reference.scene");
const componentUuid = "c321e3c4-5d6e-4f70-a123-456789abcdef";
const componentType = compressUuid(componentUuid);
const sceneUuid = "d432f4d5-6e7f-4081-b234-56789abcdef0";
let scene = await readFile(sourceScene, "utf8");
scene = scene
  .replaceAll("head-accessory-layering-reference", "garment-layering-reference")
  .replaceAll("HeadAccessoryGenerated", "GarmentGenerated")
  .replaceAll("a107cGiO0xNXo+QEjRWeJq8", componentType)
  .replaceAll("b210d2b3-4c5d-4e6f-9012-3456789abcde", sceneUuid)
  .replaceAll(
    "TASK-010 · Head Accessory Layering Reference",
    "TASK-011 · Multi-Part Garment Layering Reference",
  );
const document = JSON.parse(scene);
const component = document.find((entry) => entry.__type__ === componentType);
if (component === undefined) throw new Error("TASK_011_COMPONENT_NOT_FOUND");
component.showGarmentSlots = false;
component.showGarmentSeams = false;
delete component.showAttachmentSockets;
await writeFile(outputScene, `${JSON.stringify(document, null, 2)}\n`);
await writeFile(
  `${outputScene}.meta`,
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

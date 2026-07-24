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
const sourceScene = path.join(assets, "one-handed-prop-reference.scene");
const outputScene = path.join(assets, "composable-full-loadout-reference.scene");
const oldComponentType = compressUuid("e54305e6-7f80-4192-c345-6789abcdef01");
const componentUuid = "a65416f7-8091-42a3-d456-789abcdef012";
const componentType = compressUuid(componentUuid);
const sceneUuid = "d98749fa-b3c4-45d6-a789-abcdef012345";
let scene = await readFile(sourceScene, "utf8");
scene = scene
  .replaceAll("one-handed-prop-reference", "composable-full-loadout-reference")
  .replaceAll("PropGenerated", "LoadoutGenerated")
  .replaceAll(oldComponentType, componentType)
  .replaceAll("f65416f7-8091-42a3-d456-789abcdef012", sceneUuid)
  .replaceAll(
    "TASK-012 · One-Handed Prop Attachment Reference",
    "TASK-013 · Composable Full Character Loadout Reference",
  );
const document = JSON.parse(scene);
const component = document.find((entry) => entry.__type__ === componentType);
if (component === undefined) throw new Error("TASK_013_COMPONENT_NOT_FOUND");
for (const key of Object.keys(component)) {
  if (!key.startsWith("_") && key !== "__type__") delete component[key];
}
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

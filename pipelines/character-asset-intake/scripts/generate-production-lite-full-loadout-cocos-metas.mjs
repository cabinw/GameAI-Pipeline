import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const root = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-full-loadout",
);
const uuid = (key) => {
  const hex = createHash("sha256")
    .update(`task-013:${key}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
};
const write = (file, value) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const directoryMeta = (key) => ({
  ver: "1.2.0",
  importer: "directory",
  imported: true,
  uuid: uuid(key),
  files: [],
  subMetas: {},
  userData: {},
});
const jsonMeta = (key) => ({
  ver: "2.0.1",
  importer: "json",
  imported: true,
  uuid: uuid(key),
  files: [".json"],
  subMetas: {},
  userData: {},
});
const imageMeta = (key, width, height) => {
  const imageUuid = uuid(key);
  const name = path.basename(key, ".png");
  return {
    ver: "1.0.27",
    importer: "image",
    imported: true,
    uuid: imageUuid,
    files: [".json", ".png"],
    subMetas: {
      "6c48a": {
        importer: "texture",
        uuid: `${imageUuid}@6c48a`,
        displayName: name,
        id: "6c48a",
        name: "texture",
        userData: {
          wrapModeS: "clamp-to-edge",
          wrapModeT: "clamp-to-edge",
          imageUuidOrDatabaseUri: imageUuid,
          isUuid: true,
          visible: false,
          minfilter: "linear",
          magfilter: "linear",
          mipfilter: "none",
          anisotropy: 0,
        },
        ver: "1.0.22",
        imported: true,
        files: [".json"],
        subMetas: {},
      },
      f9941: {
        importer: "sprite-frame",
        uuid: `${imageUuid}@f9941`,
        displayName: name,
        id: "f9941",
        name: "spriteFrame",
        userData: {
          trimThreshold: 1,
          rotated: false,
          offsetX: 0,
          offsetY: 0,
          trimX: 0,
          trimY: 0,
          width,
          height,
          rawWidth: width,
          rawHeight: height,
          borderTop: 0,
          borderBottom: 0,
          borderLeft: 0,
          borderRight: 0,
          packable: true,
          pixelsToUnit: 100,
          pivotX: 0.5,
          pivotY: 0.5,
          meshType: 0,
          vertices: {
            rawPosition: [
              -width / 2, -height / 2, 0,
              width / 2, -height / 2, 0,
              -width / 2, height / 2, 0,
              width / 2, height / 2, 0
            ],
            indexes: [0, 1, 2, 2, 1, 3],
            uv: [0, height, width, height, 0, 0, width, 0],
            nuv: [0, 0, 1, 0, 0, 1, 1, 1],
            minPos: [-width / 2, -height / 2, 0],
            maxPos: [width / 2, height / 2, 0]
          },
          isUuid: true,
          imageUuidOrDatabaseUri: `${imageUuid}@6c48a`,
          atlasUuid: "",
          trimType: "none"
        },
        ver: "1.0.12",
        imported: true,
        files: [".json"],
        subMetas: {}
      }
    },
    userData: {
      type: "sprite-frame",
      fixAlphaTransparencyArtifacts: false,
      hasAlpha: true,
      redirect: `${imageUuid}@6c48a`
    }
  };
};

await write(`${root}.meta`, directoryMeta("root"));
const entries = await readdir(root, { recursive: true, withFileTypes: true });
for (const entry of entries) {
  const absolute = path.join(entry.parentPath, entry.name);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (entry.isDirectory()) {
    await write(`${absolute}.meta`, directoryMeta(relative));
  } else if (!relative.endsWith(".meta") && relative.endsWith(".json")) {
    await write(`${absolute}.meta`, jsonMeta(relative));
  } else if (!relative.endsWith(".meta") && relative.endsWith(".png")) {
    const metadata = await sharp(absolute).metadata();
    await write(
      `${absolute}.meta`,
      imageMeta(relative, metadata.width, metadata.height),
    );
  }
}

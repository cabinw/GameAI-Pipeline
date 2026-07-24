import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const root = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-one-handed-prop",
);
const source = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-one-handed-prop/source/prop-source.json",
    ),
    "utf8",
  ),
);
const baseSource = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-character/source/character-source.json",
    ),
    "utf8",
  ),
);
const uuid = (key) => {
  const hex = createHash("sha256").update(`task-012:${key}`).digest("hex").slice(0, 32);
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
const imageMeta = (key, name, width, height) => {
  const imageUuid = uuid(key);
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

await mkdir(root, { recursive: true });
await write(`${root}.meta`, directoryMeta("root"));
for (const folder of ["attachments", "animations", "reference"]) {
  await write(path.join(root, `${folder}.meta`), directoryMeta(folder));
}
for (const file of [
  "rig-layout.json",
  "attachment-layout.json",
  "reference/authoring-provenance.json",
  ...["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map(
    (name) => `animations/${name}.json`,
  ),
]) {
  await write(path.join(root, `${file}.meta`), jsonMeta(file));
}
for (const attachment of source.attachments) {
  await write(
    path.join(root, `${attachment.file}.meta`),
    imageMeta(
      attachment.file,
      attachment.attachmentId,
      attachment.size.width,
      attachment.size.height,
    ),
  );
}
for (const variant of source.variants) {
  for (const suffix of ["", "-reconstructed", "-diff"]) {
    const file = `reference/${variant.variantId}${suffix}.png`;
    await write(
      path.join(root, `${file}.meta`),
      imageMeta(
        file,
        `${variant.variantId}${suffix}`,
        baseSource.sourceCanvas.width,
        baseSource.sourceCanvas.height,
      ),
    );
  }
  await write(
    path.join(root, `reference/${variant.variantId}-report.json.meta`),
    jsonMeta(`reference/${variant.variantId}-report.json`),
  );
}

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export class CocosSceneMetadataError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "CocosSceneMetadataError";
    this.code = code;
  }
}

export function compressCocosUuid(uuid) {
  if (!UUID_PATTERN.test(uuid)) {
    throw new CocosSceneMetadataError(
      "INVALID_ASSET_UUID",
      `Expected a lowercase hyphenated UUID, received ${JSON.stringify(uuid)}`,
    );
  }
  const hex = uuid.replaceAll("-", "");
  let compressed = hex.slice(0, 5);
  for (let index = 5; index < 32; index += 3) {
    const value = Number.parseInt(hex.slice(index, index + 3), 16);
    compressed += BASE64[(value >> 6) & 63] + BASE64[value & 63];
  }
  return compressed;
}

export async function readCocosMeta(metaFile, expectedImporter) {
  let meta;
  try {
    meta = JSON.parse(await readFile(metaFile, "utf8"));
  } catch (error) {
    throw new CocosSceneMetadataError(
      "INVALID_META_JSON",
      `${metaFile}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (meta.importer !== expectedImporter) {
    throw new CocosSceneMetadataError(
      "UNEXPECTED_META_IMPORTER",
      `${metaFile} uses ${JSON.stringify(meta.importer)}, expected ${JSON.stringify(expectedImporter)}`,
    );
  }
  compressCocosUuid(meta.uuid);
  return meta;
}

async function walkFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(file)));
    else files.push(file);
  }
  return files.sort();
}

function sceneRoot(document, sceneFile) {
  if (!Array.isArray(document)) {
    throw new CocosSceneMetadataError(
      "INVALID_SCENE_DOCUMENT",
      `${sceneFile} must contain a serialized object array`,
    );
  }
  const asset = document[0];
  const rootIndex = asset?.scene?.__id__;
  const root = Number.isInteger(rootIndex) ? document[rootIndex] : undefined;
  if (asset?.__type__ !== "cc.SceneAsset" || root?.__type__ !== "cc.Scene") {
    throw new CocosSceneMetadataError(
      "INVALID_SCENE_ROOT",
      `${sceneFile} has no valid cc.SceneAsset to cc.Scene reference`,
    );
  }
  return { asset, root, rootIndex };
}

export async function validateTrackedCocosScenes(assetsRoot) {
  const files = await walkFiles(assetsRoot);
  const metaByUuid = new Map();
  const scriptByClassId = new Map();

  for (const metaFile of files.filter((file) => file.endsWith(".meta"))) {
    let meta;
    try {
      meta = JSON.parse(await readFile(metaFile, "utf8"));
    } catch (error) {
      throw new CocosSceneMetadataError(
        "INVALID_META_JSON",
        `${metaFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (typeof meta.uuid !== "string") continue;
    compressCocosUuid(meta.uuid);
    const duplicate = metaByUuid.get(meta.uuid);
    if (duplicate !== undefined) {
      throw new CocosSceneMetadataError(
        "DUPLICATE_ASSET_UUID",
        `${meta.uuid} is used by both ${duplicate} and ${metaFile}`,
      );
    }
    metaByUuid.set(meta.uuid, metaFile);
    if (meta.importer === "typescript" && metaFile.endsWith(".ts.meta")) {
      const classId = compressCocosUuid(meta.uuid);
      const collision = scriptByClassId.get(classId);
      if (collision !== undefined) {
        throw new CocosSceneMetadataError(
          "DUPLICATE_SCRIPT_CLASS_ID",
          `${classId} resolves to both ${collision.metaFile} and ${metaFile}`,
        );
      }
      scriptByClassId.set(classId, { metaFile, uuid: meta.uuid });
    }
  }

  let customComponentCount = 0;
  const sceneFiles = files.filter((file) => file.endsWith(".scene"));
  for (const sceneFile of sceneFiles) {
    const sceneMeta = await readCocosMeta(`${sceneFile}.meta`, "scene");
    const document = JSON.parse(await readFile(sceneFile, "utf8"));
    const { root } = sceneRoot(document, sceneFile);
    if (root._id !== sceneMeta.uuid) {
      throw new CocosSceneMetadataError(
        "SCENE_IDENTITY_MISMATCH",
        `${sceneFile} root ${JSON.stringify(root._id)} does not match ${sceneFile}.meta UUID ${sceneMeta.uuid}`,
      );
    }

    for (const [componentIndex, entry] of document.entries()) {
      const type = entry?.__type__;
      if (typeof type !== "string" || type.startsWith("cc.")) continue;
      const script = scriptByClassId.get(type);
      if (script === undefined) {
        throw new CocosSceneMetadataError(
          "MISSING_CUSTOM_SCRIPT_CLASS",
          `${sceneFile} component ${componentIndex} references unresolved class ${type}`,
        );
      }
      const nodeIndex = entry?.node?.__id__;
      const node = Number.isInteger(nodeIndex) ? document[nodeIndex] : undefined;
      if (node?.__type__ !== "cc.Node") {
        throw new CocosSceneMetadataError(
          "INVALID_COMPONENT_NODE",
          `${sceneFile} component ${componentIndex} (${type}) has no valid node reference`,
        );
      }
      const reciprocal = node._components?.some(
        (reference) => reference?.__id__ === componentIndex,
      );
      if (!reciprocal) {
        throw new CocosSceneMetadataError(
          "MISSING_NODE_COMPONENT_REFERENCE",
          `${sceneFile} node ${nodeIndex} does not reference component ${componentIndex}`,
        );
      }
      customComponentCount += 1;
    }
  }

  return {
    assetUuidCount: metaByUuid.size,
    customComponentCount,
    sceneCount: sceneFiles.length,
    scriptClassCount: scriptByClassId.size,
  };
}

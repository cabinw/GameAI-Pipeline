import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target-remade");
const cocosAssets = resolve(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets",
);
const baseScenePath = resolve(cocosAssets, "red-cap-remade-acceptance.scene");
const [baseSceneText, baseMetaText, layout, specification] = await Promise.all([
  readFile(baseScenePath, "utf8"),
  readFile(`${baseScenePath}.meta`, "utf8"),
  readJson(resolve(fixtureRoot, "rig-layout.json")),
  readJson(resolve(fixtureRoot, "articulation-safety.json")),
]);
const baseMeta = JSON.parse(baseMetaText);
const poses = [
  { poseId: "rest", rotations: {} },
  ...specification.stressPoses,
];

for (const pose of poses) {
  const scene = JSON.parse(baseSceneText);
  const byName = new Map(
    scene
      .map((entry, index) => [entry?._name, { entry, index }])
      .filter(([name]) => typeof name === "string" && name.length > 0),
  );
  const byPartId = new Map(layout.parts.map((part) => [part.partId, part]));
  for (const part of layout.parts) {
    const parent =
      part.parentId === null ? undefined : byPartId.get(part.parentId);
    const joint = sourcePoint(partJoint(part), layout);
    const parentJoint =
      parent === undefined ? { x: 0, y: 0 } : sourcePoint(partJoint(parent), layout);
    const center = sourcePoint(
      {
        x: part.originalRect.x + part.originalRect.width / 2,
        y: part.originalRect.y + part.originalRect.height / 2,
      },
      layout,
    );
    const jointNode = byName.get(`Joint_${part.partId}`)?.entry;
    const visualNode = byName.get(`Visual_${part.partId}`)?.entry;
    if (jointNode === undefined || visualNode === undefined) {
      throw new Error(`Base scene is missing ${part.partId}.`);
    }
    jointNode._lpos.x = round(joint.x - parentJoint.x);
    jointNode._lpos.y = round(joint.y - parentJoint.y);
    const degrees = pose.rotations[part.partId] ?? 0;
    const radians = (degrees * Math.PI) / 180;
    jointNode._lrot.z = round(Math.sin(radians / 2));
    jointNode._lrot.w = round(Math.cos(radians / 2));
    jointNode._euler.z = degrees;
    visualNode._lpos.x = round(center.x - joint.x);
    visualNode._lpos.y = round(center.y - joint.y);
    const transformReference = visualNode._components.find(
      (reference) => scene[reference.__id__]?.__type__ === "cc.UITransform",
    );
    const transform = scene[transformReference.__id__];
    transform._contentSize.width = round(
      part.originalRect.width * layout.referenceScale,
    );
    transform._contentSize.height = round(
      part.originalRect.height * layout.referenceScale,
    );
  }
  for (const entry of scene) {
    if (
      entry !== null &&
      typeof entry === "object" &&
      Object.hasOwn(entry, "validatedAnimationJson") &&
      Object.hasOwn(entry, "autoplay")
    ) {
      entry.autoplay = false;
    }
  }
  const sceneAsset = scene.find((entry) => entry?.__type__ === "cc.SceneAsset");
  const sceneNode =
    sceneAsset?._scene?.__id__ === undefined
      ? undefined
      : scene[sceneAsset._scene.__id__];
  if (sceneNode !== undefined) {
    sceneNode._name = `red-cap-articulation-${pose.poseId}`;
  }
  const filename = `red-cap-articulation-${pose.poseId}.scene`;
  const uuid = deterministicUuid(`TASK-006:${filename}`);
  await Promise.all([
    writeFile(resolve(cocosAssets, filename), `${JSON.stringify(scene, null, 2)}\n`),
    writeFile(
      resolve(cocosAssets, `${filename}.meta`),
      `${JSON.stringify({ ...baseMeta, uuid }, null, 2)}\n`,
    ),
  ]);
}

console.log(
  JSON.stringify({
    sceneCount: poses.length,
    scenes: poses.map((pose) => `red-cap-articulation-${pose.poseId}.scene`),
  }),
);

function partJoint(part) {
  return {
    x: part.originalRect.x + part.anchor.x * part.originalRect.width,
    y: part.originalRect.y + part.anchor.y * part.originalRect.height,
  };
}

function sourcePoint(point, layout) {
  return {
    x: (point.x - layout.sourceCanvas.width / 2) * layout.referenceScale,
    y: (layout.sourceCanvas.height / 2 - point.y) * layout.referenceScale,
  };
}

function deterministicUuid(value) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20),
  ].join("-");
}

function round(value) {
  const result = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

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
const [baseSceneText, baseMetaText, layout, specification] =
  await Promise.all([
  readFile(baseScenePath, "utf8"),
  readFile(`${baseScenePath}.meta`, "utf8"),
  readJson(resolve(fixtureRoot, "rig-layout.json")),
  readJson(resolve(fixtureRoot, "articulation-safety.json")),
]);
const baseMeta = JSON.parse(baseMetaText);
const poses = [
  { poseId: "rest", rotations: {} },
  {
    poseId: "positive",
    rotations: specification.stressPoses.find(
      (pose) => pose.poseId === "combined-positive",
    )?.rotations,
  },
  {
    poseId: "negative",
    rotations: specification.stressPoses.find(
      (pose) => pose.poseId === "combined-negative",
    )?.rotations,
  },
];
if (poses.some((pose) => pose.rotations === undefined)) {
  throw new Error("Combined positive and negative stress poses are required.");
}

for (const pose of poses) {
  const filename = `red-cap-articulation-${pose.poseId}.scene`;
  const existingScene = await readExistingScene(resolve(cocosAssets, filename));
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
    visualNode._lpos.z = 0;
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
    const spriteReference = visualNode._components.find(
      (reference) => scene[reference.__id__]?.__type__ === "cc.Sprite",
    );
    const sprite =
      spriteReference === undefined ? undefined : scene[spriteReference.__id__];
    if (sprite === undefined) {
      throw new Error(`Visual_${part.partId} is missing Sprite.`);
    }
    // Extension textures rely on their untrimmed source-canvas placement.
    // Auto-trim offsets would rescale the opaque bounds into the extended
    // rectangle and visibly turn hidden caps into rectangular blocks.
    sprite._isTrimmedMode = false;
    const sortingReference = visualNode._components.find(
      (reference) => scene[reference.__id__]?.__type__ === "cc.Sorting2D",
    );
    const sorting =
      sortingReference === undefined
        ? undefined
        : scene[sortingReference.__id__];
    if (sorting === undefined) {
      throw new Error(`Visual_${part.partId} is missing Sorting2D.`);
    }
    // Match the engine-neutral contract where larger drawOrder values are
    // topmost.
    sorting._enabled = true;
    sorting._sortingOrder = part.drawOrder;
  }
  // Sorting2D alone does not reorder Sprite renderers across nested joint
  // branches in Creator's Scene view. Put every joint's renderable children
  // into engine-neutral draw order as well: distal limbs precede their cover
  // visual, while head accessories follow the head visual.
  for (const part of layout.parts) {
    const jointNode = byName.get(`Joint_${part.partId}`)?.entry;
    if (jointNode === undefined) continue;
    jointNode._children = jointNode._children
      .map((reference, originalIndex) => {
        const child = scene[reference.__id__];
        const childPartId =
          child?._name?.startsWith("Visual_")
            ? child._name.slice("Visual_".length)
            : child?._name?.startsWith("Joint_")
              ? child._name.slice("Joint_".length)
              : undefined;
        return {
          reference,
          originalIndex,
          drawOrder:
            childPartId === undefined
              ? Number.MAX_SAFE_INTEGER
              : (byPartId.get(childPartId)?.drawOrder ??
                Number.MAX_SAFE_INTEGER),
        };
      })
      .sort(
        (left, right) =>
          left.drawOrder - right.drawOrder ||
          left.originalIndex - right.originalIndex,
      )
      .map(({ reference }) => reference);
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
    sceneNode._id =
      existingScene?.find((entry) => entry?.__type__ === "cc.Scene")?._id ??
      deterministicUuid(`TASK-006.1:scene:${filename}`);
  }
  if (sceneAsset !== undefined) {
    sceneAsset._name = `red-cap-articulation-${pose.poseId}`;
  }
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

async function readExistingScene(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

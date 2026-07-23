import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
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
const [baseSceneText, baseMetaText, layout, specification, referenceMeta] =
  await Promise.all([
  readFile(baseScenePath, "utf8"),
  readFile(`${baseScenePath}.meta`, "utf8"),
  readJson(resolve(fixtureRoot, "rig-layout.json")),
  readJson(resolve(fixtureRoot, "articulation-safety.json")),
  readJson(
    resolve(
      cocosAssets,
      "gameai/red-cap-target-remade/reference/full_character.png.meta",
    ),
  ),
]);
const baseMeta = JSON.parse(baseMetaText);
const acceptanceCompositeUuids = new Map([
  ["rest", referenceMeta.uuid],
  [
    "positive",
    await installAcceptanceComposite(
      "combined-positive",
      referenceMeta,
    ),
  ],
  [
    "negative",
    await installAcceptanceComposite(
      "combined-negative",
      referenceMeta,
    ),
  ],
]);
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
  appendAcceptanceComposite(
    scene,
    byName.get("RigRoot")?.entry,
    acceptanceCompositeUuids.get(pose.poseId),
    pose.poseId,
  );
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

function appendAcceptanceComposite(scene, rigRoot, imageUuid, poseId) {
  if (rigRoot === undefined) {
    throw new Error("Base scene is missing RigRoot.");
  }
  const nodeIndex = scene.length;
  const transformIndex = nodeIndex + 1;
  const spriteIndex = nodeIndex + 2;
  const sortingIndex = nodeIndex + 3;
  scene.push(
    {
      __type__: "cc.Node",
      _name: `AcceptanceComposite_${poseId}`,
      _objFlags: 0,
      __editorExtras__: {},
      _parent: { __id__: scene.indexOf(rigRoot) },
      _children: [],
      _active: true,
      _components: [
        { __id__: transformIndex },
        { __id__: spriteIndex },
        { __id__: sortingIndex },
      ],
      _prefab: null,
      _lpos: { __type__: "cc.Vec3", x: 0, y: 0, z: 0 },
      _lrot: { __type__: "cc.Quat", x: 0, y: 0, z: 0, w: 1 },
      _lscale: { __type__: "cc.Vec3", x: 1, y: 1, z: 1 },
      _mobility: 0,
      _layer: 8388608,
      _euler: { __type__: "cc.Vec3", x: 0, y: 0, z: 0 },
      _id: deterministicUuid(`TASK-006.1:AcceptanceComposite:${poseId}`),
    },
    {
      __type__: "cc.UITransform",
      _name: "",
      _objFlags: 0,
      __editorExtras__: {},
      node: { __id__: nodeIndex },
      _enabled: true,
      __prefab: null,
      _contentSize: { __type__: "cc.Size", width: 3.26, height: 8.92 },
      _anchorPoint: { __type__: "cc.Vec2", x: 0.5, y: 0.5 },
      _id: deterministicUuid(`TASK-006.1:AcceptanceComposite:${poseId}:UITransform`),
    },
    {
      __type__: "cc.Sprite",
      _name: "",
      _objFlags: 0,
      __editorExtras__: {},
      node: { __id__: nodeIndex },
      _enabled: true,
      __prefab: null,
      _customMaterial: null,
      _srcBlendFactor: 2,
      _dstBlendFactor: 4,
      _color: { __type__: "cc.Color", r: 255, g: 255, b: 255, a: 255 },
      _spriteFrame: {
        __uuid__: `${imageUuid}@f9941`,
        __expectedType__: "cc.SpriteFrame",
      },
      _type: 0,
      _fillType: 0,
      _sizeMode: 0,
      _fillCenter: { __type__: "cc.Vec2", x: 0, y: 0 },
      _fillStart: 0,
      _fillRange: 0,
      _isTrimmedMode: true,
      _useGrayscale: false,
      _atlas: null,
      _id: deterministicUuid(`TASK-006.1:AcceptanceComposite:${poseId}:Sprite`),
    },
    {
      __type__: "cc.Sorting2D",
      _name: "",
      _objFlags: 0,
      __editorExtras__: {},
      node: { __id__: nodeIndex },
      _enabled: true,
      __prefab: null,
      _sortingLayer: 0,
      _sortingOrder: 1000,
      _id: deterministicUuid(`TASK-006.1:AcceptanceComposite:${poseId}:Sorting2D`),
    },
  );
  rigRoot._children.push({ __id__: nodeIndex });
}

async function installAcceptanceComposite(poseId, templateMeta) {
  const source = resolve(
    fixtureRoot,
    `articulation/stress-${poseId}.png`,
  );
  const destinationDirectory = resolve(
    cocosAssets,
    "gameai/red-cap-target-remade/articulation",
  );
  const destination = resolve(
    destinationDirectory,
    `stress-${poseId}.png`,
  );
  const uuid = deterministicUuid(`TASK-006.1:stress-${poseId}.png`);
  const meta = structuredClone(templateMeta);
  meta.uuid = uuid;
  for (const [subId, subMeta] of Object.entries(meta.subMetas ?? {})) {
    subMeta.uuid = `${uuid}@${subId}`;
    subMeta.displayName = `stress-${poseId}`;
  }
  await mkdir(destinationDirectory, { recursive: true });
  await Promise.all([
    copyFile(source, destination),
    writeFile(`${destination}.meta`, `${JSON.stringify(meta, null, 2)}\n`),
  ]);
  return uuid;
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

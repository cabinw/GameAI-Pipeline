import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { buildCocosGarmentLayeringPlan } from "../source/garment-layering-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const accessoryRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const garmentRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const json = async (root: string, file: string): Promise<any> =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));

async function plan() {
  const rig = await json(baseRoot, "rig-layout.json");
  const attachments = await json(garmentRoot, "attachment-layout.json");
  const clips = await Promise.all([
    ...["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map(
      (name) => json(baseRoot, `animations/${name}.json`),
    ),
    json(accessoryRoot, "animations/head-accessory-stress.json"),
    json(garmentRoot, "animations/garment-stress.json"),
  ]);
  const baseDimensions = Object.fromEntries(
    await Promise.all(
      rig.parts.map(async (part: any) => {
        const metadata = await sharp(path.join(baseRoot, part.file)).metadata();
        return [part.partId, { width: metadata.width!, height: metadata.height! }];
      }),
    ),
  );
  const attachmentDimensions = Object.fromEntries(
    await Promise.all(
      attachments.attachments.map(async (attachment: any) => {
        const metadata = await sharp(
          path.join(garmentRoot, attachment.file),
        ).metadata();
        return [
          attachment.attachmentId,
          { width: metadata.width!, height: metadata.height! },
        ];
      }),
    ),
  );
  return buildCocosGarmentLayeringPlan(
    rig,
    attachments,
    clips,
    baseDimensions,
    attachmentDimensions,
  );
}

test("adapter exposes generic wearable sets, garment slots, seams, and six clips", async () => {
  const output = await plan();
  assert.equal(output.base.parts.length, 17);
  assert.deepEqual(
    output.wearableSets.map((set) => set.wearableSetId),
    ["casual-jacket"],
  );
  assert.equal(output.slots.length, 12);
  assert.equal(output.seams.length, 10);
  assert.equal(output.attachments.length, 14);
  assert.equal(output.base.clips.length, 6);
  assert.equal(
    output.attachments.filter(
      (attachment) => attachment.wearableSetId === "casual-jacket",
    ).length,
    11,
  );
});

test("adapter maps authored garment and collar order into stable sorting indices", async () => {
  const output = await plan();
  const order = new Map([
    ...output.base.parts.map((part) => [part.jointId, part.sortingOrder] as const),
    ...output.attachments.map(
      (attachment) => [attachment.attachmentId, attachment.sortingOrder] as const,
    ),
  ]);
  for (const ids of [
    ["jacket-upper-sleeve-right", "jacket-back", "torso", "jacket-front"],
    ["jacket-front", "collar-back", "head", "collar-front"],
    ["upper-arm-left", "jacket-upper-sleeve-left", "lower-arm-left"],
    ["hand-left", "jacket-cuff-left"],
  ]) {
    for (let index = 1; index < ids.length; index += 1) {
      assert.ok(order.get(ids[index - 1]!)! < order.get(ids[index]!)!);
    }
  }
});

test("TASK-011 scene and runtime expose every requested control and diagnostic", async () => {
  const runtimePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/gameai/garment-layering/garment-layering-demo.ts",
  );
  const scenePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/garment-layering-reference.scene",
  );
  const [runtime, scene] = await Promise.all([
    readFile(runtimePath, "utf8"),
    readFile(scenePath, "utf8"),
  ]);
  assert.doesNotThrow(() => JSON.parse(scene));
  assert.match(scene, /GarmentGenerated/);
  for (const surface of [
    "AuthoredReferenceView",
    "AssembledCharacterView",
    "SkeletonDebugView",
    "ReferenceAssembledOverlay",
    "GarmentSlot_",
    "SeamRegion_",
    "GarmentBounds_",
    "GarmentPivot_",
    "WEARABLE",
    "reconstructionStatus",
  ]) {
    assert.match(runtime, new RegExp(surface));
  }
  for (const control of [
    "DIGIT_1",
    "DIGIT_2",
    "DIGIT_3",
    "DIGIT_4",
    "DIGIT_5",
    "DIGIT_6",
    "KEY_H",
    "SPACE",
    "KEY_R",
    "KEY_K",
    "KEY_C",
    "KEY_G",
    "KEY_Q",
    "KEY_E",
    "KEY_O",
    "KEY_J",
    "KEY_B",
    "KEY_A",
    "KEY_L",
    "KEY_D",
    "KEY_S",
    "KEY_M",
    "KEY_V",
  ]) {
    assert.match(runtime, new RegExp(`KeyCode\\.${control}`));
  }
  assert.doesNotMatch(runtime, /setPosition\([^)]*(?:jacket|collar|sleeve|cuff)/i);
  assert.match(runtime, /sortingOrder = attachment\.sortingOrder/);
});

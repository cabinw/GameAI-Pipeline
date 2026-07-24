import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { buildCocosHeadAccessoryLayeringPlan } from "../source/head-accessory-layering-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const accessoryRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const json = async (root: string, file: string): Promise<any> =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));

async function plan() {
  const rig = await json(baseRoot, "rig-layout.json");
  const attachments = await json(accessoryRoot, "attachment-layout.json");
  const clips = await Promise.all([
    ...["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map(
      (name) => json(baseRoot, `animations/${name}.json`),
    ),
    json(accessoryRoot, "animations/head-accessory-stress.json"),
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
          path.join(accessoryRoot, attachment.file),
        ).metadata();
        return [
          attachment.attachmentId,
          { width: metadata.width!, height: metadata.height! },
        ];
      }),
    ),
  );
  return buildCocosHeadAccessoryLayeringPlan(
    rig,
    attachments,
    clips,
    baseDimensions,
    attachmentDimensions,
  );
}

test("adapter preserves the accepted body and exposes generic attachment slots", async () => {
  const output = await plan();
  assert.equal(output.base.parts.length, 17);
  assert.deepEqual(
    output.slots.map((slot) => slot.slotId),
    ["headwear", "face-accessory"],
  );
  assert.deepEqual(
    output.attachments.map((attachment) => attachment.attachmentId),
    ["cap-back", "sunglasses", "cap-front"],
  );
  assert.equal(output.base.clips.length, 5);
});

test("adapter maps fractional contract order into a stable Cocos sorting order", async () => {
  const output = await plan();
  const order = new Map([
    ...output.base.parts.map((part) => [part.jointId, part.sortingOrder] as const),
    ...output.attachments.map(
      (attachment) =>
        [attachment.attachmentId, attachment.sortingOrder] as const,
    ),
  ]);
  assert.ok(order.get("hair-back")! < order.get("cap-back")!);
  assert.ok(order.get("cap-back")! < order.get("head")!);
  assert.ok(order.get("head")! < order.get("sunglasses")!);
  assert.ok(order.get("sunglasses")! < order.get("hair-front")!);
  assert.ok(order.get("hair-front")! < order.get("cap-front")!);
});

test("adapter exposes four zero-tolerance reference variants without scene constants", async () => {
  const output = await plan();
  assert.deepEqual(Object.keys(output.referenceResourcePaths), [
    "base",
    "cap-only",
    "sunglasses-only",
    "cap-and-sunglasses",
  ]);
  assert.ok(
    Object.values(output.reconstructionStatus).every(
      (status) => status === "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM",
    ),
  );
  const core = await readFile(
    path.join(
      repositoryRoot,
      "framework/character-contracts/source/attachment-resolver.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(core, /Cocos|cap|sunglasses|headwear|face-accessory/);
});

test("TASK-010 runtime and dedicated scene expose the complete attachment surface", async () => {
  const runtimePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/gameai/head-accessory-layering/head-accessory-layering-demo.ts",
  );
  const scenePath = path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/head-accessory-layering-reference.scene",
  );
  const [runtime, scene] = await Promise.all([
    readFile(runtimePath, "utf8"),
    readFile(scenePath, "utf8"),
  ]);
  assert.doesNotThrow(() => JSON.parse(scene));
  assert.match(scene, /HeadAccessoryGenerated/);
  assert.match(scene, /a107cGiO0xNXo\+QEjRWeJq8/);
  assert.match(runtime, /this\.setPose\(binding\.spriteJoint, pose\)/);
  assert.match(runtime, /this\.setPose\(binding\.skeletonJoint, pose\)/);
  for (const surface of [
    "AuthoredReferenceView",
    "AssembledSpriteView",
    "SkeletonDebugView",
    "ReferenceAssembledOverlay",
    "AttachmentSlot_",
    "AttachmentBounds_",
    "AttachmentPivot_",
    "Socket_",
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
    "SPACE",
    "KEY_R",
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
    "KEY_V",
  ]) {
    assert.match(runtime, new RegExp(`KeyCode\\.${control}`));
  }
  assert.doesNotMatch(runtime, /setPosition\([^)]*(?:cap|sunglasses)/i);
});

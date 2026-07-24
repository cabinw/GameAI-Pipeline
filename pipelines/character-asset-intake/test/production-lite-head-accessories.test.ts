import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  composeAttachmentWorldTransform,
  parseAttachmentLayout,
  parseRigLayout,
  resolveAttachmentLayout,
  type AttachmentLayout,
} from "@gameai/character-contracts";
import {
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  RigAnimationPlayback,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
import sharp from "sharp";

import {
  reconstructAttachmentVariant,
  type ProductionLiteLayout,
} from "../source";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-head-accessories",
);
const source = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source/accessory-source.json"), "utf8"),
) as {
  attachments: Array<{
    attachmentId: string;
    slotId: string;
    file: string;
    size: { width: number; height: number };
    drawOrder: number;
  }>;
  variants: Array<{
    variantId: string;
    slotOverrides: Record<string, boolean>;
  }>;
};
const rigLayout = JSON.parse(
  readFileSync(path.join(baseRoot, "rig-layout.json"), "utf8"),
) as ProductionLiteLayout & { layoutId: string; schemaVersion: string };
const attachmentLayout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "attachment-layout.json"), "utf8"),
) as AttachmentLayout;

async function filesBelow(root: string): Promise<string[]> {
  const visit = async (directory: string): Promise<string[]> => {
    const entries = await readdir(path.join(root, directory), {
      withFileTypes: true,
    });
    const files: string[] = [];
    for (const entry of entries) {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await visit(relative)));
      else files.push(relative);
    }
    return files;
  };
  return (await visit("")).sort();
}

async function digests(root: string, files: readonly string[]) {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(root, file)))
          .digest("hex"),
      ]),
    ),
  );
}

test("generates byte-stable accessories and leaves every TASK-009 file unchanged", async () => {
  const generatedFiles = [
    "attachment-layout.json",
    "animations/head-accessory-stress.json",
    "attachments/cap-back.png",
    "attachments/cap-front.png",
    "attachments/sunglasses.png",
    "reference/authoring-provenance.json",
    ...source.variants.flatMap((variant) => [
      `reference/${variant.variantId}.png`,
      `reference/${variant.variantId}-reconstructed.png`,
      `reference/${variant.variantId}-diff.png`,
      `reference/${variant.variantId}-report.json`,
    ]),
  ].sort();
  const before = await digests(fixtureRoot, generatedFiles);
  const mirrorBefore = await digests(cocosRoot, generatedFiles);
  const baseFiles = await filesBelow(baseRoot);
  const baseBefore = await digests(baseRoot, baseFiles);
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-production-lite-head-accessories.mjs")],
    { cwd: packageRoot },
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/verify-production-lite-head-accessories.mjs")],
    { cwd: packageRoot },
  );
  assert.deepEqual(await digests(fixtureRoot, generatedFiles), before);
  assert.deepEqual(await digests(cocosRoot, generatedFiles), mirrorBefore);
  assert.deepEqual(mirrorBefore, before);
  assert.deepEqual(await digests(baseRoot, baseFiles), baseBefore);
});

test("validates generic slots, compatible rig binding, PNG alpha, and layer order", async () => {
  const parsedRig = parseRigLayout(JSON.stringify(rigLayout));
  assert.equal(parsedRig.ok, true);
  if (!parsedRig.ok) return;
  const parsed = parseAttachmentLayout(
    JSON.stringify(attachmentLayout),
    parsedRig.value,
  );
  assert.equal(parsed.ok, true);
  assert.deepEqual(
    parsed.ok ? parsed.value.slots.map((slot) => slot.slotId) : [],
    ["headwear", "face-accessory"],
  );
  for (const attachment of source.attachments) {
    const image = sharp(path.join(fixtureRoot, attachment.file));
    const metadata = await image.metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, attachment.size.width);
    assert.equal(metadata.height, attachment.size.height);
    assert.equal(metadata.hasAlpha, true);
    const stats = await image.ensureAlpha().stats();
    assert.ok(stats.channels[3]!.min === 0 && stats.channels[3]!.max > 0);
  }
  const bodyOrder = (partId: string) =>
    rigLayout.parts.find((part) => part.partId === partId)!.drawOrder;
  const attachmentOrder = (attachmentId: string) =>
    attachmentLayout.attachments.find(
      (attachment) => attachment.attachmentId === attachmentId,
    )!.drawOrder;
  assert.ok(bodyOrder("hair-back") < attachmentOrder("cap-back"));
  assert.ok(attachmentOrder("cap-back") < bodyOrder("head"));
  assert.ok(bodyOrder("head") < attachmentOrder("sunglasses"));
  assert.ok(attachmentOrder("sunglasses") < bodyOrder("hair-front"));
  assert.ok(bodyOrder("hair-front") < attachmentOrder("cap-front"));
});

test("keeps Cocos SpriteFrames untrimmed at their authored canvas sizes", async () => {
  const images = [
    ...source.attachments.map((attachment) => ({
      file: attachment.file,
      size: attachment.size,
    })),
    ...source.variants.flatMap((variant) =>
      [
        `${variant.variantId}.png`,
        `${variant.variantId}-reconstructed.png`,
        `${variant.variantId}-diff.png`,
      ].map((file) => ({
        file: `reference/${file}`,
        size: rigLayout.sourceCanvas,
      })),
    ),
  ];
  for (const image of images) {
    const meta = JSON.parse(
      await readFile(path.join(cocosRoot, `${image.file}.meta`), "utf8"),
    ) as {
      subMetas: {
        f9941: {
          userData: {
            trimType: string;
            trimX: number;
            trimY: number;
            width: number;
            height: number;
            rawWidth: number;
            rawHeight: number;
          };
        };
      };
    };
    const sprite = meta.subMetas.f9941.userData;
    assert.equal(sprite.trimType, "none", image.file);
    assert.deepEqual(
      {
        trimX: sprite.trimX,
        trimY: sprite.trimY,
        width: sprite.width,
        height: sprite.height,
        rawWidth: sprite.rawWidth,
        rawHeight: sprite.rawHeight,
      },
      {
        trimX: 0,
        trimY: 0,
        width: image.size.width,
        height: image.size.height,
        rawWidth: image.size.width,
        rawHeight: image.size.height,
      },
      image.file,
    );
  }
});

test("reconstructs all four independently authored variants at zero tolerance", async () => {
  for (const variant of source.variants) {
    const reference = await readFile(
      path.join(fixtureRoot, `reference/${variant.variantId}.png`),
    );
    const result = await reconstructAttachmentVariant(
      baseRoot,
      fixtureRoot,
      rigLayout,
      attachmentLayout,
      variant.slotOverrides,
      reference,
    );
    assert.equal(result.metrics.status, "passed", variant.variantId);
    assert.deepEqual(
      {
        rgba: result.metrics.rgbaMismatchPixels,
        alpha: result.metrics.alphaMismatchPixels,
        seam: result.metrics.seamMismatchPixels,
        bounds: result.metrics.boundsExpansionPixels,
      },
      { rgba: 0, alpha: 0, seam: 0, bounds: 0 },
    );
  }
  assert.deepEqual(
    await readFile(path.join(fixtureRoot, "reference/base.png")),
    await readFile(
      path.join(baseRoot, "reference/reference-composite.png"),
    ),
  );
});

test("fails closed when an enabled attachment file is missing", async () => {
  const missing = structuredClone(attachmentLayout);
  missing.attachments.find(
    (attachment) => attachment.attachmentId === "sunglasses",
  )!.file = "attachments/missing.png";
  const reference = await readFile(
    path.join(fixtureRoot, "reference/cap-and-sunglasses.png"),
  );
  const result = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    rigLayout,
    missing,
    {},
    reference,
  );
  assert.equal(result.metrics.status, "failed");
  assert.ok(
    result.metrics.diagnostics.includes(
      "ATTACHMENT_RECONSTRUCTION_FILE_MISSING:sunglasses",
    ),
  );
});

test("inherits head translation and rotation through generic slot composition", async () => {
  const clipText = await readFile(
    path.join(fixtureRoot, "animations/head-accessory-stress.json"),
    "utf8",
  );
  const parsed = parseRigAnimation(clipText, {
    rigId: rigLayout.layoutId,
    rigSchemaVersion: rigLayout.schemaVersion,
    jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const playback = new RigAnimationPlayback(normalizeRigAnimation(parsed.value));
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const attachments = resolveAttachmentLayout(attachmentLayout);
  const at = (time: number) => {
    const pose = evaluateRigPose(hierarchy, playback.seek(time));
    return Object.fromEntries(
      attachments.map((attachment) => [
        attachment.attachmentId,
        composeAttachmentWorldTransform(
          pose.joints[attachment.parentPartId]!.worldTransform,
          attachment.slotTransform,
          attachment.attachmentTransform,
        ),
      ]),
    );
  };
  const left = at(0.6);
  const right = at(1.2);
  assert.notDeepEqual(left["cap-front"], right["cap-front"]);
  assert.deepEqual(left["cap-front"], left["cap-back"]);
  assert.notDeepEqual(left.sunglasses, left["cap-front"]);
  assert.deepEqual(at(0), at(2.4));
});

test("contains no Cocos or accessory-specific branching in core attachment logic", async () => {
  const core = await readFile(
    path.join(
      repositoryRoot,
      "framework/character-contracts/source/attachment-resolver.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(core, /\bcc\b|Cocos|Node|Sprite|cap-|sunglasses|red-cap/i);
  assert.doesNotMatch(
    await readFile(
      path.join(fixtureRoot, "attachment-layout.json"),
      "utf8",
    ),
    /red-cap-target|briefcase|jacket/i,
  );
});

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
  type AffineTransform2D,
  type AttachmentLayout,
  type Rectangle,
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
  validateAttachmentSeamCoverage,
  type AttachmentSeamSample,
  type ProductionLiteLayout,
} from "../source";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const accessoryRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-garment-layering",
);
const source = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source/garment-source.json"), "utf8"),
) as {
  attachments: Array<{
    attachmentId: string;
    slotId: string;
    wearableSetId?: string;
    file: string;
    size: { width: number; height: number };
    drawOrder: number;
  }>;
  variants: Array<{
    variantId: string;
    slotOverrides: Record<string, boolean>;
    wearableSetOverrides: Record<string, boolean>;
  }>;
};
const baseSource = JSON.parse(
  readFileSync(path.join(baseRoot, "source/character-source.json"), "utf8"),
) as {
  parts: Array<{
    partId: string;
    trimOffset: { x: number; y: number };
    trimSize: { width: number; height: number };
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

test("generates byte-stable garment assets and preserves TASK-009/TASK-010", async () => {
  const generated = [
    "attachment-layout.json",
    "animations/garment-stress.json",
    "reference/authoring-provenance.json",
    ...source.attachments.map((attachment) => attachment.file),
    ...source.variants.flatMap((variant) => [
      `reference/${variant.variantId}.png`,
      `reference/${variant.variantId}-reconstructed.png`,
      `reference/${variant.variantId}-diff.png`,
      `reference/${variant.variantId}-report.json`,
    ]),
  ].sort();
  const before = await digests(fixtureRoot, generated);
  const mirror = await digests(cocosRoot, generated);
  const acceptedFiles = [
    ...(await filesBelow(baseRoot)).map((file) => [baseRoot, file] as const),
    ...(await filesBelow(accessoryRoot)).map((file) => [accessoryRoot, file] as const),
  ];
  const acceptedBefore = Object.fromEntries(
    await Promise.all(
      acceptedFiles.map(async ([root, file]) => [
        `${root}:${file}`,
        createHash("sha256")
          .update(await readFile(path.join(root, file)))
          .digest("hex"),
      ]),
    ),
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-production-lite-garment-layering.mjs")],
    { cwd: packageRoot },
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/verify-production-lite-garment-layering.mjs")],
    { cwd: packageRoot },
  );
  assert.deepEqual(await digests(fixtureRoot, generated), before);
  assert.deepEqual(await digests(cocosRoot, generated), mirror);
  assert.deepEqual(mirror, before);
  const acceptedAfter = Object.fromEntries(
    await Promise.all(
      acceptedFiles.map(async ([root, file]) => [
        `${root}:${file}`,
        createHash("sha256")
          .update(await readFile(path.join(root, file)))
          .digest("hex"),
      ]),
    ),
  );
  assert.deepEqual(acceptedAfter, acceptedBefore);
});

test("parses generic garment slots and grouped enable state without rig mutation", () => {
  const parsedRig = parseRigLayout(JSON.stringify(rigLayout));
  assert.equal(parsedRig.ok, true);
  if (!parsedRig.ok) return;
  const parsed = parseAttachmentLayout(
    JSON.stringify(attachmentLayout),
    parsedRig.value,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const required = [
    "torso-back",
    "torso-front",
    "upper-arm-left",
    "upper-arm-right",
    "lower-arm-left",
    "lower-arm-right",
    "wrist-left",
    "wrist-right",
    "collar-back",
    "collar-front",
  ];
  assert.deepEqual(
    required.filter(
      (slot) => !parsed.value.slots.some((candidate) => candidate.slotId === slot),
    ),
    [],
  );
  const before = JSON.stringify(rigLayout);
  const disabled = resolveAttachmentLayout(parsed.value, {}, {
    "casual-jacket": false,
  });
  assert.equal(
    disabled.filter((item) => item.wearableSetId === "casual-jacket").every(
      (item) => !item.enabled,
    ),
    true,
  );
  assert.equal(
    disabled.filter((item) => item.wearableSetId === undefined).every(
      (item) => item.enabled,
    ),
    true,
  );
  assert.equal(JSON.stringify(rigLayout), before);
});

test("all transparent PNG parts are deterministic and declared", async () => {
  assert.equal(
    source.attachments.filter((item) => item.wearableSetId === "casual-jacket")
      .length,
    11,
  );
  for (const attachment of source.attachments) {
    const image = sharp(path.join(fixtureRoot, attachment.file));
    const metadata = await image.metadata();
    assert.equal(metadata.format, "png");
    assert.equal(metadata.width, attachment.size.width);
    assert.equal(metadata.height, attachment.size.height);
    assert.equal(metadata.hasAlpha, true);
    const alpha = (await image.ensureAlpha().stats()).channels[3]!;
    assert.equal(alpha.min, 0);
    assert.ok(alpha.max > 0);
  }
});

test("reconstructs base, jacket, accessories, and combined variants exactly", async () => {
  for (const variant of source.variants) {
    const result = await reconstructAttachmentVariant(
      baseRoot,
      fixtureRoot,
      rigLayout,
      attachmentLayout,
      variant.slotOverrides,
      await readFile(
        path.join(fixtureRoot, `reference/${variant.variantId}.png`),
      ),
      undefined,
      variant.wearableSetOverrides,
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
    await readFile(path.join(baseRoot, "reference/reference-composite.png")),
  );
  assert.deepEqual(
    await readFile(path.join(fixtureRoot, "attachments/cap-front.png")),
    await readFile(path.join(accessoryRoot, "attachments/cap-front.png")),
  );
  assert.deepEqual(
    await readFile(path.join(fixtureRoot, "attachments/sunglasses.png")),
    await readFile(path.join(accessoryRoot, "attachments/sunglasses.png")),
  );
});

test("keeps authored torso, sleeve, collar, hand, cuff, and accessory order stable", () => {
  const order = new Map([
    ...rigLayout.parts.map((part) => [part.partId, part.drawOrder] as const),
    ...attachmentLayout.attachments.map(
      (attachment) => [attachment.attachmentId, attachment.drawOrder] as const,
    ),
  ]);
  const ordered = (...ids: string[]) => {
    for (let index = 1; index < ids.length; index += 1) {
      assert.ok(order.get(ids[index - 1]!)! < order.get(ids[index]!)!, ids.join(" < "));
    }
  };
  ordered(
    "upper-arm-right",
    "jacket-upper-sleeve-right",
    "jacket-back",
    "torso",
    "jacket-front",
    "collar-back",
    "head",
    "collar-front",
    "upper-arm-left",
    "jacket-upper-sleeve-left",
  );
  ordered("hand-right", "jacket-cuff-right");
  ordered("hand-left", "jacket-cuff-left");
  ordered("hair-back", "cap-back", "head", "sunglasses", "hair-front", "cap-front");
});

function transformedBounds(
  matrix: AffineTransform2D,
  region: Rectangle,
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  scale: number,
  trimOffset = { x: 0, y: 0 },
): Rectangle {
  const points = [
    [region.x, region.y],
    [region.x + region.width, region.y],
    [region.x, region.y + region.height],
    [region.x + region.width, region.y + region.height],
  ].map(([x, y]) => {
    const localX = (x! + trimOffset.x - anchor.x * size.width) * scale;
    const localY = (anchor.y * size.height - y! - trimOffset.y) * scale;
    return {
      x: matrix.a * localX + matrix.c * localY + matrix.tx,
      y: matrix.b * localX + matrix.d * localY + matrix.ty,
    };
  });
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

test("validates authored seam coverage across all six supported clips", async () => {
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const clips = [
    ...["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map(
      (name) => path.join(baseRoot, `animations/${name}.json`),
    ),
    path.join(accessoryRoot, "animations/head-accessory-stress.json"),
    path.join(fixtureRoot, "animations/garment-stress.json"),
  ];
  const resolved = resolveAttachmentLayout(attachmentLayout);
  const sourceByAttachment = new Map(
    source.attachments.map((attachment) => [attachment.attachmentId, attachment]),
  );
  const baseById = new Map(rigLayout.parts.map((part) => [part.partId, part]));
  const baseSourceById = new Map(
    baseSource.parts.map((part) => [part.partId, part]),
  );
  const samples: AttachmentSeamSample[] = [];
  for (const file of clips) {
    const parsed = parseRigAnimation(await readFile(file, "utf8"), {
      rigId: rigLayout.layoutId,
      rigSchemaVersion: rigLayout.schemaVersion,
      jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
    });
    assert.equal(parsed.ok, true, file);
    if (!parsed.ok) continue;
    const playback = new RigAnimationPlayback(normalizeRigAnimation(parsed.value));
    for (let index = 0; index <= 28; index += 1) {
      const time = (parsed.value.duration * index) / 28;
      const pose = evaluateRigPose(hierarchy, playback.seek(time));
      const itemRegions: Record<string, Rectangle> = {};
      for (const seam of attachmentLayout.seams ?? []) {
        for (const [itemId, region] of [
          [seam.firstItemId, seam.firstRegion],
          [seam.secondItemId, seam.secondRegion],
        ] as const) {
          const attachment = resolved.find((item) => item.attachmentId === itemId);
          if (attachment !== undefined) {
            const dimensions = sourceByAttachment.get(itemId)!.size;
            itemRegions[`${seam.seamId}:${itemId}`] = transformedBounds(
              composeAttachmentWorldTransform(
                pose.joints[attachment.parentPartId]!.worldTransform,
                attachment.slotTransform,
                attachment.attachmentTransform,
              ),
              region,
              attachment.anchor,
              dimensions,
              rigLayout.referenceScale,
            );
          } else {
            const part = baseById.get(itemId)!;
            const partSource = baseSourceById.get(itemId)!;
            itemRegions[`${seam.seamId}:${itemId}`] = transformedBounds(
              pose.joints[itemId]!.worldTransform,
              region,
              part.anchor,
              part.originalRect,
              rigLayout.referenceScale,
              partSource.trimOffset,
            );
          }
        }
      }
      samples.push({
        clipId: parsed.value.animationId,
        time,
        itemRegions,
      });
    }
  }
  const results = validateAttachmentSeamCoverage(attachmentLayout, samples);
  assert.equal(results.length, 10);
  assert.equal(
    results.every((result) => result.passed),
    true,
    JSON.stringify(
      results.map((result) => ({
        seamId: result.seamId,
        required: result.minimumRequired,
        observed: result.minimumObserved,
        passed: result.passed,
      })),
    ),
  );
});

test("seam validator detects missing parts and insufficient overlap", () => {
  const result = validateAttachmentSeamCoverage(attachmentLayout, [
    {
      clipId: "mutation",
      time: 0,
      itemRegions: {
        "jacket-front": { x: 0, y: 0, width: 1, height: 1 },
        "jacket-upper-sleeve-right": { x: 10, y: 10, width: 1, height: 1 },
      },
    },
  ]);
  assert.ok(result.some((seam) => !seam.passed));
  assert.ok(
    result.flatMap((seam) => seam.diagnostics).some(
      (diagnostic) =>
        diagnostic.startsWith("GARMENT_SEAM_ITEM_MISSING") ||
        diagnostic.startsWith("GARMENT_SEAM_INSUFFICIENT_OVERLAP"),
    ),
  );
});

test("inherits torso, shoulder, elbow, and wrist transforms in Garment Stress", async () => {
  const parsed = parseRigAnimation(
    await readFile(path.join(fixtureRoot, "animations/garment-stress.json"), "utf8"),
    {
      rigId: rigLayout.layoutId,
      rigSchemaVersion: rigLayout.schemaVersion,
      jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
    },
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const playback = new RigAnimationPlayback(normalizeRigAnimation(parsed.value));
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const resolved = resolveAttachmentLayout(attachmentLayout);
  const at = (time: number) => {
    const pose = evaluateRigPose(hierarchy, playback.seek(time));
    return Object.fromEntries(
      resolved
        .filter((attachment) => attachment.wearableSetId === "casual-jacket")
        .map((attachment) => [
          attachment.attachmentId,
          composeAttachmentWorldTransform(
            pose.joints[attachment.parentPartId]!.worldTransform,
            attachment.slotTransform,
            attachment.attachmentTransform,
          ),
        ]),
    );
  };
  assert.notDeepEqual(at(0.7), at(1.4));
  assert.notDeepEqual(at(0.7)["jacket-upper-sleeve-left"], at(1.4)["jacket-upper-sleeve-left"]);
  assert.notDeepEqual(at(0.7)["jacket-lower-sleeve-right"], at(1.4)["jacket-lower-sleeve-right"]);
  assert.notDeepEqual(at(0.7)["jacket-cuff-left"], at(1.4)["jacket-cuff-left"]);
  assert.deepEqual(at(0), at(parsed.value.duration));
});

test("core resolver contains no garment, jacket, Cocos, or correction behavior", async () => {
  const core = await readFile(
    path.join(
      repositoryRoot,
      "framework/character-contracts/source/attachment-resolver.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    core,
    /Cocos|jacket|garment|casual-jacket|torso-front|upper-arm-left|correction/i,
  );
  const parsedRig = parseRigLayout(JSON.stringify(rigLayout));
  assert.equal(parsedRig.ok, true);
  if (!parsedRig.ok) return;
  const task010 = parseAttachmentLayout(
    await readFile(path.join(accessoryRoot, "attachment-layout.json"), "utf8"),
    parsedRig.value,
  );
  assert.equal(task010.ok, true);
});

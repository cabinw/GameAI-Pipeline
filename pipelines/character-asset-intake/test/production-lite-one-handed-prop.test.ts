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
  resolveAttachmentLayout,
  type AttachmentLayout,
  type RigLayout,
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
  "examples/production-lite-one-handed-prop",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-one-handed-prop",
);
const source = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source/prop-source.json"), "utf8"),
) as {
  attachments: Array<{
    attachmentId: string;
    file: string;
    size: { width: number; height: number };
    attachmentKind: string;
    gripAnchor?: { x: number; y: number };
    anchor: { x: number; y: number };
  }>;
  variants: Array<{
    variantId: string;
    propStateOverrides: Record<string, boolean>;
  }>;
};
const rigLayout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
) as ProductionLiteLayout & RigLayout & {
  layoutId: string;
  schemaVersion: string;
  sockets: Array<{
    socketId: string;
    parentPartId: string;
    position: { x: number; y: number };
    rotationDegrees: number;
  }>;
};
const attachmentLayout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "attachment-layout.json"), "utf8"),
) as AttachmentLayout;

const digest = async (file: string) =>
  createHash("sha256").update(await readFile(file)).digest("hex");

test("generates byte-stable transparent prop fixture and Cocos mirror", async () => {
  const files = [
    "rig-layout.json",
    "attachment-layout.json",
    "reference/authoring-provenance.json",
    ...["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map(
      (name) => `animations/${name}.json`,
    ),
    ...source.attachments.map((attachment) => attachment.file),
    ...source.variants.flatMap((variant) => [
      `reference/${variant.variantId}.png`,
      `reference/${variant.variantId}-reconstructed.png`,
      `reference/${variant.variantId}-diff.png`,
      `reference/${variant.variantId}-report.json`,
    ]),
  ].sort();
  const before = Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, await digest(path.join(fixtureRoot, file))])),
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-production-lite-one-handed-prop.mjs")],
    { cwd: packageRoot },
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/verify-production-lite-one-handed-prop.mjs")],
    { cwd: packageRoot },
  );
  for (const file of files) {
    assert.equal(await digest(path.join(fixtureRoot, file)), before[file], file);
    assert.equal(
      await digest(path.join(cocosRoot, file)),
      before[file],
      `Cocos mirror ${file}`,
    );
  }
  for (const attachment of source.attachments) {
    const metadata = await sharp(path.join(fixtureRoot, attachment.file)).metadata();
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.width, attachment.size.width);
    assert.equal(metadata.height, attachment.size.height);
  }
});

test("reconstructs no-prop, left-hand, and right-hand Rest at zero tolerance", async () => {
  const parsed = parseAttachmentLayout(JSON.stringify(attachmentLayout), rigLayout);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  for (const variant of source.variants) {
    const result = await reconstructAttachmentVariant(
      baseRoot,
      fixtureRoot,
      rigLayout,
      parsed.value,
      {},
      await readFile(path.join(fixtureRoot, `reference/${variant.variantId}.png`)),
      undefined,
      {},
      variant.propStateOverrides,
    );
    assert.deepEqual(
      {
        status: result.metrics.status,
        rgba: result.metrics.rgbaMismatchPixels,
        alpha: result.metrics.alphaMismatchPixels,
        seam: result.metrics.seamMismatchPixels,
        bounds: result.metrics.boundsExpansionPixels,
      },
      { status: "passed", rgba: 0, alpha: 0, seam: 0, bounds: 0 },
    );
  }
});

test("keeps authored grip on the hand socket at every 60 Hz animation sample", async () => {
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const leftProp = resolveAttachmentLayout(
    attachmentLayout,
    {},
    {},
    { "left-hand-prop": true, "right-hand-prop": false },
  ).find((item) => item.attachmentId === "toolbox-left")!;
  assert.deepEqual(leftProp.anchor, leftProp.gripAnchor);
  let sampleCount = 0;
  for (const name of ["prop-rest", "prop-walk", "prop-swing", "prop-stress"]) {
    const parsed = parseRigAnimation(
      await readFile(path.join(fixtureRoot, `animations/${name}.json`), "utf8"),
      {
        rigId: rigLayout.layoutId,
        rigSchemaVersion: rigLayout.schemaVersion,
        jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
      },
    );
    assert.equal(parsed.ok, true, name);
    if (!parsed.ok) continue;
    const playback = new RigAnimationPlayback(normalizeRigAnimation(parsed.value));
    const frames = Math.ceil(parsed.value.duration * 60);
    for (let frame = 0; frame <= frames; frame += 1) {
      const time = Math.min(parsed.value.duration, frame / 60);
      const pose = evaluateRigPose(hierarchy, playback.seek(time));
      const parent = pose.joints[leftProp.parentPartId]!.worldTransform;
      const socket = composeAttachmentWorldTransform(
        parent,
        leftProp.slotTransform,
        {
          position: { x: 0, y: 0 },
          rotationDegrees: 0,
          scale: { x: 1, y: 1 },
        },
      );
      const grip = composeAttachmentWorldTransform(
        parent,
        leftProp.slotTransform,
        leftProp.attachmentTransform,
      );
      assert.ok(Math.abs(socket.tx - grip.tx) <= 0.000001, `${name}@${time}:x`);
      assert.ok(Math.abs(socket.ty - grip.ty) <= 0.000001, `${name}@${time}:y`);
      sampleCount += 1;
    }
  }
  assert.ok(sampleCount >= 500, String(sampleCount));
});

test("Prop Stress exercises wrist, elbow, crossing, leg motion, and exact reset", async () => {
  const clip = JSON.parse(
    await readFile(path.join(fixtureRoot, "animations/prop-stress.json"), "utf8"),
  ) as {
    duration: number;
    tracks: Array<{
      jointId: string;
      keyframes: Array<{ time: number; value: number | { x: number; y: number } }>;
    }>;
  };
  const tracks = new Map(clip.tracks.map((track) => [track.jointId, track]));
  for (const joint of [
    "torso",
    "upper-arm-left",
    "lower-arm-left",
    "hand-left",
    "thigh-left",
  ]) {
    assert.equal(tracks.has(joint), true, joint);
    const keyframes = tracks.get(joint)!.keyframes;
    assert.equal(keyframes[0]!.value, 0);
    assert.equal(keyframes.at(-1)!.time, clip.duration);
    assert.equal(keyframes.at(-1)!.value, 0);
  }
  assert.ok(
    tracks.get("hand-left")!.keyframes.some(
      (keyframe) => typeof keyframe.value === "number" && Math.abs(keyframe.value) >= 66,
    ),
  );
  assert.ok(
    tracks.get("lower-arm-left")!.keyframes.some(
      (keyframe) => typeof keyframe.value === "number" && Math.abs(keyframe.value) >= 100,
    ),
  );
});

test("uses deterministic layer roles with a visible hand overlay over each handle", () => {
  const order = new Map([
    ...rigLayout.parts.map((part) => [part.partId, part.drawOrder] as const),
    ...attachmentLayout.attachments.map(
      (attachment) => [attachment.attachmentId, attachment.drawOrder] as const,
    ),
  ]);
  assert.ok(order.get("toolbox-left")! < order.get("hand-left")!);
  assert.ok(order.get("hand-left")! < order.get("hand-overlay-left")!);
  assert.ok(order.get("toolbox-right")! < order.get("hand-right")!);
  assert.ok(order.get("hand-right")! < order.get("hand-overlay-right")!);
  assert.equal(
    attachmentLayout.attachments
      .filter((item) => item.attachmentKind === "prop")
      .every((item) => item.layerRole === "behind-target"),
    true,
  );
});

test("tracked deliverables require no Cocos temp state or absolute machine paths", async () => {
  const files = await readdir(fixtureRoot, { recursive: true });
  assert.equal(
    files.some((file) => /(^|\/)(temp|library|local)(\/|$)/i.test(String(file))),
    false,
  );
  const trackedText = [
    readFileSync(path.join(fixtureRoot, "attachment-layout.json"), "utf8"),
    readFileSync(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
    ...["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map((name) =>
      readFileSync(path.join(fixtureRoot, `animations/${name}.json`), "utf8"),
    ),
  ].join("\n");
  assert.equal(trackedText.includes("/Users/"), false);
  assert.equal(trackedText.includes("\\\\"), false);
  const coreText = [
    "framework/character-contracts/source/types.ts",
    "framework/character-contracts/source/attachment-resolver.ts",
    "framework/character-contracts/source/semantic-validator.ts",
    "schemas/attachment-layout.schema.json",
  ]
    .map((file) => readFileSync(path.join(repositoryRoot, file), "utf8"))
    .join("\n")
    .toLowerCase();
  for (const forbidden of ["briefcase", "toolbox", "red cap", "cocos", "unity", "godot"]) {
    assert.equal(coreText.includes(forbidden), false, forbidden);
  }
});

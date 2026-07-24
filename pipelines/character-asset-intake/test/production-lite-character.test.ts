import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseCharacterContract } from "@gameai/character-contracts";
import {
  RigAnimationPlayback,
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  type RigAnimation,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
import sharp from "sharp";

import {
  reconstructProductionLiteRest,
  type ProductionLiteLayout,
} from "../source/production-lite-reconstruction";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/production-lite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-character",
);
const source = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source/character-source.json"), "utf8"),
) as {
  sourceCanvas: { width: number; height: number };
  referenceScale: number;
  parts: Array<{
    partId: string;
    parentId: string | null;
    drawOrder: number;
    originalRect: { x: number; y: number; width: number; height: number };
    trimOffset: { x: number; y: number };
    trimSize: { width: number; height: number };
    pivot: { x: number; y: number };
  }>;
};
const layout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
) as ProductionLiteLayout;
const reference = readFileSync(
  path.join(fixtureRoot, "reference/reference-composite.png"),
);

async function generatedDigests(root: string): Promise<Record<string, string>> {
  const files = [
    "rig-layout.json",
    "character-rig.json",
    "reference/reference-composite.png",
    "reference/authoring-provenance.json",
    ...source.parts.map((part) => `parts/${part.partId}.png`),
    ..."arm-wave articulation-stress rest-idle walk-cycle"
      .split(" ")
      .map((name) => `animations/${name}.json`),
  ];
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

test("regenerates byte-stable transparent organic parts and the authored reference", async () => {
  const fixtureBefore = await generatedDigests(fixtureRoot);
  const cocosBefore = await generatedDigests(cocosRoot);
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-production-lite-character.mjs")],
    { cwd: packageRoot },
  );
  assert.deepEqual(await generatedDigests(fixtureRoot), fixtureBefore);
  assert.deepEqual(await generatedDigests(cocosRoot), cocosBefore);
  assert.deepEqual(cocosBefore, fixtureBefore);

  const dimensions = new Set<string>();
  const offsets = new Set<string>();
  for (const part of source.parts) {
    const image = sharp(path.join(fixtureRoot, `parts/${part.partId}.png`));
    const metadata = await image.metadata();
    assert.equal(metadata.format, "png", part.partId);
    assert.equal(metadata.width, part.trimSize.width, part.partId);
    assert.equal(metadata.height, part.trimSize.height, part.partId);
    assert.equal(metadata.hasAlpha, true, part.partId);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let transparent = 0;
    let visible = 0;
    for (let offset = 3; offset < data.length; offset += info.channels) {
      if (data[offset] === 0) transparent += 1;
      else visible += 1;
    }
    assert.ok(transparent > 0 && visible > 0, part.partId);
    assert.ok(
      visible / (info.width * info.height) < 0.88,
      `${part.partId} must retain an irregular silhouette`,
    );
    dimensions.add(`${info.width}x${info.height}`);
    offsets.add(`${part.trimOffset.x},${part.trimOffset.y}`);

    const cocosMeta = JSON.parse(
      await readFile(
        path.join(cocosRoot, `parts/${part.partId}.png.meta`),
        "utf8",
      ),
    ) as {
      subMetas: {
        f9941: {
          userData: {
            trimType: string;
            width: number;
            height: number;
            rawWidth: number;
            rawHeight: number;
          };
        };
      };
    };
    assert.deepEqual(
      {
        trimType: cocosMeta.subMetas.f9941.userData.trimType,
        width: cocosMeta.subMetas.f9941.userData.width,
        height: cocosMeta.subMetas.f9941.userData.height,
        rawWidth: cocosMeta.subMetas.f9941.userData.rawWidth,
        rawHeight: cocosMeta.subMetas.f9941.userData.rawHeight,
      },
      {
        trimType: "none",
        width: part.trimSize.width,
        height: part.trimSize.height,
        rawWidth: part.trimSize.width,
        rawHeight: part.trimSize.height,
      },
      `${part.partId} Creator import must preserve the contract trim rectangle`,
    );
  }
  assert.ok(dimensions.size >= 10);
  assert.ok(offsets.size >= 5);
});

test("validates complete contracts, pivots, trimmed geometry, hierarchy, and layers", async () => {
  const contract = parseCharacterContract(
    await readFile(path.join(fixtureRoot, "character-rig.json"), "utf8"),
    await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
  );
  assert.equal(contract.ok, true);
  assert.equal(layout.parts.length, 17);
  assert.equal(layout.parts.filter((part) => part.parentId === null).length, 1);
  assert.equal(layout.parts.find((part) => part.parentId === null)?.partId, "pelvis");
  assert.equal(new Set(layout.parts.map((part) => part.drawOrder)).size, 17);
  assert.equal(layout.sourceCanvas.width, source.sourceCanvas.width);
  assert.equal(layout.sourceCanvas.height, source.sourceCanvas.height);
  assert.equal(layout.referenceScale, source.referenceScale);

  for (const authored of source.parts) {
    const part = layout.parts.find((candidate) => candidate.partId === authored.partId)!;
    assert.deepEqual(part.originalRect, authored.originalRect);
    assert.deepEqual(part.trimOffset, authored.trimOffset);
    assert.equal(
      part.anchor.x,
      (authored.pivot.x - authored.originalRect.x) / authored.originalRect.width,
    );
    assert.equal(
      part.anchor.y,
      (authored.pivot.y - authored.originalRect.y) / authored.originalRect.height,
    );
    assert.ok(part.anchor.x >= 0 && part.anchor.x <= 1);
    assert.ok(part.anchor.y >= 0 && part.anchor.y <= 1);
    assert.ok(
      authored.trimOffset.x + authored.trimSize.width <= authored.originalRect.width,
    );
    assert.ok(
      authored.trimOffset.y + authored.trimSize.height <= authored.originalRect.height,
    );
  }
  const order = (partId: string) =>
    layout.parts.find((part) => part.partId === partId)!.drawOrder;
  assert.ok(order("hair-back") < order("head"));
  assert.ok(order("head") < order("hair-front"));
  assert.ok(order("upper-arm-right") < order("torso"));
  assert.ok(order("torso") < order("upper-arm-left"));
});

test("reconstructs exact Rest RGBA and rejects every required contract mutation", async () => {
  const accepted = await reconstructProductionLiteRest(
    fixtureRoot,
    structuredClone(layout),
    reference,
  );
  assert.deepEqual(accepted.metrics, {
    status: "passed",
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    seamMismatchPixels: 0,
    referenceBounds: { x: 173, y: 48, width: 269, height: 608 },
    reconstructedBounds: { x: 173, y: 48, width: 269, height: 608 },
    boundsExpansionPixels: 0,
    tolerance: {
      rgbaMismatchPixels: 0,
      alphaMismatchPixels: 0,
      boundsExpansionPixels: 0,
      seamMismatchPixels: 0,
    },
    diagnostics: [],
  });

  const mutations: Array<[string, (draft: ProductionLiteLayout) => void]> = [
    ["trim offset", (draft) => {
      (draft.parts.find((part) => part.partId === "head")!.trimOffset as { x: number }).x += 2;
    }],
    ["anchor", (draft) => {
      (draft.parts.find((part) => part.partId === "head")!.anchor as { x: number }).x += 0.03;
    }],
    ["rest transform", (draft) => {
      (draft.parts.find((part) => part.partId === "torso")!.restPose.position as { x: number }).x += 4;
    }],
    ["reference scale", (draft) => {
      (draft as { referenceScale: number }).referenceScale = 0.6;
    }],
    ["draw order", (draft) => {
      (draft.parts.find((part) => part.partId === "hair-front") as { drawOrder: number }).drawOrder = -1;
    }],
    ["bounds expansion", (draft) => {
      (draft.parts.find((part) => part.partId === "pelvis")!.restPose.position as { x: number }).x += 180;
    }],
    ["visible seam", (draft) => {
      (draft.parts.find((part) => part.partId === "lower-arm-left")!.restPose.position as { x: number }).x += 12;
    }],
  ];
  for (const [name, mutate] of mutations) {
    const draft = structuredClone(layout);
    mutate(draft);
    const rejected = await reconstructProductionLiteRest(fixtureRoot, draft, reference);
    assert.equal(rejected.metrics.status, "failed", name);
    assert.ok(rejected.metrics.rgbaMismatchPixels > 0, name);
  }

  const missingRoot = await mkdtemp(path.join(os.tmpdir(), "task009-missing-"));
  const missing = structuredClone(layout);
  for (const part of missing.parts) {
    (part as { file: string }).file = path.join(fixtureRoot, part.file);
  }
  (missing.parts.find((part) => part.partId === "head") as { file: string }).file =
    "absent-head.png";
  const rejected = await reconstructProductionLiteRest(missingRoot, missing, reference);
  assert.equal(rejected.metrics.status, "failed");
  assert.ok(
    rejected.metrics.diagnostics.includes("RECONSTRUCTION_PART_MISSING:head"),
  );
});

test("uses four validated data clips with mirrored semantics and evaluator-only transforms", async () => {
  const clips: RigAnimation[] = [];
  for (const name of ["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"]) {
    const parsed = parseRigAnimation(
      await readFile(path.join(fixtureRoot, `animations/${name}.json`), "utf8"),
      {
        rigId: "production-lite-character-layout",
        rigSchemaVersion: "1.0.0",
        jointIds: new Set(layout.parts.map((part) => part.partId)),
      },
    );
    assert.equal(parsed.ok, true, name);
    if (parsed.ok) clips.push(parsed.value);
  }
  const stress = clips.find(
    (candidate) => candidate.animationId === "production-lite-articulation-stress",
  )!;
  for (const jointId of [
    "upper-arm-left",
    "upper-arm-right",
    "lower-arm-left",
    "lower-arm-right",
    "thigh-left",
    "thigh-right",
    "shin-left",
    "shin-right",
    "shoe-left",
    "shoe-right",
  ]) {
    assert.ok(stress.tracks.some((track) => track.jointId === jointId), jointId);
  }
  const walk = clips.find(
    (candidate) => candidate.animationId === "production-lite-walk-cycle",
  )!;
  const track = (jointId: string) =>
    walk.tracks.find(
      (candidate) => candidate.jointId === jointId && candidate.property === "rotation",
    )!;
  assert.equal(
    track("thigh-left").keyframes[0]!.value,
    -Number(track("thigh-right").keyframes[0]!.value),
  );
  assert.equal(
    track("upper-arm-left").keyframes[0]!.value,
    -Number(track("upper-arm-right").keyframes[0]!.value),
  );

  const hierarchy: RigHierarchyJoint[] = layout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: part.restPose,
  }));
  const exactRest = evaluateRigPose(hierarchy);
  for (const clip of clips) {
    const playback = new RigAnimationPlayback(normalizeRigAnimation(clip));
    assert.deepEqual(evaluateRigPose(structuredClone(hierarchy)), exactRest);
    for (const time of [0, clip.duration / 4, clip.duration / 2, clip.duration * 0.75]) {
      const first = evaluateRigPose(hierarchy, playback.seek(time));
      const second = evaluateRigPose(hierarchy, playback.seek(time));
      assert.deepEqual(second, first);
      assert.deepEqual(
        first.joints["hair-front"]!.worldTransform,
        first.joints["hair-back"]!.worldTransform,
        `${clip.animationId} hair layers follow the head`,
      );
    }
    playback.seek(clip.duration / 3);
    const held = playback.pause();
    assert.deepEqual(playback.update(0.4), held);
    assert.notDeepEqual(playback.play(), playback.update(0.1));
    playback.stop();
    assert.deepEqual(evaluateRigPose(structuredClone(hierarchy)), exactRest);
  }
});

test("keeps every authored articulation attachment covered at its common pivot", async () => {
  const decoded = new Map<
    string,
    { data: Buffer; width: number; height: number; channels: number }
  >();
  for (const part of source.parts) {
    const result = await sharp(path.join(fixtureRoot, `parts/${part.partId}.png`))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    decoded.set(part.partId, {
      data: result.data,
      width: result.info.width,
      height: result.info.height,
      channels: result.info.channels,
    });
  }
  const alphaNear = (
    part: (typeof source.parts)[number],
    point: { x: number; y: number },
  ): boolean => {
    const image = decoded.get(part.partId)!;
    const centerX = Math.round(
      point.x - part.originalRect.x - part.trimOffset.x,
    );
    const centerY = Math.round(
      point.y - part.originalRect.y - part.trimOffset.y,
    );
    for (let y = centerY - 5; y <= centerY + 5; y += 1) {
      for (let x = centerX - 5; x <= centerX + 5; x += 1) {
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
        if (image.data[(y * image.width + x) * image.channels + 3]! > 0) return true;
      }
    }
    return false;
  };
  for (const child of source.parts) {
    if (child.parentId === null || child.partId.startsWith("hair-")) continue;
    const parent = source.parts.find((part) => part.partId === child.parentId)!;
    assert.ok(alphaNear(child, child.pivot), `${child.partId} proximal overlap`);
    assert.ok(alphaNear(parent, child.pivot), `${parent.partId} covers ${child.partId}`);
  }
});

test("contains no forbidden character corrections or Cocos values in the core evaluator", async () => {
  const files = [
    path.join(fixtureRoot, "source/character-source.json"),
    path.join(packageRoot, "scripts/generate-production-lite-character.mjs"),
    path.join(packageRoot, "source/production-lite-reconstruction.ts"),
    path.join(repositoryRoot, "pipelines/rig-animation/source/hierarchy.ts"),
  ];
  const text = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");
  assert.doesNotMatch(
    text,
    /red[ -]?cap|briefcase|sunglasses|jacket|partCorrections|correctionByPart/i,
  );
  const core = await readFile(
    path.join(repositoryRoot, "pipelines/rig-animation/source/hierarchy.ts"),
    "utf8",
  );
  assert.doesNotMatch(core, /\bcc\b|Cocos|Node|Sprite|UITransform|Sorting2D/);
  assert.deepEqual(
    (await readdir(path.join(fixtureRoot, "parts"))).sort(),
    source.parts.map((part) => `${part.partId}.png`).sort(),
  );
});

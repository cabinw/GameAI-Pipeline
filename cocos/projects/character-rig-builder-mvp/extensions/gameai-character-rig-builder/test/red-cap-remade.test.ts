import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import { resolve } from "node:path";
import { after, before, describe, it } from "node:test";

import { parseCharacterRig } from "@gameai/character-contracts";
import {
  generateRigLayout,
  maleNormalV1,
  serializeRigLayout,
} from "@gameai/rig-layout-generator";
import type { CharacterAssetManifest } from "@gameai/character-asset-intake";

import { resolveSpriteFrameAssets } from "../source/assetdb";
import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "../source/diagnostics";
import {
  decideGeneratedRootReplacement,
} from "../source/replacement-boundary";
import { buildCocosSceneRigPlan } from "../source/scene-plan";
import {
  auditSourceAssetMap,
  parseSourceAssetMap,
} from "../source/source-asset-map";

const repositoryRoot = resolve(process.cwd(), "../../../../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target-remade");
const cocosMirrorRoot = resolve(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-target-remade",
);

const canonicalMapping = {
  "briefcase.png": "briefcase",
  "cap.png": "cap",
  "foot_l.png": "foot-left",
  "foot_r.png": "foot-right",
  "forearm_l.png": "forearm-left",
  "forearm_r.png": "forearm-right",
  "glasses.png": "sunglasses",
  "hair.png": "hair",
  "hand_l.png": "hand-left",
  "hand_r.png": "hand-right",
  "head.png": "head",
  "pelvis.png": "pelvis",
  "shin_l.png": "shin-left",
  "shin_r.png": "shin-right",
  "thigh_l.png": "thigh-left",
  "thigh_r.png": "thigh-right",
  "torso.png": "torso",
  "upper_arm_l.png": "upper-arm-left",
  "upper_arm_r.png": "upper-arm-right",
} as const;

const expectedDimensions = {
  briefcase: [150, 133],
  cap: [126, 76],
  "foot-left": [69, 62],
  "foot-right": [60, 59],
  "forearm-left": [55, 147],
  "forearm-right": [87, 134],
  sunglasses: [103, 30],
  hair: [128, 106],
  "hand-left": [51, 107],
  "hand-right": [65, 111],
  head: [126, 155],
  pelvis: [141, 98],
  "shin-left": [54, 131],
  "shin-right": [51, 120],
  "thigh-left": [64, 145],
  "thigh-right": [53, 139],
  torso: [208, 179],
  "upper-arm-left": [67, 173],
  "upper-arm-right": [95, 146],
} as const;

const insetContentBounds = {
  "forearm-right": { x: 7, y: 0, width: 67, height: 134 },
  "hand-right": { x: 1, y: 0, width: 53, height: 111 },
  "shin-left": { x: 3, y: 0, width: 38, height: 131 },
  "shin-right": { x: 2, y: 0, width: 33, height: 120 },
  "thigh-left": { x: 2, y: 0, width: 62, height: 145 },
  "thigh-right": { x: 0, y: 0, width: 44, height: 139 },
  "upper-arm-right": { x: 11, y: 0, width: 63, height: 146 },
} as const;

let manifest: CharacterAssetManifest;
let cocosManifest: CharacterAssetManifest;
let annotation: unknown;
let temporaryRoots: string[] = [];

before(async () => {
  const [rigText, annotationText] = await Promise.all([
    readFile(resolve(fixtureRoot, "character-rig.json"), "utf8"),
    readFile(resolve(fixtureRoot, "source-annotation.json"), "utf8"),
  ]);
  annotation = JSON.parse(annotationText) as unknown;
  const rig = parseCharacterRig(rigText);
  assert.equal(rig.ok, true);
  if (!rig.ok) return;
  const generation = await generateRigLayout({
    annotation,
    template: maleNormalV1,
    characterRig: rig.value,
    sourceRoot: fixtureRoot,
    characterRigPath: resolve(fixtureRoot, "character-rig.json"),
    rigLayoutPath: resolve(fixtureRoot, "rig-layout.json"),
  });
  assert.equal(generation.ok, true);
  if (!generation.ok) return;
  manifest = generation.manifest;
  assert.equal(
    serializeRigLayout(generation.rigLayout),
    await readFile(resolve(fixtureRoot, "rig-layout.json"), "utf8"),
  );
  const cocosGeneration = await generateRigLayout({
    annotation,
    template: maleNormalV1,
    characterRig: rig.value,
    sourceRoot: cocosMirrorRoot,
    characterRigPath: resolve(cocosMirrorRoot, "character-rig.json"),
    rigLayoutPath: resolve(cocosMirrorRoot, "rig-layout.json"),
  });
  assert.equal(cocosGeneration.ok, true);
  if (cocosGeneration.ok) cocosManifest = cocosGeneration.manifest;
});

after(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Red Cap Remade source art", () => {
  it("uses the explicit one-to-one source filename mapping", async () => {
    const mapping = await auditSourceAssetMap({
      sourceRoot: fixtureRoot,
      mappingFile: "source-asset-map.json",
      annotation,
      correlationId: "task0042-map",
    });
    assert.equal(mapping.parts.length, 19);
    assert.deepEqual(
      Object.fromEntries(
        mapping.parts.map((entry) => [
          entry.sourceFile.split("/").at(-1),
          entry.partId,
        ]),
      ),
      canonicalMapping,
    );
  });

  it("decodes every required real part with transparency and stable content bounds", () => {
    assert.equal(manifest.characterId, "red-cap-target-remade");
    assert.equal(manifest.parts.length, 19);
    assert.deepEqual(
      new Set(manifest.parts.map((part) => part.partId)),
      new Set(Object.values(canonicalMapping)),
    );
    for (const part of manifest.parts) {
      const dimensions =
        expectedDimensions[part.partId as keyof typeof expectedDimensions];
      assert.notEqual(dimensions, undefined, part.partId);
      assert.equal(part.imageFormat, "png", part.partId);
      assert.equal(part.hasAlpha, true, part.partId);
      assert.equal(part.hasTransparency, true, part.partId);
      assert.ok(part.transparentPixelCount > 0, part.partId);
      assert.deepEqual([part.width, part.height], dimensions, part.partId);
      assert.deepEqual(
        part.contentBounds,
        insetContentBounds[part.partId as keyof typeof insetContentBounds] ?? {
          x: 0,
          y: 0,
          width: dimensions[0],
          height: dimensions[1],
        },
        part.partId,
      );
    }
  });

  it("keeps the Cocos import mirror byte-identical to the canonical fixture", async () => {
    const mappedFiles = Object.values(canonicalMapping).map(
      (partId) => `parts/${partId}.png`,
    );
    const documents = [
      "README.md",
      "character-rig.json",
      "source-asset-map.json",
      "source-annotation.json",
      "rig-layout.json",
      "assembled-preview.svg",
    ];
    for (const file of [...mappedFiles, ...documents]) {
      assert.deepEqual(
        await readFile(resolve(cocosMirrorRoot, file)),
        await readFile(resolve(fixtureRoot, file)),
        file,
      );
    }
  });

  it("resolves one AssetDB SpriteFrame for every real mapped part", async () => {
    globalThis.Editor = {
      Message: {
        async request(_channel: string, _message: string, assetUrl: unknown) {
          const url = String(assetUrl);
          const token = url.replace(/[^a-z0-9]+/gi, "-");
          return {
            uuid: `image-${token}`,
            url,
            type: "cc.ImageAsset",
            subAssets: {
              spriteFrame: {
                uuid: `frame-${token}`,
                name: "spriteFrame",
                type: "cc.SpriteFrame",
              },
            },
          };
        },
      },
    } as typeof Editor;
    const references = await resolveSpriteFrameAssets(
      cocosManifest.parts,
      resolve(repositoryRoot, "cocos/projects/character-rig-builder-mvp/assets"),
      "task0042-assetdb",
    );
    assert.equal(references.length, 19);
    assert.equal(new Set(references.map((entry) => entry.spriteFrameUuid)).size, 19);
    assert.deepEqual(
      references.map((entry) => entry.partId),
      cocosManifest.parts.map((part) => part.partId),
    );
  });

  it("keeps the real generated scene plan idempotently replaceable", () => {
    const references = manifest.parts.map((part) => ({
      partId: part.partId,
      assetUrl: `db://assets/gameai/red-cap-target-remade/${part.sourceRelativePath}`,
      imageUuid: `image-${part.partId}`,
      spriteFrameUuid: `frame-${part.partId}`,
    }));
    const plan = buildCocosSceneRigPlan({
      correlationId: "task0042-plan",
      manifest,
      assetReferences: references,
    });
    assert.equal(plan.characterRootName, "CHR_red_cap_target_remade");
    assert.equal(plan.parts.length, 19);
    assert.deepEqual(
      decideGeneratedRootReplacement(
        [
          { name: "Main Camera", hasGeneratedMarker: false },
          { name: plan.characterRootName, hasGeneratedMarker: true },
        ],
        plan.characterRootName,
        plan.correlationId,
      ),
      { action: "replace", matchingIndex: 1, unrelatedRootCount: 1 },
    );
  });
});

describe("Red Cap Remade fail-closed asset diagnostics", () => {
  it("publishes a stable ambiguity diagnostic for duplicate part mappings", () => {
    assert.throws(
      () =>
        parseSourceAssetMap(
          {
            mappingVersion: "1.0.0",
            assetDirectory: "parts",
            parts: [
              { sourceFile: "parts/head.png", partId: "head" },
              { sourceFile: "parts/other-head.png", partId: "head" },
            ],
          },
          "task0042-ambiguous",
        ),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code ===
          SceneRigDiagnosticCode.SOURCE_ART_PART_AMBIGUOUS,
    );
  });

  it("publishes a stable missing diagnostic before scene generation", async () => {
    const root = await mkdtemp(resolve(os.tmpdir(), "gameai-task0042-missing-"));
    temporaryRoots.push(root);
    await mkdir(resolve(root, "parts"));
    await writeFile(
      resolve(root, "source-asset-map.json"),
      JSON.stringify({
        mappingVersion: "1.0.0",
        assetDirectory: "parts",
        parts: [{ sourceFile: "parts/head.png", partId: "head" }],
      }),
    );
    await assert.rejects(
      auditSourceAssetMap({
        sourceRoot: root,
        mappingFile: "source-asset-map.json",
        annotation: { parts: [{ partId: "head", file: "parts/head.png" }] },
        correlationId: "task0042-missing",
      }),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code === SceneRigDiagnosticCode.SOURCE_ART_PART_MISSING,
    );
  });
});

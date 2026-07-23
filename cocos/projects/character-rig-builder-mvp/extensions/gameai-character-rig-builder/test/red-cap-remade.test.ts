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
import {
  AssetDiagnosticCode,
  reconstructManifestPlacements,
  sourcePointToReference,
  validateSourceCanvasReconstruction,
  type CharacterAssetManifest,
} from "@gameai/character-asset-intake";

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
import type { CocosSceneRigPlan } from "../source/types";

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

let manifest: CharacterAssetManifest;
let cocosManifest: CharacterAssetManifest;
let remadePlan: CocosSceneRigPlan;
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
  remadePlan = buildCocosSceneRigPlan({
    correlationId: "task0043-reconstruction",
    manifest,
    assetReferences: manifest.parts.map((part) => ({
      partId: part.partId,
      assetUrl: `db://assets/gameai/red-cap-target-remade/${part.sourceRelativePath}`,
      imageUuid: `image-${part.partId}`,
      spriteFrameUuid: `frame-${part.partId}`,
    })),
  });
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
    const sourceMap = JSON.parse(
      await readFile(resolve(fixtureRoot, "source-asset-map.json"), "utf8"),
    ) as {
      parts: Array<{
        partId: string;
        sourceFile: string;
        canonicalSourceFile?: string;
      }>;
    };
    assert.deepEqual(
      Object.fromEntries(
        sourceMap.parts.map((entry) => [
          (entry.canonicalSourceFile ?? entry.sourceFile).split("/").at(-1),
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
    const annotationParts = (
      annotation as {
        parts: Array<{
          partId: string;
          sourceRect: { width: number; height: number };
        }>;
      }
    ).parts;
    for (const part of manifest.parts) {
      const annotated = annotationParts.find(
        (candidate) => candidate.partId === part.partId,
      );
      assert.notEqual(annotated, undefined, part.partId);
      assert.equal(part.imageFormat, "png", part.partId);
      assert.equal(part.hasAlpha, true, part.partId);
      assert.equal(part.hasTransparency, true, part.partId);
      assert.ok(part.transparentPixelCount > 0, part.partId);
      assert.deepEqual(
        [part.width, part.height],
        [annotated!.sourceRect.width, annotated!.sourceRect.height],
        part.partId,
      );
      assert.notEqual(part.contentBounds, null, part.partId);
      const contentBounds = part.contentBounds!;
      assert.ok(contentBounds.width > 0, part.partId);
      assert.ok(contentBounds.height > 0, part.partId);
      assert.ok(
        contentBounds.x + contentBounds.width <= part.width,
        part.partId,
      );
      assert.ok(
        contentBounds.y + contentBounds.height <= part.height,
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
      "articulation-safety.json",
      "character-rig.json",
      "source-asset-map.json",
      "source-annotation.json",
      "rig-layout.json",
      "assembled-preview.svg",
      "reference/reconstructed-neutral.png",
      "reference/reference-comparison.png",
      "reference/reconstruction-metrics.json",
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

describe("Red Cap Remade exact source-canvas reconstruction", () => {
  function plannedPart(partId: string) {
    const value = remadePlan.parts.find((part) => part.partId === partId);
    assert.notEqual(value, undefined);
    return value!;
  }

  function jointWorld(partId: string): { x: number; y: number } {
    const part = plannedPart(partId);
    const parent =
      part.parentId === null ? { x: 0, y: 0 } : jointWorld(part.parentId);
    return {
      x: Math.round((parent.x + part.jointPosition.x) * 1_000_000) / 1_000_000,
      y: Math.round((parent.y + part.jointPosition.y) * 1_000_000) / 1_000_000,
    };
  }

  it("reconstructs source-rect centers before applying the hierarchy", () => {
    assert.equal(manifest.visualPlacementMode, "source-canvas-rect");
    assert.equal(remadePlan.visualPlacementMode, "source-canvas-rect");
    const placements = reconstructManifestPlacements(manifest);
    for (const placement of placements) {
      const sourcePart = manifest.parts.find(
        (part) => part.partId === placement.partId,
      )!;
      assert.deepEqual(placement.visualSourceCenter, {
        x: sourcePart.originalRect.x + sourcePart.originalRect.width / 2,
        y: sourcePart.originalRect.y + sourcePart.originalRect.height / 2,
      });
    }
  });

  it("preserves every visual world position through Joint + Visual conversion", () => {
    const placements = new Map(
      reconstructManifestPlacements(manifest).map((value) => [
        value.partId,
        value,
      ]),
    );
    for (const part of remadePlan.parts) {
      const joint = jointWorld(part.partId);
      const actualVisualWorld = {
        x: Math.round((joint.x + part.visualOffset.x) * 1_000_000) / 1_000_000,
        y: Math.round((joint.y + part.visualOffset.y) * 1_000_000) / 1_000_000,
      };
      assert.deepEqual(
        actualVisualWorld,
        placements.get(part.partId)!.visualWorldPosition,
        part.partId,
      );
    }
  });

  it("keeps nonzero visual offsets when pivots differ from sprite centers", () => {
    for (const partId of [
      "torso",
      "upper-arm-left",
      "forearm-left",
      "hand-right",
      "thigh-left",
      "shin-right",
      "foot-left",
      "briefcase",
    ]) {
      const offset = plannedPart(partId).visualOffset;
      assert.notDeepEqual(offset, { x: 0, y: 0 }, partId);
    }
  });

  it("reconstructs annotated world pivots from parent-relative child joints", () => {
    for (const sourcePart of manifest.parts) {
      const expected = sourcePointToReference(
        {
          x:
            sourcePart.originalRect.x +
            sourcePart.anchor.x * sourcePart.originalRect.width,
          y:
            sourcePart.originalRect.y +
            sourcePart.anchor.y * sourcePart.originalRect.height,
        },
        manifest.sourceCanvas,
        manifest.referenceScale,
      );
      assert.deepEqual(jointWorld(sourcePart.partId), expected, sourcePart.partId);
    }
  });

  it("applies referenceScale exactly once to visual sizes", () => {
    for (const sourcePart of manifest.parts) {
      assert.deepEqual(plannedPart(sourcePart.partId).visualSize, {
        width:
          Math.round(
            sourcePart.originalRect.width * manifest.referenceScale * 1_000_000,
          ) / 1_000_000,
        height:
          Math.round(
            sourcePart.originalRect.height * manifest.referenceScale * 1_000_000,
          ) / 1_000_000,
      });
    }
  });

  it("uses anatomical left/right rather than viewer-left/right", () => {
    for (const [left, right] of [
      ["upper-arm-left", "upper-arm-right"],
      ["hand-left", "hand-right"],
      ["thigh-left", "thigh-right"],
      ["shin-left", "shin-right"],
      ["foot-left", "foot-right"],
    ] as const) {
      assert.ok(
        reconstructManifestPlacements(manifest).find(
          (part) => part.partId === left,
        )!.jointSourcePosition.x >
          reconstructManifestPlacements(manifest).find(
            (part) => part.partId === right,
          )!.jointSourcePosition.x,
        `${left} must be on the viewer-right side of the front-facing character`,
      );
    }
  });

  it("publishes a stable diagnostic for double-applied trim metadata", () => {
    const invalid: CharacterAssetManifest = {
      ...manifest,
      parts: manifest.parts.map((part, index) =>
        index === 0
          ? { ...part, trimOffset: { x: 1, y: 0 } }
          : part,
      ),
    };
    assert.equal(
      validateSourceCanvasReconstruction(invalid)[0]?.code,
      AssetDiagnosticCode.TRIM_METADATA_INCONSISTENT,
    );
  });

  it("keeps the neutral reconstruction close to the complete reference", async () => {
    const metrics = JSON.parse(
      await readFile(
        resolve(fixtureRoot, "reference/reconstruction-metrics.json"),
        "utf8",
      ),
    ) as { alphaSilhouetteIoU: number };
    assert.ok(metrics.alphaSilhouetteIoU >= 0.8);
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

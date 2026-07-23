import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { before, describe, it } from "node:test";

import {
  generateRigLayout,
  maleNormalV1,
} from "@gameai/rig-layout-generator";
import { parseCharacterRig } from "@gameai/character-contracts";
import type { CharacterAssetManifest } from "@gameai/character-asset-intake";
import type { NormalizedRigAnimation } from "@gameai/rig-animation";

import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "../source/diagnostics";
import {
  cameraRendersLayer,
  compatibleCameras,
  type SceneCameraDescriptor,
} from "../source/camera-visibility";
import {
  digestScenePlan,
  executeCharacterRigBuild,
} from "../source/orchestrator";
import {
  commitGeneratedRootReplacement,
  decideGeneratedRootReplacement,
} from "../source/replacement-boundary";
import { buildCocosSceneRigPlan } from "../source/scene-plan";
import type {
  BuildCharacterRigRequest,
  CocosSceneRigPlan,
  PreparedSceneRig,
  SceneBuildResult,
  SpriteFrameAssetReference,
} from "../source/types";

const sourceRoot = resolve(process.cwd(), "../../../../../examples/red-cap-target");
let manifest: CharacterAssetManifest;
let plan: CocosSceneRigPlan;
let references: readonly SpriteFrameAssetReference[];

before(async () => {
  const [rigText, annotationText] = await Promise.all([
    readFile(resolve(sourceRoot, "character-rig.json"), "utf8"),
    readFile(resolve(sourceRoot, "source-annotation.json"), "utf8"),
  ]);
  const rig = parseCharacterRig(rigText);
  assert.equal(rig.ok, true);
  if (!rig.ok) return;
  const generation = await generateRigLayout({
    annotation: JSON.parse(annotationText) as unknown,
    template: maleNormalV1,
    characterRig: rig.value,
    sourceRoot,
    characterRigPath: resolve(sourceRoot, "character-rig.json"),
    rigLayoutPath: resolve(sourceRoot, "rig-layout.json"),
  });
  assert.equal(generation.ok, true);
  if (!generation.ok) return;
  manifest = generation.manifest;
  references = manifest.parts.map((part) => ({
    partId: part.partId,
    assetUrl: `db://assets/gameai/red-cap-target/${part.sourceRelativePath}`,
    imageUuid: `image-${part.partId}`,
    spriteFrameUuid: `frame-${part.partId}`,
  }));
  plan = buildCocosSceneRigPlan({
    correlationId: "task004-test",
    manifest,
    assetReferences: references,
  });
});

function part(partId: string) {
  const value = plan.parts.find((candidate) => candidate.partId === partId);
  assert.notEqual(value, undefined);
  return value!;
}

describe("buildCocosSceneRigPlan", () => {
  it("selects the versioned world-space 2D render contract", () => {
    assert.equal(plan.planVersion, "1.3.0");
    assert.equal(plan.renderLayer, "UI_3D");
    assert.deepEqual(plan.sourceCanvas, manifest.sourceCanvas);
    assert.equal(plan.visualPlacementMode, "trimmed-pixels");
  });

  it("creates one Joint/Visual pair and the complete proximal hierarchy", () => {
    assert.equal(plan.characterRootName, "CHR_red_cap_target");
    assert.equal(plan.parts.length, manifest.parts.length);
    assert.deepEqual(
      plan.parts.map((value) => [value.jointName, value.visualName]),
      manifest.parts.map((value) => [
        `Joint_${value.partId}`,
        `Visual_${value.partId}`,
      ]),
    );
    assert.equal(part("torso").parentId, "pelvis");
    assert.equal(part("head").parentId, "torso");
    assert.equal(part("upper-arm-left").parentId, "torso");
    assert.equal(part("forearm-left").parentId, "upper-arm-left");
    assert.equal(part("hand-left").parentId, "forearm-left");
    assert.equal(part("thigh-left").parentId, "pelvis");
    assert.equal(part("shin-left").parentId, "thigh-left");
    assert.equal(part("foot-left").parentId, "shin-left");
  });

  it("derives visual trim offsets from decoded dimensions and proximal joints", () => {
    assert.deepEqual(part("pelvis").visualOffset, { x: 0.06, y: -0.04 });
    assert.deepEqual(part("torso").visualOffset, { x: 0.07, y: 1.05 });
    assert.equal(part("upper-arm-left").visualOffset.x, -0.475);
    assert.ok(Math.abs(part("upper-arm-left").visualOffset.y + 0.835) < 0.000002);
    assert.equal(part("forearm-left").visualOffset.x, -0.33);
    assert.ok(Math.abs(part("forearm-left").visualOffset.y + 0.715) < 0.000002);
    assert.deepEqual(part("pelvis").visualAnchor, { x: 0.5, y: 0.5 });
  });

  it("keeps shoulder, elbow, hip, knee, wrist, and ankle pivots on Joint nodes", () => {
    assert.deepEqual(part("upper-arm-left").jointPosition, { x: -1, y: 1.8 });
    assert.deepEqual(part("forearm-left").jointPosition, { x: -0.6, y: -1.6 });
    assert.deepEqual(part("hand-left").jointPosition, { x: -0.5, y: -1.55 });
    assert.deepEqual(part("thigh-left").jointPosition, { x: -0.55, y: -0.6 });
    assert.deepEqual(part("shin-left").jointPosition, { x: -0.2, y: -1.8 });
    assert.deepEqual(part("foot-left").jointPosition, { x: -0.05, y: -1.65 });
  });

  it("converts decoded image size with referenceScale", () => {
    assert.equal(plan.referenceScale, 0.01);
    assert.deepEqual(part("pelvis").visualSize, { width: 1.68, height: 1.42 });
    assert.deepEqual(part("head").visualSize, { width: 1.62, height: 2.04 });
    assert.deepEqual(part("upper-arm-left").jointScale, { x: 1, y: 1 });
  });

  it("assigns a unique deterministic global draw order across branches", () => {
    const orders = plan.parts
      .map((value) => value.sortingOrder)
      .sort((left, right) => left - right);
    assert.deepEqual(
      orders,
      Array.from({ length: plan.parts.length }, (_, index) => index),
    );
    assert.ok(
      part("upper-arm-left").sortingOrder <
        part("upper-arm-right").sortingOrder,
    );
    assert.ok(part("foot-left").sortingOrder < part("torso").sortingOrder);
    assert.ok(part("torso").sortingOrder < part("head").sortingOrder);
  });

  it("is byte-deterministic for equivalent validated inputs", () => {
    const second = buildCocosSceneRigPlan({
      correlationId: "task004-test",
      manifest,
      assetReferences: references,
    });
    assert.equal(JSON.stringify(second), JSON.stringify(plan));
    assert.equal(digestScenePlan(second), digestScenePlan(plan));
  });

  it("carries normalized Joint-only animation data without changing visual calibration", () => {
    const animation = {
      schemaVersion: "1.0.0",
      animationId: "idle-test",
      rigId: "red-cap-target-layout",
      rigSchemaVersion: manifest.schemaVersions.rigLayout,
      duration: 2,
      loop: true,
      tracks: [
        {
          jointId: "torso",
          property: "position",
          keyframes: [
            {
              time: 0,
              value: { x: 0, y: 0 },
              interpolation: "linear",
              easing: "linear",
            },
            {
              time: 2,
              value: { x: 0, y: 0 },
              interpolation: "linear",
              easing: "linear",
            },
          ],
        },
      ],
    } satisfies NormalizedRigAnimation;
    const animated = buildCocosSceneRigPlan({
      correlationId: "task005-test",
      manifest,
      assetReferences: references,
      animation: {
        componentClassName: "GameAIRigAnimationPlayer",
        presetAssetUrl: "db://assets/gameai/red-cap-target/animations/idle.json",
        presetAssetUuid: "idle-json-uuid",
        normalizedAnimation: animation,
        autoplay: true,
      },
    });
    assert.deepEqual(
      animated.parts.map(({ partId, visualOffset, visualSize, sortingOrder }) => ({
        partId,
        visualOffset,
        visualSize,
        sortingOrder,
      })),
      plan.parts.map(({ partId, visualOffset, visualSize, sortingOrder }) => ({
        partId,
        visualOffset,
        visualSize,
        sortingOrder,
      })),
    );
    assert.equal(animated.animation?.normalizedAnimation.tracks[0]?.jointId, "torso");
    assert.equal(
      animated.animation?.normalizedAnimation.tracks.some((track) =>
        track.jointId.startsWith("Visual_"),
      ),
      false,
    );
    assert.equal(
      JSON.stringify(animated),
      JSON.stringify(
        buildCocosSceneRigPlan({
          correlationId: "task005-test",
          manifest,
          assetReferences: references,
          animation: animated.animation,
        }),
      ),
    );
  });
});

describe("Cocos animation runtime boundary", () => {
  it("applies absolute samples only to Joint nodes and restores captured rest pose", async () => {
    const runtimeSource = await readFile(
      resolve(
        process.cwd(),
        "../../assets/gameai/runtime/rig-animation-player.ts",
      ),
      "utf8",
    );
    assert.match(runtimeSource, /Joint_\$\{jointId\}/);
    assert.match(runtimeSource, /composeJointPose\(binding\.restPose/);
    assert.match(runtimeSource, /restoreRestPose\(\)/);
    assert.doesNotMatch(runtimeSource, /getComponent\(Sprite\)/);
    assert.doesNotMatch(runtimeSource, /Visual_\$\{jointId\}/);
  });
});

describe("world-space 2D camera visibility", () => {
  const ui3d = 1 << 23;
  const cameras: readonly SceneCameraDescriptor[] = [
    {
      name: "Disabled Camera",
      uuid: "camera-disabled",
      enabledInHierarchy: false,
      visibility: ui3d,
    },
    {
      name: "World Camera",
      uuid: "camera-world",
      enabledInHierarchy: true,
      visibility: ui3d | (1 << 30),
    },
    {
      name: "UI Camera",
      uuid: "camera-ui",
      enabledInHierarchy: true,
      visibility: 1 << 25,
    },
  ];

  it("requires an active camera whose visibility contains the selected layer", () => {
    assert.equal(cameraRendersLayer(cameras[0]!, ui3d), false);
    assert.equal(cameraRendersLayer(cameras[1]!, ui3d), true);
    assert.equal(cameraRendersLayer(cameras[2]!, ui3d), false);
    assert.deepEqual(
      compatibleCameras(cameras, ui3d).map((camera) => camera.name),
      ["World Camera"],
    );
  });

  it("publishes a stable missing-camera diagnostic code", () => {
    assert.equal(
      SceneRigDiagnosticCode.NO_CAMERA_CAN_RENDER_GENERATED_LAYER,
      "NO_CAMERA_CAN_RENDER_GENERATED_LAYER",
    );
  });
});

describe("generated-root replacement boundary", () => {
  it("creates once and replaces the matching marked root on duplicate runs", () => {
    const first = decideGeneratedRootReplacement(
      [{ name: "Camera", hasGeneratedMarker: false }],
      "CHR_red_cap_target",
      "task004-first",
    );
    assert.deepEqual(first, {
      action: "create",
      matchingIndex: null,
      unrelatedRootCount: 1,
    });
    const second = decideGeneratedRootReplacement(
      [
        { name: "Camera", hasGeneratedMarker: false },
        { name: "CHR_red_cap_target", hasGeneratedMarker: true },
      ],
      "CHR_red_cap_target",
      "task004-second",
    );
    assert.deepEqual(second, {
      action: "replace",
      matchingIndex: 1,
      unrelatedRootCount: 1,
    });
  });

  it("never replaces an unrelated or unmarked root", () => {
    assert.throws(
      () =>
        decideGeneratedRootReplacement(
          [
            { name: "Player", hasGeneratedMarker: false },
            { name: "CHR_red_cap_target", hasGeneratedMarker: false },
          ],
          "CHR_red_cap_target",
          "task004-conflict",
        ),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code === SceneRigDiagnosticCode.GENERATED_ROOT_CONFLICT,
    );
  });

  it("rejects ambiguous duplicate generated roots", () => {
    assert.throws(
      () =>
        decideGeneratedRootReplacement(
          [
            { name: "CHR_red_cap_target", hasGeneratedMarker: true },
            { name: "CHR_red_cap_target", hasGeneratedMarker: true },
          ],
          "CHR_red_cap_target",
          "task004-ambiguous",
        ),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code === SceneRigDiagnosticCode.GENERATED_ROOT_AMBIGUOUS,
    );
  });

  it("rolls back the previous generated root when replacement verification fails", () => {
    interface FakeRoot {
      name: string;
      attached: boolean;
      destroyed: boolean;
    }
    const previous = { name: "previous", attached: true, destroyed: false };
    const replacement = { name: "replacement", attached: false, destroyed: false };
    const events: string[] = [];
    assert.throws(
      () =>
        commitGeneratedRootReplacement(previous, replacement, {
          isAttached: (node) => node.attached,
          attach: (node) => {
            node.attached = true;
            events.push(`attach:${node.name}`);
          },
          detach: (node) => {
            node.attached = false;
            events.push(`detach:${node.name}`);
          },
          destroy: (node) => {
            node.destroyed = true;
            events.push(`destroy:${node.name}`);
          },
          verify: () => {
            throw new Error("verification failed");
          },
        }),
      /verification failed/,
    );
    assert.equal(previous.attached, true);
    assert.equal(previous.destroyed, false);
    assert.equal(replacement.attached, false);
    assert.equal(replacement.destroyed, true);
    assert.deepEqual(events, [
      "detach:previous",
      "attach:replacement",
      "detach:replacement",
      "destroy:replacement",
      "attach:previous",
    ]);
  });
});

describe("executeCharacterRigBuild", () => {
  const request: BuildCharacterRigRequest = {
    correlationId: "task004-orchestrator",
    panelStartedAt: "2026-07-23T00:00:00.000Z",
    sourceRoot: "assets/gameai/red-cap-target",
    characterRigFile: "character-rig.json",
    sourceAnnotationFile: "source-annotation.json",
    assetMappingFile: "source-asset-map.json",
    animationPresetFile: "animations/idle-subtle.json",
    autoplayAnimation: true,
  };

  function prepared(): PreparedSceneRig {
    return {
      plan: { ...plan, correlationId: request.correlationId },
      manifest,
      assetReferences: references,
      validationWarnings: [],
    };
  }

  it("does not request scene mutation when engine-neutral preparation fails", async () => {
    let sceneCalls = 0;
    await assert.rejects(
      executeCharacterRigBuild(request, {
        creatorVersion: "3.8.8",
        now: () => "2026-07-23T00:00:01.000Z",
        async prepareSceneRig() {
          throw new SceneRigBuilderError({
            code: SceneRigDiagnosticCode.RIG_LAYOUT_GENERATION_FAILED,
            message: "invalid fixture",
            stage: "main",
            correlationId: request.correlationId,
          });
        },
        async requestScene(): Promise<SceneBuildResult> {
          sceneCalls += 1;
          throw new Error("must not run");
        },
        async writeEvidence() {},
      }),
    );
    assert.equal(sceneCalls, 0);
  });

  it("preserves correlation through Panel, Main, Scene, and evidence", async () => {
    let writtenCorrelation = "";
    const evidence = await executeCharacterRigBuild(request, {
      creatorVersion: "3.8.8",
      now: () => "2026-07-23T00:00:01.000Z",
      async prepareSceneRig() {
        return prepared();
      },
      async requestScene(value): Promise<SceneBuildResult> {
        return {
          ok: true,
          stage: "scene",
          correlationId: value.plan.correlationId,
          sceneName: "RedCapAcceptance",
          sceneUuid: "scene-uuid",
          characterRootName: value.plan.characterRootName,
          replacement: "created",
          partCount: value.plan.parts.length,
          jointCount: value.plan.parts.length,
          visualCount: value.plan.parts.length,
          socketCount: value.plan.sockets.length,
          unrelatedRootCountBefore: 1,
          unrelatedRootCountAfter: 1,
          renderLayer: "UI_3D",
          renderRoot2DVerified: true,
          spriteFramesVerified: value.plan.parts.length,
          nonZeroContentSizesVerified: value.plan.parts.length,
          compatibleCameraNames: ["Acceptance Camera"],
          cameraStatePreserved: true,
          verifiedPartIds: value.plan.parts.map((partValue) => partValue.partId),
          sortingOrders: value.plan.parts.map((partValue) => partValue.sortingOrder),
          animationRuntimeVerified: value.plan.animation !== null,
          animationId: value.plan.animation?.normalizedAnimation.animationId ?? null,
          animationTrackCount:
            value.plan.animation?.normalizedAnimation.tracks.length ?? 0,
          animationAutoplay: value.plan.animation?.autoplay ?? false,
        };
      },
      async writeEvidence(value) {
        writtenCorrelation = value.correlationId;
      },
    });
    assert.equal(evidence.correlationId, request.correlationId);
    assert.equal(evidence.sceneResult.correlationId, request.correlationId);
    assert.equal(writtenCorrelation, request.correlationId);
    assert.deepEqual(evidence.stages, [
      "panel",
      "main-validation",
      "assetdb",
      "scene",
      "verification",
    ]);
  });

  it("rejects a mismatched Scene Script correlation ID", async () => {
    await assert.rejects(
      executeCharacterRigBuild(request, {
        creatorVersion: "3.8.8",
        now: () => "2026-07-23T00:00:01.000Z",
        async prepareSceneRig() {
          return prepared();
        },
        async requestScene(): Promise<SceneBuildResult> {
          return {
            ok: false,
            stage: "scene",
            correlationId: "wrong",
            diagnostic: {
              code: SceneRigDiagnosticCode.SCENE_GENERATION_FAILED,
              message: "wrong correlation",
              stage: "scene",
              correlationId: "wrong",
            },
          };
        },
        async writeEvidence() {},
      }),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code === SceneRigDiagnosticCode.SCENE_CORRELATION_MISMATCH,
    );
  });
});

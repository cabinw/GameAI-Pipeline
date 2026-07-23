import assert from "node:assert/strict";
import { resolve } from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  assetUrlForPart,
  resolveSpriteFrameAssets,
} from "../source/assetdb";
import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "../source/diagnostics";
import type { ManifestPart } from "../source/types";

const previousEditor = globalThis.Editor;

afterEach(() => {
  globalThis.Editor = previousEditor;
});

function fakePart(resolvedPath: string): ManifestPart {
  return {
    partId: "head",
    parentId: "torso",
    sourceRelativePath: "assets/parts/head.png",
    resolvedPath,
    imageFormat: "png",
    width: 162,
    height: 204,
    hasAlpha: true,
    contentBounds: { x: 0, y: 0, width: 162, height: 204 },
    originalRect: { x: 430, y: 90, width: 170, height: 210 },
    trimOffset: { x: 8, y: 6 },
    anchor: { x: 0.5, y: 0.961905 },
    restPose: {
      position: { x: 0.05, y: 2.28 },
      rotationDegrees: 0,
      scale: { x: 1, y: 1 },
      opacity: 1,
    },
    drawOrder: 17,
  };
}

describe("AssetDB SpriteFrame resolution", () => {
  it("maps safe imported paths and uses AssetDB-provided UUIDs", async () => {
    const assetsRoot = resolve("/project/assets");
    const part = fakePart(resolve(assetsRoot, "gameai/red-cap/head.png"));
    const requests: string[] = [];
    globalThis.Editor = {
      Message: {
        async request(_channel: string, _message: string, assetUrl: unknown) {
          requests.push(String(assetUrl));
          return {
            uuid: "image-from-assetdb",
            url: assetUrl,
            type: "cc.ImageAsset",
            subAssets: {
              spriteFrame: {
                uuid: "frame-from-assetdb",
                name: "spriteFrame",
                type: "cc.SpriteFrame",
              },
            },
          };
        },
      },
    } as typeof Editor;

    const result = await resolveSpriteFrameAssets(
      [part],
      assetsRoot,
      "task004-assetdb",
    );
    assert.deepEqual(requests, ["db://assets/gameai/red-cap/head.png"]);
    assert.deepEqual(result, [
      {
        partId: "head",
        assetUrl: "db://assets/gameai/red-cap/head.png",
        imageUuid: "image-from-assetdb",
        spriteFrameUuid: "frame-from-assetdb",
      },
    ]);
  });

  it("rejects an image path outside the Cocos Assets root", () => {
    assert.throws(
      () =>
        assetUrlForPart(
          fakePart(resolve("/outside/head.png")),
          resolve("/project/assets"),
          "task004-outside",
        ),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code === SceneRigDiagnosticCode.SOURCE_ROOT_OUTSIDE_ASSETS,
    );
  });

  it("fails stably when AssetDB has no SpriteFrame subasset", async () => {
    const assetsRoot = resolve("/project/assets");
    globalThis.Editor = {
      Message: {
        async request(_channel: string, _message: string, assetUrl: unknown) {
          return String(assetUrl).endsWith(".png")
            ? { uuid: "image-only", type: "cc.ImageAsset", subAssets: {} }
            : null;
        },
      },
    } as typeof Editor;

    await assert.rejects(
      resolveSpriteFrameAssets(
        [fakePart(resolve(assetsRoot, "head.png"))],
        assetsRoot,
        "task004-no-frame",
      ),
      (error: unknown) =>
        error instanceof SceneRigBuilderError &&
        error.diagnostic.code ===
          SceneRigDiagnosticCode.ASSETDB_SPRITE_FRAME_NOT_FOUND,
    );
  });
});

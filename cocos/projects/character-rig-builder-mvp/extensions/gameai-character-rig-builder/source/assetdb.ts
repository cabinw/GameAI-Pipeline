import { relative, sep } from "node:path";

import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "./diagnostics";
import type {
  ManifestPart,
  SpriteFrameAssetReference,
} from "./types";

interface AssetInfo {
  uuid?: string;
  url?: string;
  type?: string;
  name?: string;
  subAssets?: unknown;
}

function asAssetInfo(value: unknown): AssetInfo | null {
  return typeof value === "object" && value !== null ? (value as AssetInfo) : null;
}

function nestedAssetInfos(value: unknown): AssetInfo[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const info = asAssetInfo(item);
      return info === null ? [] : [info, ...nestedAssetInfos(info.subAssets)];
    });
  }
  const info = asAssetInfo(value);
  if (info === null) return [];
  const ownEntries = Object.values(info).flatMap((item) => {
    const child = asAssetInfo(item);
    return child === null ? [] : [child, ...nestedAssetInfos(child.subAssets)];
  });
  return [...ownEntries, ...nestedAssetInfos(info.subAssets)];
}

function isSpriteFrame(info: AssetInfo): boolean {
  const identity = `${info.type ?? ""} ${info.name ?? ""} ${info.url ?? ""}`.toLowerCase();
  return identity.includes("spriteframe") || identity.includes("sprite-frame");
}

export function assetUrlForPart(
  part: ManifestPart,
  projectAssetsRoot: string,
  correlationId: string,
): string {
  const localPath = relative(projectAssetsRoot, part.resolvedPath);
  if (
    localPath === "" ||
    localPath === ".." ||
    localPath.startsWith(`..${sep}`) ||
    localPath.startsWith("/")
  ) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.SOURCE_ROOT_OUTSIDE_ASSETS,
      message: `Resolved image for ${part.partId} is outside the Cocos assets directory.`,
      stage: "assetdb",
      correlationId,
      partId: part.partId,
      details: { resolvedPath: part.resolvedPath, projectAssetsRoot },
    });
  }
  return `db://assets/${localPath.split(sep).join("/")}`;
}

async function queryAssetInfo(assetUrl: string): Promise<AssetInfo | null> {
  return asAssetInfo(
    await Editor.Message.request("asset-db", "query-asset-info", assetUrl),
  );
}

async function spriteFrameInfo(assetUrl: string, imageInfo: AssetInfo): Promise<AssetInfo | null> {
  const embedded = nestedAssetInfos(imageInfo.subAssets).find(
    (candidate) => candidate.uuid !== undefined && isSpriteFrame(candidate),
  );
  if (embedded !== undefined) return embedded;

  for (const suffix of ["/spriteFrame", "@spriteFrame"]) {
    const candidate = await queryAssetInfo(`${assetUrl}${suffix}`);
    if (candidate?.uuid !== undefined && isSpriteFrame(candidate)) return candidate;
  }
  return null;
}

export async function resolveSpriteFrameAssets(
  parts: readonly ManifestPart[],
  projectAssetsRoot: string,
  correlationId: string,
): Promise<readonly SpriteFrameAssetReference[]> {
  const references: SpriteFrameAssetReference[] = [];
  for (const part of parts) {
    const assetUrl = assetUrlForPart(part, projectAssetsRoot, correlationId);
    const imageInfo = await queryAssetInfo(assetUrl);
    if (imageInfo?.uuid === undefined) {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.ASSETDB_ASSET_NOT_FOUND,
        message: `AssetDB has not imported ${assetUrl}.`,
        stage: "assetdb",
        correlationId,
        partId: part.partId,
        details: { assetUrl },
      });
    }
    const spriteFrame = await spriteFrameInfo(assetUrl, imageInfo);
    if (spriteFrame?.uuid === undefined) {
      throw new SceneRigBuilderError({
        code: SceneRigDiagnosticCode.ASSETDB_SPRITE_FRAME_NOT_FOUND,
        message: `AssetDB returned no SpriteFrame subasset for ${assetUrl}.`,
        stage: "assetdb",
        correlationId,
        partId: part.partId,
        details: { assetUrl, imageUuid: imageInfo.uuid },
      });
    }
    references.push({
      partId: part.partId,
      assetUrl,
      imageUuid: imageInfo.uuid,
      spriteFrameUuid: spriteFrame.uuid,
    });
  }
  return references;
}

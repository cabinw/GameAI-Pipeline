import {
  TASK_013_RESOURCE_MANIFEST_INVALID,
  type ComposableLoadoutResourceManifestEntry,
} from "./composable-character-loadout-controls";

export interface ComposableLoadoutResourceObservation {
  readonly resourcePath: string;
  readonly pngExists: boolean;
  readonly metaExists: boolean;
  readonly assetUuid: string | null;
  readonly spriteFrameName: string | null;
  readonly spriteFrameUuid: string | null;
}

export function composableLoadoutResourcePngPath(
  resourcePath: string,
): string {
  if (
    !resourcePath.endsWith("/spriteFrame") ||
    resourcePath.includes(".png")
  ) {
    throw new Error(
      `${TASK_013_RESOURCE_MANIFEST_INVALID}: ${JSON.stringify({
        reason: "INCORRECT_RESOURCE_SUFFIX",
        resourcePath,
      })}`,
    );
  }
  return `${resourcePath.slice(0, -"/spriteFrame".length)}.png`;
}

export function validateComposableLoadoutResourceObservations(
  manifest: readonly ComposableLoadoutResourceManifestEntry[],
  observations: readonly ComposableLoadoutResourceObservation[],
): void {
  const byPath = new Map(
    observations.map((observation) => [
      observation.resourcePath,
      observation,
    ]),
  );
  const failures: {
    readonly resourcePath: string;
    readonly reason: string;
  }[] = [];
  for (const entry of manifest) {
    composableLoadoutResourcePngPath(entry.resourcePath);
    const observation = byPath.get(entry.resourcePath);
    if (!observation?.pngExists) {
      failures.push({
        resourcePath: entry.resourcePath,
        reason: "MISSING_PNG",
      });
      continue;
    }
    if (!observation.metaExists) {
      failures.push({
        resourcePath: entry.resourcePath,
        reason: "MISSING_META",
      });
      continue;
    }
    if (
      observation.assetUuid === null ||
      observation.spriteFrameName !== "spriteFrame" ||
      observation.spriteFrameUuid === null
    ) {
      failures.push({
        resourcePath: entry.resourcePath,
        reason: "MISSING_SPRITE_FRAME_SUBMETA",
      });
    }
  }
  const duplicateObservationPaths = observations
    .filter(
      (observation, index) =>
        observations.findIndex(
          (candidate) =>
            candidate.resourcePath === observation.resourcePath,
        ) !== index,
    )
    .map((observation) => observation.resourcePath);
  const duplicateAssetUuids = duplicateValues(
    observations.flatMap((observation) =>
      observation.assetUuid === null ? [] : [observation.assetUuid],
    ),
  );
  const duplicateSpriteFrameUuids = duplicateValues(
    observations.flatMap((observation) =>
      observation.spriteFrameUuid === null
        ? []
        : [observation.spriteFrameUuid],
    ),
  );
  if (
    observations.length !== manifest.length ||
    failures.length > 0 ||
    duplicateObservationPaths.length > 0 ||
    duplicateAssetUuids.length > 0 ||
    duplicateSpriteFrameUuids.length > 0
  ) {
    throw new Error(
      `${TASK_013_RESOURCE_MANIFEST_INVALID}: ${JSON.stringify({
        expectedCount: manifest.length,
        observedCount: observations.length,
        failures,
        duplicateObservationPaths,
        duplicateAssetUuids,
        duplicateSpriteFrameUuids,
      })}`,
    );
  }
}

function duplicateValues(values: readonly string[]): readonly string[] {
  return [
    ...new Set(
      values.filter(
        (value, index) => values.findIndex((candidate) => candidate === value) !== index,
      ),
    ),
  ].sort();
}

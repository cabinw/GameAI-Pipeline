import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  parseCharacterContract,
  parseCharacterRig,
  type CharacterContract,
  type RigPart,
  type ValidationIssue,
} from "@gameai/character-contracts";

import {
  AssetDiagnosticCode,
  sortDiagnostics,
  type CharacterAssetDiagnostic,
} from "./diagnostics";
import { inspectImage } from "./image-inspector";
import {
  resolveSafeDocumentPath,
  resolveSafeExistingPath,
  resolveSourceRoot,
  type SafePath,
} from "./safe-path";
import type {
  CharacterAssetDocumentIntakeOptions,
  CharacterAssetIntakeOptions,
  CharacterAssetIntakeResult,
  CharacterAssetManifest,
  CharacterAssetPart,
} from "./types";

async function readTextFile(file: SafePath): Promise<string | CharacterAssetDiagnostic> {
  try {
    return await readFile(file.resolvedPath, "utf8");
  } catch (error) {
    return {
      code: AssetDiagnosticCode.ASSET_FILE_NOT_FOUND,
      stage: "read",
      path: file.sourceRelativePath,
      message: `Asset contract could not be read: ${file.sourceRelativePath}.`,
      details: { cause: error instanceof Error ? error.message : String(error) },
    };
  }
}

function isDiagnostic(value: string | CharacterAssetDiagnostic): value is CharacterAssetDiagnostic {
  return typeof value !== "string";
}

function contractDiagnostic(
  issue: ValidationIssue,
  characterRigPath: string,
  rigLayoutPath: string,
): CharacterAssetDiagnostic {
  const documentPath =
    issue.document === "characterRig"
      ? characterRigPath
      : issue.document === "rigLayout"
        ? rigLayoutPath
        : `${characterRigPath} + ${rigLayoutPath}`;
  return {
    code: issue.code,
    stage: "contract",
    path: `${documentPath}${issue.path}`,
    message: issue.message,
    ...(issue.details === undefined ? {} : { details: issue.details }),
  };
}

function geometryDiagnostics(
  part: RigPart,
  image: Pick<CharacterAssetPart, "width" | "height">,
  manifestPath: string,
): CharacterAssetDiagnostic[] {
  if (image.width > part.originalRect.width || image.height > part.originalRect.height) {
    return [
      {
        code: AssetDiagnosticCode.IMAGE_DIMENSION_MISMATCH,
        stage: "geometry",
        path: manifestPath,
        partId: part.partId,
        message: `Image dimensions ${image.width}x${image.height} exceed originalRect ${part.originalRect.width}x${part.originalRect.height}.`,
        details: {
          image: { width: image.width, height: image.height },
          originalRect: part.originalRect,
        },
      },
    ];
  }

  if (
    part.trimOffset.x + image.width > part.originalRect.width ||
    part.trimOffset.y + image.height > part.originalRect.height
  ) {
    return [
      {
        code: AssetDiagnosticCode.TRIM_RECT_OUT_OF_BOUNDS,
        stage: "geometry",
        path: manifestPath,
        partId: part.partId,
        message: `Trimmed image placed at (${part.trimOffset.x}, ${part.trimOffset.y}) does not fit originalRect.`,
        details: {
          image: { width: image.width, height: image.height },
          trimOffset: part.trimOffset,
          originalRect: part.originalRect,
        },
      },
    ];
  }

  return [];
}

function failure(diagnostics: readonly CharacterAssetDiagnostic[]): CharacterAssetIntakeResult {
  return { ok: false, manifest: null, diagnostics: sortDiagnostics(diagnostics) };
}

async function validateContractAssets(
  sourceRoot: string,
  characterRigPath: SafePath,
  rigLayoutPath: SafePath,
  contract: CharacterContract,
): Promise<CharacterAssetIntakeResult> {
  const diagnostics: CharacterAssetDiagnostic[] = [];
  const parts: CharacterAssetPart[] = [];
  const firstPartByResolvedPath = new Map<string, string>();

  for (const part of contract.rigLayout.parts) {
    const asset = await resolveSafeExistingPath(
      sourceRoot,
      path.dirname(rigLayoutPath.resolvedPath),
      part.file,
      part.partId,
    );
    if (!asset.ok) {
      diagnostics.push(asset.diagnostic);
      continue;
    }

    const firstPartId = firstPartByResolvedPath.get(asset.value.resolvedPath);
    if (firstPartId !== undefined) {
      diagnostics.push({
        code: AssetDiagnosticCode.DUPLICATE_ASSET_REFERENCE,
        stage: "path",
        path: asset.value.sourceRelativePath,
        partId: part.partId,
        message: `Parts ${firstPartId} and ${part.partId} reference the same image file.`,
        details: { firstPartId, duplicatePartId: part.partId },
      });
    } else {
      firstPartByResolvedPath.set(asset.value.resolvedPath, part.partId);
    }

    const inspected = await inspectImage(
      asset.value.resolvedPath,
      asset.value.sourceRelativePath,
      part.partId,
    );
    diagnostics.push(...inspected.diagnostics);
    if (!inspected.ok) {
      continue;
    }

    diagnostics.push(...geometryDiagnostics(part, inspected.value, asset.value.sourceRelativePath));
    parts.push({
      partId: part.partId,
      parentId: part.parentId,
      sourceRelativePath: asset.value.sourceRelativePath,
      resolvedPath: asset.value.resolvedPath,
      ...inspected.value,
      originalRect: { ...part.originalRect },
      trimOffset: { ...part.trimOffset },
      anchor: { ...part.anchor },
      restPose: {
        position: { ...part.restPose.position },
        rotationDegrees: part.restPose.rotationDegrees,
        scale: { ...part.restPose.scale },
        opacity: part.restPose.opacity,
      },
      drawOrder: part.drawOrder,
    });
  }

  if (diagnostics.length > 0) {
    return failure(diagnostics);
  }

  const manifest: CharacterAssetManifest = {
    characterId: contract.characterRig.characterId,
    schemaVersions: {
      characterRig: contract.characterRig.schemaVersion,
      rigLayout: contract.rigLayout.schemaVersion,
    },
    sourceRoot,
    characterRig: { ...characterRigPath },
    rigLayout: { ...rigLayoutPath },
    sourceCanvas: { ...contract.rigLayout.sourceCanvas },
    referenceScale: contract.rigLayout.referenceScale,
    drawOrderPolicy: contract.rigLayout.drawOrderPolicy,
    parts,
    sockets: (contract.rigLayout.sockets ?? []).map((socket) => ({
      ...socket,
      position: { ...socket.position },
    })),
    hitAreas: (contract.rigLayout.hitAreas ?? []).map((hitArea) => ({
      ...hitArea,
      shape: { ...hitArea.shape },
    })),
  };

  return { ok: true, manifest, diagnostics: [] };
}

export async function validateCharacterAssetDocuments(
  options: CharacterAssetDocumentIntakeOptions,
): Promise<CharacterAssetIntakeResult> {
  const root = await resolveSourceRoot(options.sourceRoot);
  if (!root.ok) {
    return failure([root.diagnostic]);
  }
  const sourceRoot = root.value.resolvedPath;
  const characterRigPath = resolveSafeDocumentPath(
    sourceRoot,
    sourceRoot,
    options.characterRigPath ?? "character-rig.json",
  );
  if (!characterRigPath.ok) {
    return failure([characterRigPath.diagnostic]);
  }
  const rigLayoutPath = resolveSafeDocumentPath(
    sourceRoot,
    path.dirname(characterRigPath.value.resolvedPath),
    options.rigLayoutPath ?? options.characterRig.rigLayoutFile,
  );
  if (!rigLayoutPath.ok) {
    return failure([rigLayoutPath.diagnostic]);
  }
  const contract = parseCharacterContract(
    JSON.stringify(options.characterRig),
    JSON.stringify(options.rigLayout),
  );
  if (!contract.ok) {
    return failure(
      contract.errors.map((issue) =>
        contractDiagnostic(
          issue,
          characterRigPath.value.sourceRelativePath,
          rigLayoutPath.value.sourceRelativePath,
        ),
      ),
    );
  }
  return validateContractAssets(
    sourceRoot,
    characterRigPath.value,
    rigLayoutPath.value,
    contract.value,
  );
}

export async function intakeCharacterAssets(
  options: CharacterAssetIntakeOptions,
): Promise<CharacterAssetIntakeResult> {
  const root = await resolveSourceRoot(options.sourceRoot);
  if (!root.ok) {
    return failure([root.diagnostic]);
  }
  const sourceRoot = root.value.resolvedPath;

  const characterRig = await resolveSafeExistingPath(
    sourceRoot,
    sourceRoot,
    options.characterRigFile ?? "character-rig.json",
  );
  if (!characterRig.ok) {
    return failure([characterRig.diagnostic]);
  }
  const characterRigText = await readTextFile(characterRig.value);
  if (isDiagnostic(characterRigText)) {
    return failure([characterRigText]);
  }

  const parsedRig = parseCharacterRig(characterRigText);
  if (!parsedRig.ok) {
    return failure(
      parsedRig.errors.map((issue) =>
        contractDiagnostic(issue, characterRig.value.sourceRelativePath, "rig-layout.json"),
      ),
    );
  }

  const rigLayout = await resolveSafeExistingPath(
    sourceRoot,
    path.dirname(characterRig.value.resolvedPath),
    parsedRig.value.rigLayoutFile,
  );
  if (!rigLayout.ok) {
    return failure([rigLayout.diagnostic]);
  }
  const rigLayoutText = await readTextFile(rigLayout.value);
  if (isDiagnostic(rigLayoutText)) {
    return failure([rigLayoutText]);
  }

  const contract = parseCharacterContract(characterRigText, rigLayoutText);
  if (!contract.ok) {
    return failure(
      contract.errors.map((issue) =>
        contractDiagnostic(
          issue,
          characterRig.value.sourceRelativePath,
          rigLayout.value.sourceRelativePath,
        ),
      ),
    );
  }

  return validateContractAssets(
    sourceRoot,
    characterRig.value,
    rigLayout.value,
    contract.value,
  );
}

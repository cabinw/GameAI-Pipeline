import { realpath } from "node:fs/promises";
import path from "node:path";

import { AssetDiagnosticCode, type CharacterAssetDiagnostic } from "./diagnostics";

export interface SafePath {
  sourceRelativePath: string;
  resolvedPath: string;
}

type SafePathResult =
  | { ok: true; value: SafePath }
  | { ok: false; diagnostic: CharacterAssetDiagnostic };

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function portableRelative(root: string, candidate: string): string {
  return path.relative(root, candidate).split(path.sep).join("/");
}

export async function resolveSourceRoot(sourceRoot: string): Promise<SafePathResult> {
  const requestedRoot = path.resolve(sourceRoot);
  try {
    const resolvedPath = await realpath(requestedRoot);
    return { ok: true, value: { resolvedPath, sourceRelativePath: "." } };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code: AssetDiagnosticCode.ASSET_FILE_NOT_FOUND,
        stage: "path",
        path: requestedRoot,
        message: `Source root does not exist or cannot be resolved: ${requestedRoot}.`,
        details: { cause: error instanceof Error ? error.message : String(error) },
      },
    };
  }
}

export async function resolveSafeExistingPath(
  sourceRoot: string,
  baseDirectory: string,
  authoredPath: string,
  partId?: string,
): Promise<SafePathResult> {
  const lexicalPath = path.resolve(baseDirectory, authoredPath);
  if (!isWithin(sourceRoot, lexicalPath)) {
    return {
      ok: false,
      diagnostic: {
        code: AssetDiagnosticCode.ASSET_PATH_OUTSIDE_ROOT,
        stage: "path",
        path: authoredPath,
        message: `Asset path resolves outside source root: ${authoredPath}.`,
        ...(partId === undefined ? {} : { partId }),
        details: { sourceRoot, lexicalPath },
      },
    };
  }

  let resolvedPath: string;
  try {
    resolvedPath = await realpath(lexicalPath);
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code: AssetDiagnosticCode.ASSET_FILE_NOT_FOUND,
        stage: "path",
        path: portableRelative(sourceRoot, lexicalPath),
        message: `Asset file was not found: ${authoredPath}.`,
        ...(partId === undefined ? {} : { partId }),
        details: { cause: error instanceof Error ? error.message : String(error) },
      },
    };
  }

  if (!isWithin(sourceRoot, resolvedPath)) {
    return {
      ok: false,
      diagnostic: {
        code: AssetDiagnosticCode.ASSET_PATH_OUTSIDE_ROOT,
        stage: "path",
        path: portableRelative(sourceRoot, lexicalPath),
        message: `Asset path follows a filesystem link outside source root: ${authoredPath}.`,
        ...(partId === undefined ? {} : { partId }),
        details: { sourceRoot, resolvedPath },
      },
    };
  }

  return {
    ok: true,
    value: {
      resolvedPath,
      sourceRelativePath: portableRelative(sourceRoot, resolvedPath),
    },
  };
}

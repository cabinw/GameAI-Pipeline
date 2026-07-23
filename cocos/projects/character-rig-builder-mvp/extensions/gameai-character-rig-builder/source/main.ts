import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { parseCharacterRig } from "@gameai/character-contracts";
import {
  generateRigLayout,
  maleNormalV1,
} from "@gameai/rig-layout-generator";
import {
  normalizeRigAnimation,
  parseRigAnimation,
} from "@gameai/rig-animation";

import { resolveJsonAsset, resolveSpriteFrameAssets } from "./assetdb";
import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "./diagnostics";
import { executeCharacterRigBuild } from "./orchestrator";
import { buildCocosSceneRigPlan } from "./scene-plan";
import { auditSourceAssetMap } from "./source-asset-map";
import type {
  BuildCharacterRigRequest,
  CharacterRigBuilderEvidence,
  PreparedSceneRig,
  SceneBuildResult,
} from "./types";

const EXTENSION_NAME = "gameai-character-rig-builder";

function inside(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return local === "" || (local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local));
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function sourceRootForRequest(request: BuildCharacterRigRequest): string {
  const candidate = isAbsolute(request.sourceRoot)
    ? resolve(request.sourceRoot)
    : resolve(Editor.Project.path, request.sourceRoot);
  const assetsRoot = resolve(Editor.Project.path, "assets");
  if (!inside(assetsRoot, candidate)) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.SOURCE_ROOT_OUTSIDE_ASSETS,
      message: `Source root must be inside ${assetsRoot}.`,
      stage: "main",
      correlationId: request.correlationId,
      details: { sourceRoot: candidate },
    });
  }
  return candidate;
}

async function prepareSceneRig(
  request: BuildCharacterRigRequest,
): Promise<PreparedSceneRig> {
  const sourceRoot = sourceRootForRequest(request);
  const characterRigPath = resolve(sourceRoot, request.characterRigFile);
  const annotationPath = resolve(sourceRoot, request.sourceAnnotationFile);
  const animationPresetPath = resolve(sourceRoot, request.animationPresetFile);
  if (
    !inside(sourceRoot, characterRigPath) ||
    !inside(sourceRoot, annotationPath) ||
    !inside(sourceRoot, animationPresetPath)
  ) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.SOURCE_ROOT_OUTSIDE_ASSETS,
      message: "Input documents must remain inside the selected source root.",
      stage: "main",
      correlationId: request.correlationId,
    });
  }

  let characterRigDocument: unknown;
  let annotationDocument: unknown;
  let animationPresetDocument: unknown;
  try {
    [characterRigDocument, annotationDocument, animationPresetDocument] = await Promise.all([
      readJson(characterRigPath),
      readJson(annotationPath),
      readJson(animationPresetPath),
    ]);
  } catch (error) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.CHARACTER_RIG_INVALID,
      message: error instanceof Error ? error.message : String(error),
      stage: "main",
      correlationId: request.correlationId,
    });
  }

  await auditSourceAssetMap({
    sourceRoot,
    mappingFile: request.assetMappingFile,
    annotation: annotationDocument,
    correlationId: request.correlationId,
  });

  const parsedRig = parseCharacterRig(JSON.stringify(characterRigDocument));
  if (!parsedRig.ok) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.CHARACTER_RIG_INVALID,
      message: "Character Rig failed contract parsing and semantic validation.",
      stage: "main",
      correlationId: request.correlationId,
      details: { issues: parsedRig.errors },
    });
  }

  const generation = await generateRigLayout({
    annotation: annotationDocument,
    template: maleNormalV1,
    characterRig: parsedRig.value,
    sourceRoot,
    characterRigPath,
    rigLayoutPath: resolve(sourceRoot, parsedRig.value.rigLayoutFile),
  });
  if (!generation.ok) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.RIG_LAYOUT_GENERATION_FAILED,
      message: "Rig Layout generation or downstream asset validation failed.",
      stage: "main",
      correlationId: request.correlationId,
      details: { diagnostics: generation.diagnostics },
    });
  }

  const parsedAnimation = parseRigAnimation(
    JSON.stringify(animationPresetDocument),
    {
      rigId: generation.rigLayout.layoutId,
      rigSchemaVersion: generation.rigLayout.schemaVersion,
      jointIds: new Set(generation.manifest.parts.map((part) => part.partId)),
    },
  );
  if (!parsedAnimation.ok) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.ANIMATION_PRESET_INVALID,
      message: "Rig Animation failed contract parsing or semantic validation.",
      stage: "main",
      correlationId: request.correlationId,
      details: { issues: parsedAnimation.errors },
    });
  }

  const assetReferences = await resolveSpriteFrameAssets(
    generation.manifest.parts,
    resolve(Editor.Project.path, "assets"),
    request.correlationId,
  );
  const projectAssetsRoot = resolve(Editor.Project.path, "assets");
  const animationAssetLocalPath = relative(projectAssetsRoot, animationPresetPath);
  const animationAsset = await resolveJsonAsset(
    `db://assets/${animationAssetLocalPath.split(sep).join("/")}`,
    request.correlationId,
  );
  const plan = buildCocosSceneRigPlan({
    correlationId: request.correlationId,
    manifest: generation.manifest,
    assetReferences,
    animation: {
      componentClassName: "GameAIRigAnimationPlayer",
      presetAssetUrl: animationAsset.assetUrl,
      presetAssetUuid: animationAsset.assetUuid,
      normalizedAnimation: normalizeRigAnimation(parsedAnimation.value),
      autoplay: request.autoplayAnimation,
    },
  });
  return {
    plan,
    manifest: generation.manifest,
    assetReferences,
    validationWarnings: generation.diagnostics
      .filter((item) => item.severity === "warning")
      .map((item) => ({ code: item.code, message: item.message })),
  };
}

async function requestScene(prepared: PreparedSceneRig): Promise<SceneBuildResult> {
  return (await Editor.Message.request("scene", "execute-scene-script", {
    name: EXTENSION_NAME,
    method: "buildRig",
    args: [prepared.plan],
  })) as SceneBuildResult;
}

async function writeEvidence(evidence: CharacterRigBuilderEvidence): Promise<void> {
  const evidencePath = join(
    Editor.Project.path,
    "temp",
    EXTENSION_NAME,
    "evidence.json",
  );
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.info(`[${EXTENSION_NAME}] evidence written to ${evidencePath}`);
}

export const methods = {
  async openPanel(): Promise<void> {
    await Editor.Panel.open(EXTENSION_NAME);
  },

  async buildCharacterRig(
    request: BuildCharacterRigRequest,
  ): Promise<CharacterRigBuilderEvidence> {
    return executeCharacterRigBuild(request, {
      creatorVersion: Editor.App.version,
      now: () => new Date().toISOString(),
      prepareSceneRig,
      requestScene,
      writeEvidence,
    });
  },
};

export async function load(): Promise<void> {
  console.info(`[${EXTENSION_NAME}] main process loaded`);
  await Editor.Panel.open(EXTENSION_NAME);
}

export function unload(): void {}

import { createHash } from "node:crypto";

import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "./diagnostics";
import type {
  BuildCharacterRigRequest,
  CharacterRigBuilderEvidence,
  PreparedSceneRig,
  SceneBuildResult,
} from "./types";

export interface RigBuilderDependencies {
  creatorVersion: string;
  now(): string;
  prepareSceneRig(request: BuildCharacterRigRequest): Promise<PreparedSceneRig>;
  requestScene(prepared: PreparedSceneRig): Promise<SceneBuildResult>;
  writeEvidence(evidence: CharacterRigBuilderEvidence): Promise<void>;
}

export function digestScenePlan(plan: PreparedSceneRig["plan"]): string {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

export async function executeCharacterRigBuild(
  request: BuildCharacterRigRequest,
  dependencies: RigBuilderDependencies,
): Promise<CharacterRigBuilderEvidence> {
  if (
    request.correlationId.trim().length === 0 ||
    request.sourceRoot.trim().length === 0 ||
    request.characterRigFile.trim().length === 0 ||
    request.sourceAnnotationFile.trim().length === 0 ||
    request.assetMappingFile.trim().length === 0
  ) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.INVALID_BUILD_REQUEST,
      message: "correlationId and all input paths, including assetMappingFile, are required.",
      stage: "main",
      correlationId: request.correlationId,
    });
  }

  const mainReceivedAt = dependencies.now();
  const prepared = await dependencies.prepareSceneRig(request);
  const validationCompletedAt = dependencies.now();
  const assetDbCompletedAt = dependencies.now();
  const sceneResult = await dependencies.requestScene(prepared);
  const sceneCompletedAt = dependencies.now();

  if (sceneResult.correlationId !== request.correlationId) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.SCENE_CORRELATION_MISMATCH,
      message: `Expected ${request.correlationId}, received ${sceneResult.correlationId}.`,
      stage: "scene",
      correlationId: request.correlationId,
      details: { receivedCorrelationId: sceneResult.correlationId },
    });
  }
  if (!sceneResult.ok) {
    throw new SceneRigBuilderError(sceneResult.diagnostic);
  }

  const evidence: CharacterRigBuilderEvidence = {
    status: "passed",
    correlationId: request.correlationId,
    creatorVersion: dependencies.creatorVersion,
    stages: ["panel", "main-validation", "assetdb", "scene", "verification"],
    panelStartedAt: request.panelStartedAt,
    mainReceivedAt,
    validationCompletedAt,
    assetDbCompletedAt,
    sceneCompletedAt,
    completedAt: dependencies.now(),
    sourceRoot: prepared.manifest.sourceRoot,
    characterId: prepared.manifest.characterId,
    schemaVersions: { ...prepared.manifest.schemaVersions },
    manifestPartCount: prepared.manifest.parts.length,
    assetReferenceCount: prepared.assetReferences.length,
    sceneResult,
    planDigest: digestScenePlan(prepared.plan),
  };
  await dependencies.writeEvidence(evidence);
  return evidence;
}

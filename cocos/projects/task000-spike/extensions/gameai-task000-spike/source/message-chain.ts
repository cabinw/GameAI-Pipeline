export interface SpikeRequest {
  correlationId: string;
  panelStartedAt: string;
}

export interface SceneResult {
  stage: "scene";
  correlationId: string;
  sceneName: string | null;
  sceneUuid: string | null;
}

export interface SpikeEvidence {
  status: "passed";
  correlationId: string;
  creatorVersion: string;
  stages: readonly ["panel", "main", "scene"];
  panelStartedAt: string;
  mainReceivedAt: string;
  sceneResult: SceneResult;
  completedAt: string;
}

export interface MessageChainDependencies {
  creatorVersion: string;
  now(): string;
  requestScene(correlationId: string): Promise<SceneResult>;
  writeEvidence(evidence: SpikeEvidence): Promise<void>;
}

export async function executeMessageChain(
  request: SpikeRequest,
  dependencies: MessageChainDependencies,
): Promise<SpikeEvidence> {
  if (!request.correlationId.trim()) {
    throw new Error("A non-empty correlationId is required.");
  }

  const mainReceivedAt = dependencies.now();
  const sceneResult = await dependencies.requestScene(request.correlationId);

  if (sceneResult.correlationId !== request.correlationId) {
    throw new Error(
      `Scene Script correlation mismatch: expected ${request.correlationId}, received ${sceneResult.correlationId}.`,
    );
  }

  const evidence: SpikeEvidence = {
    status: "passed",
    correlationId: request.correlationId,
    creatorVersion: dependencies.creatorVersion,
    stages: ["panel", "main", "scene"],
    panelStartedAt: request.panelStartedAt,
    mainReceivedAt,
    sceneResult,
    completedAt: dependencies.now(),
  };

  await dependencies.writeEvidence(evidence);
  return evidence;
}

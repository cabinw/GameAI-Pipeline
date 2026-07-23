import type {
  CharacterAssetManifest,
  CharacterAssetPart,
} from "@gameai/character-asset-intake";

import type { SceneRigDiagnostic } from "./diagnostics";

export interface BuildCharacterRigRequest {
  correlationId: string;
  panelStartedAt: string;
  sourceRoot: string;
  characterRigFile: string;
  sourceAnnotationFile: string;
}

export interface SpriteFrameAssetReference {
  partId: string;
  assetUrl: string;
  imageUuid: string;
  spriteFrameUuid: string;
}

export interface CocosScenePartPlan {
  partId: string;
  parentId: string | null;
  jointName: string;
  visualName: string;
  jointPosition: { x: number; y: number };
  jointRotationDegrees: number;
  jointScale: { x: number; y: number };
  visualOffset: { x: number; y: number };
  visualSize: { width: number; height: number };
  visualAnchor: { x: 0.5; y: 0.5 };
  opacity: number;
  sourceDrawOrder: number;
  sortingOrder: number;
  spriteFrameUuid: string;
  assetUrl: string;
}

export interface CocosSceneRigPlan {
  planVersion: "1.0.0";
  correlationId: string;
  characterId: string;
  characterRootName: string;
  rigRootName: "RigRoot";
  generatedMarkerName: "__GameAI_Generated__";
  schemaVersions: CharacterAssetManifest["schemaVersions"];
  referenceScale: number;
  parts: readonly CocosScenePartPlan[];
  sockets: CharacterAssetManifest["sockets"];
  hitAreas: CharacterAssetManifest["hitAreas"];
}

export interface PreparedSceneRig {
  plan: CocosSceneRigPlan;
  manifest: CharacterAssetManifest;
  assetReferences: readonly SpriteFrameAssetReference[];
  validationWarnings: readonly {
    code: string;
    message: string;
  }[];
}

export interface SceneBuildSuccess {
  ok: true;
  stage: "scene";
  correlationId: string;
  sceneName: string;
  sceneUuid: string;
  characterRootName: string;
  replacement: "created" | "replaced";
  partCount: number;
  jointCount: number;
  visualCount: number;
  socketCount: number;
  unrelatedRootCountBefore: number;
  unrelatedRootCountAfter: number;
  verifiedPartIds: readonly string[];
  sortingOrders: readonly number[];
}

export interface SceneBuildFailure {
  ok: false;
  stage: "scene";
  correlationId: string;
  diagnostic: SceneRigDiagnostic;
}

export type SceneBuildResult = SceneBuildSuccess | SceneBuildFailure;

export interface CharacterRigBuilderEvidence {
  status: "passed";
  correlationId: string;
  creatorVersion: string;
  stages: readonly ["panel", "main-validation", "assetdb", "scene", "verification"];
  panelStartedAt: string;
  mainReceivedAt: string;
  validationCompletedAt: string;
  assetDbCompletedAt: string;
  sceneCompletedAt: string;
  completedAt: string;
  sourceRoot: string;
  characterId: string;
  schemaVersions: CharacterAssetManifest["schemaVersions"];
  manifestPartCount: number;
  assetReferenceCount: number;
  sceneResult: SceneBuildSuccess;
  planDigest: string;
}

export interface ScenePlanInput {
  correlationId: string;
  manifest: CharacterAssetManifest;
  assetReferences: readonly SpriteFrameAssetReference[];
}

export type ManifestPart = CharacterAssetPart;

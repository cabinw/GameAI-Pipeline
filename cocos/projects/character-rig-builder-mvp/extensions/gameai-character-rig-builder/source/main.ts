import { readFile, mkdir, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
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
import {
  validateAnimationReviewAdapterRequest,
  validateAnimationReviewAdapterResponse,
  type AnimationReviewAdapterRequest,
  type AnimationReviewAdapterResponse,
} from "@gameai/animation-review-core";

import { resolveJsonAsset, resolveSpriteFrameAssets } from "./assetdb";
import {
  animationReviewFailure,
} from "./animation-review/cocos-review-adapter";
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
const REVIEW_SERVICE_HOST = "127.0.0.1";
const REVIEW_SERVICE_PORT = 41715;
const sceneReviewResponses = new Map<
  string,
  { readonly fingerprint: string; readonly response: AnimationReviewAdapterResponse }
>();

async function localReviewServiceRequest(
  method: "GET" | "POST",
  path: string,
  value?: unknown,
): Promise<unknown> {
  const bootstrap = await new Promise<{ mutationToken: string }>((resolvePromise, reject) => {
    const request = httpRequest(
      {
        host: REVIEW_SERVICE_HOST,
        port: REVIEW_SERVICE_PORT,
        method: "GET",
        path: "/api/bootstrap",
        headers: { accept: "application/json" },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          try {
            resolvePromise(JSON.parse(Buffer.concat(chunks).toString("utf8")) as { mutationToken: string });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(2_000, () => request.destroy(new Error("Animation Review service bootstrap timed out.")));
    request.on("error", reject);
    request.end();
  });
  const body = value === undefined ? undefined : JSON.stringify(value);
  return new Promise((resolvePromise, reject) => {
    const request = httpRequest(
      {
        host: REVIEW_SERVICE_HOST,
        port: REVIEW_SERVICE_PORT,
        method,
        path,
        headers: {
          accept: "application/json",
          ...(body === undefined
            ? {}
            : {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(body),
                "x-animation-review-token": bootstrap.mutationToken,
              }),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try {
            const parsed = JSON.parse(text) as unknown;
            if ((response.statusCode ?? 500) >= 400) {
              reject(new Error(`Animation Review service ${response.statusCode}: ${text}`));
            } else {
              resolvePromise(parsed);
            }
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(3_000, () => request.destroy(new Error("Animation Review service request timed out.")));
    request.on("error", reject);
    request.end(body);
  });
}

async function requestAnimationReviewScene(
  value: unknown,
): Promise<AnimationReviewAdapterResponse> {
  const parsed = validateAnimationReviewAdapterRequest(value);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0];
    return animationReviewFailure(
      value,
      diagnostic?.code ?? "ADAPTER_SCHEMA_VALIDATION_ERROR",
      diagnostic?.message ?? "Animation review request is invalid.",
    );
  }
  const fingerprint = JSON.stringify(parsed.value);
  const prior = sceneReviewResponses.get(parsed.value.requestId);
  if (prior !== undefined) {
    return prior.fingerprint === fingerprint
      ? prior.response
      : animationReviewFailure(
          parsed.value,
          "COCOS_REVIEW_DUPLICATE_REQUEST_ID",
          "A requestId cannot be reused with different content.",
        );
  }
  try {
    const response = (await Editor.Message.request(
      "scene",
      "execute-scene-script",
      {
        name: EXTENSION_NAME,
        method: "reviewAnimation",
        args: [parsed.value],
      },
    )) as AnimationReviewAdapterResponse;
    const validated = validateAnimationReviewAdapterResponse(response);
    if (!validated.ok) {
      const diagnostic = validated.diagnostics[0];
      const failed = animationReviewFailure(
        parsed.value,
        diagnostic?.code ?? "ADAPTER_SCHEMA_VALIDATION_ERROR",
        diagnostic?.message ?? "Scene adapter response is invalid.",
      );
      sceneReviewResponses.set(parsed.value.requestId, { fingerprint, response: failed });
      return failed;
    }
    if (
      validated.value.requestId !== parsed.value.requestId ||
      validated.value.adapterId !== parsed.value.adapterId ||
      validated.value.protocolVersion !== parsed.value.protocolVersion
    ) {
      const failed = animationReviewFailure(
        parsed.value,
        "COCOS_REVIEW_RESPONSE_CORRELATION_FAILED",
        "Scene adapter response identity did not match the request.",
      );
      sceneReviewResponses.set(parsed.value.requestId, { fingerprint, response: failed });
      return failed;
    }
    if (sceneReviewResponses.size >= 1_024) {
      const oldest = sceneReviewResponses.keys().next().value as string | undefined;
      if (oldest !== undefined) sceneReviewResponses.delete(oldest);
    }
    sceneReviewResponses.set(parsed.value.requestId, {
      fingerprint,
      response: validated.value,
    });
    return validated.value;
  } catch (error) {
    const failed = animationReviewFailure(
      parsed.value,
      "COCOS_REVIEW_SCENE_BRIDGE_FAILED",
      error instanceof Error ? error.message : String(error),
    );
    sceneReviewResponses.set(parsed.value.requestId, { fingerprint, response: failed });
    return failed;
  }
}

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

  async openAnimationReviewPanel(): Promise<void> {
    await Editor.Panel.open(`${EXTENSION_NAME}.animation-review`);
  },

  async reviewAnimation(value: unknown): Promise<AnimationReviewAdapterResponse> {
    return requestAnimationReviewScene(value);
  },

  async reviewWorkspace(): Promise<unknown> {
    return localReviewServiceRequest("GET", "/api/workspace");
  },

  async reviewWorkspaceAction(
    action: string,
    value: unknown,
  ): Promise<unknown> {
    if (!/^[a-z-]{1,40}$/.test(action)) {
      throw new Error("Animation Review action is invalid.");
    }
    return localReviewServiceRequest("POST", `/api/review/${action}`, value);
  },

  async saveAnimationReviewSession(): Promise<unknown> {
    return localReviewServiceRequest("POST", "/api/session/save", {});
  },

  async syncAnimationReviewAdapter(value: unknown): Promise<unknown> {
    const parsed = validateAnimationReviewAdapterRequest(value);
    if (!parsed.ok) {
      throw new Error(
        parsed.diagnostics[0]?.message ??
          "Animation Review adapter sync request is invalid.",
      );
    }
    if (
      parsed.value.command === "describe" ||
      parsed.value.command === "observe-playback"
    ) {
      throw new Error(
        `Animation Review command ${parsed.value.command} is not a sync mutation.`,
      );
    }
    const workspace = (await localReviewServiceRequest(
      "GET",
      "/api/workspace",
    )) as {
      snapshot: { adapterId: string; adapterRevision: number };
    };
    return localReviewServiceRequest("POST", "/api/adapter", {
      kind: "request",
      protocolVersion: "1.0.0",
      requestId: `cocos-adapter-sync-${Date.now()}-${parsed.value.requestId}`,
      adapterId: workspace.snapshot.adapterId,
      command: parsed.value.command,
      expectedRevision: workspace.snapshot.adapterRevision,
      payload: parsed.value.payload,
    } satisfies AnimationReviewAdapterRequest);
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

export function unload(): void {
  sceneReviewResponses.clear();
}

import {
  ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
  validateAnimationReviewAdapterRequest,
  type AnimationReviewAdapterRequest,
  type AnimationReviewAdapterResponse,
  type AnimationReviewAdapterSnapshot,
} from "@gameai/animation-review-core";

export const COCOS_RED_CAP_REVIEW_ADAPTER_ID =
  "cocos-red-cap-production-motion" as const;

export interface CocosAnimationReviewRuntime {
  readonly animationReviewAdapterId: string;
  animationReviewExecute(
    request: AnimationReviewAdapterRequest,
  ): AnimationReviewAdapterSnapshot;
  animationReviewSnapshot?(): AnimationReviewAdapterSnapshot;
  rebuild?(): void;
}

interface RuntimeFailure {
  readonly code?: unknown;
  readonly message?: unknown;
}

function identity(
  value: unknown,
  key: "requestId" | "adapterId",
  fallback: string,
): string {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return fallback;
  }
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : fallback;
}

export function animationReviewFailure(
  value: unknown,
  code: string,
  message: string,
): AnimationReviewAdapterResponse {
  return {
    kind: "response",
    protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
    requestId: identity(value, "requestId", "invalid-request"),
    adapterId: identity(value, "adapterId", COCOS_RED_CAP_REVIEW_ADAPTER_ID),
    ok: false,
    responseType: "error",
    error: { code, message },
  };
}

function runtimeFailure(error: unknown): {
  readonly code: string;
  readonly message: string;
} {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as RuntimeFailure)
      : undefined;
  return {
    code:
      typeof candidate?.code === "string"
        ? candidate.code
        : "COCOS_REVIEW_RUNTIME_COMMAND_FAILED",
    message:
      typeof candidate?.message === "string"
        ? candidate.message
        : error instanceof Error
          ? error.message
          : String(error),
  };
}

function normalizeLoopPlayback(
  snapshot: AnimationReviewAdapterSnapshot,
): AnimationReviewAdapterSnapshot {
  const { duration, loop, time } = snapshot.playback;
  if (
    !loop ||
    !Number.isFinite(time) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    time < duration
  ) {
    return snapshot;
  }
  return {
    ...snapshot,
    playback: {
      ...snapshot.playback,
      time: time % duration,
    },
  };
}

export function executeCocosAnimationReviewRequest(
  value: unknown,
  runtimes: readonly CocosAnimationReviewRuntime[],
): AnimationReviewAdapterResponse {
  const parsed = validateAnimationReviewAdapterRequest(value);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0];
    return animationReviewFailure(
      value,
      diagnostic?.code ?? "ADAPTER_SCHEMA_VALIDATION_ERROR",
      diagnostic?.message ?? "Animation review request is invalid.",
    );
  }

  const request = parsed.value;
  const matches = runtimes.filter(
    (runtime) => runtime.animationReviewAdapterId === request.adapterId,
  );
  if (matches.length === 0) {
    return animationReviewFailure(
      request,
      "COCOS_REVIEW_RUNTIME_NOT_FOUND",
      `No active runtime exposes adapter ${request.adapterId}.`,
    );
  }
  if (matches.length > 1) {
    return animationReviewFailure(
      request,
      "COCOS_REVIEW_RUNTIME_AMBIGUOUS",
      `Multiple active runtimes expose adapter ${request.adapterId}.`,
    );
  }

  try {
    const runtime = matches[0]!;
    if (
      runtime.rebuild !== undefined &&
      runtime.animationReviewSnapshot !== undefined &&
      runtime.animationReviewSnapshot().runtimeDiagnostics.runtimeRoots === 0
    ) {
      runtime.rebuild();
    }
    const runtimeSnapshot =
      request.command === "observe-playback" &&
      runtime.animationReviewSnapshot !== undefined
        ? runtime.animationReviewSnapshot()
        : runtime.animationReviewExecute(request);
    const snapshot = normalizeLoopPlayback(runtimeSnapshot);
    if (
      snapshot.adapterId !== request.adapterId ||
      snapshot.adapterRevision < 0
    ) {
      return animationReviewFailure(
        request,
        "COCOS_REVIEW_SNAPSHOT_INVALID",
        "Runtime returned an invalid adapter identity or revision.",
      );
    }
    return request.command === "observe-playback"
      ? {
          kind: "response",
          protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "playback",
          adapterRevision: snapshot.adapterRevision,
          playback: snapshot.playback,
          runtimeDiagnostics: snapshot.runtimeDiagnostics,
        }
      : {
          kind: "response",
          protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot,
        };
  } catch (error) {
    const failure = runtimeFailure(error);
    return animationReviewFailure(request, failure.code, failure.message);
  }
}

export function isCocosAnimationReviewRuntime(
  value: unknown,
): value is CocosAnimationReviewRuntime {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { animationReviewAdapterId?: unknown })
      .animationReviewAdapterId === "string" &&
    typeof (value as { animationReviewExecute?: unknown })
      .animationReviewExecute === "function"
  );
}

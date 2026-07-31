import type {
  NormalizedAnimationKeyframe,
  NormalizedAnimationTrack,
  NormalizedRigAnimation,
} from "@gameai/rig-animation";

import { analyzeRigAnimation } from "./analyzer";
import { AnimationReviewError } from "./diagnostics";
import {
  appendAnimationReviewProviderProposal,
  createDeterministicAnimationAssistantProposal,
} from "./provider";
import {
  createAnimationReviewDocument,
  decideAnimationReviewFinding,
} from "./review";
import {
  validateAnimationReviewPatch,
  validateAnimationReviewSession,
} from "./session-parser";
import {
  ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION,
  ANIMATION_REVIEW_PATCH_SCHEMA_VERSION,
  ANIMATION_REVIEW_SESSION_LIMITS,
  ANIMATION_REVIEW_SESSION_SCHEMA_VERSION,
  ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION,
  type AnimationReviewDiagnosis,
  type AnimationReviewEditableState,
  type AnimationReviewHumanRuleDecisionInput,
  type AnimationReviewHumanFindingInput,
  type AnimationReviewHumanRuleCreateInput,
  type AnimationReviewPatchActionInput,
  type AnimationReviewPatchDecisionInput,
  type AnimationReviewPatchDocument,
  type AnimationReviewPatchEditInput,
  type AnimationReviewPatchOperation,
  type AnimationReviewPresentationPart,
  type AnimationReviewRevisionInput,
  type AnimationReviewSessionDocument,
  type AnimationReviewValidationResult,
  type CreateAnimationReviewSessionInput,
} from "./session-types";
import type {
  AnimationReviewDocument,
  AnimationReviewFinding,
  ReviewDecisionInput,
} from "./types";

const SUGGESTION_PATH = /^\/tracks\/([0-9]+)\/keyframes\/([0-9]+)\/value$/;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fail(
  code:
    | "SESSION_REVISION_INVALID"
    | "SESSION_BUDGET_EXCEEDED"
    | "PATCH_DUPLICATE_ID"
    | "PATCH_STATUS_TRANSITION_INVALID"
    | "PATCH_TARGET_INVALID"
    | "PATCH_PREVIEW_REQUIRED"
    | "PATCH_HISTORY_INVALID"
    | "VALIDATION_TRANSITION_INVALID"
    | "REVIEW_UNKNOWN_FINDING_REFERENCE",
  message: string,
  path?: string,
): never {
  throw new AnimationReviewError(code, message, path);
}

function assertRevision(
  session: AnimationReviewSessionDocument,
  expectedRevision: number,
): void {
  if (expectedRevision !== session.revision) {
    fail(
      "SESSION_REVISION_INVALID",
      `Expected Session revision ${expectedRevision}, current revision is ${session.revision}.`,
      "/expectedRevision",
    );
  }
}

function assertBudget(session: AnimationReviewSessionDocument): void {
  if (
    session.patches.length > ANIMATION_REVIEW_SESSION_LIMITS.maxPatches ||
    session.history.length >
      ANIMATION_REVIEW_SESSION_LIMITS.maxHistoryEntries ||
    session.auditTrail.length >
      ANIMATION_REVIEW_SESSION_LIMITS.maxAuditEntries ||
    session.validation.length >
      ANIMATION_REVIEW_SESSION_LIMITS.maxValidationResults ||
    session.diagnoses.length >
      ANIMATION_REVIEW_SESSION_LIMITS.maxDiagnoses ||
    JSON.stringify(session).length >
      ANIMATION_REVIEW_SESSION_LIMITS.maxSerializedCharacters
  ) {
    fail(
      "SESSION_BUDGET_EXCEEDED",
      "Session mutation would exceed a configured aggregate budget.",
    );
  }
}

function finish(session: AnimationReviewSessionDocument): AnimationReviewSessionDocument {
  assertBudget(session);
  const parsed = validateAnimationReviewSession(session);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0]!;
    throw new AnimationReviewError(
      diagnostic.code,
      diagnostic.message,
      diagnostic.path,
    );
  }
  return deepFreeze(session);
}

function editableState(
  animation: NormalizedRigAnimation,
  parts: readonly { readonly partId: string; readonly drawOrder: number }[],
): AnimationReviewEditableState {
  return deepFreeze({
    animation: clone(animation),
    parts: parts
      .map(
        (part): AnimationReviewPresentationPart => ({
          partId: part.partId,
          pivotOffset: { x: 0, y: 0 },
          drawOrder: part.drawOrder,
        }),
      )
      .sort((left, right) => left.partId.localeCompare(right.partId)),
  });
}

function validationFromReview(
  review: AnimationReviewDocument,
  previous: readonly AnimationReviewValidationResult[] = [],
): readonly AnimationReviewValidationResult[] {
  const automatic = review.checklist.map(
    (item): AnimationReviewValidationResult => ({
      schemaVersion: ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION,
      ruleId: `automatic-${item.checkId}`,
      ruleKind: "automatic",
      status: item.status === "passed" ? "passed" : "unresolved",
      details: item.details,
      relatedFindingIds: [...item.relatedFindingIds],
    }),
  );
  const human =
    previous.filter((rule) => rule.ruleKind === "human-judgment").length > 0
      ? previous.filter((rule) => rule.ruleKind === "human-judgment")
      : [
          {
            schemaVersion: ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION,
            ruleId: "human-motion-quality",
            ruleKind: "human-judgment" as const,
            status: "unresolved" as const,
            details:
              "A human reviewer must judge motion clarity, intent, and visual quality.",
            relatedFindingIds: [],
          },
        ];
  return deepFreeze([...automatic, ...human]);
}

function diagnosesFromReview(
  review: AnimationReviewDocument,
): readonly AnimationReviewDiagnosis[] {
  return deepFreeze(
    review.findings.map(
      (finding): AnimationReviewDiagnosis => ({
        schemaVersion: ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION,
        diagnosisId: `diagnosis-${finding.findingId}`,
        findingId: finding.findingId,
        source: finding.source,
        severity: finding.severity,
        status: finding.status === "resolved" ? "resolved" : "open",
        summary: finding.summary,
        targetIds: [...finding.targetIds],
        ...(finding.timeRange === undefined
          ? {}
          : { timeRange: { ...finding.timeRange } }),
        ruleId: finding.code,
        providerId: finding.providerId,
      }),
    ),
  );
}

function validatorFindings(
  analyzed: readonly AnimationReviewFinding[],
  previous: readonly AnimationReviewFinding[],
): readonly AnimationReviewFinding[] {
  const referenced = new Map(
    previous
      .filter((finding) => finding.source !== "validator")
      .map((finding) => [finding.findingId, finding]),
  );
  return deepFreeze([
    ...analyzed,
    ...[...referenced.values()].sort((left, right) =>
      left.findingId.localeCompare(right.findingId),
    ),
  ]);
}

function reanalyzeReview(
  review: AnimationReviewDocument,
  animation: NormalizedRigAnimation,
  rigJointIds: readonly string[],
  createdAt: string,
): AnimationReviewDocument {
  const analysis = analyzeRigAnimation(animation, rigJointIds, createdAt);
  const revision = review.revision + 1;
  return deepFreeze({
    ...review,
    revision,
    status: "changes-requested",
    subject: {
      ...review.subject,
      duration: animation.duration,
      loop: animation.loop,
    },
    metrics: analysis.metrics,
    findings: validatorFindings(analysis.findings, review.findings),
    checklist: analysis.checklist,
    auditTrail: [
      ...review.auditTrail,
      {
        entryId: `audit-session-analysis-${revision}`,
        action: "analysis-ran" as const,
        actorId: "gameai-deterministic-analyzer-v1",
        revision,
        details: `Reanalyzed ${analysis.metrics.trackCount} tracks and ${analysis.metrics.keyframeCount} keyframes after Patch Apply.`,
        createdAt,
      },
    ],
    updatedAt: createdAt,
  });
}

export function createAnimationReviewSession(
  input: CreateAnimationReviewSessionInput,
): AnimationReviewSessionDocument {
  const sourceState = editableState(input.animation, input.parts);
  const review = createAnimationReviewDocument({
    reviewId: `${input.sessionId}-review`,
    sourceRevision: input.sourceRevision,
    characterId: input.characterId,
    animation: input.animation,
    rigJointIds: input.rigJointIds,
    createdAt: input.createdAt,
    actorId: input.actorId,
  });
  const revision = input.initialRevision ?? 0;
  return finish({
    schemaVersion: ANIMATION_REVIEW_SESSION_SCHEMA_VERSION,
    sessionId: input.sessionId,
    revision,
    characterId: input.characterId,
    rigId: input.animation.rigId,
    activeClipId: input.activeClipId,
    sourceRevision: input.sourceRevision,
    sourceState,
    authoritativeState: sourceState,
    preview: null,
    patches: [],
    history: [],
    historyCursor: 0,
    review,
    validation: validationFromReview(review),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      {
        entryId: `session-created-${revision}`,
        action: "session-created",
        actorId: input.actorId,
        revision,
        details: `Created Session for ${input.activeClipId}.`,
        createdAt: input.createdAt,
      },
    ],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
}

function finite(value: number, path: string): number {
  if (!Number.isFinite(value)) {
    fail("PATCH_TARGET_INVALID", "Patch numbers must be finite.", path);
  }
  return value;
}

function targetKeyframe(
  state: AnimationReviewEditableState,
  trackIndex: number,
  keyframeIndex: number,
): {
  readonly track: NormalizedAnimationTrack;
  readonly keyframe: NormalizedAnimationKeyframe;
} {
  const track = state.animation.tracks[trackIndex];
  const keyframe = track?.keyframes[keyframeIndex];
  if (track === undefined || keyframe === undefined) {
    fail(
      "PATCH_TARGET_INVALID",
      `Unknown keyframe target ${trackIndex}/${keyframeIndex}.`,
      "/operation",
    );
  }
  return { track, keyframe };
}

function replaceKeyframe(
  state: AnimationReviewEditableState,
  trackIndex: number,
  keyframeIndex: number,
  next: NormalizedAnimationKeyframe,
): AnimationReviewEditableState {
  const animation = {
    ...state.animation,
    tracks: state.animation.tracks.map((track, currentTrack) =>
      currentTrack === trackIndex
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe, currentKeyframe) =>
              currentKeyframe === keyframeIndex ? next : keyframe,
            ),
          }
        : track,
    ),
  };
  return deepFreeze({ ...state, animation });
}

export function applyAnimationReviewPatchOperation(
  inputState: AnimationReviewEditableState,
  operation: AnimationReviewPatchOperation,
): AnimationReviewEditableState {
  const state = clone(inputState);
  switch (operation.kind) {
    case "pivot-offset": {
      finite(operation.offset.x, "/operation/offset/x");
      finite(operation.offset.y, "/operation/offset/y");
      const index = state.parts.findIndex(
        (part) => part.partId === operation.partId,
      );
      if (index < 0) {
        fail("PATCH_TARGET_INVALID", `Unknown part ${operation.partId}.`);
      }
      const part = state.parts[index]!;
      const parts = state.parts.map((item, current) =>
        current === index
          ? {
              ...item,
              pivotOffset: {
                x: part.pivotOffset.x + operation.offset.x,
                y: part.pivotOffset.y + operation.offset.y,
              },
            }
          : item,
      );
      return deepFreeze({ ...state, parts });
    }
    case "rotation-offset": {
      const { track, keyframe } = targetKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
      );
      if (track.property !== "rotation" || typeof keyframe.value !== "number") {
        fail(
          "PATCH_TARGET_INVALID",
          "Rotation offset requires a scalar rotation keyframe.",
        );
      }
      const value =
        keyframe.value +
        finite(operation.deltaDegrees, "/operation/deltaDegrees");
      return replaceKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
        { ...keyframe, value },
      );
    }
    case "keyframe-time": {
      const { track, keyframe } = targetKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
      );
      const time = finite(operation.time, "/operation/time");
      const previous = track.keyframes[operation.keyframeIndex - 1];
      const next = track.keyframes[operation.keyframeIndex + 1];
      if (
        time < 0 ||
        time > state.animation.duration ||
        (previous !== undefined && time <= previous.time) ||
        (next !== undefined && time >= next.time) ||
        time === keyframe.time
      ) {
        fail(
          "PATCH_TARGET_INVALID",
          "Keyframe time must change while staying strictly ordered inside the clip.",
        );
      }
      return replaceKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
        { ...keyframe, time },
      );
    }
    case "keyframe-value": {
      const { keyframe } = targetKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
      );
      const value = operation.value;
      const sameType =
        (typeof keyframe.value === "number" && typeof value === "number") ||
        (typeof keyframe.value === "object" &&
          typeof value === "object" &&
          value !== null);
      if (!sameType) {
        fail(
          "PATCH_TARGET_INVALID",
          "Keyframe Patch value must preserve scalar/vector type.",
        );
      }
      if (typeof value === "number") finite(value, "/operation/value");
      else {
        finite(value.x, "/operation/value/x");
        finite(value.y, "/operation/value/y");
      }
      if (JSON.stringify(keyframe.value) === JSON.stringify(value)) {
        fail("PATCH_TARGET_INVALID", "Keyframe value Patch must change the value.");
      }
      return replaceKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
        { ...keyframe, value: clone(value) },
      );
    }
    case "curve": {
      const { keyframe } = targetKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
      );
      if (
        keyframe.interpolation === operation.interpolation &&
        keyframe.easing === operation.easing
      ) {
        fail("PATCH_TARGET_INVALID", "Curve Patch must change the curve.");
      }
      return replaceKeyframe(
        state,
        operation.trackIndex,
        operation.keyframeIndex,
        {
          ...keyframe,
          interpolation: operation.interpolation,
          easing: operation.easing,
        },
      );
    }
    case "layer-order": {
      if (!Number.isInteger(operation.drawOrder)) {
        fail("PATCH_TARGET_INVALID", "Layer order must be an integer.");
      }
      const target = state.parts.find(
        (part) => part.partId === operation.partId,
      );
      if (target === undefined || target.drawOrder === operation.drawOrder) {
        fail(
          "PATCH_TARGET_INVALID",
          "Layer order Patch must target a known part and change its order.",
        );
      }
      const occupant = state.parts.find(
        (part) =>
          part.partId !== target.partId &&
          part.drawOrder === operation.drawOrder,
      );
      const parts = state.parts.map((part) =>
        part.partId === target.partId
          ? { ...part, drawOrder: operation.drawOrder }
          : occupant !== undefined && part.partId === occupant.partId
            ? { ...part, drawOrder: target.drawOrder }
            : part,
      );
      return deepFreeze({ ...state, parts });
    }
  }
}

function replacePatch(
  patches: readonly AnimationReviewPatchDocument[],
  patchId: string,
  update: (
    patch: AnimationReviewPatchDocument,
  ) => AnimationReviewPatchDocument,
): readonly AnimationReviewPatchDocument[] {
  return deepFreeze(
    patches.map((patch) => (patch.patchId === patchId ? update(patch) : patch)),
  );
}

function selectedPatch(
  session: AnimationReviewSessionDocument,
  patchId: string,
): AnimationReviewPatchDocument {
  const patch = session.patches.find((item) => item.patchId === patchId);
  if (patch === undefined) {
    fail("PATCH_TARGET_INVALID", `Unknown Patch ${patchId}.`, "/patchId");
  }
  return patch;
}

export function proposeAnimationReviewPatch(
  session: AnimationReviewSessionDocument,
  value: unknown,
): AnimationReviewSessionDocument {
  const parsed = validateAnimationReviewPatch(value);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0]!;
    throw new AnimationReviewError(
      diagnostic.code,
      diagnostic.message,
      diagnostic.path,
    );
  }
  const patch = parsed.value;
  assertRevision(session, patch.expectedRevision);
  if (patch.status !== "AI_PROPOSED" || patch.source !== "ai") {
    fail(
      "PATCH_STATUS_TRANSITION_INVALID",
      "Provider proposals must enter as AI_PROPOSED patches.",
    );
  }
  if (session.patches.some((item) => item.patchId === patch.patchId)) {
    fail("PATCH_DUPLICATE_ID", `Patch ID ${patch.patchId} already exists.`);
  }
  applyAnimationReviewPatchOperation(session.authoritativeState, patch.operation);
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    patches: [...session.patches, patch],
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `patch-proposed-${revision}-${patch.patchId}`,
        action: "patch-proposed",
        actorId: patch.actorId,
        revision,
        details: `Proposed ${patch.operation.kind} Patch ${patch.patchId}.`,
        createdAt: patch.createdAt,
      },
    ],
    updatedAt: patch.updatedAt,
  });
}

function patchFromFinding(
  session: AnimationReviewSessionDocument,
  finding: AnimationReviewFinding,
  actorId: string,
  createdAt: string,
): AnimationReviewPatchDocument | null {
  const suggestion = finding.suggestion;
  if (suggestion?.proposedValue === undefined) return null;
  const match = SUGGESTION_PATH.exec(suggestion.parameterPath);
  if (match === null) return null;
  const trackIndex = Number(match[1]);
  const keyframeIndex = Number(match[2]);
  const target = targetKeyframe(
    session.authoritativeState,
    trackIndex,
    keyframeIndex,
  );
  if (typeof target.keyframe.value !== "number") return null;
  const operation: AnimationReviewPatchOperation =
    target.track.property === "rotation"
      ? {
          kind: "rotation-offset",
          trackIndex,
          keyframeIndex,
          deltaDegrees: suggestion.proposedValue - target.keyframe.value,
        }
      : {
          kind: "keyframe-value",
          trackIndex,
          keyframeIndex,
          value: suggestion.proposedValue,
        };
  return deepFreeze({
    schemaVersion: ANIMATION_REVIEW_PATCH_SCHEMA_VERSION,
    patchId: `patch-${finding.findingId}`,
    findingId: finding.findingId,
    expectedRevision: session.revision,
    source: "ai",
    status: "AI_PROPOSED",
    operation,
    actorId,
    createdAt,
    updatedAt: createdAt,
  });
}

export function runAnimationReviewAssistant(
  session: AnimationReviewSessionDocument,
  rigJointIds: readonly string[],
  input: AnimationReviewRevisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const proposal = createDeterministicAnimationAssistantProposal(
    session.review,
    session.authoritativeState.animation,
    input.createdAt,
  );
  const review = appendAnimationReviewProviderProposal(
    session.review,
    proposal,
    {
      actorId: input.actorId,
      createdAt: input.createdAt,
    },
  );
  const existing = new Set(session.patches.map((patch) => patch.patchId));
  const patches = proposal.findings
    .map((finding) =>
      patchFromFinding(session, finding, input.actorId, input.createdAt),
    )
    .filter(
      (patch): patch is AnimationReviewPatchDocument =>
        patch !== null && !existing.has(patch.patchId),
    );
  if (review === session.review && patches.length === 0) return session;
  for (const patch of patches) {
    applyAnimationReviewPatchOperation(
      session.authoritativeState,
      patch.operation,
    );
  }
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    review,
    patches: [...session.patches, ...patches],
    validation: validationFromReview(review, session.validation),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      ...patches.map((patch) => ({
        entryId: `patch-proposed-${revision}-${patch.patchId}`,
        action: "patch-proposed" as const,
        actorId: input.actorId,
        revision,
        details: `Local deterministic assistant proposed ${patch.operation.kind} Patch ${patch.patchId}.`,
        createdAt: input.createdAt,
      })),
    ],
    updatedAt: input.createdAt,
  });
}

export function decideAnimationReviewPatch(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewPatchDecisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const patch = selectedPatch(session, input.patchId);
  if (patch.status !== "AI_PROPOSED") {
    fail(
      "PATCH_STATUS_TRANSITION_INVALID",
      `Patch ${patch.patchId} cannot be decided from ${patch.status}.`,
    );
  }
  const revision = session.revision + 1;
  const status =
    input.decision === "accept" ? "HUMAN_ACCEPTED" : "HUMAN_REJECTED";
  let review = session.review;
  if (patch.findingId !== undefined) {
    const finding = review.findings.find(
      (item) => item.findingId === patch.findingId,
    );
    if (finding?.status === "open") {
      review = decideAnimationReviewFinding(review, {
        expectedRevision: review.revision,
        decisionId: `patch-decision-${patch.patchId}-${revision}`,
        findingId: patch.findingId,
        decision: input.decision,
        actorId: input.actorId,
        note: `${input.decision} Patch ${patch.patchId}.`,
        createdAt: input.createdAt,
      });
    }
  }
  return finish({
    ...session,
    revision,
    review,
    patches: replacePatch(session.patches, patch.patchId, (item) => ({
      ...item,
      status,
      actorId: input.actorId,
      updatedAt: input.createdAt,
    })),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `patch-decided-${revision}-${patch.patchId}`,
        action: "patch-decided",
        actorId: input.actorId,
        revision,
        details: `${input.decision} Patch ${patch.patchId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function editAnimationReviewPatch(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewPatchEditInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const patch = selectedPatch(session, input.patchId);
  if (patch.status !== "HUMAN_ACCEPTED" && patch.status !== "PREVIEWED") {
    fail(
      "PATCH_STATUS_TRANSITION_INVALID",
      "Only a human-accepted or previewed Patch can be edited.",
    );
  }
  if (patch.operation.kind !== input.operation.kind) {
    fail("PATCH_TARGET_INVALID", "Patch editing cannot change its kind.");
  }
  applyAnimationReviewPatchOperation(
    session.authoritativeState,
    input.operation,
  );
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    preview: null,
    patches: replacePatch(session.patches, patch.patchId, (item) => ({
      ...item,
      status: "HUMAN_ACCEPTED",
      operation: deepFreeze(clone(input.operation)),
      actorId: input.actorId,
      updatedAt: input.createdAt,
    })),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `patch-edited-${revision}-${patch.patchId}`,
        action: "patch-edited",
        actorId: input.actorId,
        revision,
        details: `Edited ${patch.operation.kind} Patch ${patch.patchId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function previewAnimationReviewPatch(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewPatchActionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const patch = selectedPatch(session, input.patchId);
  if (patch.status !== "HUMAN_ACCEPTED" && patch.status !== "PREVIEWED") {
    fail(
      "PATCH_STATUS_TRANSITION_INVALID",
      "Only a human-accepted Patch can be previewed.",
    );
  }
  const state = applyAnimationReviewPatchOperation(
    session.authoritativeState,
    patch.operation,
  );
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    preview: { patchId: patch.patchId, state },
    patches: replacePatch(session.patches, patch.patchId, (item) => ({
      ...item,
      status: "PREVIEWED",
      updatedAt: input.createdAt,
    })),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `patch-previewed-${revision}-${patch.patchId}`,
        action: "patch-previewed",
        actorId: input.actorId,
        revision,
        details: `Previewed Patch ${patch.patchId} without changing authoritative state.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function applyAnimationReviewPatch(
  session: AnimationReviewSessionDocument,
  rigJointIds: readonly string[],
  input: AnimationReviewPatchActionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const patch = selectedPatch(session, input.patchId);
  if (
    patch.status !== "PREVIEWED" ||
    session.preview?.patchId !== patch.patchId
  ) {
    fail(
      "PATCH_PREVIEW_REQUIRED",
      "Patch Apply requires the current, matching Preview.",
    );
  }
  if (
    session.history.length >=
    ANIMATION_REVIEW_SESSION_LIMITS.maxHistoryEntries
  ) {
    fail(
      "SESSION_BUDGET_EXCEEDED",
      "Patch history budget is exhausted before Apply.",
    );
  }
  const recomputed = applyAnimationReviewPatchOperation(
    session.authoritativeState,
    patch.operation,
  );
  if (JSON.stringify(recomputed) !== JSON.stringify(session.preview.state)) {
    fail(
      "PATCH_PREVIEW_REQUIRED",
      "Preview no longer matches the authoritative Patch precondition.",
    );
  }
  const afterReview = reanalyzeReview(
    session.review,
    recomputed.animation,
    rigJointIds,
    input.createdAt,
  );
  const revision = session.revision + 1;
  const retainedHistory = session.history.slice(0, session.historyCursor);
  const truncatedPatchIds = new Set(
    session.history
      .slice(session.historyCursor)
      .map((entry) => entry.patchId),
  );
  let patches: readonly AnimationReviewPatchDocument[] = session.patches.map((item) =>
    truncatedPatchIds.has(item.patchId) && item.status === "APPLIED"
      ? { ...item, status: "HUMAN_ACCEPTED" as const }
      : item,
  );
  patches = replacePatch(patches, patch.patchId, (item) => ({
    ...item,
    status: "APPLIED",
    actorId: input.actorId,
    updatedAt: input.createdAt,
  }));
  const history = [
    ...retainedHistory,
    deepFreeze({
      historyId: `history-${patch.patchId}-${revision}`,
      patchId: patch.patchId,
      beforeState: session.authoritativeState,
      afterState: recomputed,
      beforeReview: session.review,
      afterReview,
      actorId: input.actorId,
      appliedAt: input.createdAt,
    }),
  ];
  return finish({
    ...session,
    revision,
    authoritativeState: recomputed,
    preview: null,
    patches,
    history,
    historyCursor: history.length,
    review: afterReview,
    validation: validationFromReview(afterReview, session.validation),
    diagnoses: diagnosesFromReview(afterReview),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `patch-applied-${revision}-${patch.patchId}`,
        action: "patch-applied",
        actorId: input.actorId,
        revision,
        details: `Applied and reanalyzed Patch ${patch.patchId}.`,
        createdAt: input.createdAt,
      },
      {
        entryId: `session-analysis-${revision}-${patch.patchId}`,
        action: "analysis-ran",
        actorId: "gameai-deterministic-analyzer-v1",
        revision,
        details: "Recomputed automatic rules after Patch Apply.",
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function undoAnimationReviewSession(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewRevisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  if (session.historyCursor === 0) {
    fail("PATCH_HISTORY_INVALID", "There is no applied Patch to undo.");
  }
  const entry = session.history[session.historyCursor - 1]!;
  const revision = session.revision + 1;
  const review = reanalyzeReview(
    session.review,
    entry.beforeState.animation,
    session.sourceState.parts.map((part) => part.partId),
    input.createdAt,
  );
  return finish({
    ...session,
    revision,
    authoritativeState: entry.beforeState,
    preview: null,
    patches: replacePatch(session.patches, entry.patchId, (patch) => ({
      ...patch,
      status: "HUMAN_ACCEPTED",
      updatedAt: input.createdAt,
    })),
    historyCursor: session.historyCursor - 1,
    review,
    validation: validationFromReview(review, session.validation),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `undo-${revision}-${entry.historyId}`,
        action: "undo",
        actorId: input.actorId,
        revision,
        details: `Undid Patch ${entry.patchId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function redoAnimationReviewSession(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewRevisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const entry = session.history[session.historyCursor];
  if (entry === undefined) {
    fail("PATCH_HISTORY_INVALID", "There is no undone Patch to redo.");
  }
  const revision = session.revision + 1;
  const review = reanalyzeReview(
    session.review,
    entry.afterState.animation,
    session.sourceState.parts.map((part) => part.partId),
    input.createdAt,
  );
  return finish({
    ...session,
    revision,
    authoritativeState: entry.afterState,
    preview: null,
    patches: replacePatch(session.patches, entry.patchId, (patch) => ({
      ...patch,
      status: "APPLIED",
      updatedAt: input.createdAt,
    })),
    historyCursor: session.historyCursor + 1,
    review,
    validation: validationFromReview(review, session.validation),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `redo-${revision}-${entry.historyId}`,
        action: "redo",
        actorId: input.actorId,
        revision,
        details: `Redid Patch ${entry.patchId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function decideAnimationReviewHumanRule(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewHumanRuleDecisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const rule = session.validation.find((item) => item.ruleId === input.ruleId);
  if (
    rule === undefined ||
    rule.ruleKind !== "human-judgment" ||
    rule.status !== "unresolved" ||
    input.actorId.startsWith("gameai-local-animation-assistant")
  ) {
    fail(
      "VALIDATION_TRANSITION_INVALID",
      "Only a human can complete an unresolved human-judgment rule.",
    );
  }
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    validation: session.validation.map((item) =>
      item.ruleId === rule.ruleId
        ? {
            ...item,
            status: input.decision,
            decidedBy: input.actorId,
            decidedAt: input.createdAt,
          }
        : item,
    ),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `human-rule-${revision}-${rule.ruleId}`,
        action: "human-rule-decided",
        actorId: input.actorId,
        revision,
        details: `Marked human rule ${rule.ruleId} ${input.decision}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function createAnimationReviewHumanFinding(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewHumanFindingInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  if (
    session.review.findings.some((finding) => finding.findingId === input.findingId) ||
    input.summary.trim().length === 0 ||
    input.summary.length > 500 ||
    input.targetIds.length > 100 ||
    new Set(input.targetIds).size !== input.targetIds.length ||
    (input.timeRange !== undefined &&
      (!Number.isFinite(input.timeRange.start) ||
        !Number.isFinite(input.timeRange.end) ||
        input.timeRange.start < 0 ||
        input.timeRange.end < input.timeRange.start ||
        input.timeRange.end > session.authoritativeState.animation.duration))
  ) {
    fail(
      "REVIEW_UNKNOWN_FINDING_REFERENCE",
      "Human Finding identity, summary, targets, or time range is invalid.",
    );
  }
  const reviewRevision = session.review.revision + 1;
  const review = deepFreeze({
    ...session.review,
    revision: reviewRevision,
    status: "changes-requested" as const,
    findings: [
      ...session.review.findings,
      {
        findingId: input.findingId,
        code: "HUMAN_REVIEW_FINDING",
        source: "human" as const,
        severity: "warning" as const,
        category: "visual" as const,
        status: "open" as const,
        summary: input.summary.trim(),
        diagnosis: input.summary.trim(),
        targetIds: [...input.targetIds],
        ...(input.timeRange === undefined
          ? {}
          : { timeRange: { ...input.timeRange } }),
        confidence: 1,
        providerId: input.actorId,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    review,
    validation: validationFromReview(review, session.validation),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `human-finding-${revision}-${input.findingId}`,
        action: "human-finding-created",
        actorId: input.actorId,
        revision,
        details: `Created human Finding ${input.findingId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function createAnimationReviewHumanRule(
  session: AnimationReviewSessionDocument,
  input: AnimationReviewHumanRuleCreateInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const findingIds = new Set(session.review.findings.map((finding) => finding.findingId));
  if (
    session.validation.some((rule) => rule.ruleId === input.ruleId) ||
    input.details.trim().length === 0 ||
    input.details.length > 2_000 ||
    input.relatedFindingIds.length > 100 ||
    new Set(input.relatedFindingIds).size !== input.relatedFindingIds.length ||
    input.relatedFindingIds.some((findingId) => !findingIds.has(findingId))
  ) {
    fail(
      "VALIDATION_TRANSITION_INVALID",
      "Human Rule identity, details, or Finding references are invalid.",
    );
  }
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    validation: [
      ...session.validation,
      {
        schemaVersion: ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION,
        ruleId: input.ruleId,
        ruleKind: "human-judgment",
        status: "unresolved",
        details: input.details.trim(),
        relatedFindingIds: [...input.relatedFindingIds],
      },
    ],
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `human-rule-created-${revision}-${input.ruleId}`,
        action: "human-rule-created",
        actorId: input.actorId,
        revision,
        details: `Created human Rule ${input.ruleId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

export function resolveAnimationReviewFindingInSession(
  session: AnimationReviewSessionDocument,
  input: ReviewDecisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const selected = session.review.findings.find(
    (finding) => finding.findingId === input.findingId,
  );
  const accepted =
    input.decision === "resolve" && selected?.status === "open"
      ? decideAnimationReviewFinding(session.review, {
          ...input,
          expectedRevision: session.review.revision,
          decisionId: `${input.decisionId}-accept`,
          decision: "accept",
          note: input.note,
        })
      : session.review;
  const review = decideAnimationReviewFinding(accepted, {
    ...input,
    expectedRevision: accepted.revision,
  });
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    review,
    diagnoses: diagnosesFromReview(review),
    updatedAt: input.createdAt,
  });
}

export function exactResetAnimationReviewSession(
  session: AnimationReviewSessionDocument,
  rigJointIds: readonly string[],
  input: AnimationReviewRevisionInput,
): AnimationReviewSessionDocument {
  assertRevision(session, input.expectedRevision);
  const review = createAnimationReviewDocument({
    reviewId: session.review.reviewId,
    sourceRevision: session.sourceRevision,
    characterId: session.characterId,
    animation: session.sourceState.animation,
    rigJointIds,
    createdAt: input.createdAt,
    actorId: input.actorId,
  });
  const revision = session.revision + 1;
  return finish({
    ...session,
    revision,
    authoritativeState: session.sourceState,
    preview: null,
    patches: [],
    history: [],
    historyCursor: 0,
    review,
    validation: validationFromReview(review),
    diagnoses: diagnosesFromReview(review),
    auditTrail: [
      ...session.auditTrail,
      {
        entryId: `exact-reset-${revision}`,
        action: "exact-reset",
        actorId: input.actorId,
        revision,
        details:
          "Restored source authority and cleared Preview, Patch, history, and stale diagnosis state.",
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

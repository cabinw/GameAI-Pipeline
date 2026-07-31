import type {
  NormalizedAnimationTrack,
  NormalizedRigAnimation,
} from "@gameai/rig-animation";

import { analyzeRigAnimation } from "./analyzer";
import { AnimationReviewError } from "./diagnostics";
import type {
  AnimationReviewDocument,
  AnimationReviewFinding,
  ApplyAnimationReviewAdjustmentResult,
  ReviewAdjustmentInput,
} from "./types";

const PARAMETER_PATH_PATTERN =
  /^\/tracks\/([0-9]+)\/keyframes\/([0-9]+)\/value$/;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(message: string, path?: string): never {
  throw new AnimationReviewError(
    "REVIEW_ADJUSTMENT_INVALID",
    message,
    path,
  );
}

function replaceScalarKeyframe(
  animation: NormalizedRigAnimation,
  trackIndex: number,
  keyframeIndex: number,
  nextValue: number,
): NormalizedRigAnimation {
  const tracks = animation.tracks.map((track, currentTrackIndex) => {
    if (currentTrackIndex !== trackIndex) return track;
    return {
      ...track,
      keyframes: track.keyframes.map((keyframe, currentKeyframeIndex) =>
        currentKeyframeIndex === keyframeIndex
          ? { ...keyframe, value: nextValue }
          : keyframe,
      ),
    } satisfies NormalizedAnimationTrack;
  });
  return deepFreeze({ ...animation, tracks });
}

function reconcileFindings(
  document: AnimationReviewDocument,
  analyzed: readonly AnimationReviewFinding[],
  selectedFindingId: string,
): readonly AnimationReviewFinding[] {
  const referenced = new Set([
    selectedFindingId,
    ...document.decisions.map((decision) => decision.findingId),
    ...document.adjustments.map((adjustment) => adjustment.findingId),
  ]);
  const retained = document.findings.filter(
    (finding) => finding.source !== "validator" || referenced.has(finding.findingId),
  );
  const retainedById = new Map(
    retained.map((finding) => [finding.findingId, finding]),
  );
  const currentValidatorFindings = analyzed.map(
    (finding) => retainedById.get(finding.findingId) ?? finding,
  );
  const currentIds = new Set(currentValidatorFindings.map((finding) => finding.findingId));
  return Object.freeze([
    ...retained.filter(
      (finding) =>
        finding.source !== "validator" || !currentIds.has(finding.findingId),
    ),
    ...currentValidatorFindings,
  ]);
}

export function applyAnimationReviewAdjustment(
  document: AnimationReviewDocument,
  animation: NormalizedRigAnimation,
  rigJointIds: readonly string[],
  input: ReviewAdjustmentInput,
): ApplyAnimationReviewAdjustmentResult {
  if (input.expectedRevision !== document.revision) {
    throw new AnimationReviewError(
      "REVIEW_REVISION_INVALID",
      `Expected revision ${input.expectedRevision}, current revision is ${document.revision}.`,
      "/expectedRevision",
    );
  }
  if (
    document.adjustments.some(
      (adjustment) => adjustment.adjustmentId === input.adjustmentId,
    )
  ) {
    fail(`Adjustment ID ${input.adjustmentId} already exists.`, "/adjustmentId");
  }
  if (
    document.subject.animationId !== animation.animationId ||
    document.subject.rigId !== animation.rigId
  ) {
    fail("Animation does not match the review subject.", "/animation");
  }
  const finding = document.findings.find(
    (item) => item.findingId === input.findingId,
  );
  if (finding === undefined) {
    throw new AnimationReviewError(
      "REVIEW_UNKNOWN_FINDING_REFERENCE",
      `Unknown finding ${input.findingId}.`,
      "/findingId",
    );
  }
  if (
    finding.status !== "accepted" ||
    (finding.source !== "assistant" && finding.source !== "provider")
  ) {
    fail("Only an accepted AI/provider proposal can be quick-edited.", "/findingId");
  }
  const suggestion = finding.suggestion;
  if (
    suggestion === undefined ||
    input.parameterPath !== suggestion.parameterPath
  ) {
    fail("Adjustment path must exactly match the accepted suggestion.", "/parameterPath");
  }
  if (
    !Number.isFinite(input.nextValue) ||
    input.nextValue < suggestion.minimum ||
    input.nextValue > suggestion.maximum
  ) {
    fail(
      `Value must be finite and within ${suggestion.minimum} through ${suggestion.maximum}.`,
      "/nextValue",
    );
  }
  const match = PARAMETER_PATH_PATTERN.exec(input.parameterPath);
  if (match === null) {
    fail("Only scalar keyframe value paths are supported.", "/parameterPath");
  }
  const trackIndex = Number(match[1]);
  const keyframeIndex = Number(match[2]);
  const keyframe = animation.tracks[trackIndex]?.keyframes[keyframeIndex];
  if (keyframe === undefined || typeof keyframe.value !== "number") {
    fail("Adjustment target is not a known scalar keyframe.", "/parameterPath");
  }
  if (keyframe.value === input.nextValue) {
    fail("Adjustment must change the keyframe value.", "/nextValue");
  }
  const sourceBefore = JSON.stringify(animation);
  const nextAnimation = replaceScalarKeyframe(
    animation,
    trackIndex,
    keyframeIndex,
    input.nextValue,
  );
  if (JSON.stringify(animation) !== sourceBefore) {
    fail("Source animation changed while creating the proposal revision.");
  }
  const analysis = analyzeRigAnimation(
    nextAnimation,
    rigJointIds,
    input.createdAt,
  );
  const revision = document.revision + 1;
  const nextDocument = deepFreeze({
    ...document,
    revision,
    status: "changes-requested" as const,
    metrics: analysis.metrics,
    findings: reconcileFindings(
      document,
      analysis.findings,
      input.findingId,
    ),
    checklist: analysis.checklist,
    adjustments: [
      ...document.adjustments,
      {
        adjustmentId: input.adjustmentId,
        findingId: input.findingId,
        parameterPath: input.parameterPath,
        previousValue: keyframe.value,
        nextValue: input.nextValue,
        actorId: input.actorId,
        revision,
        createdAt: input.createdAt,
      },
    ],
    auditTrail: [
      ...document.auditTrail,
      {
        entryId: `audit-adjustment-applied-${revision}`,
        action: "adjustment-applied" as const,
        actorId: input.actorId,
        revision,
        details: `Changed ${input.parameterPath} from ${keyframe.value} to ${input.nextValue}.`,
        createdAt: input.createdAt,
      },
      {
        entryId: `audit-analysis-ran-${revision}`,
        action: "analysis-ran" as const,
        actorId: "gameai-deterministic-analyzer-v1",
        revision,
        details: `Reanalyzed ${analysis.metrics.trackCount} tracks and ${analysis.metrics.keyframeCount} keyframes.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
  return deepFreeze({ document: nextDocument, animation: nextAnimation });
}

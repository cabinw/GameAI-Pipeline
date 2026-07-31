import type {
  NormalizedAnimationTrack,
  NormalizedRigAnimation,
} from "@gameai/rig-animation";

import type {
  AnimationReviewAnalysis,
  AnimationReviewChecklistItem,
  AnimationReviewFinding,
  AnimationReviewMetrics,
} from "./types";

function round(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

function vectorMagnitude(value: Readonly<{ x: number; y: number }>): number {
  return Math.hypot(value.x, value.y);
}

function difference(
  left: number | Readonly<{ x: number; y: number }>,
  right: number | Readonly<{ x: number; y: number }>,
): number {
  return typeof left === "number" && typeof right === "number"
    ? Math.abs(right - left)
    : typeof left === "object" && typeof right === "object"
      ? Math.hypot(right.x - left.x, right.y - left.y)
      : Number.POSITIVE_INFINITY;
}

function maxSegmentSpeed(track: NormalizedAnimationTrack): number {
  let maximum = 0;
  for (let index = 0; index < track.keyframes.length - 1; index += 1) {
    const left = track.keyframes[index]!;
    const right = track.keyframes[index + 1]!;
    const duration = right.time - left.time;
    if (duration > 0) maximum = Math.max(maximum, difference(left.value, right.value) / duration);
  }
  return maximum;
}

function finding(
  input: Omit<AnimationReviewFinding, "findingId" | "status" | "source" | "providerId" | "createdAt">,
  index: number,
  createdAt: string,
): AnimationReviewFinding {
  return Object.freeze({
    findingId: `finding-${input.code.toLowerCase()}-${index + 1}`,
    source: "validator",
    status: "open",
    providerId: "gameai-deterministic-analyzer-v1",
    createdAt,
    ...input,
    targetIds: Object.freeze([...input.targetIds].sort()),
  });
}

function checklistItem(
  checkId: string,
  label: string,
  status: AnimationReviewChecklistItem["status"],
  details: string,
  relatedFindingIds: readonly string[],
): AnimationReviewChecklistItem {
  return Object.freeze({
    checkId,
    label,
    status,
    details,
    relatedFindingIds: Object.freeze([...relatedFindingIds].sort()),
  });
}

export function analyzeRigAnimation(
  animation: NormalizedRigAnimation,
  rigJointIds: readonly string[],
  createdAt: string,
): AnimationReviewAnalysis {
  const tracks = [...animation.tracks].sort(
    (left, right) =>
      left.jointId.localeCompare(right.jointId) ||
      left.property.localeCompare(right.property),
  );
  const animatedJoints = new Set(tracks.map((track) => track.jointId));
  const uniqueRigJoints = [...new Set(rigJointIds)].sort();
  const untracked = uniqueRigJoints.filter((jointId) => !animatedJoints.has(jointId));

  let keyframeCount = 0;
  let loopContinuityError = 0;
  let maxAbsoluteRotationDegrees = 0;
  let maxAngularSpeedDegreesPerSecond = 0;
  let maxLinearSpeedUnitsPerSecond = 0;
  const rawFindings: Array<Omit<
    AnimationReviewFinding,
    "findingId" | "status" | "source" | "providerId" | "createdAt"
  >> = [];

  for (const track of tracks) {
    keyframeCount += track.keyframes.length;
    const first = track.keyframes[0]!;
    const last = track.keyframes.at(-1)!;
    const continuity = difference(first.value, last.value);
    loopContinuityError = Math.max(loopContinuityError, continuity);
    const speed = maxSegmentSpeed(track);
    if (track.property === "rotation") {
      maxAngularSpeedDegreesPerSecond = Math.max(
        maxAngularSpeedDegreesPerSecond,
        speed,
      );
      for (const keyframe of track.keyframes) {
        if (typeof keyframe.value === "number") {
          maxAbsoluteRotationDegrees = Math.max(
            maxAbsoluteRotationDegrees,
            Math.abs(keyframe.value),
          );
        }
      }
    } else if (track.property === "position") {
      maxLinearSpeedUnitsPerSecond = Math.max(
        maxLinearSpeedUnitsPerSecond,
        speed,
      );
    }

    if (animation.loop && continuity > 0.001) {
      rawFindings.push({
        code: "LOOP_DISCONTINUITY",
        severity: "error",
        category: "loop",
        summary: `${track.jointId} ${track.property} does not close at the loop boundary.`,
        diagnosis: `The first and final keyframe differ by ${round(continuity)}; a loop must return to the same authored offset.`,
        targetIds: [track.jointId],
        timeRange: { start: 0, end: animation.duration },
        suggestion: {
          summary: "Align the final keyframe with the first keyframe.",
          parameterPath: `/tracks/${track.jointId}/${track.property}/last`,
          minimum:
            typeof first.value === "number"
              ? round(first.value)
              : round(-vectorMagnitude(first.value)),
          maximum:
            typeof first.value === "number"
              ? round(first.value)
              : round(vectorMagnitude(first.value)),
          ...(typeof first.value === "number"
            ? { proposedValue: round(first.value) }
            : {}),
        },
        confidence: 1,
      });
    }
  }

  if (maxAbsoluteRotationDegrees > 135) {
    rawFindings.push({
      code: "EXTREME_ROTATION",
      severity: "warning",
      category: "timing",
      summary: "Animation contains an extreme authored rotation offset.",
      diagnosis: `Maximum absolute rotation is ${round(maxAbsoluteRotationDegrees)} degrees, above the 135 degree review threshold.`,
      targetIds: tracks
        .filter((track) => track.property === "rotation")
        .map((track) => track.jointId),
      suggestion: {
        summary: "Review the affected rotation keyframes for intended shortest-path motion.",
        parameterPath: "/tracks/*/rotation",
        minimum: -135,
        maximum: 135,
      },
      confidence: 0.85,
    });
  }

  if (maxAngularSpeedDegreesPerSecond > 720) {
    rawFindings.push({
      code: "HIGH_ANGULAR_SPEED",
      severity: "warning",
      category: "velocity",
      summary: "Animation contains a high angular-speed segment.",
      diagnosis: `Maximum angular speed is ${round(maxAngularSpeedDegreesPerSecond)} degrees/second, above the 720 degrees/second review threshold.`,
      targetIds: tracks
        .filter((track) => track.property === "rotation")
        .map((track) => track.jointId),
      suggestion: {
        summary: "Increase keyframe spacing or reduce the rotation delta.",
        parameterPath: "/tracks/*/rotation",
        minimum: -360,
        maximum: 360,
      },
      confidence: 0.8,
    });
  }

  if (untracked.length > 0) {
    rawFindings.push({
      code: "UNTRACKED_RIG_JOINTS",
      severity: "info",
      category: "coverage",
      summary: `${untracked.length} rig joint${untracked.length === 1 ? "" : "s"} inherit motion without direct tracks.`,
      diagnosis:
        "Untracked joints are valid when parent inheritance is intentional; review confirms that the omission is deliberate.",
      targetIds: untracked,
      confidence: 1,
    });
  }

  rawFindings.sort(
    (left, right) =>
      left.severity.localeCompare(right.severity) ||
      left.code.localeCompare(right.code) ||
      left.targetIds.join("\0").localeCompare(right.targetIds.join("\0")),
  );
  const findings = Object.freeze(
    rawFindings.map((item, index) => finding(item, index, createdAt)),
  );
  const findingsByCode = new Map<string, string[]>();
  for (const item of findings) {
    const ids = findingsByCode.get(item.code) ?? [];
    ids.push(item.findingId);
    findingsByCode.set(item.code, ids);
  }
  const failedLoop = findingsByCode.get("LOOP_DISCONTINUITY") ?? [];
  const highSpeed = findingsByCode.get("HIGH_ANGULAR_SPEED") ?? [];
  const extreme = findingsByCode.get("EXTREME_ROTATION") ?? [];
  const coverage = findingsByCode.get("UNTRACKED_RIG_JOINTS") ?? [];

  const metrics: AnimationReviewMetrics = Object.freeze({
    duration: round(animation.duration),
    trackCount: tracks.length,
    keyframeCount,
    animatedJointCount: animatedJoints.size,
    untrackedJointCount: untracked.length,
    loopContinuityError: round(loopContinuityError),
    maxAbsoluteRotationDegrees: round(maxAbsoluteRotationDegrees),
    maxAngularSpeedDegreesPerSecond: round(maxAngularSpeedDegreesPerSecond),
    maxLinearSpeedUnitsPerSecond: round(maxLinearSpeedUnitsPerSecond),
  });

  const checklist = Object.freeze([
    checklistItem(
      "contract-shape",
      "Animation has a finite duration and at least one valid track",
      animation.duration > 0 && tracks.length > 0 ? "passed" : "failed",
      `${tracks.length} tracks and ${keyframeCount} keyframes over ${metrics.duration} seconds.`,
      [],
    ),
    checklistItem(
      "loop-continuity",
      "Loop boundary is continuous",
      failedLoop.length === 0 ? "passed" : "failed",
      failedLoop.length === 0
        ? `Maximum loop boundary error is ${metrics.loopContinuityError}.`
        : `${failedLoop.length} loop discontinuity finding(s) require review.`,
      failedLoop,
    ),
    checklistItem(
      "motion-speed",
      "Authored angular speed stays inside the review threshold",
      highSpeed.length === 0 ? "passed" : "warning",
      `Maximum angular speed is ${metrics.maxAngularSpeedDegreesPerSecond} degrees/second.`,
      highSpeed,
    ),
    checklistItem(
      "rotation-range",
      "Authored rotation offsets stay inside the review threshold",
      extreme.length === 0 ? "passed" : "warning",
      `Maximum absolute rotation is ${metrics.maxAbsoluteRotationDegrees} degrees.`,
      extreme,
    ),
    checklistItem(
      "track-coverage",
      "Direct track coverage is understood",
      coverage.length === 0 ? "passed" : "warning",
      `${metrics.animatedJointCount} animated and ${metrics.untrackedJointCount} inherited-only joints.`,
      coverage,
    ),
  ]);

  return Object.freeze({ metrics, findings, checklist });
}

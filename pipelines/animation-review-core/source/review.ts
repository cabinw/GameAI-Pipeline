import { analyzeRigAnimation } from "./analyzer";
import { AnimationReviewError } from "./diagnostics";
import type {
  AnimationReviewDocument,
  AnimationReviewFinding,
  CreateAnimationReviewInput,
  ReviewDecisionInput,
} from "./types";
import { ANIMATION_REVIEW_SCHEMA_VERSION } from "./types";

function freezeDocument(document: AnimationReviewDocument): AnimationReviewDocument {
  return deepFreeze(document);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function findingStatusAfterDecision(
  finding: AnimationReviewFinding,
  decision: ReviewDecisionInput["decision"],
): AnimationReviewFinding["status"] {
  if (decision === "comment") return finding.status;
  if (finding.status === "resolved") {
    throw new AnimationReviewError(
      "REVIEW_DECISION_TRANSITION_INVALID",
      `Finding ${finding.findingId} is already resolved.`,
      "/decision",
    );
  }
  if (decision === "resolve") {
    if (finding.status !== "accepted") {
      throw new AnimationReviewError(
        "REVIEW_DECISION_TRANSITION_INVALID",
        `Finding ${finding.findingId} must be accepted before it can be resolved.`,
        "/decision",
      );
    }
    return "resolved";
  }
  return decision === "accept" ? "accepted" : "rejected";
}

export function createAnimationReviewDocument(
  input: CreateAnimationReviewInput,
): AnimationReviewDocument {
  const analysis = analyzeRigAnimation(
    input.animation,
    input.rigJointIds,
    input.createdAt,
  );
  const actorId = input.actorId ?? "gameai-review-core";
  return freezeDocument({
    schemaVersion: ANIMATION_REVIEW_SCHEMA_VERSION,
    reviewId: input.reviewId,
    revision: 0,
    status: "in-review",
    subject: {
      characterId: input.characterId,
      rigId: input.animation.rigId,
      animationId: input.animation.animationId,
      sourceRevision: input.sourceRevision,
      duration: input.animation.duration,
      loop: input.animation.loop,
    },
    metrics: analysis.metrics,
    findings: analysis.findings,
    checklist: analysis.checklist,
    decisions: [],
    adjustments: [],
    auditTrail: [
      {
        entryId: "audit-review-created-0",
        action: "review-created",
        actorId,
        revision: 0,
        details: `Created review for ${input.animation.animationId}.`,
        createdAt: input.createdAt,
      },
      {
        entryId: "audit-analysis-ran-0",
        action: "analysis-ran",
        actorId: "gameai-deterministic-analyzer-v1",
        revision: 0,
        details: `Analyzed ${analysis.metrics.trackCount} tracks and ${analysis.metrics.keyframeCount} keyframes.`,
        createdAt: input.createdAt,
      },
    ],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
}

export function decideAnimationReviewFinding(
  document: AnimationReviewDocument,
  input: ReviewDecisionInput,
): AnimationReviewDocument {
  if (input.expectedRevision !== document.revision) {
    throw new AnimationReviewError(
      "REVIEW_REVISION_INVALID",
      `Expected revision ${input.expectedRevision}, current revision is ${document.revision}.`,
      "/expectedRevision",
    );
  }
  if (document.decisions.some((decision) => decision.decisionId === input.decisionId)) {
    throw new AnimationReviewError(
      "REVIEW_DECISION_TRANSITION_INVALID",
      `Decision ID ${input.decisionId} already exists.`,
      "/decisionId",
    );
  }
  const selected = document.findings.find(
    (finding) => finding.findingId === input.findingId,
  );
  if (selected === undefined) {
    throw new AnimationReviewError(
      "REVIEW_UNKNOWN_FINDING_REFERENCE",
      `Unknown finding ${input.findingId}.`,
      "/findingId",
    );
  }
  if (input.decision === "comment" && input.note.trim().length === 0) {
    throw new AnimationReviewError(
      "REVIEW_DECISION_TRANSITION_INVALID",
      "A comment decision requires a non-empty note.",
      "/note",
    );
  }
  const nextStatus = findingStatusAfterDecision(selected, input.decision);
  const revision = document.revision + 1;
  const findings = document.findings.map((finding) =>
    finding.findingId === selected.findingId
      ? { ...finding, status: nextStatus }
      : finding,
  );
  const nextReviewStatus =
    input.decision === "accept" ? "changes-requested" : document.status;
  return freezeDocument({
    ...document,
    revision,
    status: nextReviewStatus,
    findings,
    decisions: [
      ...document.decisions,
      {
        decisionId: input.decisionId,
        findingId: input.findingId,
        decision: input.decision,
        actorId: input.actorId,
        note: input.note,
        revision,
        createdAt: input.createdAt,
      },
    ],
    auditTrail: [
      ...document.auditTrail,
      {
        entryId: `audit-finding-decided-${revision}`,
        action: "finding-decided",
        actorId: input.actorId,
        revision,
        details: `${input.decision} ${input.findingId}.`,
        createdAt: input.createdAt,
      },
    ],
    updatedAt: input.createdAt,
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function serializeAnimationReviewDocument(
  document: AnimationReviewDocument,
): string {
  return `${JSON.stringify(canonicalize(document), null, 2)}\n`;
}

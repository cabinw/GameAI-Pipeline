import type { NormalizedRigAnimation } from "@gameai/rig-animation";

import { AnimationReviewError, sortReviewDiagnostics } from "./diagnostics";
import { validateAnimationReviewDocument } from "./parser";
import type {
  AnimationReviewDocument,
  AnimationReviewFinding,
  AnimationReviewProviderProposal,
  AppendAnimationReviewProposalInput,
  ParseAnimationReviewProviderProposalResult,
} from "./types";
import {
  ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION,
  ANIMATION_REVIEW_SCHEMA_VERSION,
} from "./types";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const PARAMETER_PATH_PATTERN =
  /^\/tracks\/([0-9]+)\/keyframes\/([0-9]+)\/value$/;
const PROPOSAL_KEYS = new Set([
  "protocolVersion",
  "proposalId",
  "providerId",
  "reviewId",
  "expectedRevision",
  "animationId",
  "sourceRevision",
  "findings",
]);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function immutableFinding(
  finding: AnimationReviewFinding,
): AnimationReviewFinding {
  return Object.freeze({
    ...finding,
    targetIds: Object.freeze([...finding.targetIds]),
    ...(finding.timeRange === undefined
      ? {}
      : { timeRange: Object.freeze({ ...finding.timeRange }) }),
    ...(finding.suggestion === undefined
      ? {}
      : { suggestion: Object.freeze({ ...finding.suggestion }) }),
  });
}

function freezeDocument(
  document: AnimationReviewDocument,
): AnimationReviewDocument {
  for (const value of Object.values(document)) {
    if (Array.isArray(value)) Object.freeze(value);
  }
  return Object.freeze(document);
}

function proposalShapeDiagnostics(
  value: unknown,
): ParseAnimationReviewProviderProposalResult {
  const object = record(value);
  if (object === null) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "PROVIDER_SCHEMA_VALIDATION_ERROR",
          path: "",
          message: "Provider proposal must be an object.",
        },
      ],
    };
  }
  if (
    "protocolVersion" in object &&
    object.protocolVersion !== ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "PROVIDER_UNSUPPORTED_PROTOCOL_VERSION",
          path: "/protocolVersion",
          message: `Only provider protocol ${ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION} is supported.`,
        },
      ],
    };
  }
  const invalidKeys = Object.keys(object).filter(
    (key) => !PROPOSAL_KEYS.has(key),
  );
  const ids = [
    object.proposalId,
    object.providerId,
    object.reviewId,
    object.animationId,
    object.sourceRevision,
  ];
  if (
    invalidKeys.length > 0 ||
    object.protocolVersion !== ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION ||
    ids.some(
      (id) =>
        typeof id !== "string" ||
        id.length > 160 ||
        !ID_PATTERN.test(id),
    ) ||
    !Number.isInteger(object.expectedRevision) ||
    (object.expectedRevision as number) < 0 ||
    !Array.isArray(object.findings) ||
    object.findings.length > 100
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "PROVIDER_SCHEMA_VALIDATION_ERROR",
          path: "",
          message: "Provider proposal shape is invalid.",
        },
      ],
    };
  }
  const proposal = object as unknown as AnimationReviewProviderProposal;
  const candidate: AnimationReviewDocument = {
    schemaVersion: ANIMATION_REVIEW_SCHEMA_VERSION,
    reviewId: proposal.reviewId,
    revision: proposal.expectedRevision,
    status: "in-review",
    subject: {
      characterId: "provider-validation-character",
      rigId: "provider-validation-rig",
      animationId: proposal.animationId,
      sourceRevision: proposal.sourceRevision,
      duration: 1,
      loop: true,
    },
    metrics: {
      duration: 1,
      trackCount: 0,
      keyframeCount: 0,
      animatedJointCount: 0,
      untrackedJointCount: 0,
      loopContinuityError: 0,
      maxAbsoluteRotationDegrees: 0,
      maxAngularSpeedDegreesPerSecond: 0,
      maxLinearSpeedUnitsPerSecond: 0,
    },
    findings: proposal.findings,
    checklist: [],
    decisions: [],
    adjustments: [],
    auditTrail: [],
    createdAt: "provider-validation",
    updatedAt: "provider-validation",
  };
  const parsed = validateAnimationReviewDocument(candidate);
  if (!parsed.ok) {
    return {
      ok: false,
      diagnostics: sortReviewDiagnostics(
        parsed.diagnostics.map((diagnostic) => ({
          code: "PROVIDER_SCHEMA_VALIDATION_ERROR" as const,
          message: diagnostic.message,
          ...(diagnostic.path === undefined
            ? {}
            : {
                path: diagnostic.path.replace(
                  /^\/findings/,
                  "/findings",
                ),
              }),
        })),
      ),
    };
  }
  const findingIds = new Set<string>();
  for (const [index, finding] of proposal.findings.entries()) {
    const suggestion = finding.suggestion;
    if (
      findingIds.has(finding.findingId) ||
      (finding.source !== "assistant" && finding.source !== "provider") ||
      finding.status !== "open" ||
      finding.providerId !== proposal.providerId ||
      finding.targetIds.length === 0 ||
      finding.timeRange === undefined ||
      finding.timeRange.start > finding.timeRange.end ||
      suggestion === undefined ||
      !PARAMETER_PATH_PATTERN.test(suggestion.parameterPath) ||
      !Number.isFinite(suggestion.minimum) ||
      !Number.isFinite(suggestion.maximum) ||
      suggestion.minimum > suggestion.maximum ||
      suggestion.proposedValue === undefined ||
      !Number.isFinite(suggestion.proposedValue) ||
      suggestion.proposedValue < suggestion.minimum ||
      suggestion.proposedValue > suggestion.maximum
    ) {
      return {
        ok: false,
        diagnostics: [
          {
            code: findingIds.has(finding.findingId)
              ? "PROVIDER_DUPLICATE_FINDING_ID"
              : "PROVIDER_SCHEMA_VALIDATION_ERROR",
            path: `/findings/${index}`,
            message:
              "Provider findings require a unique ID, open AI source, concrete location, bounded suggestion, confidence, and matching provenance.",
          },
        ],
      };
    }
    findingIds.add(finding.findingId);
  }
  return {
    ok: true,
    value: Object.freeze({
      ...proposal,
      findings: Object.freeze(proposal.findings.map(immutableFinding)),
    }),
    diagnostics: [],
  };
}

export function validateAnimationReviewProviderProposal(
  value: unknown,
): ParseAnimationReviewProviderProposalResult {
  return proposalShapeDiagnostics(value);
}

function assistantFinding(
  input: Omit<
    AnimationReviewFinding,
    "source" | "status" | "providerId" | "createdAt"
  >,
  createdAt: string,
): AnimationReviewFinding {
  return immutableFinding({
    ...input,
    source: "assistant",
    status: "open",
    providerId: "gameai-local-animation-assistant-v1",
    createdAt,
  });
}

export function createDeterministicAnimationAssistantProposal(
  document: AnimationReviewDocument,
  animation: NormalizedRigAnimation,
  createdAt: string,
): AnimationReviewProviderProposal {
  if (document.subject.animationId !== animation.animationId) {
    throw new AnimationReviewError(
      "PROVIDER_SUBJECT_MISMATCH",
      "Assistant animation does not match the review subject.",
      "/animationId",
    );
  }
  const existing = new Set(document.findings.map((finding) => finding.findingId));
  const findings: AnimationReviewFinding[] = [];
  for (const [trackIndex, track] of animation.tracks.entries()) {
    if (track.keyframes.length === 0) continue;
    const first = track.keyframes[0]!;
    const lastIndex = track.keyframes.length - 1;
    const last = track.keyframes[lastIndex]!;
    if (
      animation.loop &&
      typeof first.value === "number" &&
      typeof last.value === "number" &&
      Math.abs(first.value - last.value) > 0.001
    ) {
      const findingId = `assistant-loop-${trackIndex}-${lastIndex}`;
      if (!existing.has(findingId)) {
        findings.push(
          assistantFinding(
            {
              findingId,
              code: "ASSISTANT_LOOP_BOUNDARY_PROPOSAL",
              severity: "error",
              category: "loop",
              summary: `${track.jointId} can be closed at the loop boundary.`,
              diagnosis: `The final ${track.property} value ${last.value} differs from the initial value ${first.value}.`,
              targetIds: [track.jointId],
              timeRange: { start: last.time, end: last.time },
              suggestion: {
                summary: "Set the final scalar keyframe to the initial value.",
                parameterPath: `/tracks/${trackIndex}/keyframes/${lastIndex}/value`,
                minimum: first.value,
                maximum: first.value,
                proposedValue: first.value,
              },
              confidence: 1,
            },
            createdAt,
          ),
        );
      }
    }
    if (track.property !== "rotation") continue;
    for (const [keyframeIndex, keyframe] of track.keyframes.entries()) {
      if (
        typeof keyframe.value !== "number" ||
        Math.abs(keyframe.value) <= 90
      ) {
        continue;
      }
      const findingId = `assistant-rotation-range-${trackIndex}-${keyframeIndex}`;
      if (existing.has(findingId)) continue;
      const proposedValue = keyframe.value < 0 ? -90 : 90;
      findings.push(
        assistantFinding(
          {
            findingId,
            code: "ASSISTANT_ROTATION_RANGE_PROPOSAL",
            severity: "warning",
            category: "visual",
            summary: `${track.jointId} has a pronounced rotation pose.`,
            diagnosis: `The authored rotation offset is ${keyframe.value} degrees; the local assistant review threshold is 90 degrees.`,
            targetIds: [track.jointId],
            timeRange: { start: keyframe.time, end: keyframe.time },
            suggestion: {
              summary:
                "Optionally reduce the pose while staying inside the validator range.",
              parameterPath: `/tracks/${trackIndex}/keyframes/${keyframeIndex}/value`,
              minimum: -135,
              maximum: 135,
              proposedValue,
            },
            confidence: 0.78,
          },
          createdAt,
        ),
      );
    }
  }
  findings.sort((left, right) => left.findingId.localeCompare(right.findingId));
  return Object.freeze({
    protocolVersion: ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION,
    proposalId: `local-assistant-${animation.animationId}-${document.revision}`,
    providerId: "gameai-local-animation-assistant-v1",
    reviewId: document.reviewId,
    expectedRevision: document.revision,
    animationId: animation.animationId,
    sourceRevision: document.subject.sourceRevision,
    findings: Object.freeze(findings),
  });
}

export function appendAnimationReviewProviderProposal(
  document: AnimationReviewDocument,
  value: unknown,
  input: AppendAnimationReviewProposalInput,
): AnimationReviewDocument {
  const parsed = validateAnimationReviewProviderProposal(value);
  if (!parsed.ok) {
    const diagnostic = parsed.diagnostics[0]!;
    throw new AnimationReviewError(
      diagnostic.code,
      diagnostic.message,
      diagnostic.path,
    );
  }
  const proposal = parsed.value;
  if (
    proposal.reviewId !== document.reviewId ||
    proposal.animationId !== document.subject.animationId ||
    proposal.sourceRevision !== document.subject.sourceRevision
  ) {
    throw new AnimationReviewError(
      "PROVIDER_SUBJECT_MISMATCH",
      "Provider proposal does not match the active review subject.",
    );
  }
  if (proposal.expectedRevision !== document.revision) {
    throw new AnimationReviewError(
      "REVIEW_REVISION_INVALID",
      `Expected revision ${proposal.expectedRevision}, current revision is ${document.revision}.`,
      "/expectedRevision",
    );
  }
  const existing = new Set(document.findings.map((finding) => finding.findingId));
  const duplicate = proposal.findings.find((finding) =>
    existing.has(finding.findingId),
  );
  if (duplicate !== undefined) {
    throw new AnimationReviewError(
      "PROVIDER_DUPLICATE_FINDING_ID",
      `Finding ID ${duplicate.findingId} already exists in the review.`,
      "/findings",
    );
  }
  if (proposal.findings.length === 0) return document;
  const revision = document.revision + 1;
  return freezeDocument({
    ...document,
    revision,
    findings: Object.freeze([...document.findings, ...proposal.findings]),
    auditTrail: Object.freeze([
      ...document.auditTrail,
      Object.freeze({
        entryId: `audit-provider-analysis-${revision}`,
        action: "analysis-ran" as const,
        actorId: input.actorId,
        revision,
        details: `Accepted ${proposal.findings.length} validated finding(s) from ${proposal.providerId} via ${proposal.proposalId}.`,
        createdAt: input.createdAt,
      }),
    ]),
    updatedAt: input.createdAt,
  });
}

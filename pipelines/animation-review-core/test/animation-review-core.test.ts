import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { NormalizedRigAnimation } from "@gameai/rig-animation";

import {
  analyzeRigAnimation,
  appendAnimationReviewProviderProposal,
  applyAnimationReviewAdjustment,
  AnimationReviewError,
  createAnimationReviewDocument,
  createDeterministicAnimationAssistantProposal,
  decideAnimationReviewFinding,
  parseAnimationReviewAdapterRequest,
  parseAnimationReviewDocument,
  serializeAnimationReviewDocument,
  validateAnimationReviewAdapterRequest,
  validateAnimationReviewDocument,
  validateAnimationReviewProviderProposal,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples", "animation-review");
const fixedTime = "2026-07-31T00:00:00.000Z";

function animation(
  overrides: Partial<NormalizedRigAnimation> = {},
): NormalizedRigAnimation {
  return Object.freeze({
    schemaVersion: "1.0.0",
    animationId: "review-loop",
    rigId: "review-rig",
    rigSchemaVersion: "1.0.0",
    duration: 1,
    loop: true,
    tracks: Object.freeze([
      Object.freeze({
        jointId: "arm",
        property: "rotation" as const,
        keyframes: Object.freeze([
          Object.freeze({
            time: 0,
            value: 0,
            interpolation: "linear" as const,
            easing: "linear" as const,
          }),
          Object.freeze({
            time: 0.5,
            value: 180,
            interpolation: "linear" as const,
            easing: "linear" as const,
          }),
          Object.freeze({
            time: 1,
            value: 10,
            interpolation: "linear" as const,
            easing: "linear" as const,
          }),
        ]),
      }),
    ]),
    ...overrides,
  });
}

test("keeps canonical review schemas byte-identical to package copies", async () => {
  for (const file of [
    "animation-review.schema.json",
    "animation-review-engine-adapter.schema.json",
    "animation-review-patch.schema.json",
    "animation-review-session.schema.json",
    "animation-review-validation.schema.json",
    "animation-review-diagnosis.schema.json",
  ]) {
    assert.deepEqual(
      await readFile(path.join(repositoryRoot, "schemas", file)),
      await readFile(path.join(packageRoot, "dist", "schemas", file)),
    );
  }
});

test("parses the valid textual review and adapter request fixtures", async () => {
  const review = parseAnimationReviewDocument(
    await readFile(path.join(fixtureRoot, "minimal-review.json"), "utf8"),
  );
  assert.equal(review.ok, true);
  if (review.ok) {
    assert.equal(review.value.reviewId, "minimal-review");
    assert.equal(review.value.metrics.loopContinuityError, 0);
  }

  const request = parseAnimationReviewAdapterRequest(
    await readFile(
      path.join(fixtureRoot, "minimal-adapter-request.json"),
      "utf8",
    ),
  );
  assert.equal(request.ok, true);
  if (request.ok) {
    assert.equal(request.value.command, "seek");
    assert.equal(request.value.payload.time, 0.5);
  }
});

test("analyzes loop, range, speed, and coverage deterministically without mutation", () => {
  const source = animation();
  const before = JSON.stringify(source);
  const first = analyzeRigAnimation(source, ["arm", "hand"], fixedTime);
  const second = analyzeRigAnimation(
    Object.freeze({
      ...source,
      tracks: Object.freeze([...source.tracks].reverse()),
    }),
    ["hand", "arm", "hand"],
    fixedTime,
  );
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(source), before);
  assert.equal(first.metrics.loopContinuityError, 10);
  assert.equal(first.metrics.maxAbsoluteRotationDegrees, 180);
  assert.equal(first.metrics.maxAngularSpeedDegreesPerSecond, 360);
  assert.deepEqual(
    first.findings.map((finding) => finding.code),
    ["LOOP_DISCONTINUITY", "UNTRACKED_RIG_JOINTS", "EXTREME_ROTATION"],
  );
  assert.equal(
    first.checklist.find((item) => item.checkId === "loop-continuity")?.status,
    "failed",
  );
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.findings), true);
});

test("creates immutable byte-deterministic review documents", () => {
  const source = animation({ animationId: "deterministic-review" });
  const input = {
    reviewId: "review-1",
    sourceRevision: "source-v1",
    characterId: "character-1",
    animation: source,
    rigJointIds: ["arm", "hand"],
    createdAt: fixedTime,
  } as const;
  const first = createAnimationReviewDocument(input);
  const second = createAnimationReviewDocument(input);
  assert.deepEqual(first, second);
  assert.equal(
    serializeAnimationReviewDocument(first),
    serializeAnimationReviewDocument(second),
  );
  assert.equal(Object.isFrozen(first), true);
  assert.equal(first.revision, 0);
  assert.equal(first.auditTrail.length, 2);
  assert.throws(
    () => {
      (first as { revision: number }).revision = 10;
    },
    TypeError,
  );
});

test("records human finding decisions with optimistic revision protection", () => {
  const created = createAnimationReviewDocument({
    reviewId: "review-decisions",
    sourceRevision: "source-v1",
    characterId: "character-1",
    animation: animation(),
    rigJointIds: ["arm"],
    createdAt: fixedTime,
  });
  const loopFinding = created.findings.find(
    (finding) => finding.code === "LOOP_DISCONTINUITY",
  )!;
  const accepted = decideAnimationReviewFinding(created, {
    expectedRevision: 0,
    decisionId: "decision-1",
    findingId: loopFinding.findingId,
    decision: "accept",
    actorId: "human-reviewer",
    note: "Fix the loop boundary.",
    createdAt: "2026-07-31T00:01:00.000Z",
  });
  assert.equal(accepted.revision, 1);
  assert.equal(accepted.status, "changes-requested");
  assert.equal(
    accepted.findings.find(
      (finding) => finding.findingId === loopFinding.findingId,
    )?.status,
    "accepted",
  );
  assert.equal(created.revision, 0);
  assert.throws(
    () =>
      decideAnimationReviewFinding(created, {
        expectedRevision: 1,
        decisionId: "decision-stale",
        findingId: loopFinding.findingId,
        decision: "accept",
        actorId: "human-reviewer",
        note: "",
        createdAt: fixedTime,
      }),
    (error: unknown) =>
      error instanceof AnimationReviewError &&
      error.diagnostics[0]?.code === "REVIEW_REVISION_INVALID",
  );
  assert.throws(
    () =>
      decideAnimationReviewFinding(created, {
        expectedRevision: 0,
        decisionId: "decision-resolve-open",
        findingId: loopFinding.findingId,
        decision: "resolve",
        actorId: "human-reviewer",
        note: "",
        createdAt: fixedTime,
      }),
    (error: unknown) =>
      error instanceof AnimationReviewError &&
      error.diagnostics[0]?.code === "REVIEW_DECISION_TRANSITION_INVALID",
  );
});

test("validates provider output without granting it mutation authority", () => {
  const source = animation();
  const document = createAnimationReviewDocument({
    reviewId: "provider-boundary",
    sourceRevision: "source-v1",
    characterId: "character-1",
    animation: source,
    rigJointIds: ["arm"],
    createdAt: fixedTime,
  });
  const proposal = createDeterministicAnimationAssistantProposal(
    document,
    source,
    fixedTime,
  );
  assert.equal(validateAnimationReviewProviderProposal(proposal).ok, true);
  assert.equal(document.revision, 0);
  assert.equal(document.findings.some((finding) => finding.source === "assistant"), false);

  const invalid = {
    ...proposal,
    findings: proposal.findings.map((finding, index) =>
      index === 0
        ? {
            ...finding,
            suggestion: {
              ...finding.suggestion!,
              proposedValue: finding.suggestion!.maximum + 1,
            },
          }
        : finding,
    ),
  };
  const result = validateAnimationReviewProviderProposal(invalid);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.diagnostics[0]?.code,
      "PROVIDER_SCHEMA_VALIDATION_ERROR",
    );
  }
  assert.equal(document.revision, 0);

  const unknownTarget = {
    ...proposal,
    proposalId: "provider-unknown-target",
    findings: [
      {
        ...proposal.findings[0]!,
        findingId: "provider-unknown-target-finding",
        suggestion: {
          ...proposal.findings[0]!.suggestion!,
          parameterPath: "/tracks/99/keyframes/0/value",
        },
      },
    ],
  };
  assert.equal(
    validateAnimationReviewProviderProposal(unknownTarget).ok,
    true,
  );
  const appended = appendAnimationReviewProviderProposal(
    document,
    unknownTarget,
    {
      actorId: "human-reviewer",
      createdAt: "2026-07-31T00:01:00.000Z",
    },
  );
  const accepted = decideAnimationReviewFinding(appended, {
    expectedRevision: 1,
    decisionId: "decision-unknown-target",
    findingId: "provider-unknown-target-finding",
    decision: "accept",
    actorId: "human-reviewer",
    note: "Exercise provider target validation.",
    createdAt: "2026-07-31T00:02:00.000Z",
  });
  assert.throws(
    () =>
      applyAnimationReviewAdjustment(accepted, source, ["arm"], {
        expectedRevision: 2,
        adjustmentId: "adjustment-unknown-target",
        findingId: "provider-unknown-target-finding",
        parameterPath: "/tracks/99/keyframes/0/value",
        nextValue:
          unknownTarget.findings[0]!.suggestion.proposedValue!,
        actorId: "human-reviewer",
        createdAt: "2026-07-31T00:03:00.000Z",
      }),
    /not a known scalar keyframe/,
  );
  assert.equal(accepted.revision, 2);
});

test("completes assistant, human decision, constrained adjustment, reanalysis, and resolution without source mutation", () => {
  const source = animation();
  const before = JSON.stringify(source);
  const created = createAnimationReviewDocument({
    reviewId: "review-loop-round-trip",
    sourceRevision: "source-v1",
    characterId: "character-1",
    animation: source,
    rigJointIds: ["arm"],
    createdAt: fixedTime,
  });
  const proposal = createDeterministicAnimationAssistantProposal(
    created,
    source,
    "2026-07-31T00:01:00.000Z",
  );
  const loop = proposal.findings.find(
    (finding) => finding.code === "ASSISTANT_LOOP_BOUNDARY_PROPOSAL",
  )!;
  const rotation = proposal.findings.find(
    (finding) => finding.code === "ASSISTANT_ROTATION_RANGE_PROPOSAL",
  )!;
  const proposed = appendAnimationReviewProviderProposal(created, proposal, {
    actorId: "human-reviewer",
    createdAt: "2026-07-31T00:01:00.000Z",
  });
  const accepted = decideAnimationReviewFinding(proposed, {
    expectedRevision: 1,
    decisionId: "decision-accept-loop",
    findingId: loop.findingId,
    decision: "accept",
    actorId: "human-reviewer",
    note: "Apply the exact loop closure.",
    createdAt: "2026-07-31T00:02:00.000Z",
  });
  assert.throws(
    () =>
      decideAnimationReviewFinding(accepted, {
        expectedRevision: 2,
        decisionId: "decision-accept-loop",
        findingId: loop.findingId,
        decision: "comment",
        actorId: "human-reviewer",
        note: "Duplicate decision ID.",
        createdAt: "2026-07-31T00:02:30.000Z",
      }),
    /already exists/,
  );
  assert.equal(accepted.revision, 2);
  const adjusted = applyAnimationReviewAdjustment(
    accepted,
    source,
    ["arm"],
    {
      expectedRevision: 2,
      adjustmentId: "adjustment-loop",
      findingId: loop.findingId,
      parameterPath: loop.suggestion!.parameterPath,
      nextValue: loop.suggestion!.proposedValue!,
      actorId: "human-reviewer",
      createdAt: "2026-07-31T00:03:00.000Z",
    },
  );
  assert.equal(adjusted.document.revision, 3);
  assert.equal(adjusted.document.metrics.loopContinuityError, 0);
  assert.equal(adjusted.document.adjustments.length, 1);
  assert.equal(
    adjusted.document.auditTrail.at(-1)?.action,
    "analysis-ran",
  );
  assert.equal(JSON.stringify(source), before);

  const resolved = decideAnimationReviewFinding(adjusted.document, {
    expectedRevision: 3,
    decisionId: "decision-resolve-loop",
    findingId: loop.findingId,
    decision: "resolve",
    actorId: "human-reviewer",
    note: "Automatic reanalysis confirms the loop is closed.",
    createdAt: "2026-07-31T00:04:00.000Z",
  });
  const commented = decideAnimationReviewFinding(resolved, {
    expectedRevision: 4,
    decisionId: "decision-comment-rotation",
    findingId: rotation.findingId,
    decision: "comment",
    actorId: "human-reviewer",
    note: "The silhouette is intentional.",
    createdAt: "2026-07-31T00:05:00.000Z",
  });
  const rejected = decideAnimationReviewFinding(commented, {
    expectedRevision: 5,
    decisionId: "decision-reject-rotation",
    findingId: rotation.findingId,
    decision: "reject",
    actorId: "human-reviewer",
    note: "Keep the authored pose.",
    createdAt: "2026-07-31T00:06:00.000Z",
  });
  assert.equal(rejected.revision, 6);
  assert.equal(
    rejected.findings.find((finding) => finding.findingId === loop.findingId)
      ?.status,
    "resolved",
  );
  assert.equal(
    rejected.findings.find(
      (finding) => finding.findingId === rotation.findingId,
    )?.status,
    "rejected",
  );
  assert.equal(
    serializeAnimationReviewDocument(rejected),
    serializeAnimationReviewDocument(rejected),
  );
});

test("covers every public review parser diagnostic", async () => {
  const validText = await readFile(
    path.join(fixtureRoot, "minimal-review.json"),
    "utf8",
  );
  const valid = JSON.parse(validText) as Record<string, unknown>;
  const cases: Array<{
    value: unknown;
    code: string;
  }> = [
    {
      value: { ...valid, reviewId: "contains space" },
      code: "REVIEW_SCHEMA_VALIDATION_ERROR",
    },
    {
      value: {
        ...valid,
        findings: [
          {
            findingId: "duplicate",
            code: "TEST",
            source: "human",
            severity: "info",
            category: "visual",
            status: "open",
            summary: "One.",
            diagnosis: "One.",
            targetIds: [],
            confidence: 1,
            providerId: "human",
            createdAt: fixedTime,
          },
          {
            findingId: "duplicate",
            code: "TEST2",
            source: "human",
            severity: "info",
            category: "visual",
            status: "open",
            summary: "Two.",
            diagnosis: "Two.",
            targetIds: [],
            confidence: 1,
            providerId: "human",
            createdAt: fixedTime,
          },
        ],
      },
      code: "REVIEW_DUPLICATE_FINDING_ID",
    },
    {
      value: {
        ...valid,
        checklist: [
          {
            checkId: "duplicate",
            label: "One",
            status: "passed",
            details: "One.",
            relatedFindingIds: [],
          },
          {
            checkId: "duplicate",
            label: "Two",
            status: "passed",
            details: "Two.",
            relatedFindingIds: [],
          },
        ],
      },
      code: "REVIEW_DUPLICATE_CHECKLIST_ID",
    },
    {
      value: {
        ...valid,
        checklist: [
          {
            checkId: "unknown",
            label: "Unknown",
            status: "failed",
            details: "Unknown.",
            relatedFindingIds: ["missing-finding"],
          },
        ],
      },
      code: "REVIEW_UNKNOWN_FINDING_REFERENCE",
    },
    {
      value: {
        ...valid,
        revision: 0,
        auditTrail: [
          {
            entryId: "audit-invalid",
            action: "analysis-ran",
            actorId: "validator",
            revision: 1,
            details: "Future revision.",
            createdAt: fixedTime,
          },
        ],
      },
      code: "REVIEW_REVISION_INVALID",
    },
    {
      value: {
        ...valid,
        revision: 1,
        findings: [
          {
            findingId: "adjusted",
            code: "TEST",
            source: "human",
            severity: "info",
            category: "visual",
            status: "accepted",
            summary: "Adjusted.",
            diagnosis: "Adjusted.",
            targetIds: [],
            confidence: 1,
            providerId: "human",
            createdAt: fixedTime,
          },
        ],
        adjustments: [
          {
            adjustmentId: "adjustment-invalid",
            findingId: "adjusted",
            parameterPath: "/tracks/0/keyframes/0/value",
            previousValue: 1,
            nextValue: 1,
            actorId: "human",
            revision: 1,
            createdAt: fixedTime,
          },
        ],
      },
      code: "REVIEW_ADJUSTMENT_INVALID",
    },
  ];
  for (const item of cases) {
    const result = validateAnimationReviewDocument(item.value);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.diagnostics.some((diagnostic) => diagnostic.code === item.code),
        `${item.code}: ${JSON.stringify(result.diagnostics)}`,
      );
    }
  }
  assert.equal(parseAnimationReviewDocument("{").ok, false);
  const parseError = parseAnimationReviewDocument("{");
  if (!parseError.ok) {
    assert.equal(parseError.diagnostics[0]?.code, "REVIEW_JSON_PARSE_ERROR");
  }
  const unsupported = parseAnimationReviewDocument(
    await readFile(
      path.join(fixtureRoot, "invalid", "unsupported-review-version.json"),
      "utf8",
    ),
  );
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(
      unsupported.diagnostics[0]?.code,
      "REVIEW_UNSUPPORTED_SCHEMA_VERSION",
    );
  }
});

test("covers JSON, schema, version, and command-specific adapter diagnostics", async () => {
  const invalidPayload = parseAnimationReviewAdapterRequest(
    await readFile(
      path.join(fixtureRoot, "invalid", "invalid-adapter-payload.json"),
      "utf8",
    ),
  );
  assert.equal(invalidPayload.ok, false);
  if (!invalidPayload.ok) {
    assert.equal(
      invalidPayload.diagnostics[0]?.code,
      "ADAPTER_COMMAND_PAYLOAD_INVALID",
    );
  }
  const cases: Array<{ value: unknown; code: string }> = [
    {
      value: {
        kind: "request",
        protocolVersion: "2.0.0",
        requestId: "request-1",
        adapterId: "adapter-1",
        command: "describe",
        payload: {},
      },
      code: "ADAPTER_UNSUPPORTED_PROTOCOL_VERSION",
    },
    {
      value: {
        kind: "request",
        protocolVersion: "1.0.0",
        requestId: "",
        adapterId: "adapter-1",
        command: "describe",
        payload: {},
      },
      code: "ADAPTER_SCHEMA_VALIDATION_ERROR",
    },
  ];
  for (const item of cases) {
    const result = validateAnimationReviewAdapterRequest(item.value);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.diagnostics.some((diagnostic) => diagnostic.code === item.code),
      );
    }
  }
  const parseError = parseAnimationReviewAdapterRequest("{");
  assert.equal(parseError.ok, false);
  if (!parseError.ok) {
    assert.equal(parseError.diagnostics[0]?.code, "ADAPTER_JSON_PARSE_ERROR");
  }
});

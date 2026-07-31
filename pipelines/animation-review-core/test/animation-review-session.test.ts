import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedRigAnimation } from "@gameai/rig-animation";

import {
  ANIMATION_REVIEW_PATCH_SCHEMA_VERSION,
  AnimationReviewError,
  applyAnimationReviewPatch,
  createAnimationReviewSession,
  createAnimationReviewHumanFinding,
  createAnimationReviewHumanRule,
  decideAnimationReviewHumanRule,
  decideAnimationReviewPatch,
  editAnimationReviewPatch,
  exactResetAnimationReviewSession,
  parseAnimationReviewAdapterResponse,
  parseAnimationReviewSession,
  ANIMATION_REVIEW_SESSION_LIMITS,
  previewAnimationReviewPatch,
  proposeAnimationReviewPatch,
  redoAnimationReviewSession,
  resolveAnimationReviewFindingInSession,
  serializeAnimationReviewSession,
  serializeAnimationReviewPatch,
  serializeAnimationReviewValidation,
  serializeAnimationReviewDiagnosis,
  undoAnimationReviewSession,
  validateAnimationReviewAdapterResponse,
  validateAnimationReviewPatch,
  validateAnimationReviewSession,
  validateAnimationReviewValidation,
  validateAnimationReviewDiagnosis,
  type AnimationReviewPatchDocument,
  type AnimationReviewPatchOperation,
} from "../source";

const times = [
  "2026-07-31T01:00:00.000Z",
  "2026-07-31T01:01:00.000Z",
  "2026-07-31T01:02:00.000Z",
  "2026-07-31T01:03:00.000Z",
  "2026-07-31T01:04:00.000Z",
  "2026-07-31T01:05:00.000Z",
] as const;

function animation(): NormalizedRigAnimation {
  return Object.freeze({
    schemaVersion: "1.0.0",
    animationId: "session-clip",
    rigId: "session-rig",
    rigSchemaVersion: "1.0.0",
    duration: 1,
    loop: true,
    tracks: Object.freeze([
      Object.freeze({
        jointId: "arm",
        property: "rotation" as const,
        keyframes: Object.freeze([
          Object.freeze({ time: 0, value: 0, interpolation: "linear" as const, easing: "linear" as const }),
          Object.freeze({ time: 0.5, value: 170, interpolation: "linear" as const, easing: "linear" as const }),
          Object.freeze({ time: 1, value: 10, interpolation: "linear" as const, easing: "linear" as const }),
        ]),
      }),
      Object.freeze({
        jointId: "root",
        property: "position" as const,
        keyframes: Object.freeze([
          Object.freeze({ time: 0, value: Object.freeze({ x: 0, y: 0 }), interpolation: "linear" as const, easing: "linear" as const }),
          Object.freeze({ time: 1, value: Object.freeze({ x: 1, y: 0 }), interpolation: "linear" as const, easing: "linear" as const }),
        ]),
      }),
    ]),
  });
}

function session() {
  return createAnimationReviewSession({
    sessionId: "session-contract-test",
    characterId: "character-contract-test",
    activeClipId: "session-clip",
    sourceRevision: "source-revision-1",
    animation: animation(),
    rigJointIds: ["root", "arm"],
    parts: [
      { partId: "root", drawOrder: 0 },
      { partId: "arm", drawOrder: 1 },
    ],
    createdAt: times[0],
    actorId: "test-creator",
  });
}

function patch(
  patchId: string,
  operation: AnimationReviewPatchOperation,
): AnimationReviewPatchDocument {
  return {
    schemaVersion: ANIMATION_REVIEW_PATCH_SCHEMA_VERSION,
    patchId,
    expectedRevision: 0,
    source: "ai",
    status: "AI_PROPOSED",
    operation,
    actorId: "test-assistant",
    createdAt: times[0],
    updatedAt: times[0],
  };
}

const operations: readonly AnimationReviewPatchOperation[] = [
  { kind: "pivot-offset", partId: "arm", offset: { x: 2, y: -1 } },
  { kind: "rotation-offset", trackIndex: 0, keyframeIndex: 1, deltaDegrees: -20 },
  { kind: "keyframe-time", trackIndex: 0, keyframeIndex: 1, time: 0.4 },
  { kind: "keyframe-value", trackIndex: 1, keyframeIndex: 1, value: { x: 2, y: 1 } },
  { kind: "curve", trackIndex: 0, keyframeIndex: 1, interpolation: "step", easing: "ease-in-out-sine" },
  { kind: "layer-order", partId: "arm", drawOrder: 0 },
];

test("executes all six Patch kinds only through human decision, Preview, Apply, and reanalysis", () => {
  for (const [index, operation] of operations.entries()) {
    const source = session();
    const sourceBytes = serializeAnimationReviewSession(source);
    const proposed = proposeAnimationReviewPatch(source, patch(`patch-kind-${index}`, operation));
    assert.equal(proposed.patches[0]?.status, "AI_PROPOSED");
    assert.deepEqual(proposed.authoritativeState, source.authoritativeState);
    assert.throws(
      () =>
        applyAnimationReviewPatch(proposed, ["root", "arm"], {
          expectedRevision: proposed.revision,
          patchId: `patch-kind-${index}`,
          actorId: "human-reviewer",
          createdAt: times[1],
        }),
      (error: unknown) =>
        error instanceof AnimationReviewError &&
        error.diagnostics[0]?.code === "PATCH_PREVIEW_REQUIRED",
    );
    const accepted = decideAnimationReviewPatch(proposed, {
      expectedRevision: proposed.revision,
      patchId: `patch-kind-${index}`,
      decision: "accept",
      actorId: "human-reviewer",
      createdAt: times[1],
    });
    const previewed = previewAnimationReviewPatch(accepted, {
      expectedRevision: accepted.revision,
      patchId: `patch-kind-${index}`,
      actorId: "human-reviewer",
      createdAt: times[2],
    });
    assert.deepEqual(previewed.authoritativeState, source.authoritativeState);
    assert.notDeepEqual(previewed.preview?.state, source.authoritativeState);
    const applied = applyAnimationReviewPatch(previewed, ["root", "arm"], {
      expectedRevision: previewed.revision,
      patchId: `patch-kind-${index}`,
      actorId: "human-reviewer",
      createdAt: times[3],
    });
    assert.equal(applied.patches[0]?.status, "APPLIED");
    assert.equal(applied.preview, null);
    assert.equal(applied.historyCursor, 1);
    assert.equal(applied.auditTrail.at(-1)?.action, "analysis-ran");
    assert.equal(serializeAnimationReviewSession(source), sourceBytes);
    assert.equal(Object.isFrozen(applied), true);
  }
});

test("supports bounded human editing, optimistic concurrency, undo/redo, human rules, exact reset, and deterministic restore", () => {
  const created = session();
  const proposed = proposeAnimationReviewPatch(
    created,
    patch("patch-edit-history", operations[1]!),
  );
  assert.throws(
    () =>
      decideAnimationReviewPatch(proposed, {
        expectedRevision: 0,
        patchId: "patch-edit-history",
        decision: "accept",
        actorId: "human-reviewer",
        createdAt: times[1],
      }),
    /SESSION_REVISION_INVALID/,
  );
  const accepted = decideAnimationReviewPatch(proposed, {
    expectedRevision: proposed.revision,
    patchId: "patch-edit-history",
    decision: "accept",
    actorId: "human-reviewer",
    createdAt: times[1],
  });
  const edited = editAnimationReviewPatch(accepted, {
    expectedRevision: accepted.revision,
    patchId: "patch-edit-history",
    operation: {
      kind: "rotation-offset",
      trackIndex: 0,
      keyframeIndex: 1,
      deltaDegrees: -30,
    },
    actorId: "human-reviewer",
    createdAt: times[2],
  });
  const previewed = previewAnimationReviewPatch(edited, {
    expectedRevision: edited.revision,
    patchId: "patch-edit-history",
    actorId: "human-reviewer",
    createdAt: times[3],
  });
  const applied = applyAnimationReviewPatch(previewed, ["root", "arm"], {
    expectedRevision: previewed.revision,
    patchId: "patch-edit-history",
    actorId: "human-reviewer",
    createdAt: times[4],
  });
  const undone = undoAnimationReviewSession(applied, {
    expectedRevision: applied.revision,
    actorId: "human-reviewer",
    createdAt: times[4],
  });
  assert.deepEqual(undone.authoritativeState, created.authoritativeState);
  const redone = redoAnimationReviewSession(undone, {
    expectedRevision: undone.revision,
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  assert.deepEqual(redone.authoritativeState, applied.authoritativeState);
  const ruled = decideAnimationReviewHumanRule(redone, {
    expectedRevision: redone.revision,
    ruleId: "human-motion-quality",
    decision: "passed",
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  assert.equal(
    ruled.validation.find((rule) => rule.ruleId === "human-motion-quality")?.status,
    "passed",
  );
  const humanFinding = createAnimationReviewHumanFinding(ruled, {
    expectedRevision: ruled.revision,
    findingId: "human-finding-foot-slide",
    summary: "Foot contact appears to slide.",
    targetIds: ["root"],
    timeRange: { start: 0.2, end: 0.5 },
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  const humanRule = createAnimationReviewHumanRule(humanFinding, {
    expectedRevision: humanFinding.revision,
    ruleId: "human-foot-contact-quality",
    details: "A human must confirm planted foot contact.",
    relatedFindingIds: ["human-finding-foot-slide"],
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  assert.equal(
    humanRule.review.findings.find((finding) => finding.findingId === "human-finding-foot-slide")?.source,
    "human",
  );
  const resolved = resolveAnimationReviewFindingInSession(humanRule, {
    expectedRevision: humanRule.revision,
    decisionId: "decision-resolve-human-finding",
    findingId: "human-finding-foot-slide",
    decision: "resolve",
    actorId: "human-reviewer",
    note: "Reviewed against the applied pose.",
    createdAt: times[5],
  });
  assert.equal(
    resolved.review.findings.find((finding) => finding.findingId === "human-finding-foot-slide")?.status,
    "resolved",
  );
  const undoneAfterHumanData = undoAnimationReviewSession(resolved, {
    expectedRevision: resolved.revision,
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  const redoneAfterHumanData = redoAnimationReviewSession(undoneAfterHumanData, {
    expectedRevision: undoneAfterHumanData.revision,
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  assert.equal(
    redoneAfterHumanData.review.findings.find((finding) => finding.findingId === "human-finding-foot-slide")?.status,
    "resolved",
  );
  assert.equal(
    redoneAfterHumanData.validation.some((rule) => rule.ruleId === "human-foot-contact-quality"),
    true,
  );
  const serialized = serializeAnimationReviewSession(redoneAfterHumanData);
  assert.equal(serializeAnimationReviewSession(redoneAfterHumanData), serialized);
  const restored = parseAnimationReviewSession(serialized);
  assert.equal(restored.ok, true);
  if (restored.ok) assert.deepEqual(restored.value, redoneAfterHumanData);
  const reset = exactResetAnimationReviewSession(redoneAfterHumanData, ["root", "arm"], {
    expectedRevision: redoneAfterHumanData.revision,
    actorId: "human-reviewer",
    createdAt: times[5],
  });
  assert.deepEqual(reset.authoritativeState, reset.sourceState);
  assert.equal(reset.patches.length, 0);
  assert.equal(reset.history.length, 0);
  assert.equal(reset.preview, null);
});

test("fails closed on unknown versions, unknown fields, invalid targets, and malformed adapter responses", () => {
  const validPatch = patch("patch-validation", operations[0]!);
  assert.equal(validateAnimationReviewPatch(validPatch).ok, true);
  assert.equal(serializeAnimationReviewPatch(validPatch), serializeAnimationReviewPatch(validPatch));
  assert.equal(
    validateAnimationReviewPatch({ ...validPatch, unknown: true }).ok,
    false,
  );
  assert.equal(
    validateAnimationReviewPatch({ ...validPatch, schemaVersion: "9.0.0" }).ok,
    false,
  );
  assert.throws(
    () =>
      proposeAnimationReviewPatch(
        session(),
        patch("patch-unknown-target", {
          kind: "pivot-offset",
          partId: "missing",
          offset: { x: 1, y: 1 },
        }),
      ),
    /PATCH_TARGET_INVALID/,
  );
  assert.equal(validateAnimationReviewSession({ ...session(), unknown: true }).ok, false);
  const validSession = session();
  assert.equal(validateAnimationReviewValidation(validSession.validation[0]).ok, true);
  assert.equal(validateAnimationReviewDiagnosis(validSession.diagnoses[0]).ok, true);
  assert.equal(
    serializeAnimationReviewValidation(validSession.validation[0]!),
    serializeAnimationReviewValidation(validSession.validation[0]!),
  );
  assert.equal(
    serializeAnimationReviewDiagnosis(validSession.diagnoses[0]!),
    serializeAnimationReviewDiagnosis(validSession.diagnoses[0]!),
  );
  assert.equal(
    validateAnimationReviewValidation({ ...validSession.validation[0], schemaVersion: "9.0.0" }).ok,
    false,
  );
  assert.equal(
    validateAnimationReviewDiagnosis({ ...validSession.diagnoses[0], unknown: true }).ok,
    false,
  );
  assert.equal(
    validateAnimationReviewAdapterResponse({
      kind: "response",
      protocolVersion: "1.0.0",
      requestId: "response-test",
      adapterId: "adapter-test",
      ok: false,
      responseType: "error",
      error: { code: "TEST", message: "test" },
    }).ok,
    true,
  );
  assert.equal(parseAnimationReviewAdapterResponse("{").ok, false);
  assert.equal(
    validateAnimationReviewAdapterResponse({
      kind: "response",
      protocolVersion: "9.0.0",
      requestId: "response-test",
      adapterId: "adapter-test",
      ok: false,
      responseType: "error",
      error: { code: "TEST", message: "test" },
    }).ok,
    false,
  );
  const overBudget = `${" ".repeat(ANIMATION_REVIEW_SESSION_LIMITS.maxSerializedCharacters + 1)}`;
  const overBudgetResult = parseAnimationReviewSession(overBudget);
  assert.equal(overBudgetResult.ok, false);
  if (!overBudgetResult.ok) {
    assert.equal(overBudgetResult.diagnostics[0]?.code, "SESSION_BUDGET_EXCEEDED");
  }
  assert.equal(
    validateAnimationReviewSession({
      ...validSession,
      patches: Array.from(
        { length: ANIMATION_REVIEW_SESSION_LIMITS.maxPatches + 1 },
        (_, index) => ({ ...validPatch, patchId: `patch-budget-${index}` }),
      ),
    }).ok,
    false,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
  AnimationReviewAdapterSnapshot,
  AnimationReviewDocument,
  AnimationReviewSessionDocument,
} from "@gameai/animation-review-core";
import { ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION } from "@gameai/animation-review-core";

import {
  ANIMATION_REVIEW_UI_PROTOCOL_VERSION,
  AnimationReviewWorkspaceController,
  renderAnimationReviewWorkspaceMarkup,
} from "../source";

const snapshot: AnimationReviewAdapterSnapshot = {
  adapterId: "adapter",
  adapterRevision: 3,
  characterId: "red-cap",
  rigId: "red-cap-rig",
  playback: {
    status: "paused",
    time: 0.5,
    duration: 2,
    rate: 1,
    loop: true,
    clipId: "idle",
    availableClipIds: ["idle", "walk"],
  },
  capabilities: [],
  overlays: {
    skeleton: true,
    pivots: false,
    sockets: false,
    "hit-areas": false,
    attachments: false,
  },
  parts: [
    {
      partId: "torso",
      parentId: null,
      assetUrl: "/asset/torso.png",
      drawOrder: 1,
      width: 10,
      height: 20,
      anchor: { x: 0.5, y: 0.5 },
      visualOffset: { x: 0, y: 0 },
      worldTransform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
    },
  ],
  joints: [{ jointId: "torso", parentId: null, worldPivot: { x: 0, y: 0 } }],
  timeline: [],
  runtimeDiagnostics: { semanticInstances: 0 },
};

const review: AnimationReviewDocument = {
  schemaVersion: "1.0.0",
  reviewId: "review-ui",
  revision: 4,
  status: "in-review",
  subject: {
    characterId: "red-cap",
    rigId: "red-cap-rig",
    animationId: "red-cap-wave",
    sourceRevision: "source-v1",
    duration: 2,
    loop: true,
  },
  metrics: {
    duration: 2,
    trackCount: 1,
    keyframeCount: 2,
    animatedJointCount: 1,
    untrackedJointCount: 0,
    loopContinuityError: 0,
    maxAbsoluteRotationDegrees: 112,
    maxAngularSpeedDegreesPerSecond: 112,
    maxLinearSpeedUnitsPerSecond: 0,
  },
  findings: [
    {
      findingId: "assistant-rotation-range-0-1",
      code: "ASSISTANT_ROTATION_RANGE_PROPOSAL",
      source: "assistant",
      severity: "warning",
      category: "visual",
      status: "accepted",
      summary: "Pronounced rotation.",
      diagnosis: "The authored offset is above the assistant threshold.",
      targetIds: ["upper-arm-left"],
      timeRange: { start: 1, end: 1 },
      suggestion: {
        summary: "Reduce the pose.",
        parameterPath: "/tracks/0/keyframes/1/value",
        minimum: -135,
        maximum: 135,
        proposedValue: 90,
      },
      confidence: 0.78,
      providerId: "gameai-local-animation-assistant-v1",
      createdAt: "2026-07-31T00:00:00.000Z",
    },
  ],
  checklist: [],
  decisions: [],
  adjustments: [],
  auditTrail: [],
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

const editableState: AnimationReviewSessionDocument["sourceState"] = {
  animation: {
    schemaVersion: "1.0.0",
    animationId: "red-cap-wave",
    rigId: "red-cap-rig",
    rigSchemaVersion: "1.0.0",
    duration: 2,
    loop: true,
    tracks: [
      {
        jointId: "upper-arm-left",
        property: "rotation",
        keyframes: [
          { time: 0, value: 0, interpolation: "linear", easing: "linear" },
          { time: 1, value: 112, interpolation: "linear", easing: "linear" },
        ],
      },
    ],
  },
  parts: [{ partId: "torso", pivotOffset: { x: 0, y: 0 }, drawOrder: 1 }],
};

const session: AnimationReviewSessionDocument = {
  schemaVersion: "1.0.0",
  sessionId: "red-cap-wave-session",
  revision: 4,
  characterId: "red-cap",
  rigId: "red-cap-rig",
  activeClipId: "wave",
  sourceRevision: "source-v1",
  sourceState: editableState,
  authoritativeState: editableState,
  preview: null,
  patches: [
    {
      schemaVersion: "1.0.0",
      patchId: "patch-assistant-rotation-range-0-1",
      findingId: "assistant-rotation-range-0-1",
      expectedRevision: 1,
      source: "ai",
      status: "HUMAN_ACCEPTED",
      operation: {
        kind: "rotation-offset",
        trackIndex: 0,
        keyframeIndex: 1,
        deltaDegrees: -22,
      },
      actorId: "reviewer",
      createdAt: "2026-07-31T00:00:00.000Z",
      updatedAt: "2026-07-31T00:00:00.000Z",
    },
    {
      schemaVersion: "1.0.0",
      patchId: "patch-pending-human-decision",
      expectedRevision: 3,
      source: "ai",
      status: "AI_PROPOSED",
      operation: {
        kind: "pivot-offset",
        partId: "torso",
        offset: { x: 1, y: 0 },
      },
      actorId: "local-assistant",
      createdAt: "2026-07-31T00:00:00.000Z",
      updatedAt: "2026-07-31T00:00:00.000Z",
    },
  ],
  history: [],
  historyCursor: 0,
  review,
  validation: [
    {
      schemaVersion: "1.0.0",
      ruleId: "human-motion-quality",
      ruleKind: "human-judgment",
      status: "unresolved",
      details: "Human motion quality review is required.",
      relatedFindingIds: [],
    },
  ],
  diagnoses: [],
  auditTrail: [],
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

const sessionSummary = [
  {
    sessionId: session.sessionId,
    activeClipId: session.activeClipId,
    revision: session.revision,
    updatedAt: session.updatedAt,
  },
];

test("shares the exact protocol version and renders the compact control surface", () => {
  assert.equal(
    ANIMATION_REVIEW_UI_PROTOCOL_VERSION,
    ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
  );
  const markup = renderAnimationReviewWorkspaceMarkup(
    {
      connection: "connected",
      busy: false,
      snapshot,
      session,
      sessions: sessionSummary,
      review,
      error: null,
    },
    true,
  );
  for (const expected of [
    "Animation Review",
    'data-command="play"',
    'data-command="pause"',
    "data-session-reset",
    "data-step",
    "data-seek",
    "data-overlay",
    "Structure",
    "Structured runtime snapshot",
    "Open Standalone",
    "Patches",
    "Validation",
  ]) {
    assert.match(markup, new RegExp(expected));
  }
  assert.match(markup, /arw--compact/);
});

test("full workspace renders accepted sprites, overlays, tracks, and review panels", () => {
  const markup = renderAnimationReviewWorkspaceMarkup(
    {
      connection: "connected",
      busy: false,
      snapshot: {
        ...snapshot,
        overlays: { ...snapshot.overlays, pivots: true },
        overlayPrimitives: [
          {
            primitiveId: "pivot-torso",
            overlay: "pivots",
            shape: "point",
            label: "torso",
            x: 0,
            y: 0,
          },
        ],
      },
      session: null,
      sessions: [],
      review: null,
      error: null,
    },
    false,
  );
  assert.match(markup, /data-preview-clip="idle"/);
  assert.match(markup, /src="\/asset\/torso\.png"/);
  assert.match(markup, /data-overlay-shape="pivots"/);
  assert.match(markup, /Animation timeline tracks/);
  assert.match(markup, /No structured Session loaded/);
  assert.match(markup, /data-export/);
});

test("full workspace exposes validated AI, human decision, and bounded quick-edit controls", () => {
  const markup = renderAnimationReviewWorkspaceMarkup(
    {
      connection: "connected",
      busy: false,
      snapshot,
      session,
      sessions: sessionSummary,
      review,
      error: null,
    },
    false,
  );
  assert.match(markup, /data-review-assistant/);
  assert.match(markup, /data-patch-decision/);
  assert.match(markup, /data-patch-edit/);
  assert.match(markup, /data-patch-preview/);
  assert.match(markup, /data-review-decision="comment"/);
  assert.match(markup, /data-human-rule="passed"/);
  assert.match(markup, /data-create-human-finding/);
  assert.match(markup, /data-create-human-rule/);
  assert.match(markup, /rotation-offset/);
  assert.match(markup, /Human decisions/);
  assert.match(markup, /Revision history/);
});

test("controller correlates responses and sends optimistic runtime revisions", async () => {
  const requests: AnimationReviewAdapterRequest[] = [];
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    nextRequestId: (() => {
      let id = 0;
      return () => `request-${++id}`;
    })(),
    transport: {
      async request(
        request: AnimationReviewAdapterRequest,
      ): Promise<AnimationReviewAdapterResponse> {
        requests.push(request);
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot: {
            ...snapshot,
            adapterRevision:
              request.command === "describe" ? 3 : snapshot.adapterRevision + 1,
          },
        };
      },
    },
  });

  await controller.refresh();
  await controller.dispatch("seek", { time: 1 });
  assert.equal(requests[0]?.command, "describe");
  assert.equal(requests[0]?.expectedRevision, undefined);
  assert.equal(requests[1]?.command, "seek");
  assert.equal(requests[1]?.expectedRevision, 3);
  assert.equal(controller.state.snapshot?.adapterRevision, 4);
});

test("controller can synchronize a persisted Session clip into a live engine adapter", async () => {
  const requests: AnimationReviewAdapterRequest[] = [];
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    nextRequestId: (() => {
      let id = 0;
      return () => `sync-request-${++id}`;
    })(),
    transport: {
      async request(request) {
        requests.push(request);
        const clipId =
          request.command === "select-clip" &&
          typeof request.payload.clipId === "string"
            ? request.payload.clipId
            : "idle";
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot: {
            ...snapshot,
            adapterRevision: request.command === "describe" ? 3 : 4,
            playback: { ...snapshot.playback, clipId },
          },
        };
      },
      async readWorkspace() {
        return {
          snapshot,
          session: { ...session, activeClipId: "walk" },
          sessions: sessionSummary,
          review,
        };
      },
    },
  });

  await controller.refresh();
  await controller.synchronizeSessionClip();
  assert.deepEqual(
    requests.map((request) => request.command),
    ["describe", "select-clip"],
  );
  assert.equal(requests[1]?.expectedRevision, 3);
  assert.equal(requests[1]?.payload.clipId, "walk");
  assert.equal(controller.state.snapshot?.playback.clipId, "walk");
});

test("stopped reset state synchronizes the Session clip at paused time zero", async () => {
  const requests: AnimationReviewAdapterRequest[] = [];
  const stopped = {
    ...snapshot,
    playback: {
      ...snapshot.playback,
      status: "stopped" as const,
      time: 0,
    },
  };
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    nextRequestId: (() => {
      let id = 0;
      return () => `reset-sync-${++id}`;
    })(),
    transport: {
      async request(request) {
        requests.push(request);
        const selected = request.command !== "describe";
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot: {
            ...stopped,
            adapterRevision: selected ? requests.length + 2 : 3,
            playback: {
              ...stopped.playback,
              clipId: selected ? "walk" : "idle",
              status:
                request.command === "describe"
                  ? "stopped"
                  : request.command === "select-clip"
                    ? "playing"
                    : "paused",
            },
          },
        };
      },
      async readWorkspace() {
        return {
          snapshot: stopped,
          session: { ...session, activeClipId: "walk" },
          sessions: sessionSummary,
          review,
        };
      },
    },
  });

  await controller.refresh();
  await controller.synchronizeSessionClip();
  assert.deepEqual(
    requests.map((request) => request.command),
    ["describe", "select-clip", "seek"],
  );
  assert.equal(controller.state.snapshot?.playback.clipId, "walk");
  assert.equal(controller.state.snapshot?.playback.status, "paused");
  assert.equal(controller.state.snapshot?.playback.time, 0);
});

test("Cocos mode preserves the live engine Snapshot across Session mutations", async () => {
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    preserveAdapterSnapshotOnReviewAction: true,
    nextRequestId: () => "preserve-snapshot",
    transport: {
      async request(request) {
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot,
        };
      },
      async readWorkspace() {
        return { snapshot, session, sessions: sessionSummary, review };
      },
      async reviewAction() {
        return {
          snapshot: { ...snapshot, adapterRevision: 99 },
          session: { ...session, revision: 5 },
          review: { ...review, revision: 5 },
        };
      },
    },
  });

  await controller.refresh();
  await controller.runAssistant();
  assert.equal(controller.state.snapshot?.adapterRevision, 3);
  assert.equal(controller.state.session?.revision, 5);
  assert.equal(controller.state.review?.revision, 5);
});

test("controller fails closed on response identity drift", async () => {
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    nextRequestId: () => "request",
    transport: {
      async request(request) {
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: `${request.requestId}-wrong`,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot,
        };
      },
    },
  });
  await controller.refresh();
  assert.equal(controller.state.connection, "failed");
  assert.match(controller.state.error ?? "", /correlation/);
});

test("failed workspace is visibly read-only for all mutation surfaces", () => {
  const markup = renderAnimationReviewWorkspaceMarkup(
    {
      connection: "failed",
      busy: false,
      snapshot,
      session,
      sessions: sessionSummary,
      review,
      error: "Service disconnected.",
    },
    false,
  );
  for (const control of [
    "data-session-reset",
    "data-undo",
    "data-redo",
    "data-export",
    "data-review-assistant",
    "data-create-human-finding",
    "data-create-human-rule",
  ]) {
    assert.match(markup, new RegExp(`${control}[^>]* disabled`));
  }
});

test("controller sends optimistic Session revisions through the Patch lifecycle", async () => {
  const actions: Array<{
    action: string;
    payload: Readonly<Record<string, unknown>>;
  }> = [];
  let currentReview = review;
  let currentSession = session;
  const controller = new AnimationReviewWorkspaceController({
    adapterId: "adapter",
    nextRequestId: () => "describe-review-actions",
    nextMutationId: (() => {
      let id = 0;
      return () => `mutation-${++id}`;
    })(),
    now: () => "2026-07-31T01:00:00.000Z",
    actorId: "reviewer",
    transport: {
      async request(request) {
        return {
          kind: "response",
          protocolVersion: "1.0.0",
          requestId: request.requestId,
          adapterId: request.adapterId,
          ok: true,
          responseType: "snapshot",
          snapshot,
        };
      },
      async readWorkspace() {
        return {
          snapshot,
          session: currentSession,
          sessions: sessionSummary,
          review: currentReview,
        };
      },
      async reviewAction(action, payload) {
        actions.push({ action, payload });
        currentReview = {
          ...currentReview,
          revision: currentReview.revision + 1,
        };
        currentSession = {
          ...currentSession,
          revision: currentSession.revision + 1,
          review: currentReview,
        };
        return { snapshot, session: currentSession, review: currentReview };
      },
    },
  });
  await controller.refresh();
  await controller.runAssistant();
  await controller.decidePatch(
    "patch-assistant-rotation-range-0-1",
    "accept",
  );
  await controller.editPatch("patch-assistant-rotation-range-0-1", {
    kind: "rotation-offset",
    trackIndex: 0,
    keyframeIndex: 1,
    deltaDegrees: -20,
  });
  await controller.previewPatch("patch-assistant-rotation-range-0-1");
  await controller.applyPatch("patch-assistant-rotation-range-0-1");
  await controller.decideFinding(
    "assistant-rotation-range-0-1",
    "resolve",
    "Looks correct.",
  );
  assert.deepEqual(
    actions.map((item) => item.action),
    [
      "assistant",
      "patch-decision",
      "patch-edit",
      "patch-preview",
      "patch-apply",
      "finding-decision",
    ],
  );
  assert.deepEqual(
    actions.map((item) => item.payload.expectedRevision),
    [4, 5, 6, 7, 8, 9],
  );
  assert.equal(actions[0]?.payload.actorId, "reviewer");
  assert.equal(actions[5]?.payload.decisionId, "decision-mutation-1");
  assert.equal(controller.state.session?.revision, 10);
});

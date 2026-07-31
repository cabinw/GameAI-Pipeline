import assert from "node:assert/strict";
import test from "node:test";

import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
  AnimationReviewAdapterSnapshot,
  AnimationReviewDocument,
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
      review: null,
      error: null,
    },
    true,
  );
  for (const expected of [
    "Animation Review",
    'data-command="play"',
    'data-command="pause"',
    'data-command="exact-reset"',
    "data-step",
    "data-seek",
    "data-overlay",
    "Structure",
    "Structured runtime snapshot",
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
      review: null,
      error: null,
    },
    false,
  );
  assert.match(markup, /data-preview-clip="idle"/);
  assert.match(markup, /src="\/asset\/torso\.png"/);
  assert.match(markup, /data-overlay-shape="pivots"/);
  assert.match(markup, /Animation timeline tracks/);
  assert.match(markup, /No structured review loaded/);
  assert.match(markup, /data-export/);
});

test("full workspace exposes validated AI, human decision, and bounded quick-edit controls", () => {
  const markup = renderAnimationReviewWorkspaceMarkup(
    {
      connection: "connected",
      busy: false,
      snapshot,
      review,
      error: null,
    },
    false,
  );
  assert.match(markup, /data-review-assistant/);
  assert.match(markup, /data-review-decision="resolve"/);
  assert.match(markup, /data-review-decision="comment"/);
  assert.match(markup, /data-review-adjustment/);
  assert.match(markup, /min="-135" max="135"/);
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
          snapshot,
        };
      },
    },
  });
  await controller.refresh();
  assert.equal(controller.state.connection, "failed");
  assert.match(controller.state.error ?? "", /correlation/);
});

test("controller sends optimistic review revisions for assistant, decision, and adjustment actions", async () => {
  const actions: Array<{
    action: string;
    payload: Readonly<Record<string, unknown>>;
  }> = [];
  let currentReview = review;
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
          snapshot,
        };
      },
      async readReview() {
        return currentReview;
      },
      async reviewAction(action, payload) {
        actions.push({ action, payload });
        currentReview = {
          ...currentReview,
          revision: currentReview.revision + 1,
        };
        return { snapshot, review: currentReview };
      },
    },
  });
  await controller.refresh();
  await controller.runAssistant();
  await controller.decideFinding(
    "assistant-rotation-range-0-1",
    "resolve",
    "Looks correct.",
  );
  await controller.adjustFinding(
    "assistant-rotation-range-0-1",
    "/tracks/0/keyframes/1/value",
    90,
  );
  assert.deepEqual(
    actions.map((item) => item.action),
    ["assistant", "decision", "adjustment"],
  );
  assert.deepEqual(
    actions.map((item) => item.payload.expectedRevision),
    [4, 5, 6],
  );
  assert.equal(actions[0]?.payload.actorId, "reviewer");
  assert.equal(actions[1]?.payload.decisionId, "decision-mutation-1");
  assert.equal(actions[2]?.payload.adjustmentId, "adjustment-mutation-2");
  assert.equal(controller.state.review?.revision, 7);
});

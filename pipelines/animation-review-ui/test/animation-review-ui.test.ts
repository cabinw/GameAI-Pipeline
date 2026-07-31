import assert from "node:assert/strict";
import test from "node:test";

import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
  AnimationReviewAdapterSnapshot,
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

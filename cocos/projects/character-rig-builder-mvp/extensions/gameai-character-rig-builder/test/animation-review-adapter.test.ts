import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import type {
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterSnapshot,
} from "@gameai/animation-review-core";

import {
  COCOS_RED_CAP_REVIEW_ADAPTER_ID,
  executeCocosAnimationReviewRequest,
  type CocosAnimationReviewRuntime,
} from "../source/animation-review/cocos-review-adapter";

function request(
  command: AnimationReviewAdapterRequest["command"] = "describe",
  payload: AnimationReviewAdapterRequest["payload"] = {},
): AnimationReviewAdapterRequest {
  return {
    kind: "request",
    protocolVersion: "1.0.0",
    requestId: "request-1",
    adapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
    command,
    payload,
  };
}

function snapshot(revision = 0): AnimationReviewAdapterSnapshot {
  return {
    adapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
    adapterRevision: revision,
    characterId: "red-cap-production-v1",
    rigId: "red-cap-production-v1-layout",
    playback: {
      status: "stopped",
      time: 0,
      duration: 1,
      rate: 1,
      loop: true,
      clipId: "rest",
      availableClipIds: ["rest", "idle", "walk", "wave"],
    },
    capabilities: [],
    overlays: {
      skeleton: false,
      pivots: false,
      sockets: false,
      "hit-areas": false,
      attachments: false,
    },
    parts: [],
    joints: [],
    timeline: [],
    runtimeDiagnostics: {},
  };
}

test("preserves request identity and returns the selected runtime snapshot", () => {
  const seen: AnimationReviewAdapterRequest[] = [];
  const runtime: CocosAnimationReviewRuntime = {
    animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
    animationReviewExecute(value) {
      seen.push(value);
      return snapshot(4);
    },
  };
  const response = executeCocosAnimationReviewRequest(
    request("seek", { time: 0.5 }),
    [runtime],
  );
  assert.equal(response.requestId, "request-1");
  assert.equal(response.adapterId, COCOS_RED_CAP_REVIEW_ADAPTER_ID);
  assert.equal(response.ok, true);
  assert.equal(
    response.ok && response.responseType === "snapshot"
      ? response.snapshot.adapterRevision
      : -1,
    4,
  );
  assert.equal(seen[0]?.command, "seek");
});

test("returns lightweight playback observations without executing a mutating runtime command", () => {
  let executions = 0;
  const response = executeCocosAnimationReviewRequest(
    request("observe-playback"),
    [
      {
        animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
        animationReviewExecute() {
          executions += 1;
          return snapshot(5);
        },
        animationReviewSnapshot() {
          return snapshot(5);
        },
      },
    ],
  );
  assert.equal(response.ok, true);
  assert.equal(response.ok ? response.responseType : "error", "playback");
  assert.equal(
    response.ok && response.responseType === "playback"
      ? response.adapterRevision
      : -1,
    5,
  );
  assert.equal(executions, 0);
});

test("normalizes the public runtime's monotonic loop clock at the JSON adapter boundary", () => {
  const response = executeCocosAnimationReviewRequest(request("observe-playback"), [
    {
      animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
      animationReviewExecute() {
        return snapshot(6);
      },
      animationReviewSnapshot() {
        return {
          ...snapshot(6),
          playback: {
            ...snapshot(6).playback,
            status: "playing",
            loop: true,
            duration: 1.2,
            time: 4.369,
          },
        };
      },
    },
  ]);
  assert.equal(response.ok, true);
  assert.equal(response.ok ? response.responseType : "error", "playback");
  assert.ok(
    response.ok &&
      response.responseType === "playback" &&
      Math.abs(response.playback.time - 0.769) < 1e-9,
  );
});

test("prepares the existing public runtime lifecycle exactly once before live review", () => {
  let runtimeRoots = 0;
  let rebuilds = 0;
  const runtime: CocosAnimationReviewRuntime = {
    animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
    animationReviewExecute() {
      return {
        ...snapshot(1),
        runtimeDiagnostics: { runtimeRoots },
      };
    },
    animationReviewSnapshot() {
      return {
        ...snapshot(1),
        runtimeDiagnostics: { runtimeRoots },
      };
    },
    rebuild() {
      rebuilds += 1;
      runtimeRoots = 1;
    },
  };

  const first = executeCocosAnimationReviewRequest(request(), [runtime]);
  const second = executeCocosAnimationReviewRequest(request(), [runtime]);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(rebuilds, 1);
  assert.equal(
    first.ok && first.responseType === "snapshot"
      ? first.snapshot.runtimeDiagnostics.runtimeRoots
      : 0,
    1,
  );
});

test("fails closed before runtime mutation for invalid, missing, or ambiguous runtimes", () => {
  let executions = 0;
  const runtime: CocosAnimationReviewRuntime = {
    animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
    animationReviewExecute() {
      executions += 1;
      return snapshot();
    },
  };
  const invalid = executeCocosAnimationReviewRequest(
    { ...request(), protocolVersion: "2.0.0" },
    [runtime],
  );
  assert.equal(invalid.ok, false);
  assert.equal(
    invalid.ok ? "" : invalid.error.code,
    "ADAPTER_UNSUPPORTED_PROTOCOL_VERSION",
  );
  const missing = executeCocosAnimationReviewRequest(request(), []);
  assert.equal(missing.ok, false);
  assert.equal(
    missing.ok ? "" : missing.error.code,
    "COCOS_REVIEW_RUNTIME_NOT_FOUND",
  );
  const ambiguous = executeCocosAnimationReviewRequest(request(), [
    runtime,
    runtime,
  ]);
  assert.equal(ambiguous.ok, false);
  assert.equal(
    ambiguous.ok ? "" : ambiguous.error.code,
    "COCOS_REVIEW_RUNTIME_AMBIGUOUS",
  );
  assert.equal(executions, 0);
});

test("maps runtime failures and rejects snapshot identity drift", () => {
  const failed = executeCocosAnimationReviewRequest(request(), [
    {
      animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
      animationReviewExecute() {
        throw Object.assign(new Error("stale"), {
          code: "COCOS_REVIEW_STALE_REVISION",
        });
      },
    },
  ]);
  assert.equal(failed.ok, false);
  assert.equal(
    failed.ok ? "" : failed.error.code,
    "COCOS_REVIEW_STALE_REVISION",
  );

  const drifted = executeCocosAnimationReviewRequest(request(), [
    {
      animationReviewAdapterId: COCOS_RED_CAP_REVIEW_ADAPTER_ID,
      animationReviewExecute() {
        return { ...snapshot(), adapterId: "other" };
      },
    },
  ]);
  assert.equal(drifted.ok, false);
  assert.equal(
    drifted.ok ? "" : drifted.error.code,
    "COCOS_REVIEW_SNAPSHOT_INVALID",
  );
});

test("PROGRAM-015 runtime exposes the complete real review command surface", async () => {
  const source = await readFile(
    resolve(
      process.cwd(),
      "../../assets/gameai/red-cap-production/red-cap-production-motion-harness.ts",
    ),
    "utf8",
  );
  for (const contract of [
    "animationReviewAdapterId",
    "animationReviewExecute",
    "animationReviewSnapshot",
    "reviewAdapterRevision",
    "reviewJointMatrices",
    "redrawReviewOverlays",
    "synchronizeReviewSemantic",
    "COCOS_REVIEW_STALE_REVISION",
  ]) {
    assert.match(source, new RegExp(contract));
  }
  for (const command of [
    "describe",
    "select-clip",
    "play",
    "pause",
    "seek",
    "step",
    "set-rate",
    "set-loop",
    "set-overlay",
    "exact-reset",
  ]) {
    assert.match(source, new RegExp(`"${command}"`));
  }
  assert.match(source, /this\.playback\.update\(deltaSeconds\)/);
  assert.match(source, /this\.semantic\.advance\(deltaSeconds\)/);
  assert.match(source, /this\.playback = this\.createPlayback\("rest"\)/);
  assert.match(source, /AnimationReviewOverlay/);
  assert.doesNotMatch(source, /node:fs|node:path|node:crypto/);

  const sceneBridge = await readFile(
    resolve(process.cwd(), "source/scene.ts"),
    "utf8",
  );
  assert.match(sceneBridge, /prepareAnimationReviewRuntimes/);
  assert.match(
    sceneBridge,
    /be7c6f0a-24fc-45dc-9068-83d41ec078ca@f9941/,
  );
  assert.match(sceneBridge, /await loadSpriteFrame/);
  assert.match(sceneBridge, /editorReviewTimers = new WeakMap/);
  assert.match(sceneBridge, /editorReviewTimers\.has\(runtime\)/);
  assert.match(sceneBridge, /!runtime\.node\.activeInHierarchy/);
  assert.match(sceneBridge, /Math\.min\(/);
  assert.match(sceneBridge, /Math\.max\(/);
  assert.match(sceneBridge, /clearInterval\(timer\)/);

  const panelBridge = await readFile(
    resolve(process.cwd(), "source/panels/animation-review.ts"),
    "utf8",
  );
  assert.match(panelBridge, /preserveAdapterSnapshotOnReviewAction: true/);
  assert.match(panelBridge, /sync-animation-review-adapter/);
  assert.match(panelBridge, /request\.command !== "observe-playback"/);
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  executeMessageChain,
  type SceneResult,
  type SpikeEvidence,
} from "../source/message-chain";

describe("executeMessageChain", () => {
  it("records Panel, main, and Scene Script under one correlation ID", async () => {
    const timestamps = ["2026-07-23T01:00:01.000Z", "2026-07-23T01:00:02.000Z"];
    const sceneCalls: string[] = [];
    let written: SpikeEvidence | undefined;

    const result = await executeMessageChain(
      {
        correlationId: "task000-test",
        panelStartedAt: "2026-07-23T01:00:00.000Z",
      },
      {
        creatorVersion: "3.8.8",
        now: () => timestamps.shift() ?? "unexpected",
        async requestScene(correlationId): Promise<SceneResult> {
          sceneCalls.push(correlationId);
          return {
            stage: "scene",
            correlationId,
            sceneName: "Task000Scene",
            sceneUuid: "scene-uuid",
          };
        },
        async writeEvidence(evidence): Promise<void> {
          written = evidence;
        },
      },
    );

    assert.deepEqual(sceneCalls, ["task000-test"]);
    assert.deepEqual(result.stages, ["panel", "main", "scene"]);
    assert.equal(result.creatorVersion, "3.8.8");
    assert.equal(result.sceneResult.sceneName, "Task000Scene");
    assert.deepEqual(written, result);
  });

  it("rejects a Scene Script response with a different correlation ID", async () => {
    await assert.rejects(
      executeMessageChain(
        {
          correlationId: "expected",
          panelStartedAt: "2026-07-23T01:00:00.000Z",
        },
        {
          creatorVersion: "3.8.8",
          now: () => "2026-07-23T01:00:01.000Z",
          async requestScene(): Promise<SceneResult> {
            return {
              stage: "scene",
              correlationId: "wrong",
              sceneName: null,
              sceneUuid: null,
            };
          },
          async writeEvidence(): Promise<void> {
            throw new Error("must not write invalid evidence");
          },
        },
      ),
      /correlation mismatch/,
    );
  });
});

import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import type { AnimationReviewAdapterRequest } from "@gameai/animation-review-core";

import {
  RedCapFixtureAdapter,
  STANDALONE_RED_CAP_ADAPTER_ID,
  startAnimationReviewServer,
} from "../source";

const repositoryRoot = resolve(process.cwd(), "../..");

function describeRequest(): AnimationReviewAdapterRequest {
  return {
    kind: "request",
    protocolVersion: "1.0.0",
    requestId: "describe-1",
    adapterId: STANDALONE_RED_CAP_ADAPTER_ID,
    command: "describe",
    payload: {},
  };
}

test("serves a usable loopback workspace, accepted assets, adapter API, and export", async () => {
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot: resolve(repositoryRoot, "examples/red-cap-production-v1"),
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const running = await startAnimationReviewServer({
    adapter,
    host: "127.0.0.1",
    port: 0,
    mutationToken: "test-token",
    uiModulePath: resolve(
      repositoryRoot,
      "pipelines/animation-review-ui/dist/browser-esm/index.js",
    ),
  });
  try {
    const html = await fetch(running.url).then((response) => response.text());
    assert.match(html, /GameAI Animation Review Workspace/);
    assert.match(html, /src="\/app\.js"/);
    const app = await fetch(`${running.url}/app.js`).then((response) =>
      response.text(),
    );
    assert.match(app, /mountAnimationReviewWorkspace/);
    assert.match(app, /api\/review/);
    const ui = await fetch(`${running.url}/ui/index.js`).then((response) =>
      response.text(),
    );
    assert.match(ui, /AnimationReviewWorkspaceController/);

    const bootstrapResponse = await fetch(`${running.url}/api/bootstrap`);
    assert.equal(bootstrapResponse.headers.get("cache-control"), "no-store");
    assert.equal(
      bootstrapResponse.headers.get("x-content-type-options"),
      "nosniff",
    );
    const bootstrap = (await bootstrapResponse.json()) as {
      adapterId: string;
      mutationToken: string;
    };
    assert.equal(bootstrap.adapterId, STANDALONE_RED_CAP_ADAPTER_ID);
    assert.equal(bootstrap.mutationToken, "test-token");

    const workspace = (await fetch(`${running.url}/api/workspace`).then(
      (response) => response.json(),
    )) as {
      snapshot: { parts: unknown[]; overlayPrimitives: unknown[] };
      review: { checklist: unknown[] };
    };
    assert.equal(workspace.snapshot.parts.length, 19);
    assert.equal(workspace.snapshot.overlayPrimitives.length > 19, true);
    assert.equal(workspace.review.checklist.length > 0, true);

    const imageResponse = await fetch(
      `${running.url}/assets/parts/torso.png`,
    );
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");
    const signature = new Uint8Array(await imageResponse.arrayBuffer()).slice(
      0,
      8,
    );
    assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10]);

    const mutation = await fetch(`${running.url}/api/adapter`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-animation-review-token": "test-token",
        origin: running.url,
      },
      body: JSON.stringify(describeRequest()),
    });
    assert.equal(mutation.status, 200);
    const response = (await mutation.json()) as {
      requestId: string;
      ok: boolean;
    };
    assert.equal(response.requestId, "describe-1");
    assert.equal(response.ok, true);

    const exported = await fetch(`${running.url}/api/export`);
    assert.match(
      exported.headers.get("content-disposition") ?? "",
      /animation-review-export\.json/,
    );
    const bundle = (await exported.json()) as {
      exportVersion: string;
      source: { sourceReadOnly: boolean };
      originalAnimation: { animationId: string };
    };
    assert.equal(bundle.exportVersion, "1.0.0");
    assert.equal(bundle.source.sourceReadOnly, true);
    assert.equal(
      bundle.originalAnimation.animationId,
      "red-cap-production-v1-rest",
    );
  } finally {
    await running.close();
  }
});

test("serves an end-to-end AI and human review loop with optimistic review revisions", async () => {
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot: resolve(repositoryRoot, "examples/red-cap-production-v1"),
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const running = await startAnimationReviewServer({
    adapter,
    mutationToken: "review-loop-token",
    uiModulePath: resolve(
      repositoryRoot,
      "pipelines/animation-review-ui/dist/browser-esm/index.js",
    ),
  });
  const post = (path: string, value: unknown): Promise<Response> =>
    fetch(`${running.url}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-animation-review-token": "review-loop-token",
        origin: running.url,
      },
      body: JSON.stringify(value),
    });
  try {
    const selected = await post("/api/adapter", {
      ...describeRequest(),
      requestId: "select-wave",
      command: "select-clip",
      expectedRevision: 0,
      payload: { clipId: "wave" },
    });
    assert.equal(selected.status, 200);

    const assistantResponse = await post("/api/review/assistant", {
      expectedRevision: 0,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:01:00.000Z",
    });
    assert.equal(assistantResponse.status, 200);
    const assistant = (await assistantResponse.json()) as {
      review: {
        revision: number;
        findings: Array<{
          findingId: string;
          code: string;
          suggestion?: {
            parameterPath: string;
            proposedValue?: number;
          };
        }>;
      };
    };
    assert.equal(assistant.review.revision, 1);
    const finding = assistant.review.findings.find(
      (item) => item.code === "ASSISTANT_ROTATION_RANGE_PROPOSAL",
    )!;

    const stale = await post("/api/review/decision", {
      expectedRevision: 0,
      decisionId: "decision-stale",
      findingId: finding.findingId,
      decision: "accept",
      actorId: "reviewer",
      note: "",
      createdAt: "2026-07-31T00:02:00.000Z",
    });
    assert.equal(stale.status, 409);
    const afterStale = (await fetch(`${running.url}/api/workspace`).then(
      (response) => response.json(),
    )) as { review: { revision: number; decisions: unknown[] } };
    assert.equal(afterStale.review.revision, 1);
    assert.equal(afterStale.review.decisions.length, 0);

    const accepted = await post("/api/review/decision", {
      expectedRevision: 1,
      decisionId: "decision-accept",
      findingId: finding.findingId,
      decision: "accept",
      actorId: "reviewer",
      note: "Apply the local proposal.",
      createdAt: "2026-07-31T00:02:00.000Z",
    });
    assert.equal(accepted.status, 200);
    const adjusted = await post("/api/review/adjustment", {
      expectedRevision: 2,
      adjustmentId: "adjustment-wave",
      findingId: finding.findingId,
      parameterPath: finding.suggestion!.parameterPath,
      nextValue: finding.suggestion!.proposedValue,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:03:00.000Z",
    });
    assert.equal(adjusted.status, 200);
    const adjustedValue = (await adjusted.json()) as {
      review: { revision: number; adjustments: unknown[]; auditTrail: Array<{ action: string }> };
    };
    assert.equal(adjustedValue.review.revision, 3);
    assert.equal(adjustedValue.review.adjustments.length, 1);
    assert.equal(
      adjustedValue.review.auditTrail.at(-1)?.action,
      "analysis-ran",
    );

    const resolved = await post("/api/review/decision", {
      expectedRevision: 3,
      decisionId: "decision-resolve",
      findingId: finding.findingId,
      decision: "resolve",
      actorId: "reviewer",
      note: "Automatic reanalysis passed.",
      createdAt: "2026-07-31T00:04:00.000Z",
    });
    assert.equal(resolved.status, 200);

    const firstExport = await fetch(`${running.url}/api/export`).then(
      (response) => response.json(),
    );
    const secondExport = await fetch(`${running.url}/api/export`).then(
      (response) => response.json(),
    );
    assert.deepEqual(firstExport, secondExport);
    assert.match(
      (firstExport as { manifest: { proposedAnimationSha256: string } })
        .manifest.proposedAnimationSha256,
      /^[a-f0-9]{64}$/,
    );

    const rejectedProvider = await post("/api/review/provider", {
      actorId: "reviewer",
      createdAt: "2026-07-31T00:05:00.000Z",
      proposal: { protocolVersion: "2.0.0" },
    });
    assert.equal(rejectedProvider.status, 409);
  } finally {
    await running.close();
  }
});

test("fails closed for remote bind, bad mutation inputs, traversal, and stale revisions", async () => {
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot: resolve(repositoryRoot, "examples/red-cap-production-v1"),
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  await assert.rejects(
    startAnimationReviewServer({
      adapter,
      host: "0.0.0.0",
      uiModulePath: resolve(
        repositoryRoot,
        "pipelines/animation-review-ui/dist/browser-esm/index.js",
      ),
    }),
    /not loopback/,
  );
  const running = await startAnimationReviewServer({
    adapter,
    mutationToken: "test-token",
    uiModulePath: resolve(
      repositoryRoot,
      "pipelines/animation-review-ui/dist/browser-esm/index.js",
    ),
  });
  const post = (
    body: string,
    headers: Record<string, string> = {},
  ): Promise<Response> =>
    fetch(`${running.url}/api/adapter`, {
      method: "POST",
      headers,
      body,
    });
  try {
    assert.equal(
      (
        await post(JSON.stringify(describeRequest()), {
          "content-type": "application/json",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await post(JSON.stringify(describeRequest()), {
          "content-type": "text/plain",
          "x-animation-review-token": "test-token",
        })
      ).status,
      415,
    );
    assert.equal(
      (
        await post("{", {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(JSON.stringify({ value: "x".repeat(70_000) }), {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
        })
      ).status,
      413,
    );
    assert.equal(
      (
        await post(JSON.stringify(describeRequest()), {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
          origin: "https://example.invalid",
        })
      ).status,
      403,
    );
    const unsupported = await post(
      JSON.stringify({ ...describeRequest(), protocolVersion: "2.0.0" }),
      {
        "content-type": "application/json",
        "x-animation-review-token": "test-token",
      },
    );
    assert.equal(unsupported.status, 400);

    const first = {
      ...describeRequest(),
      requestId: "seek-1",
      command: "seek" as const,
      expectedRevision: 0,
      payload: { time: 0.5 },
    };
    assert.equal(
      (
        await post(JSON.stringify(first), {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(JSON.stringify({ ...first, requestId: "seek-stale" }), {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(
          `${running.url}/assets/%2e%2e/source/provenance.json`,
        )
      ).status,
      404,
    );
    assert.equal(
      (await fetch(`${running.url}/assets/character-rig.json`)).status,
      404,
    );
  } finally {
    await running.close();
  }
});

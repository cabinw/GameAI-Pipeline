import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import type { AnimationReviewAdapterRequest } from "@gameai/animation-review-core";

import {
  RedCapFixtureAdapter,
  AnimationReviewSessionStore,
  STANDALONE_RED_CAP_ADAPTER_ID,
  standaloneBrowserModule,
  startAnimationReviewServer,
} from "../source";

const repositoryRoot = resolve(process.cwd(), "../..");

async function sessionStore(): Promise<AnimationReviewSessionStore> {
  const root = await mkdtemp(join(tmpdir(), "animation-review-service-"));
  return new AnimationReviewSessionStore({
    sessionRoot: resolve(root, "sessions"),
    exportRoot: resolve(root, "exports"),
  });
}

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
  assert.match(standaloneBrowserModule(), /bootstrap = await readBootstrap\(\)/);
  assert.match(standaloneBrowserModule(), /response\.status === 403/);
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot: resolve(repositoryRoot, "examples/red-cap-production-v1"),
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const running = await startAnimationReviewServer({
    adapter,
    sessionStore: await sessionStore(),
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

test("serves propose, human decision/edit, Preview, Apply, reanalysis, undo/redo, and validation actions", async () => {
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot: resolve(repositoryRoot, "examples/red-cap-production-v1"),
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const running = await startAnimationReviewServer({
    adapter,
    sessionStore: await sessionStore(),
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
      session: {
        revision: number;
        patches: Array<{
          patchId: string;
          findingId?: string;
          status: string;
          operation: Record<string, unknown>;
        }>;
      };
      review: { findings: Array<{ findingId: string; code: string }> };
    };
    assert.equal(assistant.session.revision, 1);
    const finding = assistant.review.findings.find(
      (item) => item.code === "ASSISTANT_ROTATION_RANGE_PROPOSAL",
    )!;
    const patch = assistant.session.patches.find(
      (item) => item.findingId === finding.findingId,
    )!;
    assert.equal(patch.status, "AI_PROPOSED");

    const stale = await post("/api/review/patch-decision", {
      expectedRevision: 0,
      patchId: patch.patchId,
      decision: "accept",
      actorId: "reviewer",
      createdAt: "2026-07-31T00:02:00.000Z",
    });
    assert.equal(stale.status, 409);
    const afterStale = (await fetch(`${running.url}/api/workspace`).then(
      (response) => response.json(),
    )) as { session: { revision: number } };
    assert.equal(afterStale.session.revision, 1);

    const accepted = await post("/api/review/patch-decision", {
      expectedRevision: 1,
      patchId: patch.patchId,
      decision: "accept",
      actorId: "reviewer",
      createdAt: "2026-07-31T00:02:00.000Z",
    });
    assert.equal(accepted.status, 200);
    const editedOperation = {
      ...patch.operation,
      ...(patch.operation.kind === "rotation-offset"
        ? { deltaDegrees: Number(patch.operation.deltaDegrees) - 1 }
        : {}),
    };
    const edited = await post("/api/review/patch-edit", {
      expectedRevision: 2,
      patchId: patch.patchId,
      operation: editedOperation,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:03:00.000Z",
    });
    assert.equal(edited.status, 200);
    const preview = await post("/api/review/patch-preview", {
      expectedRevision: 3,
      patchId: patch.patchId,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:03:30.000Z",
    });
    assert.equal(preview.status, 200);
    const previewValue = (await preview.json()) as {
      session: { revision: number; preview: unknown; authoritativeState: unknown; sourceState: unknown };
    };
    assert.equal(previewValue.session.revision, 4);
    assert.notEqual(previewValue.session.preview, null);
    assert.deepEqual(previewValue.session.authoritativeState, previewValue.session.sourceState);

    const applied = await post("/api/review/patch-apply", {
      expectedRevision: 4,
      patchId: patch.patchId,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:00.000Z",
    });
    assert.equal(applied.status, 200);
    const appliedValue = (await applied.json()) as {
      session: { revision: number; historyCursor: number; auditTrail: Array<{ action: string }> };
    };
    assert.equal(appliedValue.session.revision, 5);
    assert.equal(appliedValue.session.historyCursor, 1);
    assert.equal(appliedValue.session.auditTrail.at(-1)?.action, "analysis-ran");

    assert.equal((await post("/api/review/undo", {
      expectedRevision: 5,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:10.000Z",
    })).status, 200);
    assert.equal((await post("/api/review/redo", {
      expectedRevision: 6,
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:20.000Z",
    })).status, 200);
    assert.equal((await post("/api/review/human-rule", {
      expectedRevision: 7,
      ruleId: "human-motion-quality",
      decision: "passed",
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:30.000Z",
    })).status, 200);
    assert.equal((await post("/api/review/human-finding-create", {
      expectedRevision: 8,
      findingId: "human-finding-silhouette",
      summary: "Check the hand silhouette at the wave apex.",
      targetIds: ["hand-left"],
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:40.000Z",
    })).status, 200);
    assert.equal((await post("/api/review/human-rule-create", {
      expectedRevision: 9,
      ruleId: "human-wave-silhouette",
      details: "A human must confirm the wave silhouette.",
      relatedFindingIds: ["human-finding-silhouette"],
      actorId: "reviewer",
      createdAt: "2026-07-31T00:04:50.000Z",
    })).status, 200);

    const resolved = await post("/api/review/finding-decision", {
      expectedRevision: 10,
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
      sessionStore: await sessionStore(),
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
    sessionStore: await sessionStore(),
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
        await post(JSON.stringify(first), {
          "content-type": "application/json",
          "x-animation-review-token": "test-token",
        })
      ).status,
      200,
    );
    const conflictingDuplicate = await post(
      JSON.stringify({ ...first, payload: { time: 0.75 } }),
      {
        "content-type": "application/json",
        "x-animation-review-token": "test-token",
      },
    );
    assert.equal(conflictingDuplicate.status, 409);
    assert.equal(
      ((await conflictingDuplicate.json()) as { error: { code: string } }).error.code,
      "WORKSPACE_DUPLICATE_REQUEST_ID",
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

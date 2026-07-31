import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  AnimationReviewSessionStore,
  RedCapFixtureAdapter,
  startAnimationReviewServer,
} from "../source";

const repositoryRoot = resolve(process.cwd(), "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-production-v1");
const uiModulePath = resolve(
  repositoryRoot,
  "pipelines/animation-review-ui/dist/browser-esm/index.js",
);

async function roots() {
  const root = await mkdtemp(join(tmpdir(), "animation-review-store-"));
  return {
    root,
    sessionRoot: resolve(root, "sessions"),
    exportRoot: resolve(root, "exports"),
  };
}

test("atomically restores an applied Session across local service processes", async () => {
  const paths = await roots();
  const store = new AnimationReviewSessionStore(paths);
  const firstAdapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const first = await startAnimationReviewServer({
    adapter: firstAdapter,
    sessionStore: store,
    mutationToken: "persistence-token",
    uiModulePath,
  });
  const post = (path: string, value: unknown): Promise<Response> =>
    fetch(`${first.url}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-animation-review-token": "persistence-token",
        origin: first.url,
      },
      body: JSON.stringify(value),
    });
  assert.equal(
    (
      await post("/api/adapter", {
        kind: "request",
        protocolVersion: "1.0.0",
        requestId: "persistence-select-wave",
        adapterId: firstAdapter.adapterId,
        command: "select-clip",
        expectedRevision: 0,
        payload: { clipId: "wave" },
      })
    ).status,
    200,
  );
  const assistant = await post("/api/review/assistant", {
    expectedRevision: 0,
    actorId: "human-reviewer",
    createdAt: "2026-07-31T00:01:00.000Z",
  });
  assert.equal(assistant.status, 200);
  const firstSession = (await assistant.json()) as {
    session: { sessionId: string; revision: number; patches: unknown[] };
  };
  assert.equal(firstSession.session.revision, 1);
  await first.close();

  const secondAdapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const second = await startAnimationReviewServer({
    adapter: secondAdapter,
    sessionStore: new AnimationReviewSessionStore(paths),
    mutationToken: "persistence-token-2",
    uiModulePath,
  });
  try {
    const restored = (await fetch(`${second.url}/api/workspace`).then(
      (response) => response.json(),
    )) as { session: { sessionId: string; revision: number; patches: unknown[] } };
    assert.equal(restored.session.sessionId, firstSession.session.sessionId);
    assert.equal(restored.session.revision, 1);
    assert.deepEqual(restored.session.patches, firstSession.session.patches);
    const saved = await readFile(
      resolve(paths.sessionRoot, `${restored.session.sessionId}.session.json`),
      "utf8",
    );
    assert.match(saved, /"schemaVersion": "1.0.0"/);
  } finally {
    await second.close();
  }
});

test("confines Session and export writes, rejects symlink targets and traversal IDs, and ignores interrupted temp files", async () => {
  const paths = await roots();
  const store = new AnimationReviewSessionStore(paths);
  await store.initialize();
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const session = adapter.sessionDocument();
  const interrupted = resolve(
    paths.sessionRoot,
    ".rest.session.json.0123456789abcdef.tmp",
  );
  await writeFile(interrupted, "partial", "utf8");
  await store.initialize();
  assert.deepEqual(await store.loadAll(), []);
  await assert.rejects(readFile(interrupted, "utf8"), /ENOENT/);
  await assert.rejects(
    store.save({ ...session, sessionId: "../escape" }),
    /stable identifier/,
  );
  const outside = resolve(paths.root, "outside.json");
  await writeFile(outside, "outside", "utf8");
  await symlink(
    outside,
    resolve(paths.sessionRoot, `${session.sessionId}.session.json`),
  );
  await assert.rejects(store.save(session), /not a regular file/);
  assert.equal(await readFile(outside, "utf8"), "outside");
  const exportPath = await store.writeExport("safe-export", { ok: true });
  assert.match(exportPath, /\/exports\/safe-export\.json$/);
  assert.deepEqual(JSON.parse(await readFile(exportPath, "utf8")), { ok: true });
});

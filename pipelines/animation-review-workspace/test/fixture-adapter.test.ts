import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import type { AnimationReviewAdapterRequest } from "@gameai/animation-review-core";

import {
  RedCapFixtureAdapter,
  STANDALONE_RED_CAP_ADAPTER_ID,
  resolveDeclaredAsset,
} from "../source";

const repositoryRoot = resolve(process.cwd(), "../..");
const fixtureRoot = resolve(
  repositoryRoot,
  "examples/red-cap-production-v1",
);

function request(
  command: AnimationReviewAdapterRequest["command"],
  payload: AnimationReviewAdapterRequest["payload"],
  expectedRevision?: number,
): AnimationReviewAdapterRequest {
  return {
    kind: "request",
    protocolVersion: "1.0.0",
    requestId: `request-${command}`,
    adapterId: STANDALONE_RED_CAP_ADAPTER_ID,
    command,
    payload,
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  };
}

test("loads the accepted Red Cap fixture and samples real layered parts deterministically", async () => {
  let now = 1_000;
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => now,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const rest = adapter.snapshot();
  assert.equal(rest.adapterId, STANDALONE_RED_CAP_ADAPTER_ID);
  assert.equal(rest.parts.length, 19);
  assert.equal(rest.joints.length, 19);
  assert.equal(rest.timeline.length, 1);
  assert.equal(rest.overlayPrimitives?.filter((item) => item.overlay === "pivots").length, 19);
  assert.equal(adapter.declaredAssets.size, 19);
  assert.match(rest.parts[0]?.assetUrl ?? "", /^\/assets\/parts\//);

  const selected = adapter.execute(
    request("select-clip", { clipId: "idle" }, 0),
  );
  assert.equal(selected.adapterRevision, 1);
  assert.equal(selected.playback.status, "playing");
  assert.equal(selected.timeline.length, 5);
  now += 500;
  assert.equal(adapter.snapshot().playback.time, 0.5);

  const paused = adapter.execute(request("pause", {}, 1));
  assert.equal(paused.playback.status, "paused");
  assert.equal(paused.adapterRevision, 2);
  assert.throws(
    () => adapter.execute(request("seek", { time: 1 }, 1)),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code ===
        "WORKSPACE_STALE_ADAPTER_REVISION",
  );
  const overlay = adapter.execute(
    request(
      "set-overlay",
      { overlay: "skeleton", enabled: true },
      2,
    ),
  );
  assert.equal(overlay.overlays.skeleton, true);
  assert.equal(
    overlay.overlayPrimitives?.some((item) => item.overlay === "skeleton"),
    true,
  );
});

test("review and export inputs are deterministic and source animations remain read-only", async () => {
  const sourcePath = resolve(fixtureRoot, "animations/rest.json");
  const before = await readFile(sourcePath, "utf8");
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  const first = adapter.reviewDocument();
  const second = adapter.reviewDocument();
  assert.deepEqual(first, second);
  assert.equal(first.subject.characterId, "red-cap-production-v1");
  assert.equal(first.subject.animationId, "red-cap-production-v1-rest");
  assert.equal(first.checklist.length > 0, true);
  adapter.execute(request("seek", { time: 0.5 }, 0));
  adapter.execute(request("exact-reset", {}, 1));
  assert.equal(adapter.snapshot().playback.clipId, "rest");
  assert.equal(adapter.snapshot().playback.time, 0);
  assert.equal(await readFile(sourcePath, "utf8"), before);
  assert.equal(adapter.originalAnimationText(), before);
});

test("runs the Session-owned AI proposal, human edit, Preview, Apply, reanalysis, undo/redo, and deterministic export loop", async () => {
  const sourcePath = resolve(fixtureRoot, "animations/wave.json");
  const sourceBefore = await readFile(sourcePath, "utf8");
  const adapter = await RedCapFixtureAdapter.load({
    fixtureRoot,
    nowMilliseconds: () => 0,
    createdAt: "2026-07-31T00:00:00.000Z",
  });
  adapter.execute(request("select-clip", { clipId: "wave" }, 0));
  const assistant = adapter.runAssistant({
    expectedRevision: 0,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:01:00.000Z",
  });
  const finding = assistant.review.findings.find(
    (item) => item.code === "ASSISTANT_ROTATION_RANGE_PROPOSAL",
  )!;
  const patch = assistant.session.patches.find(
    (item) => item.findingId === finding.findingId,
  )!;
  assert.equal(finding.source, "assistant");
  assert.equal(finding.status, "open");
  assert.ok(finding.suggestion);
  assert.equal(patch.status, "AI_PROPOSED");
  assert.deepEqual(
    assistant.session.authoritativeState,
    assistant.session.sourceState,
  );

  assert.throws(
    () =>
      adapter.applyPatch({
        expectedRevision: 1,
        patchId: patch.patchId,
        actorId: "reviewer",
        createdAt: "2026-07-31T00:02:00.000Z",
      }),
    /PATCH_PREVIEW_REQUIRED/,
  );
  const accepted = adapter.decidePatch({
    expectedRevision: 1,
    patchId: patch.patchId,
    decision: "accept",
    actorId: "reviewer",
    createdAt: "2026-07-31T00:02:00.000Z",
  });
  assert.equal(accepted.session.revision, 2);
  assert.throws(
    () =>
      adapter.editPatch({
        expectedRevision: 1,
        patchId: patch.patchId,
        operation: patch.operation,
        actorId: "reviewer",
        createdAt: "2026-07-31T00:03:00.000Z",
      }),
    /SESSION_REVISION_INVALID/,
  );
  const edited = adapter.editPatch({
    expectedRevision: 2,
    patchId: patch.patchId,
    operation:
      patch.operation.kind === "rotation-offset"
        ? { ...patch.operation, deltaDegrees: patch.operation.deltaDegrees - 1 }
        : patch.operation,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:03:00.000Z",
  });
  const previewed = adapter.previewPatch({
    expectedRevision: edited.session.revision,
    patchId: patch.patchId,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:03:30.000Z",
  });
  assert.deepEqual(
    previewed.session.authoritativeState,
    previewed.session.sourceState,
  );
  assert.notEqual(previewed.session.preview, null);
  const applied = adapter.applyPatch({
    expectedRevision: previewed.session.revision,
    patchId: patch.patchId,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:04:00.000Z",
  });
  assert.equal(applied.session.patches.find((item) => item.patchId === patch.patchId)?.status, "APPLIED");
  assert.equal(applied.session.historyCursor, 1);
  assert.equal(applied.session.auditTrail.at(-1)?.action, "analysis-ran");
  const appliedAnimation = adapter.authoritativeAnimation();
  const undone = adapter.undo({
    expectedRevision: applied.session.revision,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:04:30.000Z",
  });
  assert.deepEqual(undone.session.authoritativeState, undone.session.sourceState);
  const redone = adapter.redo({
    expectedRevision: undone.session.revision,
    actorId: "reviewer",
    createdAt: "2026-07-31T00:04:45.000Z",
  });
  assert.deepEqual(adapter.authoritativeAnimation(), appliedAnimation);

  const resolved = adapter.resolveFinding({
    expectedRevision: redone.session.revision,
    decisionId: "decision-resolve",
    findingId: finding.findingId,
    decision: "resolve",
    actorId: "reviewer",
    note: "Reanalysis completed.",
    createdAt: "2026-07-31T00:05:00.000Z",
  });
  assert.equal(
    resolved.review.findings.find(
      (item) => item.findingId === finding.findingId,
    )?.status,
    "resolved",
  );
  assert.equal(await readFile(sourcePath, "utf8"), sourceBefore);
  assert.equal(adapter.originalAnimationText(), sourceBefore);

  const firstExport = adapter.exportBundle() as {
    review: { revision: number; decisions: unknown[]; adjustments: unknown[] };
    session: { revision: number; history: unknown[]; patches: unknown[] };
    proposedAnimation: { animationId: string };
    manifest: {
      algorithm: string;
      reviewSha256: string;
      sessionSha256: string;
      originalAnimationSha256: string;
      proposedAnimationSha256: string;
    };
  };
  const secondExport = adapter.exportBundle();
  assert.deepEqual(firstExport, secondExport);
  assert.equal(firstExport.session.revision, resolved.session.revision);
  assert.equal(firstExport.session.history.length, 1);
  assert.equal(firstExport.session.patches.length > 0, true);
  assert.equal(
    firstExport.proposedAnimation.animationId,
    "red-cap-production-v1-wave",
  );
  assert.equal(firstExport.manifest.algorithm, "sha256");
  for (const hash of [
    firstExport.manifest.reviewSha256,
    firstExport.manifest.sessionSha256,
    firstExport.manifest.originalAnimationSha256,
    firstExport.manifest.proposedAnimationSha256,
  ]) {
    assert.match(hash, /^[a-f0-9]{64}$/);
  }
});

test("declared asset resolver rejects traversal, undeclared files, and escaping symlinks", async () => {
  await assert.rejects(
    resolveDeclaredAsset(fixtureRoot, new Set(["parts/torso.png"]), "../source/provenance.json"),
    /not declared/,
  );
  await assert.rejects(
    resolveDeclaredAsset(
      fixtureRoot,
      new Set(["parts/torso.png"]),
      "character-rig.json",
    ),
    /not declared/,
  );
  assert.match(
    await resolveDeclaredAsset(
      fixtureRoot,
      new Set(["parts/torso.png"]),
      "parts/torso.png",
    ),
    /parts\/torso\.png$/,
  );

  const root = await mkdtemp(join(tmpdir(), "animation-review-assets-"));
  const outside = resolve(root, "../outside-review-asset.txt");
  await writeFile(outside, "outside", "utf8");
  await symlink(outside, resolve(root, "escape.png"));
  await assert.rejects(
    resolveDeclaredAsset(root, new Set(["escape.png"]), "escape.png"),
    /escaped/,
  );
});

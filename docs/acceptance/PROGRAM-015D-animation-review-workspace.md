# PROGRAM-015D Animation Review Workspace Acceptance

## Status

D1–D4 implementation complete; final publication gates are in progress.
External code, standalone UI, compact Cocos Panel, and Creator runtime review
is intentionally deferred to the Draft PR.

## Baseline

- Exact `main` and `origin/main`:
  `8e12a07619ec1bfc9c47590b862f91fbf2edf669`.
- Branch: `feat/task-015d-animation-review-workspace`.
- `v0.5.0` annotated tag object:
  `ee030924b6728f5f7b6ff9afc1339a58047adca3`.
- `v0.5.0^{}`:
  `8e12a07619ec1bfc9c47590b862f91fbf2edf669`.
- GitHub Release ID: `362672704`.
- Rights SHA-256:
  `335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`.
- Provenance SHA-256:
  `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
- Local protected policy backup:
  `a910e0ca44fd5f77fb12e575208eb9b05323a009`.
- Local protected Sharp fix:
  `96eaa1c329f18011497cc2b34b76a7faf91c3b92`.
- Baseline `CI=true pnpm verify`: 508/508 PASS.
- Baseline tracked MP4: 0.

The complete Phase 0 ref, Release, and worktree inventory is recorded in
[`tasks/PROGRAM-015D-animation-review-workspace.md`](../../tasks/PROGRAM-015D-animation-review-workspace.md).

## Acceptance model

Visual review complements but does not replace contract, service, protocol,
revision, security, and tracked-only tests. Automated checks complement but do
not replace final Cocos Creator lifecycle and UI review.

The program stops only once, after the exact four commits are pushed and the
Draft PR is created, for the following combined external gate:

1. engine-neutral core and service code review;
2. standalone workspace visual/usability review;
3. compact Cocos Panel review;
4. Creator 3.8.x runtime control/snapshot/lifecycle review.

No earlier D1/D2/D3 checkpoint requests external acceptance.

## D1 — Review Contracts & Core — PASS

- Canonical Review Document 1.0 and Engine Adapter Protocol 1.0 schemas are
  byte-identical to the copies built into `@gameai/animation-review-core`.
- Seven focused tests cover every published parser diagnostic, valid and
  invalid textual fixtures, metrics/findings/checklist determinism, immutable
  source inputs, canonical serialization, optimistic revisions, decision
  transitions, and command-specific adapter validation.
- `CI=true pnpm --filter @gameai/animation-review-core test`: 7/7 PASS.
- `CI=true pnpm verify`: 515/515 PASS.
- D1 changes 34 files and 3,661 lines within the recorded 36-file/7,500-line
  commit gate. The lockfile adds only one workspace importer and resolves no
  new dependency version.
- D1 modifies no Cocos runtime, Scene, `.meta`, accepted asset, generated
  mirror, binary, media, tag, Release, worktree, or protected ref. Tracked MP4
  remains zero, and the rights/provenance hashes remain exact.

## D2 — Cocos Adapter & Compact Panel — PASS

- One shared dependency-free TypeScript UI controller/DOM renderer is built as
  CommonJS for Cocos and browser ESM for standalone. Three focused tests cover
  compact markup, protocol identity, optimistic revision dispatch, and
  response-correlation failure.
- The registered dockable Panel uses the shared UI and sends Panel → Main →
  Scene requests with exact protocol, request, and adapter identity. Four
  focused adapter/runtime tests cover validation, unique runtime selection,
  missing/ambiguous runtime rejection, runtime errors, snapshot drift, and the
  complete command surface.
- The active PROGRAM-015 motion harness provides actual clip/play/pause/seek/
  step/rate/loop/overlay/reset operations, one overlay renderer, portable
  structure/timeline snapshots, semantic scrub synchronization, stale
  revision protection, and lifecycle diagnostics without duplicate roots,
  input, targets, or renderers.
- Focused UI tests pass 3/3; extension tests pass 297/297; project tests pass
  9/9; strict extension and clean-checkout project typechecks pass.
- `CI=true pnpm verify`: 522/522 PASS. D2 changes exactly 20 files and 1,591
  lines within its 20-file/5,000-line gate. The lockfile adds workspace links
  only and resolves no new third-party version.
- Generated closure and complete metadata audits pass. No Scene, `.meta`,
  accepted asset, binary, evidence, or media file changes; tracked MP4 remains
  zero and protected rights/provenance hashes remain exact.

## D3 — Standalone Workspace MVP — PASS

- `pnpm review:animation` builds and starts the shared browser UI and local
  service on an ephemeral `127.0.0.1` port using the explicitly selected,
  accepted Red Cap fixture.
- The fixture adapter parses accepted Character Rig, Rig Layout, and four Rig
  Animation documents, samples the shared evaluator, and exposes 19 real PNG
  parts, portable transforms, structure, timeline, sockets, hit areas,
  attachments, metrics, findings, and checklist state without source writes.
- The full shared UI renders layered sprites, playback/seek/step/rate/loop,
  five overlay types, track keyframes, structure, findings/checklist,
  structured state, and explicit JSON download export.
- Five focused tests cover deterministic fixture sampling/review, source byte
  preservation, real PNG delivery, loopback startup, UI/bootstrap/workspace/
  command/export endpoints, mutation token/origin/content-type/body/version/
  revision checks, undeclared asset rejection, traversal, and escaping
  symlinks.
- Shared UI tests pass 4/4, workspace tests pass 5/5, and
  `CI=true pnpm verify` passes 528/528.
- D3 changes 21 files and 1,832 lines within its 24-file/6,500-line gate, with
  zero binary, media, Scene, or `.meta` files.
  Service runtime requires no external network, credentials, Creator cache,
  cloud model, untracked input, or ignored experimental asset.

## D4 — AI + Human Review Loop — PASS

- Provider protocol `1.0.0` validates exact proposal shape, subject and
  expected-revision identity, unique findings, concrete scalar keyframe
  locations, target/time range, bounded proposed value, confidence, and
  provenance. Validation does not mutate review or animation state.
- The built-in deterministic assistant returns stable loop-boundary and
  rotation-range proposals. Re-running against the same review does not
  duplicate an existing finding.
- Human accept/reject/resolve/comment and adjustment operations use optimistic
  review revisions and immutable decision/audit records. Invalid transitions,
  stale revisions, duplicate IDs, unknown/non-scalar targets, unaccepted
  proposals, and non-finite/out-of-range/no-op edits fail before mutation.
- An accepted quick edit clones the proposed normalized animation, preserves
  the accepted source clip bytes, reruns metrics/findings/checklist, and
  records both the adjustment and automatic analysis at the new revision.
- The standalone UI exposes the full action loop and refreshed preview;
  process-local assistant/provider/decision/adjustment routes retain the D3
  token, same-origin, JSON, body-size, and loopback boundaries.
- Export contains source/adapter/review identity, complete review state,
  original animation, current proposed animation, and SHA-256 review/source/
  proposal manifests. Two unchanged exports are identical without video.
- Focused core tests pass 9/9, shared UI tests pass 6/6, and standalone
  workspace/service tests pass 7/7.
- `CI=true pnpm verify` passes 534/534.
- D4 changes exactly 18 text files and 2,120 lines within its
  18-file/4,500-line gate, with zero dependency resolution, binary, media,
  Scene, or `.meta` change.
- Final frozen verification, exact four-commit history, refs, push, Draft PR,
  and external-gate state are recorded below at publication.

## Final publication gates

- Working-copy `CI=true pnpm verify`: 534/534 PASS.
- An isolated export of the exact staged Git index contains no ignored local
  experimental data; frozen install reuses the locked dependency graph and
  `CI=true pnpm verify` passes 534/534.
- Generated/schema/metadata closure leaves no tracked output change.
- `git diff --check`, D4 scope, zero-media, zero-Scene/`.meta`, protected
  rights/provenance hash, Tag, backup/recovery/archive ref, and main-baseline
  checks pass.
- Fourth append-only commit, push, Draft PR, and exact-head external-gate
  state are completed after this pre-commit acceptance record.

## Publication boundaries

The feature branch and Draft PR must contain zero MP4 or other evidence media.
No existing tag, Release, backup/recovery/archive ref, worktree, rights byte,
provenance byte, accepted source asset, or accepted Scene may change.

PROGRAM-015D does not authorize a merge, `v0.6.0`, Tag, Release, TASK-014D4,
or TASK-016.

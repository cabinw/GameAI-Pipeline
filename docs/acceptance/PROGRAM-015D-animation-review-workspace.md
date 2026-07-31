# PROGRAM-015D Animation Review Workspace Acceptance

## Status

`passed-external-code-ui-and-creator-review`.

D1–D4 and the single external code, Standalone UI, Compact Panel, Creator
runtime, and AI-human workflow review passed at implementation SHA
`c99cee9ad62c963b1163a6f727604429995b74e2`. Final PR CI and conditional
squash integration are the only remaining gates.

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

- Remediation commit:
  `c99cee9ad62c963b1163a6f727604429995b74e2`
  (`fix: close Animation Review Workspace acceptance gaps`).
- Working-copy `CI=true pnpm verify`: 546/546 PASS.
- Fresh detached tracked-only worktree at the exact remediation SHA:
  `pnpm install --frozen-lockfile` PASS and `CI=true pnpm verify` 546/546 PASS.
- Generated/schema/metadata closure leaves no tracked output change.
- `git diff --check`, aggregate scope, zero-media, zero-Scene/`.meta`, protected
  rights/provenance hash, Tag, backup/recovery/archive ref, and main-baseline
  checks pass.
- PR #27 is the only publication surface; no evidence branch or replacement PR
  is created.

## Independent defect closure

The ignored local ledger first identified 14 gaps (7 blocker, 7 major). The
complete code/UI/Creator pass found five additional integration gaps. All 19
closed in the single remediation commit:

- versioned closed Session/Patch/Validation/Diagnosis contracts, deterministic
  parsing/serialization, aggregate budgets, stable IDs, optimistic revisions,
  and fail-closed adapter responses;
- executable pivot offset, rotation offset, keyframe time, keyframe value,
  curve, and layer-order Patches through AI proposal → human accept/edit →
  Preview → Apply/reanalysis → Undo/Redo;
- legal automatic/human rule provenance and atomic accept → resolve for an
  open Finding;
- atomic safe-root persistence/export, restart restore, traversal/symlink and
  duplicate-request rejection, reconnect/read-only behavior, and cleanup;
- complete Standalone/Compact surfaces plus lightweight playback polling;
- Session clip restoration into Cocos, AssetDB hydration, one invalidation-
  cleaned Creator edit tick, bounded loop time at the JSON boundary, and
  mirrored Panel/local-adapter playback mutations.

No retry loop, warning suppression, broad fallback, `any`, skipped assertion,
or accepted PROGRAM-015 runtime/asset/Scene edit was used to close a defect.

## External acceptance matrix

| Requirement | Evidence observed | Result |
| --- | --- | --- |
| Standalone | 1280×720 responsive preview; Rest/Idle/Walk/Wave; play/pause/seek; timeline/markers; AI findings; Patch edit/Preview/Apply; validation; human rules/findings; history; save/export; explicit disconnected read-only state | PASS |
| Compact Panel | Session `red-cap-production-v1-wave`; clip/revision/readiness; live Play/Pause/+1f seek; overlay; assistant/Preview/Apply; validation; Save/Open Standalone; close/reopen and Scene-switch restore | PASS |
| Creator 3.8.8 | `red-cap-production-showcase.scene`; live time advanced and loop display stayed within 1.200; pause remained stable; alternate valid Scene and return; two rebuilds each roots=1/targets=19/renderers=19; zero relevant warning/error | PASS |
| AI + human workflow | controlled Wave defect; deterministic local assistant; correct clip/time/target/rule; AI_PROPOSED only; human accept and numeric edit; Preview non-authoritative; Apply + reanalysis; human rule and Finding resolution; Undo/Redo | PASS |
| Persistence/conflict | stale Patch rejected before mutation; Session save; Standalone reopen; Panel reopen; service restart; exact revision restore; duplicate request stable | PASS |
| Exact Reset | Wave, paused, 0.000; Session r18; patches=0; preview=null; history=0; old diagnoses removed; one fresh deterministic coverage diagnosis; all overlays off | PASS |
| Export | local r13 Review Contract re-read through schema and semantic validation; no ignored asset dependency | PASS |
| Clean hold/cleanup | final Creator hold exceeded five seconds; relevant warnings/errors=0; service listener after disposal=0 | PASS |

Focused counts at the reviewed SHA are: Review Core 12/12, shared UI 10/10,
Local Review Workspace 9/9, Creator extension 300/300, Cocos clean project
9/9, Character Semantic Events 25/25, VFX Authoring 16/16, Character
Contracts 44/44, Rig Animation 20/20, Character Asset Intake 75/75, Rig
Layout Generator 22/22, and the spike extension 4/4; aggregate 546/546.

## Scope and evidence audit

- Reviewed implementation before this documentation-only acceptance update:
  75 files, 14,725 insertions, 10 deletions (14,735 changed lines).
- Final documentation-only acceptance tree: 75 files, 14,852 insertions,
  10 deletions (14,862 changed lines).
- Remediation increment: 41 files, 6,205 insertions, 488 deletions.
- Aggregate ceiling: 120 files / 22,000 changed lines; PASS.
- Tracked MP4: 0. Binary/media additions: 0. Accepted PROGRAM-015 runtime,
  asset, Scene, and `.meta` changes: 0.
- TASK-016 and TASK-014D4 changes: 0.
- Local-only review material remains ignored/untracked under
  `artifacts/experimental/program-015d-animation-review-workspace/`: defect
  ledger, one local screenshot, four persisted Session files, and the validated
  r13 export. None is in Git, PR #27, a Tag, or a Release.

Known non-goals remain unchanged: the built-in assistant is a deterministic
local rule engine, not a cloud model; no cloud credentials, paid dependency,
video evidence, production asset authoring, or general-purpose animation DCC
is introduced. Coverage and motion-quality rules intentionally return to
unresolved after Exact Reset and require a new human review.

## Publication boundaries

The feature branch and Draft PR must contain zero MP4 or other evidence media.
No existing tag, Release, backup/recovery/archive ref, worktree, rights byte,
provenance byte, accepted source asset, or accepted Scene may change.

PROGRAM-015D does not authorize a merge, `v0.6.0`, Tag, Release, TASK-014D4,
or TASK-016.

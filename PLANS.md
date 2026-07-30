# Implementation Plans

Use this file for multi-file or architectural work. Keep one active plan at a
time.

## Active plan: PROGRAM-015 Red Cap Production Vertical Slice

- Status: PROGRAM-015 accepted by external code/runtime/Creator/visual review;
  awaiting Draft PR publication
- Started: 2026-07-30
- Branch: `feat/task-015-red-cap-production-vertical-slice`
- Exact baseline `main`: `68444551b9b160a2455a97a2d8bf611aea608c6e`
- Final remediation ceiling: at most 112 changed files and 16,000 changed
  lines; at most 42 touched PNG files, 3 Scene/`.meta` pairs, 1 feature
  manifest, zero feature MP4 files, and at most 3 evidence MP4 files isolated
  on `evidence/task-015`.
- Phase 0 resumed scope: at most 20 files and 5,000 changed lines, including
  exactly 5 approved source PNGs plus the project-owner-reviewed provenance,
  rights assertion, source-authority map, layout lock, and documentation;
  zero runtime, schema, generated, Scene, `.meta`, package, lockfile, audio,
  or video changes.

### Goal

Deliver one deterministic production vertical slice from accepted Red Cap
source through a static character, bounded rigid-sprite motion and semantic
events, and a two-character production-lite showcase with scene-specific
data-driven VFX.

### Phase boundaries

- TASK-015A: at most 45 changed files and 8,000 changed lines; at most 38
  touched PNGs and 2 Scene/`.meta` pairs; zero feature media.
- TASK-015B: at most 24 changed files and 6,000 changed lines; zero new PNGs,
  at most 1 modified Scene/`.meta` pair, and zero feature media.
- TASK-015C: at most 35 changed files and 9,000 changed lines; at most 4 new
  production-intent PNG resources, 1 new Scene/`.meta` pair, and zero feature
  media.
- Evidence: one isolated branch with at most 3 MP4 files, 12 PNG frames, 8
  JSON reports/manifests, and 1 deterministic analyzer.

The original aggregate ceiling was 96 files and 24,000 changed lines. The
final read-only reconciliation against exact `main`
`68444551b9b160a2455a97a2d8bf611aea608c6e` found 103 files and 12,341
changed lines at Phase C. The project owner grants a one-time seven-file
accounting exception, closing the reconciled Phase C scope at exactly 103
files. The later project-owner-authorized live-evidence remediation may add
only the runtime, analyzer, tests, generated closure, and existing-document
corrections required by external review, with a final hard ceiling of 112
feature files and 16,000 changed lines.

The independent Sharp atomic-publication fix was squash-merged to `main` at
`46d4523194f8ba064bd73db7b1c797e77cfa7745` and synchronized append-only into
this branch by merge commit
`f1f0adfe6fd88a0e2c2f552be1870c0736dc1b8c`. Relative to the new `main`, the
Program remains exactly 103 files and 12,599 changed lines before this
documentation closeout. No implementation, source asset, Scene, `.meta`,
schema, rights, or project provenance conflict occurred; `PLANS.md` was the
sole conflict and retains both histories.

Final R3 passed: 17 focused PROGRAM-015 assertions, asset-intake 74/74,
Character Semantic Events 25/25, Cocos project 9/9, Creator extension
293/293, and complete workspace 507/507. Typecheck, clean-CI, working-copy
verification, frozen tracked-files-only verification, deterministic
generation, synchronized generator concurrency, generated closure,
Scene/meta/class identity, Markdown links, diff whitespace, media/protected
refs, and post-verify clean-content closure all passed.

### External-review live-evidence remediation

External review rejected the first evidence publication because its Phase B/C
animation was synthesized from a flat composite and its headline
framebuffer counts were not derived from the published MP4 bytes. That
evidence remains immutable on the evidence branch and is classified as
`failed-external-review-synthetic-animation-and-non-media-derived-metrics`.
It is historical evidence only and does not establish visual acceptance.

The replacement runtime consumes the accepted 19-part atlas, rig hierarchy,
Rest/Idle/Walk/Wave clips, per-joint transforms, semantic sockets, and the
existing D2 VFX host in Creator 3.8.8 Web Preview. Its visible HUD and runtime
diagnostics bind the exact feature commit, Scene/runtime identity, evidence
session, viewport, Creator version, lifecycle counters, playback state, and
cleanup state. The replacement analyzer accepts only the final MP4, decodes
specified RGB24 frames with FFmpeg, and derives every Dust, Trail, Aura,
Pause, and Resume result from frame bytes inside predeclared half-open ROIs.
No flat-frame animation, prepared mask, fixed result, retry, sleep, or static
PASS field is an acceptance source.

### External review acceptance closeout

Independent review downloaded exact evidence commit
`c974011d4f13d95c9970144cbfc7fa2ad40b9595` from GitHub and reviewed feature
`2bd0968835dcf25239ea705fe153d8eb68a91336`. The replacement Phase B payload
at `791be5581e89f48822f5dba85b57d967e74c75b6` proves two independent Rebuild
inputs and the visible/runtime transition `1/0/0 → 2/1/1 → 3/2/2`, followed
by working Rest, Idle, Walk, Wave, Pause, Resume, Exact Reset, and a five
second clean hold. Its downloaded analyzer reproduced byte-identical output.

The downloaded Phase C MP4 SHA-256
`f4842ced0f428cade5fb2917fc6e6867f16d8a990d56df023f66126c491a130c`
reproduced Dust `7,645`, Trail `4,454`, Aura `25,072`, Pause `0`, and Resume
`25,612` pixels twice with byte-identical analysis SHA-256
`8d69f220d1ccb7cb1dc5abec1e37a9ca8e5453c6b14ffdcdb5d831c23d608744`.
Controlled decoded-frame perturbation changed both the frame hash and derived
pixel count.

Master-only visible-pixel authority, parts-sheet audit-only authority, and
hidden-connector-only supplement authority remain unchanged. Rights and
provenance remain byte-identical at
`335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`
and
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
Evidence acceptance commit
`6011d48915a2097153fb6ee63303a781a41557d6` records external
code/runtime/Creator/visual/spatial/control/evidence review PASS while
preserving both historical failure statuses. PROGRAM-015 is Accepted and
awaiting Draft PR publication.

### TASK-015B declared implementation scope

TASK-015A passed its automated and Creator gates in commit `9d1627b` and is
pushed to the Program branch. TASK-015B is limited to at most 21 changed
files: four status/acceptance documents, one deterministic motion generator,
one package script entry, four clip documents, one semantic-event document,
one generated motion-quality report, generated Cocos motion data and
component files with their Creator-owned metadata, one motion Scene/`.meta`
pair, and three existing package test files. The phase adds zero PNG or video
files and remains below 6,000 changed lines.

TASK-015B closed at 21 files and 3,279 changed lines with zero PNG, audio, or
video changes. Four normalized clips, Program semantic-event data, 60 Hz
sampling, loop continuity, planted-foot, socket, lifecycle, Creator runtime,
two-rebuild, post-rebuild, Reset, stress/debug, and nine-point fault gates
passed. `CI=true pnpm verify` passed before the B checkpoint.

The previous 3,246-line value was an incomplete pre-closeout accounting
snapshot. It excluded the 32 changed lines in the final TASK-015B closeout
document and the one-line package-script registration, while the final commit
contains both. There were no renames or post-B edits involved.

### Final scope reconciliation

Using one `git diff --find-renames --numstat` method for every boundary gives:

- Phase 0 (`main..0ea3c8d`): 23 files, 1,329 additions, 18 deletions,
  1,347 changed lines, 5 binary PNGs.
- Phase A (`0ea3c8d..9d1627b`): 45 files, 5,462 additions, 19 deletions,
  5,481 changed lines, 24 binary PNGs.
- Phase B (`9d1627b..70e0ba3`): 21 files, 3,269 additions, 10 deletions,
  3,279 changed lines, no binary files.
- Phase C (`70e0ba3..25d5069`): 30 files, 2,299 additions, 7 deletions,
  2,306 changed lines, 4 binary PNGs.
- Aggregate (`main..25d5069`): 103 distinct files, 12,323 additions,
  18 deletions, 12,341 changed lines, 33 binary PNGs.

The original 96-file roll-up accounted for `PLANS.md` but omitted seven
required modifications to pre-existing cross-cutting surfaces:
`CHANGELOG.md`, `docs/index.md`,
`docs/releases/v0.4.0-data-driven-vfx-authoring-baseline.md`,
`tasks/RELEASE-0.4.0-data-driven-vfx-authoring-baseline.md`,
`cocos/projects/character-rig-builder-mvp/test/ci-typecheck-config.test.mjs`,
`pipelines/character-asset-intake/package.json`, and
`pipelines/character-semantic-events/test/character-semantic-events.test.ts`.
They were introduced respectively in Phase 0 (four), Phase A (two), and
Phase B (one). Each is required for Program status isolation, CI/typecheck
coverage, deterministic command registration, or semantic-event regression
coverage. None is duplicate, temporary, cached, generated by mistake, or
evidence media. The complete per-file classification is recorded in the
Program acceptance document. This reconciliation changes accounting and
documentation only; it does not repair or alter implementation.

### Phase 0 result

The replacement `red-cap-production-v1` source pack passes resumed Phase
0A–0C. The project-owner-reviewed rights assertion is bound to provenance SHA
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`;
all governed image hashes and integrity checks pass. A machine-readable
19-part map assigns all final visible-pixel authority to the character
master, limits the parts sheet to identification/structure/boundary/manual
audit, restricts the joint supplement to declared hidden connectors, and
rejects ambiguous or duplicate components. The background deterministically crops to
1664×936 and scales by 10/13 to the locked 1280×720 composition and ROIs.

Approved source bytes are promoted under
`examples/red-cap-production-v1/source/`; ignored intake and ZIP files remain
untracked. TASK-015A is accepted and TASK-015B may proceed.
See `tasks/PROGRAM-015-red-cap-production-vertical-slice.md` and
`docs/acceptance/PROGRAM-015-red-cap-production-vertical-slice.md`.

## Completed plan: CI FFmpeg Dependency Remediation

- Status: Implemented, verified, and merged to `main`
- Started: 2026-07-30
- Branch: `fix/ci-install-ffmpeg`
- Exact baseline `main`: `46d4523194f8ba064bd73db7b1c797e77cfa7745`
- Fix commit: `dc017cc8162943fc250ff24bb2dec5092fe60e16`
- Squash/main commit: `4f172c4a769a195df07560ea602b3f0c03e676bf`
- Scope: 4 files and 89 changed lines; zero runtime, schema, Scene, asset,
  test-expectation, generated-output, binary, media, evidence, package,
  lockfile, or PROGRAM-015 changes.

### Root cause and result

PROGRAM-015 Draft PR #22 run `30553531763` reached the real media-derived
framebuffer test and failed at process creation with `spawn ffmpeg ENOENT`.
The Ubuntu workflow installed neither `ffmpeg` nor `ffprobe`; the analyzer
uses both ordinary executable names but does not bind FFmpeg 8.1.2-specific
bytes or output.

PR #23 installs Ubuntu's repository `ffmpeg` package before Node/pnpm setup,
requires both executables on `PATH`, and prints both version reports. Its
Actions run `30555447522` passed with FFmpeg/ffprobe 6.1.1, complete
verification, and clean generated-output closure. The fix was squash-merged;
post-merge main run `30555787659` also passed. No PROGRAM-015 test,
expectation, runtime, or media byte changed.

## Completed plan: Sharp PNG Atomic Generation Fix

- Status: Implemented, verified, and merged to `main`
- Started: 2026-07-30
- Branch: `fix/sharp-empty-buffer-generation-race`
- Exact baseline `main`: `68444551b9b160a2455a97a2d8bf611aea608c6e`
- Final scope budget: at most 12 files and 1,500 changed lines; zero binary,
  PNG, Scene, `.meta`, runtime, schema, PROGRAM-015, lockfile, or package
  changes. The two accepted `authoring-provenance.json` mirrors are the only
  generated-output exception.

### Goal

Prevent concurrent generators and readers from observing zero-byte or partial
PNG publication while preserving every non-provenance accepted generated
byte.

### Boundaries and closure

- Reuse the existing same-directory atomic-write implementation.
- Give production-lite generators explicit isolated output roots.
- Keep tracked source PNGs read-only in tests and clean temporary roots on
  both success and failure.
- Add synchronization-based concurrent writer/reader coverage without sleep,
  retry, test serialization, timeout changes, fallback images, or reduced
  concurrency.
- Preserve every non-provenance accepted generated byte and strict closure.

The generator self-fingerprint makes a literal old-provenance byte comparison
impossible after generator changes. The baseline/final generator SHA-256 values
are `e3ded341b516…` and `209b395148c9…`; the two fixture/Cocos provenance
mirrors consequently move from `697ac6704e31…` to `0bacc7cb379c…`. Their only
semantic change is the generator input SHA. An intermediate `ab46f05c…`
generator produced the previously audited `e8b22d27…` candidate before the
complete isolated input-root correction.

The concurrency fixture snapshots the full source/config/part/attachment
closure read-only. This resolves the earlier missing
`source/character-source.json` `ENOENT` without retry, sleep, serialization,
fallback, ignored errors, or reduced concurrency. Focused coverage, three
asset-intake runs, two working-copy verifications, and two frozen
tracked-files-only verifications passed before merge.

## Completed plan: v0.4.0 Data-Driven VFX Authoring Baseline

- Status: Published and complete
- Started: 2026-07-30
- Branch: `docs/release-v0.4.0-data-driven-vfx-authoring`
- Baseline `main`: `9c3fb8ed55f18967b13f82d59a1e46cc016a12a7`
- Expected scope: at most 13 Markdown files and 3,000 changed lines; zero
  runtime, schema, compiler, sampler, test, fixture, generated, Scene,
  `.meta`, package, lockfile, binary, media, or evidence changes.

### Goal

Establish the prerelease documentation baseline for the complete accepted
TASK-014D1–D3 chain:

```text
VFX Authoring Document
→ deterministic compiler
→ concrete Render Plan
→ shared Cocos adapter/runtime
→ canonical full-loadout integration
→ Creator lifecycle/spatial/visual acceptance
```

### Boundaries

- Update only current-facing release, roadmap, compatibility, index,
  contract, animation, plan, changelog, README, and D1–D3 integration-status
  documentation.
- Record D1 schema/compiler/tick/curve/parameter/randomness/budget semantics,
  D2 typed adapter/runtime and transactional ownership semantics, and D3
  canonical loadout/target/lifecycle/fault/visual acceptance.
- Position v0.4.0 as a prerelease framework baseline with
  procedural/reference VFX rather than production art.
- Keep audio/gameplay execution, Unity/Godot/Windows, Red Cap, AI asset
  generation, complete editor UI, and TASK-014D4 explicitly outside the
  accepted baseline.
- Preserve implementation bytes, generated outputs, all protected references,
  existing tags/releases, and ignored local evidence.
- Do not create or move `v0.4.0`, publish a GitHub Release, mark the
  documentation PR Ready, or merge it.

### Execution

1. Audit exact main, v0.2.0/v0.3.0 tags, D1–D3 merge SHAs, protected refs,
   working-tree state, and current release documentation.
2. Add the v0.4.0 baseline and release task; update only the declared Markdown
   surfaces and current D1–D3 integration status.
3. Validate relative links, stale/current status, release consistency,
   allowed paths, changed lines, binary/media/evidence/code absence, tracked
   MP4 count, diff whitespace, and protected references.
4. Run working-copy and fresh frozen tracked-files-only `CI=true pnpm verify`,
   generated-output closure, and post-verify clean/content closure.
5. Commit and push the documentation branch, create a Draft PR to `main`,
   wait for Actions PASS, merge the accepted documentation, and publish the
   annotated `v0.4.0` prerelease from the peeled target.

### Done when

- D1–D3 capabilities and limitations are stated without changing historical
  task boundaries or overstating production readiness.
- Working-copy, frozen tracked-only, Markdown/link, generated closure,
  diff/content, scope/media/code, and protected-reference gates pass.
- The documentation PR targets the exact main baseline and Actions passes.
- The annotated `v0.4.0` tag and prerelease are published from
  `68444551b9b160a2455a97a2d8bf611aea608c6e`; TASK-014D4 remains unstarted.

## Completed plan: TASK-014D3 Focused Transaction Cleanup Closeout

- Status: Integrated through PR #19 at
  `9c3fb8ed55f18967b13f82d59a1e46cc016a12a7`
- Started: 2026-07-29
- Branch: `feat/task-014d3-canonical-loadout-vfx-authoring-integration`
- Baseline `main`: `dc6dad52d4a40714d6e3f12352d5593763655c55`
- Expected scope: at most 55 changed files and 12,000 net changed lines.
- Closeout increment: at most 14 feature files and 3,000 net changed lines.
- Final closeout increment: at most 12 feature files and 2,500 net changed
  lines; one short supplemental evidence video is allowed only on the
  evidence branch.
- Hand-authored code, generated mirrors, PNG assets, and Scene/`.meta` pairs
  are reported separately. Feature tracked MP4 budget is zero.

### Goal

Replace the canonical full-loadout runtime's hard-coded procedural effect
construction with one deterministic D1 authoring document compiled before
runtime into a concrete Render Plan and executed by the accepted D2 Cocos
adapter boundary.

The focused closeout routes real D3 setup failure, terminal failure, target
invalidation, Exact Reset, rebuild, disable, and destroy through the accepted
D2 all-steps cleanup coordinator. It preserves the first business error,
orders cleanup errors independently, retains failed-step compensation
ownership, and permits same-component retry after complete compensation.

### Authoritative composition

```text
canonical 12-state loadout contract/resolver
→ canonical pose and semantic target resolution
→ Character Semantic Events evaluator
→ canonical D1 authoring document/compiler
→ concrete Render Plan
→ shared D2 descriptor/runtime/renderer adapter
→ independent D3 Creator Scene
```

### Boundaries

- Preserve TASK-014C, TASK-014D1, and TASK-014D2 accepted Scenes, schemas,
  evaluator behavior, canonical tick/sampler/lifecycle semantics, and
  protected references.
- Combine and reuse the four accepted D1 fixtures. Resolve parameter
  overrides at compile time; runtime consumes only the concrete plan.
- Extract the D2 production implementation into a shared runtime consumed by
  both the D2 minimal Scene and D3 canonical Scene. Do not duplicate renderer,
  sampling, time, cleanup, sorting, projection, material, or ownership logic.
- Add one Creator-owned D3 Scene covering all 12 loadout states, no/left/right
  prop, five canonical clips, Aura, Combined, Pause/Resume, Transform Stress,
  Debug, two rebuilds, post-rebuild effects, and Exact Reset.
- Keep feature evidence media out of the feature branch. Publish only the
  manifest, one MP4, RGB24 analyzer, and analysis JSON on
  `evidence/task-014d3`.
- Do not create a PR, merge main, move a tag/release or start TASK-014D4.
- Do not change D1, Character Semantic Events, or D2 public semantics. Parent
  runtime changes are limited to protected, default-no-op failure and teardown
  seams whose existing behavior remains unchanged for non-D3 consumers.

### Execution

1. Record the architecture audit, task acceptance criteria, ADR, scope, and
   protected-reference baseline before implementation.
2. Add the canonical textual D1 document, deterministic compile/serialization
   closure, resource context, and generated concrete Render Plan.
3. Make the D2 descriptor, sampler mirror, runtime state, cleanup coordinator,
   renderer host/factories, sorting, spatial and diagnostics code a shared
   production boundary; retain byte and behavioral parity in the D2 Scene.
4. Compose the shared adapter with canonical loadout pose/target resolution
   and semantic evaluator in an independent D3 Creator component and Scene.
5. Add focused positive, negative, parity, generated closure, runtime
   prohibition, target-rebinding, lifecycle, fault and Exact Reset tests.
6. Run direct, extension, D1, semantic-event, clean-CI, working-copy, frozen
   tracked-only, schema/vector/parity/closure, metadata, links, diff,
   binary/media, scope, protected-reference and clean-tree gates.
7. Run the complete Creator 3.8.8 clean-import/open/switch/reopen/restart and
   Web Preview matrix from Gate 1 after every task-scope runtime correction.
8. Commit and push the feature branch, publish reproducible evidence on the
   isolated evidence branch, download and reverify bytes/decode/analysis, and
   stop with both worktrees clean.
9. Add the focused real-component transaction boundary and a failure matrix
   that exercises D3 callbacks plus parent teardown order rather than only a
   fake renderer host or low-level runtime.
10. Re-run working-copy and tracked-only verification plus Creator normal and
    fault matrices, then append replacement evidence pinned to the new feature
    SHA.
11. Close the final real-Creator gaps: preserve dispose-only finalization
    across the actual `onDisable` then `onDestroy` callback sequence; publish
    generated and overlay root ownership immediately after attachment; inject
    pre-`runtime` build faults across base, attachment, prop, overlay,
    Graphics, HUD, and Sorting2D construction; and rename synthetic
    coordinator tests honestly.
12. Re-run working-copy, frozen tracked-only, generated-closure, complete
    Creator normal and fault gates. Append one final feature commit, then
    publish a short SHA-bound supplemental video, updated fault matrix, and
    manifest in one append-only evidence commit. Do not create a PR.

### Done when

- Canonical authoring and concrete plan bytes are deterministic and closed,
  and no runtime code parses authoring JSON or resolves parameters.
- D2 and D3 use the same production runtime/renderer implementation and D2
  parity passes.
- All 12 loadout states and three prop states resolve real runtime targets;
  Dust, Trail, Aura and Combined satisfy lifecycle, ownership, spatial and
  visibility invariants through stress, switching, pause, rebuild and reset.
- Working-copy and frozen tracked-only verification, complete Creator 3.8.8
  acceptance, evidence decode/RGB24 analysis, scope/media/reference audits,
  remote SHA parity and clean trees all pass.

### Closeout

- Focused D3/Scene `28/28`, extension `293/293`, D1 `16/16`, semantic events
  `24/24`, Cocos CI `3/3`, and working-copy verification `491/491` pass.
- The actual Creator `onDisable` then `onDestroy` sequence performs ordinary
  teardown once, completes only dispose finalization on destroy, leaves both
  readiness and lifecycle DISPOSED, and never repeats a successful cleanup
  step.
- Eight pre-runtime parent build faults cover base, attachment, prop, overlay,
  Graphics, Graphics Sorting2D, HUD, and HUD Sorting2D. Each compensates
  root/input/owner/material/node to `0/0/0/0/0`; retrying the same component
  reaches READY `1/1/0/0/0` without a duplicate root.
- Creator 3.8.8 clean open/switch/reopen/second-startup and the complete live
  normal matrix plus the 16 existing transaction faults and nine final
  lifecycle/partial-build gates pass with zero relevant Preview warning or
  error.
- All 12 loadouts and three prop modes resolve evaluated runtime targets.
  Aura reaches attempts/accepted/coalesced `6/1/5` with instances `1/1/1`;
  Reset returns to root/input `1/1` and zero ownership, cleanup and spatial
  failures.
- External code, Creator, transaction, media/decode and visual review passed
  for feature `6d43609d099b9a4909b92c7edb288afe615e7615` and reviewed evidence
  `9cdf32003ed654b619acb6a7cf4b4808eed719ac`. Append-only acceptance evidence
  is recorded at `118003e6e8dc85d7bb86900f5f252e856461e0e9`.
- Integrated through squash PR #19 after pre-merge and post-merge Actions
  verification. TASK-014D4 remains unstarted.

## Completed plan: TASK-014D2 Final Runtime Semantics Closure

- Status: Integrated through PR #18 at
  `dc6dad52d4a40714d6e3f12352d5593763655c55`.
- Started: 2026-07-28
- Branch: `feat/task-014d2-cocos-vfx-render-plan-adapter`
- Baseline `main`: `ae5fb4ef7a68a20706485741ab352a6037d25f12`
- Scope ceiling: at most 50 changed files and 10,000 net changed lines.
- Feature branch media budget: zero MP4 or other generated evidence media.

### Goal

Prove that the accepted TASK-014D1 concrete Render Plan drives a generic
Cocos Creator 3.8.8 runtime through typed primitive/recipe/lifecycle dispatch,
without authoring parsing, parameter resolution, cue-name matching, duplicated
time math, or canonical full-character integration.

### Boundaries

- Compile the four accepted D1 fixtures before runtime and feed only concrete
  normalized plans into a pure Cocos render-descriptor compiler.
- Consume the exact D1 sampler through a generated source mirror; never
  reimplement phase, curve, delay, repetition, or final-boundary behavior.
- Dispatch exhaustively by primitive, portable recipe, blend capability, and
  exact lifecycle.
- Add one minimal Creator-owned Scene with generic nested targets, procedural
  Graphics recipes, centralized sorting, projection and viewport guards,
  readiness gating, generation ownership, symmetric teardown, and one shared
  HUD/input registry.
- Keep TASK-014D3, canonical loadouts, authoring UI, Unity/Godot, Red Cap,
  Windows, tags, Releases, and D1 semantics out of scope.

### Execution

1. Add the bounded TASK-014D2 specification and declare scope before code.
2. Add pure descriptor compilation, runtime lifecycle state, typed resources,
   sorting/spatial/input contracts, stable failures, and focused tests.
3. Generate stale-checked concrete plan data and exact D1 sampler/type mirrors.
4. Add the Creator runtime host, stable metadata, and minimal acceptance Scene.
5. Run direct, workspace, frozen, closure, metadata, binary/media, scope, and
   Creator 3.8.8 clean-open/reopen/restart/Preview acceptance gates.
6. Commit and push the feature branch without a PR, publish video evidence
   only on `evidence/task-014d2`, verify its bytes and decode, and stop for
   external visual review without starting TASK-014D3.
7. Close the final runtime findings append-only: inspect actual Cocos material
   pass blend targets after `updateMaterial()`, propagate pending/active/removed
   samples to the host with destroy-once ownership, and reject every
   unrealizable registry recipe/primitive capability even when unused.
8. Repeat all automated and Creator 3.8.8 gates, publish a third provenance-bound
   evidence video while retaining both predecessors, and stop for final external
   code and visual review.
9. Close the external-review findings append-only: make setup failure cleanup
   transactional with a root-independent terminal HUD and retry, preserve the
   first failure across cleanup faults, retain the built-in Graphics material
   so ribbon vertices honor node transforms, and add framebuffer ROI gates for
   standalone, paused/resumed, stressed, and post-rebuild Trail.
10. Close the final transaction findings append-only with one shared,
    stateful cleanup coordinator used by the Creator component, runtime host,
    and renderer ownership paths; retain failed cleanup steps for compensation,
    preserve first business failure separately from cleanup errors, and prove
    the final Trail gate from decoded real Web Preview frames.
11. Close the final ownership/evidence review findings append-only: retain
    Blend Gate temporary resources until compensation succeeds, preserve the
    original Error object separately from cleanup errors, report real root and
    pending ownership, run the default-off Creator transaction fault boundary,
    and regenerate framebuffer measurements directly from the downloaded MP4.
12. Record external code, Creator runtime, transaction, framebuffer, and visual
    review PASS for feature `70283b2a43adc57949dcf37cbe2632d44fee2386`,
    reviewed evidence `508a83b75ef3d0b2ca50ec6cc8242d3317d741c8`
    (manifest closeout `27f2ce1bf246cb361c57c0b4ef29935985e47432`), and video
    `22997a9d040bfbdf43bfe2ea9e4488e7b9d57a51ef7253099a627e65d37bec64`;
    publish the documentation-only acceptance commit and Draft PR without
    starting TASK-014D3.

### Done when

- All pure and Creator gates pass with all four primitives visibly exercised.
- Exact Reset is Rest, stopped at `0.00s`, stress/debug off, zero active/stale
  renderers, one runtime root, and one input handler.
- Feature scope is within 50 files/10,000 net lines with zero tracked MP4 files.
- Evidence is isolated, reproducible, decoded, and available for review.

## Completed plan: TASK-014D1 Engine-Neutral VFX Cue Authoring Contract

- Status: Integrated through PR #17 at
  `ae5fb4ef7a68a20706485741ab352a6037d25f12`
- Started: 2026-07-28
- Branch: `feat/task-014d1-vfx-cue-authoring-contract`
- Baseline `main`: `67a6c702eb701a90762b8b5fd93184e3cf0ebfc5`
- Release baseline: `v0.3.0` at the same commit
- Total PR scope ceiling: at most 55 changed files and 10,000 changed lines.
  The remediation may add at most nine focused diagnostic cases, four textual
  golden render plans, and one engine-neutral executable-semantics module.
  Zero generated mirrors, binary/media files, Scene/`.meta` pairs, runtime
  adapters, or evidence.

### Goal

Replace hard-coded future effect construction as the authoring source with a
validated, deterministic, engine-neutral VFX document and compiler. The
package accepts existing Character Semantic Event cue IDs and logical
resource IDs, then emits a normalized VFX Render Plan suitable for independent
Cocos, Unity, and Godot compilers.

### Boundaries

- Add `@gameai/vfx-authoring` without changing Character Semantic Events
  schema, evaluator semantics, or TASK-014A/B/C behavior.
- Author and compile sprite/textured quad, ring, ribbon/trail, and burst
  particle layers with explicit lifecycle, transforms, timing, color,
  opacity, curves, seed, emission, blend role, and bounded parameters.
- Reject unknown semantic cues/resources, incompatible shapes, non-finite
  values, conflicts, and budget violations before returning any partial plan.
- Compile closed typed parameter bindings into concrete layer properties,
  validate semantic command-mode and resource capability descriptors, and
  make curve, timing, alpha, particle scheduling, and PRNG rules executable
  without engine inference.
- Keep source documents and compiled plans free of engine paths, nodes,
  components, materials, APIs, and engine types.
- Do not implement rendering, a Creator Scene, visual evidence, TASK-014D2,
  TASK-014D3, release/tag changes, or protected-reference changes.

### Execution

1. Approve the authoring/compiler boundary in RFC-0015 and ADR-0016.
2. Add the canonical schema, TypeScript package, stable diagnostics,
   fail-closed parser, semantic validator, normalizer, compiler, and
   byte-deterministic serializer.
3. Add four valid reference fixtures and one focused invalid textual fixture
   for every public diagnostic.
4. Test schema identity, parsing, validation, normalization, compilation,
   serialization, immutability, registries, lifecycles, curves, parameters,
   budgets, repeated byte identity, and engine-import absence.
5. Run direct tests, working-copy and frozen tracked-only verification, schema
   and generated-output closure, Markdown links, diff/clean-tree, binary/media,
   tracked-MP4, file-count, and line-count audits.
6. Commit and push the feature branch, create a Draft PR to `main`, require
   GitHub Actions PASS, and leave the PR Draft and unmerged.
7. Remediate executable semantics append-only on the same branch, update
   existing Draft PR #17, repeat every verification gate, and preserve the
   reviewed `a3bd2ed` commit as an ancestor.
8. Close final external-review counterexamples with canonical integer-tick
   sampling, canonical particle lifetime validation, and exact semantic
   lifecycle descriptors; publish portable sampling vectors and repeat all
   clean/frozen/remote gates before acceptance.

### Done when

- All TASK-014D1 acceptance criteria pass with stable diagnostics and no
  partial output on failure.
- Canonical/package schema bytes and repeated render-plan bytes are identical.
- The complete remediated PR stays within 55 files and 10,000 lines and contains text
  and source only.
- Exact-head local, frozen, and GitHub Actions verification passes; external
  review is clear; and no tag, release, Scene, media, or runtime-adapter
  change occurs within TASK-014D1.

## Completed plan: v0.3.0 Character Semantic Events & VFX Baseline

- Status: Integrated through PR #16 at
  `67a6c702eb701a90762b8b5fd93184e3cf0ebfc5`
- Started: 2026-07-28
- Branch: `docs/release-v0.3.0-semantic-vfx`
- Baseline `main`: `5c3baba4062bd529bb6bd4b787b8c391452ee459`
- Expected scope: at most 12 documentation files and 2,500 changed lines;
  zero runtime, schema, test, Scene, `.meta`, package, lockfile, binary,
  media, MP4, evidence-branch, tag, or GitHub Release changes

### Goal

Establish the documentation baseline for the accepted Character Semantic
Events 1.0, persistent lifecycle correction, Cocos Semantic VFX Adapter, and
canonical full-loadout integration. Position v0.3.0 as a prerelease framework
baseline and separate accepted capabilities from future authoring, audio,
gameplay, cross-engine, Windows, and production-art work.

### Authoritative architecture

```text
Character Semantic Events contract
→ deterministic evaluator
→ canonical resolved character loadout
→ evaluated semantic target/socket registry
→ Cocos Semantic VFX Adapter
→ renderer/cue registry
→ Creator runtime
```

The engine-neutral contract supports typed VFX, audio, and gameplay events.
Only Cocos VFX execution is implemented. Audio and gameplay remain validated
contracts without playback, hitbox, damage, or other runtime consumers.

### Boundaries

- Create one release task and one v0.3.0 baseline document.
- Update only current-facing release, roadmap, compatibility, index,
  contract, animation, and accepted TASK-014C status documentation.
- Preserve statements that accurately describe the historical scope of
  TASK-014A, ADR-0015, RFC-0014, and older accepted baselines.
- Record 414/414 working-copy and tracked-files-only verification, Creator
  3.8.8 macOS acceptance, external visual review PASS, and zero tracked
  evidence media.
- Do not create or move `v0.3.0`, create a GitHub Release, change v0.2.0,
  modify runtime/contracts/tests, or start TASK-014D.

### Next direction

Recommend TASK-014D — Data-Driven Production VFX Cue Authoring. Its future
scope is a validated engine-neutral cue description that AI can generate or
modify, reusable presets, timing/socket/transform/color/duration/layer
preview, and compilation to Cocos renderer plans while preserving independent
Unity/Godot adapter boundaries. Production-quality asset generation remains
separate from runtime logic.

### Done when

- README, roadmap, changelog, documentation index, compatibility matrix,
  current contract/animation guidance, TASK-014C status, and v0.2.0 release
  page no longer present stale current-state claims.
- The v0.3.0 task and release baseline document accepted architecture,
  capabilities, runtime guarantees, verification, positioning, limitations,
  and non-goals without claiming tag/release publication.
- Markdown links/paths, release consistency, stale-statement audit,
  `git diff --check`, working-copy and tracked-files-only 414/414
  verification, post-verify closure, documentation-only scope, binary/media,
  and tracked-MP4 gates pass.
- One Draft PR targets `main`; Actions passes; the PR remains Draft and
  unmerged; `v0.3.0` and TASK-014D remain uncreated.

## Completed plan: TASK-014B Minimal Cocos Semantic VFX Adapter

- Status: Accepted after external visual review
- Started: 2026-07-26
- Branch: `feat/task-014b-cocos-semantic-vfx-adapter`
- Baseline `main`: `1ab573e4b99d6c04973dc62803c5c2579c56e4a9`
- Automated baseline: 368/368 tests
- Declared feature budget: at most 70 changed files and 12,000 changed lines,
  including one Creator-owned Scene/`.meta` pair and deterministic generated
  runtime mirrors; no feature-branch video or audio file. This remains below
  the mandatory split thresholds of 100 files and 25,000 lines.

### Goal

Prove that Character Semantic Events 1.0 `emit`, `start`, and `stop` commands
can drive deterministic visible Cocos Creator 3.8.8 effects at real sockets
on an independent minimal stickman/base-rig reference. Preserve the
engine-neutral contract and evaluator unchanged while exercising one-shot,
looping, persistent, follow-policy, cleanup, projection, and lifecycle
behavior through a Cocos-only adapter and cue-renderer registry.

### Boundaries

- Keep every Cocos import and resource/runtime concept under the Cocos
  project/extension boundary. Do not change semantic-event schemas, public
  engine-neutral types, evaluator, framework resolver, or textual source
  contract semantics.
- Use a new Creator-owned independent Scene, never the superseded TASK-013
  monolith or full composable-loadout character as the first VFX consumer.
- Use deterministic procedural Cocos visuals for footstep dust, hand trail,
  and persistent aura; do not add real audio playback or gameplay execution.
- Reuse accepted readiness, generation-token, symmetric teardown,
  single-input-handler, frozen-manifest, global-sort, projection, and runtime
  assertion boundaries from TASK-013R1–R7.
- Complete the authorized Transform Stress control in the same feature:
  `X` is the unique registry-owned key because `T` already owns track
  switching; a single outer `TransformStressRoot` applies deterministic
  translation, non-uniform scale, and rotation around the unchanged authored
  rig/socket hierarchy. Rebuild preserves the current stress state and Exact
  Reset restores Stress OFF plus the baseline transform.
- Keep evidence video and manifest on `evidence/task-014b` through external
  review; local capture originals remain ignored and untracked. Publish the
  accepted feature as a Draft PR, then remove the temporary evidence branch
  after PR CI passes.
- Do not start TASK-014C, Unity/Godot adapters, Windows validation, Red Cap
  reconstruction, or production audio/gameplay behavior.

### Execution

1. Inspect the accepted minimal Creator lifecycle, Scene identity, generated
   runtime, projection, sorting, manifest, and test patterns.
2. Add a typed Cocos adapter core that exhaustively consumes semantic
   commands, resolves cue/socket registries, applies transform/follow axes,
   owns active instances, rejects duplicate/unknown operations, and performs
   failure-safe cleanup.
3. Add deterministic reference data and procedural renderer plans for
   one-shot footstep dust, looping hand trail, and persistent aura.
4. Add one Creator-owned Scene/runtime with one typed semantic-input registry,
   complete HUD, real socket projection, debug overlays, lifecycle rebuild,
   and symmetric teardown.
5. Add direct adapter tests for all required dispatch, diagnostics, cleanup,
   ordering, transform/follow, sort, manifest, Scene/meta, portability, and
   generated-closure requirements.
6. Synchronize architecture, Cocos adapter, acceptance, compatibility, and
   roadmap documentation.
7. Run direct tests, working-copy and frozen tracked-files-only full
   verification, generated closure, scope/media audits, and require a clean
   feature tree after commit.
8. Complete the Creator 3.8.8 clean-open/reopen, visual, console, spatial,
   lifecycle, control, and zero-leak gate. Stop on any real defect.
9. Commit and push only the feature branch after every automated and Creator
   gate passes; create no PR.
10. Capture one real 1280×720/30 fps H.264 High/yuv420p Web Preview video,
    verify local and downloaded bytes/decode, publish it plus `manifest.json`
    on `evidence/task-014b`, and stop for external visual review.

### Done when

- All required adapter diagnostics and 23 automated behavior/closure checks
  pass without Cocos leakage into engine-neutral packages.
- Creator clean open/reopen and second initialization are console-clean;
  effects visibly align with real sockets and satisfy authored lifecycle and
  follow policy.
- Exact Reset ends at authored Rest, STOPPED, 0.00 seconds, zero active VFX;
  rebuild leaves one runtime tree/input handler and zero leaked instances.
- Working-copy and frozen tracked-files-only verification pass, feature
  branch tracks zero MP4 files, and generated output is byte deterministic.
- The feature branch and verified evidence are published separately, external
  visual review passes, and the accepted feature is published as a Draft PR.

### Implementation result

- Focused TASK-014B tests pass 22/22; complete extension tests pass 216/216;
  semantic-event package tests pass 24/24.
- Working-copy and frozen tracked-files-only verification both pass 373/373.
- Creator 3.8.8 cold-open identity, R1/TASK-014B switching, Web Preview,
  console, transform-stress, VFX, Pause/Resume, track switch, two rebuilds,
  and Exact Reset gates pass in one run.
- `X` is the unique registry-owned Transform Stress key. Stress applies
  translation `(84, -48)`, rotation `17deg`, and scale `(1.18, 0.82)` on one
  outer root while the authored inner `(100, 60)` / `(1.35, 1.35)` baseline
  remains unchanged.
- Dust, trail, and persistent aura each report `0.0000px` position and
  `0.0000deg` rotation error under Stress ON. Projection round-trip error is
  `0.0000px`; duplicate starts, unknown stops, leaked instances, renderer
  conflicts, duplicate roots, duplicate inputs, stale nodes, and non-finite
  values remain zero.
- The persistent aura keeps one visible/evaluator/adapter/UIRenderer/
  Sorting2D instance across six loops and Pause/Resume, including under
  Stress ON and after rebuild.
- Two rebuilds finish at `SETUP 3 / TEARDOWN 2 / REBUILDS 2 / INPUT 1`,
  preserving Stress ON. Exact Reset restores Rest, `STOPPED`, `0.00s`,
  Stress OFF, baseline transform, zero active VFX, and Debug OFF.
- Creator and Web Preview consoles contain zero relevant warnings/errors.
  The Creator-owned Scene and `.meta` hashes remain byte-identical to the
  frozen preflight values.
- No TASK-014C, feature-branch MP4/audio, or new engine-neutral Transform
  Stress control was added.

### Final closure result

- The original evidence failed external visual review because its recording
  framing placed the character against the right/bottom boundary, clipped
  the aura and shortcut help, made Dust and Trail unreliable to identify,
  and left a highlighted pointer close enough to the Trail to be ambiguous.
- The acceptance layout now has explicit Normal/Stress visual contracts for
  the character, sockets, HUD glyphs, renderer geometry, safe viewport, and
  minimum effect ROI deltas. Runtime diagnostics fail closed on non-finite
  geometry or any viewport overflow.
- The HUD uses three deterministic help lines. Dust uses high-contrast orange
  filled/stroked geometry, Trail uses a green/white two-pass curve on the
  animated right hand, and Aura uses a smaller high-contrast complete
  double ring.
- Rebuild now detaches the old runtime root synchronously and preserves its
  one registered input handler. This rejects the live two-rebuild duplicate
  root/input failure while retaining symmetric final teardown.
- Creator 3.8.8 clean import, R1 → TASK-014B → R1 → TASK-014B, second open,
  resources, Rest, all three effects in Normal and Stress, Aura six loops,
  Pause/Resume, two rebuilds, post-rebuild effects, Exact Reset, and final
  clean hold pass with zero relevant Creator or Preview console output.
- The replacement recording is a real 82-second Web Preview capture at
  H.264 High, 1280×720, 30 fps, yuv420p. Local full decode, two-second
  contact-sheet review, effect/rebuild/reset high-frequency review, and ROI
  pixel-diff review pass. A small number of macOS recording pointer artifacts
  are present, but they obscure none of Dust, Trail, or Aura.
- The original evidence remains preserved and is classified
  `failed-external-visual-framing-and-hud-coverage`; the appended replacement
  is classified `passed-external-visual-review`.

### External visual acceptance

- External visual review: **PASS**.
- Reviewed feature SHA:
  `ebcb087426b0e2519f437e9706658d59f9da18a7`.
- Reviewed evidence SHA:
  `9e326f68337c61156a4be19576965e0b5f7e65ae`.
- Reviewed replacement video SHA-256:
  `5c1eeb1c574549ae4e7aafd9fd0b2bdfb5f882772a99d4404f75c6a2d4c54a4a`.
- Dust is clearly visible; the green/white double-layer Trail curve is
  clearly visible; the complete Aura remains one instance across six loops.
- Normal and Stress viewport, complete HUD, Rebuild, and Exact Reset: PASS.
- The replacement recording's final cumulative lifecycle is
  `SETUP 7 / TEARDOWN 6 / REBUILDS 6 / INPUT 1`. These totals include
  multiple rebuilds performed during recording. Every stable state retains
  one root, one input handler, and zero leaks.
- macOS recording pointer/pointer-trail artifacts are present but do not
  obscure Dust, Trail, or Aura. The replacement is not claimed to keep the
  pointer outside the Canvas throughout.

## Completed plan: TASK-014A1 Persistent Lifecycle Coalescing

- Status: Accepted
- Started: 2026-07-27
- Branch: `fix/task-014a1-persistent-lifecycle-coalescing`
- Baseline `main` / `origin/main`:
  `1ab573e4b99d6c04973dc62803c5c2579c56e4a9`
- Declared budget: at most 12 changed files and 1,500 changed lines; textual
  documentation and engine-neutral evaluator/tests only, with zero schema,
  Cocos, Scene, `.meta`, binary, media, evidence, adapter, TASK-014B, or
  TASK-014C changes.

### Goal

Correct Character Semantic Events 1.0 persistent lifecycle evaluation so one
track/event owns at most one active persistent instance across animation
loops. Preserve the cycle of the first actual start in the concrete instance
ID and make the engine-neutral evaluator the lifecycle authority for every
future engine adapter.

### Boundaries

- Change only the engine-neutral evaluator, its tests, and TASK-014A/014A1
  lifecycle documentation.
- Keep one-shot events per authored crossing and looping start/stop commands
  per authored cycle.
- Coalesce persistent starts against the transactional active-instance copy,
  including multiple cycle crossings inside one `advance()`.
- Preserve ordering, Pause/Resume, explicit initial-track selection,
  advancement bounds, atomic rejection, gameplay windows, and deterministic
  reset/switch/dispose cleanup.
- Do not add a schema field/version, adapter behavior, runtime integration,
  Cocos file, effect/audio asset, evidence, TASK-014B change, or TASK-014C
  work.

### Execution

1. Freeze the protected uncommitted TASK-014B status and hashes, then create
   this isolated worktree from the exact main baseline.
2. Add a logical persistent active key `<trackId>:<eventId>` and consult the
   transactional active map before emitting each authored persistent start.
3. Add direct regression coverage for six-cycle and many-cycle coalescing,
   Pause/Resume, Reset/replay, track switching, disposal, distinct persistent
   events/tracks, unchanged looping/one-shot behavior, ordering, and rejected
   advancement atomicity.
4. Update RFC-0014, ADR-0015, TASK-014A, TASK-014A1, and the semantic-event
   contract documentation with the corrected 1.0 lifecycle semantics.
5. Run package, full working-copy, tracked-files-only, schema identity,
   generated-output closure, metadata-race, diff, clean-tree, MP4, scope, and
   protected-reference gates.
6. Commit and push the focused branch, open one Draft PR into `main`, wait for
   GitHub Actions, and stop for external review without merging.

### Done when

- Six or many crossed cycles yield one persistent start and one active
  persistent instance per track/event.
- Exact Reset, track switch, and first disposal emit exactly one cleanup stop;
  replay or switching back can create one new instance, and repeated disposal
  emits nothing.
- Two different persistent event IDs remain independent, while looping and
  one-shot delivery stay per-cycle/per-crossing.
- Rejected overflow or command-budget advancement leaves progress and
  persistent state unchanged.
- Both verification modes pass from the final diff, the worktree is clean
  after commit, the Draft PR remains unmerged, and the protected TASK-014B
  fingerprint is byte-identical to its recorded state.

### Result

- External acceptance: PASS on 2026-07-27.
- Accepted implementation:
  `ae66de71dd99e5a899a2f1cae9e0a9c3726a58fc`.
- Direct semantic-event tests pass 24/24.
- Full working-copy verification passes 376/376.
- Tracked-files-only verification after a frozen install passes 376/376.
- Schema byte identity, generated-output closure, metadata-race, diff, scope,
  and binary/media gates pass.
- PR #13 was squash-merged into `main` as
  `88fe24f3617a136f4dad319024b197e8be81caf7`.

## Completed plan: TASK-014A Engine-Neutral Character Semantic Event Contract

- Status: Complete
- Started: 2026-07-26
- Branch: `feat/task-014a-semantic-event-contract`
- Baseline `main`: `e1abc595c7cfcb95cc372e8a5b13de1fd7f8d49a`
- Release baseline: `v0.2.0`
- Automated baseline: 352/352 tests; final branch result: 368/368 tests
- Declared remediated PR budget: at most 45 changed files and 8,000 changed
  lines;
  textual fixtures only and zero generated binary, Scene, `.meta`, VFX,
  audio, or evidence files. This is below the mandatory split thresholds of
  100 files and 25,000 lines.

### Goal

Define a versioned engine-neutral character semantic-event and VFX-cue
contract, stable semantic validation, and a deterministic animation-timeline
event evaluator. Prove boundary behavior for normal forward playback,
skipped frames, loops, pause/resume, exact reset, and clip switching without
implementing any engine adapter or effect.

### Boundaries

- Add one engine-neutral workspace package, one canonical JSON Schema, small
  textual fixtures, tests, RFC/ADR/task records, and contract documentation.
- Keep semantic events separate from VFX cue definitions and use
  event-kind-specific typed payloads rather than an unrestricted payload.
- Validate clip IDs against declared animation clips and socket IDs against
  an engine-neutral Rig Layout.
- Represent gameplay-triggered injection only in architecture; the MVP
  evaluator consumes animation-timeline progress only.
- Do not modify TASK-013/R1-R7 behavior, Cocos runtime code, Creator Scenes or
  metadata, Full Loadout inputs/outputs, art/audio assets, gameplay code, or
  start TASK-014B.
- Reverse playback, arbitrary seeking, and network synchronization remain
  explicitly unsupported.

### Execution

1. Record the RFC, accepted architecture decision, and full task acceptance
   criteria before contract implementation.
2. Add the canonical 1.0 schema and matching TypeScript discriminated unions
   for event tracks, semantic events, VFX cue definitions, transforms,
   follow policy, lifecycle, and typed VFX/audio/gameplay payloads.
3. Parse and validate documents fail-closed with stable codes, including
   cross-document animation clip and Rig Layout socket compatibility.
4. Implement a stateful deterministic evaluator using `(previousTime,
   currentTime]`, explicit loop counts, stable same-time ordering, and
   lifecycle operations for play, pause, resume, exact reset, and clip
   switching.
5. Add valid and negative textual fixtures plus exhaustive validation and
   evaluator boundary tests.
6. Synchronize character-contract, rig-animation, index, roadmap, and plan
   documentation; explicitly record that no Cocos VFX runtime or rendered
   effect exists.
7. Run package tests and the complete `CI=true pnpm verify`, inspect scope and
   generated-output cleanliness, and record the final result.
8. Remediate the public evaluator boundary so direct inputs receive the same
   structural and semantic validation as parsed JSON, with explicit initial
   track selection and fail-closed diagnostics.
9. Bound forward advancement before state mutation and model engine-neutral
   one-shot emission plus looping/persistent start and stop commands,
   deterministic cleanup, and same-boundary stop-before-start ordering.
10. Require and pair gameplay window identifiers within each track, forbid
    window identifiers on signals, and cover each stable pairing diagnostic
    with textual fixtures and tests.

### Done when

- Canonical schema, public types, parser, validation, diagnostics, fixtures,
  and documentation agree and remain engine neutral.
- Every required stable validation error is directly covered.
- Deterministic evaluation covers same-time order, skipped frames, one and
  multiple loop crossings, pause/resume, exact reset, clip switching, replay,
  and the documented zero/duration boundary policy without duplicate firing.
- Unsupported reverse playback or ambiguous seeking fails clearly before
  event delivery.
- Full verification passes with no unrelated or engine-runtime changes and
  the final diff remains within the declared PR budget.

### Result

- Added the canonical Character Semantic Events 1.0 schema and standalone
  `@gameai/character-semantic-events` engine-neutral package.
- Semantic events and VFX cue definitions remain separate; VFX, audio, and
  gameplay payloads are discriminated and all published diagnostics have
  direct coverage.
- One public fail-closed boundary now applies canonical schema and
  semantic/context validation to parsed JSON and direct evaluator inputs;
  evaluator creation requires an explicit initial track.
- Deterministic evaluation exposes authored `emit` plus lifecycle `start` and
  `stop` commands, stable track/event/cycle instance IDs, stop-before-start
  ordering, cleanup, overflow rejection, and 10,000-cycle/command bounds
  without partial mutation.
- Gameplay window IDs and track-local pairing are schema/semantic validated
  with five specific stable diagnostics and textual negative fixtures.
- Package verification passed 16/16 tests. Working-copy and frozen
  tracked-files-only `CI=true pnpm verify` each passed 368/368 tests,
  including the accepted metadata-race regression.
- Final measured scope is 35 changed files, 3,258 insertions, and 6 deletions;
  the exact publication totals are recorded from the final commit diff. This
  remains below both declared and mandatory split thresholds. There are no
  binary/generated assets, Cocos files, Scenes, `.meta` files, or evidence
  media.
- TASK-014A defines contracts, validation, and evaluation only. No Cocos VFX
  runtime exists and no visual effect was rendered; TASK-014B remains
  unstarted.

## Completed plan: Cocos Scene Generation / Metadata Audit Race

- Status: Accepted
- Started: 2026-07-26
- Completed: 2026-07-26
- Accepted: 2026-07-26
- Branch: `fix/cocos-scene-metadata-audit-race`
- Baseline: `f3ff419522a4d65305b7a20a88a40b26c7084903`
- Accepted implementation:
  `620526fdb0d0b45561df5ae6a3b0bdf1a6928e78`
- Declared budget: at most 8 changed files and 1,500 changed lines; zero
  generated Scene, `.meta`, binary, evidence, schema, runtime, or TASK-014A
  files.

### Goal

Remove the nondeterministic race between the legacy TASK-013 Scene-generation
test and concurrent all-Scene metadata audits without serializing the test
suite, weakening audits, or adding retry behavior.

### Root cause

`test/cocos-scene-metadata.test.mjs` runs
`scripts/generate-composable-loadout-scene.mjs` twice while Node executes
other test files concurrently. The generator uses `writeFile` to truncate and
rewrite the tracked
`assets/composable-full-loadout-reference.scene`. Concurrent
`validateTrackedCocosScenes` calls in TASK-013R7 enumerate and parse that same
shared Scene, so they can observe incomplete JSON. The canonical V2 Scene is
not the writer; its audit fails because the audit intentionally covers every
tracked Scene.

### Boundaries

- Generate legacy idempotence-test output below an isolated temporary assets
  root and leave the tracked canonical and legacy Scenes immutable during
  tests.
- Add a narrow same-directory atomic-write helper for the production legacy
  Scene generator.
- Preserve byte-identical generated Scene output and Creator-owned `.meta`
  files.
- Add focused concurrent stress, deterministic-byte, tracked-immutability,
  temporary-file closure, and failure-cleanup tests.
- Do not change Cocos runtime behavior, Scenes, metadata, TASK-014A,
  TASK-014B, test concurrency, timeouts, or parse/retry policy.

### Execution

1. Record the failure topology and protected TASK-014A fingerprint.
2. Parameterize the legacy Scene generator with an optional isolated assets
   root and replace its direct write with an atomic same-directory write.
3. Move the legacy idempotence test to a complete temporary fixture.
4. Add at least 50 concurrent writer/reader stress iterations plus cleanup and
   deterministic-output assertions.
5. Run focused tests, three complete working-copy verification runs, and
   three complete tracked-only verification runs.
6. Confirm generated-output closure, clean tree, text-only scope, protected
   refs, and exact TASK-014A fingerprint preservation.
7. Commit, push, and open one Draft PR without merging.

### Done when

- Metadata audits cannot observe partially serialized JSON.
- Generator tests do not mutate tracked Scenes or `.meta` files.
- Atomic write success and failure leave no temporary files.
- Generated Scene bytes remain identical to the tracked accepted output.
- Every required full verification run passes with the actual baseline-plus-
  regression test total and the worktree remains clean.

### Closeout result

- External code review: PASS.
- The legacy generator test now uses an isolated complete asset fixture; no
  test-time process writes a tracked Scene or `.meta` file.
- Scene publication writes, flushes, and closes a unique same-directory
  temporary file before atomic replacement, with failure cleanup covered.
- The focused regression passed 50 shared isolated Scene writer/metadata-
  reader iterations, plus 50 atomic writer/reader iterations.
- Three working-copy and three frozen-install tracked-files-only verification
  runs each passed 352/352 tests (349 baseline tests plus three net regression
  tests).
- GitHub Actions verification passed on the accepted implementation.
- Generated output remained closed and deterministic, with zero Scene,
  `.meta`, binary, MP4, runtime, TASK-014A, or TASK-014B changes.
- The protected uncommitted TASK-014A worktree was not modified.

## Completed plan: RELEASE-0.2.0 Character Loadout Baseline Closeout

- Status: Complete
- Started: 2026-07-26
- Completed: 2026-07-26
- Branch: `docs/release-v0.2.0-character-loadout`
- Baseline `main`: `2e6f54191f4eff7f2699bda24336c1ada8cff35a`
- Declared budget: 10 documentation files, 0 generated-output files, 0
  runtime/code/schema/asset/Scene/package/lockfile/test files.
- Tag status: `v0.2.0` does not exist; tag and GitHub Release creation are
  deferred until this documentation Draft PR is reviewed and merged.

### Goal

Close the completed Character Loadout milestone as a durable v0.2.0
documentation baseline. Record supported architecture, canonical Cocos entry
points, compatibility, verification, limitations, migration guidance,
historical references, and the next unstarted roadmap areas without changing
runtime or generated behavior.

### Boundaries

- Documentation only: no runtime, schema, resolver, generator, fixture,
  Scene, asset, package-version, lockfile, or test changes.
- Do not start TASK-014 or mark any future roadmap item as started.
- Do not create `v0.2.0`, a GitHub Release, or a non-Draft PR.
- Do not delete recovery branches, evidence history, or legacy/provenance
  files.

### Execution

1. Confirm exact main, post-merge CI, tags, clean tree, protected refs, no
   TASK-014 implementation, and zero tracked MP4 files.
2. Record this plan and
   `tasks/RELEASE-0.2.0-character-loadout-baseline.md`.
3. Update the project status, roadmap, changelog, release baseline,
   compatibility matrix, documentation index, postmortem resolution, and
   PR-size/acceptance policy.
4. Run working-copy and tracked-files-only frozen verification, validate
   Markdown links and repository paths, and prove the diff is docs-only.
5. Commit and push the documentation branch, open one Draft PR into `main`,
   and stop for review without tagging, releasing, merging, or starting
   TASK-014.

### Done when

- Every required release document exists and accurately distinguishes
  verified support from future architecture direction.
- Both verification modes remain 349/349 and generation leaves tracked files
  unchanged.
- Relative Markdown links and referenced repository paths resolve.
- The complete diff contains only intended documentation files, with no
  tracked MP4.
- One Draft PR targets `main`; `v0.2.0`, GitHub Release, and TASK-014 remain
  absent.

### Closeout result

- TASK-013 and recovery milestones R1-R7 are closed and integrated through
  PR #9 at the recorded `main` baseline.
- Working-copy verification passed 349/349 tests.
- Tracked-files-only frozen-install verification passed 349/349 tests.
- Link, repository-path, documentation-only scope, clean-tree generation,
  and zero-tracked-MP4 checks passed.
- This documentation branch stops at a Draft PR for human review. Tagging,
  GitHub Release publication, merging, and TASK-014 remain unstarted.

## Accepted plan: TASK-013R7 Pre-Merge Remediation

- Status: Accepted after external visual review
- Started: 2026-07-26
- Accepted: 2026-07-26
- Branch: `recovery/task-013r7-full-loadout-release-candidate`
- Draft PR: `#9`
- Baseline R7 acceptance commit:
  `c4d8f3258308ed0b1bbb570e9a264cfe0ae4d6e9`
- Reviewed runtime implementation commit:
  `d9e7bfae0151dec71ebb58456f69b900eed9cf3a`
- Documentation-only acceptance commit: the following commit titled
  `docs: accept TASK-013R7 pre-merge remediation`; it records acceptance and
  does not change the reviewed runtime.
- Reviewed remediation evidence head:
  `392b85a95535d7423c8b6dea34af87a9ee225300`
- Reviewed remediation evidence publication:
  `f213373700eb090403419c664262f52177d43768`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Resolve the focused pre-merge findings in Draft PR #9 without changing the
accepted visual design or user-facing loadout behavior. Make the
engine-neutral 12-state contract authoritative, gate runtime input on terminal
readiness, harden semantic validation, replace tautological accessory
measurement, close generated-output sets, isolate legacy generation, and
publish replacement live Creator evidence from the final appended feature
SHA.

### Boundaries

- Append focused commits only; do not rewrite accepted or protected history.
- Keep PR #9 Draft and do not merge it.
- Preserve the canonical V2 Scene, accepted R1-R6 harnesses, historical
  monolith, generated mirrors, loadout appearance, controls, reset defaults,
  resource count, sorting, and semantic clips.
- Do not add TASK-014, automatic fitting, IK, physics, mesh/cloth behavior,
  animation blending, root motion, two-handed props, Red Cap reconstruction,
  or cross-engine adapters.

### Execution

1. Audit every PR #9 file and record a focused remediation task before code
   changes.
2. Extend the engine-neutral loadout resolver with stable duplicate,
   reference, exclusivity, and prop-state diagnostics; define and resolve the
   complete canonical 12-state matrix from the tracked source contract.
3. Derive the R6-compatible Cocos plan from those resolved canonical states
   and preserve exact parity through deterministic tests.
4. Register runtime input only after manifest PASS, node construction,
   playback creation, exact Reset, and lifecycle READY; failure and teardown
   leave zero handlers and no partial runtime.
5. Measure accessory socket and attachment-anchor world positions
   independently, validate duplicate primary/overlay nodes, and state the
   AABB seam boundary accurately.
6. Correct the canonical adapter ID, README entry points, ADR/acceptance
   wording, and isolate monolith generation behind an explicit legacy
   provenance command.
7. Enforce exact generated file sets and transitive provenance, add
   post-verify clean-tree CI closure, and publish a retention report without
   deleting accepted files.
8. Pass working-copy and tracked-files-only verification, exact-output
   closure, clean-tree checks, the uninterrupted Creator 3.8.8 gate, local
   media validation, temporary evidence publication, uploaded-copy identity,
   and full decode.
9. Append and push focused implementation commits, update Draft PR #9 in
   place, keep it Draft, and stop for external visual review.

### Remediation result

- Working-copy verification: 349 tests passed, 0 failed.
- Tracked-files-only frozen-install verification: 349 tests passed, 0
  failed.
- The tracked engine-neutral 12-state contract is authoritative;
  `resolveCharacterLoadout` validates and resolves it, and generation derives
  the R6-compatible Cocos plan from that resolved output.
- Stable fail-closed validation covers duplicate merged slot, wearable-set,
  prop-state, seam, loadout-state, and exclusive-group IDs; unknown prop,
  slot, set, and group members; invalid/conflicting exclusive groups; and
  incompatible rig references.
- The accessory spatial negative test independently perturbs the resolved
  anchor by `3 px` and reports `3 px` drift.
- Runtime input registration follows resource PASS, node construction,
  playback creation, Exact Reset, and lifecycle READY. Handler count is
  exactly 1 in READY and 0 while loading, failed, rebuilding, disabled, or
  destroyed.
- Primary prop and hand-overlay duplicate nodes are independently guarded.
- Exact generated-file-set closure, transitive provenance, and post-verify
  clean-tree checks: PASS. The superseded monolith generator is available
  only through the explicit `legacy:verify-task013-provenance` command.
- Garment seam validation measures transformed world-space AABB overlap; it
  does not claim oriented-polygon intersection or cloth simulation.
- Creator 3.8.8 clean-open, R6 Scene switch, canonical Scene reopen, and
  second runtime initialization: PASS.
- Canonical runtime: 35/35 resources, all 12 states, four semantic clips,
  Pause/Resume, spatial Debug, Transform Stress, two lifecycle rebuilds,
  post-rebuild switching, and Exact Reset: PASS.
- Runtime guards: all spatial, duplicate, sorting, role, finite-coordinate,
  and viewport counters remained 0; Creator and Preview consoles were clean.
- Replacement live evidence on `evidence/task-013r7-pr-remediation` passed
  external visual review. Its 72-second uploaded copy is byte-identical to
  the reviewed local media, has SHA-256
  `30fa9988defc305388b93a2bc4b079ff42d00f7b4558ef630986c63e48960abe`,
  and fully decodes.

### Done when

- Input handlers are 0 while loading/failed/disabled/destroyed/rebuilding and
  exactly 1 only after full runtime readiness.
- One engine-neutral contract owns exactly 12 unique canonical states and the
  derived Cocos plan remains behaviorally equal to accepted R6.
- Every requested invalid semantic mutation fails with a stable code before
  any lossy `Map` construction or fallback.
- Accessory socket drift is measured from independent expected/actual world
  quantities and a perturbed fixture produces a non-zero failure.
- Canonical adapter ID is
  `composable-character-loadout-reference-v2`; legacy generation is explicit,
  non-canonical, and tested as unselectable by the canonical facade/Scene.
- Generators reject stale/unexpected outputs, tracked-only regeneration is
  deterministic, and post-verify tracked state is clean.
- Both automated modes, Creator gate, spatial/duplicate guards, and
  replacement evidence upload verification pass from the final feature SHA.

## Accepted plan: TASK-013R7 Recovered Full-Loadout Release Candidate

- Status: Accepted after external visual review
- Started: 2026-07-26
- Accepted: 2026-07-26
- Branch: `recovery/task-013r7-full-loadout-release-candidate`
- Original implementation commit:
  `37b7134fbb88ebf7f2b2ea2823c9ce2d597531d9`
- Identity-repair reviewed implementation commit:
  `ce5bb6d1f0b7f1676243ded6e2781d915f7005b4`
- Identity-repair reviewed evidence commit:
  `ebd447ad6e7158d1dfa26f7ea5e60bc74daa851f`
- Final reviewed runtime implementation commit:
  `d9e7bfae0151dec71ebb58456f69b900eed9cf3a`
- Final reviewed remediation evidence head:
  `392b85a95535d7423c8b6dea34af87a9ee225300`
- Baseline / frozen accepted R6:
  `5d708cb676c626244218e82a9e2fd9343aa5f736`
- Frozen accepted R5:
  `1f87032bf45e806c9db6360c9a7837c97baa93b2`
- Frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Publish the accepted R1-R6 recovery chain through one canonical,
engine-neutral Cocos adapter entry point and one Creator-owned canonical
release-candidate Scene. Prove exact parity with accepted R6 without adding a
new attachment capability or reviving the superseded monolithic TASK-013
runtime. The pre-merge remediation makes the existing engine-neutral
12-state contract authoritative and hardens its resolver validation without
changing accepted behavior.

### Boundaries

- Wrap or re-export the accepted R6 plan, state, manifest, semantic input,
  sorting, animation, reset, lifecycle, projection, and spatial boundaries.
- Keep the R6 Scene unchanged and available for the required live parity
  smoke test.
- Create and save the canonical Scene and script identities through Cocos
  Creator 3.8.8. Generators may mirror deterministic source modules but may
  not synthesize Scene UUIDs or component class IDs.
- Preserve the exact 12-state matrix, no/left/right prop behavior, four
  semantic clips, default reset state, resource set, global ordering, and
  `0.5 px` tolerance.
- Mark the original `composable-full-loadout-reference.scene` runtime as
  superseded and non-production in documentation only; do not delete or
  modify it.
- Do not add capabilities, broadly rewrite R1-R6, change a schema, start
  TASK-014, or implement Unity/Godot adapters. Resolver changes are limited
  to authoritative 12-state resolution and fail-closed semantic validation.

### Execution

1. Record TASK-013R7 scope, acceptance criteria, canonical boundary, and
   supersession decision before implementation.
2. Add a small canonical adapter facade and deterministic descriptor that
   consume the accepted R6 modules.
3. Add canonical/R6 parity tests for state IDs and membership, resource
   manifest, semantic inputs, sorting, clip IDs, reset defaults, and spatial
   tolerance.
4. Create and save the canonical Creator-owned Scene through Creator 3.8.8
   and validate Scene/component metadata from tracked files.
5. Pass working-copy and tracked-files-only frozen verification.
6. Run the uninterrupted canonical Creator gate, including two lifecycle
   rebuilds and post-rebuild switching.
7. Open the accepted R6 Scene and smoke-test default, left prop, right prop,
   Integration Stress, and Exact Reset for live parity.
8. Stop immediately without patching or publishing evidence if any live
   difference or defect appears.
9. If all gates pass, commit/push one R7 release-candidate implementation,
   record one canonical Creator Web Preview video, publish and re-download
   `evidence/task-013r7`, verify byte/hash/frame/metadata/decode identity, and
   stop for external review.

### Focused release-blocking identity repair

- External review found that the canonical V2 Web Preview inherited the
  visible `TASK-013R6` HUD title from the shared runtime.
- Add one typed display identity at the adapter boundary. The accepted R6
  component keeps its existing identity; the canonical component injects a
  neutral production identity from the canonical facade.
- HUD title and ready diagnostics must consume the injected identity. Scene
  filename, script filename, branch name, task ID, and asset-name conditionals
  are not identity sources.
- Preserve plans, resources, inputs, sorting, animation IDs, reset defaults,
  loadout states, lifecycle, projection, and runtime validation behavior
  exactly.
- Re-run both automated verification modes and the focused Creator parity
  gate. If no other defect appears, append one feature commit and replacement
  evidence while preserving the superseded original evidence entry.

### Done when

- The canonical facade and accepted R6 expose equivalent plans, 12-state
  membership, manifests, input mappings, sorting, clip IDs, reset defaults,
  and spatial tolerance.
- The canonical Scene owns valid Creator metadata and contains exactly one
  canonical adapter component.
- Clean open, scene switch/reopen, second initialization, 35-resource
  terminal PASS, every state/clip/control, transform stress, Debug ON/OFF,
  two rebuilds, post-rebuild switching, and Exact Reset pass without console
  errors, duplicates, drift, fallback, or ordering violations.
- Canonical and accepted R6 live behavior match for the required parity smoke.
- Both verification modes, local media validation, and uploaded-copy
  verification pass while all frozen/protected refs and the old demo remain
  unchanged.

### Implementation acceptance

- Working-copy `CI=true pnpm verify`: PASS, 349 passed, 0 failed.
- Tracked-files-only frozen install and `CI=true pnpm verify`: PASS,
  349 passed, 0 failed.
- Engine-neutral 12-state contract → `resolveCharacterLoadout` → derived
  R6-compatible Cocos plan: PASS with exact behavioral parity.
- Runtime readiness and input gating: PASS; exactly one input handler exists
  only in READY and zero exist during loading, failure, rebuild, disable, or
  destroy.
- Stable merged-ID, reference, exclusivity, prop-state, and rig-compatibility
  negative tests: PASS. The independent accessory-anchor perturbation reports
  the expected `3 px` drift.
- Duplicate primary prop and hand-overlay validation: PASS.
- Exact generated-output closure, explicit legacy provenance-only generation,
  deterministic tracked-only regeneration, and post-verify clean tree: PASS.
- Creator-owned canonical Scene identity and metadata: PASS.
- Canonical/R6 automated descriptor, state, resource, input, sorting, clip,
  reset, and tolerance parity: PASS.
- Creator 3.8.8 canonical live gate: PASS for all 12 loadout states, four
  semantic clips, Pause/Resume, transform stress, Debug ON/OFF, two lifecycle
  rebuilds, post-rebuild input, and Exact Reset.
- Lifecycle counters advanced from `SETUP 1 / TEARDOWN 0 / REBUILDS 0` to
  `SETUP 3 / TEARDOWN 2 / REBUILDS 2`.
- Resource terminal state remained 35/35 PASS with zero duplicate requests.
- Maximum projected joint, Skeleton, accessory socket, garment seam, and prop
  grip errors were all `0.000 px`; sorting, role, duplicate, non-finite, and
  debug-region violations were all 0.
- Accepted R6 live parity smoke: PASS for default, left prop, right prop,
  Integration Stress, and Exact Reset.
- Creator and Preview Consoles: 0 relevant warnings, 0 errors.
- No live difference or defect occurred after the hard-stop gate began.
- Focused canonical identity gate: PASS. Canonical V2 visibly reports
  `GAMEAI · COMPOSABLE CHARACTER LOADOUT V2`; accepted R6 visibly retains
  `TASK-013R6 · GENERIC ONE-HANDED PROP INTEGRATION`.
- Focused canonical smoke after returning from R6: PASS for no/left/right
  prop, garment/accessories combined, Integration Stress, one rebuild, and
  Exact Reset with 35/35 resources and all spatial/duplicate counters at 0.
- Creator and Preview consoles remained clean during the focused identity
  gate. No second runtime or visual defect appeared.
- External visual review of the replacement evidence: PASS.
- The canonical Creator-owned V2 Scene and
  `GAMEAI · COMPOSABLE CHARACTER LOADOUT V2` HUD identity were visible; no
  `TASK-013R6` identity appeared in the canonical preview.
- The reviewed replacement demonstrated all 12 loadout states, no/left/right
  prop states, Wave, Prop Swing, Integration Stress, Pause/Resume, spatial
  Debug overlays, Transform Stress, two lifecycle rebuilds, post-rebuild
  switching, Exact Reset, and the final authored Rest state at `STOPPED`
  `0.00s` with no prop, Stress OFF, and Debug OFF.
- Lifecycle counters advanced from `1 / 0 / 0` to `3 / 2 / 2`; spatial,
  duplicate, sorting, and role violation counts remained 0.
- Replacement video
  `task-013r7-recovered-full-loadout-release-candidate-v2.mp4`: 2,790 frames,
  SHA-256
  `84424ea760bbeb721e0610afa380450623f702f5ebd6cadf8acff8f4563420a8`,
  complete decode PASS.
- The original video is retained in the reviewed manifest with status
  `superseded-canonical-hud-identity-mismatch`.
- External visual review of the final 72-second pre-merge remediation
  evidence for runtime
  `d9e7bfae0151dec71ebb58456f69b900eed9cf3a`: PASS. Evidence head
  `392b85a95535d7423c8b6dea34af87a9ee225300`, video SHA-256
  `30fa9988defc305388b93a2bc4b079ff42d00f7b4558ef630986c63e48960abe`,
  uploaded-copy identity PASS, and full FFmpeg decode PASS.

## Accepted plan: TASK-013R6 Generic One-Handed Prop Integration

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-26
- Branch: `recovery/task-013r6-one-handed-prop-integration`
- Implementation commit:
  `fe981463962231969b4eff446ff03bf44b7b8a69`
- Reviewed evidence commit:
  `7a70d873d5e8516deaeab6eccdc62f6e57f72db7`
- Baseline / frozen accepted R5:
  `1f87032bf45e806c9db6360c9a7837c97baa93b2`
- Frozen accepted R4:
  `90a8bf3acf8712f3c4923d25e7b9e50359f47a2b`
- Frozen accepted R3:
  `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c`
- Frozen accepted R2:
  `726859ebec11d6a09ecab5984fe1352fd62fd93a`
- Frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the accepted recovered adapter with one generic contract-resolved
one-handed prop capability. Compose no-prop, left-hand, and right-hand prop
states with the accepted garment/accessory matrix while preserving lifecycle,
manifest, semantic input, sorting, projection, spatial assertion, and
Creator-owned Scene boundaries.

### Boundaries

- Consume the existing TASK-012 engine-neutral prop contracts, authored hand
  sockets, grip anchors, transforms, layer roles, source assets, and semantic
  animation data.
- Create a separate Creator-owned R6 Scene; do not clone or modify the old
  Full Loadout Scene or frozen monolithic TASK-013 implementation.
- Keep shared runtime free of toolbox, briefcase, hand-side inference,
  filename semantics, Canvas correction constants, and implicit mirroring.
- Reuse and generically extend the accepted R1-R5 lifecycle, generation token,
  terminal manifest, input registry, global Sorting2D registry, Base Rig,
  attachment collection, garment seams, world-to-overlay projector, and
  runtime spatial assertions.
- Do not add two-handed props, inverse grip solving, IK, physics, collision,
  combat, cloth/mesh behavior, automatic fitting, root motion, blending,
  Red Cap reconstruction, cross-engine work, Full Loadout migration, R7, or
  TASK-014.

### Execution

1. Record TASK-013R6 scope and acceptance criteria before implementation.
2. Build a deterministic generic prop bridge plan covering the 12-state
   garment/accessory/prop cross-product.
3. Extend manifest, state/input registry, sorting, runtime attachment
   collection, grip measurement, lifecycle, and exact Reset through small
   separately tested modules.
4. Add Rest, Wave, Prop Swing, and Integration Stress through explicit
   semantic clip IDs.
5. Create and save an isolated Creator-owned R6 Scene through Creator 3.8.8.
6. Add deterministic TypeScript, 60 Hz, tracked-files-only, metadata,
   manifest, sorting, grip, state, lifecycle, duplicate, and Reset tests.
7. Pass working-copy and tracked-files-only frozen verification.
8. Run the complete Creator clean-open, switch/reopen, Console, 12-state,
   control, animation, transform, debug, rebuild, and Reset gate once.
9. If any live defect appears, stop without patching or recording evidence.
10. If the entire gate passes, commit/push one reviewed R6 implementation,
    capture and validate the Creator Web Preview video, publish
    `evidence/task-013r6`, verify the uploaded copy, and stop for external
    review.

### Done when

- All 12 states resolve deterministically with exact garment, accessory, and
  prop membership and exactly zero or one active prop as declared.
- Manifest completion precedes construction and every resource loads exactly
  once.
- Rest, Wave, Prop Swing, and Integration Stress keep joint, Skeleton,
  accessory socket, garment seam, and active hand-socket/grip errors at
  `<= 0.5 px`, including translation, non-unit scale, rotation, and nested
  transform stress.
- Unknown prop states, hand sockets, attachment slots, resources, parents,
  roles, and semantic clips fail closed without fallback.
- Duplicate prop/garment/accessory nodes, listeners, requests, non-finite
  coordinates, sorting/front-back violations, and out-of-viewport debug
  geometry are zero.
- Lifecycle rebuild leaves one character and the expected active sets; exact
  Reset restores authored Rest, stopped time zero, documented defaults,
  transform stress OFF, Debug OFF, and no residual geometry.
- Both verification modes, the uninterrupted Creator gate, local media
  checks, and uploaded-copy verification pass while every frozen/protected
  reference and the old demo remain unchanged.

### Implementation acceptance result

- Working-copy `CI=true pnpm verify`: PASS, 327/327 tests.
- Tracked-files-only frozen install and `CI=true pnpm verify`: PASS,
  327/327 tests.
- Creator 3.8.8 clean open, R5 switch/reopen, Creator Console, Preview
  Console, 12-state matrix, four clips, Pause/Resume, debug overlays,
  transform stress, lifecycle rebuild, post-rebuild switches, and Exact
  Reset: PASS in one uninterrupted run.
- Manifest: 35/35 PASS with 0 duplicate requests.
- Lifecycle after rebuild: setup 2, teardown 1, rebuild 1.
- Maximum joint, Skeleton, accessory socket, garment seam, and prop grip
  errors: `0.000 px`.
- Duplicate active attachment nodes, input handlers, resource requests,
  non-finite coordinates, sorting/front-back violations, and debug geometry
  outside the character region: 0.
- 60 Hz prop validation: 580 samples across both hands and both required
  stress clips, maximum grip error `0.000 px`.
- External visual review: PASS.
- Uploaded-copy SHA-256 identity and complete 4,567-frame decode: PASS.
- Visual review accepted all 12 states, no/left/right prop behavior,
  hand-over-handle layering, four clips, Pause/Resume, Transform Stress,
  spatial overlays, post-rebuild switching, Exact Reset, and zero duplicate,
  sorting, role, resource, or spatial errors.
- Evidence capture began at setup 2, teardown 1, rebuild 1 and visibly
  performed another rebuild, ending at setup 3, teardown 2, rebuild 2. This
  is accepted repeated-rebuild coverage rather than a counter discrepancy.

## Accepted plan: TASK-013R5 Multi-Part Garment Layering Bridge

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-25
- Branch: `recovery/task-013r5-garment-layering`
- Implementation commit:
  `f5083ca767ea0b5b7bb11109e09c8440e0b8e5e4`
- Reviewed evidence commit:
  `f0ded791e75811f3b9a48c7030a167b06576d68d`
- Baseline / frozen accepted R4:
  `90a8bf3acf8712f3c4923d25e7b9e50359f47a2b`
- Frozen accepted R3:
  `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c`
- Frozen accepted R2:
  `726859ebec11d6a09ecab5984fe1352fd62fd93a`
- Frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the recovered adapter from the accepted Base Rig and generic head
accessories to one contract-resolved multi-part wearable set. Reuse the
production-lite TASK-011 garment fixture to prove deterministic state
composition, global front/back sorting, live seam measurements, resource
loading, lifecycle behavior, and exact Reset without reconnecting the old
Full Loadout demo.

### Boundaries

- Create a separate Creator-owned R5 Scene; do not clone or modify the old
  Full Loadout Scene.
- Consume existing engine-neutral rig, attachment, wearable-set, seam, and
  animation data. Do not create a second Cocos source for pivots, hierarchy,
  placement, membership, seam constraints, roles, or clip IDs.
- Reuse and generically extend the accepted R1-R4 lifecycle, manifest, input,
  sorting, projection, spatial, Base Rig, and attachment collection modules.
- Keep shared runtime free of jacket, collar, sleeve, cuff, cap, and
  sunglasses branches. Fixture labels remain outside generic logic.
- Do not add props, grip, automatic fitting, cloth/mesh behavior, Full
  Loadout migration, Red Cap, cross-engine work, R6, or TASK-014.

### Execution

1. Record TASK-013R5 scope and acceptance criteria before implementation.
2. Build a deterministic generic wearable bridge plan for Base only, Garment
   only, Accessories only, and Garment plus accessories.
3. Extend manifest, state/input registry, sorting, runtime collection, seam
   measurement, spatial assertions, lifecycle, and exact Reset through small
   testable modules.
4. Create and save an isolated Creator-owned R5 Scene through Creator 3.8.8.
5. Add pure TypeScript, tracked-files-only, metadata, state, resource,
   ordering, seam, lifecycle, duplicate, and spatial regression tests.
6. Pass working-copy and tracked-files-only frozen verification.
7. Run the complete clean-open, scene-switch/reopen, Console, resource,
   state/control, animation, transform, debug, rebuild, and Reset Creator gate
   once without interruption.
8. If any live defect appears, stop without patching or recording evidence.
9. If the entire gate passes, commit/push one reviewed R5 implementation,
   record and validate the required video, publish `evidence/task-013r5`,
   verify the uploaded copy, and stop for external review.

### Done when

- All four states resolve deterministically with exact garment/accessory
  membership and counts and no duplicate IDs, nodes, requests, or listeners.
- Manifest completion precedes construction and every resource loads exactly
  once.
- Global/front-back ordering remains stable and every garment seam,
  accessory socket/anchor, joint marker, and Skeleton endpoint error is
  `<= 0.5 px` under Rest, Wave, Integration Stress, and root transform stress.
- Unknown slots, non-finite positions, sorting/front-back violations, and
  out-of-region debug geometry are zero.
- Lifecycle rebuild leaves one character and the expected state; exact Reset
  restores authored Rest, stopped time zero, default garment/accessory state,
  transform stress OFF, Debug OFF, and no residual geometry.
- Both verification modes, the uninterrupted Creator gate, media checks, and
  uploaded-copy verification pass while all frozen/protected refs and the old
  demo remain unchanged.

### Implementation result

- A new Creator-owned `task-013r5-garment-layering.scene` contains only
  Canvas, Camera, and one R5 bridge component at rest. Runtime construction
  remains gated on terminal manifest success.
- One deterministic generic garment bridge plan consumes the existing
  TASK-011 engine-neutral Attachment Layout, including 12 slots, 14
  attachment parts, one 11-member wearable set, 10 seam constraints, three
  head-accessory parts, and four loadout states.
- The runtime reuses the accepted lifecycle, resource coordinator, semantic
  control, sorting, Base Rig, projector, and spatial assertion boundaries.
  It adds small fixture-neutral garment plan, manifest, state, input, runtime
  collection, and spatial modules instead of reconnecting the old Full
  Loadout component.
- The uninterrupted Creator 3.8.8 gate passed clean open, R4 scene
  switch/R5 reopen, Preview and Creator Consoles, all four states and every
  semantic control, Wave and Integration Stress seam inspection,
  Pause/Resume, transform stress, lifecycle rebuild, post-rebuild garment and
  accessory toggles, exact Reset, and final Debug OFF cleanup.
- Live HUD results remained 31/31 resources, 17 base parts, 17 joints,
  11 garment parts, three accessory parts, 10/10 active seams in garment
  states, setup 2/teardown 1/rebuild 1 after lifecycle rebuild, and zero
  marker, Skeleton, socket, seam, duplicate, sorting, role, non-finite,
  unknown-slot, and out-of-viewport errors.
- Working-copy and tracked-files-only frozen verification each passed
  313 tests with zero failures.
- External visual review independently verified the uploaded video SHA-256,
  H.264 High 1280x720 30 fps yuv420p encoding, and complete decode of all
  4,095 frames.
- The reviewed recording visibly verifies all four state counts, garment
  layering around the torso, arms, and cuffs, garment seams in Rest, Wave,
  and Integration Stress, accessory socket alignment, joint/Skeleton debug
  alignment, Pause/Resume, transform stress, lifecycle rebuild at setup 2 /
  teardown 1 / rebuild 1, post-rebuild garment/accessory switching, exact
  Reset to STOPPED 0.00 seconds, and the final Stress-OFF/Debug-OFF state.
- The reviewed runtime reported zero spatial, sorting, front/back, duplicate,
  and resource errors. The temporary `evidence/task-013r5` branch may be
  removed after this acceptance documentation is safely pushed; the ignored
  local recording remains preserved and the accepted R5 branch is then
  frozen.

## Accepted plan: TASK-013R4 Head Accessory Layering Bridge

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-25
- Branch: `recovery/task-013r4-head-accessory-layering`
- Implementation commit:
  `52222633fc0ed9fc88004166420de22a1a3146ea`
- Baseline / frozen accepted R3:
  `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c`
- Frozen accepted R2:
  `726859ebec11d6a09ecab5984fe1352fd62fd93a`
- Frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the accepted generic single-attachment bridge to a deterministic
collection of simultaneously active head attachments. Use the existing
production-lite cap and sunglasses fixtures to prove generic slot resolution,
enabled-state groups, front/back layer roles, resource loading, runtime
mounting, socket/anchor measurement, and lifecycle behavior without
reconnecting the old Full Loadout demo.

### Boundaries

- Create a new Creator-owned R4 scene; do not clone or modify the old Full
  Loadout scene.
- Consume the existing Attachment Layout contract and resolver output. Do not
  add a Cocos-specific attachment, slot, pivot, state, or layer source.
- Reuse the accepted R1-R3 lifecycle, resource, semantic input, sorting,
  projection, spatial assertion, Base Rig, and generic attachment modules.
- Extend generic runtime identity from one resolved attachment to a collection
  keyed by declared attachment and slot IDs, never display or file names.
- Resolve front/back placement from declared role/order semantics through the
  global sorting registry; no attachment-specific sorting constants or magic
  offsets.
- Do not add garments, seams, props, grip, comparison views, Full Loadout
  presets, Red Cap, VFX, Unity, Godot, R5, or TASK-014 behavior.

### Execution

1. Record TASK-013R4 scope and acceptance criteria before implementation.
2. Add a deterministic generic multi-attachment bridge plan for Base only,
   Cap only, Sunglasses only, and Cap plus sunglasses.
3. Extend the resource manifest, semantic state/input registry, global sorting
   validation, runtime attachment collection, and per-attachment spatial
   measurements without fixture-specific branches.
4. Create and save an isolated Creator-owned R4 scene through Creator 3.8.8.
5. Add pure TypeScript, tracked-files-only, metadata, manifest, lifecycle,
   state, ordering, duplicate, and spatial regression tests.
6. Pass working-copy and tracked-files-only frozen verification.
7. Pass the complete Creator clean-open, scene-switch/reopen, Console,
   resource, four-state, animation, transform, debug, rebuild, and Reset gate
   in one uninterrupted run.
8. Commit and push one reviewed R4 feature commit.
9. Prepare a recording checklist, capture every required item in one Creator
   Web Preview video, decode/hash/publish it on `evidence/task-013r4`, and
   independently verify the uploaded copy.
10. Stop for external visual review without a PR or further attachment work.

### Done when

- All four states resolve deterministically and display exactly their declared
  active attachment parts with no duplicate IDs, requests, nodes, or
  prohibited slot collisions.
- Cap back/front and sunglasses retain stable declared front/back ordering in
  Rest, Wave, Integration Stress, and root transform stress.
- Every active socket-to-anchor error, maximum joint-marker error, and maximum
  Skeleton endpoint error is `<= 0.5 px`.
- Unknown slots/roles/attachments/parents/resources, non-finite positions,
  sorting/front-back violations, and out-of-region debug geometry are zero.
- Lifecycle rebuild leaves one character and the expected attachment set;
  exact Reset restores authored Rest, stopped time zero, the documented
  default accessory state, no duplicates, and Debug OFF.
- Both verification modes, the uninterrupted Creator gate, media checks, and
  uploaded-copy verification pass while all frozen/protected refs and the old
  demo remain unchanged.

### Implementation result

- A new Creator-owned
  `task-013r4-head-accessory-layering.scene` contains only Canvas, Camera, and
  one R4 bridge component at rest; runtime construction remains manifest
  gated.
- One generic collection plan resolves two declared slots and three declared
  attachment parts from the existing engine-neutral Attachment Layout.
- The required states resolve to exact active counts:
  Base only 0, Cap only 2, Sunglasses only 1, and Cap plus sunglasses 3.
- Front/back ordering is role driven and remains
  `hair-back < cap-back < head < sunglasses < hair-front < cap-front`.
- Working-copy and tracked-files-only frozen verification both pass with 300
  tests and 0 failures.
- The uninterrupted Creator 3.8.8 gate passed clean import, accepted-scene
  switch/reopen, Console checks, 20/20 resources, all states, repeated
  switching, Rest/Wave/Integration Stress, Pause/Resume, transform stress,
  lifecycle rebuild, post-rebuild switching, exact Reset, and Debug OFF.
- Runtime maxima are `0.000 px` for joint markers, Skeleton endpoints, and
  every active socket-to-anchor measurement. Unknown slots, duplicates,
  sorting/front-back violations, non-finite positions, and outside debug
  geometry are all 0.
- Lifecycle rebuild ended at setup 2, teardown 1, rebuild 1 with one character,
  three default-state attachment parts, no duplicate handlers, and no
  duplicate resource requests.
- External visual review: PASS.
- The 90-second, 2,700-frame Creator Web Preview recording visibly verified
  all four attachment states and their exact 0/2/1/3 part counts, repeated
  switching, Wave, Integration Stress, Pause/Resume, transform stress,
  socket/anchor and Skeleton alignment, lifecycle rebuild, post-rebuild Base
  and Cap switching, exact Reset, and final Debug-OFF cleanup.
- The visible lifecycle counters were setup 2, teardown 1, rebuild 1.
  Resources remained 20/20 PASS and all duplicate, sorting, front/back,
  spatial, unknown-slot, non-finite, and outside-debug diagnostics remained 0.
- Evidence commit:
  `6796a7a0744bc0add48f8eba79a453cf2f5ac32f`.
- Evidence media SHA-256:
  `39052cdc157493dc3b5dc09ca6f4b1f9b8c1cc34072d2f6c78c7e3b71c5b0325`.
  The uploaded copy matched its local SHA-256 and metadata and completed a
  full FFmpeg decode.
- The temporary `evidence/task-013r4` branch may be removed after this
  acceptance documentation is safely pushed. The ignored local recording
  remains available and no MP4 is tracked on the feature branch.
- No engine-neutral schema/resolver, accepted R1-R3 boundary, old Full Loadout
  scene, garment, prop, or protected reference changed.

## Accepted plan: TASK-013R3 Single Attachment Bridge

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-25
- Branch: `recovery/task-013r3-single-attachment-bridge`
- Implementation commit:
  `645957e0e2a6442509881e1920f2905192d2a24c`
- Baseline / frozen accepted R2:
  `726859ebec11d6a09ecab5984fe1352fd62fd93a`
- Frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Bridge exactly one resolved engine-neutral rigid attachment into the accepted
17-part Base Rig runtime. Use the production-lite sunglasses fixture only as
acceptance data while keeping slot resolution, node construction, resource
loading, enable state, sorting, socket/anchor measurement, lifecycle, and
semantic controls generic.

### Boundaries

- Create a new Creator-owned R3 scene; do not clone or modify the old
  Full Loadout scene.
- Consume the existing Attachment Layout contract and
  `resolveAttachmentLayout`; do not define a Cocos-specific attachment state,
  pivot, slot, or semantic clip source.
- Reuse the accepted R1 lifecycle, resource, sorting, projection, and spatial
  boundaries and the R2 Base Rig Bridge modules.
- The runtime adapter understands only generic IDs, slots, parent parts,
  transforms, anchors, enabled state, resource paths, and global draw order.
- Do not add cap layering, multiple attachments, garments, props, grip,
  comparison views, loadout presets, Red Cap, VFX, Unity, or Godot behavior.
- Unknown slot, attachment, parent, resource, semantic action, or clip fails
  clearly without fallback.

### Execution

1. Record TASK-013R3 scope and acceptance criteria before implementation.
2. Add a deterministic single-attachment bridge plan resolved from the
   engine-neutral rig and attachment contract.
3. Extend the manifest, semantic state/input registry, sorting validation, and
   spatial measurement for one generic attachment.
4. Build a separate Creator-owned scene and small runtime component by
   composing accepted modules instead of copying them into a monolith.
5. Add pure TypeScript, tracked-files-only, metadata, manifest, lifecycle,
   state, sorting, and socket/anchor regression tests.
6. Pass working-copy and tracked-files-only frozen verification.
7. Pass the complete Creator open/switch/reopen, Console, resource, state,
   animation, transform, attachment, debug, rebuild, and Reset gate in one
   uninterrupted run.
8. Commit and push one reviewed R3 feature commit.
9. Record, decode, hash, publish, re-download, and re-decode the temporary
   `evidence/task-013r3` review video.
10. Stop for external visual review without a PR or further attachment work.

### Done when

- Base-only and Base-plus-attachment states are selected through the one
  semantic input registry and correctly reported by the HUD.
- The enabled runtime has exactly one attachment parented through its declared
  slot; disabling removes it completely and re-enabling never duplicates it.
- Rest, Wave, Integration Stress, root transform stress, lifecycle rebuild,
  Pause/Resume, and exact Reset preserve the declared attachment relationship.
- Maximum joint-marker, skeleton-endpoint, and socket-to-anchor errors are each
  `<= 0.5 px`.
- Unknown slots, duplicate attachment nodes/requests/listeners, non-finite
  positions, out-of-region debug geometry, and sorting violations are zero.
- Both verification modes and the uninterrupted Creator gate pass.
- Feature and evidence branches are pushed while all frozen/protected refs and
  the old demo remain unchanged.

### Acceptance result

- A new Creator-owned
  `assets/task-013r3-single-attachment-bridge.scene` contains only Canvas,
  Camera, and one R3 bridge component.
- The generator resolves the existing engine-neutral attachment contract into
  one deterministic generic bridge plan; the runtime core contains no
  sunglasses-specific behavior.
- The terminal manifest loads 17 base parts and one attachment resource with
  18 unique requests, 0 failures, and 0 duplicate requests.
- Base-only and attachment-enabled states derive from the same semantic input
  registry used by the HUD and dispatcher.
- Rest, Wave, Integration Stress, Pause/Resume, transform stress, lifecycle
  rebuild, exact Reset, and Debug OFF passed in one Creator 3.8.8 run.
- Scene switch/reopen and a second preview initialization passed; Creator and
  Preview Consoles had 0 relevant warnings or errors.
- Maximum projected joint-marker, skeleton-endpoint, and socket-to-anchor
  errors were each `0.000 px` against the `0.5 px` tolerance.
- Duplicate attachment nodes, input handlers, and resource requests were 0;
  non-finite positions, unknown slots, sorting violations, and out-of-region
  debug geometry were 0.
- Working-copy and tracked-files-only frozen verification each passed all 287
  tests.
- External visual review: PASS.
- The original 64-second Creator Web Preview recording passed the core visual
  coverage for Base-only/attachment-enabled states, attachment
  disable/re-enable, Rest, Wave, Integration Stress, Pause/Resume, joint and
  Skeleton alignment, socket/anchor alignment, and transform stress.
- A focused 70-second, 2,100-frame supplemental recording passed the remaining
  visual coverage for lifecycle rebuild, post-rebuild attachment
  disable/re-enable and Wave follow, exact Reset, and final Debug-OFF cleanup.
- The supplemental recording visibly reports setup 2, teardown 1, rebuild 1,
  18/18 resources passed, 0 attachment/input/resource duplicates, spatial
  PASS, and `0.000 px` socket-to-anchor error.
- Original recording SHA-256:
  `2446cf4c8d548af25645e6854eb8a12486bb10cc4be1e2b0db58b84dc1e53ab6`.
- Supplemental recording SHA-256:
  `959d8fce394c5a628e57bf36a76462bcec4f81b38bb1d3da7da856179c96e22d`.
- Both uploaded copies were downloaded and verified for SHA identity,
  metadata, frame count, and complete decode. The final evidence manifest's
  `uploadedCopyVerification` field explicitly names the original media only;
  the supplemental copy was independently verified outside that field.
- The temporary `evidence/task-013r3` branch may be removed after this
  acceptance documentation is safely pushed. Ignored local recordings remain
  available and no MP4 is tracked on the feature branch.

## Accepted plan: TASK-013R2 Base Rig Bridge

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-25
- Branch: `recovery/task-013r2-base-rig-bridge`
- Implementation commit:
  `fda803194a517960d9edec6ea362a929a0966827`
- Baseline / frozen accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013 feature:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Connect only the production-lite base character to the accepted R1 runtime
adapter boundaries and prove that the lifecycle, manifest, semantic controls,
sorting, projection, and runtime spatial assertions scale from two joints to
the complete engine-neutral base rig hierarchy.

### Boundaries

- Use a new Creator-owned scene.
- Consume the existing engine-neutral rig and Rest/Wave/Integration Stress
  clips without defining Cocos-specific pivots, hierarchy, or clip IDs.
- Reuse and generically extend R1 modules; do not copy them into a monolithic
  component.
- Do not modify the old Full Loadout scene or add accessories, garments,
  props, grip, loadout presets, Red Cap, VFX, Unity, or Godot behavior.
- No Canvas compensation or character-specific debug offset.

### Execution

1. Record TASK-013R2 scope and acceptance criteria.
2. Add deterministic base-rig resource planning and semantic clip state.
3. Extend the reusable runtime projection/measurement surface for arbitrary
   joint hierarchies.
4. Create and save a new scene through Creator 3.8.8.
5. Add pure TypeScript, tracked-files-only, metadata, manifest, lifecycle, and
   spatial regression tests.
6. Pass both verification modes.
7. Pass the complete Creator open/switch/reopen, Console, Preview, animation,
   transform, debug, rebuild, and Reset gate in one uninterrupted run.
8. Commit and push one reviewed R2 feature commit.
9. Record, decode, hash, publish, re-download, and re-decode the temporary
   `evidence/task-013r2` review video.
10. Stop for external visual review without a PR or further attachment work.

### Done when

- Every declared base part and joint is present exactly once.
- Rest reconstructs the authored base rig and Wave/Integration Stress visibly
  articulate the expected hierarchy.
- Marker and skeleton endpoint errors are each `<= 0.5 px`.
- Unknown parents, cycles, non-finite transforms, out-of-region debug lines,
  duplicate requests/listeners, and sorting violations are all zero.
- Exact Reset is stopped at time zero in authored Rest.
- Both verification modes and the uninterrupted Creator gate pass.
- Feature and evidence branches are pushed while all frozen/protected refs and
  the old demo remain unchanged.

### Acceptance result

- The Creator-owned scene is
  `assets/task-013r2-base-rig-bridge.scene`; it contains only the Canvas and
  its Camera and owns exactly one `GameAITask013R2BaseRigBridge` component.
- The runtime resolves the existing production-lite plan into 17 Sprite parts,
  17 real joints, and 16 live parent-child skeleton segments.
- Rest, Wave, and Integration Stress are selected by explicit semantic clip
  IDs; the HUD and dispatcher are generated from one eight-action input
  registry.
- The R1 lifecycle, terminal resource coordinator, global sorting policy, and
  world-to-overlay-local projector are reused. R1 resource, sorting, and
  hierarchy-spatial boundaries were extended generically rather than copied.
- Working-copy verification and tracked-files-only frozen verification pass.
- The uninterrupted Creator 3.8.8 gate passes with clean Creator and Preview
  Consoles, 17/17 resources, one input response after rebuild, one visible
  character after reopen/rebuild, zero non-finite/unknown-parent/cycle/
  out-of-region/sorting violations, and maximum marker and skeleton errors of
  `0.000 px`.
- Exact Reset returns to `production-lite-rest-idle`, `STOPPED`, time `0.00`,
  transform stress enabled, and debug disabled.
- External visual review: PASS.
- The reviewed 54-second, 1,620-frame Creator Web Preview video shows one
  coherent 17-part character, correct Rest assembly, Wave and Integration
  Stress hierarchy articulation, aligned 17-joint/16-segment diagnostics,
  Pause/Resume, transform stress, one-character lifecycle rebuild, exact
  Reset, and debug-OFF cleanup without clipping, duplication, flicker, jumps,
  drift, or layer anomalies.
- Reviewed video SHA-256:
  `8a9f142bd496b001e6e2842ad9d0f8fee28bb583820b887910444526de517219`.
- The Canvas-only recording validates visible Web Preview behavior. Creator
  Console cleanliness and scene-switch/reopen lifecycle results remain
  supported by the recorded live acceptance procedure and automated/runtime
  diagnostics because those editor surfaces are not pixels inside the
  captured Canvas.
- The temporary `evidence/task-013r2` branch may be removed after this
  acceptance documentation is safely pushed. The accepted R2 branch is then
  frozen at its final acceptance commit.

## Accepted plan: TASK-013R1 Minimal Cocos Runtime Adapter Harness

- Status: Accepted after external visual review
- Started: 2026-07-25
- Accepted: 2026-07-25
- Branch: `recovery/task-013r1-minimal-cocos-harness`
- Implementation commit:
  `8543fc61742b8a95b7c9ded6ad7347e49cd3ca63`
- Baseline: `5170185fdca666300c4d61488f17e15aa18656be`
- Frozen feature: `feat/task-013-composable-character-loadout` at
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence: `evidence/task-013` at
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Build a separate Creator-owned two-joint runtime harness that proves scene
identity, Editor/runtime lifecycle separation, complete manifest loading,
semantic input, global sorting, world-to-overlay-local projection, runtime
spatial assertions, transform stress, and exact Reset before any Full Loadout
reconnection.

### Boundaries

- Do not modify or delete the existing Full Loadout demo, contracts, resolver,
  production assets, or evidence.
- Do not clone TASK-010 through TASK-013 scenes.
- Creator owns scene and script `.meta` identities.
- No hard-coded Canvas or character compensation offset.
- Static tests are secondary to actual runtime measurements.

### Execution

1. Record the postmortem, TASK-013R1 specification, and ADR-0013.
2. Create a separate Creator-authored scene and minimal primitive fixture.
3. Implement small lifecycle, manifest, input, sorting, projection, and
   measurement modules.
4. Add pure TypeScript, tracked-files-only, and runtime assertions.
5. Pass working-copy and frozen tracked-files-only verification.
6. Pass the complete Creator first-open, switch, reopen, Preview, transform,
   animation, debug, teardown, and Reset gate in one run.
7. Commit and push one reviewed recovery commit.
8. Record, decode, hash, publish, re-download, and re-decode one real Creator
   Web Preview video on `evidence/task-013r1`.
9. Stop for external review without a PR or Full Loadout reconnection.

### Done when

- Both verification modes pass.
- Creator and Preview consoles contain zero relevant warnings/errors.
- Maximum marker, skeleton endpoint, and locked grip error are each
  `<= 0.5 px`.
- Debug OFF leaves no active debug renderers.
- Scene reopen and disable/enable produce no duplicate nodes or input response.
- The recovery and evidence branches are pushed while all protected refs and
  the old demo remain unchanged.

### Acceptance result

- External visual review: PASS.
- Reviewed video:
  `task-013r1-cocos-runtime-harness.mp4`.
- Reviewed video SHA-256:
  `7f0122f81151950ac21e3276b8fe1c07fc12ec7449edfe431296e446157c4c3a`.
- The Canvas-only recording confirms the visible HUD, animation, debug
  alignment, transform stress, lifecycle rebuild, exact Reset, and debug-OFF
  behavior. Creator Console and scene-switch/reopen results remain supported
  by the recorded live acceptance procedure and automated/runtime diagnostics,
  because those editor surfaces are not pixels inside the captured Canvas.
- The temporary `evidence/task-013r1` branch may be removed after this
  acceptance documentation is safely pushed. The accepted recovery branch is
  frozen at its final acceptance commit.

## Frozen prior plan: TASK-013 Creator Scene-Load Repair

- Status: In progress
- Started: 2026-07-24
- Branch: `feat/task-013-composable-character-loadout`
- Original implementation:
  `6e8dab87039ccbe1a842eaf76517825d4568d755`
- Protected `main`: `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Confirmed defect

The TASK-013 scene generator cloned the TASK-012 serialized scene with blind
string replacement, manufactured script/scene UUIDs, and removed every
non-underscore component field. Cocos serializes the component owner as the
public `node` field, so the generated `GameAIComposableLoadoutDemo` retained a
registered class identity but lost its required node reference. Creator 3.8.8
therefore rejected the scene during component activation.

After the scene-load repair opened successfully, the 1280x720 Web Preview
exposed a second focused defect: the 155 px HUD used a centered anchor at
`y = 330` under the character root's additional 24 px offset. Its calculated
top exceeded the Canvas, clipping every status row except shortcuts.

After the lifecycle-safe anchor repair passed with exact runtime bounds, live
Preview exposed a fourth focused defect: the single shortcut row exceeded the
fixed Label width and was clipped by the intentional `CLAMP` overflow policy.
This is a deterministic text-allocation defect, not a geometry defect.

After the nine-row HUD repair passed, Creator's editor console exposed a fifth
focused defect: the runtime component still used `@executeInEditMode`, so
scene activation issued 39 runtime `resources.load()` calls through the editor
asset pipeline. All failed with the same editor-only path-request parse error,
while the identical resources loaded successfully in Web Preview. The 39
calls comprised 17 base parts, 18 attachments, and four requests for the
active full-loadout reference; the complete unique runtime plan contains 43
resources, including all eight references.

After resource loading passed in live Preview, interaction acceptance exposed
a sixth focused defect: the HUD documented `K Skeleton · Y Grip`, but the
runtime dispatcher mapped K to grip markers and Y to the skeleton. The HUD
and dispatcher were maintained as separate hand-authored tables, so tests did
not enforce their agreement.

After the shared control binding repaired the K/Y semantic mapping, live
Preview exposed a seventh focused defect: Y correctly activated the
`grip markers` group, but its Graphics renderer retained the default sort
order beneath the prop and hand-overlay Sprites. The active-state transition
therefore produced no visible pixels. The remaining debug renderers also rely
on default order or sibling insertion, so this is a shared debug-overlay
sorting defect rather than a Grip-only exception.

### Repair plan

1. Track stable script and scene metadata generated by Creator 3.8.8.
2. Make the generator read and validate the source/target script and scene
   metadata, derive compressed class IDs from those tracked UUIDs, transform
   the parsed scene structurally, and preserve the component-node link.
3. Validate every tracked character-pipeline scene against its scene metadata,
   component script metadata, component-node ownership, and the global asset
   UUID namespace.
4. Prove generator idempotence, metadata preservation, rejection of synthetic
   identities, and input-property-order independence.
5. Run working-copy and tracked-files-only verification, then open and reopen
   the scene in a clean Creator 3.8.8 project before attempting Web Preview or
   live evidence.
6. Generate a top-left anchored HUD layout from the tested semantic-control
   source, parent it directly to the design Canvas, and keep its calculated
   1280x720 bounds inside documented 25 px side and 14 px top insets.
7. Prove every required status row fits the HUD without overlap, generation is
   idempotent, and runtime layout remains generator-owned.
8. Isolate the final `HUDLabel` transform from Label initialization by placing
   it under a Label-free `HUDContainer`, applying CLAMP overflow and final
   anchor/size/position only after Label creation.
9. After the first rendered frame, measure the actual container and label
   transforms, log their bounds once, and fail with
   `TASK_013_HUD_RUNTIME_BOUNDS_INVALID` if either leaves the safe region.
10. Format the HUD as three bounded status rows and six bounded help rows,
    render them in separate lifecycle-safe child Labels, and reject excess
    line count, text width, region overlap, or character overlap with
    `TASK_013_HUD_TEXT_OVERFLOW`.
11. Remove editor-mode execution from the runtime-only acceptance component
    and derive one sorted, duplicate-free resource manifest from the same
    generic Cocos plan used by the character adapter.
12. Validate all 43 manifest entries against tracked PNG files, PNG metadata,
    `spriteFrame` subMeta records, path suffixes, and unique asset/subasset
    UUIDs during generation and tests.
13. Load each manifest path exactly once in Preview, report expected, loaded,
    failed, and duplicate-request counts, build only after complete success,
    and fail each missing path once with
    `TASK_013_RESOURCE_LOAD_FAILED`.
14. Display `RESOURCES N/43 LOADING|PASS|FAIL` in the existing HUD validation
    row and keep state changes on the already-loaded SpriteFrame map.
15. Replace the separate HUD shortcut strings and runtime key tables with one
    validated semantic control-binding definition covering F1–F8, Q/W/E,
    clips 1–5, Space, Esc, R/A/O, and every debug action.
16. Give every binding an explicit semantic action ID, displayed key, Cocos
    KeyCode name, HUD label/group/order, and typed runtime action. Reject
    duplicate keys/actions and missing required controls independently of
    declaration order.
17. Generate all six HUD help rows from the same bindings used by runtime
    dispatch and prove the canonical `K → Skeleton`, `Y → Grip markers`
    mapping in static and live acceptance.
18. Extend each shared debug binding with its semantic group ID, marker type,
    expected renderer count, and deterministic sorting role; reject incomplete
    or inconsistent definitions.
19. Derive non-overlapping production, debug, and HUD Sorting2D ranges from
    the resolved plan's production maximum, keep all orders in Cocos 3.8.8's
    signed 16-bit range, and assign every Graphics and debug/HUD Label an
    explicit order without changing transform inheritance.
20. Render Grip as distinct socket and anchor crosshairs plus a connecting
    line and PASS/FAIL label, validate every debug group's nodes, renderers,
    active transition, and sort order once per toggle, and emit one bounded
    runtime diagnostic.
21. Prove all ten debug groups remain visible and deterministic under reordered
    plan inputs, cannot overlap production/HUD ranges, and do not alter
    production loadout or seam/socket/grip validation state.

### Done when

- Creator opens the TASK-013 scene twice without Missing class, invalid node,
  unresolved asset, `_activeInHierarchy`, or `_removeComponent` errors.
- The generator contains no manufactured component/scene UUID and cannot emit
  the known synthetic identities.
- Both verification modes pass, Creator import leaves tracked files unchanged,
  and live Web Preview matches the accepted headless reference.
- One ignored H.264 live-runtime video is appended to the existing evidence
  branch without rewriting its original commit.

## Previous active plan: TASK-013 Composable Full Character Loadout Reference

- Status: Implementation complete; evidence publication pending
- Started: 2026-07-24
- Baseline: `main` at `317fd451c6a808cd41788e7ce8e0916701992642`
- Branch: `feat/task-013-composable-character-loadout`
- TASK-012 squash merge:
  `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Compose the accepted TASK-010 head accessories, TASK-011 multi-part garment,
and TASK-012 one-handed prop through one deterministic, engine-neutral
character-loadout resolver. Prove all eight required loadout presets plus
no-prop/left/right prop states on the production-lite character, exact Rest
reconstruction, dense motion validation, and a single generic Cocos Creator
3.8.x acceptance scene without adding a new attachment feature family.

### Contract decisions

- Resolve attachment families through generic IDs, exclusive slots, dependency
  state, transforms, global layer roles, and draw order; never recognize
  fixture asset names in framework behavior.
- Keep Attachment Layout 1.0 backward compatible. Extend contracts only for a
  demonstrated engine-neutral integration gap, with optional fields and stable
  diagnostics.
- Emit one engine-neutral resolved character consumed by a thin generic Cocos
  adapter. The adapter performs no fitting, state selection, or demo-specific
  composition.
- Treat semantic animation IDs as the only control identity and validate
  garment seams, accessory sockets, grip lock, state, transforms, presence,
  and ordering at every 60 Hz sample.
- Generate all fixture and Cocos mirror outputs from tracked editable source
  descriptions. Keep acceptance MP4s ignored under `artifacts/TASK-013`.

### Execution

1. Record TASK-013 and inspect the accepted TASK-010 through TASK-012
   contracts, generators, validators, evaluators, fixtures, adapters, tests,
   and acceptance reports.
2. Implement a deterministic generic loadout composition path and stable
   validation for cross-family IDs, exclusive slots, dependencies, attachment
   references, required counterparts, global roles/orders, transforms, seams,
   sockets, grips, schema versions, and semantic animation IDs.
3. Create the production-lite full-loadout source, transparent parts,
   engine-neutral contracts, five semantic clips, eight exact Rest variants,
   reconstruction/diff reports, and authoring provenance.
4. Validate every required clip at 60 Hz and report total samples, maximum
   seam/socket/grip errors, layer violations, and the first failing clip/time.
5. Generate one generic Cocos resource mirror, adapter, acceptance scene,
   semantic controls, comparison modes, complete debug views, runtime HUD, and
   exact stopped Rest reset.
6. Add automated coverage for all presets and prop states, reordered inputs,
   invalid mutations, reconstruction, continuous validation, semantic
   controls, reset, adapter neutrality, reproducibility, and tracked-only use;
   retain TASK-010 through TASK-012 regression coverage.
7. Document behavior and limitations and defer the engine-neutral
   Socket-bound VFX Cue System as roadmap-only work after this milestone.
8. Run working-copy and tracked-files-only frozen verification; commit and
   push the feature branch with no tracked MP4.
9. Record, inspect, fully decode, hash, and publish the two required H.264
   evidence videos and manifest on temporary branch `evidence/task-013`, then
   stop for external visual review without opening a PR.

### Done when

- All eight Rest variants reconstruct with zero RGBA, alpha, seam, and bounds
  difference and all no-prop/left/right states resolve deterministically.
- The five semantic clips pass all 60 Hz validations with exact authored Rest
  reset and stable global ordering.
- The Cocos acceptance scene uses only the generic resolved character result
  and exposes every required control, view, marker, and runtime-derived HUD
  identity.
- Working-copy and tracked-files-only frozen verification pass with all prior
  regression tests preserved and generated resources reproducible.
- Feature and evidence branches are pushed, uploaded videos fully decode and
  match the manifest, no TASK-013 PR exists, the feature branch tracks no MP4,
  `main` remains at the Phase A integration SHA, the working tree is clean,
  and the protected archive remains unchanged.

### Deferred roadmap decision

After TASK-013, design—but do not implement—an engine-neutral Socket-bound VFX
Cue System covering generic effect IDs, socket-local transforms, layer roles,
follow policies, one-shot/looping/persistent lifecycles, animation/gameplay
cues, and Cocos/Unity/Godot adapter targets. TASK-013 adds no VFX schema,
runtime, assets, events, particles, or tests.

### Implementation result

- One generic loadout resolver composes three unchanged Attachment Layout 1.0
  families and emits immutable engine-neutral states and global layers.
- Eight exact Rest presets reconstruct with zero RGBA, alpha, seam, and bounds
  difference; no-prop, left-hand, and right-hand states are explicit.
- Five semantic clips pass 60 Hz validation across 605 samples with zero seam,
  accessory socket, grip, or layer-order error.
- One Cocos Creator 3.8.x scene consumes the generic resolved-character plan
  and exposes the required semantic controls, runtime-derived HUD, comparison
  views, diagnostics, and exact stopped Rest reset.
- The Socket-bound VFX Cue System is recorded only as deferred roadmap work;
  TASK-013 includes no VFX implementation.

### Verification

- Working-copy `CI=true pnpm verify`: PASS, 222 tests.
- Tracked-files-only archive after `pnpm install --frozen-lockfile`:
  `CI=true pnpm verify` PASS, 222 tests.

## Completed correction: TASK-012 Semantic Prop Demo Controls

- Status: Complete; external manual visual acceptance passed
- Started: 2026-07-24
- Completed: 2026-07-24
- Branch: `feat/task-012-one-handed-prop-reference`
- Original implementation commit:
  `9cf8e2562fc4ccc3149a7d49e3a5dc3ab411b145`
- Focused control fix commit:
  `10ad18407e94d460e22c21cc28ad330ee5e2d94e`
- Protected `main`: `ebaa7ba90ee1bc42318867a365abebced05afa78`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Correct the TASK-012 Cocos acceptance controls so keys 1 through 4 resolve
Rest, Walk, Prop Swing, and Prop Stress by explicit semantic animation ID,
independent of generated clip-array order. Reject missing or duplicate
required IDs with stable errors, retain the active playback animation as the
only displayed clip identity, and replace both recordings affected by the
original index mapping.

### Execution

1. Add a pure semantic control resolver with stable missing/duplicate
   diagnostics and use it from the Cocos acceptance runtime.
2. Add regression coverage for every key, reordered clips, missing and
   duplicate IDs, handler wiring, and playback-derived HUD identity.
3. Synchronize TASK-012 task and acceptance documentation.
4. Run working-copy and tracked-files-only frozen verification.
5. Append and push one focused feature commit without rewriting the existing
   feature commit.
6. Capture, inspect, fully decode, hash, and publish two replacement videos;
   append one evidence commit while preserving both original files and
   evidence history.

### Done when

- Keys 1–4 visibly activate the documented semantic clips even when generated
  input order differs.
- Required clip omissions and duplicates fail with stable diagnostics.
- Both verification modes pass with all existing tests preserved.
- Both v2 videos are ignored locally, independently decodable H.264
  1280×720/30 fps/yuv420p, and recorded in the appended evidence manifest.
- A Draft PR targets `main`; the temporary evidence branch is deleted only
  after the acceptance commit and GitHub Actions verify are published.
- `main`, the protected archive, and all historical commits remain unchanged.

### Verification

- Working-copy `CI=true pnpm verify`: PASS, 208 tests.
- Tracked-files-only archive after `pnpm install --frozen-lockfile`:
  `CI=true pnpm verify` PASS, 208 tests.

### Acceptance publication

- Original evidence commit:
  `5984d3428d64769539ea2db5319a33d2a3cffee7`.
- Corrected evidence commit:
  `3fbc66b93ce2555074abc74bee74bf973a2190e3`.
- The original variants/motion and Stress/debug recordings are superseded
  because the positional key mapping activated clips from generated array
  order rather than the documented control order.
- Accepted variants/motion v2: 41.633333 s, 2,198,708 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `a73da69d192e699d8f0bb83d03956e685521ebe8b91a2a2584df6d8ad8cc9ba6`.
- Accepted Prop Stress/debug v2: 40.633333 s, 3,132,384 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `f447c623a33647e471fd1c8be1b7aded3e72c918e7c6aa41c0f3602537667579`.
- External manual review matched both hashes, completed full FFmpeg decoding,
  verified keys 1–4 against their semantic clip identities, accepted all
  prop variants, comparison modes, grip/overlay stability, Stress motion,
  pause/resume, debug views, and exact stopped Rest reset, and reported no
  persistent detachment, layer switching, or broken articulation.
- The focused fix replaces positional lookup with required semantic clip-ID
  resolution. Regression tests cover all four controls, reordered input,
  missing and duplicate IDs, and playback-derived HUD identity.

## Completed plan: TASK-012 One-Handed Prop Attachment Reference

- Status: Complete; external manual visual acceptance passed
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `main` at `ebaa7ba90ee1bc42318867a365abebced05afa78`
- Branch: `feat/task-012-one-handed-prop-reference`
- TASK-011 squash merge:
  `ebaa7ba90ee1bc42318867a365abebced05afa78`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the accepted engine-neutral rigid attachment system with generic
one-handed prop bindings. Prove authored grip-to-hand-socket coincidence,
animated inheritance, deterministic prop/hand/overlay layering, exact Rest
reconstruction, and a Cocos Creator 3.8.x acceptance scene while retaining
item-neutral core semantics.

### Contract decisions

- Evolve Attachment Layout additively within the implemented 1.0 line with
  optional generic target, socket, grip-anchor, and overlay metadata; keep
  TASK-010/011 documents valid without normalization changes.
- Represent left/right hand identities as authored rig socket IDs, never as
  engine node references or hard-coded character part names.
- Resolve attachment, wearable-set, and prop-state enablement through one
  immutable generic state pass.
- Define grip coincidence and layer roles in reference-space contract terms.
  Cocos consumes only a generated scene plan and performs no fitting or
  inverse solving.
- Treat a hand overlay as an optional ordinary attachment part linked by ID,
  with its own image, anchor, local transform, target part, role, and order.

### Execution

1. Record the task and plan; inspect TASK-009 through TASK-011 contracts,
   fixtures, generators, evaluators, adapters, tests, and acceptance patterns.
2. Extend schema/types/parser/validation/resolution with generic hand-socket
   targets, grip anchors, local transforms, layer roles, overlay references,
   state resolution, and stable diagnostics.
3. Deterministically generate the production-lite prop source, transparent
   prop/overlay PNGs, no-prop/left/right authored Rest references, exact
   reconstructions/reports, and four prop clips.
4. Add dense time sampling for socket/grip coincidence, transform
   inheritance, ordering, state, exact reset, and focused invalid mutations.
5. Generate the Cocos adapter data/resource mirror, acceptance scene/runtime,
   all requested modes/debug views, and on-screen keyboard controls.
6. Synchronize schemas, fixtures, tests, README/contract/versioning/ADR and
   acceptance documentation without changing accepted body inputs.
7. Run working-copy and tracked-files-only frozen verification and inspect
   scope for temp state, absolute paths, generated/source separation, and
   existing-test preservation.
8. Record and inspect two decodable H.264 1280×720 videos, keep local copies
   ignored, publish copies plus a metadata/hash manifest to
   `evidence/task-012`, commit/push the feature branch, and stop without a PR.

### Done when

- TASK-007 through TASK-011 fixtures and published schema inputs remain
  compatible and all existing tests pass.
- The required invalid cases produce stable specific diagnostics.
- No-prop, left-hand, and right-hand Rest variants reconstruct at exactly zero
  RGBA, alpha, seam, and bounds tolerance with visible hand-over-handle
  layering.
- Every authored and interpolated sample in all four prop clips keeps the
  authored grip point coincident with the selected hand socket and Reset
  returns exactly to authored Rest.
- The core contains no Cocos, briefcase/toolbox, Red Cap, Unity, or Godot
  semantics; the Cocos layer contains no item-specific fitting constants.
- Both verification modes pass from clean inputs, no generated Cocos temp
  state or absolute machine path is required, and all required debug modes
  and controls are present.
- Two ignored local videos are independently decodable and their published
  evidence copies match a committed manifest. Feature and evidence branches
  are pushed, no TASK-012 PR exists, and the protected archive remains exact.

### Result

- Attachment Layout 1.0 now supports optional generic part/socket targets,
  prop states, attachment kinds, authored grip anchors, linked hand overlays,
  and target-relative layer roles while retaining TASK-010/011 compatibility.
- The deterministic four-part prop fixture provides no-prop, left-hand, and
  right-hand states. All three authored Rest references reconstruct with zero
  RGBA, alpha, seam, and bounds difference.
- Rest with prop, Walk with prop, Prop Swing, and Prop Stress are validated at
  60 Hz across 532 authored and interpolated samples. Socket and grip world
  positions remain coincident at every sample, and Prop Stress ends at exact
  authored Rest offsets.
- The generic Cocos plan, resources, 3.8.x acceptance scene, runtime controls,
  and socket/grip/pivot/bounds/link/layer/skeleton diagnostics require no
  generated editor temp state or absolute machine path.
- Original implementation commit `9cf8e2562fc4ccc3149a7d49e3a5dc3ab411b145`
  is followed by focused semantic-control fix
  `10ad18407e94d460e22c21cc28ad330ee5e2d94e`; neither history was rewritten.
- Working-copy and tracked-files-only frozen verification both pass 208 tests.
  Existing tests and accepted body/accessory/garment sources remain intact.
- External manual visual acceptance passed against corrected evidence commit
  `3fbc66b93ce2555074abc74bee74bf973a2190e3`, which follows original evidence
  commit `5984d3428d64769539ea2db5319a33d2a3cffee7`. The temporary evidence branch
  is deleted after acceptance publication and successful Draft PR CI.
- Accepted limitations are authored fitting, rigid sprites, in-place walk, a
  Cocos-only adapter, and no IK, inverse solving, in-clip hand switching,
  two-handed weapons, combat, physics, mesh deformation, other-engine
  adapters, or original Red Cap reconstruction.

## Completed plan: TASK-011 Multi-Part Garment Layering Reference

- Status: Complete; external manual visual acceptance passed
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `main` at `3544da47d31126c100551d95929ba1455d13a328`
- Branch: `feat/task-011-garment-layering-reference`
- TASK-010 squash merge:
  `3544da47d31126c100551d95929ba1455d13a328`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the accepted production-lite body and generic attachment system with a
deterministic, independently toggleable multi-part casual jacket. Prove
contract-driven wearable sets, generic torso/arm/wrist/collar slots, stable
layering, inherited articulation, authored seam coverage, exact Rest
reconstruction, and a Cocos Creator 3.8.x acceptance scene without jacket-
specific core behavior.

### Contract decisions

- Compose Attachment Layout 1.0 with optional generic wearable-set metadata
  while preserving existing TASK-010 documents and parser behavior.
- A wearable set groups multiple existing attachments under one enabled-state
  override; slots remain generic parent bindings with local transforms.
- Extend attachment metadata with optional seam constraints and a broader
  generic layer role vocabulary only where required by garment validation.
- Resolve enabled state, transforms, global order, and seam coverage entirely
  from contracts and evaluator output; Cocos receives a generated scene plan.
- Reject duplicate/unknown set membership, invalid or duplicate garment slots,
  unknown parents, invalid anchors, missing parts, unstable order, insufficient
  overlap, and bounds expansion through stable validation or verification.

### Execution

1. Record the task and plan, inspect TASK-009/010 contracts, generators,
   evaluators, adapters, tests, and Cocos scene-generation patterns.
2. Extend schema/types/parser/validation/resolution for backward-compatible
   wearable sets, generic garment slots, grouped state, and seam constraints.
3. Deterministically generate jacket sources, ten rigid PNG parts, four Rest
   variants, exact reconstructions, reports, seam evidence, and a Garment
   Stress clip while reusing accepted body/head assets unchanged.
4. Add generic transform/order/seam verification across Rest, Wave, Walk,
   Articulation Stress, Accessory Stress, and Garment Stress.
5. Generate the Cocos adapter data, resource mirror, scene, runtime controls,
   slot/seam/pivot/bounds/link/layer/skeleton diagnostics, and wearable state.
6. Add contract, generator, reconstruction, ordering, inheritance, mutation,
   compatibility, core-isolation, and clean-checkout tests and documentation.
7. Run working-copy and tracked-files-only frozen verification.
8. Record and inspect short independently decodable Web Preview evidence,
   commit, push the feature branch without a PR, re-check the protected
   archive, and stop for manual visual review.

### Done when

- TASK-007 through TASK-010 remain compatible and accepted source inputs are
  unchanged.
- All four requested Rest variants reconstruct with zero RGBA, alpha, seam,
  and bounds-expansion difference.
- Every authored seam satisfies its declared overlap over every supported clip
  and mutations detect gaps, bindings, anchors, layers, bounds, and missing
  parts.
- The jacket toggles as one set without mutating base rig or head accessory
  state, and all parts inherit torso/shoulder/elbow/wrist motion.
- Cocos exposes all requested views, clips, controls, and diagnostics with no
  garment-specific runtime correction constants or per-frame order patches.
- Both required verification modes pass, ignored MP4 evidence is locally
  available and decodable, the branch is committed/pushed without a PR, and
  the protected archive remains `ed0923b`.

### Result

- Attachment Layout 1.0 now supports optional generic wearable sets, grouped
  enabled state, expanded layer roles, and authored rectangular seam
  constraints without invalidating TASK-010 documents.
- Added a deterministic 11-part casual jacket, four exact Rest variants, six
  supported clips, 10 seam constraints, generated Cocos resources, and a
  dedicated Creator 3.8.x acceptance scene.
- All four variants reconstruct with zero RGBA, alpha, seam, and bounds
  difference. All 10 seams pass at 29 canonical times over all six clips
  (174 pose samples).
- Working-copy and tracked-files-only frozen verification both pass with 189
  tests. Two ignored, independently decodable Web Preview videos cover the
  required variants, motion, reset, pause/resume, and debug controls.
- External manual visual acceptance passed after the reviewer downloaded both
  files from temporary branch `evidence/task-011` at evidence commit
  `c2a09e27cbad0e462d564b727bb429a13f1779b8`, matched both manifest hashes,
  and completed full FFmpeg decoding. The temporary evidence branch is deleted
  after acceptance publication; its raw URLs are not durable evidence.
- No original Red Cap art, briefcase, cloth simulation, IK, Cocos correction
  constants, garment-specific core branching, or per-frame sorting patch was
  added.

## Completed plan: TASK-010 Head Accessory Layering Reference

- Status: Complete; manual dynamic visual acceptance passed
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `main` at `e240020a18aca15c0f1ec1369c411b624b5bfa6e`
- Branch: `feat/task-010-head-accessory-layering`
- TASK-009 squash merge:
  `e240020a18aca15c0f1ec1369c411b624b5bfa6e`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Extend the accepted TASK-009 production-lite character with only a layered
red cap and sunglasses, proving a reusable engine-independent slot and
attachment contract without modifying the accepted body rig, adding
character-specific core behavior, or resuming original Red Cap reconstruction.

### Scope

- Add a versioned Attachment Layout contract with generic slot identity,
  parent-part binding, local transforms, sprite file/anchor, global draw order,
  default enabled state, and optional front/back layer role.
- Define `headwear` and `face-accessory` slots on the existing TASK-009 head,
  with a two-layer cap and one transparent sunglasses attachment.
- Preserve the exact accepted TASK-009 source art, 17 body parts, Rig Layout,
  Character Rig, and four clips unchanged.
- Generate editable accessory source descriptions, byte-stable transparent
  PNGs, the attachment contract, and four independently authored reference
  composites for base, cap-only, sunglasses-only, and combined states.
- Add generic contract parsing, compatibility checks, slot resolution,
  enabled-state evaluation, transform inheritance, asset validation, and
  exact zero-tolerance reconstruction.
- Reuse the existing hierarchy evaluator and four TASK-009 clips; add one
  data-only Head Accessory Stress clip that tilts/rotates the head and leans
  the torso.
- Add a dedicated Cocos Creator 3.8.x scene with reference, assembled,
  overlay, skeleton, attachment sockets, bounds/pivots/layers, accessory state,
  all five clips, exact reset, and complete requested toggles.
- Run working-copy and tracked-files-only verification, record and inspect the
  ignored real Web Preview MP4, commit and push the feature branch, stop for
  manual visual review, then record acceptance and open a Draft PR.

### Out of scope

Original Red Cap reconstruction or corrections, body redraw/restructure,
jacket or clothing changes, briefcase, arbitrary accessory fitting, facial
animation, IK, mesh deformation, root motion, foot locking, blending,
Unity/Godot adapters, cross-engine compilation, Windows support, combat logic,
cloud AI, or paid dependencies.

### Contract decisions

- Add a standalone `attachment-layout.schema.json` rather than changing Rig
  Layout 1.0 or treating accessories as body joints.
- A slot owns `slotId`, `parentPartId`, its parent-local position, rotation and
  scale, and `defaultEnabled`.
- An attachment owns `attachmentId`, `slotId`, a safe image file, attachment-
  local position/rotation/scale, normalized anchor, global numeric draw order,
  and optional `back`/`front` layer role.
- Attachment Layout binds to one `layoutId` and compatible Rig Layout schema
  version. Validation fails closed on incompatible versions, duplicate slots
  or attachments, unknown slot/parent references, unsafe paths, invalid
  transforms/anchors, or ambiguous draw order.
- Enabled state is resolved by generic slot overrides. Disabling a slot does
  not mutate the base rig or the attachment contract.
- Combined body/accessory render order is sorted from contract values and then
  normalized to engine-specific integer sorting indices by the thin adapter.

### Execution

1. Merge accepted TASK-009 through its gated squash workflow, fast-forward
   `main`, create the requested branch, read governing contracts/ADRs and
   TASK-007 through TASK-009, then record this plan and full task specification.
2. Add Attachment Layout 1.0 schema/types/parser/semantic validation,
   compatibility documentation, ADR, invalid fixtures, and regression tests.
3. Author and generate the layered cap, sunglasses, slot/attachment data,
   fifth clip, four references, exact reconstructions, reports, and Cocos
   resource mirror without changing TASK-009 inputs or outputs.
4. Implement generic slot resolution, state overrides, transform inheritance,
   combined ordering, asset checks, and zero-tolerance variant verification.
5. Build the dedicated Cocos scene/runtime from generated contract data and
   test clip controls, accessory toggles, debug overlays, exact reset, and
   sprite/skeleton/attachment transform parity.
6. Run `CI=true pnpm verify` in the working tree and after a frozen install in
   a tracked-files-only archive checkout.
7. Record and inspect the required real Web Preview sequence, keep the MP4
   ignored, complete acceptance documentation, review scope, commit, push,
   re-check the protected archive, and stop for manual visual review.
8. After explicit reviewer acceptance, record the split original/tail review
   evidence, repeat both verification modes, and open a Draft PR without
   merging.

### Done when

- Existing TASK-007/008/009 fixtures remain byte-compatible and pass without
  requiring an attachment contract.
- Attachment Layout validates generically and every requested invalid slot,
  parent, file, transform, anchor, order, and compatibility case is covered.
- The cap back/front and sunglasses are deterministic transparent PNGs whose
  inherited transforms and enabled state come only from contract data.
- Base, cap-only, sunglasses-only, and combined reconstructions match their
  independently authored references with zero RGBA, alpha, seam, or bounds
  tolerance.
- Hair, head, cap layers, face, and sunglasses retain stable contract-defined
  order through all five clips, including repeated Accessory Stress loops.
- The Cocos scene exposes every requested view, playback/accessory control,
  socket/debug toggle, and status field with no per-accessory placement
  constants.
- Both required CI verification runs pass from clean inputs.
- The ignored acceptance MP4s exist, the branch is committed and pushed,
  manual dynamic visual acceptance passes, a Draft PR is opened without
  merging, and the protected archive remains `ed0923b`.

### Implementation result

- Attachment Layout 1.0, generic slot resolution, enabled-state overrides,
  affine transform inheritance, and combined body/accessory ordering are
  implemented without Cocos or accessory-specific core branches.
- Deterministic source descriptions generate cap-back, cap-front,
  sunglasses, the Head Accessory Stress clip, and four authored references.
- Base, cap-only, sunglasses-only, and combined variants reconstruct with
  exactly zero RGBA, alpha, seam, and bounds-expansion difference.
- The dedicated Creator scene imports all reference and attachment
  SpriteFrames with `trimType: none`; live reference/assembled Rest views
  align at the same position and scale.
- `CI=true pnpm verify` passes 175 tests in the working copy.
- The real 1280×720 Web Preview sequence was recorded to the ignored TASK-010
  artifact path and sampled directly for every required state and control.
- A frozen install and `CI=true pnpm verify` pass the same 175 tests from a
  tracked-files-only archive tree.
- Manual review passed using the first 48 seconds of the original local
  recording plus an independently re-encoded, fully decodable 24.466667-second
  tail beginning at 00:00:45. Uploaded long copies were truncated, so the
  ignored original and tail files remain the authoritative local evidence.
- The review verified all four accessory variants, stable cap and hair
  ordering, glasses-to-eye alignment, shared head-transform inheritance,
  drift-free Accessory Stress, pose-preserving Pause/Resume, exact Reset,
  aligned socket/debug views, and base-rig immutability under accessory
  toggles.
- The accepted limitations are authored rather than automatic fitting,
  in-place walk/foot sliding, rigid sprites, a Cocos-only adapter, and no
  original Red Cap reconstruction. A Draft PR into `main` is authorized;
  automatic merge remains prohibited.

## Completed plan: TASK-009 Production-Lite Layered Character Reference

- Status: Complete; manual dynamic visual acceptance passed
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `c196602a38e5a1752995e9bc6d398e8d53e5348b`
- Branch: `feat/task-009-layered-character-reference`
- Protected archive: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

### Goal

Bridge the TASK-008 mannequin and the Red Cap fixture with deterministic,
moderately detailed casual-game artwork that proves irregular trimmed sprites,
explicit front/back layers, contract-only rest reconstruction, and the proven
rig evaluator under four animation clips.

### Scope

- Add a repository-owned layered humanoid with a simple face, separate back
  and front hair, shaped shirt and pants, clothed tapered arms, hands, thighs,
  shins, and shoes.
- Preserve editable JSON artwork descriptions and generate byte-stable
  transparent PNG parts plus an independently authored Rest Pose composite.
- Describe all assembly through Rig Layout fields and validate reconstruction
  from parts, layout, and draw order without Cocos-specific placement values.
- Reuse the TASK-007/008 hierarchy evaluator and Rest/Idle, Arm Wave, and Walk
  semantics; add one data-only articulation stress clip.
- Add a dedicated Cocos Creator 3.8.x scene with reference, assembled,
  skeleton/debug, overlay comparison, complete playback controls, and all
  requested diagnostic toggles and status.
- Add deterministic generation, image/contract/hierarchy/layering,
  reconstruction-mutation, overlap-range, transform-parity, reset,
  core-isolation, and clean-checkout tests.
- Run working-copy and tracked-files-only verification, record the ignored
  real Web Preview MP4, commit and push the feature branch, and require manual
  dynamic visual acceptance before opening a Draft PR.

### Out of scope

Red Cap reconstruction or corrections, arbitrary master-image cutting, hats,
glasses, jacket flaps, props, facial animation, loose cloth, IK, mesh
deformation, root motion, foot locking, blending, other engine adapters,
cross-engine compilation, Windows Editor support, cloud AI, paid
dependencies, or combat logic.

### Execution

1. Confirm the clean requested baseline and protected archive commit, read the
   governing contracts/ADRs and TASK-007/008 implementation and acceptance
   evidence, then record this plan and the complete TASK-009 specification.
2. Author the deterministic part descriptions, common-canvas layout,
   reference composite description, four clips, and checked-in generator.
3. Generate and verify transparent parts, the reference composite,
   reconstructed composite, comparison evidence, and the Cocos resource
   mirror.
4. Implement a reusable reconstruction verifier and contract-derived Cocos
   plan with no per-part adapter compensation or new animation runtime.
5. Build the dedicated Creator scene/runtime UI and test every requested
   control, hierarchy/layer invariant, transform, overlap, and exact reset.
6. Run `CI=true pnpm verify` in the working tree and after a frozen install in
   a tracked-files-only archive checkout.
7. Record and inspect the required real Web Preview flow, leave the MP4
   ignored, complete acceptance documentation, review the scoped diff, commit,
   push, re-check the protected archive, and stop for manual visual review.
8. After the reviewer explicitly passes dynamic visual acceptance, record the
   result, repeat both verification modes, and open a Draft PR without merging.

### Done when

- Generated part PNGs are transparent, irregular, differently trimmed, and
  byte-stable; source descriptions and authored reference are tracked.
- The validated contract alone reconstructs the authored Rest Pose within the
  documented fixed tolerance and mutation tests detect every required failure
  class.
- Hair and limb front/back ordering is explicit and stable in all four clips;
  all required articulated connections retain authored overlap.
- Sprite and skeleton transforms match the shared evaluator; pause/resume and
  exact Rest reset pass automated and visual checks.
- The Creator scene exposes every requested view, overlay, label, control, and
  status field with the complete character visible.
- Both required CI verification runs pass from clean inputs.
- The ignored acceptance video exists, the branch is committed and pushed,
  manual dynamic visual acceptance passes, a Draft PR is opened without
  merging, and the protected archive still resolves to `ed0923b`.

### Result

- Added a deterministic 17-part production-lite humanoid with organic trimmed
  PNGs, editable JSON source, separate hair layers, shaped clothing, tapered
  limbs, and explicit rear/middle/front draw order.
- Added a generic exact reconstruction verifier and independently authored
  Rest Pose composite. The accepted result has zero RGBA, alpha, seam, or
  bounds mismatches, and mutation tests reject every required failure class.
- Reused `@gameai/rig-animation` for Rest/Idle, Arm Wave, Walk Cycle, and a
  data-only Articulation Stress clip; no animation runtime or per-part Cocos
  corrections were added.
- Added a dedicated Cocos Creator 3.8.x scene with reference, assembled,
  overlay, skeleton, complete playback controls, all requested diagnostic
  toggles, and visible reconstruction status.
- `CI=true pnpm verify` passes all 160 tests in the working tree and after a
  frozen install in a tracked-files-only archive checkout.
- Recorded and reviewed the ignored 40.0-second 1280×720 Web Preview MP4 at
  `artifacts/TASK-009/task-009-dynamic-acceptance.mp4`; SHA-256 is
  `ef11962dfa4ce582eebf97b5b4f25c9c2b9571cc717ec8adee8e7855828a8fc2`.
- Committed and pushed `feat/task-009-layered-character-reference` without
  changing the protected TASK-007 archive.
- Manual dynamic visual acceptance passed: reference/assembled alignment,
  hair layering and head inheritance, joint pivots and continuity, stable limb
  crossings, drift-free loops, exact Reset, and every debug overlay were
  verified in the real Cocos Web Preview.
- The accepted limitations are rigid sprites, in-place walk/foot sliding, no
  IK/root motion/foot locking/blending/deformation, dense all-overlay labels,
  a Cocos-only adapter, and production-lite artwork that is not final game
  art.
- Manual acceptance authorizes a Draft PR into `main`; automatic merge remains
  prohibited, and Red Cap reconstruction plus cross-engine work stay deferred.

## Completed plan: TASK-008 Simple Sprite Character Bridge

- Status: Complete
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `e2428149de39cb18288f4696796fafd835e82483`
- Branch: `feat/task-008-simple-sprite-character`

### Goal

Prove that repository-owned transparent PNG body parts can use the TASK-007
engine-independent hierarchy, proximal-pivot, local-to-world transform, and
animation system without per-part Cocos corrections before complex Red Cap
character work resumes.

### Scope

- Add a deterministic 15-part simple mannequin fixture: pelvis/root, torso,
  head, paired upper arms, lower arms, hands, thighs, shins, and feet.
- Generate flat-color transparent PNG sprites with rounded joint ends and
  intentional overlap at every articulated connection from a checked-in,
  deterministic generator.
- Describe assembly only through Rig Layout contract fields: stable part and
  parent IDs, file, source canvas, original rectangle, trim offset, anchor,
  local rest pose, draw order, and reference scale.
- Reuse TASK-007 hierarchy validation/evaluation, pivot semantics,
  deterministic sampling, and the rest/idle, arm-wave, and walk-cycle clip
  behavior.
- Add a dedicated Cocos Creator 3.8.x verification scene using real
  SpriteFrames, with sprite and skeleton/debug views, joint, bounds, pivot,
  and parent-link overlays, complete playback controls, and visible clip
  state/time.
- Add contract, PNG, transform parity, mirror, overlap, reset, isolation, and
  clean-checkout regression tests plus working-copy and tracked-only CI runs.
- Record an ignored dynamic MP4 showing Rest → Wave → Pause/Resume → Walk ×3
  → Reset → debug toggles, and document exact preview instructions.

### Out of scope

- Red Cap reconstruction or assumptions, arbitrary image auto-cutting, IK,
  mesh deformation, Unity/Godot adapters, cross-engine compilation, combat,
  Windows Editor support, production artwork, paid dependencies, cloud AI
  APIs, or acceptance-video commits.

### Execution

1. Record this plan and the TASK-008 specification from clean `main`; preserve
   `archive/old-task-007-cross-engine` at
   `ed0923b466e457da7ce9932e0daf6644aa29df39`.
2. Define the engine-neutral mannequin layout and three compatible data clips,
   then implement deterministic PNG generation and byte-stable regeneration.
3. Build a thin sprite bridge and Cocos fixture scene that consume validated
   contract data unchanged and apply sampled transforms only to Joint nodes.
4. Test image properties, hierarchy/IDs, anchors/pivots, ordering, sprite to
   skeleton parity, mirrored semantics, animated overlap, exact reset, Red Cap
   isolation, and tracked clean-CI configuration.
5. Run `CI=true pnpm verify` in the working copy and from a tracked-files-only
   archive checkout.
6. Open the dedicated scene in Cocos Creator 3.8.x, exercise every control,
   record and review the required ignored MP4, and write the acceptance report.
7. Review the scoped diff, commit, push the feature branch, and stop for
   manual visual review without creating a pull request.

### Done when

- All 15 transparent PNG parts exist, have the authored dimensions and alpha,
  regenerate byte-identically, and visibly overlap at every declared joint
  throughout the intended animation ranges.
- The complete character is assembled from the published contract fields with
  no per-part correction constants in Cocos scene code.
- Sprite transforms equal evaluator skeleton transforms at deterministic
  samples; anatomical mirror semantics, unique draw order, and exact rest
  reset pass automated tests.
- The Cocos scene exposes sprite/skeleton views, all requested debug overlays,
  Rest/Arm Wave/Walk, pause/resume, reset, and clip/state/time display.
- Both required `CI=true pnpm verify` runs pass from clean inputs.
- The dynamic acceptance MP4 exists outside Git, the branch is committed and
  pushed, exact scene/preview instructions are documented, and work stops
  before PR creation for manual visual review.

### Result

- Added a deterministic 15-part transparent-PNG mannequin, its checked-in
  generator, engine-neutral Rig Layout/Character Rig, and three compatible
  animation clips.
- Added a contract-derived Cocos SpriteFrame adapter and dedicated scene with
  synchronized sprite/skeleton views, complete debug overlays, playback
  controls, exact reset, and clip/state/time HUD.
- Verified deterministic PNG generation, hierarchy, anchors/pivots, draw
  order, transform parity, mirrored limbs, animated joint overlap, pause,
  exact reset, complex-art isolation, and clean-checkout-safe Cocos types.
- `CI=true pnpm verify` passes all 151 tests in both the working copy and a
  tracked-files-only archive checkout.
- Reviewed the ignored 21.82-second dynamic MP4 covering Rest, Wave,
  Pause/Resume, Walk for more than three loops, Reset, and all debug toggles.
- Manual dynamic visual acceptance passed on 2026-07-24. Transparent PNGs
  remained aligned with the debug skeleton; shoulder, elbow, hip, knee, and
  ankle pivots behaved correctly; authored joint ranges showed no visible
  gaps or accumulated drift; limb-crossing draw order stayed stable; and
  pause/resume, exact reset, and every debug view passed.
- In-place foot sliding, no root motion or foot locking, deliberately simple
  validation artwork, and the Cocos-only adapter are accepted limitations.
- TASK-008 is approved for a Draft PR into `main`; merge remains a separate
  manual decision.

## Completed plan: TASK-007 Minimal Stickman Articulation Reference

- Status: Complete
- Started: 2026-07-24
- Completed: 2026-07-24

### Goal

Prove the reusable rigid-rig hierarchy, proximal pivots, exact rest pose,
local-to-world transform evaluation, mirrored-limb semantics, and deterministic
animation playback with deliberately simple stickman geometry before returning
to complex segmented character art.

### Scope

- Add a 16-part engine-neutral stickman fixture with stable IDs, one explicit
  root, parent relationships, proximal pivots, local rest transforms, and
  unique draw order.
- Reuse the published Rig Layout and Rig Animation 1.0 contracts rather than
  adding a character-specific schema.
- Add pure hierarchy validation and 2D local-to-world evaluation to
  `@gameai/rig-animation`, including rotation, non-uniform scale, and mirrored
  scale semantics.
- Add data-only rest/idle, arm-wave, and walk-cycle articulation clips and
  deterministic sampled evidence.
- Add a thin Cocos Creator 3.8.x demonstration adapter that creates only
  generated primitive graphics, applies sampled local poses to the Joint
  hierarchy, displays clip/playback state, and optionally displays joint
  markers.
- Add a dedicated Cocos verification scene and capture real Scene/Game
  evidence for all three clips.

### Out of scope

- Red Cap reconstruction or assumptions, automatic cutting, production art,
  Unity or Godot adapters, a cross-engine compiler, IK, mesh deformation,
  combat logic, blending, or an animation state machine.

### Execution

1. Record the replacement TASK-007 specification and this plan from clean
   `main` at `daa90d4858ab99e80429d77d4f615493f0fcb8cd`.
2. Create `feat/task-007-stickman-reference` without modifying, merging,
   deleting, or pushing `archive/old-task-007-cross-engine`.
3. Add the engine-neutral fixture, three clips, hierarchy validator, affine
   transform evaluator, deterministic evidence generator, and focused tests.
4. Add the Cocos primitive-shape adapter, runtime clip controls/status/debug
   overlay, and verification scene without adding another engine adapter.
5. Run `pnpm verify`, open the scene in Cocos Creator 3.8.8, inspect rest,
   wave, and walk playback plus pivots/mirroring, and capture evidence.
6. Complete the acceptance report, review the scoped diff, and commit locally
   without pushing until visual review passes.

### Done when

- The exact rest sample reproduces every authored local and world transform.
- Parent rotation visibly and numerically moves descendants around the
  intended shoulder, elbow, hip, and knee pivots.
- Left/right arms and legs obey explicit, tested mirrored semantics.
- Rest/idle, arm-wave, and walk-cycle clips validate and sample
  deterministically without any Red Cap data.
- The dedicated Cocos scene visibly shows the primitive stickman, current clip
  and playback state, and joint markers.
- Real Creator evidence and a written visual inspection record are committed.
- `pnpm verify` passes and the completed task is committed only on
  `feat/task-007-stickman-reference`; publication waits for visual acceptance.

### Result

- Added the engine-neutral 16-part primitive fixture, three versioned clips,
  deterministic evidence, hierarchy validation, and affine local-to-world
  evaluation without adding a schema or Red Cap-specific assumption.
- Added a Cocos Creator-only primitive adapter, generated runtime data,
  dedicated verification scene, clip controls/HUD, and optional joint markers.
- Verified exact rest restoration, descendant inheritance, shoulder/elbow/
  hip/knee pivots, mirrored limbs, and all three clips in Creator 3.8.8 and
  its Web Game Preview; captured five visual evidence images.
- Manual dynamic visual acceptance passed from the 24.9-second Web Preview
  recording: parent/child propagation, shoulder/elbow/hip/knee/ankle pivots,
  loop stability, pause/resume, exact rest reset, marker toggling, and mirrored
  semantics were all accepted.
- The pause evidence occurs at walk-cycle `TIME 0.00s` rather than an
  interpolated mid-cycle pose. This is a documented non-blocking evidence
  limitation.
- `CI=true pnpm verify` passes all 136 tests.
  `archive/old-task-007-cross-engine` remains untouched.

## Completed plan: TASK-006.2 Unmasked Rig Render Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Reject masked or pre-flattened articulation evidence, validate the final
draw-ordered composite rather than pre-composite masks, restore meaningful
joint ranges, and prove the real 19-part hierarchy in Cocos Creator 3.8.8.

### Scope

- Preserve the four rejected TASK-006.1 stress PNGs as invalid regression
  fixtures.
- Remove every `AcceptanceComposite_*` node, generated flattened acceptance
  image, overlay meta, and overlay-generation function.
- Record final-owner counts, bounds, occluders, and hashes after draw-order
  compositing, with strict invariant checks for unrotated head/accessory and
  torso parts.
- Add stable final-invisible, unexpected-occlusion, and final-composite
  mismatch diagnostics.
- Prove rotated right-arm and right-leg branches cannot transform, clip,
  occlude, or erase unrelated sibling parts.
- Restore at least ±8-degree shoulders/hips, ±12-degree elbows/knees, and
  ±6-degree wrists/ankles.
- Regenerate unmasked Cocos scenes and capture hierarchy, Scene, Game Preview,
  and individual-Visual-disable evidence in Creator 3.8.8.

### Out of scope

- TASK-007, Walk, Hit, blending, state machines, IK, mesh deformation, or any
  claim that the rig is Walk-ready without passing the requested ranges.

### Execution

1. Record TASK-006.1 rejection and freeze the four current broken outputs.
2. Remove flattened overlay generation, assets, metas, and scene nodes; add
   structural scene rejection tests.
3. Build final-owner and encoded-composite evidence with invariant hashes and
   occluder diagnostics.
4. Restore minimum stress amplitudes and repair renderer, draw order, or art
   until the complete character remains visible.
5. Open only the segmented hierarchy in Cocos Creator 3.8.8, expand it, and
   prove an individual `Visual_*` toggle changes the acceptance view.
6. Run `CI=true pnpm verify`, review the complete diff, commit as
   `fix: verify unmasked articulated rig rendering`, and push.

### Done when

- All four TASK-006.1 PNGs fail as regression fixtures.
- No acceptance scene contains or renders a flattened full-character overlay.
- Final-owner evidence preserves every unrelated invariant part and matches
  the encoded PNG.
- Minimum target rotations pass without missing parts, cracks, cropped parts,
  or transparent overwrite.
- Neutral visible RGBA differences remain exactly zero.
- Real Cocos evidence shows only the 19-part Joint/Visual hierarchy and full
  CI passes.

## Rejected plan: TASK-006.1 Fix Articulation Visual Acceptance

- Status: Rejected by TASK-006.2
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Replace the rejected TASK-006 visual gate with part-preserving, locally strict
seam and branch validation, child-textured overlap generation, independently
diagnosable stress poses, and real Cocos Creator 3.8.8 evidence.

### Scope

- Preserve the committed broken positive/negative renders as regression
  fixtures that must fail.
- Record per-part source and rendered alpha counts, bounds, transforms,
  clipping, and preservation status for every stress pose.
- Add stable missing-part, out-of-bounds, alpha-loss, disconnected-branch, and
  visible-cut-edge diagnostics.
- Replace parent-texture painting with deterministic nearest-valid child
  texture while retaining parent-defined neutral coverage.
- Replace the 60-pixel overlap search with pivot-local seam connectivity,
  corridor, boundary, and complete-branch checks.
- Render independent positive/negative arm and leg branches before combined
  positive/negative evidence.
- Regenerate Cocos rest and combined stress scenes, open them in Creator 3.8.8,
  and capture required Scene and Game Preview evidence.

### Out of scope

- TASK-007, Walk, Hit, blending, state machines, IK, mesh deformation, or any
  relaxation of the zero-difference neutral invariant.

### Execution

1. Record the TASK-006 rejection and preserve existing dirty Creator-import
   metadata/scene changes without overwriting them.
2. Freeze the rejected PNGs as invalid regression fixtures and prove the new
   validator rejects them.
3. Add per-part render accounting and stable preservation diagnostics.
4. Implement child-textured overlap generation and strict local seam/branch
   topology checks.
5. Generate eight independent branch poses and two combined poses, then
   inspect all evidence visually.
6. Regenerate Cocos scenes, validate in Creator 3.8.8, and capture five real
   engine screenshots.
7. Run `CI=true pnpm verify`, review the full diff, commit as
   `fix: validate articulation stress output visually`, and push.

### Done when

- Broken TASK-006 evidence fails regression checks.
- All new branch and combined poses preserve 19/19 parts and pass strict local
  seam and branch checks.
- No forbidden visual defect remains in generated or real-engine evidence.
- Neutral visible RGBA differences remain exactly zero.
- Creator evidence is committed and full CI passes.

## Completed plan: TASK-006 Articulation-Safe Joint Overlaps

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Extend the accepted Red Cap Remade rigid sprites with deterministic,
neutral-hidden joint overlap art, then prove representative positive and
negative rotations remain connected before adding broader animation behavior.

### Scope

- Add a versioned articulation-safety specification for both shoulders,
  elbows, wrists, hips, knees, and ankles.
- Generate extension pixels deterministically inside declared part-local
  regions while retaining canonical pixels byte-for-byte.
- Strengthen the canonical gate so every noncanonical pixel must be declared,
  neutral-covered, and covered by a strictly higher draw-order part.
- Add a pure stress-pose renderer and stable diagnostics for transparent gaps,
  exposed proximal cut edges, invalid draw order, and the right-hand briefcase
  branch.
- Produce positive/negative stress PNGs, neutral pixel-diff evidence, and
  machine-readable reports.
- Synchronize the engine-neutral fixture into the Cocos AssetDB mirror and add
  rest, positive-stress, and negative-stress acceptance scenes.

### Out of scope

- Walk, Hit, animation blending, state machines, IK, mesh deformation,
  retargeting, or changes to the accepted neutral silhouette and visible RGBA
  pixels.

### Execution

1. Record TASK-006 and its exact invariants before implementation.
2. Define joint coverage, rotation amplitudes, extension ownership, and
   covering draw-order relationships as deterministic fixture data.
3. Generate only neutral-covered extension pixels, preserving all existing
   canonical pixels, then run the canonical gate.
4. Render and validate both stress directions, including the complete
   `upper-arm-right → forearm-right → hand-right → briefcase` branch.
5. Generate Cocos acceptance scenes from the accepted rig with fixed rest and
   stress rotations and autoplay disabled.
6. Add invalid fixtures and synchronization tests, refresh evidence and docs,
   then run `CI=true pnpm verify`.
7. Review the complete diff, commit as
   `feat: add articulation-safe joint overlaps`, and push.

### Done when

- Neutral flat-composite and canonical reference differ by exactly zero pixels.
- All twelve articulation seams have declared, generated, and fully covered
  overlap pixels with correct draw order.
- Both stress directions pass gap, cut-edge, order, and briefcase-branch
  checks.
- Cocos rest and stress scenes consume the synchronized extended sprites.
- Full CI verification passes and no out-of-scope animation feature appears in
  the diff.

### Result

- Added a versioned articulation-safety fixture covering both shoulders,
  elbows, wrists, hips, knees, and ankles, with every joint stressed in both
  rotation directions.
- Generated 25,331 parent-colored extension pixels into separate generated
  sources and declared their exact run regions in the canonical provenance
  input.
- Preserved the accepted neutral pose with zero visible-pixel differences,
  zero silhouette mismatch, and zero generated pixels visible at rest.
- Added pure validation and stable gap, cut-edge, draw-order, specification,
  and briefcase-branch diagnostics.
- Both stress renders pass all 12 seams; minimum proximal coverage is
  `0.960938` and briefcase attachment error is zero.
- Added deterministic rest, positive-stress, and negative-stress Cocos scenes
  with updated transforms/sizes and autoplay disabled.
- Repeated generation is deterministic. `CI=true pnpm verify` passes all 122
  tests.

## Completed plan: TASK-005 Data-Driven Rig Animation MVP

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Add a reusable, engine-neutral rig-animation contract and deterministic
sampler, then autoplay one subtle, seamless idle preset on the accepted
Red Cap Remade Joint hierarchy in Cocos Creator 3.8.8.

### Scope

- Add canonical `rig-animation.schema.json`, TypeScript types, parser,
  semantic validator, stable diagnostics, normalizer, pure sampler, and
  drift-free playback state under `@gameai/rig-animation`.
- Use stable `jointId` targets and degree-based rotation offsets; reject Cocos
  UUIDs and Visual-node targets in animation data.
- Define the Red Cap Remade idle entirely as JSON data with subtle torso,
  head, and arm offsets while feet remain untracked and planted.
- Extend Builder Main validation so preset parsing, rig compatibility, target
  resolution, and AssetDB JSON resolution finish before scene mutation.
- Add a reusable Cocos `RigAnimationPlayer` project component that applies
  absolute rest-pose-relative samples to `Joint_*` nodes only and restores the
  exact rest pose on stop/reset.
- Configure the acceptance scene to autoplay and capture rest, intermediate,
  loop-end, hierarchy, Game Preview, and machine-readable sampling evidence.

### Out of scope

- Art recalibration, SpriteFrame replacement, Visual offsets, draw-order
  changes, hidden-extension art, IK, blending, state machines, walk cycles, or
  production gameplay.

### Execution

1. Record TASK-005 and the accepted coordinate/runtime decision before
   implementation.
2. Build the engine-neutral schema/package with invalid fixtures and
   deterministic tests.
3. Add and validate the Red Cap idle preset against stable rig joint IDs.
4. Add the thin Cocos runtime component and extend the existing validation →
   AssetDB → Scene Script boundary without duplicating contract parsing in the
   Scene Script.
5. Add runtime and integration tests for rest-pose-relative transforms,
   loop continuity, frame-rate independence, no drift, reset, Joint-only
   targets, unchanged Visual offsets, and inherited briefcase motion.
6. Run frozen install and full verification, then use Creator 3.8.8 for
   autoplay acceptance and timestamped evidence.
7. Review the complete diff, commit as
   `feat: add data-driven rig idle animation`, and push.

### Done when

- The idle JSON validates and normalizes through the engine-neutral package.
- Sampling is deterministic, loop-seamless, frame-rate independent, and never
  accumulates deltas.
- Only Joint nodes change; Visual calibration and feet remain exact.
- Stop/reset restores byte-equivalent rest transform data.
- Creator Scene and Game Preview show subtle autoplay with no detached joints,
  foot sliding, drift, loop jump, warnings, or errors.
- `CI=true pnpm verify` passes from a frozen installation.

### Result

- Added the 1.0 Rig Animation schema and `@gameai/rig-animation` package with
  stable diagnostics, parser, semantic validation, normalization, pure
  sampling, and drift-free playback state.
- Added a two-second data-only Red Cap idle that animates five Joint tracks,
  keeps feet untracked, and inherits briefcase motion from the right hand.
- Extended the editor boundary so Main validates animation/rig compatibility
  and resolves the preset through AssetDB before Scene Script mutation.
- Added `GameAIRigAnimationPlayer`, which applies absolute rest-relative
  samples to Joint nodes and supports play, pause, stop, reset, seek, and loop.
- Completed a real Creator 3.8.8 autoplay run with correlation
  `task005-1784804936809`, Scene hierarchy evidence, three live Game Preview
  frames, and exact machine-readable samples at 0, 0.5, 1, 1.5, and 2 seconds.
- Frozen install and `CI=true pnpm verify` passed with 119 tests.
- Minor flattened-source overlap artifacts remain recorded as non-blocking;
  no art calibration was performed.

## Completed plan: TASK-004.5 Canonical Part Remake

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Replace all 19 rejected Red Cap Remade sprites with deterministic, direct
pixel extractions from the canonical transparent full-body reference and pass
the TASK-004.4 provenance gate without generated visible pixels.

### Scope

- Add a reproducible canonical segmentation specification and extraction
  command.
- Assign every canonical nontransparent pixel to exactly one semantic part.
- Preserve original canonical RGBA values and source-canvas coordinates
  without resizing, repainting, or AI generation.
- Regenerate the 19 canonical part PNGs, source mapping, annotations, layout,
  Cocos AssetDB import mirror, and provenance evidence.
- Add deterministic tests for exact pixel ownership, nonempty required parts,
  output hashes, and a passing flat composite.

### Out of scope

- Painted hidden joint extensions, inpainting, generative art, animation, or
  further Cocos scene calibration.
- Changes to Character Rig Builder behavior, hierarchy, camera, or scene
  transforms.

### Execution

1. Record TASK-004.5 and this plan before implementation.
2. Define explicit source-canvas ownership polygons for all 19 canonical
   semantic parts, with deterministic priority and complete pixel coverage.
3. Extract tight lossless PNG cutouts, update source metadata, and regenerate
   the engine-neutral layout.
4. Run the TASK-004.4 gate and require zero silhouette mismatch and visible
   pixel mismatch within its accepted tolerance.
5. Synchronize only the existing Cocos asset mirror and verify all SpriteFrame
   inputs remain resolvable.
6. Run frozen installation and `CI=true pnpm verify`, document exact results,
   and review the complete diff.

### Done when

- All 19 parts are direct canonical-pixel cutouts and nonempty.
- Every canonical visible pixel has exactly one declared part owner.
- `flat-composite.png` reproduces the canonical alpha silhouette exactly and
  passes the pixel-diff threshold.
- The canonical art gate returns success rather than a blocked result.
- No builder or scene-generation implementation changes.

### Result

- Added deterministic semantic pixel-ownership input and a reusable extraction
  command.
- Remade all 19 source/import sprites from exact canonical pixels and assigned
  all 162,968 visible pixels exactly once.
- Regenerated annotation geometry, Rig Layout, neutral reconstruction, Cocos
  import mirror, extraction hashes, ownership preview, flat composite, and
  diff evidence.
- The unchanged canonical gate passes with 0 silhouette mismatches, 0 visible
  RGBA mismatches, and 100% exact canonical-pixel provenance for every part.
- No Character Rig Builder or scene-generation behavior changed.
- Flattened-source limitation remains: occluded joint interiors need a future
  declared hidden-extension art task before animation.
- Re-ran the real Creator 3.8.8 Character Rig Builder and saved correlation
  `task004-1784799620716`; it safely replaced the single generated root with
  the canonical 19-part scene rig and reported zero warnings/errors.

## Completed plan: TASK-004.4 Canonical Art Asset Gate

- Status: `BLOCKED_BY_INVALID_ART_ASSETS`
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Prove pixel provenance and flat-composite equivalence against the canonical
full-body reference before any rig hierarchy or Cocos scene generation is
allowed to claim visual acceptance.

### Scope

- Require the canonical transparent full-body PNG and fail closed when it is
  absent.
- Audit every current Red Cap Remade part against the canonical reference,
  including face/headwear, clothing, limbs, hands, shoes, and briefcase.
- Add an engine-neutral provenance manifest with explicit hidden-extension
  regions; no visible generated or painted rest-pose pixels are allowed.
- Composite parts only from `sourceCanvas`, `originalRect`, and canonical draw
  order, then export `flat-composite.png`, `diff.png`, and deterministic
  mismatch statistics.
- Add stable provenance and flat-composite diagnostic codes and automated
  invalid cases.
- Report whether the current pack is salvageable and list every asset that must
  be remade.

### Out of scope

- Joint, anchor, scale, rotation, rest-pose, or draw-order calibration.
- Cocos Scene Script, hierarchy, camera, or Sprite changes.
- Animation, deformation, source-art repair, or AI redraw.

### Execution

1. Record TASK-004.4 and this active plan before implementation.
2. Locate and strictly decode the canonical transparent reference; fail if it
   is missing or unusable.
3. Add provenance contract, pure audit/composite/diff logic, stable
   diagnostics, and deterministic tests.
4. Run the gate against all current parts and publish its flat composite,
   diff, statistics, and per-part mismatch report.
5. Update documentation and mark the task
   `BLOCKED_BY_INVALID_ART_ASSETS` if any visible part lacks canonical pixel
   provenance.
6. Run `CI=true pnpm verify`, review the complete diff, and report results.

### Done when

- The gate objectively distinguishes direct canonical pixels from visually
  similar replacement art.
- Only declared, neutral-pose-covered hidden extensions may be ignored.
- Alpha silhouette and visible RGBA tolerances are documented and enforced.
- Every mismatched current part is named.
- No rig-builder or Cocos scene-generation behavior changes.

### Result

- Added an engine-neutral, fail-closed provenance gate that composites only
  from the declared source canvas, original rectangles, and draw order.
- Added accepted ADR-0010, the provenance declaration, five stable diagnostics,
  deterministic valid/invalid tests, an audit command, and PNG/JSON evidence.
- The canonical 326×892 transparent reference exists and is usable.
- The current pack is rejected: all 19 parts fail provenance, visible pixel
  mismatch is 84.125104%, and alpha silhouette mismatch is 21.5165%.
- The task is intentionally closed as `BLOCKED_BY_INVALID_ART_ASSETS`; all 19
  visible part sprites must be remade from direct canonical cutouts before rig
  acceptance can resume.

## Completed plan: TASK-004.3 Exact Rest-Pose Reconstruction

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Reconstruct the Red Cap Remade neutral composite exactly from common
source-canvas geometry, then prove that expressing the same placement as
separate Joint and Visual transforms does not move any sprite.

### Scope

- Treat `reference/full_character.png` as the visual source of truth.
- Audit and document source-canvas, `originalRect`, `trimOffset`, anatomical
  left/right, Y-axis, units, and one-time scaling semantics.
- Add stable source-canvas consistency diagnostics.
- Add a deterministic neutral-composite reconstruction command and reference
  comparison artifact.
- Derive every Joint world pivot, parent-relative child Joint transform, and
  Visual local offset from the same source-canvas coordinates.
- Store all visual calibration in the remade annotation and generated layout;
  add no scene-local corrective offsets.
- Retain validation-before-mutation, AssetDB UUID resolution, global Sorting2D,
  RenderRoot2D/UI_3D, compatible-camera checks, and safe idempotent replacement.
- Re-run Cocos Creator 3.8.8 Scene and Game Preview acceptance.

### Out of scope

- Animation playback, animation generation, deformation, IK, or source-art
  repainting.
- Manual hierarchy assembly or dragging generated nodes.
- Arbitrary per-part scene offsets.

### Execution

1. Record TASK-004.3 before implementation and compare the rejected render
   against the complete 326×892 reference composite.
2. Add pure source/reference coordinate helpers, diagnostics, reconstruction
   output, and deterministic tests.
3. Calibrate annotation rectangles and joints against the full composite,
   regenerate the layout, and prove reconstruction equivalence.
4. Update the scene plan to carry explicit joint-world and visual-world
   evidence while emitting parent-relative Joint transforms and local Visual
   offsets with `referenceScale` applied once.
5. Synchronize the Cocos fixture, rebuild twice in the real editor, and capture
   Scene, Game Preview, hierarchy, and reference-comparison evidence.
6. Run `CI=true pnpm verify`, complete task records, commit, and push.

### Done when

- Neutral source-canvas composition closely matches the supplied complete
  reference before hierarchy is involved.
- Joint/Visual conversion preserves every reconstructed sprite center.
- Shoulders, elbows, wrists, hips, knees, ankles, hat, glasses, and briefcase
  are connected in Scene and Game Preview.
- Left/right tests use anatomical—not viewer—semantics.
- Two editor runs retain exactly one safe generated character root.
- The complete verification gate passes.

### Result

- Added `source-canvas-rect` as an explicit, backward-compatible placement mode
  and documented the decision in accepted ADR-0009.
- Recalibrated all 19 Red Cap Remade assembled rectangles, proximal pivots,
  child attachments, and draw order from the complete 326×892 reference.
- Added deterministic neutral reconstruction and side-by-side output with an
  enforced `0.8` alpha-silhouette IoU threshold; accepted IoU is `0.800928`.
- Updated scene plan 1.2 so exact-mode Joint and Visual transforms share one
  source-canvas derivation with a single Y flip and scale application.
- Added stable metadata diagnostics and automated coverage for hierarchy/world
  equivalence, visual offsets, anatomical sides, and exact scaling.
- Ran the real Creator 3.8.8 builder twice. The final correlation-linked result
  safely replaced one generated root and verified 19/19 SpriteFrames and
  non-zero sizes, RenderRoot2D/UI_3D, camera visibility, and Sorting2D.
- Captured Scene, expanded Joint/Visual hierarchy, Game Preview, and
  engine-neutral reference-comparison evidence with no warnings or errors.
- `CI=true pnpm verify` passes all 101 tests.

## Completed plan: TASK-004.2 Red Cap Remade Asset Integration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Integrate the supplied transparent Red Cap Remade art as a separate,
reproducible Character Rig fixture and prove the generated real-art rig in
Cocos Creator 3.8.8 Scene view and Game Preview without weakening the
TASK-004/004.1 validation and replacement boundaries.

### Scope

- Audit every supplied PNG by strict decode, alpha, and non-transparent bounds.
- Define an explicit, fail-closed filename-to-canonical-part mapping.
- Keep `examples/red-cap-target-remade` as the canonical engine-neutral source
  and maintain only the Cocos AssetDB-required import mirror under
  `assets/gameai/red-cap-target-remade`.
- Replace the incompatible supplied draft document with repository-versioned
  Character Rig and Source Annotation contracts.
- Generate, never hand-author, the remade Rig Layout from calibrated common
  source-canvas joints and actual image geometry.
- Extend the existing builder UI and tests for fixture selection, real manifest
  completeness, AssetDB SpriteFrame resolution, and stable missing/ambiguous
  art diagnostics.
- Generate the remade root twice in the real editor, retain UI_3D,
  RenderRoot2D, Sorting2D, camera compatibility, and safe replacement, then
  capture Scene and Game Preview evidence.

### Out of scope

- Animation playback or generation.
- Computer-vision joint inference, automatic cutting, or source-art repair.
- Manual final hierarchy assembly or hand-authored Cocos UUIDs.
- Deleting or replacing the deterministic colored-rectangle fixture.

### Execution

1. Record TASK-004.2 and this active plan before implementation.
2. Decode and inventory the supplied art, compare duplicate locations, inspect
   the assembled reference, and publish the explicit canonical mapping.
3. Add fail-closed art discovery, audit diagnostics, and deterministic tests.
4. Author the remade Character Rig and Source Annotation from actual geometry,
   regenerate Rig Layout through `@gameai/rig-layout-generator`, and validate
   through asset intake.
5. Synchronize the required Cocos import mirror and let AssetDB author all
   metadata and UUIDs.
6. Extend the builder fixture selection and generate the remade rig twice in
   the acceptance scene.
7. Capture real Scene and Game Preview evidence, document calibration limits,
   and update task results.
8. Remove ignored build state, run frozen installation and
   `CI=true pnpm verify`, review scope, commit, and push.

### Done when

- Every mapped real part is readable, transparent, non-empty, and represented
  exactly once in the validated manifest.
- Missing, duplicate, or ambiguous source art fails with a stable diagnostic.
- The generated layout is byte-stable and derived from the remade annotation.
- Every generated Visual resolves the intended SpriteFrame through AssetDB.
- Two real-editor runs leave exactly one marked remade character root and do
  not alter unrelated scene roots or cameras.
- Scene and Game Preview show the complete remade character with reasonable
  connected proportions, no colored placeholders, and no console errors.
- Frozen installation and the full CI verification gate pass.

### Result

- Preserved the supplied 19-part art in a canonical fixture and added an
  explicit mapping plus deterministic import-safe crops; the placeholder
  fixture remains intact.
- Added a calibrated 19-part contract/annotation and generator-produced layout,
  then validated its complete manifest, transparency, content bounds, and
  one-to-one AssetDB SpriteFrame resolution.
- Added stable fail-closed source-art diagnostics and tests for missing and
  ambiguous mappings, real manifest completeness, mirror integrity, layout
  validity, and idempotent replacement.
- Ran Cocos Creator 3.8.8 twice. The final run replaced the single marked root,
  verified 19 SpriteFrames below RenderRoot2D on UI_3D, preserved four unrelated
  roots and camera state, and produced Scene/Game evidence with zero console
  counters.
- Passed frozen installation and the complete 91-test
  `CI=true pnpm verify` gate.

## Completed plan: TASK-004.1 Cocos Visible Rig Acceptance

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Make the generated Red Cap rig visibly render as world-space 2D content in
Cocos Creator 3.8.8 and upgrade acceptance from hierarchy proof to visual
assembly proof.

### Scope

- Add a generated RenderRoot2D boundary and move all generated nodes to UI_3D.
- Add pre-commit Scene Script verification for render-root ancestry,
  SpriteFrames, non-zero sizes, consistent layers, and compatible cameras.
- Add a stable missing-camera diagnostic without mutating unrelated cameras.
- Configure only the acceptance fixture camera for orthographic UI_3D
  visibility.
- Extend deterministic tests, documentation, saved scene, and real editor
  evidence.

### Out of scope

- Automatic changes to unrelated project cameras.
- Animation, production runtime integration, or contract changes.
- Changes to existing Joint/Visual transforms or draw order.

### Execution

1. Record TASK-004.1, this plan, and the world-space 2D decision.
2. Add render-layer and render-root information to the deterministic scene
   plan.
3. Build and verify a RenderRoot2D-backed detached character tree.
4. Add camera-mask policy tests and failure diagnostics.
5. Update the acceptance camera without placing it inside the generated
   replacement boundary.
6. Run the real editor twice and replace evidence with visible Scene and
   Game/Preview captures where practical.
7. Clean ignored state, run frozen installation and `pnpm verify`, document the
   result, and commit with the required subject.

### Done when

- Red Cap is visibly assembled in the saved acceptance scene and capture.
- Every generated Sprite is below RenderRoot2D with a non-null SpriteFrame,
  non-zero size, and UI_3D layer.
- A compatible active camera is proven without generator-owned camera changes.
- Duplicate generation remains safe and idempotent.
- Clean-checkout verification passes.

### Result

- Added a generated RenderRoot2D boundary and assigned every generated node
  to UI_3D while retaining the complete Joint/Visual hierarchy, transforms,
  pivots, and global Sorting2D order.
- Added atomic preflight and post-attachment verification for render-root
  ancestry, SpriteFrames, non-zero sizes, layer consistency, compatible
  cameras, and unchanged camera state.
- Added the stable `NO_CAMERA_CAN_RENDER_GENERATED_LAYER` diagnostic and
  deterministic camera-mask tests.
- Calibrated the fixture-owned Main Camera to an orthographic 2D view and
  included `sorting-2d` in the acceptance project's runtime engine modules.
- Ran Cocos Creator 3.8.8 generation twice. The second run safely replaced the
  marked root; Scene and Web Preview visibly rendered all 18 parts with zero
  console errors.
- Removed dependencies and all build outputs, then passed
  `pnpm install --frozen-lockfile` and the complete 84-test `pnpm verify`.

## Completed plan: TASK-004 Cocos Scene Rig Builder MVP

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build the first production Cocos Creator 3.8.8 Panel → Main → validated scene
plan → Scene Script pipeline and assemble the Red Cap Target as an idempotent,
animation-ready rigid-sprite scene rig.

### Scope

- Add a dedicated project-local Character Rig Builder editor extension.
- Reuse all three engine-neutral Character Pipeline packages before scene
  mutation.
- Resolve SpriteFrame UUIDs through AssetDB and pass a deterministic pure-data
  scene plan across the process boundary.
- Build proximal `Joint_<partId>` hierarchy nodes with center-anchored,
  trim-compensated `Visual_<partId>` Sprite children.
- Apply a deterministic global render order across hierarchy branches.
- Replace only the exact marker-guarded generated character root.
- Preserve one correlation ID through the UI, validation, mutation, and
  acceptance evidence.
- Add deterministic automated tests and Red Cap Target Cocos acceptance
  evidence.

### Out of scope

- Animation playback or generation.
- Auto cutting or computer-vision joint detection.
- Production-game integration.
- Mutation of unrelated scene nodes or source assets.

### Execution

1. Record TASK-004, this active plan, and the scene-boundary ADR before
   implementation.
2. Implement and test deterministic scene-plan generation and replacement
   policy independently of Cocos objects.
3. Implement the Panel, Main Process validation/generation/AssetDB flow, and
   Scene Script mutation.
4. Add the Cocos fixture project, Red Cap Target assets, documentation, and
   stable diagnostics.
5. Run the real Cocos Creator 3.8.8 acceptance procedure and capture evidence.
6. Remove generated build state, run frozen installation and `pnpm verify`, and
   review the final diff.
7. Complete the task records and commit with the required subject.

### Done when

- Validation failure cannot create scene nodes.
- Every part has the required Joint/Visual structure, proximal hierarchy,
  correct trim compensation, scale, and global draw order.
- Repeated generation is idempotent and unrelated scene nodes remain intact.
- Red Cap Target acceptance evidence is correlation-linked across all stages.
- A clean repository state passes frozen installation and `pnpm verify`.

### Result

- Added a dedicated Cocos Creator 3.8.8 extension with the required
  Panel → Main → engine-neutral validation/generation → AssetDB → Scene Script
  boundary.
- Added deterministic scene-plan generation, center-anchored trim
  compensation, proximal Joint/Visual hierarchy, global Sorting2D order, and
  stable diagnostics.
- Added exact-root marker protection, duplicate-run replacement, and atomic
  rollback on replacement verification failure.
- Ran the Red Cap Target in the real editor twice. The first run created 18
  Joint/Visual pairs and the second replaced the same root; all four unrelated
  scene roots remained.
- Saved the imported fixture, AssetDB-authored metadata, acceptance scene,
  correlation-linked JSON evidence, and hierarchy screenshot.
- Cleaned all ignored outputs and dependencies, ran frozen installation, and
  passed the complete 81-test `pnpm verify` gate (63 prior plus 18 new).

## Completed plan: TASK-003.2 Clean-Checkout Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Make the repository verification gate reproducible from a fresh checkout where no workspace package has prebuilt `dist` or `dist-test` declarations.

### Scope

- Change the root verification order so workspace dependencies build before repository-wide typechecking.
- Preserve topological workspace build ordering through pnpm.
- Make the GitHub Actions verification job explicitly assert that checkout-time build outputs are absent.
- Prove the documented `pnpm install --frozen-lockfile` followed by `pnpm verify` workflow succeeds without pre-existing generated directories.

### Out of scope

- Production pipeline or Cocos behavior.
- Workspace topology changes.
- Committing generated `dist` or `dist-test` output.
- New runtime dependencies.

### Execution

1. Record TASK-003.2 and this active plan before implementation.
2. Reproduce the clean-output failure and confirm the dependency ordering cause.
3. Build workspace dependencies before the repository-wide typecheck in `pnpm verify`.
4. Strengthen CI with a clean-checkout output assertion followed by frozen install and verify.
5. Remove local build outputs, run the exact clean-checkout command sequence, and confirm all 63 tests.
6. Review the diff and commit with the required subject.

### Done when

- `pnpm install --frozen-lockfile` and `pnpm verify` pass with no pre-existing workspace `dist` or `dist-test` directories.
- Workspace consumers resolve dependency declarations created by the preceding topological build.
- CI guards the clean-checkout assumption.
- All 63 tests pass and generated output remains ignored.

### Result

- Reproduced the clean-output failure as `TS2307` errors in `@gameai/character-asset-intake` before `@gameai/character-contracts/dist` existed.
- Changed the root gate to topological build → repository-wide typecheck → complete test suite.
- Added a CI assertion that the checkout contains no `dist` or `dist-test` before frozen installation and verification.
- Removed all local workspace build output and `node_modules`, then ran `pnpm install --frozen-lockfile` followed by `pnpm verify`.
- All 63 tests pass; no generated output or dependency changes are tracked.

## Completed plan: TASK-003.1 Rig Semantics and Red Cap Calibration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Correct Rig Layout semantics so every part pivot is its proximal attachment joint, explicitly represent parent-owned child attachment points, and recalibrate the Red Cap Target into an animation-ready golden fixture with a deterministic assembled preview.

### Scope

- Define `joint` as the part's proximal pivot and add named `childAttachments` as distinct parent-owned source-canvas points.
- Require each non-root part's proximal joint to coincide with its parent's attachment for that child without treating the two records as the same semantic field.
- Recalibrate Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots.
- Reject duplicate annotation `partId` values deterministically.
- Constrain normalized sockets, rectangle hit areas, and circle hit areas to the normalized part bounds.
- Regenerate the Red Cap golden Rig Layout and a deterministic assembled SVG acceptance preview.
- Update ADR-0006, schemas, public types, diagnostics, docs, and tests.

### Out of scope

- Production Cocos Scene, Node, or Prefab generation.
- Computer-vision joint detection or image segmentation.
- Animation playback or automatic animation generation.
- Source-art mutation or repair.

### Execution

1. Record TASK-003.1 and this active plan before implementation.
2. Add explicit named child-attachment data and semantic validation.
3. Add duplicate part-ID and normalized template-geometry validation.
4. Recalibrate Red Cap proximal pivots and parent-owned attachment points.
5. Regenerate the golden layout and assembled preview acceptance artifact.
6. Add exact shoulder, elbow, hip, knee, duplicate-ID, and normalized-geometry tests.
7. Update architecture and user documentation.
8. Run `pnpm verify`, review the diff, and commit the completed task.

### Done when

- Every Red Cap limb anchor is at the documented proximal joint.
- Parent child-attachment records are explicit and match, but do not replace, child proximal pivots.
- Duplicate annotation part IDs and invalid normalized template geometry fail deterministically.
- The generated golden layout and assembled SVG preview are byte-stable.
- `pnpm verify` passes and no production Cocos Scene Builder code exists.

### Result

- Made each annotation `joint` a proximal animation pivot and added distinct named parent-owned `childAttachments`.
- Added Source Annotation 1.1 explicit-attachment semantics with a tested 1.0 compatibility fallback.
- Recalibrated Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots and regenerated the Rig Layout golden.
- Added deterministic diagnostics and tests for duplicate annotation IDs, child-attachment correspondence, and bounded normalized socket/hit-area geometry.
- Added a byte-stable assembled SVG acceptance preview and changed fixture generation to preserve the authored annotation.
- Updated ADR-0006, schemas, public types, schema compatibility docs, package docs, and generator documentation.
- `CI=true pnpm verify` passes with 63 tests.
- No production Cocos Scene Builder behavior was introduced.

## Completed plan: TASK-003 Rig Layout Generator

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral generator that deterministically converts a versioned source-canvas annotation and reusable skeleton template into a valid Rig Layout, then verifies the generated contract and all referenced assets before returning success.

### Scope

- Add canonical Source Canvas Annotation and Skeleton Template JSON Schemas.
- Add `@gameai/rig-layout-generator` under `pipelines/` with parsers, public types, stable diagnostics, deterministic generation, and JSON serialization.
- Add the reusable `male-normal-v1` skeleton template.
- Derive untrimmed geometry, trim offsets, normalized joint anchors, parent-relative rest poses, hierarchy, draw order, sockets, and hit areas.
- Validate generated layouts through both `@gameai/character-contracts` and `@gameai/character-asset-intake`.
- Add a Red Cap Target annotation, generated golden layout, targeted invalid fixtures, deterministic tests, documentation, and an accepted coordinate/contract ADR.

### Out of scope

- Image segmentation or computer-vision joint detection.
- Cocos Nodes, Prefabs, Scenes, or editor generation.
- Animation playback.
- Source-image or source-annotation mutation and automatic repair.

### Coordinate decisions

- Source annotations use top-left origin, positive X right, and positive Y down.
- Every pivot is the authored joint in the untrimmed source rectangle; trimmed image centers and visual centers never determine anchors.
- Child rest position is derived from child and parent joints in the same source canvas, scaled by `referenceScale`, with source Y inverted.
- Root rest position is derived from the source-canvas center using the same conversion.
- Template socket and hit-area geometry is normalized against a parent part's untrimmed rectangle and converted to parent-local reference space.

### Execution

1. Record TASK-003 and this active plan before implementation.
2. Add and document the two canonical input contracts and compatibility rules.
3. Implement parsers, template/annotation semantic checks, formulas, diagnostics, and deterministic generation.
4. Add an in-memory asset-intake validation API and require both downstream validators before success.
5. Add `male-normal-v1`, Red Cap Target annotation/golden output, and one invalid fixture per required diagnostic.
6. Test formulas, pivot semantics, deterministic serialization, downstream validation, and source immutability.
7. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- The Red Cap annotation generates the byte-stable golden Rig Layout.
- All coordinate formulas and Y-axis inversion are documented and tested with exact values.
- Every required diagnostic is stable and covered by a fixture.
- A successful result has passed both Character Contract and Character Asset Intake validation.
- `pnpm verify` passes from the repository root.
- No out-of-scope engine, vision, playback, or repair logic is present.

### Result

- Added canonical Source Canvas Annotation and Skeleton Template schemas plus the engine-neutral `@gameai/rig-layout-generator` package.
- Added `male-normal-v1`, deterministic coordinate conversion/serialization, stable diagnostics, overlap warnings, and downstream validation through both required packages.
- Added the Red Cap Target source annotation and byte-stable generated Rig Layout golden fixture.
- Added nine targeted invalid fixtures and exact tests for anchors, root/child rest poses, Y inversion, sockets, hit areas, trim dimensions, visual-center independence, and source immutability.
- Accepted ADR-0006 for source-space joint authority and versioned generator input contracts.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 56 total tests.
- No image segmentation, vision detection, Cocos generation, animation playback, or source repair was added.

## Completed plan: TASK-002 Character Asset Intake and Validation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral asset-intake package that safely loads a character fixture, validates its Character Rig and Rig Layout contracts, inspects referenced PNG/JPEG/WebP files, and returns a deterministic normalized asset manifest and diagnostics.

### Scope

- Add `@gameai/character-asset-intake` under `pipelines/`.
- Load `character-rig.json`, resolve its Rig Layout, and validate both through `@gameai/character-contracts`.
- Resolve referenced image paths inside a caller-selected source root without following paths outside that root.
- Decode supported image formats and validate format, dimensions, alpha, transparent content bounds, trim geometry, and duplicate references.
- Return a deterministic manifest containing contract versions, safe paths, image facts, hierarchy, transforms, draw order, sockets, and hit areas.
- Add textual and binary fixtures, one targeted invalid fixture per required diagnostic, deterministic unit tests, package documentation, and an accepted image-decoding ADR.

### Out of scope

- Auto cutting or automatic source-asset repair.
- Image generation.
- Cocos nodes, prefabs, scenes, or other engine adapters.
- Animation playback.
- Mutation or rewriting of source assets.

### Execution

1. Record TASK-002 and this active plan before implementation.
2. Select and document a maintained multi-format image decoder in an ADR.
3. Define public manifest, result, option, and stable diagnostic types.
4. Implement safe JSON/image loading, contract validation, image inspection, and deterministic normalization.
5. Add the valid fixture and one targeted invalid fixture per required diagnostic.
6. Test deterministic output, geometry relationships, safety boundaries, and read-only behavior.
7. Document APIs, diagnostics, path model, image rules, and limitations.
8. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- Valid PNG, JPEG, and WebP assets are inspected without Cocos dependencies.
- Every required invalid condition returns its stable diagnostic code.
- Trimmed dimensions satisfy `trimOffset + imageSize <= originalRect`, and `originalRect` remains bounded by `sourceCanvas` through contract validation.
- Manifest ordering and diagnostics are deterministic across repeated runs.
- Source fixtures are unchanged by intake.
- `pnpm verify` passes from the repository root.

### Result

- Added `@gameai/character-asset-intake` with safe real-path containment, contract loading, strict image decoding, geometry validation, stable diagnostics, and a plain deterministic manifest.
- Added generated Red Cap Target PNG assets plus focused PNG, JPEG, WebP, malformed, unsupported, and transparent binary fixtures.
- Added one invalid fixture for each of the ten required asset diagnostic codes and deterministic read-only tests.
- Accepted ADR-0005 selecting sharp 0.35.3 as the package-local multi-format decoder.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 41 total tests.
- No Cocos generation, auto cutting, image generation, animation playback, or source-asset repair was added.

## Completed plan: TASK-001 Character Contract Foundation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Define and validate the complete engine-neutral Character Rig and Rig Layout contracts required by the Character Rig Builder before any production scene-generation code is written.

### Scope

- Add canonical JSON Schemas for Character Rig and Rig Layout.
- Add an engine-neutral `@gameai/character-contracts` workspace package with public TypeScript types.
- Parse JSON, validate schema shape, and enforce cross-document semantic rules with stable error codes.
- Add the Red Cap Target textual golden fixture and targeted invalid fixtures.
- Document schema-version compatibility and contract coordinate conventions.
- Add deterministic unit tests and include the package in the root verification gate.

### Out of scope

- Cocos scene, node, prefab, or asset generation.
- Image segmentation and auto cutting.
- Animation clip formats or runtime animation playback.
- Binary art assets and visual regression output.

### Contract decisions

- `schemas/` is the canonical schema source; package builds copy those schemas into distributable output.
- Character Rig declares identity, its Rig Layout file, required part IDs, required animation target IDs, and target-to-part mappings.
- Rig Layout owns source-canvas geometry, trimmed-part placement, hierarchy, reference scale, draw order, sockets, and hit areas.
- File paths are relative POSIX paths and cannot be absolute or traverse above the specification directory.
- Schema compatibility is explicit SemVer: the current validator supports `>=1.0.0 <1.1.0`; newer minor or major versions fail with a stable error code.

### Execution

1. Create TASK-001 with explicit acceptance criteria.
2. Add both JSON Schemas and public TypeScript types.
3. Implement JSON parsing, schema validation, semantic validation, and stable diagnostics.
4. Add the Red Cap Target valid fixture and one invalid fixture per required semantic failure.
5. Add unit tests for schema synchronization, parsing, version compatibility, and all semantic rules.
6. Document usage, coordinates, limitations, and schema-version compatibility.
7. Run `pnpm verify`, review the complete diff, and commit TASK-001.

### Done when

- Both canonical schemas parse and compile.
- TypeScript public types and JSON Schemas are synchronized by tests.
- Every required invalid condition produces its documented stable error code.
- The Red Cap Target fixture parses and validates without errors.
- `pnpm verify` passes from the repository root.
- No production Cocos scene-generation logic is present.

### Result

- Added canonical Character Rig and Rig Layout JSON Schemas and byte-identical package build copies.
- Added the engine-neutral `@gameai/character-contracts` package with public types, Ajv parsing, semantic validation, deterministic diagnostics, and stable error codes.
- Added the Red Cap Target textual golden fixture and targeted invalid fixtures for every required failure mode.
- Added schema compatibility, coordinate-system, API, limitation, and error-code documentation plus ADR-0004.
- `pnpm verify` passes with 23 Character Contract tests and the 4 existing TASK-000 tests.
- No production Cocos scene-generation logic was added.

## Completed plan: TASK-000 Repository and Environment Audit

- Status: Complete with explicit external UI-automation blocker
- Completed: 2026-07-23

### Goal

Establish and prove the minimum reproducible development environment required before Character Pipeline implementation begins.

### Scope

- Record exact local toolchain versions and supported project versions.
- Adopt a pnpm workspace with explicit framework, pipeline, Cocos adapter, and Cocos project boundaries.
- Add a minimal Cocos Creator 3.8.8 extension spike that exercises Panel → main process → Scene Script messaging.
- Add deterministic type-check, unit-test, and CI commands.
- Record validation evidence or a reproducible blocker.

### Out of scope

- Production Character Rig Builder code
- Automatic image segmentation
- Binary art assets
- Cloud image-generation integration

### Execution

1. Record the installed and repository-supported toolchain in `docs/environment.md`.
2. Add the root pnpm workspace, lockfile, TypeScript configuration, and ignore rules.
3. Add an in-repository Cocos 3.8.8 spike project whose extension is a workspace package.
4. Unit-test the message orchestration outside Creator.
5. Load the spike project in Creator and capture Panel → main → Scene Script evidence, or document an exact blocker and manual reproduction steps.
6. Add a minimal GitHub Actions workflow and run all local checks.
7. Update architecture assumptions and close TASK-000 only when its acceptance criteria pass.

### Done when

- `docs/environment.md` contains command-backed versions and exact install/test commands.
- `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm test` are deterministic.
- The spike proves Panel → main process → Scene Script on Cocos Creator 3.8.8, or records a reproducible external blocker.
- The repository-versus-consumer decision and dependency direction are explicit.
- No Character Rig Builder production logic is introduced.

### Result

- Exact environment output and commands are recorded in `docs/environment.md`.
- The pnpm workspace, frozen lockfile, Cocos 3.8.8 fixture extension, four tests, and CI workflow are implemented.
- Creator loaded the fixture extension main process and Scene process. The remaining live panel click is explicitly blocked by concurrent-instance accessibility targeting and has exact reproduction steps in `docs/environment.md`.
- ADR-0003 records the external production-game consumer topology.
# Accepted plan: TASK-014C Canonical Full-Loadout Semantic VFX Integration

- Status: Accepted
- Started: 2026-07-27
- Accepted: 2026-07-28
- Branch: `feat/task-014c-canonical-loadout-semantic-vfx`
- Baseline: `48316aa2603f9235ebafc83c726b7f0bff822348`
- Reviewed feature:
  `3c734174c04f823b21b0fd6ab8b9c3e3f121fc38`
- Final evidence:
  `75b844b14d250d7b10df915275d242ab5128aa59`
- Expected budget: at most 70 changed files and 12,000 changed lines,
  including one Creator-owned Scene/`.meta` pair; zero feature-branch MP4 or
  audio files

## Goal

Compose the accepted Character Semantic Events evaluator and TASK-014B Cocos
VFX adapter with the canonical V2 full-loadout runtime, proving deterministic
Dust, Trail, and Aura behavior across all 12 loadout states, all five
production-lite semantic clips, transform stress, lifecycle rebuilds, and
Exact Reset.

## Authoritative flow

```text
full-loadout-source.json
→ engine-neutral contracts
→ resolveCharacterLoadout
→ deterministic canonical Cocos plan
→ evaluated pose and semantic target registry
→ Character Semantic Events evaluator
→ accepted TASK-014B semantic VFX adapter
→ Cocos renderer registry
```

The composition layer reuses the accepted resolver, evaluator, adapter,
readiness, sorting, projection, and lifecycle boundaries. It does not copy the
superseded TASK-013 monolith or introduce Cocos types into engine-neutral
packages.

## Scope

- Add one reusable Cocos-only canonical semantic-VFX composition layer.
- Add one Creator-owned TASK-014C acceptance Scene and component identity.
- Resolve left foot, right foot, torso/body, and active hand/tool targets from
  the canonical evaluated pose and declared loadout/prop state.
- Reuse procedural Dust, Trail, and Aura renderers through the TASK-014B
  adapter contract.
- Add one typed input registry that owns action IDs, keys, Cocos KeyCodes,
  dispatch intent, and HUD help.
- Expose complete lifecycle, target, VFX, resource, projection, duplicate,
  stale-reference, viewport, and finite-value diagnostics.
- Add deterministic focused, generated-closure, Scene/meta, identity,
  viewport/AABB, ROI, and negative tests.
- Run working-copy and frozen tracked-files-only verification, then one
  Creator 3.8.8 open/switch/reopen/live/visual/evidence gate.

## Loadout and target policy

- The canonical 4×3 resolver-derived matrix remains authoritative.
- No prop resolves the active effect target to the authored default hand.
- Left/right prop resolves to the declared matching prop grip/effect target.
- Unknown or unavailable targets fail closed; there is no Canvas-coordinate,
  opposite-hand, asset-name, or scene-name fallback.
- A loadout change atomically re-resolves target references. A persistent
  instance is retained only while its logical target remains valid, and is
  reprojected immediately. Invalidated instances stop exactly once.

## Lifecycle policy

```text
LOADING
→ RESOURCES_PASSED
→ LOADOUT_BUILT
→ SOCKETS_RESOLVED
→ EVENTS_READY
→ RESET_COMPLETE
→ READY
```

Exactly one input handler is registered only after `READY`. Failure, disable,
destroy, rebuild, and generation invalidation unregister input, invalidate
pending work, dispose evaluator state, clean each active renderer exactly
once, destroy partial nodes, and clear target references. Exact Reset restores
the canonical default/no-prop loadout, authored Rest pose, Rest semantic
track, stopped time zero, stress/debug OFF, zero VFX and stale targets, one
runtime root, one input handler, and zero leaks.

## Execution

1. Record the task, acceptance matrix, controls, HUD, target/VFX mapping,
   lifecycle policy, storyboard, and non-goals before runtime changes.
2. Add the deterministic composition contracts, target resolver, semantic
   tracks, unified input registry, runtime diagnostics, and focused tests.
3. Add the Creator runtime composition and generated mirror without changing
   canonical V2 behavior or engine-neutral schemas/evaluator semantics.
4. Create and save the TASK-014C Scene and metadata through Creator 3.8.8,
   then lock their identity and byte-closure tests.
5. Run every automated, tracked-only, generated, schema, metadata, binary,
   viewport, and content-closure gate.
6. Run the uninterrupted Creator gate, inspect presentation quality, and
   correct ordinary in-scope integration defects as one concentrated pass.
7. Commit and push the feature, record and self-review one final Web Preview
   video, publish only its manifest and MP4 on `evidence/task-014c`, and
   revalidate the downloaded copy.
8. Stop at pending external visual review without a PR or merge.

## Non-goals

No Character Semantic Events schema/version or evaluator change, loadout
resolver rewrite, new effect art, audio/gameplay execution, TASK-014D,
canonical V2 behavior change, superseded monolith repair, Red Cap work,
Unity/Godot/Windows support, tag, release, feature PR, merge, or protected
reference mutation.

## Done when

- All 12 states and five clips pass deterministic target/VFX behavior.
- Dust captures alternating real feet; Trail follows the active hand/tool;
  Aura remains one logical instance across six loops and Pause/Resume.
- Two consecutive rebuilds are followed by successful state switching and
  all three effects with zero duplicates, stale targets, inputs, or leaks.
- Both verification modes, generated closure, schema identity, metadata/
  atomic-publication regressions, binary audit, and post-verify clean-tree
  checks pass within budget.
- Creator 3.8.8 passes the complete one-pass runtime and visual gate with
  every relevant warning/error/violation counter at zero.
- The final H.264 High 1280×720 30 fps yuv420p evidence fully decodes,
  self-review passes, and its uploaded copy is byte-identical.
- Feature implementation and temporary evidence are pushed, no MP4 is
  tracked on the feature branch, and no PR exists.

## TASK-014D2 remediation plan (complete; external review pending)

- Preserve `ac5309cb5aa6854d1ad94402f6abdac42619f793` and
  `8e972215986b2f1d8c4aa381f1feecf4f1bc7ad7` as append-only ancestors.
- The final full-boundary audit additionally closes registered-before-throw
  ownership cleanup, explicit recipe/primitive and blend-role realization,
  exact D1 range/order/particle-schedule validation, live-set global sorting,
  and hierarchy-corner AABB evaluation that preserves nested affine shear.
- Creator regating additionally replaces shear-sensitive world-quaternion
  decomposition with an exact world-axis-to-target-local round-trip guard.
- Replace non-atomic instance creation with transactional renderer ownership,
  exact ownership-set diagnostics, destroy-once cleanup, and one terminal
  runtime failure path.
- Validate untrusted Render Plan and resource-registry values completely before
  descriptor emission, including closed enums, sparse/malformed collections,
  capability duplicates, sorting, and preflight budgets.
- Compile globally unique deterministic sorting orders and concrete,
  exhaustive primitive/recipe/blend/lifecycle realization instructions.
- Replace radius-only viewport checks with transformed primitive bounds and
  one typed diagnostics model shared by runtime, HUD, and tests.
- Regenerate mirrors, run the full automated and Creator 3.8.8 gates, append
  feature commits within 48 files / 8,000 changed lines, and push without a PR.
- Record and byte-verify a replacement evidence video while retaining and
  explicitly marking the original evidence as failed external review.

### Remediation result

- Atomic creation/initial update, exact renderer tuple ownership,
  destroy-once terminal cleanup, and same-ID retry are enforced.
- The untrusted descriptor boundary validates every concrete plan/registry
  value and budget before emitting any descriptor.
- Runtime factories exhaustively realize typed textured-sprite,
  procedural-ring, procedural-ribbon, alpha, additive, screen, lifecycle, and
  particle behavior without cue/resource-name dispatch.
- Switching between looping and persistent references sends an authoritative
  stop before the new start, while repeated starts of the same persistent
  reference coalesce to one active instance.
- Global sorting is unique and activation-order independent; transformed
  four-corner bounds include nested rotation, non-uniform Stress, and
  primitive/particle geometry.
- HUD and tests consume one typed diagnostic model. All automated and Creator
  3.8.8 gates passed; replacement evidence is pending external code and visual
  review. No TASK-014D2 PR exists and TASK-014D3 has not started.

## Acceptance result

- External visual review: PASS.
- The complete 65-second core video passed canonical 12-state traversal,
  no/left/right prop behavior, Footstep Dust, Wave Trail, Prop Swing Trail,
  persistent Aura across six loops, Pause/Resume, loadout and prop switching,
  Transform Stress, two Lifecycle Rebuilds, and effects after rebuild.
- Core video:
  `task-014c-canonical-loadout-semantic-vfx.mp4`, SHA-256
  `6952013fe22c9c04dcc1d2fce1731434511617015c640d7f92a336006a00df01`.
- The supplemental tail passed Aura-before-Reset, Exact Reset, canonical
  no-prop Rest at stopped time zero, debug/stress OFF, zero evaluator,
  adapter, visible-VFX, leak, stale-target, viewport, and finite-value
  violations, plus approximately nine seconds of unchanged clean hold.
- Supplemental video: `task-014c-acceptance-tail.mp4`, SHA-256
  `ffddbec09ff087baf82be80c0c2ae48e711f6a26a24276ef510a4e88262cf601`.
- The stable final state remained one runtime root, one input handler, and
  `SETUP 7 / TEARDOWN 6 / REBUILDS 6`. HUD `ROOTS 0 / INPUT 0` are the
  duplicate-root and excess-handler counters.
- A pointer remains in unused blank space in the supplemental tail and
  obscures no HUD, character, or VFX region.
- Procedural Dust, Trail, and Aura remain placeholder art. Audio/gameplay
  execution, Red Cap, Unity, Godot, Windows, and TASK-014D remain out of
  scope.

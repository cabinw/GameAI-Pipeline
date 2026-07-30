# PROGRAM-015 Red Cap Production Vertical Slice Acceptance

## Current decision

Phase 0 source readiness and TASK-015A/B/C implementation are accepted on
2026-07-30. The first Phase B/C evidence publication failed external review
because it used synthetic flat-composite motion and non-media-derived
framebuffer metrics. Replacement Creator Web Preview evidence subsequently
passed independent external code/runtime/Creator/visual/spatial/control/
evidence review. PROGRAM-015 is Accepted and awaiting Draft PR publication.

## Required acceptance chain

1. Phase 0 source readiness passes.
2. TASK-015A automated and Creator gates pass; append A checkpoint. PASS
   (`9d1627b`).
3. TASK-015B automated and Creator gates pass; append B checkpoint. PASS
   (`70e0ba3`).
4. TASK-015C automated and Creator gates pass; append C/final checkpoint.
   PASS.
5. Complete workspace, typecheck, clean-CI, working-copy, frozen
   tracked-files-only, closure, Scene/meta identity, deterministic bytes,
   Markdown links, diff, media scope, and protected-reference gates pass.
6. Evidence is published only on `evidence/task-015`, downloaded, hash
   checked, decoded fully, and frame-identity verified.

## Source-readiness acceptance

All rows in
`../reports/PROGRAM-015-phase-0-source-readiness.md` must be `PASS`.
`UNKNOWN`, `MISSING`, and repository-history-only attribution fail closed.

## Automated acceptance

- Deterministic generators and byte closure.
- Visible-pixel provenance and exact ownership.
- Neutral alpha/RGBA reconstruction and joint seam ROIs.
- 60 Hz clip sampling, loop/contact/socket/event invariants.
- Two-character target isolation, sorting, ownership, AABB, safe-area, and
  framebuffer oracles.
- Exact Reset, two rebuilds, lifecycle compensation, fault matrices, and
  post-verify clean closure.

## Creator acceptance

- Cocos Creator 3.8.8 clean open, switch/reopen, and second startup.
- All clips and VFX, Pause/Resume, Transform Stress, two rebuilds,
  post-rebuild sequence, Exact Reset, clean hold.
- Real disable then destroy lifecycle.
- Both characters and required background visible at 1280×720.
- Relevant Creator and Preview warnings/errors: zero.

## Phase 0 accepted evidence

- Source pack: `red-cap-production-v1`.
- Generation provenance: OpenAI ImageGen in ChatGPT with recorded chroma-key
  alpha extraction.
- Project-owner rights review: commercial use, modification, public
  repository inclusion and redistribution confirmed.
- Rights binding: provenance SHA
  `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
- Master: 1254×1254 RGBA, transparent corners, 282,476 visible pixels,
  SHA `7a4cf6a690aa6532a51c209d839d7d71b28396e40e021973c0f35fb0f828f3a1`.
- Parts sheet: 19 independent alpha components used only for part
  identification, structural mapping, boundary checks, and manual audit; it
  is never final visible-pixel authority.
- Joint supplement: accepted only for declared hidden shoulder, elbow, wrist,
  hip, knee, and ankle connectors; ambiguous generic connector and duplicate
  combined pelvis are rejected.
- Character master: sole final visible-pixel authority.
- Background/style: 1672×941 RGB inputs with a locked 1664×936 crop,
  10/13 scale, 1280×720 output, ground line, safe area and framebuffer ROIs.
- Working tree contained no untracked/staged intake file at promotion.

The accepted machine-readable inputs are
`../../examples/red-cap-production-v1/source-authority-map.json` and
`../../examples/red-cap-production-v1/showcase-layout.json`.

## Historical Phase C local evidence

- Independent Creator-owned Scene:
  `../../cocos/projects/character-rig-builder-mvp/assets/red-cap-production-showcase.scene`.
- Four deterministic PNG resources: licensed background, accepted
  production-lite composite, accepted Red Cap composite, and procedural VFX
  soft mask.
- D1 authoring produces a byte-stable Render Plan consumed by the existing D2
  Creator host/runtime; no D1/D2 public source changed.
- The previously reported Dust 376, Trail 4,077, Aura 16,492 and Resume
  40,125 counts were produced by a synthetic/offline path, not derived from
  the final published MP4. They are not external visual evidence.
- The old payload remains byte-identical and is classified
  `failed-external-review-synthetic-animation-and-non-media-derived-metrics`.
- Replacement evidence must use the actual jointed Creator 3.8.8 Web Preview
  runtime and derive Dust, Trail, Aura, Pause, and Resume results from exact
  decoded MP4 frames.
- Full details:
  `../reports/PROGRAM-015-phase-c-showcase.md`.

## Final scope and accounting reconciliation

The fixed comparison is exact `main`
`68444551b9b160a2455a97a2d8bf611aea608c6e` through Phase C
`25d506983d213449559f84587c5b19bf8ceef6b9`, using
`git diff --find-renames --numstat` throughout:

| Boundary | Files | Additions | Deletions | Changed lines | Binary PNG |
| --- | ---: | ---: | ---: | ---: | ---: |
| Phase 0 (`main..0ea3c8d`) | 23 | 1,329 | 18 | 1,347 | 5 |
| Phase A (`0ea3c8d..9d1627b`) | 45 | 5,462 | 19 | 5,481 | 24 |
| Phase B (`9d1627b..70e0ba3`) | 21 | 3,269 | 10 | 3,279 | 0 |
| Phase C (`70e0ba3..25d5069`) | 30 | 2,299 | 7 | 2,306 | 4 |
| Distinct aggregate (`main..25d5069`) | 103 | 12,323 | 18 | 12,341 | 33 |

The old Phase B value of 3,246 was a pre-closeout accounting snapshot. The
final commit adds exactly 33 omitted changed lines: 32 in
`../../tasks/TASK-015B-red-cap-motion-semantic-events.md` and one package
script line in `../../pipelines/character-asset-intake/package.json`.
Excluding those two deltas reproduces 3,246 exactly. There are no renames,
later Phase B document edits, or binary-line conversions.

The original 96-file artifact roll-up included `PLANS.md` but omitted these
seven necessary modifications to existing cross-cutting files:

| File | Phase | Why omitted and why required |
| --- | --- | --- |
| `../../CHANGELOG.md` | Phase 0 | Status surface omitted from artifact roll-up; required to record the Program gate. |
| `../index.md` | Phase 0 | Index surface omitted; required to expose the Program acceptance/report. |
| `../releases/v0.4.0-data-driven-vfx-authoring-baseline.md` | Phase 0 | Existing release boundary omitted; required to keep Red Cap deferred from v0.4.0. |
| `../../tasks/RELEASE-0.4.0-data-driven-vfx-authoring-baseline.md` | Phase 0 | Existing release task omitted; required for the same non-scope boundary. |
| `../../cocos/projects/character-rig-builder-mvp/test/ci-typecheck-config.test.mjs` | Phase A | Shared CI file omitted; required for Creator class/typecheck inclusion. |
| `../../pipelines/character-asset-intake/package.json` | Phase A | Shared command registry omitted; required for deterministic A/B/C generator entry points. |
| `../../pipelines/character-semantic-events/test/character-semantic-events.test.ts` | Phase B | Shared regression file omitted; required to prove reuse without public semantic changes. |

All seven belong to approved Program work. None is duplicate, temporary,
cached, incorrectly generated, or evidence. The one-time reconciliation
closed Phase C at exactly 103 files and fewer than 24,000 changed lines. The
subsequent project-owner-authorized external-review remediation has a hard
ceiling of 112 feature files and 16,000 changed lines and is limited to
actual runtime evidence, media-derived analysis, regression coverage,
generated closure, and corrections to existing documents.

### Complete 103-file classification

Codes keep the audit table compact:

- Phases: `0S` Phase 0 specification, `0I` Phase 0 intake, `A`, `B`, `C`.
- Ownership: `H` handwritten, `G` deterministic generated,
  `C` Creator-owned, `O` project-owner-supplied.
- Categories and required scope mapping: `P` planning/task/acceptance/report
  required for Program governance; `S` canonical source/provenance/rights
  required by Phase 0 authority; `I` engine-neutral fixture/contract required
  by A/B/C portability; `R` Cocos runtime/source required by Creator
  acceptance; `M` Creator Scene/`.meta` required by lifecycle and class/asset
  identity; `G` generator/generated mirror required by deterministic closure;
  `N` generated PNG/runtime asset required by visual reconstruction or
  runtime; `T` test/CI typing required by contract and closure gates.
- Format/media: `T0` text and not tracked media; `B0` binary PNG and not
  tracked media. There are no evidence/media or out-of-scope rows.

| Path | Phase | Owner | Category | Format/media |
| --- | --- | --- | --- | --- |
| `CHANGELOG.md` | 0S | H | P | T0 |
| `PLANS.md` | 0S | H | P | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase/program015-production-showcase.ts` | C | H | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase/program015-production-showcase.ts.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase/program015-showcase-data.ts` | C | G | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase/program015-showcase-data.ts.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-motion-data.ts` | B | G | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-motion-data.ts.meta` | B | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-motion-harness.ts` | B | H | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-motion-harness.ts.meta` | B | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-static-data.ts` | A | G | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-static-data.ts.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-static-harness.ts` | A | H | R | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production/red-cap-production-static-harness.ts.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-motion-harness.scene` | B | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-motion-harness.scene.meta` | B | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-showcase.scene` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-showcase.scene.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-static-harness.scene` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/red-cap-production-static-harness.scene.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/production-lite-character.png` | C | G | N | B0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/production-lite-character.png.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/red-cap-character.png` | C | G | N | B0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/red-cap-character.png.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/training-ground-background.png` | C | G | N | B0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/training-ground-background.png.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/vfx-soft-mask.png` | C | G | N | B0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase/vfx-soft-mask.png.meta` | C | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/red-cap-production-v1.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/red-cap-production-v1/parts-atlas.png` | A | G | N | B0 |
| `cocos/projects/character-rig-builder-mvp/assets/resources/red-cap-production-v1/parts-atlas.png.meta` | A | C | M | T0 |
| `cocos/projects/character-rig-builder-mvp/test/ci-typecheck-config.test.mjs` | A | H | T | T0 |
| `docs/acceptance/PROGRAM-015-red-cap-production-vertical-slice.md` | 0S | H | P | T0 |
| `docs/adr/ADR-0018-production-slice-source-readiness.md` | 0S | H | P | T0 |
| `docs/index.md` | 0S | H | P | T0 |
| `docs/releases/v0.4.0-data-driven-vfx-authoring-baseline.md` | 0S | H | P | T0 |
| `docs/reports/PROGRAM-015-phase-0-source-readiness.md` | 0S | H | P | T0 |
| `docs/reports/PROGRAM-015-phase-c-showcase.md` | C | H | P | T0 |
| `examples/red-cap-production-v1/README.md` | 0I | H | I | T0 |
| `examples/red-cap-production-v1/animations/idle.json` | B | G | I | T0 |
| `examples/red-cap-production-v1/animations/rest.json` | B | G | I | T0 |
| `examples/red-cap-production-v1/animations/walk.json` | B | G | I | T0 |
| `examples/red-cap-production-v1/animations/wave.json` | B | G | I | T0 |
| `examples/red-cap-production-v1/atlas/parts-atlas.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/character-rig.json` | A | H | I | T0 |
| `examples/red-cap-production-v1/parts/bandana.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/cap.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/foot-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/foot-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/forearm-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/forearm-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/hair.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/hand-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/hand-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/head.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/pelvis.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/pouch.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/shin-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/shin-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/thigh-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/thigh-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/torso.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/upper-arm-left.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/parts/upper-arm-right.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/provenance/generated-manifest.json` | A | G | G | T0 |
| `examples/red-cap-production-v1/provenance/part-ownership.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/reference/motion-quality-report.json` | B | G | G | T0 |
| `examples/red-cap-production-v1/reference/reconstructed-neutral.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/reference/reconstruction-report.json` | A | G | G | T0 |
| `examples/red-cap-production-v1/reference/static-stress-positive.png` | A | G | N | B0 |
| `examples/red-cap-production-v1/reference/static-stress-report.json` | A | G | G | T0 |
| `examples/red-cap-production-v1/rig-layout.json` | A | H | I | T0 |
| `examples/red-cap-production-v1/semantic-events.json` | B | G | I | T0 |
| `examples/red-cap-production-v1/showcase-generation-report.json` | C | G | G | T0 |
| `examples/red-cap-production-v1/showcase-layout.json` | 0I | H | S | T0 |
| `examples/red-cap-production-v1/showcase-sequence.json` | C | G | I | T0 |
| `examples/red-cap-production-v1/showcase-vfx-resource-registry.json` | C | H | I | T0 |
| `examples/red-cap-production-v1/showcase-vfx.json` | C | H | I | T0 |
| `examples/red-cap-production-v1/showcase.render-plan.json` | C | G | G | T0 |
| `examples/red-cap-production-v1/source-authority-map.json` | 0I | H | S | T0 |
| `examples/red-cap-production-v1/source/README.md` | 0I | H | S | T0 |
| `examples/red-cap-production-v1/source/provenance.json` | 0I | H | S | T0 |
| `examples/red-cap-production-v1/source/red-cap-character-master.png` | 0I | O | S | B0 |
| `examples/red-cap-production-v1/source/red-cap-joint-parts-supplement.png` | 0I | O | S | B0 |
| `examples/red-cap-production-v1/source/red-cap-parts-sheet.png` | 0I | O | S | B0 |
| `examples/red-cap-production-v1/source/rights-assertion.md` | 0I | O | S | T0 |
| `examples/red-cap-production-v1/source/style-board.png` | 0I | O | S | B0 |
| `examples/red-cap-production-v1/source/training-ground-background.png` | 0I | O | S | B0 |
| `pipelines/character-asset-intake/package.json` | A | H | G | T0 |
| `pipelines/character-asset-intake/scripts/generate-red-cap-production-motion.mjs` | B | H | G | T0 |
| `pipelines/character-asset-intake/scripts/generate-red-cap-production-v1.mjs` | A | H | G | T0 |
| `pipelines/character-asset-intake/scripts/generate-red-cap-showcase.mjs` | C | H | G | T0 |
| `pipelines/character-asset-intake/scripts/verify-red-cap-production-static.mjs` | A | H | G | T0 |
| `pipelines/character-asset-intake/test/red-cap-production-v1.test.ts` | A | H | T | T0 |
| `pipelines/character-semantic-events/test/character-semantic-events.test.ts` | B | H | T | T0 |
| `tasks/PROGRAM-015-red-cap-production-vertical-slice.md` | 0S | H | P | T0 |
| `tasks/RELEASE-0.4.0-data-driven-vfx-authoring-baseline.md` | 0S | H | P | T0 |
| `tasks/TASK-015A-red-cap-static-production-character.md` | 0S | H | P | T0 |
| `tasks/TASK-015B-red-cap-motion-semantic-events.md` | 0S | H | P | T0 |
| `tasks/TASK-015C-two-character-production-showcase.md` | 0S | H | P | T0 |

Category totals are: P 13, S 10, I 11, R 6, M 21, G 11, N 28, and T 3,
for exactly 103. Evidence/media and out-of-scope are both zero. The five
canonical source PNG hashes, provenance SHA
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`,
and rights-assertion SHA
`335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`
are byte-identical from Phase 0 through Phase C. No public D1/D2/D3 or
Character Semantic Events source file changed; the only semantic-events
change is regression coverage. No Creator temp/cache, `node_modules`,
feature evidence payload, tracked MP4, TASK-015D, TASK-014D4, Unity, Godot,
or Windows implementation is present.

## Final infrastructure sync and R3 closure

- Independent maintenance PR: `#21`
- Maintenance commit: `75ca9ab121405a3780e1832c7b6f6bc02b6fb9d0`
- Squash/main commit: `46d4523194f8ba064bd73db7b1c797e77cfa7745`
- Append-only Program merge:
  `f1f0adfe6fd88a0e2c2f552be1870c0736dc1b8c`
- Pre-documentation-closeout Program scope against new main: 103 files,
  12,567 additions, 32 deletions, 12,599 changed lines.

The PR and exact squash-SHA push CI both passed. PR comments, submitted
reviews, and unresolved review threads were zero; the ready PR was mergeable.
The remote maintenance branch was deleted after merge, while the local fix
branch and PROGRAM-015 backup remain.

Final R3 results:

- Focused PROGRAM-015: 17/17.
- Character asset intake: 74/74.
- Character Semantic Events: 25/25.
- Cocos project: 9/9.
- Creator extension: 293/293.
- Complete workspace: 507/507.
- Root TypeScript/typecheck and Cocos clean-CI: PASS.
- Working-copy `CI=true pnpm verify`: PASS.
- Fresh tracked-files-only frozen install plus verify: PASS.
- Synchronized Sharp atomic/concurrency regression: PASS in working and
  tracked-only executions.
- Deterministic Red Cap static, motion, showcase, full-loadout, generated
  mirror, Scene/meta/class identity, Markdown-link, whitespace, temp-cleanup,
  media, protected-ref, and post-verify clean/content closure: PASS.

Rights and Program provenance remain byte-identical at
`335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`
and
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
No implementation changed during final R3.

## Replacement evidence acceptance

The replacement publication is accepted locally only when all of the
following are captured from one Creator 3.8.8 Web Preview session identity:

- actual part-atlas Rest/Idle/Walk/Wave motion with alternating foot contact,
  continuous shoulder/elbow/wrist/hip/knee/ankle motion, and joint-following
  targets;
- Pause stability, Resume progress without reinitialization, two consecutive
  rebuilds, post-rebuild animation/VFX, Exact Reset, and a five-second clean
  hold;
- visible and diagnostic proof of one runtime root, one input handler, zero
  duplicate/leaked/stale renderers, and zero cleanup errors;
- final MP4 H.264 High, 1280×720, 30 fps, yuv420p, complete decode, and no
  pointer or editor overlay over acceptance content; and
- deterministic RGB24 framebuffer analysis rerun byte-identically against a
  GitHub-downloaded copy of the exact evidence-commit video.

The runtime HUD, diagnostics JSON, Creator/Preview record, analysis JSON, and
manifest must bind the same exact feature SHA, Scene/runtime ID, session ID,
viewport, and Creator version. The external review status was promoted only
by the independent review recorded below.

## External review acceptance closeout

- Reviewed feature:
  `2bd0968835dcf25239ea705fe153d8eb68a91336`.
- Reviewed evidence:
  `c974011d4f13d95c9970144cbfc7fa2ad40b9595`.
- Evidence acceptance:
  `6011d48915a2097153fb6ee63303a781a41557d6`.
- Replacement Phase B payload:
  `791be5581e89f48822f5dba85b57d967e74c75b6`.

The replacement Phase B video contains two independent `KeyB` inputs and
synchronized video/HUD/runtime evidence for
`1/0/0 → 2/1/1 → 3/2/2`. After the second Rebuild, Rest, Idle, jointed Walk,
joint-following Wave, Pause, Resume, Exact Reset, root/input `1/1`, zero
duplicate/leak/stale/cleanup failures, and a five-second clean hold pass.
Sixteen Walk samples contain 9/7 left/right planted samples with 0/0 sliding;
the Wave target displacement is `52.94557` px. Phase B analyzer output
reproduces byte-identically from the GitHub-downloaded payload.

The downloaded Phase C MP4 SHA-256
`f4842ced0f428cade5fb2917fc6e6867f16d8a990d56df023f66126c491a130c`
reproduces Dust `7,645`, Trail `4,454`, Aura `25,072`, Pause `0`, and Resume
`25,612` pixels. Two runs produce byte-identical analysis SHA-256
`8d69f220d1ccb7cb1dc5abec1e37a9ca8e5453c6b14ffdcdb5d831c23d608744`;
a controlled decoded-frame perturbation changes both the frame hash and the
derived pixel result.

The final visible-pixel authority remains character-master-only. The parts
sheet remains identification/structure/boundary/manual-audit-only, and the
supplement remains limited to declared hidden joint connectors. Rights and
provenance bytes remain unchanged at
`335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`
and
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
The historical synthetic/non-media-derived and missing-second-Rebuild
evidence statuses remain preserved. External code, runtime, Creator, visual,
spatial, control, and evidence review PASS.

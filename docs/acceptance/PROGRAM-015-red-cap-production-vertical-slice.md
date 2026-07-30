# PROGRAM-015 Red Cap Production Vertical Slice Acceptance

## Current decision

Phase 0 source readiness and TASK-015A/B/C are accepted on 2026-07-30.
PROGRAM-015 is complete locally.

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
- Parts sheet: 19 independent alpha components; 19/19 required parts resolve
  through the authority map.
- Joint supplement: accepted only for declared hidden connectors; ambiguous
  generic connector and duplicate combined pelvis are rejected.
- Background/style: 1672×941 RGB inputs with a locked 1664×936 crop,
  10/13 scale, 1280×720 output, ground line, safe area and framebuffer ROIs.
- Working tree contained no untracked/staged intake file at promotion.

The accepted machine-readable inputs are
`../../examples/red-cap-production-v1/source-authority-map.json` and
`../../examples/red-cap-production-v1/showcase-layout.json`.

## Phase C accepted evidence

- Independent Creator-owned Scene:
  `../../cocos/projects/character-rig-builder-mvp/assets/red-cap-production-showcase.scene`.
- Four deterministic PNG resources: licensed background, accepted
  production-lite composite, accepted Red Cap composite, and procedural VFX
  soft mask.
- D1 authoring produces a byte-stable Render Plan consumed by the existing D2
  Creator host/runtime; no D1/D2 public source changed.
- Locked changed-pixel gates: Dust 376, Trail 4,077, Aura 16,492.
- Pause stability: zero changed pixels; Resume active ROI: 40,125 changed
  pixels.
- Creator 3.8.8 restart, sequence, Transform Stress, debug, two rebuilds,
  post-rebuild effects, Exact Reset, final hold, and clean Preview console:
  PASS.
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
cached, incorrectly generated, or evidence. The one-time exception closes
the feature at exactly 103 files and fewer than 24,000 changed lines. It is
not capacity for a 104th file.

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

# PROGRAM-015: Red Cap Production Vertical Slice

- Status: Accepted by external code/runtime/Creator/visual review and
  integrated through PR #22
- Date: 2026-07-30
- Branch: `feat/task-015-red-cap-production-vertical-slice`
- Exact baseline: `68444551b9b160a2455a97a2d8bf611aea608c6e`
- Creator baseline: Cocos Creator 3.8.8 on macOS
- Child tasks: TASK-015A, TASK-015B, TASK-015C

## Objective

Advance the accepted prerelease framework into one watchable, reproducible,
and Creator-verifiable production vertical slice:

```text
Red Cap static production character
→ Red Cap motion and semantic events
→ production-lite + Red Cap showcase
→ scene-specific production-intent VFX
→ deterministic build and Creator acceptance
```

## Phase 0 authority

No implementation begins until every mandatory row in
`docs/reports/PROGRAM-015-phase-0-source-readiness.md` passes. Source
readiness is fail-closed: an absent provenance/license record is not inferred
from repository history, and a missing production background cannot be
replaced with a generated, procedural, flat-color, or acceptance-only image.

## Locked identities

The following identities apply if Phase 0 is resumed with accepted inputs:

| Surface | Identity |
| --- | --- |
| Program | `program-015-red-cap-production-vertical-slice` |
| Red Cap fixture | `red-cap-production-v1` |
| Red Cap root | `CHR_red_cap_production_v1` |
| Static harness Scene | `red-cap-production-static-harness.scene` |
| Motion Scene | `red-cap-production-motion-harness.scene` |
| Showcase Scene | `red-cap-production-showcase.scene` |
| Static component | `RedCapProductionStaticHarness` |
| Motion component | `RedCapProductionMotionHarness` |
| Showcase component | `RedCapProductionShowcase` |
| Red Cap adapter | `red-cap-production-v1` |
| production-lite namespace | `showcase.production-lite` |
| Red Cap namespace | `showcase.red-cap` |
| VFX authoring document | `program-015-showcase-vfx` |
| Evidence branch | `evidence/task-015` |

These are neutral Program-owned identities. Existing recovery and historical
Red Cap Scenes remain provenance-only and cannot silently become canonical.

## Locked Red Cap taxonomy and authority

The locked 19-part taxonomy is:

`pelvis`, `torso`, `head`, `hair`, `cap`, `bandana`, `pouch`,
`upper-arm-left`, `upper-arm-right`, `forearm-left`, `forearm-right`,
`hand-left`, `hand-right`, `thigh-left`, `thigh-right`, `shin-left`,
`shin-right`, `foot-left`, and `foot-right`.

Source rectangles, pivots, hierarchy, draw order, sockets, and neutral fitting
must be machine-readable and versioned. The accepted authority is
`examples/red-cap-production-v1/source-authority-map.json`; approved source
bytes and project-owner-reviewed provenance live under that fixture's
`source/` directory.

Every nontransparent canonical pixel must have exactly one visible semantic
owner. The character master is the sole final visible-pixel authority. The
parts sheet is limited to part identification, structural mapping, boundary
checks, and manual audit; it is not a visible-pixel authority. The joint
supplement may supply only the declared hidden shoulder, elbow, wrist, hip,
knee, and ankle connector pixels. Hidden overlap pixels must remain directly
traceable to that approved source rectangle; nearest-color texture synthesis
is not accepted.

## Locked motion and controls

The bounded clip set is `Rest`, `Idle`, `Walk`, and `Wave`. Wave is selected
over Hit because the source already has a free left-hand chain and the
accepted semantic surface has a hand-trail target. No IK, blending, root
motion, retargeting, or state-machine expansion is authorized.

Controls are:

- `1` Rest, `2` Idle, `3` Walk, `4` Wave;
- `Space` Pause/Resume;
- `5` Dust one-shot, `6` Trail toggle, `7` Aura toggle;
- `C` clean all active VFX;
- `T` Transform Stress;
- `B` deterministic rebuild;
- `R` Exact Reset; and
- `D` debug projection.

Exact Reset restores Rest, time `0`, `STOPPED`, default loadout, no active
VFX, Stress/Debug off, one runtime root, and one input owner. Rebuild must
produce the same final state on two consecutive invocations.

## Locked semantic and VFX intent

The Program reuses Character Semantic Events without public changes:

- alternating left/right footstep one-shots during Walk;
- left-hand trail during Wave;
- torso aura during the showcase sequence; and
- scene-specific dust, trail, and aura authored through the existing D1
  schema and compiled for the existing D2 runtime.

Target namespaces are disjoint. No cue may resolve a target by display name,
resource filename, substring, or cross-character fallback.

## Showcase composition lock

The delivery viewport is 1280×720 at 30 fps with a 64-pixel safe inset.
Production-lite occupies the left third and Red Cap the right third; their
neutral silhouette AABBs must not overlap. Background, midground,
production-lite, Red Cap, VFX, debug, and HUD use centralized nonoverlapping
sorting bands.

The background crop, scale, style board, camera composition, ground line,
character bounds, sorting bands, safe area and framebuffer ROIs are locked in
`examples/red-cap-production-v1/showcase-layout.json`.

## Lifecycle fault points

Each Program component must expose default-off, test-only failures before and
after resource completion, root publication, input publication, target
publication, renderer creation, Sorting2D attachment, rebuild detachment, and
dispose finalization. A failure preserves the primary error, reports cleanup
errors separately, retains failed compensation ownership, and permits retry
only after complete compensation.

## Visual oracles locked before final viewing

All ratios use decoded RGBA or RGB24 pixels at 1280×720:

| Oracle | Threshold |
| --- | --- |
| Neutral canonical silhouette | IoU exactly `1.0` |
| Neutral visible RGBA mismatch | `0` pixels above channel delta `2` |
| Pixel ownership | all visible pixels assigned once; duplicates `0` |
| Face/cap/hair coverage | each authored ROI has at least 95% of its neutral reference alpha |
| Joint seam exposure | no transparent 2-pixel crossing through a pivot-centered 12×12 ROI |
| Foot contact | sole-to-ground vertical error at most 2 px on contact frames |
| Foot sliding | at most 3 px over each locked contact interval |
| Hand target | socket error at most 2 px |
| Character separation | at least 48 px between transformed silhouette AABBs |
| Safe area | all character and required VFX pixels inside the 64 px inset |
| Dust visibility | at least 120 changed pixels in its locked ROI |
| Trail visibility | at least 160 changed pixels in its locked ROI |
| Aura visibility | at least 240 changed pixels in its locked ROI |
| Pause stability | identical decoded frame hash across 15 frames |
| Resume delta | at least 80 changed pixels within the active motion/VFX ROI |
| Post-rebuild visibility | both silhouettes present and each required effect meets its minimum |
| Exact Reset | byte-identical to the locked clean Reset reference |
| Final beauty frame | both silhouettes, background, and required scene VFX satisfy all prior oracles |

Final ROI coordinates cannot be locked until the licensed background and
style board define the camera composition. Thresholds cannot be relaxed after
the first final-frame inspection.

## Evidence storyboard

- Phase A: source fingerprint, parts contact sheet, neutral reconstruction,
  static ROI report.
- Phase B: Rest/Idle/Walk/Wave contact video, key-frame ROIs, semantic timing
  report.
- Phase C: final showcase video, beauty frames, framebuffer analysis,
  Creator lifecycle/console manifest.
- One manifest binds every artifact to the specification, A, B, C, and final
  commit SHAs.

Evidence is 1280×720, 30 fps, H.264 High, yuv420p. Feature branches track zero
MP4 files.

## Budgets and final reconciliation

- Original aggregate: at most 96 changed files and 24,000 changed lines.
- One-time reconciliation: Phase C closed at exactly 103 feature files and
  fewer than 24,000 changed lines.
- External-review remediation hard ceiling: at most 112 feature files and
  16,000 changed lines. It is limited to actual jointed runtime evidence,
  MP4-derived analysis, regression coverage, generated closure, and
  corrections to existing documents; it is not follow-on feature capacity.
- Phase 0 resumed: 20 files and 5,000 changed lines, including exactly 5
  approved source PNGs.
- TASK-015A: 45 files, 8,000 lines, 38 touched PNGs, 2 Scene/`.meta` pairs.
- TASK-015B: 24 files, 6,000 lines, no new PNG, 1 modified Scene/`.meta` pair.
- TASK-015C: 35 files, 9,000 lines, 4 new PNG resources, 1 Scene/`.meta` pair.
- Evidence branch: 3 MP4, 12 PNG, 8 JSON/script files.

The final read-only audit from exact `main`
`68444551b9b160a2455a97a2d8bf611aea608c6e` through Phase C
`25d506983d213449559f84587c5b19bf8ceef6b9` records 103 distinct files,
12,323 additions, 18 deletions, and 12,341 changed lines. The seven-file
exception covers required pre-existing cross-cutting files omitted from the
original artifact roll-up: four Phase 0 status/index/release-isolation
surfaces, two Phase A CI/command-registration surfaces, and one Phase B
semantic-event regression surface. No file was removed, merged, renamed, or
regenerated to meet the budget.

Phase B is 21 files, 3,269 additions, 10 deletions, and 3,279 changed lines.
The former 3,246-line record excluded exactly the 32-line TASK-015B closeout
delta and the one-line package-script registration from its pre-closeout
snapshot. It was not caused by rename handling, a later documentation change,
or binary accounting.

The full 103-file classification in
`../docs/acceptance/PROGRAM-015-red-cap-production-vertical-slice.md` confirms
that every file maps to Phase 0/A/B/C authority, generation, runtime,
Creator, validation, or documentation scope. This is scope/accounting
reconciliation only; Phase 0/A/B/C history and implementation bytes remain
unchanged.

## Phase 0 closeout

The replacement ImageGen source pack is project-owner approved for commercial
use, modification, public repository inclusion and redistribution. The final
rights assertion is bound to provenance SHA
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
All governed hashes and integrity checks pass.

The source-authority map resolves 19/19 required parts, assigns master-only
neutral visible authority, records sheet/supplement conflicts, and rejects
ambiguous or duplicate components. The background/style inputs support the
predeclared 1280×720 framebuffer oracle. Phase 0 is accepted. TASK-015A
passed its deterministic, contract, Creator lifecycle, spatial, visual, stress,
fault, rebuild, Reset, and console gates in commit `9d1627b`; TASK-015B may
proceed. TASK-015B subsequently passed its four-clip 60 Hz, loop, planted-foot,
socket, semantic lifecycle, Creator playback, pause/resume, two-rebuild,
post-rebuild, stress/debug, Exact Reset, nine-point fault, clean-console, and
full-workspace gates in commit `70e0ba3`; TASK-015C may proceed. TASK-015C
subsequently passed deterministic source/resource closure, independent
Scene/meta identity, two-character safe composition, namespace isolation,
D1/D2 reuse, locked Dust/Trail/Aura framebuffer thresholds, Pause/Resume,
Stress/Debug, two rebuilds, post-rebuild effects, Exact Reset, restart, final
hold, and clean-console gates. PROGRAM-015 A/B/C implementation is accepted,
and the replacement evidence has passed external review as recorded below.

## Infrastructure sync and final R3

The independent Sharp PNG atomic-publication maintenance PR was squash-merged
to `main` as `46d4523194f8ba064bd73db7b1c797e77cfa7745`. PROGRAM-015 incorporated
that exact main commit with append-only merge
`f1f0adfe6fd88a0e2c2f552be1870c0736dc1b8c`; no Phase 0/A/B/C commit was
rewritten. `PLANS.md` was the only merge conflict, and its resolution retains
the Program record and the completed maintenance record.

Relative to the new main, the feature remained exactly 103 files and 12,599
changed lines before this documentation closeout. Final R3 passed with 17
focused assertions, asset-intake 74/74, Character Semantic Events 25/25,
Cocos project 9/9, Creator extension 293/293, and complete workspace 507/507.
Working-copy and frozen tracked-files-only verification, typecheck, clean-CI,
deterministic generation, synchronized generator concurrency, Scene/meta/class
identity, Markdown links, diff checks, and clean/content closure passed.

The project-owner rights/provenance bytes remain unchanged. Feature MP4,
evidence payload, Creator temp/cache, `node_modules`, TASK-015D, TASK-014D4,
Unity, Godot, and Windows scope remain absent.

## External-review remediation boundary

The original Phase B/C evidence publication is preserved byte-for-byte and
classified
`failed-external-review-synthetic-animation-and-non-media-derived-metrics`.
Its flat-composite animation and non-media-derived counts do not prove the
Creator runtime or published video.

Replacement evidence must come from the actual Creator 3.8.8 Web Preview
Scene. Red Cap is assembled from the accepted part atlas and animated with
the existing rig, Rest/Idle/Walk/Wave clips, per-joint transforms, and
joint-attached sockets. The visible HUD, runtime diagnostics, Creator/Preview
record, framebuffer analysis, and evidence manifest share one exact
feature/Scene/runtime/session/viewport/Creator identity. Visual measurements
are computed only from RGB24 frames decoded from the final MP4 with recorded
frame numbers, timestamps, frame hashes, half-open ROIs, channel threshold,
video SHA, analyzer SHA, and FFmpeg version. External review, rather than a
local gate, promoted the reviewed evidence to
`passed-external-code-and-visual-review`.

## External review acceptance

External review independently downloaded and inspected feature
`2bd0968835dcf25239ea705fe153d8eb68a91336` and evidence
`c974011d4f13d95c9970144cbfc7fa2ad40b9595`. The Phase B replacement payload
commit `791be5581e89f48822f5dba85b57d967e74c75b6` contains two distinct `KeyB`
inputs with `REBUILD_1_READY` and `REBUILD_2_READY`, producing
`1/0/0 → 2/1/1 → 3/2/2`. Rest, Idle, jointed Walk, joint-following Wave,
Pause, Resume, Exact Reset, root/input `1/1`, zero duplicate/leak/stale/
cleanup failures, and a five-second clean hold passed visual and diagnostic
review.

The Phase C downloaded MP4 SHA-256
`f4842ced0f428cade5fb2917fc6e6867f16d8a990d56df023f66126c491a130c`
reproduced Dust `7,645`, Trail `4,454`, Aura `25,072`, Pause `0`, and Resume
`25,612` pixels in two byte-identical analyzer runs. Controlled decoded-frame
perturbation changed the frame hash and derived count, confirming media-derived
measurement.

The source-authority rule remains master-only for final visible pixels,
parts-sheet audit-only, and joint-supplement hidden-connectors-only. Rights and
provenance remain byte-identical at
`335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`
and
`55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
Evidence acceptance commit
`6011d48915a2097153fb6ee63303a781a41557d6` records external
code/runtime/Creator/visual/spatial/control/evidence review PASS and preserves
all superseded failure statuses. PROGRAM-015 was published through PR #22 and
squash-merged to `main` at
`555f0b8e34affff0942ea0785dec5ce041440ae2`. The feature branch tracked zero
MP4 files, and no accepted evidence payload entered `main`.

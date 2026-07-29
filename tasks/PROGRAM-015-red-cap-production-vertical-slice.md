# PROGRAM-015: Red Cap Production Vertical Slice

- Status: `HARD_STOP_SOURCE_READINESS`
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

The initial 19-part taxonomy is:

`briefcase`, `cap`, `foot-left`, `foot-right`, `forearm-left`,
`forearm-right`, `hair`, `hand-left`, `hand-right`, `head`, `pelvis`,
`shin-left`, `shin-right`, `sunglasses`, `thigh-left`, `thigh-right`,
`torso`, `upper-arm-left`, and `upper-arm-right`.

Source rectangles, pivots, hierarchy, draw order, sockets, and neutral fitting
must be machine-readable and versioned. The current candidates are
`source-annotation.json`, `rig-layout.json`,
`canonical-part-segmentation.json`, and `asset-provenance.json` under
`examples/red-cap-target-remade/`. They are not promoted to production
authority while source readiness is blocked.

Every nontransparent canonical pixel must have exactly one semantic owner.
Hidden overlap pixels require traceable layered source pixels; nearest-color
texture synthesis is not accepted as production source.

## Locked motion and controls

The bounded clip set is `Rest`, `Idle`, `Walk`, and `Wave`. Wave is selected
over Hit because the source already has a free left-hand chain and the
accepted semantic surface has a hand-trail target. No IK, blending, root
motion, retargeting, or state-machine expansion is authorized.

Controls are:

- `1` Rest, `2` Idle, `3` Walk, `4` Wave;
- `Space` Pause/Resume;
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

The background asset, style board, exact camera framing, final character
scales, and color treatment are intentionally **not locked**: no qualifying
background/style input exists. Inventing those values would violate the
Phase 0 source gate.

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

## Budgets

- Aggregate: at most 96 changed files and 24,000 changed lines.
- Phase 0: 12 Markdown files and 3,500 changed lines.
- TASK-015A: 45 files, 8,000 lines, 38 touched PNGs, 2 Scene/`.meta` pairs.
- TASK-015B: 24 files, 6,000 lines, no new PNG, 1 modified Scene/`.meta` pair.
- TASK-015C: 35 files, 9,000 lines, 4 new PNG resources, 1 Scene/`.meta` pair.
- Evidence branch: 3 MP4, 12 PNG, 8 JSON/script files.

The aggregate ceiling is authoritative. Exceeding 100 files or 25,000 lines
requires an explicit split decision before coding.

## Current hard stop

Phase 0 found two independently sufficient blockers:

1. The Red Cap PNGs have no repository-backed author/origin/license record,
   and current hidden joint extensions synthesize texture for regions absent
   from the canonical flattened neutral image.
2. No qualified scene background or style board exists for TASK-015C.

No TASK-015A/B/C implementation, Creator acceptance, evidence production, or
checkpoint commit may proceed. Resumption requires user-supplied or
repository-added source files with explicit provenance/license and a
production background/style board, followed by a fresh Phase 0 audit.

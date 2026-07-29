# PROGRAM-015 Phase 0 Source-Readiness Report

- Audit date: 2026-07-30
- Baseline: `68444551b9b160a2455a97a2d8bf611aea608c6e`
- Result: `FAIL — PROGRAM HARD STOP`

## Red Cap fingerprint

| Input | SHA-256 | Dimensions/mode | Result |
| --- | --- | --- | --- |
| `reference/full_character.png` | `d2e1f2be09ecf606ad6987e55af39b40fd415ca98d71dbaa26f6b2d1d07b68d7` | 326×892, 8-bit RGBA PNG | decoded |
| `reference/character_sheet.png` | `84aca8e3252d4fd82b2c99d2d31dcf6d7102afa0b00f8a517a81be5c8a777d07` | 1448×1086, 8-bit RGBA PNG | decoded |
| `reference/reconstructed-neutral.png` | `2283c8dc8bd85eea5cf5f92bee1c3960701baf38a5f1087fa6a12cb6d8ff8c71` | 326×892, 8-bit RGBA PNG | decoded |

The canonical full-character image has 162,968 visible pixels on a
290,792-pixel canvas, alpha coverage 0.560428072. Existing extraction assigns
all 162,968 visible pixels to 19 nonempty semantic parts. Neutral silhouette
and visible RGBA mismatch are both zero.

## Readiness matrix

| Gate | Evidence | Result |
| --- | --- | --- |
| Decode and dimensions | PNG headers and existing deterministic audit | PASS |
| Alpha channel and coverage | RGBA; 162,968 visible pixels | PASS |
| Neutral visible-pixel ownership | 162,968 assigned once across 19 parts | PASS |
| Neutral reconstruction | silhouette mismatch 0; visible RGBA mismatch 0 | PASS |
| Part taxonomy | 19 IDs in segmentation/provenance/rig inputs | PASS |
| Rect/pivot/hierarchy/draw-order candidate | versioned annotation and rig layout present | PASS for legacy neutral candidate |
| Hidden/occluded body areas | flattened neutral source; covered joint pixels not directly observable | FAIL |
| Production overlap provenance | 31,593 ignored hidden texels synthesized by nearest-child-pixel copying | FAIL |
| Author/source provenance | no repository record identifies author or original source/tool | FAIL |
| License/production rights | no license identifier/text or production/republication permission | FAIL |
| Scene background | no qualified background input found | FAIL |
| Style board | no locked showcase style board found | FAIL |
| Camera/ROI lock | cannot finalize without background/style board | BLOCKED |

## Existing annotation/layout summary

The candidate taxonomy is:

`briefcase`, `cap`, `foot-left`, `foot-right`, `forearm-left`,
`forearm-right`, `hair`, `hand-left`, `hand-right`, `head`, `pelvis`,
`shin-left`, `shin-right`, `sunglasses`, `thigh-left`, `thigh-right`,
`torso`, `upper-arm-left`, and `upper-arm-right`.

Current machine-readable candidate authorities:

- `examples/red-cap-target-remade/canonical-part-segmentation.json`;
- `examples/red-cap-target-remade/source-annotation.json`;
- `examples/red-cap-target-remade/rig-layout.json`;
- `examples/red-cap-target-remade/asset-provenance.json`; and
- `examples/red-cap-target-remade/articulation-safety.json`.

They prove a deterministic legacy neutral reconstruction and bounded
acceptance stress. They do not establish copyright/license or reveal all
pixels hidden by the neutral composite.

## Root cause

This is missing source authority, not a runtime defect:

1. Repository history shows when the files were committed, not who created
   them, which source/tool produced them, or which license permits production
   and redistribution.
2. The current animation-safe sprites fill occluded joint regions using a
   deterministic nearest-opaque-texel algorithm. That is a generated
   approximation, not traceable layered source art.
3. TASK-015C requires a locked production background and style board, but the
   repository has neither.

## Required inputs to resume

- A provenance record naming the Red Cap author/source/tool and SHA-256-bound
  license or explicit grant covering production use and redistribution.
- Layered or otherwise directly traceable source pixels for shoulders,
  elbows, wrists, hips, knees, and ankles, sufficient for the locked Walk and
  Wave ranges without texture synthesis.
- One production-quality 1280×720-or-larger scene background with SHA-256,
  author/source, license/grant, and a style board defining camera, palette,
  foreground/midground bands, and character placement.

After those inputs are tracked, rerun Phase 0 and lock exact source
rectangles, final pivots, camera coordinates, framebuffer ROIs, and evidence
frames before viewing a final composition.

# TASK-004.4: Canonical Art Asset Gate

## Status

`BLOCKED_BY_INVALID_ART_ASSETS` (2026-07-23)

## Goal

Block rig acceptance unless all neutral-pose visible pixels are demonstrably
derived from the canonical transparent full-body character.

## Acceptance criteria

- The canonical reference must exist, decode as a transparent PNG, and have
  visible pixels.
- Every current part receives a deterministic pixel-provenance result.
- A provenance declaration may ignore only explicit hidden extensions that are
  completely covered by canonical visible pixels in the neutral composite.
- The flat composite uses only source-canvas rectangles and canonical draw
  order; hierarchy and Cocos are not involved.
- `flat-composite.png`, `diff.png`, and machine-readable mismatch statistics
  are produced.
- Alpha silhouette mismatch is zero outside declared hidden extensions.
- Visible RGBA mismatch remains below the documented small tolerance.
- Stable diagnostics include:
  `CANONICAL_REFERENCE_MISSING`, `PART_PIXEL_PROVENANCE_MISMATCH`,
  `FLAT_COMPOSITE_SILHOUETTE_MISMATCH`,
  `FLAT_COMPOSITE_PIXEL_DIFF_EXCEEDED`, and
  `UNDECLARED_GENERATED_VISIBLE_REGION`.
- Tests cover valid direct extraction, missing reference, visible generated
  pixels, hidden-extension coverage, silhouette failure, and pixel-diff
  failure.
- No rig-builder, Cocos scene, or animation behavior is modified.

## Verification

```bash
CI=true pnpm verify
```

If current art is not directly derived from the canonical reference, close
this task as `BLOCKED_BY_INVALID_ART_ASSETS` and name every asset requiring
replacement.

## Result

- Canonical reference:
  `examples/red-cap-target-remade/reference/full_character.png`.
- The reference is a readable 326×892 transparent PNG with 162,968 visible
  pixels.
- The current flat composite differs at 137,097 canonical-visible pixels:
  84.125104%, against the 0.1% tolerance.
- The alpha silhouette differs at 35,065 pixels: 21.5165%, against the exact
  0% silhouette tolerance.
- All 19 current parts fail provenance:
  `briefcase`, `cap`, `foot-left`, `foot-right`, `forearm-left`,
  `forearm-right`, `hair`, `hand-left`, `hand-right`, `head`, `pelvis`,
  `shin-left`, `shin-right`, `sunglasses`, `thigh-left`, `thigh-right`,
  `torso`, `upper-arm-left`, and `upper-arm-right`.
- The pack is not salvageable as canonical visible rest-pose art. Every listed
  sprite must be recut from the canonical image. Newly painted pixels may be
  introduced only as declared joint-overlap extensions that remain fully
  covered in the neutral pose.
- Evidence:
  `examples/red-cap-target-remade/provenance/flat-composite.png`,
  `examples/red-cap-target-remade/provenance/diff.png`, and
  `examples/red-cap-target-remade/provenance/mismatch-statistics.json`.
- No rig builder, Cocos scene, or animation implementation was changed.

## Follow-up resolution

TASK-004.5 replaced all 19 rejected files with direct canonical cutouts. The
same unchanged gate now passes at 0% silhouette mismatch and 0% visible RGBA
mismatch. This does not retroactively validate the rejected pack or its old
screenshots.

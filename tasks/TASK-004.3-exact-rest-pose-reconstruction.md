# TASK-004.3: Exact Rest-Pose Reconstruction

> Canonical-art acceptance of this task's original pack was revoked by
> TASK-004.4 on 2026-07-23. The structural reconstruction work remains
> recorded, but its 0.8 silhouette-IoU result is not evidence of canonical
> pixel provenance. TASK-004.5 subsequently replaced that pack with direct
> canonical cutouts; the old screenshots remain rejected.

## Status

Complete

## Goal

Reconstruct Red Cap Remade from its complete source-canvas reference and
preserve those exact visual positions when the composite is expressed as a
hierarchy of separate Joint and Visual nodes.

## Required invariants

- `reference/full_character.png` is the visual source of truth.
- Source coordinates are pixels with top-left origin and positive Y down.
- Reference/Cocos coordinates are centered on the source canvas with positive
  Y up.
- `referenceScale` is applied once, after source-to-reference conversion.
- Joint local positions are child/parent annotated world-pivot differences.
- Visual local positions are reconstructed sprite-center/world-joint
  differences.
- `trimOffset` locates decoded trimmed pixels inside `originalRect`; it is not
  an additional arbitrary placement transform.
- Left/right always means the character's anatomical side.
- All calibration lives in source annotation and generated layout data.

## Verification

```bash
CI=true pnpm verify
```

Real acceptance requires two Cocos Creator 3.8.8 builds plus Scene, Game
Preview, hierarchy, and reference-comparison evidence.

## Result

- Added the backward-compatible `visualPlacementMode` contract and accepted
  ADR-0009.
- Recalibrated Red Cap Remade on the complete 326×892 source canvas and
  regenerated its Rig Layout.
- Added deterministic neutral reconstruction, comparison, and a failing `0.8`
  alpha-silhouette IoU threshold; the accepted result is `0.800928`.
- Derived Joint locals and Visual locals from the same source-canvas pivots and
  rectangle centers, with one Y flip and one scale application.
- Added stable source-canvas/trim metadata diagnostics and exact reconstruction
  tests.
- Completed two Cocos Creator 3.8.8 builds. The final run replaced the prior
  generated root safely and verified 19/19 SpriteFrames, sizes, hierarchy,
  RenderRoot2D/UI_3D, Sorting2D, and camera compatibility.
- `CI=true pnpm verify` passes all 101 tests.

Commit and push with:

```text
fix: reconstruct red cap rest pose from source canvas
```

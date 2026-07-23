# ADR-0009: Source-Canvas Rest-Pose Reconstruction

- Status: Accepted
- Date: 2026-07-23

## Context

The first real-art rig used decoded trimmed-image dimensions together with
separately authored hierarchical rest-pose deltas. Each input was valid, but
they did not describe one common assembled canvas. The resulting Cocos nodes
therefore had valid SpriteFrames and pivots while shoulders, knees, ankles,
headwear, and the briefcase were visibly disconnected.

## Decision

Rig Layout 1.0 gains an optional `visualPlacementMode`:

- `trimmed-pixels` is the backward-compatible default and retains the TASK-004
  trimmed-image formula.
- `source-canvas-rect` reconstructs a calibrated complete composite. In this
  mode `originalRect` is the part's assembled rectangle on `sourceCanvas`,
  `trimOffset` must be zero, and decoded pixels are resized to that rectangle.

For exact reconstruction:

```text
worldX = (sourceX - sourceCanvas.width / 2) * referenceScale
worldY = (sourceCanvas.height / 2 - sourceY) * referenceScale
jointLocal = childJointWorld - parentJointWorld
visualLocal = sourceRectCenterWorld - childJointWorld
visualSize = sourceRectSize * referenceScale
```

The same source coordinates drive Joint and Visual transforms. Scale is
applied once. Left/right labels are anatomical.

## Consequences

- Existing 1.0 layouts remain compatible because the new field is optional.
- Exact-mode metadata that leaves the source canvas or attempts to apply
  non-zero trim again fails with stable intake diagnostics.
- Calibration remains engine-neutral and reproducible; Scene Script receives a
  validated plan and adds no per-part correction offsets.
- A deterministic neutral composite can be compared before hierarchy or Cocos
  rendering is involved.

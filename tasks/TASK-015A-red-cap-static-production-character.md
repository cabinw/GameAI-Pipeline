# TASK-015A: Red Cap Static Production Character

- Status: In progress
- Parent: PROGRAM-015
- Budget: 45 files, 8,000 changed lines, 38 touched PNGs, 2
  Scene/`.meta` pairs, zero feature media

## Objective

Create a deterministic production Red Cap decomposition, exact neutral
reconstruction, fitted rigid hierarchy, overlap-safe sprites, and an
independent minimal Cocos Creator SpriteFrame harness.

## Acceptance criteria

- Licensed canonical source and layered hidden joint pixels pass source
  readiness.
- Every visible source pixel has exactly one owner and no generated visible
  pixel exists.
- Rect, original size, trim offset, anchor, pivot, UITransform, SpriteFrame
  subasset identity, global Sorting2D order, and Camera mask are verified by
  an independent harness.
- Neutral reconstruction has silhouette IoU `1.0`, zero visible RGBA mismatch
  above channel delta `2`, and passes all locked seam ROIs.
- Source-canvas reconstruction, hierarchy, pivots, draw order, joint overlap,
  generated closure, deterministic bytes, Scene/meta identity, and lifecycle
  fault matrix pass.
- Creator clean open, switch/reopen, second startup, all occlusions,
  Transform Stress, Exact Reset, disable/destroy, and clean console pass.

## Stop boundary

Do not compensate for missing source art with generated texture, scene-local
offsets, warning suppression, fallback resources, retries, or manual Scene
edits. Establish a failing regression oracle before each in-scope correction.

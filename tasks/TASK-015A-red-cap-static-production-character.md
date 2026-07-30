# TASK-015A: Red Cap Static Production Character

- Status: Accepted on 2026-07-30
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

## Accepted evidence

- Deterministic generation owns all 282,476 visible master pixels exactly
  once, reconstructs neutral at silhouette IoU `1.0`, and reports zero alpha
  or RGBA mismatch above channel delta `2`.
- The 19-part atlas, source-canvas hierarchy, pivots, anchors, draw order, and
  positive/negative 12-joint stress report pass byte-stable automated checks.
- Creator 3.8.8 imports and saves the neutral static Scene and its `.meta`,
  binds the generated atlas SpriteFrame subasset, and reaches
  `PROGRAM015_STATIC_READY` with 19 targets and 19 renderers.
- Clean open, switch/reopen, repeated startup, Transform Stress, Exact Reset,
  deterministic rebuild, and all nine injected lifecycle fault points pass.
  Cleanup-only failures report an empty primary error and recover to one
  visible runtime root with no unexpected Preview errors.

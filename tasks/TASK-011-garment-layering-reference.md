# TASK-011: Multi-Part Garment Layering Reference

## Status

Complete on 2026-07-24 and stopped for manual visual review. Working-copy and
tracked-files-only frozen verification both pass with 189 tests. The feature
branch is pushed without a pull request, and acceptance videos remain local
and untracked.

## Baseline and branch

- Baseline: `main` at `3544da47d31126c100551d95929ba1455d13a328`
- TASK-010 squash merge:
  `3544da47d31126c100551d95929ba1455d13a328`
- Work branch: `feat/task-011-garment-layering-reference`
- Protected branch: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

The protected branch must not be modified, merged, deleted, or pushed.

## Goal

Add a simplified deterministic multi-part casual jacket to the accepted
production-lite character and prove reusable contract-driven garment layering
across torso, shoulders, elbows, wrists, collars, and animated poses. This is
not an original Red Cap reconstruction.

## Required implementation

- Reuse the byte-identical TASK-009 body, TASK-010 attachment system, five
  existing clips, and existing hierarchy evaluator.
- Add generic wearable-set grouping and the slots `torso-back`, `torso-front`,
  `upper-arm-left/right`, `lower-arm-left/right`, `wrist-left/right`, and
  `collar-back/front`.
- Author jacket back/front, paired upper/lower sleeves, paired cuffs,
  collar back/front, and optional front trim as rigid transparent PNG parts.
- Keep per-part parent binding, local transform, anchor/pivot, global draw
  order, enabled state, seam constraints, and optional layer role in data.
- Validate stable rear sleeve, jacket back, torso, jacket front, front sleeve,
  collar back, head/hair, collar front, hand, and cuff ordering.
- Generate base, jacket-only, accessories-only, and combined Rest references
  and reconstruct all four exactly at zero tolerance.
- Define and validate authored overlap for torso/upper sleeve, upper/lower
  sleeve, lower sleeve/cuff, cuff/hand, collar/torso, and collar/neck/head over
  all supported animation ranges.
- Add a seamless Garment Stress clip with both shoulder rotations, elbow
  bends, one raised arm, one arm crossing the torso, torso lean, and controlled
  head tilt, within declared supported ranges.
- Add a dedicated Cocos Creator 3.8.x scene with the authored reference,
  assembled character, overlay, skeleton/debug view, garment slots, seams,
  bounds, pivots, layers, wearable state, and all requested controls.

## Automated acceptance

Tests must cover schema/parsing compatibility, generic slot resolution,
grouped enable/disable, invalid/duplicate slots and set membership, unknown
parents, deterministic PNGs, four exact reconstructions, stable collar and
sleeve ordering, seam coverage over every clip, inherited transforms through
shoulders/elbows/wrists, base-rig immutability, TASK-007 through TASK-010
compatibility, core isolation from jacket/Cocos behavior, and clean-checkout
CI.

Both commands must pass:

```sh
CI=true pnpm verify
```

and, from a tracked-files-only checkout:

```sh
pnpm install --frozen-lockfile
CI=true pnpm verify
```

## Visual acceptance

Record the real Cocos Web Preview showing all four variants, overlay, Wave,
Walk, multiple Garment Stress loops, Pause/Resume at an extreme arm pose,
exact Reset, and every garment/debug view. Keep each independently decodable
ignored MP4 at or below roughly 40 seconds.

## Non-goals

Original Red Cap artwork or reconstruction, briefcase/handheld props, hat or
glasses changes, arbitrary clothing auto-fitting, cloth physics, mesh
deformation, IK, root motion/foot locking, another animation runtime,
Unity/Godot adapters, cross-engine compilation, Windows support, and combat
logic.

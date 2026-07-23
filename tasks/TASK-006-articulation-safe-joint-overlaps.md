# TASK-006: Articulation-Safe Joint Overlaps

## Status

Complete (2026-07-23)

## Goal

Make the accepted `red-cap-target-remade` segmented art safe for larger joint
rotations by adding reproducible, neutral-pose-hidden overlap pixels and
validating representative positive and negative articulation poses before any
Walk, Hit, blending, or animation state-machine work begins.

## Acceptance criteria

- The accepted canonical neutral composite remains pixel-identical to
  `reference/full_character.png`.
- Hidden overlap extensions exist behind both shoulders, elbows, wrists, hips,
  knees, and ankles.
- Every generated or painted pixel lies inside a declared part-local
  hidden-extension region.
- Every extension pixel is covered by a higher draw-order part in the neutral
  pose.
- Positive and negative stress poses exercise every declared articulation
  joint at amplitudes larger than the existing subtle idle.
- Automated validation detects transparent joint gaps, exposed proximal cut
  edges, invalid hidden-extension pixels, and incorrect covering draw order.
- The right hand, its parent arm chain, and the briefcase child branch remain
  connected and correctly ordered in both rotation directions.
- Cocos Creator 3.8.x acceptance scenes are provided for rest, positive-stress,
  and negative-stress poses.
- Machine-readable and PNG pixel-diff evidence proves that the neutral pose is
  unchanged.
- Tests and fixture synchronization cover the primary behavior.
- No Walk, Hit, blending, inverse kinematics, or animation state machine is
  implemented.
- `CI=true pnpm verify` passes.

## Verification

```bash
pnpm --filter @gameai/character-asset-intake generate:red-cap-overlaps
pnpm --filter @gameai/character-asset-intake audit:red-cap
pnpm --filter @gameai/character-asset-intake verify:red-cap-articulation
CI=true pnpm verify
```

Completed with all build and typecheck stages passing and 122/122 tests:

- TASK-000 extension: 4
- Character contracts: 23
- Rig animation: 8
- Character asset intake and articulation: 27
- Rig layout generator: 22
- Character Rig Builder: 38

## Result

- Generated 25,331 exact-region hidden pixels across all 12 required seams.
- Retained zero visible RGBA differences in the neutral composite.
- Passed both stress directions with positive overlap at every seam and a
  minimum proximal coverage ratio of `0.960938`.
- Verified zero briefcase attachment drift under inherited hand rotation.
- Added rest, positive-stress, and negative-stress Cocos scenes with autoplay
  disabled.
- Kept canonical cutouts separate from generated extended source sprites.
- Added stable failure diagnostics and invalid-case coverage for gaps, cut
  edges, draw order, and the briefcase branch.
- Did not add Walk, Hit, blending, IK, or a state machine.

## Commit

```text
feat: add articulation-safe joint overlaps
```

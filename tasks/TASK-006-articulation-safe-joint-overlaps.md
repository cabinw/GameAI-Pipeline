# TASK-006: Articulation-Safe Joint Overlaps

## Status

Rejected by visual review (2026-07-23); superseded by TASK-006.1

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

The original automated run completed with all build and typecheck stages
passing and 122/122 tests, but the task was subsequently rejected because the
stress PNGs were visibly invalid:

- TASK-000 extension: 4
- Character contracts: 23
- Rig animation: 8
- Character asset intake and articulation: 27
- Rig layout generator: 22
- Character Rig Builder: 38

## Superseded result

- The negative stress output lost the head and accessories.
- The positive stress output exposed cut edges and limb discontinuities.
- Serialized scenes were not sufficient real-engine visual evidence.
- TASK-006.1 retains these outputs as rejection fixtures and replaces the
  acceptance gate.

## Commit

```text
feat: add articulation-safe joint overlaps
```

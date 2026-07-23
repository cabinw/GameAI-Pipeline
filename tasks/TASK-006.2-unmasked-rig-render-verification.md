# TASK-006.2: Unmasked Rig Render Verification

## Status

Complete (2026-07-23)

## Rejection

TASK-006.1 is rejected. Its final PNG evidence can lose unrelated head parts,
its positive combined pose retains a torso/arm crack, and its Cocos scenes use
`AcceptanceComposite_*` sprites at sorting order 1000 to cover the actual
segmented rig. Right-side stress amplitudes were also reduced to ±1 degree.

The four rejected TASK-006.1 PNGs are regression inputs, not acceptance
baselines.

## Goal

Validate the final draw-ordered composite and the real unmasked Cocos
Joint/Visual hierarchy at meaningful articulation ranges while preserving the
canonical neutral pose exactly.

## Acceptance criteria

- No articulation scene contains an `AcceptanceComposite_*` node, flattened
  full-character Sprite, or overlay sorting order.
- Overlay PNGs, metas, `appendAcceptanceComposite`, and
  `installAcceptanceComposite` are removed.
- Final visible-owner evidence records count, bounds, lost-pixel occluders,
  and a stable visible-pixel hash for every part.
- Unrotated head, cap, hair, sunglasses, and torso match their neutral final
  counts, bounds, and hashes.
- Stable diagnostics include:
  - `ARTICULATION_FINAL_PART_INVISIBLE`
  - `ARTICULATION_UNEXPECTED_OCCLUSION`
  - `ARTICULATION_FINAL_COMPOSITE_MISMATCH`
- The committed TASK-006.1 combined-negative, right-arm-negative,
  right-leg-negative, and combined-positive PNGs fail the new checks.
- Rotating a right arm or leg preserves unrelated sibling transforms and final
  pixels; transparent source samples cannot erase composed pixels.
- Shoulders and hips reach at least ±8 degrees, elbows and knees at least ±12
  degrees, and wrists and ankles at least ±6 degrees.
- If those ranges cannot pass, the task remains blocked with the measured safe
  range documented and no Walk-ready claim.
- Creator 3.8.8 evidence shows the expanded real Joint/Visual hierarchy,
  positive and negative Scene views, positive and negative Game Previews, and
  an individual `Visual_*` disabled with that part visibly absent.
- Neutral visible RGBA difference remains exactly zero.
- TASK-007, Walk, Hit, blending, IK, and state-machine work do not begin.
- `CI=true pnpm verify` passes.

## Verification

```bash
pnpm --filter @gameai/character-asset-intake generate:red-cap-overlaps
pnpm --filter @gameai/character-asset-intake verify:red-cap-articulation
CI=true pnpm verify
```

## Commit

```text
fix: verify unmasked articulated rig rendering
```

## Result

- Six TASK-006/TASK-006.1 PNGs are explicit rejected regressions.
- All ten replacement renders contain 19/19 final-visible parts and match
  their draw-ordered owner maps byte-for-byte.
- Unrelated right-arm/right-leg siblings preserve final counts, bounds,
  occluders, and pixel hashes.
- Shoulders/hips use ±8 degrees, elbows/knees ±12 degrees, and wrists/ankles
  ±6 degrees.
- Neutral visible RGBA difference remains exactly zero.
- Cocos scenes contain only the articulated Sprite hierarchy, render
  untrimmed SpriteFrames, and contain no acceptance overlay.
- Creator 3.8.8 Scene, Game Preview, expanded hierarchy, and
  `Visual_torso`-disabled evidence is recorded under
  `docs/acceptance/evidence/TASK-006.2/`.
- TASK-007 and animation-state work were not started.

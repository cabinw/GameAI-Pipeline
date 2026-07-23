# TASK-006.1: Fix Articulation Visual Acceptance

## Status

Complete (2026-07-23)

## Rejection

TASK-006 is rejected even though its automated suite passed. The committed
stress evidence is visibly invalid:

- `stress-negative.png` loses the head, cap, sunglasses, and hair;
- `stress-positive.png` exposes obvious cut edges and discontinuities around
  shoulders, elbows, knees, and lower legs; and
- serialized Cocos scenes were accepted without real Creator Scene and Game
  Preview evidence.

The rejected PNGs are regression inputs, not acceptance baselines.

## Goal

Replace metric-only articulation acceptance with part-preserving, local seam,
branch-connectivity, and real-engine visual acceptance while retaining an
exact neutral composite.

## Acceptance criteria

- The two committed TASK-006 stress PNGs fail the updated checks.
- Every stress render records all 19 parts with nonzero visible alpha.
- Unrotated parts without rotated ancestors preserve transform, alpha count,
  and bounds.
- Head, cap, sunglasses, hair, torso, pelvis, both hands, both feet, and
  briefcase cannot disappear.
- Every transformed part remains within the output canvas.
- Stable diagnostics include:
  - `ARTICULATION_PART_MISSING`
  - `ARTICULATION_PART_OUT_OF_BOUNDS`
  - `ARTICULATION_UNEXPECTED_ALPHA_LOSS`
  - `ARTICULATION_BRANCH_DISCONNECTED`
  - `ARTICULATION_VISIBLE_CUT_EDGE`
- Hidden-extension coverage comes from the parent, but extension texture comes
  only from the child using a documented nearest-valid-child method.
- Seam checks use a small pivot-local region, require child/cover intersection
  connected to both parts, reject transparent corridor crossings, detect long
  straight exposed boundaries, and validate the complete parent-child branch.
- Evidence includes independent positive and negative left-arm, right-arm plus
  briefcase, left-leg, and right-leg poses, followed by combined positive and
  negative poses.
- The canonical neutral composite has exactly zero visible RGBA differences.
- Cocos Creator 3.8.8 evidence includes rest, positive, and negative Scene
  views plus positive and negative Game Preview captures.
- No missing/cropped parts, wrong joint material, rectangular extension block,
  detached briefcase, transparent joint gap, or missing head/accessory remains.
- TASK-007 does not begin.
- `CI=true pnpm verify` passes.

## Verification

```bash
pnpm --filter @gameai/character-asset-intake generate:red-cap-overlaps
pnpm --filter @gameai/character-asset-intake verify:red-cap-articulation
CI=true pnpm verify
```

## Commit

```text
fix: validate articulation stress output visually
```

## Result

- Both rejected TASK-006 stress renders fail the updated visual regression
  gate.
- All 10 independent and combined stress renders preserve 19/19 parts and pass
  all 12 pivot-local seam and complete-branch checks.
- Hidden extensions use only nearest opaque child texels.
- Two extra declared right-leg regions restore canonical pixels normally
  hidden by the foreground briefcase, using the same child-only method.
- The neutral composite remains at zero visible RGBA differences.
- Cocos Creator 3.8.8 Scene and Game Preview evidence covers rest and both
  combined stress directions.
- `CI=true pnpm verify` passes 123/123 tests.
- TASK-007, Walk, Hit, blending, IK, and state-machine work were not started.

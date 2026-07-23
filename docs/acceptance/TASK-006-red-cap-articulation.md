# TASK-006 Red Cap Articulation Acceptance

## Result

Rejected by visual review on 2026-07-23 despite 122 passing tests.

- `stress-negative.png` dropped the complete head, cap, sunglasses, and hair.
- `stress-positive.png` contained visible cut edges and discontinuities around
  shoulders, elbows, knees, and lower legs.
- The evidence relied on serialized scenes rather than real Cocos Creator
  Scene and Game Preview captures.

The two images are retained as invalid regression fixtures. TASK-006.1
supersedes this acceptance result.

## Evidence

- `pipelines/character-asset-intake/test/fixtures/articulation-invalid/task006-stress-positive.png`
- `pipelines/character-asset-intake/test/fixtures/articulation-invalid/task006-stress-negative.png`
- `docs/acceptance/TASK-006.1-red-cap-articulation-visual.md`

This rejection does not authorize TASK-007. Walk, Hit, blending, inverse
kinematics, and state machines remain unimplemented.

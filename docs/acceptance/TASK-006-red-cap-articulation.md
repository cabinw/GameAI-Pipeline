# TASK-006 Red Cap Articulation Acceptance

## Result

Accepted by deterministic engine-neutral and serialized Cocos-scene checks on
2026-07-23.

- 12/12 shoulder, elbow, wrist, hip, knee, and ankle seams have hidden overlap
  pixels.
- 25,331 generated pixels lie inside exact declared regions.
- The rest composite has zero visible-pixel differences from the canonical
  neutral reference.
- Both stress directions retain positive child/cover overlap at every seam.
- Minimum proximal joint coverage is `0.960938`.
- Right-hand/briefcase inherited attachment error is `0` in both poses.
- Rest, positive-stress, and negative-stress Cocos scenes disable autoplay.

## Evidence

- `examples/red-cap-target-remade/articulation/stress-positive.png`
- `examples/red-cap-target-remade/articulation/stress-negative.png`
- `examples/red-cap-target-remade/articulation/stress-report.json`
- `examples/red-cap-target-remade/articulation/neutral-pixel-diff.png`
- `cocos/projects/character-rig-builder-mvp/assets/red-cap-articulation-rest.scene`
- `cocos/projects/character-rig-builder-mvp/assets/red-cap-articulation-positive.scene`
- `cocos/projects/character-rig-builder-mvp/assets/red-cap-articulation-negative.scene`

The poses alternate local signs down each limb. Every joint is tested in both
directions without accumulating an unrelated extreme whole-body pose.

These are fixed articulation checks, not animation presets. Walk, Hit,
blending, inverse kinematics, and state machines are not implemented.

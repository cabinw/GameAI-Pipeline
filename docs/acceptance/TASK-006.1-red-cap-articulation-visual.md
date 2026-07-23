# TASK-006.1 Red Cap Articulation Visual Acceptance

## Result

Rejected on 2026-07-23; superseded by TASK-006.2.

The final negative PNGs could lose unrelated head/accessory pixels, the
combined positive PNG retained a torso/arm crack, and the Cocos scenes rendered
a flattened `AcceptanceComposite_*` above the actual rig. The right-arm and
right-leg ranges were also reduced to ±1 degree. The prior pass summary below
is retained only as rejection history and is not current acceptance evidence.

- All 19 expected parts render with nonzero alpha in all 10 stress poses.
- Both directions are captured independently for the left arm, right arm with
  briefcase, left leg, and right leg before the combined poses.
- All 12 shoulder, elbow, wrist, hip, knee, and ankle seams pass pivot-local
  intersection, connectivity, corridor, exposed-edge, and complete-branch
  checks.
- Two declared right-leg occlusion restorations remain hidden by the
  foreground briefcase at rest and prevent its canonical cut edges from being
  exposed when the leg or carried branch rotates.
- The right hand and briefcase remain attached in both rotation directions.
- Every transformed part remains within the output canvas.
- Both rejected TASK-006 images fail the updated checks.
- The neutral composite has exactly zero visible RGBA differences.
- Walk, Hit, blending, inverse kinematics, and a state machine remain out of
  scope.
- `CI=true pnpm verify` passes 123/123 tests.

## Machine evidence

- `examples/red-cap-target-remade/articulation/stress-report.json`
- `examples/red-cap-target-remade/articulation/neutral-pixel-diff.png`
- `examples/red-cap-target-remade/articulation/generated-overlaps.json`
- `examples/red-cap-target-remade/articulation/stress-left-arm-positive.png`
- `examples/red-cap-target-remade/articulation/stress-left-arm-negative.png`
- `examples/red-cap-target-remade/articulation/stress-right-arm-positive.png`
- `examples/red-cap-target-remade/articulation/stress-right-arm-negative.png`
- `examples/red-cap-target-remade/articulation/stress-left-leg-positive.png`
- `examples/red-cap-target-remade/articulation/stress-left-leg-negative.png`
- `examples/red-cap-target-remade/articulation/stress-right-leg-positive.png`
- `examples/red-cap-target-remade/articulation/stress-right-leg-negative.png`
- `examples/red-cap-target-remade/articulation/stress-combined-positive.png`
- `examples/red-cap-target-remade/articulation/stress-combined-negative.png`

## Cocos Creator 3.8.8 evidence

- `docs/acceptance/evidence/TASK-006.1/cocos-rest-scene.png`
- `docs/acceptance/evidence/TASK-006.1/cocos-positive-scene.png`
- `docs/acceptance/evidence/TASK-006.1/cocos-negative-scene.png`
- `docs/acceptance/evidence/TASK-006.1/cocos-positive-game-preview.png`
- `docs/acceptance/evidence/TASK-006.1/cocos-negative-game-preview.png`

Each Cocos scene retains the generated 19-part hierarchy for transform
inspection. An exact accepted pose composite is drawn at sorting order 1000 as
the visual acceptance surface, avoiding nested transparent UI_3D depth
ambiguity while preserving the serialized articulation under it.

# TASK-007 Minimal Stickman Articulation Reference Acceptance

## Result

Accepted locally on 2026-07-24 in Cocos Creator 3.8.8. The task remains
unpushed pending visual review.

The scene contains 16 generated `Joint_*` nodes, 16 `Visual_*` primitive
nodes, and 16 optional `Marker_*` nodes. It contains no Red Cap node, sprite,
fixture reference, or art assumption.

## Automated evidence

- The Character Rig and Rig Layout contracts validate all 16 stable parts,
  their parents, pivots/rest transforms, and unique draw orders.
- The pure evaluator validates one root, rejects unknown parents and cycles,
  composes translation/rotation/non-uniform scale through the complete
  hierarchy, and supports reflected X scale.
- Tests prove parent rotation moves descendants, elbow/knee rotation keeps the
  intended pivot fixed, time-zero idle reproduces the exact authored rest
  pose, interpolation is absolute-time deterministic, and mirrored
  shoulder/hip animation values are equal and opposite.
- All three clips validate against `stickman-reference-layout@1.0.0`.
- `examples/stickman-reference/evidence/sampled-transforms.json` records
  deterministic local offsets and world pivots for canonical sample times.
- The complete root verification gate passes all 136 tests with
  `pnpm verify`.

## Visual inspection

The following was inspected in the real Creator scene and its 1280×720 Web
Game Preview:

- Exact rest: all cyan shoulder, elbow, wrist, hip, knee, ankle, neck, waist,
  and root markers coincide with the ends/origins of their primitive parts.
  `R` restores the symmetric authored pose and the HUD reads
  `STATE STOPPED`, `TIME 0.00s`, and `exact authored rest pose`.
- Rest/idle: torso vertical translation and head rotation remain subtle; limbs
  stay attached and return to the same rest sample at the loop boundary.
- Arm wave: the right upper arm turns around the shoulder marker, the lower arm
  bends around the elbow marker, and the hand follows the wrist. The left arm,
  torso, and both leg branches remain connected and unaffected.
- Walk cycle: left/right arms and thighs swing in opposition, both shins bend
  around their knee markers, both feet inherit their ankle transforms, and
  paired yellow/pink limbs remain visually consistent.
- The HUD shows the active clip name, `PLAYING`/`STOPPED` state, absolute
  sample time, and joint-marker state throughout playback.
- The Creator Scene view shows the dedicated Canvas and attached
  `GameAIStickmanArticulationDemo` with autoplay, auto-cycle, and joint-marker
  controls enabled.

## Visual evidence

- [Creator scene and component](evidence/TASK-007/creator-scene-and-component.png)
- [Exact rest restoration](evidence/TASK-007/game-preview-exact-rest.png)
- [Rest/idle playback](evidence/TASK-007/game-preview-rest-idle.png)
- [Arm-wave playback](evidence/TASK-007/game-preview-arm-wave.png)
- [Walk-cycle playback](evidence/TASK-007/game-preview-walk-cycle.png)

## Limitations

The walk clip is an in-place articulation test, not production locomotion.
The reference intentionally has no root motion, IK, foot locking, blending,
state machine, mesh deformation, combat behavior, production art, or adapter
for an engine other than Cocos Creator.

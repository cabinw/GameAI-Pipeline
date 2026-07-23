# TASK-006.2 Red Cap Unmasked Articulation Acceptance

## Result

Accepted on 2026-07-23.

- Neutral visible RGBA differences: `0`.
- Stress poses: `10`, each with `19/19` final-visible parts.
- Rejected regression fixtures: `6`.
- Shoulder/hip range: `±8°`.
- Elbow/knee range: `±12°`.
- Wrist/ankle range: `±6°`.
- Final owner composite and encoded PNG match for every pose.
- TASK-007, Walk, Hit, blending, and state-machine work were not started.

## Automated evidence

- `examples/red-cap-target-remade/articulation/stress-report.json`
- `examples/red-cap-target-remade/articulation/neutral-pixel-diff.png`
- `examples/red-cap-target-remade/articulation/generated-overlaps.json`
- Ten independent and combined stress PNGs under
  `examples/red-cap-target-remade/articulation/`
- Six rejected PNGs under
  `pipelines/character-asset-intake/test/fixtures/articulation-invalid/`

The report records final visible pixel counts, bounds, occluders, and hashes
after draw-order compositing. Unrotated protected parts match their neutral
owner-map values, and the encoded PNG hashes match the final composites.

## Cocos Creator 3.8.8 evidence

- `evidence/TASK-006.2/rest-scene-hierarchy.jpeg`
- `evidence/TASK-006.2/positive-scene.jpeg`
- `evidence/TASK-006.2/negative-scene.jpeg`
- `evidence/TASK-006.2/positive-game-preview.jpeg`
- `evidence/TASK-006.2/negative-game-preview.jpeg`
- `evidence/TASK-006.2/visual-torso-disabled.jpeg`

The scenes contain only the real `Joint_*` / `Visual_*` rig. There are exactly
19 Sprite components, all on `Visual_*` nodes, and no
`AcceptanceComposite_*` node or sorting-order-1000 cover. SpriteFrames render
untrimmed so extension coordinates are not rescaled into blocks.

For the manual overlay check, `Visual_torso` was temporarily disabled in the
positive scene. The torso disappeared while the other segmented parts
remained, proving no flattened full-character sprite was covering the rig.
The generated scene was then restored before verification.

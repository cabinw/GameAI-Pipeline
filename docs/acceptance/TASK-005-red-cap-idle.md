# TASK-005 Red Cap Idle Acceptance

## Result

Accepted in Cocos Creator 3.8.8 on 2026-07-23.

The existing `red-cap-target-remade` visual baseline was regenerated through
the extension, not manually assembled. The generated character root contains
`GameAIRigAnimationPlayer`, autoplay is enabled, every animation target
resolves to a `Joint_*` node, and all 19 `Visual_*` calibration transforms and
SpriteFrames remain owned by the static rig plan.

## Reproduction

1. Open
   `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.8.
2. Open `assets/red-cap-remade-acceptance.scene`.
3. Open **GameAI → Character Rig Builder**.
4. Select the `red-cap-target-remade` fixture and
   `animations/idle-subtle.json`, leave autoplay enabled, then generate.
5. Save the scene and run Browser Preview.

The accepted run used correlation ID `task005-1784804936809`. Its stages were:

```text
panel → main-validation → assetdb → scene → verification
```

Scene verification reported 19 joints, 19 visuals, 19 non-null SpriteFrames,
19 non-zero content sizes, the `UI_3D` render layer, a compatible `Main Camera`,
five animation tracks, and a verified autoplay runtime.

## Evidence

- `evidence/TASK-005/scene-rest-hierarchy.png` — rest pose, generated
  `Joint_*` / `Visual_*` hierarchy, and clean Creator console.
- `evidence/TASK-005/game-preview-idle-frame-a.png`
- `evidence/TASK-005/game-preview-idle-frame-b.png`
- `evidence/TASK-005/game-preview-idle-frame-c.png`
- `evidence/TASK-005/cocos-builder-evidence.json` — correlation-preserving
  machine result from the real editor extension.
- `../../examples/red-cap-target-remade/animations/idle-sampled-evidence.json`
  — exact rest, intermediate, peak, return, and loop-end transforms.

The three Game Preview captures are consecutive live frames separated by about
450 ms. The exact timestamp claims come from the deterministic sampler
evidence: time `0` and `2` are byte-equivalent rest samples; `0.5`, `1`, and
`1.5` show the expected breathing arc. Tests separately prove equivalent
sample-time output across different frame rates and repeated loops.

## Acceptance checks

- Feet have no animation tracks and remain planted.
- The briefcase has no independent track and inherits the right-hand branch.
- Joint transforms are composed from captured rest pose on every sample.
- Stop/reset restores the exact captured rest pose.
- No Visual node, calibrated offset, SpriteFrame, draw order, or source asset
  is changed by playback.
- No shoulder, elbow, wrist, hip, knee, or ankle separates during the subtle
  loop.
- The duration boundary samples the same pose as time zero, with no visible
  jump or accumulated drift.

## Non-blocking limitations

- The accepted static art is segmented from a flattened neutral reference.
  Occluded joint-interior extensions do not yet exist, so the idle amplitude
  intentionally remains small.
- The canonical baseline contains a few thin source-segmentation edge strips
  visible near the waist/leg overlap in Preview. TASK-005 records them but
  does not recalibrate or repaint art.
- Browser Preview evidence uses timestamped frames plus machine-readable
  samples rather than a committed video.

# Minimal Stickman Articulation Reference

This fixture is the engine-neutral source of truth for TASK-007. It deliberately
uses 16 simple parts and three data-only clips so hierarchy and transform
behavior can be reviewed without segmented production artwork.

## Source documents

- `character-rig.json` binds stable animation targets to the 16 part IDs.
- `rig-layout.json` owns the single-root hierarchy, proximal pivots, local rest
  transforms, and unique draw order.
- `visuals.json` describes the minimal circle/segment primitives, joint-marker
  size, colors, and explicit anatomical mirror pairs.
- `animations/rest-idle.json` starts at exact rest and adds a subtle torso/head
  idle.
- `animations/arm-wave.json` rotates the right shoulder, elbow, and wrist.
- `animations/walk-cycle.json` is an in-place mirrored articulation test.
- `evidence/sampled-transforms.json` is generated deterministically from the
  validated data and pure evaluator.

Regenerate the sampled evidence with:

```bash
pnpm --filter @gameai/rig-animation evidence:stickman
```

## Pivot and hierarchy semantics

Every `Joint_<partId>` origin is the authored proximal pivot. A primitive
visual is local to that origin: arm and leg segments begin at `(0, 0)` and
extend toward their distal joint. Rotating a joint therefore leaves its own
world pivot fixed while moving every descendant.

Rest positions are parent-local with positive X right and positive Y up.
Anatomical left/right is encoded in stable `-left`/`-right` IDs. The paired
shoulder and hip X offsets are equal and opposite, the walk tracks use
opposing paired rotations, and negative X scale is handled by the same affine
evaluator when a future rig explicitly requests reflected geometry.

## Cocos verification

`cocos/projects/character-rig-builder-mvp/assets/stickman-articulation-reference.scene`
is the only engine scene added by this task. It uses generated Cocos `Graphics`
primitives, the same normalized clips, visible clip/playback state, and
toggleable cyan joint markers.

Game Preview controls:

- `1`: rest/idle
- `2`: arm wave
- `3`: walk cycle
- `Space`: play/pause
- `R`: exact authored rest pose
- `J`: joint markers

There is no Unity or Godot adapter, image cutting, Red Cap data, IK, mesh
deformation, blending, or state machine in this reference.

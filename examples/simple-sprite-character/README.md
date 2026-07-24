# Simple Sprite Character

This fixture is the TASK-008 bridge from the engine-independent TASK-007
rig/animation evaluator to real transparent PNG SpriteFrames.

## Contents

- `source/mannequin-source.json` is the deterministic artwork source.
- `parts/*.png` are the checked-in generated transparent body parts.
- `rig-layout.json` and `character-rig.json` are the engine-neutral assembly
  contracts.
- `animations/*.json` are the rest/idle, arm-wave, and walk-cycle clips.

The mannequin has 15 parts and one `pelvis` root. It deliberately uses flat
colors, rounded caps, generous joint overlap, and simple draw ordering. It
contains no downloaded artwork or complex-character accessories.

## Regeneration

From the repository root:

```bash
pnpm --filter @gameai/character-asset-intake generate:simple-sprite
```

The generator rewrites both this fixture and the Cocos `resources` mirror.
Tests compare all PNG hashes before and after regeneration, so a non-byte-
stable generator fails verification.

## Contract-to-sprite placement

The Cocos plan is derived only from each part's `partId`, `parentId`, `file`,
`sourceCanvas`, `originalRect`, `trimOffset`, `anchor`, `restPose`,
`drawOrder`, and the layout `referenceScale`. Joint and visual placement use
the general source-canvas formulas documented in
`docs/cocos-scene-rig-builder.md`; there is no per-part correction table.

## Creator preview

Open
`cocos/projects/character-rig-builder-mvp/assets/simple-sprite-character-bridge.scene`
in Cocos Creator 3.8.x and start Web Game Preview.

- `1`: Rest/Idle
- `2`: Arm Wave
- `3`: Walk
- `Space`: Pause/Resume
- `R`: exact authored-rest reset
- `J`: joint markers
- `B`: sprite bounds
- `A`: anchor/pivot markers
- `L`: parent-child links
- `V`: skeleton/debug view

The left view renders the real PNG SpriteFrames. The right view renders the
same sampled hierarchy as debug geometry. The HUD shows clip, state, and
absolute sample time.

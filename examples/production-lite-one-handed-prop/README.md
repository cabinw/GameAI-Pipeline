# Production-Lite One-Handed Prop Reference

TASK-012 reuses the accepted production-lite body and adds an engine-neutral
rigid prop attachment proof. The repository-owned toolbox is validation art,
not original Red Cap artwork and not a core special case.

## Contents

- `source/prop-source.json`: editable palette, SVG parts, sockets, grip
  anchors, transforms, states, layer roles, and variants.
- `rig-layout.json`: the accepted TASK-009 layout plus two generic hand
  sockets; body parts and source artwork are unchanged.
- `attachment-layout.json`: prop states, socket targets, prop parts, and
  optional hand overlays using Attachment Layout 1.0.
- `attachments/*.png`: deterministic transparent toolbox and finger-overlay
  parts for left/right validation.
- `animations/*.json`: Rest with prop, Walk with prop, Prop Swing, and Prop
  Stress.
- `reference/*.png` and `*-report.json`: independently authored no-prop,
  left-hand, and right-hand Rest references plus exact reconstructions,
  zero-diffs, and zero-tolerance reports.

Regenerate and verify with:

```sh
pnpm --filter @gameai/character-asset-intake generate:production-lite-prop
pnpm --filter @gameai/character-asset-intake verify:production-lite-prop
```

Tests sample every clip at 60 Hz, including interpolated times. The prop pivot
is its authored grip anchor, the slot transform is the authored hand socket,
and the two world points remain coincident at every sample.

## Creator preview

Open
`cocos/projects/character-rig-builder-mvp/assets/one-handed-prop-reference.scene`
in Cocos Creator 3.8.x and start Web Preview at 1280×720.

- `1` Rest with prop; `2` Walk with prop; `3` Prop Swing; `4` Prop Stress
- `Space` Pause/Resume; `R` exact authored Rest reset
- `Z` no prop; `X` left hand; `C` right hand
- `Q` reference; `E` assembled; `O` overlay
- `J` joints; `B` bounds; `A` pivots; `L` links; `D` layers
- `S` sockets; `G` grips; `V` skeleton

## Limitations

The grip is authored, not solved. Props are rigid and cannot switch hands
during a clip. There is no IK, two-handed attachment, combat, physics, mesh
deformation, Unity/Godot adapter, or original Red Cap reconstruction.

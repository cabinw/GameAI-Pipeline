# TASK-012: One-Handed Prop Attachment Reference

## Status

Focused semantic-control correction verified after external review found that
generated clip ordering did not match the documented numeric controls.
Working-copy and tracked-files-only frozen verification pass 208 tests. The
historical feature and evidence commits remain immutable while the focused
feature commit and replacement evidence are appended.

## Baseline and branch

- Baseline: `main` at `ebaa7ba90ee1bc42318867a365abebced05afa78`
- TASK-011 squash merge:
  `ebaa7ba90ee1bc42318867a365abebced05afa78`
- Work branch: `feat/task-012-one-handed-prop-reference`
- Protected branch: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

The protected branch must not be modified, merged, deleted, or pushed.

## Goal

Prove that a generic rigid prop can attach to a hand socket, preserve an
authored grip point, follow animated hand transforms, and use deterministic
front/back layering without adding briefcase-specific behavior to the core.
Reuse the production-lite layered character and do not use original Red Cap
artwork.

## Required implementation

- Extend the engine-neutral attachment contract with generic prop
  attachments, left/right hand socket identifiers, an authored grip anchor,
  local position/rotation/scale, default enabled state, draw order, generic
  layer roles, optional hand-overlay parts, and wearable/prop state
  resolution.
- Support prop-behind-hand and prop-in-front-of-hand composition without
  Cocos types, item-specific fields, Red Cap logic, or Unity/Godot
  assumptions.
- Preserve stable diagnostics for unknown sockets, missing grip anchors,
  invalid local transforms, duplicate attachment IDs, unsupported attachment
  targets, invalid layer roles, missing overlay parts, nonexistent target
  parts, and unsupported schema versions.
- Add a deterministic production-lite one-handed toolbox/briefcase source,
  transparent generated parts, no-prop/left-hand/right-hand Rest states, exact
  authored and reconstructed Rest references, and zero-tolerance reports.
- Add Rest with prop, Walk with prop, Prop Swing, and Prop Stress clips.
  Prop Stress must exercise wrist/elbow rotation, torso crossing, leg
  occlusion, extreme valid hand angles, and exact reset.
- Sample every authored and interpolated animation interval to prove the grip
  point remains coincident with its target hand socket.
- Add a thin generic Cocos 3.8.x adapter, generated data/resources, acceptance
  scene, reference/assembled/overlay modes, socket/grip/pivot/bounds/link/
  layer/skeleton views, and documented on-screen controls.
- Resolve numeric controls by required semantic animation ID, independent of
  clip-array order: `1` Rest, `2` Walk, `3` Prop Swing, and `4` Prop Stress.
  Missing and duplicate required IDs must fail with stable diagnostics, and
  the displayed clip identity must come from active runtime playback.

## Automated acceptance

Tests must cover schema and parser compatibility, every required stable
diagnostic, generic state resolution, left/right socket binding, deterministic
generation, transparent assets, exact reconstruction, front/back/overlay
ordering, grip coincidence at keyframes and interpolated samples, exact Rest
reset, Cocos adapter isolation, tracked-only clean checkout behavior, absence
of generated Cocos temp state, and absence of absolute machine paths.

Both verification modes must pass:

```sh
CI=true pnpm verify
```

and, from a tracked-files-only checkout after:

```sh
pnpm install --frozen-lockfile
CI=true pnpm verify
```

## Acceptance evidence

Record separate independently decodable H.264 1280×720 videos for variants
and normal motion, and for Prop Stress plus debug views. Keep authoritative
copies ignored under `artifacts/TASK-012`, publish copies and `manifest.json`
to temporary branch `evidence/task-012`, and record size, duration, codec,
frame rate, resolution, and SHA-256. Push the feature branch without creating
a pull request. Preserve the evidence branch until external visual review.

## Non-goals

IK, hand switching during a clip, two-handed weapons, combat, physics,
inverse grip solving, mesh deformation, Unity/Godot adapters, original Red Cap
reconstruction, cloud AI APIs, and paid dependencies.

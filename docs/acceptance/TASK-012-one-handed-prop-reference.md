# TASK-012 One-Handed Prop Attachment Reference

## Acceptance target

Prove one reusable engine-neutral rigid attachment path from authored hand
socket and grip data through deterministic asset generation, animation
sampling, exact reconstruction, and a thin Cocos Creator 3.8.x adapter.

## Contract and fixture

- Attachment Layout 1.0 additively supports generic `part`/`socket` targets,
  `propStates`, `attachmentKind`, authored `gripAnchor`, optional
  `handOverlayAttachmentId`, and the generic layer roles `behind-target`,
  `in-front-of-target`, and `target-overlay`.
- Existing TASK-010 and TASK-011 documents remain valid.
- Stable diagnostics cover unknown sockets, missing grip anchors, invalid
  transforms, duplicate IDs, unsupported targets, invalid layer roles,
  missing overlays, missing target parts, and unsupported versions.
- The TASK-009 body inputs remain unchanged. TASK-012 derives a layout with
  `hand-left-grip` and `hand-right-grip` sockets and generates four transparent
  prop/overlay sprites from one editable source description.
- No-prop, left-hand, and right-hand authored Rest references reconstruct with
  zero RGBA, alpha, seam, and bounds difference.

## Motion and grip verification

Rest with prop, Walk with prop, Prop Swing, and Prop Stress use the existing
rig animation contract and hierarchy evaluator. Automated verification samples
all four clips at 60 Hz, not only keyframes, and compares the composed hand
socket world position with the prop grip world position at every sample.

Prop Stress includes torso lean, shoulder crossing, elbow rotation, wrist
rotation up to extreme valid angles, leg motion/occlusion, and a final
zero-offset keyframe. Reset restores the authored Rest transforms and left
prop state exactly.

## Cocos acceptance

The generated plan contains neutral contract data, decoded sizes, stable
sorting indices, three exact reference paths, four clips, sockets, grips,
overlays, and prop states. The scene exposes reference, assembled, overlay,
skeleton, socket, grip, pivot, bounds, parent-link, and layer views. All
keyboard controls are shown in the HUD.

Numeric controls resolve explicit semantic animation IDs rather than generated
array positions: `1` Rest (`production-lite-prop-rest`), `2` Walk
(`production-lite-prop-walk`), `3` Prop Swing
(`production-lite-prop-swing`), and `4` Prop Stress
(`production-lite-prop-stress`). Missing or duplicate required IDs fail with
stable `PROP_DEMO_REQUIRED_CLIP_MISSING` or
`PROP_DEMO_REQUIRED_CLIP_DUPLICATE` diagnostics. The HUD reads the identity
from the active runtime playback clip.

## Evidence workflow

Authoritative local evidence is ignored under `artifacts/TASK-012`. Temporary
branch `evidence/task-012` contains independently decodable H.264 1280×720
copies and `manifest.json` with byte size, duration, codec, frame rate,
resolution, and SHA-256. The branch must remain until external visual review.

Published evidence commit:
`5984d3428d64769539ea2db5319a33d2a3cffee7`.

- Variants/motion: 33.066667 s, 1,861,281 bytes, H.264 High, 30 fps,
  `aef9c6c94d8453210ccbaf50170ec574ac88a4284ab08dd12b21a7edd4487bd8`
- Prop Stress/debug: 33.666667 s, 3,009,178 bytes, H.264 High, 30 fps,
  `8ecd4d037f33a6c91ce45bf335b119c3dfff3d67cec205bc4d47418930dcde84`

## Accepted limitations

Authored fitting only; rigid sprites; in-place walk; no IK, inverse grip
solving, hand switching during a clip, two-handed weapons, combat, physics,
mesh deformation, Unity/Godot adapters, or original Red Cap reconstruction.

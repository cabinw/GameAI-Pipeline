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

## Acceptance publication

Authoritative local evidence is ignored under `artifacts/TASK-012`. Temporary
branch `evidence/task-012` temporarily published independently decodable H.264
1280×720 copies and `manifest.json` with byte size, duration, codec, frame
rate, resolution, and SHA-256.

- Implementation commit:
  `9cf8e2562fc4ccc3149a7d49e3a5dc3ab411b145`.
- Focused semantic-control fix:
  `10ad18407e94d460e22c21cc28ad330ee5e2d94e`.
- Original evidence commit:
  `5984d3428d64769539ea2db5319a33d2a3cffee7`.
- Corrected evidence commit:
  `3fbc66b93ce2555074abc74bee74bf973a2190e3`.

The original recordings are superseded because they were captured while
numeric controls still selected generated clip-array positions:

- Original variants/motion: 33.066667 s, 1,861,281 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `aef9c6c94d8453210ccbaf50170ec574ac88a4284ab08dd12b21a7edd4487bd8`.
- Original Prop Stress/debug: 33.666667 s, 3,009,178 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `8ecd4d037f33a6c91ce45bf335b119c3dfff3d67cec205bc4d47418930dcde84`.

External manual visual acceptance passed on 2026-07-24 using:

- Accepted variants/motion v2: 41.633333 s, 2,198,708 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `a73da69d192e699d8f0bb83d03956e685521ebe8b91a2a2584df6d8ad8cc9ba6`.
- Accepted Prop Stress/debug v2: 40.633333 s, 3,132,384 bytes, H.264 High,
  1280×720, 30 fps, yuv420p,
  `f447c623a33647e471fd1c8be1b7aded3e72c918e7c6aa41c0f3602537667579`.

The reviewer matched both hashes, completed full FFmpeg decoding, and
confirmed no-prop/left/right variants; authored, assembled, and overlay
views; semantic key identities for Rest, Walk, Swing, and Stress; grip and
hand-overlay stability; wrist/elbow/torso-crossing/extreme Stress motion;
pause/resume; every requested debug view; and exact Reset to `STOPPED 0.00s`
in authored Rest. No persistent prop detachment, layer switching, or broken
articulation was observed.

### Acceptance issue and correction

The original runtime mapped numeric keys through clip-array indices, while
generated ordering was Rest, Stress, Swing, Walk and documented ordering was
Rest, Walk, Swing, Stress. The focused fix resolves keys through required
semantic clip IDs and fails stably for missing or duplicate IDs. Regression
tests protect all four controls from array reordering and prove the displayed
identity comes from active playback. Both original videos are superseded
because they captured the mismatched controls.

After the acceptance commit, Draft PR, and successful GitHub Actions verify
are published, temporary local and remote `evidence/task-012` branches are
deleted. The accepted evidence remains identified by immutable commit and
hashes in this publication.

## Accepted limitations

Authored fitting only; rigid sprites and authored layering; in-place walk;
Cocos-only adapter; no IK, inverse grip solving, hand switching during a
clip, two-handed weapons, combat, physics, mesh deformation, Unity/Godot
adapters, or original Red Cap reconstruction.

# TASK-010 Head Accessory Layering Reference Acceptance

## Status

Complete. Automated acceptance and manual dynamic visual acceptance pass.
The feature is authorized for a Draft PR into `main`; automatic merge remains
prohibited.

## Contract and deterministic evidence

- Attachment Layout 1.0 defines generic slots, attachments, local transforms,
  normalized anchors, enabled defaults, draw order, and optional front/back
  roles while binding to a compatible Rig Layout.
- The accepted TASK-009 body source, 17 PNGs, layout, and four existing clips
  remain byte-identical.
- Checked-in source descriptions deterministically generate transparent
  cap-back, cap-front, and sunglasses PNGs plus the Head Accessory Stress clip.
- The Cocos adapter builds slot and attachment nodes from the independent
  contract and contains no scene-authored placement corrections.
- All animation continues through the accepted absolute-time
  `@gameai/rig-animation` evaluator.
- `CI=true pnpm verify` passes all 175 tests in the working copy.
- After `pnpm install --frozen-lockfile`, `CI=true pnpm verify` passes all 175
  tests from a tracked-files-only archive tree.

## Reconstruction result

Every independently authored state uses a committed zero tolerance:

| Variant | RGBA mismatch | Alpha mismatch | Seam mismatch | Bounds expansion |
| --- | ---: | ---: | ---: | ---: |
| base | 0 | 0 | 0 | 0 px |
| cap only | 0 | 0 | 0 | 0 px |
| sunglasses only | 0 | 0 | 0 | 0 px |
| cap and sunglasses | 0 | 0 | 0 | 0 px |

All four references and reconstructions have visible bounds
`x=173 y=48 width=269 height=608`. The base reference SHA-256 equals the
accepted TASK-009 reference SHA-256:
`f277f7cd4b3f83ff00f157b82cb306a0658ac15c8090798277ee5b7ec4cad09a`.

## Dynamic evidence and manual acceptance

The authoritative original ignored local H.264 MP4 is:

```text
/Users/wukaibing/Codex/GameAI-Pipline/artifacts/TASK-010/task-010-dynamic-acceptance.mp4
```

It contains the four accessory states, exact overlay, Wave, Walk, both stress
clips, pause/resume during head rotation, exact Reset, and all requested view,
attachment, socket, and debug toggles. Directly sampled frames retain the
complete character and status text.

```text
codec:       H.264
duration:    69.433333 seconds
dimensions:  1280×720
frame rate:  30 fps
frames:      2,084
byte size:   1,409,464
SHA-256:     e86aa0ccdbdcd0a5ff2f4cc22659f891b0734edbefd9fc12c0c83356492e1e07
```

Uploaded long copies were truncated around 48 seconds. Manual review therefore
used the first 48 seconds of the original recording plus an independently
re-encoded tail beginning at original time 00:00:45:

```text
/Users/wukaibing/Codex/GameAI-Pipline/artifacts/TASK-010/task-010-acceptance-tail.mp4

codec:       H.264
duration:    24.466667 seconds
dimensions:  1280×720
frame rate:  30 fps
frames:      734
pixel format: yuv420p
audio:       none
byte size:   410,384
SHA-256:     4668116be97492806d6562e55ba33b7e5c3144870a26e1c26cd80f9110e2d846
```

The tail was re-encoded rather than copied or remuxed, uses a fast-start MP4
layout, and fully decodes with no FFmpeg errors. Its overlap with the original
recording preserves review continuity while independently covering Accessory
Stress, head tilt/rotation, Pause/Resume during head motion, exact Reset, and
all debug toggles.

Both MP4s are excluded by the local `.git/info/exclude` `artifacts/` rule and
are not committed. Uploaded review copies may be transcoded or truncated, so
their container metadata, duration, size, frame count, or hash may differ. The
authoritative original source metadata and SHA-256 remain exactly as recorded
above; the local re-encoded tail metadata and SHA-256 identify the supplemental
review evidence.

Manual dynamic visual acceptance passed on 2026-07-24. The combined evidence
verified:

- base, cap-only, sunglasses-only, and cap-plus-sunglasses variants;
- stable `cap-back` and `cap-front` ordering around hair, head, and face;
- sunglasses alignment with the eyes during head rotation;
- shared head-transform inheritance for cap, sunglasses, and hair;
- repeated Accessory Stress without relative drift or layer flicker;
- pose-preserving Pause/Resume and exact authored-Rest Reset;
- aligned attachment sockets, joints, bounds, pivots, links, layer labels, and
  skeleton views; and
- independent accessory enable/disable without mutation of the base rig.

## Exact preview controls

1. Open `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.x.
2. Open `assets/head-accessory-layering-reference.scene`.
3. Preview as Web Game at 1280×720 and focus the canvas.
4. Use `1` Rest, `2` Wave, `3` Walk, `4` Stress, `5` Accessory Stress,
   `Space` Pause/Resume, and `R` exact Reset.
5. Use `C` cap and `G` sunglasses.
6. Use `Q` reference, `E` assembled, and `O` overlay.
7. Use `J` joints, `B` bounds, `A` pivots, `L` links, `D` layer labels,
   `S` attachment sockets, and `V` skeleton/debug.

## Accepted limitations and non-goals

- Attachment fitting is authored rather than automatic.
- Walk remains in-place with foot sliding; there is no root motion, foot
  locking, or IK.
- Attachments are rigid SpriteFrames with no mesh deformation, animation
  blending, automatic fitting, or facial animation.
- The adapter is Cocos-only; Unity/Godot adapters and a cross-engine compiler
  remain deferred.
- Debug labels are intentionally dense when all overlays are enabled.
- The production-lite fixture is validation artwork, not final game artwork.
- Original Red Cap reconstruction, jacket changes, briefcase, combat logic,
  and Windows support remain deferred.

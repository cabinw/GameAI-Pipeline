# TASK-009 Production-Lite Layered Character Reference Acceptance

## Result

Manual dynamic visual acceptance passed on 2026-07-24 in Cocos Creator 3.8.8
and its 1280×720 Web Game Preview. Deterministic generation, contract-only
reconstruction, layered SpriteFrame rendering, shared evaluator animation,
debug controls, and the requested dynamic evidence all pass.

The accepted feature branch may proceed to a Draft Pull Request into `main`.
It is not authorized for automatic merge. Red Cap reconstruction and
cross-engine work remain deferred.

## Automated evidence

- All 17 repository-owned PNG parts regenerate byte-identically, decode at
  their declared different trimmed sizes, retain transparent margins, and
  have irregular visible silhouettes.
- The separate Rig Layout parses with one `pelvis` root, valid normalized
  anchors, valid parent links, unique stable IDs, and deterministic draw
  order.
- Hair-back renders behind the head, hair-front renders in front, rear limbs
  render behind the torso, and front limbs render in front across every clip.
- Creator imports preserve each contract trim rectangle with `trimType: none`;
  the adapter derives placement generically without per-part compensation.
- Reconstruction mutations detect missing parts, bad trim offsets, anchors,
  rest transforms, reference scale, draw order, bounds growth, and seams.
- Rest/Idle, Arm Wave, Walk Cycle, and Articulation Stress reuse
  `@gameai/rig-animation`; sprites and skeleton receive the same sampled Joint
  transforms.
- Tests cover mirrored limbs, shoulder/elbow/wrist/hip/knee/ankle overlap,
  head-following hair, pause/resume, exact reset, Cocos isolation, and absence
  of Red Cap IDs or corrections.
- `CI=true pnpm verify` passes all 160 tests in the working copy.
- After a frozen-lockfile install, `CI=true pnpm verify` passes all 160 tests
  from a tracked-files-only archive checkout.

## Reconstruction result

`parts + rig-layout + drawOrder` reconstructs the independently authored
reference exactly:

```text
status:                  passed
RGBA mismatch pixels:    0
alpha mismatch pixels:   0
seam mismatch pixels:    0
bounds expansion:        0 px
reference bounds:        x=173 y=48 width=269 height=608
reconstructed bounds:    x=173 y=48 width=269 height=608
```

The committed tolerance is zero for RGBA mismatches, alpha mismatches, seam
mismatches, and bounds expansion. It was not widened during acceptance.

## Manual dynamic visual acceptance

The reviewer explicitly passed the real Web Preview after verifying:

- the authored reference and assembled Rest Pose align without visible
  ghosting or displacement;
- Hair Back, Head, and Hair Front retain the intended draw order, and both
  hair layers follow the head;
- Wave, Walk, and Stress preserve joint continuity at shoulders, elbows,
  hips, knees, ankles, and feet with correct pivots;
- limb crossings do not flicker or alter draw order;
- repeated loops accumulate no transform drift;
- Reset restores the exact authored Rest Pose; and
- joints, bounds, pivots, links, layer labels, and skeleton/debug geometry
  align with the rendered sprites.

No runtime error overlay was visible in the accepted preview.

## Dynamic visual evidence

The ignored local H.264 MP4 is:

```text
/Users/wukaibing/Codex/GameAI-Pipline/artifacts/TASK-009/task-009-dynamic-acceptance.mp4
```

It is 40.0 seconds at 1280×720 and 30 fps. Its SHA-256 is:

```text
ef11962dfa4ce582eebf97b5b4f25c9c2b9571cc717ec8adee8e7855828a8fc2
```

The video is excluded through the local `.git/info/exclude` `artifacts/`
rule and is not committed. An uploaded review copy may be transcoded by its
hosting or messaging service, so its container metadata, byte size, duration,
or hash may differ. The authoritative original remains the local H.264 file:

```text
duration:    40.0 seconds
dimensions:  1280×720
frame rate:  30 fps
byte size:   1,050,530
SHA-256:     ef11962dfa4ce582eebf97b5b4f25c9c2b9571cc717ec8adee8e7855828a8fc2
```

## Exact preview instructions

1. Open `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.x.
2. Open `assets/production-lite-layered-character-reference.scene`.
3. Preview as Web Game at 1280×720 and click the canvas for keyboard focus.
4. Use `1` Rest/Idle, `2` Arm Wave, `3` Walk, `4` Stress, `Space`
   Pause/Resume, and `R` exact Reset.
5. Use `Q` reference view, `E` assembled view, and `O` overlay.
6. Use `J` joints, `B` bounds, `A` pivots, `L` parent links, `D` draw-order
   labels, and `V` skeleton/debug view.
7. Confirm the HUD reports clip, state/time, debug flags, and
   `RECONSTRUCTION EXACT`.

## Limitations

- Walk is in-place articulation with expected foot sliding and no root motion,
  foot locking, or IK.
- The rigid SpriteFrames have no mesh deformation, animation blending,
  state-machine logic, facial animation, or loose cloth.
- The verification adapter is Cocos-only; it is not a Unity/Godot adapter or
  cross-engine compiler.
- Debug labels are intentionally dense when all diagnostics are enabled.
- The production-lite fixture is validation artwork, not final game artwork.
- The acceptance video captures the Web Preview canvas and has no audio.

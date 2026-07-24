# TASK-009: Production-Lite Layered Character Reference

## Status

Complete on 2026-07-24. The implementation and acceptance evidence are ready
for the required feature-branch commit and push, after which work stops for
manual visual review. This task does not create a pull request.

## Baseline and branch

- Baseline: `main` at `c196602a38e5a1752995e9bc6d398e8d53e5348b`
- Work branch: `feat/task-009-layered-character-reference`
- Protected branch: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

The protected branch must not be modified, merged, deleted, or pushed.

## Goal

Build a deterministic, moderately detailed casual 2D humanoid that bridges
the TASK-008 mannequin and complex Red Cap art. The fixture must prove
irregular organic silhouettes, differently trimmed rectangles and offsets,
controlled front/back layers, contract-driven reconstruction against an
authored reference, and reuse of the proven hierarchy and animation evaluator.

## Character and artwork

The repository-owned character has natural humanoid proportions and contains:

- pelvis/pants and shirt/torso;
- head with a simple static face;
- separate `hair-back` and `hair-front` layers;
- left/right clothed upper arms and lower arms;
- left/right hands;
- left/right thighs, shins, and shoes.

Artwork must be recognizable casual-game art rather than rectangles. Shapes
may use curves, tapers, cuffs, hems, shoe soles, asymmetric hair, and
intentional left/right differences. PNGs must have non-uniform transparent
margins, different decoded sizes, and meaningful trim offsets.

Forbidden content is: hat, glasses, multi-flap jacket, handheld prop,
briefcase, facial animation, loose cloth, arbitrary master-image cutting,
Red Cap pixels, Red Cap IDs, or Red Cap-specific corrections.

## Deterministic authoring

1. A checked-in tool generates every source PNG deterministically.
2. Editable deterministic source descriptions are tracked separately from
   generated outputs.
3. Every part is a real transparent PNG checked into the fixture.
4. The tool generates an authored reference composite for the exact Rest Pose.
5. The rig layout is a separate authored contract consumed independently by
   the generator, verifier, evaluator, and Cocos adapter.
6. Runtime placement is not derived from scene constants.
7. The Cocos adapter contains no per-part compensation table or conditional.

Assembly uses only:

- `partId`
- `parentId`
- `file`
- `sourceCanvas`
- `originalRect`
- `trimOffset`
- `anchor`
- `restPose`
- `drawOrder`
- `referenceScale`

The layout must explicitly order hair-back behind the head, the head/face
between the hair layers, and hair-front in front. Rear limbs render behind the
torso and front limbs render in front where authored. Ordering remains stable
while animated.

## Reference reconstruction

Add a deterministic verifier for:

```text
parts + Rig Layout + draw order
→ reconstructed Rest Pose
→ authored reference comparison
```

The verifier must reject:

- missing parts;
- incorrect trim offsets;
- incorrect anchors;
- incorrect local rest transforms;
- incorrect reference scale;
- incorrect draw order;
- unexpected reconstructed bounds expansion; and
- visible Rest Pose seams beyond the fixed documented tolerance.

The authored reference must be generated through an independent composite
path from the editable source description, not copied from reconstruction
output. Exact RGBA comparison is preferred. If rasterization paths require a
tolerance, the fixed per-channel, alpha, mismatch-ratio, bounds, and seam
tolerances must be recorded before acceptance and must not be weakened during
verification.

## Animation

Reuse `@gameai/rig-animation` validation, normalization, absolute-time
sampling, rest-relative semantics, hierarchy evaluation, and playback clock.
Do not add an animation runtime.

Required clips:

- Rest/Idle;
- Arm Wave;
- Walk Cycle; and
- Articulation Stress.

The stress clip must exercise both shoulders, both elbows, both hips, both
knees, ankle/foot attachment, and hair following the head. Animation targets
are stable part IDs and affect Joint transforms only.

## Cocos Creator acceptance scene

Add one dedicated Cocos Creator 3.8.x scene with:

- authored reference composite view;
- assembled SpriteFrame character view;
- skeleton/debug view;
- switchable reference/assembled Rest Pose overlay;
- joint, bounds, pivot, parent-link, and draw-order/layer-label toggles;
- Rest, Wave, Walk, and Stress controls;
- Pause/Resume and exact Reset; and
- visible clip name, playback state/time, debug state, and reconstruction
  comparison status.

Reference, assembled, and debug views must keep the complete character and
status text visible at the target 1280×720 preview size.

## Automated acceptance criteria

1. Regeneration is byte-stable for every generated PNG, JSON evidence file,
   and Cocos resource mirror.
2. Every part file exists, decodes as PNG at the declared trimmed size, and
   contains transparent and visible pixels with an irregular silhouette.
3. All stable IDs are unique and present; the hierarchy has exactly one root,
   valid parents, and no cycle.
4. Anchors are finite and normalized; recovered pivots match their declared
   common-canvas joints.
5. `originalRect`, `trimOffset`, decoded dimensions, and visible alpha bounds
   agree and include at least three different trim sizes and offsets.
6. `sourceCanvas` and `referenceScale` are valid, finite, and used exactly once
   by generic placement and reconstruction.
7. Draw order is unique and deterministic; hair-back < head < hair-front, and
   authored rear/front limb relations hold at every sampled pose.
8. Anatomical left/right IDs and paired track values implement explicit
   mirrored limb semantics.
9. Reconstruction matches the independently authored reference within the
   fixed documented tolerance, and focused mutations prove detection of each
   required failure class.
10. Shoulder, elbow, wrist, hip, knee, and ankle overlap remains above the
    declared minimum across dense samples of all authored animation ranges.
11. Contract-derived Sprite Joint transforms equal evaluator skeleton
    transforms for every part at canonical samples of all four clips.
12. Pause holds the exact pose, Resume advances from it, and Reset restores a
    deeply equal authored local/world Rest Pose at time zero.
13. Core evaluator sources contain no Cocos values; fixture, verifier, adapter,
    scene, and tests contain no Red Cap IDs or correction logic.
14. All Cocos TypeScript is covered by tracked clean-checkout typechecking;
    generated editor directories and machine-local paths are not required.
15. `CI=true pnpm verify` passes in the working copy.
16. After `pnpm install --frozen-lockfile`, `CI=true pnpm verify` passes in a
    tracked-files-only archive checkout.

## Visual acceptance video

Record the real Cocos Web Preview showing, in order:

1. authored reference composite;
2. assembled Rest Pose;
3. reference/assembled overlay;
4. Arm Wave for two loops;
5. Pause and Resume during motion;
6. Walk for three loops;
7. Stress;
8. exact Rest reset;
9. joints, bounds, pivots, links, and layer-label toggles; and
10. skeleton/debug view.

The full character and status text remain visible. The MP4 is ignored local
acceptance evidence and must not be committed.

## Non-goals

- Red Cap reconstruction
- arbitrary artwork Auto Cutter
- IK
- mesh deformation
- root motion or foot locking
- animation blending
- Unity or Godot adapters
- cross-engine compiler
- Windows Editor support
- fighting-game combat logic

## Completion

Commit and push `feat/task-009-layered-character-reference`, do not create a
PR, and stop for manual visual review. Report the commit SHA, test count,
tracked-files-only result, generated asset and reference locations, Cocos
scene and video paths, exact preview controls, reconstruction result and
tolerance, known limitations, and protected archive confirmation.

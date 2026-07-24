# TASK-010: Head Accessory Layering Reference

## Status

Implementation complete, verified from the working copy and a tracked-files-
only archive, committed, and pushed. Work is stopped for manual visual review.
This task must not create a pull request.

## Baseline and branch

- Baseline: `main` at `e240020a18aca15c0f1ec1369c411b624b5bfa6e`
- TASK-009 squash merge:
  `e240020a18aca15c0f1ec1369c411b624b5bfa6e`
- Work branch: `feat/task-010-head-accessory-layering`
- Protected branch: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

The protected branch must not be modified, merged, deleted, or pushed.

## Goal

Extend the exact accepted TASK-009 production-lite character with only a
layered red cap and sunglasses. Prove a reusable, contract-driven attachment
and socket system that can serve multiple characters and projects without
hard-coded Red Cap behavior.

This fixture is not a reconstruction of the original Red Cap character.

## Base-character invariants

Reuse byte-for-byte:

- TASK-009 deterministic body source and all 17 body PNGs;
- `character-rig.json` and `rig-layout.json`;
- Rest/Idle, Arm Wave, Walk Cycle, and Articulation Stress data;
- hierarchy, anchors, rest transforms, draw order, reconstruction semantics,
  reference scale, and evaluator behavior.

Do not redraw, crop, restructure, renumber, or compensate any body part to
make accessories easier.

## Attachment Layout contract

Add a canonical engine-independent `Attachment Layout 1.0` JSON Schema,
TypeScript types, parser, semantic validator, stable diagnostics, and
documentation.

The document binds to a compatible Rig Layout and declares:

### Slots

- `slotId`
- `parentPartId`
- parent-local `position`
- parent-local `rotationDegrees`
- parent-local nonzero `scale`
- `defaultEnabled`

### Attachments

- `attachmentId`
- `slotId`
- safe relative image `file`
- attachment-local `position`
- attachment-local `rotationDegrees`
- attachment-local nonzero `scale`
- normalized `anchor`
- numeric global `drawOrder`
- optional `layerRole`: `back` or `front`

Required slots are:

- `headwear`
- `face-accessory`

Slot resolution, compatibility, transform composition, enabled-state
overrides, and ordering must be generic. Core packages must contain no
cap/sunglasses conditionals, Cocos constants, or original Red Cap IDs.

The contract must reject unsupported versions, incompatible rigs, duplicate
slot or attachment IDs, unknown parent parts, unknown slots, unsafe files,
non-finite/zero transforms, invalid anchors, and duplicate attachment draw
orders.

Existing rigs without an Attachment Layout remain valid and unchanged.

## Accessory artwork

Use a checked-in deterministic generator and editable JSON source description.
Generate actual transparent PNGs:

- `cap-back`
- `cap-front`
- `sunglasses`

The cap must visibly use two controlled layers. Contract order must prove:

```text
hair-back < cap-back < head/face < sunglasses < hair-front < cap-front
```

The cap may contain a crown and brim in `cap-front`; it must not introduce a
jacket, prop, briefcase, facial animation, or original Red Cap pixels.

Sunglasses attach through `face-accessory`, align with the eyes, inherit head
translation/rotation/scale, and can be disabled without changing the rig.

## Deterministic variants and reconstruction

Generate independently authored Rest Pose references for:

1. base character without accessories;
2. cap only;
3. sunglasses only; and
4. cap plus sunglasses.

For every state:

```text
TASK-009 body parts + Attachment Layout + enabled slot state + combined order
→ reconstructed Rest Pose
→ independently authored reference comparison
```

Use a fixed zero tolerance for RGBA mismatch, alpha mismatch, seam mismatch,
and unexpected bounds expansion unless a renderer difference is discovered
and justified before acceptance. Do not weaken tolerances to obtain a pass.

The base variant must byte-match the accepted TASK-009 reference composite.

## Animation

Reuse the existing `@gameai/rig-animation` parser, normalizer, sampler,
playback clock, rest-relative composition, and hierarchy evaluator.

Required clips:

- Rest/Idle
- Arm Wave
- Walk Cycle
- TASK-009 Articulation Stress
- Head Accessory Stress

Head Accessory Stress is data-only and must include controlled head tilt in
both directions, small head rotation, and torso lean. It must demonstrate:

- cap-back and cap-front remain attached;
- sunglasses remain aligned with the eyes;
- attachment transforms exactly inherit the resolved head/slot transform;
- hair/cap/glasses order remains stable; and
- repeated loops accumulate no drift.

Do not add IK, mesh deformation, blending, or another animation runtime.

## Cocos Creator acceptance scene

Add a dedicated Cocos Creator 3.8.x scene showing:

- state-matched authored reference;
- assembled character;
- reference/assembled overlay;
- skeleton/debug hierarchy;
- attachment socket markers;
- attachment bounds and pivot markers;
- combined body/accessory layer labels;
- visible cap/sunglasses state; and
- reconstruction status for the current variant.

Controls:

- Rest, Wave, Walk, Stress, and Accessory Stress;
- Pause/Resume;
- exact Reset;
- cap toggle;
- sunglasses toggle;
- joints, bounds, pivots, links, layers, sockets, and skeleton toggles;
- reference, assembled, and overlay view toggles.

All placement and ordering must come from generated contract data. The scene
must contain no per-accessory compensation table or hidden scene constants.

## Automated acceptance criteria

1. Canonical Attachment Layout schema and distributable copy are byte-equal;
   version compatibility and public diagnostics are tested.
2. Generic parsing accepts the valid fixture and rejects duplicate slots,
   duplicate attachments, unknown slots, unknown parent parts, unsafe paths,
   invalid transforms/anchors, duplicate order, and incompatible rig binding.
3. Generic slot resolution composes parent, slot, and attachment transforms
   deterministically and resolves default/override enabled state without
   mutating inputs.
4. Missing attachment files and path escapes fail closed before rendering.
5. Accessory source description, PNGs, contract, references, reconstruction
   artifacts, reports, Cocos mirror, data, and scene regenerate byte-identically.
6. Every PNG decodes with alpha, contains visible and transparent pixels, and
   matches declared dimensions.
7. Combined order proves the required hair/cap/head/glasses relationship and
   remains stable at dense samples of every clip.
8. Attachment world transforms equal generic parent/slot/local composition;
   head translation, rotation, and scale propagate exactly.
9. Cap and sunglasses enable/disable independently by slot override without
   changing the base rig, clips, or body transforms.
10. All four independently authored references reconstruct with zero RGBA,
    alpha, seam, and bounds-expansion tolerance.
11. The base reference and every reused TASK-009 source/body/layout/clip file
    remain byte-identical to the accepted baseline.
12. Head Accessory Stress is a valid seamless clip and demonstrates head tilt,
    rotation, torso lean, inherited accessories, stable order, and no drift.
13. Sprite, skeleton, socket, and attachment debug transforms share the same
    evaluator sample at canonical times.
14. Pause holds exactly, Resume advances continuously, and Reset restores the
    exact authored Rest Pose, default accessory state, time zero, and stopped
    playback.
15. Core attachment code contains no Cocos imports/constants, cap/sunglasses
    branches, original Red Cap IDs, or per-part correction logic.
16. TASK-007, TASK-008, and TASK-009 fixtures and tests remain compatible.
17. All new Cocos TypeScript is covered by tracked clean-checkout typechecking.
18. `CI=true pnpm verify` passes in the working copy.
19. After `pnpm install --frozen-lockfile`, the same command passes from a
    tracked-files-only archive checkout.

## Visual acceptance video

Record the real Cocos Web Preview showing, in order:

1. base character;
2. cap only;
3. sunglasses only;
4. cap plus sunglasses;
5. reference/assembled overlay;
6. Wave;
7. Walk;
8. Accessory Stress for multiple loops;
9. Pause and Resume during head rotation;
10. exact Reset; and
11. all attachment/debug toggles.

Keep the complete character, accessory state, clip/state/time, reconstruction
status, and relevant debug labels visible. The MP4 is ignored local evidence
and must not be committed.

## Non-goals

- original Red Cap reconstruction or Red Cap-specific corrections
- jacket or clothing-layer changes
- briefcase or handheld prop
- automatic arbitrary accessory fitting
- facial animation
- IK
- mesh deformation
- root motion or foot locking
- animation blending
- Unity or Godot adapters
- cross-engine compiler
- Windows support
- combat logic

## Completion

Commit and push `feat/task-010-head-accessory-layering`, do not create a pull
request, and stop for manual visual review. Report the TASK-009 squash merge
SHA, TASK-010 commit SHA, test count and both verification results, contract
changes, generated assets, four reconstruction results, Cocos scene, ignored
video and controls, known limitations, and protected archive SHA.

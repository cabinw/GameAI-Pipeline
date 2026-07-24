# TASK-008: Simple Sprite Character Bridge

## Status

Complete. Awaiting manual visual review before pull-request creation.

## Baseline and branch

- Baseline: `main` at `e2428149de39cb18288f4696796fafd835e82483`
- Work branch: `feat/task-008-simple-sprite-character`
- Protected branch: `archive/old-task-007-cross-engine` at
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

The protected branch must remain unchanged. This task is pushed only to its
feature branch and stops for manual visual review before pull-request creation.

## Goal

Prove that real transparent PNG body parts can use the TASK-007
engine-independent rig hierarchy, proximal pivots, transform evaluation, and
animation playback correctly before returning to the complex Red Cap
character.

## Fixture

The repository-owned simple mannequin contains exactly these stable part IDs:

- `pelvis`
- `torso`
- `head`
- `upper-arm-left`, `lower-arm-left`, `hand-left`
- `upper-arm-right`, `lower-arm-right`, `hand-right`
- `thigh-left`, `shin-left`, `foot-left`
- `thigh-right`, `shin-right`, `foot-right`

`pelvis` is the single root. Every other part has one direct parent. The
fixture uses only simple flat colors, rounded joint ends, and intentional
joint overlap. It contains no downloaded art, Red Cap asset or assumption,
hat, glasses, jacket layer, prop, or complex occlusion.

The checked-in source generator is the authority for every PNG. Generated PNG
files are also checked in so clean checkouts and Cocos AssetDB can consume
them without a pre-import generation step.

## Contract and architecture

Assembly is described only by these Rig Layout contract fields:

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

The Cocos adapter may perform only general contract-to-node coordinate
conversion. It must not contain per-part correction positions, rotations,
scales, sizes, or pivot constants.

The bridge reuses:

- TASK-007 `validateRigHierarchy` and `evaluateRigPose`;
- the published proximal-pivot and local-to-world transform semantics;
- deterministic absolute-time animation sampling;
- data-only rest/idle, arm-wave, and walk-cycle clips adapted to this rig ID.

No published schema change is required.

## Cocos verification scene

A dedicated Cocos Creator 3.8.x scene must provide:

- real SpriteFrame rendering for all 15 transparent PNG parts;
- sprite view and skeleton/debug view;
- joint markers, sprite bounds, anchor/pivot markers, and parent-child links;
- Rest, Arm Wave, and Walk controls;
- Pause/Resume;
- Reset to the exact authored rest pose;
- visible clip name, playback state, and absolute sample time.

The scene code consumes generated contract-derived data and generic rendering
settings only. Sprite transforms and skeleton/debug transforms share the same
sampled Joint hierarchy.

## Automated acceptance criteria

1. Every declared PNG exists, decodes at the authored dimensions, contains
   transparent and non-transparent pixels, and regenerates byte-identically.
2. The fixture has exactly the required 15 unique IDs, one `pelvis` root,
   valid parents, and no cycle.
3. Every normalized anchor is finite and within `[0,1]`; recovered source
   pivots and contract rest transforms are valid and deterministic.
4. Draw order is unique and produces the same total ordering on every run.
5. At canonical times for all three clips, every Sprite Joint transform equals
   the corresponding TASK-007 evaluator skeleton transform.
6. Left/right limbs use anatomical IDs and explicit mirrored rest/animation
   semantics; paired values have the intended equal or opposite relationship.
7. Declared proximal/distal overlap remains positive for shoulders, elbows,
   wrists, hips, knees, and ankles across the intended clip sample ranges.
8. Pause preserves the exact sampled pose, resume advances from it, and reset
   restores a deeply equal authored local and world rest pose with time zero
   and stopped state.
9. Fixture, generator, bridge, scene, and tests contain no Red Cap IDs, paths,
   asset assumptions, or per-part Cocos correction table.
10. The tracked CI configuration typechecks all new Cocos asset TypeScript and
    contains no generated-directory or developer-machine dependency.
11. `CI=true pnpm verify` passes in the working copy.
12. `CI=true pnpm verify` passes from a tracked-files-only archive checkout.

## Dynamic visual acceptance

Record one local MP4 from the real Cocos Game Preview showing:

```text
Rest → Arm Wave → Pause → Resume → Walk for at least three complete loops
→ Reset → debug overlay toggles
```

Review attachment continuity, proximal pivots, descendant inheritance,
mirrored motion, pause/resume state, loop stability, exact reset, debug
visibility, and absence of console errors. The MP4 is acceptance evidence but
must remain ignored and uncommitted.

## Non-goals

- Red Cap reconstruction
- arbitrary AI-image auto cutting
- IK or mesh deformation
- Unity or Godot adapters
- cross-engine compiler
- combat logic
- Windows Editor support
- production-quality artwork

## Completion

Commit and push `feat/task-008-simple-sprite-character`, but do not create a
pull request. Report the commit SHA, both verification results, exact scene
path and preview instructions, local video path, and known limitations. Stop
for manual visual review.

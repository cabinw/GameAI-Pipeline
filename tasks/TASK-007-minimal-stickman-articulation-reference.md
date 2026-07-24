# TASK-007: Minimal Stickman Articulation Reference

## Status

Complete locally on 2026-07-24; unpushed pending visual review.

## Baseline and branch

- Baseline: `main` at `daa90d4858ab99e80429d77d4f615493f0fcb8cd`
- Work branch: `feat/task-007-stickman-reference`
- Protected branch: `archive/old-task-007-cross-engine`

The protected branch must not be modified, merged, deleted, or pushed by this
task. The completed replacement is committed locally and is not pushed until
its visual result has been reviewed.

## Goal

Prove the rig hierarchy, proximal pivots, rest pose, transform evaluation, and
animation playback using a deliberately simple stickman before returning to
complex characters such as Red Cap.

## Required fixture

The engine-neutral fixture contains exactly these stable part IDs:

- `root`
- `pelvis`
- `torso`
- `head`
- `upper-arm-left`, `lower-arm-left`, `hand-left`
- `upper-arm-right`, `lower-arm-right`, `hand-right`
- `thigh-left`, `shin-left`, `foot-left`
- `thigh-right`, `shin-right`, `foot-right`

Every part has one unambiguous parent (or `null` for `root`), a proximal
pivot/joint, an explicit local rest transform, a unique draw order, and a
stable ID. Visuals use simple generated primitives; no production character
art is required.

## Architecture

- Reuse the engine-neutral Rig Layout 1.0 contract for hierarchy, pivot/rest
  data, draw order, and stable part IDs.
- Reuse the engine-neutral Rig Animation 1.0 contract for clips.
- Keep hierarchy validation, animation sampling, rest-pose composition, and
  local-to-world transform evaluation pure and deterministic.
- Implement only a Cocos Creator 3.8.x adapter and visual demonstration.
- Keep Cocos nodes, components, UUIDs, and engine types outside core data and
  evaluation APIs.

## Required clips

- `stickman-rest-idle`
- `stickman-arm-wave`
- `stickman-walk-cycle`

The walk clip is an articulation test, not production locomotion: it must
exercise mirrored shoulders, hips, elbows, and knees without IK, root motion,
blending, or a state machine.

## Automated acceptance criteria

- The hierarchy validator rejects unknown parents, multiple/missing roots, and
  cycles deterministically.
- Local-to-world evaluation composes translation, rotation, and scale through
  the complete hierarchy.
- Parent rotation moves every descendant around the authored proximal pivot.
- Elbow and knee rotations preserve their joint positions while moving distal
  descendants.
- Linear interpolation and exact loop boundaries are deterministic.
- Repeated sampling produces deeply equal results and byte-stable evidence.
- Mirrored limbs use anatomical left/right IDs and explicit reflected local
  transforms; tests prove equal magnitudes and opposite horizontal semantics.
- Sampling time zero reproduces exact authored local and world rest poses.
- Core evaluator source and fixtures contain no Red Cap-specific assumptions.
- `pnpm verify` passes.

## Cocos visual acceptance criteria

- A dedicated verification scene displays the complete 16-part stickman.
- Rest/idle, arm-wave, and walk-cycle clips are selectable and play correctly.
- The current clip name and playback state are visible.
- Joint markers/debug overlay can be shown while playback continues.
- Parent/descendant motion, shoulder/elbow/hip/knee pivots, mirrored limbs, and
  exact rest restoration are visually inspected in Cocos Creator 3.8.8.
- Scene and Game Preview evidence is captured for all required clips.
- The final report states exactly what was visually inspected.

## Non-goals

- Red Cap reconstruction
- automatic image cutting
- production character art
- Unity or Godot adapters
- cross-engine animation compiler
- advanced IK
- mesh deformation
- fighting-game combat logic

## Verification

```bash
pnpm verify
```

The completed task is committed locally on
`feat/task-007-stickman-reference`; it is not pushed pending visual review.

## Result

- The complete 16-part stickman, three clips, deterministic evaluator/evidence,
  Cocos-only adapter, runtime demonstration, and verification scene are
  implemented.
- The real Creator 3.8.8 Scene view and Web Game Preview were inspected for
  exact rest, idle, wave, walk articulation, pivot placement, descendant
  inheritance, mirrored motion, HUD state, and optional joint markers.
- `pnpm verify` passes all 136 tests.
- Visual evidence and the detailed inspection record are in
  `docs/acceptance/TASK-007-stickman-articulation-reference.md`.

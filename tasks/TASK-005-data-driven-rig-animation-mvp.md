# TASK-005: Data-Driven Rig Animation MVP

## Status

Complete

## Goal

Create a reusable animation-data contract and deterministic Joint-only runtime,
then demonstrate one subtle looping idle on `red-cap-target-remade` in Cocos
Creator 3.8.8.

## Acceptance criteria

- A canonical versioned Rig Animation schema contains identity, compatible rig
  reference/version, duration, loop, Joint/property tracks, keyframe time and
  value, interpolation, and easing.
- Rotation offsets use counter-clockwise degrees in rig reference space.
- Parser and semantic validation fail closed with stable codes for every
  required invalid case.
- Normalized sampling is pure, deterministic, finite, and independent of frame
  rate.
- Position and rotation are additive rest-pose offsets; scale is a
  component-wise multiplier of rest scale.
- Playback never accumulates frame deltas; repeated loops do not drift.
- Stop/reset restores the exact captured/generated rest pose.
- Animation data addresses stable Joint IDs only and contains no Cocos UUID.
- The idle preset subtly animates torso, head, and shoulders/arms, leaves feet
  untracked and planted, and lets the briefcase inherit hand/arm motion.
- Builder Main validates animation before Scene Script mutation and resolves
  the preset through AssetDB.
- The reusable Cocos component supports play, pause, stop, reset, seek, and
  loop, and reports a stable missing-Joint diagnostic.
- Visual nodes, SpriteFrames, draw order, content size, opacity, and calibrated
  offsets remain unchanged.
- Tests cover all required validation, sampling, hierarchy, reset, and
  frame-rate invariants.
- Creator evidence includes rest, intermediate, loop-end, hierarchy, Game
  Preview, and machine-readable sampled transforms.
- Remaining minor static visual issues are documented as non-blocking; no art
  calibration occurs.

## Verification

```bash
pnpm install --frozen-lockfile
CI=true pnpm verify
```

Completed on 2026-07-23 from a recreated dependency tree. All build and
typecheck stages passed, followed by 119/119 tests:

- TASK-000 extension: 4
- Character contracts: 23
- Rig animation: 8
- Character asset intake: 24
- Rig layout generator: 22
- Character Rig Builder: 38

Real Creator acceptance passed under correlation
`task005-1784804936809`; see
`docs/acceptance/TASK-005-red-cap-idle.md`.

## Commit

```text
feat: add data-driven rig idle animation
```

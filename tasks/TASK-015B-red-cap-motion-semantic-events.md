# TASK-015B: Red Cap Motion and Semantic Events

- Status: Blocked by PROGRAM-015 Phase 0 and TASK-015A
- Parent: PROGRAM-015
- Budget: 24 files, 6,000 changed lines, no new PNG, 1 modified
  Scene/`.meta` pair, zero feature media

## Objective

Author the locked `Rest`, `Idle`, `Walk`, and `Wave` rigid-sprite clips and
Program semantic-event documents without changing published Character
Semantic Events semantics.

## Acceptance criteria

- Sampling at 60 Hz is byte-stable and loop boundaries are continuous.
- Walk foot contacts have at most 2 px vertical error and 3 px sliding over
  each contact interval.
- Joint exposure and seams pass every sampled frame; hand socket error is at
  most 2 px.
- Semantic boundaries, skipped frames, multi-loop advances, persistent
  cleanup, track switching, Pause/Resume, Reset, rebuild, disable/destroy,
  and fault injection pass.
- Creator runs every clip, two rebuilds, post-rebuild playback, Transform
  Stress, Exact Reset, clean hold, and a warning/error-free console.

## Exclusions

No IK, blending, root motion, retargeting, hit state, or public schema/runtime
semantic change.

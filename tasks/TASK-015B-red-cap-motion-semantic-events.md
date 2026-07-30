# TASK-015B: Red Cap Motion and Semantic Events

- Status: Accepted
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

## Declared implementation scope

At most 21 changed files and 6,000 changed lines: four Program status and
acceptance documents, one deterministic generator, one package script entry,
four clip documents, one semantic-event document, one generated motion report,
generated Cocos data and component files with Creator-owned metadata, one
motion Scene/`.meta` pair, and three existing package test files. Zero PNG,
audio, or video files are added or modified.

## Acceptance result

Accepted on 2026-07-30 at 21 files and 3,246 changed lines, with zero PNG,
audio, video, public schema, or runtime semantic changes.

- `Rest`, `Idle`, `Walk`, and `Wave` parse and sample byte-stably at 60 Hz;
  every loop endpoint is continuous.
- Locked contact intervals measure 0 px vertical error and 0 px sliding;
  the parented left-grip socket measures 0 px error.
- Program semantic events pass boundary, skipped-frame, multi-loop,
  pause/resume, track-switch, Exact Reset, persistent cleanup coverage,
  dispose, and invalid-track gates.
- Creator 3.8.8 ran all four clips, semantic emit/start/stop, Pause/Resume,
  Transform Stress, debug projection, two consecutive rebuilds,
  post-rebuild Walk, Exact Reset, and all nine injected failure points.
- Final Creator state is one root, 19 targets, 19 renderers, Rest at time 0,
  `STOPPED`, no active semantic instance, stress/debug off, and no unexpected
  warning/error in the final clean load.
- Targeted package tests, Cocos typecheck/tests, diff checks, deterministic
  regeneration, and `CI=true pnpm verify` pass.

# TASK-014A: Engine-Neutral Character Semantic Event Contract

- Status: Complete
- Date: 2026-07-26
- Branch: `feat/task-014a-semantic-event-contract`
- Baseline: `f3ff419522a4d65305b7a20a88a40b26c7084903`
- Release baseline: `v0.2.0`
- Automated baseline: 349/349 tests
- Expected budget: at most 30 files and 6,000 lines; zero binary/generated
  asset, Scene, `.meta`, runtime-evidence, or Cocos files

## Objective

Create the versioned engine-neutral semantic-event and VFX-cue contract,
stable validation, deterministic animation-timeline evaluator, small textual
fixtures, tests, and documentation described by RFC-0014 and ADR-0015.

## In scope

- `vfx`, `audio`, and `gameplay` event kinds with typed payloads
- generic transforms, layer roles, follow policies, lifecycles, durations,
  semantic cue IDs, and VFX cue definitions
- validation against semantic clip IDs and Rig Layout socket IDs
- normal forward `(previousTime, currentTime]` evaluation
- skipped frames, loops, pause/resume, exact reset, clip switching, and replay
- explicit zero and duration boundary behavior

## Out of scope

Cocos or other engine runtimes, Creator Scenes, particles, VFX/audio images or
files, gameplay execution, Full Loadout integration, changes to accepted
TASK-013/R1-R7 behavior, TASK-014B, reverse playback, arbitrary seek, network
synchronization, and gameplay-triggered injection.

## Acceptance criteria

- [x] Canonical JSON Schema and exported TypeScript discriminated unions agree.
- [x] Semantic event and VFX cue definition remain distinct and engine neutral.
- [x] Required fields, typed payloads, and all stable error codes are tested.
- [x] Validation completes successfully before evaluator creation.
- [x] Same-time events order by time, order, and event ID.
- [x] Skipped-frame, one-loop, and multiple-loop crossings emit exactly once.
- [x] Pause/Resume, Exact Reset, clip switching, and replay follow RFC-0014.
- [x] Time-zero and exact-duration policies are documented and tested.
- [x] Non-finite/reverse deltas and arbitrary seek fail explicitly.
- [x] Valid fixtures contain footstep dust, hand swing trail, hit-active
  gameplay, and one audio cue.
- [x] Negative textual fixtures cover duplicate event, unknown socket,
  outside time, invalid lifecycle, invalid transform, and unsupported version.
- [x] No engine rendering test or visual-effect claim is present.
- [x] `CI=true pnpm verify` passes and the diff remains inside budget.

## Result

- Added Character Semantic Events schema 1.0 and the engine-neutral
  `@gameai/character-semantic-events` package.
- Added 11 focused tests; the complete repository gate passes 360/360 tests.
- Final scope is 29 changed files and approximately 4,150 changed lines, with
  zero binary/generated asset, Cocos, Scene, `.meta`, or evidence files.
- No Cocos VFX runtime exists and no visual effect was rendered.

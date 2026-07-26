# TASK-014A: Engine-Neutral Character Semantic Event Contract

- Status: Complete
- Date: 2026-07-26
- Branch: `feat/task-014a-semantic-event-contract`
- Integration baseline: `e1abc595c7cfcb95cc372e8a5b13de1fd7f8d49a`
- Release baseline: `v0.2.0`
- Release baseline commit: `f3ff419522a4d65305b7a20a88a40b26c7084903`
- Automated baseline: 352/352 tests
- Expected remediated budget: at most 45 files and 8,000 lines; zero binary/generated
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
- [x] Direct evaluator inputs share schema and semantic validation with the
  parser and fail closed.
- [x] Evaluator creation requires an explicit validated initial track.
- [x] Accumulated-time overflow and cycle/command budget rejection occur
  before evaluator state mutation.
- [x] Looping/persistent VFX expose stable start/stop identities and
  deterministic reset, switch, and disposal cleanup.
- [x] Gameplay windows require valid IDs and reject unmatched, duplicate, or
  unclosed track-local pairs; signals forbid window IDs.
- [x] Valid fixtures contain footstep dust, hand swing trail, hit-active
  gameplay, and one audio cue.
- [x] Negative textual fixtures cover duplicate event, unknown socket,
  outside time, invalid lifecycle, invalid transform, and unsupported version.
- [x] No engine rendering test or visual-effect claim is present.
- [x] `CI=true pnpm verify` passes and the diff remains inside budget.

## Result

- Added Character Semantic Events schema 1.0 and the engine-neutral
  `@gameai/character-semantic-events` package.
- Added 16 focused tests; working-copy and frozen tracked-files-only
  verification each pass 368/368 tests after the infrastructure-fix rebase.
- Final measured scope is 35 changed files, 3,258 insertions, and 6 deletions;
  exact publication totals come from the final commit diff. There are zero
  binary/generated asset, Cocos, Scene, `.meta`, or evidence files.
- No Cocos VFX runtime exists and no visual effect was rendered.

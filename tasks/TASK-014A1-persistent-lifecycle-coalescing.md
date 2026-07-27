# TASK-014A1: Persistent Lifecycle Coalescing

- Status: Accepted
- Date: 2026-07-27
- Branch: `fix/task-014a1-persistent-lifecycle-coalescing`
- Baseline: `1ab573e4b99d6c04973dc62803c5c2579c56e4a9`
- Parent contract: Character Semantic Events 1.0 / TASK-014A
- Expected budget: at most 12 files and 1,500 changed lines; text and
  engine-neutral TypeScript only

## Objective

Correct the Character Semantic Events 1.0 evaluator so a persistent VFX event
owns one logical active instance per track/event across animation loops,
instead of creating one active instance per cycle.

## Corrected lifecycle behavior

- `one-shot`: emit at every authored crossing.
- `looping`: start and duration-stop for every authored cycle.
- `persistent`: start only when the same `<trackId>:<eventId>` has no active
  persistent instance.
- The concrete persistent instance ID retains the first actual start cycle:
  `<trackId>:<eventId>:<startCycle>`.
- Later loops do not emit another start or replace that instance ID.
- Exact Reset, track switch, and disposal clean each active persistent
  instance exactly once. Playback after cleanup may start it again.

This is a correction to evaluator behavior within schema 1.0. It adds no
schema field or schema version.

## Acceptance criteria

- [x] Six crossed cycles emit exactly one persistent start and leave one
  active instance.
- [x] Pause/Resume across more cycles preserves that one instance.
- [x] One `advance()` crossing many cycles still emits one start.
- [x] Exact Reset emits one stop, clears the instance, and restores stopped
  time zero.
- [x] Replay after Reset starts once again.
- [x] Track switch emits one old-track stop and leaves no old-track instance.
- [x] Switching back permits one new start.
- [x] First dispose emits one stop; repeated dispose emits nothing.
- [x] Two distinct persistent event IDs create two independent instances.
- [x] Persistent identities do not coalesce across tracks.
- [x] Looping lifecycle remains per cycle.
- [x] One-shot lifecycle remains per authored crossing.
- [x] Stop-before-start and exact-duration ordering remain unchanged.
- [x] Rejected overflow/budget advancement does not mutate persistent state.
- [x] An adapter-like six-cycle Aura reproduction ends with active count one.
- [x] Direct package tests and both full verification modes pass.
- [x] Canonical/package schema bytes, generated-output closure, and the
  metadata-race regression pass.
- [x] No Cocos, Scene, `.meta`, adapter, schema, binary, media, evidence,
  TASK-014B, TASK-014C, release-tag, or protected-reference change exists.

## Verification

- External acceptance: PASS on 2026-07-27.
- Accepted implementation:
  `ae66de71dd99e5a899a2f1cae9e0a9c3726a58fc`.
- Direct semantic-event package tests: 24/24 PASS.
- Final working-copy verification: 376/376 PASS.
- Tracked-files-only frozen-install verification: 376/376 PASS.
- Canonical/package schema bytes: identical.
- Generated-output closure and Cocos Scene metadata-race regression: PASS.
- Tracked MP4 count: zero.

## Acceptance

All acceptance criteria and external review passed. PR #13 is approved for
squash integration into `main` with no Cocos, schema, binary, media,
TASK-014B, or TASK-014C scope.

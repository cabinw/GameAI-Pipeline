# TASK-015D1 — Review Contracts & Core

## Status

Complete.

## Scope budget

At most 36 changed files and 7,500 changed lines. Text, TypeScript, JSON Schema,
and textual JSON fixtures only. Zero Cocos runtime mutation, Scene, `.meta`,
binary, media, evidence, package-version, tag, or Release changes. One
mechanical lockfile importer for the new workspace package is allowed; it may
not change any resolved third-party version.

The original estimate was 32 files. Before the D1 commit gate it was raised by
four files so the pre-existing review-editor design seed remains a visible,
tracked input and the two requested architectural decisions remain separate
ADRs. The D1 result is 34 files and 3,661 changed lines; the program-wide
85-file ceiling remains unchanged.

## Goal

Add the versioned engine-neutral contracts and deterministic core required to
describe an animation review subject, compute review metrics, generate
structured findings/checklist items, preserve decisions and revisions, and
exchange correlated commands/snapshots with an engine adapter.

## Acceptance criteria

- Canonical Review Document 1.0 and Engine Adapter Protocol 1.0 schemas exist
  under `schemas/` and package copies are byte-identical.
- Public discriminated TypeScript types cover subjects, metrics, findings,
  checklist items, decisions, adjustments, audit entries, adapter requests,
  responses, playback, overlays, parts, keyframes, and snapshots.
- Parsing and semantic validation fail closed with stable diagnostics for JSON,
  schema, version, identity, revision, finding/checklist references, decision
  transitions, adjustment values, protocol commands, and payloads.
- Analysis is deterministic, engine neutral, immutable, array-order stable,
  and reports loop continuity, keyframe/track coverage, rotation range,
  speed, and validation checklist results without rendering inference.
- Review creation and serialization return byte-identical output for the same
  caller-supplied IDs/timestamps and never mutate the input animation.
- Valid and invalid textual fixtures plus direct tests cover every public D1
  diagnostic and contract synchronization.
- Documentation records capabilities and explicit limits. No Cocos, browser,
  service, cloud AI, source overwrite, TASK-014D4, or TASK-016 behavior is
  implemented in D1.
- Focused package checks and complete `CI=true pnpm verify` pass before the D1
  commit is created.

## Result

- Review Document 1.0 and Engine Adapter Protocol 1.0 canonical schemas,
  package copies, discriminated types, parsers, stable diagnostics, analyzer,
  immutable review state, correlated protocol validation, fixtures, and tests
  are implemented.
- `CI=true pnpm --filter @gameai/animation-review-core test`: 7/7 PASS.
- `CI=true pnpm verify`: 515/515 PASS.
- Canonical/package schema copies are byte-identical and the lockfile changes
  only by one workspace importer using existing resolved versions.
- D1 changes 34 text/source files and 3,661 lines, modifies no Cocos runtime,
  Scene, `.meta`, accepted asset, binary, media, tag, Release, or protected
  reference, and keeps the tracked MP4 count at zero.

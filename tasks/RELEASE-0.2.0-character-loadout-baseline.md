# RELEASE-0.2.0: Character Loadout Baseline Closeout

## Objective

Create the durable documentation baseline for the completed v0.2.0 Character
Loadout milestone after TASK-013R7 merged to `main` at
`2e6f54191f4eff7f2699bda24336c1ada8cff35a`.

This task records existing accepted behavior. It introduces no runtime
capability and creates no Git tag or GitHub Release.

## Scope

- Declared budget: 10 documentation files and no generated outputs.
- summarize current Character Pipeline capability and canonical V2 entry
  points;
- record the engine-neutral contract → resolver → derived Cocos plan
  architecture;
- close the TASK-013/R1-R7 recovery and v0.2.0 roadmap milestone;
- add the v0.2.0 changelog, release baseline, compatibility matrix, and
  documentation index;
- append the postmortem resolution without rewriting its historical analysis;
- document lightweight PR-size, generated-output, recovery-promotion, and
  acceptance-boundary policy; and
- verify the documentation from working-copy and tracked-files-only inputs.

## Required files

- `AGENTS.md`
- `README.md`
- `ROADMAP.md`
- `PLANS.md`
- `CHANGELOG.md`
- `docs/releases/v0.2.0-character-loadout-baseline.md`
- `docs/compatibility.md`
- `docs/index.md`
- `docs/postmortems/TASK-013-cocos-runtime-integration.md`
- `tasks/RELEASE-0.2.0-character-loadout-baseline.md`

## Non-goals

No runtime code, schema, resolver, generator, fixture, Scene, asset, package
version, lockfile, test, TASK-014 implementation, semantic-event contract,
VFX runtime, Unity adapter, Godot adapter, Windows validation, Red Cap
reconstruction, Git tag, GitHub Release, PR readiness, or merge.

## Acceptance

- Current and tracked-files-only `CI=true pnpm verify` both pass 349/349.
- `git diff --check` passes.
- Every new relative Markdown link and repository path resolves.
- Verification changes no tracked generated output.
- The diff contains only the required documentation files.
- No MP4 is tracked.
- Protected recovery, evidence, frozen TASK-013, and archive references remain
  unchanged.
- A single Draft PR titled
  `docs: establish v0.2.0 character loadout baseline` targets `main`.
- `v0.2.0` and a GitHub Release do not exist, and TASK-014 has not started.

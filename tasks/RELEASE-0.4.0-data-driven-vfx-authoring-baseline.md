# RELEASE-0.4.0: Data-Driven VFX Authoring Baseline

- Status: Implemented — Draft PR pending review
- Date: 2026-07-30
- Branch: `docs/release-v0.4.0-data-driven-vfx-authoring`
- Baseline `main`: `9c3fb8ed55f18967b13f82d59a1e46cc016a12a7`
- Release type: prerelease framework baseline
- Expected scope: at most 13 Markdown files and 3,000 changed lines
- Runtime/schema/test/fixture/generated/Scene/package/lockfile/media budget:
  zero

## Objective

Document the accepted TASK-014D1–D3 chain:

```text
VFX Authoring Document
→ deterministic compiler
→ concrete Render Plan
→ shared Cocos adapter/runtime
→ canonical full-loadout integration
→ Creator lifecycle/spatial/visual acceptance
```

This task records accepted behavior. It does not create the `v0.4.0` tag or a
GitHub Release, change prior tags/releases, or start TASK-014D4.

## Accepted inputs

- TASK-014D1 through PR #17 at
  `ae5fb4ef7a68a20706485741ab352a6037d25f12`
- TASK-014D2 through PR #18 at
  `dc6dad52d4a40714d6e3f12352d5593763655c55`
- TASK-014D3 through PR #19 at
  `9c3fb8ed55f18967b13f82d59a1e46cc016a12a7`
- Cocos Creator 3.8.8 macOS runtime, fault, spatial, and visual acceptance
- 491/491 working-copy and tracked-files-only verification

## Documentation scope

- Add the v0.4.0 release baseline and this release task.
- Update current-facing README, changelog, roadmap, plan, index,
  compatibility, character-contract, and animation documentation.
- Correct only the current integration status of TASK-014D1, TASK-014D2, and
  TASK-014D3; preserve their historical task boundaries.
- Preserve v0.2.0, v0.3.0, accepted/recovery/backup/archive references and all
  implementation bytes.

## Acceptance criteria

- [x] D1 documents the engine-neutral schema, deterministic compiler,
      concrete Render Plan, canonical ticks/time, curves, parameters,
      randomness, and budgets.
- [x] D2 documents typed primitive/recipe/blend dispatch, exact sampler
      reuse, transactional ownership/cleanup, sorting, viewport, rebuild,
      retry, and Exact Reset.
- [x] D3 documents the 12-state canonical loadout, prop/clip/target rebind,
      Dust, Hand/Tool Trail, Aura, Combined, actual disable/destroy lifecycle,
      early partial-build compensation, Creator fault matrix, and visual
      acceptance.
- [x] The prerelease positioning and procedural/reference-art boundary are
      explicit.
- [x] Audio/gameplay execution, Unity/Godot/Windows verification, Red Cap,
      AI asset generation, complete editor UI, and TASK-014D4 remain explicit
      limitations.
- [x] Current-facing status and release statements are consistent.
- [x] The change remains Markdown-only, inside the declared scope, and tracks
      no media.

## Verification gate

- Documentation-only changed-file and allowed-path audit
- Markdown relative-link and repository-path validation
- Stale-status and release-consistency audit
- `git diff --check`
- Working-copy `CI=true pnpm verify`
- Fresh frozen tracked-files-only install and `CI=true pnpm verify`
- Generated-output and post-verify tracked-content closure
- Tracked-MP4, binary/media/evidence, runtime/code, TASK-014D4, and protected
  reference audits
- Draft PR GitHub Actions PASS

## Publication boundary

Commit the documentation with:

```text
docs: establish v0.4.0 data-driven VFX authoring baseline
```

Publish only a Draft PR into `main`. Do not mark it Ready, merge it, create or
move a tag, publish a GitHub Release, delete protected references, or start
TASK-014D4.

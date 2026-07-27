# RELEASE-0.3.0: Character Semantic Events & VFX Baseline

- Status: Implemented — Draft PR pending review
- Date: 2026-07-28
- Branch: `docs/release-v0.3.0-semantic-vfx`
- Baseline `main`: `5c3baba4062bd529bb6bd4b787b8c391452ee459`
- Release type: prerelease framework baseline
- Expected scope: at most 12 documentation files and 2,500 changed lines

## Objective

Create the documentation closeout for the first accepted GameAI Pipeline
baseline in which one engine-neutral semantic event stream drives
deterministic visible effects on a canonical composable character across
loadout, prop, animation, transform, rebuild, and Exact Reset boundaries.

This task records accepted behavior. It does not create the `v0.3.0` tag or
GitHub Release and does not implement TASK-014D.

## Accepted inputs

- v0.2.0 canonical 12-state Character Loadout Baseline
- TASK-014A Character Semantic Events 1.0
- TASK-014A1 persistent lifecycle coalescing
- TASK-014B Cocos Semantic VFX Adapter
- TASK-014C canonical full-loadout Semantic VFX integration
- Cocos Creator 3.8.8 macOS runtime and visual acceptance
- 414/414 working-copy and tracked-files-only verification

## Documentation scope

- Add the v0.3.0 release baseline and this release task.
- Update current-facing README, roadmap, changelog, documentation index,
  compatibility, contract, animation, TASK-014C, and v0.2.0 release status.
- Preserve historically correct statements about the scope and limitations
  of older tasks at the time they were accepted.
- Recommend TASK-014D only as future work.

## Acceptance criteria

- [x] The authoritative contract-to-Creator architecture is documented.
- [x] VFX, audio, and gameplay contract kinds are distinguished from the
      implemented Cocos-VFX-only runtime.
- [x] One-shot, looping, persistent-coalesced, Pause/Resume, track-switch,
      Exact Reset, rebuild, and disposal semantics are documented.
- [x] All 12 loadout states, no/left/right prop behavior, semantic targets,
      and deterministic target re-resolution are documented.
- [x] Footstep Dust, Wave/Prop Trail, and Persistent Aura are identified as
      accepted procedural placeholder effects.
- [x] Single-root/input, duplicate/unknown/leak/stale, finite-transform,
      viewport, rebuild, and Reset guarantees are documented.
- [x] The 414/414 verification baseline, Creator 3.8.8 macOS acceptance,
      external visual review PASS, and zero tracked media are recorded.
- [x] Current limitations and non-goals are explicit and do not overstate
      production readiness or cross-engine support.
- [x] TASK-014D is described only as the next proposed capability.
- [x] The change remains documentation-only and within budget.

## Verification gate

- Markdown relative-link and repository-path validation
- Release-document consistency checks
- Current-facing stale-statement search with historical records preserved
- `git diff --check`
- Working-copy `CI=true pnpm verify`
- Frozen tracked-files-only install and `CI=true pnpm verify`
- Post-verify tracked-content closure
- Documentation-only changed-file audit
- Binary/media and tracked-MP4 audits
- Draft PR GitHub Actions PASS

## Publication boundary

Commit the documentation with:

```text
docs: establish v0.3.0 semantic events and VFX baseline
```

Publish only a Draft PR into `main`. Do not mark Ready, merge, create a tag or
Release, modify v0.2.0 references, delete recovery/backup references, or start
TASK-014D.

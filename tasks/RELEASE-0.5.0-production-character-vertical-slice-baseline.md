# RELEASE-0.5.0: Production Character Vertical Slice Baseline

- Status: Accepted publication task
- Date: 2026-07-31
- Branch: `docs/release-v0.5.0-production-character-vertical-slice`
- Exact baseline: `e24e6d8bb4ee7d9581787814c858a3f4f1dc410e`
- Release type: published prerelease baseline

## Objective

Close and publish the accepted production-character path as v0.5.0 without
changing runtime, assets, generated outputs, tests, schemas, packages, CI, or
PROGRAM-015 rights/provenance.

## Scope

- At most 14 Markdown files and 1,500 changed lines.
- Existing current-facing release, roadmap, compatibility, PROGRAM-015, and
  Local Experimental Asset Mode documentation may be reconciled.
- Add one v0.5.0 release baseline and this release task.
- Runtime, schema, resolver, compiler, sampler, generator, tests, fixtures,
  generated outputs, PNG, Scene, `.meta`, binary, media, MP4, package,
  lockfile, and CI changes are prohibited.

## Required baseline

```text
source authority and asset intake
→ deterministic layered asset generation
→ production character joint hierarchy
→ Rest / Idle / Walk / Wave runtime animation
→ semantic events and concrete VFX Render Plans
→ shared Cocos renderer/runtime
→ Creator lifecycle, rebuild, reset and spatial validation
→ production vertical-slice acceptance
```

The release records:

1. PROGRAM-015 accepted and integrated through PR #22.
2. A 19-part Red Cap hierarchy with Rest, Idle, Walk, and Wave.
3. Foot contact, hand target/socket following, Dust, Trail, Aura,
   Pause/Resume, Stress/Debug, two rebuilds, Exact Reset, and clean hold.
4. Zero relevant Creator/Preview application warnings or errors.
5. CI FFmpeg/ffprobe installation and structural Sharp PNG publication-race
   remediation.
6. Local Experimental Asset Mode and its pre-staging Repository Candidate
   promotion gate.
7. Cocos Creator 3.8.8/macOS as the verified live environment.
8. Windows, Unity, Godot, audio/gameplay execution, and a complete production
   editor UI as unverified or unimplemented.
9. TASK-015D, TASK-014D4, and any two-character fighting experiment as not
   started.

## Publication boundary

- Commit and PR title:
  `docs: establish v0.5.0 production character vertical slice baseline`.
- Draft PR must target `main`, contain only the authorized Markdown scope,
  pass exact-head Actions, and have no requested changes or unresolved
  threads.
- Merge method is squash with the exact title above.
- Annotated tag `v0.5.0` is created once, only after exact-squash main CI
  passes, with message:
  `v0.5.0 — Production Character Vertical Slice Baseline`.
- GitHub Release uses the same title, is published as a prerelease, is not a
  draft, and has zero assets.
- Existing v0.2.0–v0.4.0 tags/releases must not move or change.
- The remote documentation branch is deleted after publication; its local
  final pre-merge ref, backup, fix, recovery, and archive refs remain.

## Acceptance criteria

- [x] Initial main, rights/provenance, prior tags/releases, backup, and fix
      refs match the locked baseline.
- [x] Final diff is Markdown-only and within 14 files / 1,500 changed lines.
- [x] Changed and repository-wide Markdown link checks pass.
- [x] Release/status consistency and stale current-facing claim audits pass.
- [x] `git diff --check` passes.
- [x] Working-copy `CI=true pnpm verify` passes.
- [x] Fresh tracked-files-only frozen install and verify pass.
- [x] Generated-output and post-verify clean/content closure pass.
- [x] Tracked MP4 and binary/media/evidence/artifact audits pass.
- [x] PROGRAM-015 implementation, rights, and provenance remain byte-identical.
- [x] TASK-015D and TASK-014D4 remain unstarted.
- [ ] Draft PR exact-head Actions pass and review state is clean.
- [ ] Squash/main exact-SHA Actions pass.
- [ ] Local and remote annotated tag peel to the exact squash/main commit.
- [ ] Published GitHub prerelease has the exact title and zero assets.

## Known limitations

v0.5.0 is a prerelease production-character vertical-slice baseline, not a
complete commercial game or general art-production system. Windows is not
formally verified. Unity/Godot adapters, real audio/gameplay execution, and a
complete production editor UI are absent. Local Experimental Assets are
ineligible for repository publication until promoted and audited.

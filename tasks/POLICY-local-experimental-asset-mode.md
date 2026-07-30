# Policy: Local Experimental Asset Mode

- Status: Implementation and local verification complete; Draft publication pending
- Date: 2026-07-31
- Branch: `policy/local-experimental-asset-mode`
- Exact baseline: `61d4e443dcabe2a74b75f07498c4de6886875a6f`

## Goal

Allow disposable image, audio, video, generated-asset, Creator, runtime, and
visual-validation experiments to remain local without weakening the
repository publication controls applied to tracked assets and their direct
derivatives.

## Scope

- At most 8 changed files and 1,200 changed lines.
- Documentation, one ignore rule, one text-only policy test, and the existing
  CI workflow are in scope.
- Binary, media, runtime, schema, resolver, compiler, sampler, generator,
  package, lockfile, accepted asset, Scene, `.meta`, rights, provenance,
  evidence, Tag, Release, backup, recovery, and archive changes are out of
  scope.
- This policy is prospective. It does not revoke, reinterpret, or replace any
  accepted PROGRAM-015 rights/provenance record.

## Required policy

1. `artifacts/experimental/<experiment-id>/` is the only standard directory
   for Local Experimental Assets and everything derived directly from them.
2. The directory stays ignored and untracked. It is never staged, committed,
   pushed, uploaded to an evidence branch, attached to a PR, or published in
   a Tag or Release.
3. Local-only experiments may omit repository publication rights/provenance
   records, but no ownership, commercial-use, or redistribution claim follows.
4. Promotion begins before Git staging. A Repository Candidate remains
   local-only until rights/provenance, privacy, security, redistribution,
   dependency, generated-closure, binary/media, and budget audits pass.
5. Only an Accepted Repository Asset may enter Git. A clean tracked-files-only
   checkout must install, generate, and test without ignored experimental
   inputs.
6. Tracked code, fixtures, generators, manifests, Scenes, tests, and CI must
   not require, inspect, enumerate, hash, log, or upload the ignored directory.
7. CI and remote PR checks use only public, programmatic, synthetic, or
   already accepted fixtures. Local experimental recordings are never a
   required remote-check input.

## Acceptance criteria

- [x] `.gitignore` ignores
      `artifacts/experimental/<experiment-id>/` recursively.
- [x] `git check-ignore artifacts/experimental/example/input.png` succeeds.
- [x] `git ls-files artifacts/experimental` returns no entries.
- [x] Repository documentation defines Local Experimental Asset, Repository
      Candidate, Accepted Repository Asset, and the pre-staging promotion gate.
- [x] The focused test uses path/index queries only and does not create or
      inspect any experimental file.
- [x] Working-copy and frozen tracked-files-only `CI=true pnpm verify` pass.
- [x] Markdown links, generated-output closure, whitespace, post-verify
      content, and binary/media audits pass.
- [x] The final change stays within 8 files and 1,200 changed lines and adds
      zero binary or media files.
- [x] PROGRAM-015 accepted bytes, rights/provenance hashes, protected refs,
      Tags, and Releases remain unchanged.
- [ ] The branch is published as a Draft PR and remains unmerged.

## Local verification record

- Focused path/index-only policy test: PASS.
- Working-copy and fresh frozen tracked-files-only workspace: 508/508 PASS
  in each environment.
- `artifacts/experimental/example/input.png`: ignored; tracked paths below
  `artifacts/experimental/`: 0.
- Changed scope: 8 text files, below 1,200 changed lines; binary, media, PNG,
  Scene, `.meta`, runtime, schema, generator, package, and lockfile changes: 0.
- PROGRAM-015, rights/provenance, generated outputs, protected refs, Tags, and
  Releases: unchanged.

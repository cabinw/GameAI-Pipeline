# Fix: Sharp Empty-Buffer Generation Race Regression

- Status: Implementation and local verification complete; publication pending
- Date: 2026-07-31
- Branch: `fix/sharp-empty-buffer-generation-race-regression`
- Exact baseline: `555f0b8e34affff0942ea0785dec5ce041440ae2`

## Problem

The historical atomic-publication repair covered the production-lite base
character and full-loadout writers, but sibling head-accessory, garment, and
one-handed-prop generator tests still invoked scripts with default tracked
output roots. Those generators and their reconstruction verifiers published
PNG and JSON outputs with direct `writeFile`.

Node runs package test files concurrently. The full-loadout generator reads
garment and prop attachment PNGs from those same tracked roots, so it can
observe a file after truncate and before the complete replacement buffer has
been written. Sharp then receives a zero-byte buffer and throws
`Input Buffer is empty`.

## Required repair

1. Tracked fixture inputs remain read-only during every generator test.
2. Each generator uses a complete, unique temporary input snapshot plus
   independent fixture and Cocos output roots.
3. Snapshots include the required source JSON, base-part PNGs, layouts,
   animations, attachments, and `source/character-source.json`.
4. Related generators and reconstruction verifiers publish through the
   existing same-directory atomic writer: unique temporary file, complete
   write, sync, close, rename, and failure cleanup.
5. Full-loadout readers never read a path written by another concurrent test.
6. Explicit promise barriers preserve concurrent dual-generator scheduling
   without retry, sleep, serialization, or reduced concurrency.
7. Regressions prove readers see only complete PNG signatures with valid
   Sharp metadata and atomic readers see either the complete old or complete
   new file.

## Scope

- At most 14 changed files and 2,000 changed lines.
- Generator/verifier root isolation, generator tests, this task, and
  `PLANS.md` are in scope.
- Binary, PNG, Scene, `.meta`, PROGRAM-015 runtime/asset/semantic, rights, and
  project provenance changes are prohibited.
- If a generator self-hash is an accepted provenance input, only the exact
  dependent field and direct mirror may change. No such dependency is
  expected for the affected family generators.

## Acceptance criteria

- [x] Focused atomic, concurrency, and generator-isolation tests pass.
- [x] Character asset-intake package tests pass three consecutive times with
      real concurrent file scheduling.
- [x] Tracked input hashes remain unchanged.
- [x] Accepted PNG and all non-provenance outputs remain byte-identical.
- [x] Fixture and Cocos mirrors remain deterministic and identical.
- [x] Working-copy and frozen tracked-files-only `CI=true pnpm verify` pass.
- [x] Generated-output, temp cleanup, Markdown-link, whitespace, binary/media,
      tracked-MP4, and post-verify clean-content gates pass.
- [ ] GitHub Actions passes before and after squash merge.

## Local verification record

- Focused atomic/concurrency/isolation selection: 6/6 PASS.
- Character asset-intake package: 75/75 PASS in each of three consecutive
  runs with the normal test-file concurrency.
- Complete workspace: 508/508 PASS in the working copy and in a fresh
  tracked-files-only checkout after a frozen install.
- Changed scope: 13 text files, 0 binary/media files, 0 PNG files, 0
  Scene/`.meta` files.
- Accepted fixture/Cocos closure, tracked PNGs, PROGRAM-015, rights, and
  provenance: byte-identical to the exact baseline.
- Direct PNG publication, temporary-file cleanup, Markdown relative links,
  whitespace, tracked MP4, and post-verify content closure: PASS.

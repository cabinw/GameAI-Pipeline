# Sharp PNG Atomic Generation Fix

- Status: Implemented and verified
- Date: 2026-07-30
- Branch: `fix/sharp-empty-buffer-generation-race`
- Exact baseline: `68444551b9b160a2455a97a2d8bf611aea608c6e`

## Problem

The production-lite character generator publishes tracked PNGs with direct
`writeFile`. A concurrent full-loadout reader can observe the target after
truncate and before the complete PNG is written, yielding a zero-byte Buffer
and Sharp `Input Buffer is empty`.

## Acceptance criteria

1. Generators support explicit isolated output roots and tests never overwrite
   tracked source PNGs.
2. PNG and other generated files publish through the existing same-directory
   write, sync, close, and atomic-rename implementation.
3. A synchronized writer/reader regression proves readers observe only the
   previous or next complete PNG with valid signature and Sharp metadata.
4. Successful and failed publication leave no temporary files.
5. Repeated and concurrent generation preserves every non-provenance accepted
   output byte and strict generated-output closure.
6. Complete package and workspace verification remains fully concurrent.

## Scope

- At most 12 changed files and 1,500 changed lines.
- Zero binary, PNG, Scene, `.meta`, runtime, schema, PROGRAM-015, package, or
  lockfile changes. The only accepted generated changes are the fixture and
  Cocos `authoring-provenance.json` mirrors.
- No retry, sleep, test serialization, concurrency reduction, swallowed
  errors, fallback images, or timeout changes.

## Provenance closure

The original byte-identity gate was contradictory because the generated
provenance records the generator's own SHA-256. The baseline generator SHA was
`e3ded341b516b22602c87bee83fb95e87efa45050984b395555418270460cf47`.
An intermediate implementation produced generator SHA `ab46f05c…` and
provenance SHA
`e8b22d27dbeab3329eec6d8b4507b3e099986d29794129ecbc9327198366c544`.
Completing the isolated input-root support changed the final generator SHA to
`209b395148c925ada61ece67103bf3e9831cd59c015581aab07d24aa9e921d05`
and both accepted provenance mirrors from
`697ac6704e317ddb5a1d651a0bc911cf84cdeb003edbd3b231f0834a2cbe8355`
to
`0bacc7cb379c9f8b57a71f7607b8a9b4586a6c0d48605195350a96b10081c716`.
The only JSON semantic change is `/inputs/29/sha256`, the generator source
fingerprint. No other manifest references either provenance file, so the
closure ends at these two direct mirrors.

All PNGs and every non-provenance semantic output remain byte-identical. The
initial isolated concurrency fixture omitted
`source/character-source.json`, causing an explicit `ENOENT`. The final test
copies the complete required fixture source closure into a read-only snapshot,
writes base and full-loadout outputs to independent unique roots, and never
falls back to repository paths. Atomic-boundary coverage uses an explicit
writer/reader synchronization point and validates old/new PNG signatures and
Sharp metadata without retry, sleep, serialization, or fallback.

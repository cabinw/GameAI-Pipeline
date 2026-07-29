# PROGRAM-015 Red Cap Production Vertical Slice Acceptance

## Current decision

`HARD_STOP_SOURCE_READINESS` on 2026-07-30.

No A/B/C checkpoint is accepted. The branch contains Phase 0 specification
and audit documentation only.

## Required acceptance chain

1. Phase 0 source readiness passes.
2. TASK-015A automated and Creator gates pass; append A checkpoint.
3. TASK-015B automated and Creator gates pass; append B checkpoint.
4. TASK-015C automated and Creator gates pass; append C/final checkpoint.
5. Complete workspace, typecheck, clean-CI, working-copy, frozen
   tracked-files-only, closure, Scene/meta identity, deterministic bytes,
   Markdown links, diff, media scope, and protected-reference gates pass.
6. Evidence is published only on `evidence/task-015`, downloaded, hash
   checked, decoded fully, and frame-identity verified.

## Source-readiness acceptance

All rows in
`../reports/PROGRAM-015-phase-0-source-readiness.md` must be `PASS`.
`UNKNOWN`, `MISSING`, and repository-history-only attribution fail closed.

## Automated acceptance

- Deterministic generators and byte closure.
- Visible-pixel provenance and exact ownership.
- Neutral alpha/RGBA reconstruction and joint seam ROIs.
- 60 Hz clip sampling, loop/contact/socket/event invariants.
- Two-character target isolation, sorting, ownership, AABB, safe-area, and
  framebuffer oracles.
- Exact Reset, two rebuilds, lifecycle compensation, fault matrices, and
  post-verify clean closure.

## Creator acceptance

- Cocos Creator 3.8.8 clean open, switch/reopen, and second startup.
- All clips and VFX, Pause/Resume, Transform Stress, two rebuilds,
  post-rebuild sequence, Exact Reset, clean hold.
- Real disable then destroy lifecycle.
- Both characters and required background visible at 1280×720.
- Relevant Creator and Preview warnings/errors: zero.

## Current evidence

The neutral legacy audit reports:

- canonical source: 326×892 RGBA PNG;
- SHA-256:
  `d2e1f2be09ecf606ad6987e55af39b40fd415ca98d71dbaa26f6b2d1d07b68d7`;
- canonical visible pixels: 162,968 of 290,792 (coverage 0.560428072);
- assigned visible pixels: 162,968;
- neutral silhouette mismatch: 0;
- neutral visible RGBA mismatch: 0;
- 19/19 canonical visible part fragments match exactly; and
- 31,593 hidden extension pixels are ignored by the neutral provenance audit.

These metrics prove neutral reconstruction only. They do not prove asset
license, layered hidden-source provenance, production motion readiness, or
showcase background readiness.

Phase 0 documentation verification completed with `CI=true pnpm verify`:
491/491 tests passed, including build and TypeScript typecheck. Generated
outputs and tracked content remained closed.

## Hard-stop findings

- No author, originating tool/source, license identifier/text, or production
  and redistribution permission is recorded for the Red Cap canonical PNGs.
- The canonical authority is a flattened neutral composite. Existing
  articulation extensions copy the nearest opaque child texel into hidden
  regions; those pixels are deterministic but not observed layered source.
- Repository raster inventory contains character fixtures, VFX resources,
  tests, and historical evidence, but no qualified scene background or style
  board for TASK-015C.

Because the Program explicitly forbids inferred provenance, generated
completion, and an improvised background, the result cannot be judged against
the complete predeclared framebuffer oracle. Implementation is stopped.

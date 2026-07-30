# PROGRAM-015 Red Cap Production Vertical Slice Acceptance

## Current decision

Phase 0 source readiness, TASK-015A, and TASK-015B are accepted on
2026-07-30. TASK-015C is in progress.

## Required acceptance chain

1. Phase 0 source readiness passes.
2. TASK-015A automated and Creator gates pass; append A checkpoint. PASS
   (`9d1627b`).
3. TASK-015B automated and Creator gates pass; append B checkpoint. PASS.
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

## Phase 0 accepted evidence

- Source pack: `red-cap-production-v1`.
- Generation provenance: OpenAI ImageGen in ChatGPT with recorded chroma-key
  alpha extraction.
- Project-owner rights review: commercial use, modification, public
  repository inclusion and redistribution confirmed.
- Rights binding: provenance SHA
  `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
- Master: 1254×1254 RGBA, transparent corners, 282,476 visible pixels,
  SHA `7a4cf6a690aa6532a51c209d839d7d71b28396e40e021973c0f35fb0f828f3a1`.
- Parts sheet: 19 independent alpha components; 19/19 required parts resolve
  through the authority map.
- Joint supplement: accepted only for declared hidden connectors; ambiguous
  generic connector and duplicate combined pelvis are rejected.
- Background/style: 1672×941 RGB inputs with a locked 1664×936 crop,
  10/13 scale, 1280×720 output, ground line, safe area and framebuffer ROIs.
- Working tree contained no untracked/staged intake file at promotion.

The accepted machine-readable inputs are
`../../examples/red-cap-production-v1/source-authority-map.json` and
`../../examples/red-cap-production-v1/showcase-layout.json`.

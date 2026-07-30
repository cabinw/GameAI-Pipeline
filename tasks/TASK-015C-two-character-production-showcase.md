# TASK-015C: Two-Character Production Showcase

- Status: Accepted on 2026-07-30
- Parent: PROGRAM-015
- Budget: 35 files, 9,000 changed lines, 4 new PNG resources, 1
  Scene/`.meta` pair, zero feature media

## Declared implementation scope

- Expected changed-file count: at most 35 files.
- Expected generated-output budget: at most 4 production-intent PNG resources,
  one Creator-owned Scene/`.meta` pair, and no video or other feature media.
- Expected changed-line budget: at most 9,000 lines.

## Objective

Compose the accepted production-lite character and TASK-015B Red Cap in an
independent Creator-owned Scene with a licensed background, deterministic
sequence, disjoint target namespaces, and scene-specific production-intent
Dust, Trail, and Aura authored through the published D1/D2 path.

## Acceptance criteria

- Background provenance/license and style board pass Phase 0 before work.
- Both characters remain visible, separated by at least 48 px, and inside the
  64 px safe inset at 1280×720.
- Target namespaces, ownership, resource closure, Render Plan bytes, sorting,
  transformed AABBs, animation/VFX timing, Reset, rebuild, and cleanup pass.
- Dust, Trail, and Aura meet the locked 120/160/240 changed-pixel minimums in
  predeclared ROIs.
- Pause frame hashes are stable; Resume changes at least 80 active-ROI pixels.
- Creator clean open/reopen/restart, sequence playback, Transform Stress, two
  rebuilds, post-rebuild effects, Exact Reset, final hold, and clean console
  pass.

## Exclusions

No D1/D2 public change, new primitive, new blend/runtime behavior, generated
background, procedural fallback background, or manual Scene correction.

## Acceptance result

PASS. The deterministic generator closes four PNG resources and the compiled
Render Plan without changing D1/D2 public code. Creator 3.8.8 imported the
resources and opened the independent showcase Scene after restart.

The locked framebuffer gates passed with 376 Dust, 4,077 Trail, and 16,492
Aura changed pixels; the paused frame had zero changed pixels and Resume
changed 40,125 active-ROI pixels. Transform Stress, debug projection, two
rebuilds, post-rebuild effects, Exact Reset, final hold, and clean Preview
console also passed. See
`../docs/reports/PROGRAM-015-phase-c-showcase.md`.

# TASK-015C: Two-Character Production Showcase

- Status: Blocked by PROGRAM-015 Phase 0 and TASK-015A/B
- Parent: PROGRAM-015
- Budget: 35 files, 9,000 changed lines, 4 new PNG resources, 1
  Scene/`.meta` pair, zero feature media

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

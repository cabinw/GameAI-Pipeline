# TASK-015C: Two-Character Production Showcase

- Status: Implementation accepted; replacement live evidence pending
  external code/visual review
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

## Implementation result and evidence remediation

The deterministic generator closes four PNG resources and the compiled
Render Plan without changing D1/D2 public code. Creator 3.8.8 imported the
resources and opened the independent showcase Scene after restart.

The previously reported 376 Dust, 4,077 Trail, 16,492 Aura, zero Pause, and
40,125 Resume values came from the superseded synthetic/offline evidence
path, not from the final published MP4. They remain a historical local result
only. Replacement evidence uses the real part-atlas/joint runtime in Creator
Web Preview and computes every framebuffer value from exact FFmpeg-decoded
MP4 frames. The old payload is preserved and classified
`failed-external-review-synthetic-animation-and-non-media-derived-metrics`.
See
`../docs/reports/PROGRAM-015-phase-c-showcase.md`.

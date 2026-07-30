# Changelog

All notable project milestones are recorded in this file. The repository is
still pre-release package infrastructure; Git tags and GitHub Releases remain
separate publication actions.

## v0.5.0 — Production Character Vertical Slice Baseline

Release source is the squash/main commit produced by the v0.5.0 documentation
closeout. The annotated `v0.5.0` tag and attachment-free GitHub prerelease are
published only after exact-squash main CI passes.

### Added

- PROGRAM-015 Red Cap production vertical slice, integrated through PR #22:
  source authority and asset intake, deterministic 19-part layered
  reconstruction, Rest/Idle/Walk/Wave runtime motion, semantic targets and
  scene-specific concrete VFX Render Plans, and a two-character Creator
  showcase.
- Creator 3.8.8 macOS acceptance for alternating foot contact,
  hand/socket following, Dust, Trail, Aura, Pause/Resume, Transform Stress,
  Debug, two consecutive lifecycle rebuilds, Exact Reset, and a final clean
  hold with zero relevant Creator/Preview warnings or errors.
- Structural Sharp PNG publication-race remediation through PR #24: read-only
  tracked inputs, isolated roots, complete same-directory temporary writes,
  atomic rename, and deterministic concurrency regression without retry,
  sleep, serialization, or fallback.
- Local Experimental Asset Mode through PR #25, keeping
  `artifacts/experimental/<experiment-id>/` ignored, untracked, local-only,
  and outside publication until Repository Candidate review passes.

### Verification

- Working-copy and fresh frozen tracked-files-only verification: 508/508
  tests each.
- PROGRAM-015 automated, typecheck, generated-closure, Scene/meta/class,
  Creator lifecycle/spatial/control, framebuffer, external review, and
  protected-content gates: PASS.
- Rights and provenance remain byte-identical to the accepted project-owner
  records.
- Zero tracked MP4 files or accepted evidence payload on `main`.

### Known limitations

- Prerelease production-character vertical-slice baseline, not a complete
  commercial game or general-purpose art-production system.
- Verified live environment is Cocos Creator 3.8.8 on macOS; Windows is not
  formally verified.
- No Unity or Godot adapter, real audio/gameplay execution, or complete
  production editor UI.
- Local Experimental Assets are not repository-publication or redistribution
  approved and remain ineligible for release until promoted and audited.
- TASK-015D and TASK-014D4 are not started. A possible two-character,
  one-scene fighting experiment remains a future candidate only.

## v0.4.0 — Data-Driven VFX Authoring Baseline

Published source and peeled tag target: `main` at
`68444551b9b160a2455a97a2d8bf611aea608c6e`; annotated tag object
`cdd3035c78ff8c062f7df795df9095515fd57ba6`.

### Added

- An engine-neutral VFX authoring schema and deterministic compiler that
  resolves typed parameters into concrete Render Plans.
- Canonical integer-tick time, linear/clamped curves, exact boundaries,
  deterministic particle schedules, `xorshift32-v1` samples, and explicit
  compilation/runtime budgets.
- A shared Cocos Render Plan adapter/runtime with typed
  primitive/recipe/blend dispatch and exact D1 sampler reuse.
- Transactional renderer, material, node, root, and input ownership with
  compensation, same-component retry, rebuild, disposal, and Exact Reset.
- Canonical 12-state full-loadout integration with atomic prop/clip/target
  rebind, Dust, Hand/Tool Trail, Aura, and Combined.
- Real Creator `onDisable → onDestroy`, eight early partial-build
  compensation gates, a 25/25 Creator fault matrix, and complete visual
  acceptance.

### Verification

- Working-copy and fresh frozen tracked-files-only verification: 491/491
  tests each.
- Focused D3/Scene 28/28, complete extension 293/293, D1 16/16, Character
  Semantic Events 24/24, and Cocos CI 3/3 plus typecheck.
- Generated-output closure, schema identity, D2 parity, metadata, Scene
  identity, Markdown links, diff/content closure, and binary/media audits:
  PASS.
- Zero tracked MP4 or release evidence media.

### Known limitations

- Prerelease framework baseline with procedural/reference VFX rather than
  production art.
- No audio playback or gameplay execution consumer.
- No Unity or Godot runtime adapter and no Windows verification.
- Original Red Cap reconstruction, AI asset generation, automatic fitting,
  and a complete production editor UI remain incomplete.
- TASK-014D4 is not started.

The annotated `v0.4.0` tag and prerelease were published after the
documentation closeout. Existing `v0.2.0` and `v0.3.0` tags were not moved.

## v0.3.0 — Character Semantic Events & VFX Baseline

Baseline source: `main` at
`5c3baba4062bd529bb6bd4b787b8c391452ee459`.

### Added

- Character Semantic Events 1.0 with typed VFX, audio, and gameplay payloads,
  stable validation, and deterministic forward timeline evaluation.
- Persistent lifecycle coalescing to one logical active instance per
  track/event across loops and Pause/Resume.
- A Cocos Creator 3.8.8 Semantic VFX Adapter and renderer/cue registry.
- Canonical semantic targets for left/right feet, torso, and active hand/tool
  across all 12 loadout and no/left/right prop states.
- Procedural Footstep Dust, Wave/Prop Trail, and Persistent Aura reference
  effects.
- Deterministic target re-resolution, Transform Stress, lifecycle rebuild,
  disposal, and Exact Reset cleanup.

### Verification

- Working-copy and tracked-files-only frozen verification: 414/414 tests.
- Cocos Creator 3.8.8 macOS runtime gate and external visual review: PASS.
- Single runtime root/input and zero duplicate start, unknown stop, leak,
  stale target, non-finite transform, or viewport-overflow violations.
- Zero tracked MP4 or evidence media.

### Known limitations

- Procedural placeholder effects rather than production VFX art.
- Audio/gameplay contracts have no runtime playback, hitbox, damage, or
  signal consumers.
- No reverse playback, arbitrary seek, networking, VFX authoring UI,
  automatic effect fitting, Unity/Godot adapters, Windows verification, or
  original Red Cap production reconstruction.

The `v0.3.0` tag and GitHub Release are intentionally not created by this
documentation closeout.

## v0.2.0 — Character Loadout Baseline

Baseline source: `main` at
`2e6f54191f4eff7f2699bda24336c1ada8cff35a`.

### Added

- Deterministic Character Rig, Rig Layout, Rig Animation, and Attachment
  Layout contracts with explicit compatibility ranges and stable diagnostics.
- Source-space rig generation, image validation, exact Rest reconstruction,
  and reproducible generated assets.
- A 17-part production-lite rigid base-rig runtime with semantic animation
  playback, Pause/Resume, and Exact Reset.
- Generic layered head accessories with inherited socket transforms.
- Generic multi-part garment composition with authored transformed
  world-space AABB seam validation.
- Generic one-handed no/left/right prop states with authored grip anchors,
  hand overlays, and continuous grip validation.
- One authoritative engine-neutral 12-state loadout matrix resolved through
  `resolveCharacterLoadout`.
- A recovered Creator-owned canonical Cocos V2 adapter with a manifest,
  semantic input registry, global sorting registry, world-to-overlay
  projection, lifecycle/readiness guards, and runtime spatial assertions.

### Verification

- Working-copy and tracked-files-only frozen verification: 349/349 tests.
- Exact generated-output file closure and clean-tree CI enforcement.
- Cocos Creator 3.8.8 clean open/switch/reopen, 35/35 resources, all 12
  states, accepted semantic clips, Pause/Resume, two lifecycle rebuilds,
  spatial/debug validation, and Exact Reset.
- Temporary evidence branches, uploaded-copy hashes, full media decode, and
  external visual review were used without tracking MP4 files on feature
  branches.

### Known limitations

- Rigid sprites with authored fitting, seam regions, and grip positions.
- Seam validation measures transformed AABB overlap, not oriented cloth
  geometry or simulation.
- No IK, automatic fitting, cloth or prop physics, mesh deformation,
  animation blending, root motion, VFX runtime, Unity adapter, Godot adapter,
  Windows validation, production editor UI, or original Red Cap production
  reconstruction.

The original v0.2.0 documentation closeout did not create publication
objects. The annotated `v0.2.0` tag and prerelease were subsequently published
without changing this historical capability baseline.

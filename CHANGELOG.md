# Changelog

All notable project milestones are recorded in this file. The repository is
still pre-release package infrastructure; Git tags and GitHub Releases remain
separate publication actions.

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

# Roadmap

## v0.1 — Repository Bootstrap

- Repository standards and Codex workflow
- Architecture documentation and ADR process
- Versioned schemas and reproducible examples
- Initial Character Pipeline specification

## v0.2.0 — Character Loadout Baseline — Completed

- Versioned engine-neutral character, rig-layout, animation, and attachment
  contracts with stable validation diagnostics
- Deterministic asset intake, source-space rig generation, exact Rest
  reconstruction, and generated-output closure
- Rigid base-rig playback with semantic clip IDs and Exact Reset
- Layered head accessories, multi-part garments with authored AABB seams, and
  one-handed props with socket/grip validation
- One authoritative 12-state loadout contract and resolver
- Recovered Creator-owned canonical Cocos V2 adapter with lifecycle,
  readiness, semantic input, global sorting, debug projection, and runtime
  spatial assertions
- Working-copy and tracked-files-only 349/349 verification plus accepted
  Cocos Creator 3.8.8 evidence

## v0.3.0 — Character Semantic Events & VFX Baseline — Completed

- TASK-014A: Character Semantic Events 1.0 contract, typed VFX/audio/gameplay
  payloads, stable diagnostics, textual fixtures, and deterministic evaluator
- TASK-014A1: one persistent logical instance per track/event across loops,
  Pause/Resume, Reset, track switch, and disposal
- TASK-014B: Cocos Semantic VFX Adapter with deterministic procedural Dust,
  Trail, and Aura renderers
- TASK-014C: canonical 12-state loadout integration with left/right foot,
  torso, and active hand/tool semantic targets
- Transform Stress, target re-resolution, rebuild, Exact Reset, finite and
  viewport-safe rendering, single root/input, and zero leak/stale guarantees
- Working-copy and tracked-files-only 414/414 verification
- Cocos Creator 3.8.8 macOS runtime acceptance and external visual review PASS
- Zero tracked evidence media

The accepted runtime executes Cocos VFX only. Audio and gameplay remain typed
engine-neutral contracts without playback, hitbox, damage, or signal
consumers. v0.3.0 is a prerelease framework baseline with procedural
placeholder VFX, not production-ready final art or complete tooling.

## v0.4.0 — Data-Driven VFX Authoring Baseline — Completed

- TASK-014D1: engine-neutral VFX authoring schema, deterministic compiler,
  concrete Render Plans, canonical integer ticks, curves, parameters,
  randomness, and budgets
- TASK-014D2: shared Cocos Render Plan adapter/runtime with typed
  primitive/recipe/blend dispatch and exact sampler reuse
- Transactional ownership/cleanup, deterministic sorting, transformed
  viewport bounds, rebuild, compensation retry, and Exact Reset
- TASK-014D3: canonical 12-state loadout integration with atomic
  prop/clip/target rebind
- Procedural/reference Dust, Hand/Tool Trail, Aura, and Combined
- Real Creator `onDisable → onDestroy`, eight early partial-build fault
  gates, 25/25 Creator fault matrix, and visual acceptance
- Working-copy and frozen tracked-files-only 491/491 verification
- Zero tracked evidence media

v0.4.0 remains a prerelease framework baseline. The accepted procedural
effects prove data and runtime contracts but do not represent production art.

## v0.5.0 — Production Character Vertical Slice Baseline — Completed

- PROGRAM-015 source authority, project-owner-reviewed rights/provenance, and
  deterministic Red Cap asset intake
- 19-part production character hierarchy with Rest, Idle, Walk, and Wave
- Alternating planted-foot validation and joint-following hand target/socket
- Character Semantic Events and scene-specific concrete Dust, Trail, and Aura
  Render Plans over the shared Cocos runtime
- Pause/Resume, Transform Stress, Debug, two consecutive rebuilds,
  post-rebuild behavior, Exact Reset, and final clean hold
- Cocos Creator 3.8.8 macOS runtime, spatial, framebuffer, control, console,
  and external visual acceptance
- PR #24 structural Sharp PNG publication-race fix with isolated roots and
  atomic rename
- PR #25 Local Experimental Asset Mode with a pre-staging Repository
  Candidate publication gate
- Working-copy and frozen tracked-files-only 508/508 verification
- Zero tracked MP4 or accepted evidence payload on `main`

v0.5.0 is a prerelease production-character vertical-slice baseline. It does
not claim a complete game, general art-production system, Windows support,
cross-engine adapters, audio/gameplay execution, or a complete editor UI.

## Next roadmap

### TASK-014D4 — Not started

TASK-014D4 has no accepted implementation scope and is not started by the
v0.4.0 documentation closeout. Any next VFX capability requires a separate
task, plan, acceptance criteria, and scope decision.

### Audio consumer

Deliver validated audio semantic events to an explicit engine audio consumer
without coupling audio resources to the engine-neutral contract.

### Gameplay event consumer

Deliver validated signals and gameplay windows to explicit hitbox, damage, or
other gameplay consumers with deterministic lifecycle ownership.

### Animation authoring improvements

Improve semantic clip authoring, editing, preview, event timing, transition
design, and broader motion coverage without assuming IK or blending exists.

### AI asset intake, cutting, and automatic fitting

Explore assisted source-art intake, deterministic cutting, semantic part
identification, and authored/validated fitting workflows. Automatic fitting
is not part of v0.2.0.

### Production editor UI

Turn validated pipeline operations into a production-oriented authoring and
inspection workflow instead of acceptance-only fixtures.

### Unity adapter

Implement a separate adapter that consumes engine-neutral resolved contracts.
Architecture permits this direction; no Unity runtime has been implemented or
verified.

### Godot adapter

Implement a separate adapter that consumes engine-neutral resolved contracts.
Architecture permits this direction; no Godot runtime has been implemented or
verified.

### Windows validation

Validate the supported toolchain, native image dependency, generation, and
engine workflow on Windows. No Windows development environment has been
accepted.

### Production-character follow-up

The Red Cap production vertical slice is accepted in v0.5.0. Any broader
character, combat, or content-production scope requires a new task and
acceptance boundary. A possible two-character, one-scene fighting experiment
is a future candidate direction only; it is not started by this release.

## Long-term direction

Advance from reproducible character construction toward NPC, level, UI, FX,
audio, and playable-ad pipelines while preserving the repository rule:
structured input → validation → deterministic generation → verification.

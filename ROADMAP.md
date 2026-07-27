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

## Next roadmap

### TASK-014D — Data-Driven Production VFX Cue Authoring

Proposed future goal:

- replace hard-coded procedural effect construction with a validated,
  engine-neutral authoring description;
- allow AI to generate or modify VFX cue data;
- support reusable cue presets;
- preview cue timing, socket binding, transforms, color, duration, and layers;
- compile engine-neutral cue descriptions into Cocos renderer plans;
- retain Unity/Godot adapter compatibility; and
- keep production-quality asset generation separate from runtime logic.

TASK-014D is not implemented or started by the v0.3.0 documentation
closeout.

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

### Original Red Cap reconstruction

Return to production reconstruction only through the accepted provenance,
rig, articulation, adapter, and visual gates. It remains deferred.

## Long-term direction

Advance from reproducible character construction toward NPC, level, UI, FX,
audio, and playable-ad pipelines while preserving the repository rule:
structured input → validation → deterministic generation → verification.

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

## Next roadmap

### Character Semantic Events and VFX

TASK-014A completes the engine-neutral Character Semantic Events 1.0 and VFX
cue-definition contract, stable validation, textual fixtures, and
deterministic animation-timeline evaluator. It covers generic cue IDs,
Rig Layout sockets, local transforms, layer roles, follow policies,
one-shot/looping/persistent lifecycle compatibility, typed VFX/audio/gameplay
payloads, skipped frames, loop crossings, Pause/Resume, Exact Reset, and clip
switching.

TASK-014A is contracts and evaluation only. Gameplay-triggered injection,
engine adapter delivery, Cocos VFX runtime, effect/audio assets, gameplay
execution, reverse/seek/network behavior, and TASK-014B have not started. No
visual effect was rendered.

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

# Roadmap

## v0.1 — Repository Bootstrap

- Repository standards and Codex workflow
- Architecture documentation and ADR process
- Versioned schemas and reproducible examples
- Initial Character Pipeline specification

## v0.2 — Character Pipeline

- Master character specification
- Asset validation
- Auto Cutter prototype
- Rig layout schema
- Red Cap Target golden fixture

## v0.3 — Cocos Rig Builder

- Cocos Creator 3.8.x editor extension
- Rigid Sprite node hierarchy generation
- Anchors, rest pose, draw order, sockets, and hit areas
- Idempotent regeneration and diagnostic reports

## v0.4 — Animation Pipeline

- Versioned animation JSON
- Runtime animator
- Idle, walk, look-around, exchange, hit, and fall presets
- Preview and visual regression workflow

## v0.5 — NPC Factory

- Shared body templates
- Skin and accessory variants
- Deterministic NPC generation
- Crowd performance fixtures

## v0.6 — Level Pipeline

- Level DSL
- Target, decoy, path, timing, and interaction generation
- Cocos scene integration

## v0.7 — Ad Pipeline

- Playable scenario definitions
- Capture plans and creative scripts
- Variant production and metadata

## v1.0 — Reproducible GameAI Framework

Generate validated, playable casual-game content from structured specifications.

## Deferred after the full-loadout integration milestone

Design an engine-neutral Socket-bound VFX Cue System. The future proposal
should cover generic effect IDs, character-socket attachment, local position/
rotation/scale, layer roles, independent position/rotation/scale follow
policies, one-shot/looping/persistent lifecycles, animation-timeline and
gameplay-triggered cues, and Cocos/Unity/Godot adapter targets.

TASK-013 intentionally implements no VFX schema, runtime, asset, particle,
animation effect event, gameplay effect event, or VFX test.

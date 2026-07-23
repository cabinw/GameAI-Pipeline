# GameAI Pipeline

> **Build games by describing them.**

GameAI Pipeline is a reusable, data-driven framework for AI-assisted game production. It aims to turn structured specifications into validated game assets, rigs, animations, prefabs, levels, and advertising-production inputs.

## Principles

- **Everything is generated. Everything is reproducible.**
- Framework capabilities must be reusable by at least three game projects.
- Structured specifications are the source of truth; generated artifacts are outputs.
- Every pipeline follows: **Input → Validate → Normalize → Generate → Verify → Output**.
- Important decisions are recorded as ADRs before implementation becomes difficult to reverse.

## Initial technical baseline

- Cocos Creator 3.8.x
- TypeScript
- Rigid 2D Sprite node rigs for the first Character Pipeline implementation
- Versioned JSON Schema contracts
- Codex-oriented task, plan, fixture, and review workflow

## Repository map

```text
framework/      Engine-agnostic reusable foundations
pipelines/      Character, animation, level, UI, FX, audio, and ad pipelines
cocos/          Cocos Creator editor extensions and runtime integrations
projects/       Game-specific consumers
schemas/        Versioned machine-readable contracts
examples/       Reproducible fixtures and demos
docs/           Architecture, standards, ADRs, RFCs, and manuals
tasks/          Ordered implementation tasks
prompts/        Versioned AI and Codex prompts
```

## First milestone

The first milestone is the **Character Pipeline**:

```text
Character specification
→ asset validation
→ auto cutting
→ rig layout
→ Cocos character generation
→ animation
→ QA
```

The Red Cap Target is the initial golden fixture, not a framework-specific dependency.

## Working with Codex

Read `AGENTS.md`, then execute tasks in order. Multi-file or architectural work must first be reflected in `PLANS.md`.

## Development

The repository uses Node 24 and pnpm 11. Install and verify the complete workspace with:

```bash
pnpm install --frozen-lockfile
pnpm verify
```

Exact versions, individual commands, the workspace topology, and the Cocos extension spike are documented in `docs/environment.md`.

Character Rig and Rig Layout contracts, validation codes, and usage are documented in `docs/character-contracts.md`. Schema compatibility rules are documented in `docs/schema-versioning.md`.

Character image loading, safe-path rules, binary validation, manifest normalization, and asset diagnostic codes are documented in `docs/character-asset-intake.md`.

Canonical visible-pixel provenance, flat-composite verification, tolerances,
and art-blocking diagnostics are documented in `docs/canonical-art-gate.md`.
Deterministic canonical pixel ownership and part regeneration are documented
in `docs/canonical-part-remake.md`.

Source annotation and skeleton-template contracts, coordinate formulas, deterministic Rig Layout generation, and generator diagnostics are documented in `docs/rig-layout-generator.md`.

Cocos scene-plan boundaries, Joint/Visual assembly, trim compensation,
AssetDB resolution, global draw order, and idempotent replacement are
documented in `docs/cocos-scene-rig-builder.md`.

Rig Animation schema compatibility, stable diagnostics, rest-pose-relative
sampling, idle data, and Cocos Joint-only playback are documented in
`docs/rig-animation.md`.

Hidden joint extensions, bidirectional stress validation, neutral pixel-diff
evidence, and fixed Cocos acceptance scenes are documented in
`docs/articulation-safety.md`.

## Status

The project is in **v0.2 Character Pipeline**. TASK-001 established the
engine-neutral contracts, TASK-002 added safe asset intake, TASK-003 added
deterministic annotated Rig Layout generation, and TASK-004 added the first
production Cocos Creator 3.8.8 scene-rig builder. TASK-005 adds the first
versioned, data-driven Joint animation runtime and subtle Red Cap idle.
TASK-006 adds articulation-safe overlaps before Walk, Hit, blending, or
state-machine work.

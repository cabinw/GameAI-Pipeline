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

## Status

The project is in **v0.1 Repository Bootstrap**.

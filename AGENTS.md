# AGENTS.md

## Mission

Build and maintain GameAI Pipeline as a reusable, testable, data-driven framework for AI-assisted game production.

## Working rules

1. Read `README.md`, `ROADMAP.md`, `PLANS.md`, and relevant files under `docs/` before implementation.
2. Do not place game-specific logic in the framework unless it is reusable by at least three projects.
3. Prefer deterministic JSON/YAML inputs and reproducible outputs over manual editor-only workflows.
4. Every non-trivial change requires a task file and explicit acceptance criteria.
5. Preserve backward compatibility for published schemas whenever practical.
6. Keep generated artifacts separate from source specifications.
7. Cocos Creator integration targets 3.8.x unless a task explicitly changes the baseline.
8. Use TypeScript for Cocos Creator extensions and runtime modules.
9. Do not introduce Spine, DragonBones, cloud AI APIs, or paid dependencies into the core without an approved ADR.
10. Add validation, fixtures, and tests with each generator or schema change.

## Workflow

Task → plan → implementation → validation → documentation → pull request.

Before editing code, update `PLANS.md` for work spanning multiple files or architectural boundaries.

## Repository boundaries

- `framework/`: engine-agnostic reusable foundations.
- `pipelines/`: character, animation, level, UI, FX, audio, and advertising pipelines.
- `cocos/`: Cocos Creator editor extensions and runtime integrations.
- `projects/`: project-specific consumers; never imported by framework code.
- `examples/`: reproducible fixtures and demos.
- `schemas/`: versioned machine-readable contracts.
- `docs/adr/`: accepted architecture decisions.
- `docs/rfc/`: proposals not yet accepted.

## Definition of done

A task is complete only when:

- acceptance criteria pass;
- affected schemas and examples are synchronized;
- validation or tests cover the primary behavior;
- documentation describes usage and limitations;
- no unrelated files are changed.

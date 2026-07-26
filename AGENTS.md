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

## Pull request sizing and evidence policy

- Keep one runtime capability per pull request.
- Declare the expected changed-file count and generated-output budget before
  implementation.
- A pull request expected to exceed 100 files or 25,000 changed lines requires
  an explicit split decision before coding begins.
- Report hand-authored code separately from generated mirrors, PNG assets, and
  Scene/`.meta` pairs.
- Keep evidence videos on temporary evidence branches; never add them to a
  feature or documentation branch.
- A recovery harness cannot silently become a canonical production surface.
  Promotion requires an explicit task/ADR, a neutral identity, parity tests,
  and Creator runtime acceptance.
- Visual acceptance complements but never replaces contract tests. Contract
  tests and headless evidence complement but never replace Creator lifecycle,
  runtime, spatial, and visual acceptance.

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

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

The 16-part primitive stickman reference, pure local-to-world hierarchy
evaluation, rest/idle, arm-wave, walk articulation clips, and dedicated Cocos
verification scene are documented in
`examples/stickman-reference/README.md` and
`docs/acceptance/TASK-007-stickman-articulation-reference.md`.

The TASK-008 15-part transparent-PNG mannequin, deterministic artwork
generator, contract-only sprite bridge, synchronized skeleton/debug view, and
Cocos verification controls are documented in
`examples/simple-sprite-character/README.md`.

The TASK-009 17-part production-lite layered humanoid, organic trimmed PNGs,
authored Rest Pose composite, exact contract reconstruction, four evaluator
clips, and reference/assembled/debug Cocos acceptance scene are documented in
`examples/production-lite-character/README.md` and
`docs/acceptance/TASK-009-production-lite-layered-character-reference.md`.

TASK-010 reuses that accepted body unchanged and adds a generic Attachment
Layout contract, deterministic two-layer cap and sunglasses, four exact
enabled-state references, and a socket/debug Cocos scene. See
`examples/production-lite-head-accessories/README.md` and
`docs/acceptance/TASK-010-head-accessory-layering-reference.md`.

TASK-011 composes the same attachment system into a grouped eleven-part casual
jacket with generic torso/arm/wrist/collar slots, authored seam regions, four
exact Rest variants, Garment Stress, and a dedicated Cocos acceptance scene.
See `examples/production-lite-garment-layering/README.md` and
`docs/acceptance/TASK-011-garment-layering-reference.md`.

TASK-012 extends the generic attachment contract with hand-socket targets,
authored prop grips, prop states, and optional hand overlays. Its deterministic
production-lite toolbox fixture reconstructs no-prop/left/right Rest variants
exactly and samples grip lock across four clips at 60 Hz. See
`examples/production-lite-one-handed-prop/README.md` and
`docs/acceptance/TASK-012-one-handed-prop-reference.md`.

TASK-013 composes TASK-010 through TASK-012 through one engine-neutral
full-character loadout resolver. Eight Rest presets reconstruct exactly and
five semantic clips pass seam, accessory, grip, state, transform, presence,
and global-order validation across 605 samples at 60 Hz. See
`examples/production-lite-full-loadout/README.md` and
`docs/acceptance/TASK-013-composable-full-character-loadout-reference.md`.

The production-facing Cocos entry for the recovered TASK-013 runtime is
`cocos/projects/character-rig-builder-mvp/assets/composable-character-loadout-reference-v2.scene`.
Its adapter/facade entry is
`source/composable-loadout/canonical-loadout-adapter.ts`, with canonical
adapter ID `composable-character-loadout-reference-v2`. The original
TASK-013 Scene is superseded and non-production; it remains only for
historical provenance and deterministic regression. Its generators are not
part of the normal build and run only through the explicit
`legacy:verify-task013-provenance` command.

## Current status — v0.4.0 Data-Driven VFX Authoring Baseline

The accepted Character Pipeline now connects portable visual authoring to the
canonical 12-state full-loadout Cocos runtime:

```text
VFX Authoring Document
→ deterministic compiler
→ concrete Render Plan
→ shared Cocos adapter/runtime
→ canonical full-loadout integration
→ Creator lifecycle/spatial/visual acceptance
```

TASK-014D1 owns the engine-neutral authoring schema, fail-closed deterministic
compiler, canonical integer-tick sampling, curves, concrete parameter
resolution, particle randomness, and explicit budgets. TASK-014D2 consumes
only the concrete plan through typed primitive, recipe, and blend dispatch,
exact sampler reuse, deterministic sorting/spatial guards, and transactional
ownership/cleanup. TASK-014D3 composes that shared runtime with all 12
canonical loadout states and actual feet, torso, hand, and prop-grip targets.

The Cocos Creator 3.8.8 macOS acceptance covers prop/clip/target rebind,
Footstep Dust, Hand/Tool Trail, Persistent Aura, Combined, Transform Stress,
two rebuilds, post-rebuild effects, Exact Reset, real
`onDisable → onDestroy`, early partial-build compensation, and a 25/25
Creator fault matrix. Stable states retain one runtime root and one input
handler with zero duplicate, stale, leaked, non-finite, viewport, ownership,
or cleanup failures.

Working-copy and tracked-files-only verification each pass 491/491 tests.
Creator lifecycle/spatial/visual acceptance and external review pass, while
feature and documentation branches track zero evidence media.

v0.4.0 remains a prerelease framework baseline. Its effects are
procedural/reference VFX, not production art. Audio/gameplay execution,
Unity/Godot adapters, Windows verification, original Red Cap reconstruction,
AI asset generation, automatic fitting, and a complete production editor UI
remain unimplemented or unverified. TASK-014D4 has not started.

See the [v0.4.0 release
baseline](docs/releases/v0.4.0-data-driven-vfx-authoring-baseline.md),
[v0.3.0 semantic events
baseline](docs/releases/v0.3.0-character-semantic-events-vfx-baseline.md),
and [compatibility matrix](docs/compatibility.md).

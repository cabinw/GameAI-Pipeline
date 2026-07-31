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

Start the local Animation Review Workspace for the accepted PROGRAM-015 Red
Cap fixture with:

```bash
pnpm review:animation
```

The command binds an ephemeral port on `127.0.0.1` and prints the browser URL.
The workspace is process-local, serves only declared accepted fixture PNGs,
and exports proposals without overwriting source animation or asset files.

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

## Current status — v0.5.0 Production Character Vertical Slice Baseline

The accepted Character Pipeline now closes one production-character path from
reviewed source authority through deterministic Creator acceptance:

```text
source authority and asset intake
→ deterministic layered asset generation
→ production character joint hierarchy
→ Rest / Idle / Walk / Wave runtime animation
→ semantic events and concrete VFX Render Plans
→ shared Cocos renderer/runtime
→ Creator lifecycle, rebuild, reset and spatial validation
→ production vertical-slice acceptance
```

PROGRAM-015 contributes the accepted 19-part Red Cap hierarchy, Rest, Idle,
Walk, and Wave, foot-contact and hand-target validation, Dust, Trail, Aura,
Pause/Resume, Transform Stress, Debug, two consecutive rebuilds, Exact Reset,
and a final clean hold. Independent code/runtime/Creator/visual review passed,
Creator and Preview reported zero relevant warnings or errors, and PR #22
integrated the feature without tracking accepted evidence media on `main`.

The baseline also includes two publication-safety improvements. PR #24
eliminates the shared Sharp PNG reader/writer race through complete
same-directory temporary writes, atomic rename, read-only tracked inputs,
isolated input/output roots, and deterministic concurrent regression
coverage—without retry, sleep, serialization, or repository fallback.
PR #25 defines Local Experimental Asset Mode: ignored material below
`artifacts/experimental/<experiment-id>/` may support local Creator/runtime
experiments but remains untracked and cannot enter GitHub without
Repository Candidate promotion and publication review.

Working-copy and frozen tracked-files-only verification pass 508/508 tests.
`main` tracks zero MP4 files, and ignored local experimental inputs are not a
CI or clean-checkout dependency.

v0.5.0 is a prerelease **Production Character Vertical Slice Baseline**, not a
complete commercial game or a general-purpose art-production system. Cocos
Creator 3.8.8 on macOS is the verified live environment. Windows remains
unverified; Unity and Godot adapters, audio/gameplay execution, and a complete
production editor UI are not implemented. TASK-015D and TASK-014D4 have not
started. A possible two-character, one-scene fighting experiment is only a
future candidate direction.

See the [v0.5.0 release
baseline](docs/releases/v0.5.0-production-character-vertical-slice-baseline.md),
[PROGRAM-015 acceptance](docs/acceptance/PROGRAM-015-red-cap-production-vertical-slice.md),
[asset publication policy](docs/asset-pipeline.md), and
[compatibility matrix](docs/compatibility.md).

# ADR-0016: Engine-Neutral VFX Authoring and Engine-Specific Compilation

- Status: Accepted
- Date: 2026-07-28

## Context

The accepted Cocos VFX adapters prove semantic-event delivery and rendering,
but hard-coded Cocos construction cannot be the future portable authoring
source. Embedding engine paths, components, materials, or APIs in authoring
data would bind content to one renderer and make AI edits unsafe to validate
without that engine.

Character Semantic Events already own cue timing and lifecycle command
semantics. Expanding that schema to describe visual layer construction would
couple two independent compatibility surfaces and risk changing the accepted
evaluator.

## Decision

Create the standalone engine-neutral `@gameai/vfx-authoring` package and
canonical `schemas/vfx-cue-authoring.schema.json`.

The authoring document references existing semantic cue IDs and logical
resource IDs. It describes bounded typed layers, deterministic properties,
parameter defaults, and bounded overrides. Validation receives registries of
known semantic cue and logical resource IDs; the registries contain IDs only.

The package validates and normalizes the document, then produces a
byte-deterministic VFX Render Plan containing no engine types. Engine-specific
compilers will separately map that plan into Cocos, Unity, or Godot resources
and runtime objects.

Character Semantic Events schema and evaluator semantics remain unchanged.
Their command output selects a cue; it does not compile or render the cue.

## Consequences

- AI and human authors share one fail-closed, deterministic contract.
- A cue can be composed once and compiled by independent future engines.
- Registry validation catches missing semantic/resource bindings before an
  engine compiler runs.
- Explicit limits prevent unbounded layer, curve, particle, and serialized
  output growth.
- Versioning of visual authoring can evolve independently from semantic event
  timing and evaluator behavior.
- Existing Cocos procedural renderers remain accepted runtime evidence but
  are not promoted to canonical authoring data by this task.

TASK-014D1 adds no renderer, Scene, runtime adapter, generated media, Unity or
Godot implementation, tag, or release.

## Alternatives rejected

- Extending Character Semantic Events with visual layers would duplicate
  responsibility and couple evaluator compatibility to effect authoring.
- Storing Cocos prefabs, Unity assets, or Godot resource paths would prevent
  portable validation and compilation.
- Allowing arbitrary dictionaries or expressions would make exhaustive
  validation and deterministic output impractical.
- Emitting a partial plan alongside diagnostics would let invalid AI output
  leak into later compilers.

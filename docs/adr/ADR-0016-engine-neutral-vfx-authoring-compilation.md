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
parameter defaults, and closed typed bindings. Validation receives semantic
cue descriptors with `emit`/`start-stop` command mode and resource descriptors
with portable recipe kind and compatible primitives.

The package validates and normalizes the document, resolves every parameter
into concrete layer values, and produces a byte-deterministic executable VFX
Render Plan containing no engine types. The plan fixes linear/clamped curve
sampling, relative transform composition, alpha composition, phase and exact
boundary behavior, cleanup authority, particle spawn schedule, and compiled
`xorshift32-v1` samples. Engine-specific compilers only map typed recipes into
Cocos, Unity, or Godot resources and runtime objects.

Character Semantic Events schema and evaluator semantics remain unchanged.
Their command output selects a cue; it does not compile or render the cue.

## Consequences

- AI and human authors share one fail-closed, deterministic contract.
- A cue can be composed once and compiled by independent future engines.
- Registry validation catches missing semantic/resource bindings before an
  engine compiler runs.
- Semantic `emit` cannot compile as looping/persistent, and semantic
  `start-stop` cannot compile as one-shot.
- Engine compilers do not interpret parameter or resource names and do not
  choose curve, timing, emission, or random semantics.
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
- Leaving parameters as metadata would require adapters to hard-code names;
  closed bindings instead disappear after compilation into concrete values.
- ID-only registries would require engines to guess lifecycle and resource
  capabilities; typed descriptors make those checks portable.
- Emitting a partial plan alongside diagnostics would let invalid AI output
  leak into later compilers.

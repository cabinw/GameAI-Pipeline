# RFC-0015: Data-Driven VFX Cue Authoring

- Status: Accepted for TASK-014D1 implementation; external review pending
- Date: 2026-07-28
- Scope: engine-neutral authoring, validation, normalization, and compilation

## Summary

TASK-014A established semantic event timing and stable VFX cue IDs. TASK-014B
and TASK-014C proved Cocos delivery and rendering, but their procedural effect
construction is not a portable production authoring source. TASK-014D1 adds:

```text
Character Semantic Event cueId and command mode
→ VFX Authoring Document
→ validation and normalization
→ deterministic executable VFX Render Plan
→ future engine-specific resource compiler
→ Cocos / Unity / Godot renderer
```

The semantic-event evaluator remains authoritative for event time, target,
follow policy, start/stop commands, Reset, switch, and disposal. VFX authoring
describes visual construction and local phase; it neither evaluates nor
duplicates semantic-event timelines.

## Closed authoring model

A version 1.0 document contains one or more reusable cues. Each cue references
an existing semantic cue descriptor, declares `one-shot`, `looping`, or
`persistent` lifecycle, an unsigned 32-bit seed, zero or more bounded typed
parameters and bindings, and one or more ordered layers.

A layer has:

- stable layer ID and unique integer order;
- `sprite-quad`, `ring`, `ribbon`, or `burst-particles` primitive;
- logical resource ID resolved through a typed descriptor;
- positive duration, non-negative delay, local position/rotation/scale, RGBA
  color, opacity, and abstract blend role;
- normalized scale and rotation curves; and
- count and rate for burst particles only.

Unknown fields fail schema validation. Logical resource IDs never contain
Cocos UUIDs, Unity assets, Godot resource paths, nodes, components, materials,
shaders, or APIs.

## Executable parameter bindings

Parameters are cue-local `number`, `integer`, or exact RGBA `color` values.
Numeric definitions require inclusive finite minimum and maximum bounds.
Colors contain exactly `r`, `g`, `b`, and `a`; extra payload is rejected for
JSON and direct-object inputs.

Bindings are a closed tuple of parameter ID, layer ID, target, and operation:

| Target | Parameter | Operation | Concrete result |
| --- | --- | --- | --- |
| `opacity` | number/integer | `multiply` | authored/default opacity × resolved value |
| `scale-x` | number/integer | `multiply` | authored/default local scale X × resolved value |
| `scale-y` | number/integer | `multiply` | authored/default local scale Y × resolved value |
| `color` | exact RGBA color | `replace` | concrete layer color becomes resolved RGBA |

No expression, script, JSON Pointer, or property path is permitted. Every
declared parameter binds at least once and at most 16 times. A concrete
layer/target has exactly zero or one binding. Unknown parameter/layer IDs,
incompatible types/operations, duplicate targets, and resolved out-of-range
opacity/scale/color fail before output.

Compilation resolves defaults or caller overrides, applies bindings, and
emits only concrete layer values. Parameter names, definitions, and bindings
do not appear in the Render Plan. Numeric binding products, effective alpha,
and compiled spawn times are canonicalized to 12 decimal places before JSON
serialization. An engine adapter therefore never interprets parameter names.

The reference bindings are:

- `footstep-dust.intensity` multiplies both layer opacities;
- `hand-tool-trail.trail-width` multiplies ribbon local scale Y; and
- `persistent-aura.tint` replaces both layer colors.

## Typed semantic cue descriptors

Compilation context contains `{ cueId, commandMode }` descriptors.
`commandMode` is exactly:

- `emit`: authoring lifecycle must be `one-shot`;
- `start-stop`: authoring lifecycle must be `looping` or `persistent`.

Unknown cue IDs, duplicate IDs, contradictory modes, and lifecycle mismatches
fail closed. These descriptors consume existing semantic metadata only; this
package does not change or reproduce evaluator behavior.

## Typed resource capabilities

Compilation context also contains logical resource descriptors:

```text
resourceId + recipeKind + compatiblePrimitives
```

V1 recipe kinds are:

- `textured-sprite`: `sprite-quad` and/or `burst-particles`;
- `procedural-ring`: `ring`; and
- `procedural-ribbon`: `ribbon`.

Descriptors must use a non-empty unique subset supported by their recipe
kind. Unknown, duplicate, contradictory, or primitive-incompatible resources
fail before a plan is produced. Each compiled layer carries both resource ID
and recipe kind. Future compilers dispatch by typed primitive/recipe
capability, never by matching `dust`, `trail`, `aura`, or another name.

## Normalization and canonical order

Compilation never mutates input. Defaults are explicit:

- delay `0`;
- position `(0, 0)`, rotation `0`, scale `(1, 1)`;
- white RGBA `(1, 1, 1, 1)`, opacity `1`, blend role `alpha`;
- scale curve `[(0, 1), (1, 1)]`; and
- rotation curve `[(0, 0), (1, 0)]`.

All canonical string order uses an explicit UTF-16 code-unit comparator:
`a < b`, `a > b`, otherwise equal. It applies to cue IDs, layer tie-breaks,
parameter/binding resolution, object keys, and diagnostics. No locale API is
used. Cues sort by cue ID, layers by integer order then layer ID, and object
keys by code unit. Arrays retain their specified semantic order. JSON contains
no insignificant whitespace and has one terminal newline.

## Curve and transform semantics

V1 curves:

- contain at least two keyframes;
- begin exactly at normalized time `0` and end exactly at `1`;
- have strictly increasing unique times;
- interpolate linearly;
- clamp samples below `0` to the first value and above `1` to the last;
- multiply the authored concrete base scale equally on X and Y for scale; and
- add unwrapped authored degrees to base rotation for rotation.

Position is the concrete authored local position and is not curve-modified in
V1. Effective alpha is exactly `color.a × opacity`, canonicalized to 12
decimal places. These rules and their fixed enum values are embedded at
Render Plan top level, while each layer contains concrete base transform,
color, opacity, effective alpha, and endpoint-complete curves.

## Layer-time and lifecycle semantics

Time zero is the semantic command start.

For every layer, `t < delay` is inactive. At `t = delay`, phase `0` is active.

For a one-shot layer:

- phase is `clamp((t - delay) / duration, 0, 1)`;
- exact `delay + duration` samples phase `1`;
- removal occurs only after that final sample; and
- it is removed for `t > delay + duration`.

For looping and persistent layers:

- delay applies once after semantic start;
- phase repeats across `duration`;
- an exact positive duration multiple belongs to the ending cycle at phase
  `1`; the next cycle starts immediately after the boundary at phase `0`;
- time alone never removes the layer; and
- semantic stop, Reset, track switch, or disposal remains authoritative for
  instance cleanup.

The plan encodes phase mode, exact-end rule, and removal authority per layer.
The package exports a reference sampler implementing the same rules.

## Deterministic burst particles

Burst particle indices are zero-based from `0` through `count - 1`.

- For positive rate, particle `i` spawns at
  `delay + i / ratePerSecond`.
- For rate `0`, every particle spawns instantaneously at `delay`.
- The final scheduled spawn must be no later than `delay + duration`.
- Count and rate are compile-time bounded; non-particle layers forbid
  emission.

Every burst layer compiles its complete spawn schedule. Each entry contains
particle index, canonical spawn time, and one deterministic unsigned 32-bit
random sample. Engines consume this data and do not select a PRNG.

The versioned algorithm recorded by the plan is `xorshift32-v1`:

```text
streamSeed = uint32(cueSeed XOR layerOrder)
if streamSeed == 0: streamSeed = 1831565813
x ^= uint32(x << 13)
x ^= x >>> 17
x ^= uint32(x << 5)
sample = uint32(x)
```

One sample is advanced per particle in index order. Golden vectors and all
four golden serialized plans lock this behavior.

## Fail-closed limits

No plan or partial plan is returned when any error exists.

| Budget | Limit |
| --- | ---: |
| Cues per document | 64 |
| Layers per cue | 16 |
| Parameters per cue | 32 |
| Bindings per cue | 64 |
| Bindings per parameter | 16 |
| Cue entries in override map | 64 |
| Overrides per cue | 32 |
| Semantic cue descriptors | 128 |
| Resource descriptors | 128 |
| Keyframes per curve | 32 |
| Total emitted particles | 4,096 |
| Serialized plan UTF-8 bytes | 1,048,576 |

Unknown cue override keys are rejected rather than ignored. Identifiers remain
bounded to 80 characters and logical resources to 128.

## Compatibility and portability

V1 accepts authoring versions `>=1.0.0 <1.1.0`; patch values share shape and
semantics. Unsupported major/minor versions fail closed.

The Render Plan contains only JSON primitives, typed semantic/resource
descriptors, concrete normalized layer values, fixed executable-semantics
enums, and compiled particle data. A future Cocos, Unity, or Godot resource
compiler maps typed recipes to engine resources but may not reinterpret
parameters, curves, alpha, phase, cleanup, emission, PRNG, or ordering.

## Non-goals

TASK-014D1 does not implement rendering or engine resource compilation, alter
Character Semantic Events schema/evaluator semantics, modify runtime adapters,
create a Creator Scene or `.meta`, generate media/evidence, implement editor
UI, start TASK-014D2/TASK-014D3, or modify a tag or release.

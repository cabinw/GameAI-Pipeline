# RFC-0015: Data-Driven VFX Cue Authoring

- Status: Accepted for TASK-014D1
- Date: 2026-07-28
- Scope: engine-neutral authoring, validation, normalization, and compilation

## Summary

TASK-014A established semantic event timing and stable VFX cue IDs. TASK-014B
and TASK-014C proved a Cocos renderer can consume those events, but their
procedural effect construction is not a portable production authoring source.
TASK-014D1 introduces a separate declarative source:

```text
Character Semantic Event cueId
→ VFX Authoring Document
→ validation and normalization
→ deterministic engine-neutral VFX Render Plan
→ future engine-specific compiler
→ Cocos / Unity / Godot renderer
```

The semantic-event evaluator remains authoritative for event time, target,
follow policy, and start/stop commands. VFX authoring describes how a named
visual cue is composed; it does not duplicate event evaluation.

## Authoring model

A version 1.0 document contains reusable cues. Each cue references an existing
semantic cue ID, declares a compatible `one-shot`, `looping`, or `persistent`
lifecycle, a deterministic unsigned 32-bit seed, optional bounded parameters,
and ordered layers. A layer has:

- a stable layer ID and unique integer order;
- one of `sprite-quad`, `ring`, `ribbon`, or `burst-particles`;
- a logical resource ID resolved through caller-provided registry context;
- duration, delay, local 2D position/rotation/scale, RGBA color, opacity, and
  an engine-neutral blend role;
- normalized scale and rotation curves; and
- emission count and rate for burst particles only.

Logical resource IDs identify portable art intent or procedural recipes. They
are not paths and cannot contain Cocos UUIDs, Unity asset references, Godot
resource paths, node/component names, materials, shaders, or engine APIs.

Parameter definitions are cue-local and typed as finite `number`, `integer`,
`boolean`, or RGBA `color`. Numeric parameters declare inclusive minimum and
maximum bounds. Compilation applies caller overrides only after type and range
validation, otherwise it emits normalized defaults.

## Normalization and deterministic compilation

Compilation never mutates input. It explicitly fills these defaults:

- delay `0`;
- position `(0, 0)`, rotation `0`, and scale `(1, 1)`;
- white RGBA `(1, 1, 1, 1)` and opacity `1`;
- blend role `alpha`;
- scale curve `[(0, 1), (1, 1)]`;
- rotation curve `[(0, 0), (1, 0)]`.

Cues sort by cue ID. Parameters sort by parameter ID. Layers sort by order then
layer ID. Curve keyframes remain in strictly increasing authored time order.
Object keys use lexicographic order in serialization, arrays preserve their
normalized semantic order, JSON has no insignificant whitespace, and one
terminal newline is emitted. The same valid input, registries, and overrides
therefore produce identical UTF-8 bytes.

V1 accepts schema versions `>=1.0.0 <1.1.0`. Patch versions share the same
shape and semantics. An unsupported major/minor fails closed; no migration or
best-effort downgrade is attempted.

## AI generation constraints

AI-authored input passes the same parser, canonical schema, semantic
validation, registry validation, compatibility validation, budget validation,
and deterministic compiler as human-authored input. Unknown fields and
unsupported primitives fail closed. Non-finite direct-object values are
rejected. Diagnostics have stable codes, JSON-pointer paths, deterministic
ordering, and contain no engine-dependent interpretation.

No render plan is returned when any error exists. Budget validation precedes
successful publication of the plan, including the serialized-size check.
The fixed V1 limits are:

| Budget | Limit |
| --- | ---: |
| Cues per document | 64 |
| Layers per cue | 16 |
| Keyframes per curve | 32 |
| Total emitted particles | 4,096 |
| Serialized render-plan UTF-8 bytes | 1,048,576 |

Identifiers are bounded to 80 characters and logical resource IDs to 128
characters. Caller registries are sets of known stable IDs rather than
engine-resource objects.

## Lifecycle compatibility

- `one-shot` accepts sprite quad, ring, ribbon, and burst particles.
- `looping` accepts sprite quad, ring, and ribbon; burst particles are
  rejected because V1 emission describes one bounded burst.
- `persistent` accepts sprite quad, ring, and ribbon; burst particles are
  rejected for the same reason.
- Burst particles require positive bounded emission count and non-negative
  bounded rate. Non-particle layers forbid emission.

These are authoring-contract restrictions, not renderer limitations.

## Portability expectations

The render plan contains only JSON-compatible primitives, normalized scalar
values, semantic IDs, logical resource IDs, typed primitive descriptors, and
abstract blend roles. A future Cocos, Unity, or Godot compiler may map them to
engine resources and runtime objects, but must do so outside this package.
Portability is an architectural guarantee; TASK-014D1 does not claim any
Unity or Godot runtime implementation or visual parity.

## Non-goals

TASK-014D1 does not implement Cocos rendering, change existing runtime
adapters, create a Creator Scene or `.meta`, generate media/assets, preview
effects, evaluate semantic events, add audio/gameplay execution, create
editor UI, start TASK-014D2 or TASK-014D3, or publish/modify a release or tag.

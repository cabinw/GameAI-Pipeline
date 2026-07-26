# RFC-0014: Character Semantic Events and VFX Cues

- Status: Accepted for TASK-014A
- Date: 2026-07-26
- Scope: engine-neutral contracts and animation-timeline evaluation only

## Summary

Character animation needs to announce meaningful timing without knowing how a
game engine renders, plays, or applies the result. This RFC separates the
timed announcement from the description of a visual-effect request.

The architecture is:

```text
animation/gameplay source
→ deterministic event evaluator
→ semantic event
→ engine adapter
→ engine-specific VFX/audio/gameplay implementation
```

TASK-014A implements only the animation-timeline source, contract validation,
and deterministic evaluator. Gameplay-triggered injection is an architectural
source only; it is not an implemented input path.

## Concept 1: semantic event

A semantic event is a versioned, engine-neutral timing record. Its identity is
stable across adapters and it contains:

- the event track and semantic animation clip IDs;
- a unique event ID, clip-local time, same-time order, and event kind;
- a semantic cue ID;
- an optional Rig Layout socket ID;
- a socket- or character-local transform;
- an optional generic layer role;
- position/rotation/scale follow flags;
- one-shot, looping, or persistent lifecycle;
- an applicable duration; and
- a payload discriminated by `vfx`, `audio`, or `gameplay`.

The payload is not an arbitrary dictionary. A VFX event names a VFX cue
definition, an audio event describes gain and pitch for its semantic audio cue,
and a gameplay event uses one of the supported window/signal actions.

Examples include footstep dust, a hand trail, an audio footstep, hit-active,
and hit-end. The event is delivery data, not an engine object and not proof
that an effect or gameplay action occurred.

## Concept 2: VFX cue definition

A VFX cue definition describes visual intent separately from the timed event.
It has a stable cue ID, a generic `burst`, `trail`, or `continuous` effect
kind, a short visual-intent description, and optional engine-neutral color,
intensity, size, and default-duration hints.

It does not contain a Cocos UUID, Unity asset reference, Godot resource path,
particle component, shader, texture, prefab, scene, or other engine resource
type. An engine adapter maps the cue ID and hints to an implementation owned by
that engine or game.

## Version and compatibility

The canonical document is
`schemas/character-semantic-events.schema.json`. TASK-014A implements:

```text
>=1.0.0 <1.1.0
```

The document binds tracks to semantic clip IDs. Validation receives the
selected animation clips and engine-neutral Rig Layout as context. Unknown
clips and sockets fail before an evaluator can be created.
Both parsed JSON and direct evaluator inputs use the same structural-schema
plus semantic validation boundary. Evaluator creation also requires an
explicit `initialTrackId`; track array order has no runtime meaning.

## Timeline and boundary policy

Normal forward playback uses:

```text
(previousTime, currentTime]
```

Events are ordered by clip-local `timeSeconds`, then authored `order`, then
`eventId`. Multiple same-time events are preserved.

- Initial Rest emits nothing.
- Exact Reset emits no authored timeline event, stops every active looping or
  persistent instance in stable instance-ID order, and returns progress to
  zero.
- During the first cycle, an event at time zero does not fire because zero is
  the open side of `(0, currentTime]`.
- At a loop wrap, time zero belongs to the new cycle and fires once.
- An event at exact clip duration belongs to the ending cycle and fires once
  before any time-zero event from the new cycle.
- Skipped frames and large deltas enumerate every crossed cycle.
- Pause advances no time and emits nothing.
- Resume continues from the same boundary without duplication.
- A clip change stops every active old-track instance, discards old-clip
  progress, and emits no old-track authored events.
- Reset followed by replay may emit nonzero events again.

Evaluator comparisons use a fixed boundary tolerance and monotonically stored
absolute progress so floating-point representation at a previously crossed
boundary cannot duplicate delivery.

## Lifecycle commands and compatibility

One-shot events produce an `emit` command. Looping and persistent VFX events
produce a `start` command with the stable instance ID
`<trackId>:<eventId>:<cycle>`. A looping duration produces a `stop` command at
the crossed absolute stop boundary. Persistent instances remain active until
Exact Reset, track switching, or `dispose()` cleanup. Pause and Resume do not
alter active instances.

Commands order by absolute boundary first. A lifecycle `stop` orders before
authored commands at the same boundary; authored exact-duration/ordinary
events then order before the next cycle's time-zero events. Within an authored
boundary, `order` and `eventId` remain the tie breakers. Cleanup commands order
by stable instance ID.

- `vfx` supports one-shot, looping, and persistent.
- A looping VFX event requires a positive finite duration.
- A persistent VFX event has no duration.
- `audio` and `gameplay` are one-shot in 1.0.
- Gameplay events do not carry a duration; window closure is a separate
  semantic event.

These restrictions are contract compatibility, not engine limitations.

## Gameplay window rules

`window-open` and `window-close` require a non-empty `windowId`. `signal`
forbids `windowId` and represents an instantaneous named semantic cue.
Window pairing is track-local and evaluated in deterministic authored
timeline order. A close must follow one open, an already-open ID cannot open
again, and every open must close within the same authored track. Windows do
not remain open across loop boundaries.

## Advancement bounds

Each `advance()` accepts at most 10,000 crossed cycles and at most 10,000
authored/lifecycle commands. The evaluator rejects a larger finite crossing,
an unsafe cycle index, or a non-finite accumulated/boundary/stop time before
mutating progress or active instances. These bounds prevent unbounded
enumeration while remaining far above ordinary skipped-frame and multi-loop
playback.

## Unsupported behavior

Reverse playback and arbitrary seeking fail explicitly. Network replication,
rollback, synchronization, adapter delivery, resource resolution, rendering,
audio playback, gameplay execution, and gameplay-triggered injection are not
implemented by TASK-014A.

## Alternatives rejected

- Embedding engine resource references would make the source non-portable.
- Treating VFX definitions and timed events as one concept would duplicate
  visual intent at every timestamp.
- An unrestricted `payload` object would move compatibility rules into
  adapters and make validation incomplete.
- Frame-index triggers would be rate-dependent and would not survive skipped
  frames.

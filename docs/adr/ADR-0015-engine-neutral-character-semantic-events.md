# ADR-0015: Engine-Neutral Character Semantic Events

- Status: Accepted
- Date: 2026-07-26

## Context

The v0.2.0 Character Loadout Baseline has semantic animation IDs and stable
Rig Layout sockets, but it has no portable way to express timed VFX, audio, or
gameplay meaning. Putting Cocos resources or runtime callbacks into animation
data would reverse the accepted dependency direction and prevent independent
Unity or Godot adapters.

## Decision

Add a standalone versioned Character Semantic Events contract and
`@gameai/character-semantic-events` engine-neutral package.

Semantic events and VFX cue definitions are separate concepts. Events carry
timing, transform/follow/lifecycle semantics, and an event-kind discriminated
payload. VFX definitions carry stable visual intent and generic hints only.
Neither contains engine resource types.

The only TASK-014A trigger source is an animation timeline. Evaluator creation
requires successful structural and semantic validation against declared
semantic animation clip IDs and socket IDs from an engine-neutral Rig Layout.
The evaluator advances normal forward time with `(previousTime, currentTime]`
and deterministic ordering by time, order, and event ID.

The delivery boundary remains:

```text
animation/gameplay source
→ deterministic event evaluator
→ semantic event
→ engine adapter
→ engine-specific VFX/audio/gameplay implementation
```

Gameplay-triggered injection is reserved as a future source at the left of
the boundary. It is not implemented by TASK-014A.

## Consequences

- Event timing and validation can be tested without an engine.
- Rig sockets remain stable semantic bindings rather than Cocos node names.
- Each engine owns resource lookup, effect instances, audio playback,
  gameplay execution, and runtime lifecycle.
- Reverse playback, seeking, networking, and adapter delivery remain
  unsupported until separately designed.
- No Cocos VFX runtime, Creator Scene, effect asset, audio asset, gameplay
  behavior, or rendered visual evidence is created by this decision.

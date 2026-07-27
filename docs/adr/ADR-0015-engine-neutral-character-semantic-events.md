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

The public parser and evaluator factory share one fail-closed structural and
semantic validation boundary. The factory requires an explicit initial track,
so authored array order cannot select runtime state. One-shot events emit
authored commands. Looping VFX create stable track/event/cycle-named
instances with per-cycle start and duration-stop commands. Persistent VFX use
one logical active key per track/event: the first actual start retains its
cycle in the concrete instance ID, and later loop crossings are coalesced
while that instance remains active. Reset, track switching, and disposal
expose deterministic one-stop-per-instance cleanup and permit a later start
after cleanup. Stops precede starts at an equal absolute boundary.
Advancement rejects non-finite accumulated time or more than 10,000
cycles/commands before state mutation.

Gameplay windows are paired within one authored track. Open/close require a
window ID, signals forbid one, and unmatched, duplicate, or unclosed windows
fail validation.

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
- Persistent means one active instance per track/event across animation
  cycles; every engine adapter receives the same coalesced lifecycle commands.
- Rig sockets remain stable semantic bindings rather than Cocos node names.
- Each engine owns resource lookup, effect instances, audio playback,
  gameplay execution, and runtime lifecycle.
- Adapters receive explicit lifecycle commands rather than inferring stop or
  cleanup behavior from authored starts.
- Reverse playback, seeking, networking, and adapter delivery remain
  unsupported until separately designed.
- No Cocos VFX runtime, Creator Scene, effect asset, audio asset, gameplay
  behavior, or rendered visual evidence is created by this decision.

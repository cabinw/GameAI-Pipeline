# ADR-0014: Recovered Cocos Loadout Release Candidate

- Status: Accepted
- Date: 2026-07-26

## Context

ADR-0013 separated Creator identity, runtime lifecycle, resource loading,
semantic input, global sorting, debug projection, and spatial assertions.
TASK-013R1-R6 then reintroduced the production-lite rig, accessories,
multi-part garment, and one-handed prop in externally reviewed increments.
The resulting R6 behavior is accepted, but its task-specific entry point is
not an appropriate long-term adapter identity.

The original `composable-full-loadout-reference.scene` predates these
boundaries. Its headless engine-neutral outputs remain useful provenance, but
its monolithic Cocos component is superseded and is not a production adapter.

## Decision

### Canonical adapter facade

The recovered Cocos release candidate exposes one fixture-neutral canonical
facade. It wraps or re-exports the accepted R6 modules rather than copying
their plan, state machine, manifest, semantic input, sorting, animation,
reset, projection, or spatial rules. Automated parity tests make drift from
the accepted R6 boundary a release failure.

### Creator-owned canonical identity

Cocos Creator 3.8.8 creates and saves the canonical Scene and component
metadata. The tracked Scene UUID, script UUID, imported metadata, and
serialized class ID remain Creator-owned. Generators may mirror deterministic
TypeScript/data into the project and validators may inspect metadata, but
neither may synthesize or replace identity.

### Engine-neutral source of truth

Rig hierarchy, pivots, rest transforms, semantic clips, attachment slots,
wearable membership, seams, prop states, sockets, anchors, grip locks, layer
roles, and loadout membership remain owned by engine-neutral contracts and
their deterministic resolver output. The Cocos facade translates the resolved
result into nodes, resources, Sorting2D, input dispatch, HUD, and debug
measurement without creating a second semantic source.

### Recovery supersedes the monolith

The old TASK-013 Full Loadout Scene and component remain tracked for history
and evidence reproducibility, but are explicitly non-production and
superseded. They are not imported by the canonical facade and are not deleted
by TASK-013R7.

### Cross-engine direction

A future Unity or Godot adapter must consume the same engine-neutral resolved
contracts and semantic IDs. It may implement engine-specific lifecycle,
resource, input, rendering, and debug projection boundaries, but must not
translate from Cocos Scene serialization or reuse Cocos-specific runtime
state.

## Acceptance

The canonical facade must be structurally equivalent to accepted R6 for:

- 12 loadout states and membership;
- no/left/right prop semantics;
- resource manifest;
- semantic input registry;
- global sorting;
- four semantic clip IDs;
- Exact Reset defaults; and
- spatial tolerance.

Both tracked verification modes must pass. One uninterrupted Creator gate
must cover canonical clean open, switch/reopen, consoles, every state and
clip, Pause/Resume, debug, transform stress, two lifecycle rebuilds,
post-rebuild switching, and Exact Reset. A final live smoke test must compare
the accepted R6 Scene. Any difference stops publication.

## Consequences

- Release identity is stable without rewriting accepted runtime behavior.
- Task-numbered recovery modules remain implementation details behind the
  canonical facade.
- The old monolithic demo remains auditable but cannot be mistaken for the
  supported adapter.
- Parity tests intentionally make R6 behavior changes explicit rather than
  allowing silent canonical drift.

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

The adapter facade also owns one typed display identity containing the
canonical adapter ID, production-facing HUD title, and ready-diagnostic ID.
The canonical component injects that identity into the reused runtime through
an explicit runtime boundary. The accepted R6 component supplies its existing
R6 identity through the same boundary. Scene/script filenames, branch names,
task IDs, and conditional asset names are not display-identity sources.

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
- Canonical HUD and ready diagnostics expose the production adapter identity
  without changing accepted R6 behavior or duplicating its component.
- Task-numbered recovery modules remain implementation details behind the
  canonical facade.
- The old monolithic demo remains auditable but cannot be mistaken for the
  supported adapter.
- Parity tests intentionally make R6 behavior changes explicit rather than
  allowing silent canonical drift.
The tracked engine-neutral full-loadout contract is the sole authority for
the canonical 12-state matrix. `framework/character-contracts` validates and
resolves each state; generation derives the R6-compatible Cocos plan from
that resolved membership and fails on parity drift. The Cocos adapter must
not independently construct the 4×3 cross-product.

Semantic input registration occurs only after the manifest passes, runtime
nodes and playback exist, Exact Reset completes, and the lifecycle reaches
ready. Failure, rebuild, disable, and destroy invalidate the generation and
leave zero active handlers.

The superseded TASK-013 monolith stays available for provenance, but its
generators are excluded from the default build and exposed only through an
explicit legacy verification command.

Runtime semantic validation is mandatory even without a full parser/schema
revision. A future schema/parser revision may encode the merged-loadout and
exclusive-group constraints structurally; that work is deferred because this
remediation preserves schema `1.0.0` and enforces the same conditions with
stable runtime error codes.

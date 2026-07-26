# ADR-0013: Minimal Cocos Runtime Adapter Boundaries

- Status: Accepted
- Date: 2026-07-25

## Context

TASK-013 proved deterministic engine-neutral character composition, but its
monolithic Cocos acceptance demo crossed scene serialization, Editor/runtime
lifecycle, resource loading, input, sorting, HUD, and debug-coordinate
boundaries without independently executable contracts. Seven sequential live
repairs corrected individual symptoms while exposing the next boundary.

ADR-0007 keeps AssetDB authoritative for metadata and requires detached,
validated scene construction. ADR-0008 distinguishes world-space character
content from its render-root and camera configuration. A minimal runtime
harness is required to make the remaining runtime boundaries measurable before
the Full Loadout can be connected again.

## Decision

### Creator-owned scene identity

Creator 3.8.8 creates and saves the harness scene and component metadata.
Tracked `.meta` UUIDs are authoritative. Repository validators may read,
resolve, and reject metadata, but generators never invent or replace scene,
asset, or component identities.

### Editor/runtime lifecycle separation

Editor deserialization performs no runtime resource loading or generated-tree
construction. Runtime setup is idempotent, waits for a complete manifest,
builds once, and records an explicit lifecycle generation. Disable/destroy
removes input listeners, invalidates load tokens, and tears down generated
nodes. Re-enable performs one explicit fresh setup.

### Manifest-driven resource loading

A frozen logical manifest is the only load input. One adapter converts logical
IDs to Cocos resource paths. Each path is requested once per generation.
Construction begins only on complete success; any failure is terminal and
partial output is forbidden.

### Semantic input registry

One typed registry owns semantic action ID, displayed key, Cocos KeyCode, HUD
label, and handler intent. HUD formatting and runtime dispatch consume that
registry. Unknown actions fail.

### Global sorting registry

One validated registry owns non-overlapping production, debug, and HUD ranges.
Runtime business code requests a semantic sorting role and never embeds an
independent sorting order.

### World-to-overlay-local projection

World-space targets remain below AdapterRoot. Debug Graphics live below a
separate Canvas overlay root. Every marker and segment endpoint is obtained by:

```text
target Node world position
→ DebugOverlayRoot UITransform inverse conversion
→ overlay-local Graphics geometry
```

No fixed Canvas compensation, character-specific offset, or fixed skeleton
segment is permitted.

### Runtime spatial assertions

The runtime measures projected marker/target error, live skeleton endpoint
error, actual socket/grip world distance, finite coordinates, bounds
intersection, and debug-OFF visibility. Assertions use current world
transforms after animation and stress transforms, not authored rest constants.

## Full Loadout gate

TASK-013 Full Loadout cannot be reconnected until the isolated harness passes
clean import, first open, scene switch, reopen, second initialization, complete
manifest load, semantic input, lifecycle teardown, transform stress, spatial
assertions, debug-OFF, and exact Reset in one uninterrupted Creator 3.8.8 run.

## Consequences

- Engine-neutral contracts and TASK-013 production artifacts remain frozen.
- Runtime failures are localized to small adapter modules.
- Static tests remain useful but cannot substitute for Creator runtime and
  visual acceptance.
- The initial recovery adds a small independent harness instead of expanding
  the old demo.

# TASK-013R1: Minimal Cocos Runtime Adapter Harness

## Objective

Establish and validate the smallest independent Cocos Creator 3.8.8 runtime
adapter harness before reconnecting the TASK-013 Full Loadout.

TASK-013R1 does not change engine-neutral contracts, production assets, the
frozen Full Loadout demo, or the existing TASK-013 evidence.

## Required harness

Create a separate Creator-owned scene containing:

- Canvas, Camera, AdapterRoot, and DebugOverlayRoot;
- root and child joints with two visible primitive parts;
- one live parent-child skeleton segment;
- one socket and one attachment grip anchor;
- one bounded HUD;
- one semantic debug toggle;
- a deterministic two-pose animation with Pause/Resume; and
- exact Reset to stopped time zero.

The scene must not be cloned from any TASK-010 through TASK-013 acceptance
scene. Creator owns its scene and script metadata. Validators may inspect
tracked metadata but may not synthesize UUIDs or class IDs.

## Runtime boundaries

Implement separately testable modules for:

1. lifecycle state and idempotent setup/teardown;
2. a frozen logical resource manifest and Cocos path conversion;
3. one semantic input registry consumed by HUD and dispatcher;
4. one global production/debug/HUD sorting registry;
5. world-to-DebugOverlayRoot-local projection; and
6. finite, bounded runtime spatial measurements.

Editor deserialization performs no runtime resource load. Runtime construction
begins only after the complete manifest succeeds. Failure is terminal and
partial construction is forbidden. Unknown semantic actions or states fail
without fallback.

## Transform stress

Validate alignment under AdapterRoot translation, non-unit scale, rotation,
nested-parent transform, both animation poses, disable/enable, exact Reset,
and scene reopen.

Required runtime tolerances:

- projected marker-to-target error `<= 0.5 px`;
- skeleton endpoint-to-joint error `<= 0.5 px`;
- locked socket-to-grip error `<= 0.5 px`;
- finite positions only;
- skeleton/debug bounds intersect the primitive character bounds; and
- debug OFF leaves no active or visible debug renderer.

All measurements use actual runtime world positions.

## Automated acceptance

Add:

- pure TypeScript tests for lifecycle, registries, semantic state, sorting,
  manifest coordination, projection math, and deterministic Reset;
- tracked-files-only tests for scene/meta/script/resource integrity;
- runtime assertions in the Creator harness; and
- a live Creator acceptance record.

Source-string checks may be secondary safeguards only.

Both verification modes must pass:

```bash
CI=true pnpm verify
pnpm install --frozen-lockfile # in a tracked-files-only checkout
CI=true pnpm verify
```

## Creator acceptance

In one uninterrupted final run:

1. clean import and first scene open;
2. switch to another valid scene and reopen the harness;
3. validate a second lifecycle initialization;
4. require zero relevant Creator and Preview warnings/errors;
5. require complete resource-manifest PASS;
6. run Web Preview at 1280x720;
7. exercise both poses, Pause/Resume, and exact Reset;
8. toggle debug ON and prove joints, live skeleton, socket, and grip alignment;
9. run translation, scale, rotation, nested-parent, and animation stress;
10. toggle debug OFF and prove all debug visuals are absent; and
11. prove reopen created no duplicate nodes or input response.

## Evidence

After all gates and both verification modes pass, publish a real
Creator 3.8.8 Web Preview recording named
`task-013r1-cocos-runtime-harness.mp4` on `evidence/task-013r1`.

The manifest records capture source, reviewed feature SHA, measured maxima,
H.264 High 1280x720/30 fps/yuv420p metadata, SHA-256, full-decode result, and
`pending-external-visual-review`. Re-download and fully decode the uploaded
copy.

## Stop conditions

Stop and report a consolidated inventory if completion requires:

- changing engine-neutral contracts or resolver behavior;
- deleting or changing existing TASK-013 production assets or the old demo;
- changing main, frozen feature, original evidence, or protected archive;
- a hard-coded character/Canvas compensation offset;
- a destructive or permission-sensitive action; or
- abandoning the measured invariants.

## Non-goals

No Full Loadout reconnection, production artwork, TASK-013R2, TASK-014, VFX,
new attachment schema, IK, automatic grip solving, PR, or merge.

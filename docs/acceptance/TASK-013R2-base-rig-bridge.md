# TASK-013R2 Base Rig Bridge Acceptance

## Result

Feature acceptance gate: **PASS**.

The accepted TASK-013R1 adapter boundaries scale from the isolated two-joint
harness to the complete production-lite base character without reconnecting
the old TASK-013 Full Loadout demo. The result remains intentionally limited
to the base rig. External visual review of its Creator Web Preview evidence:
**PASS**.

## Runtime surface

- Creator: 3.8.8
- Scene: `assets/task-013r2-base-rig-bridge.scene`
- Scene ownership: Creator-authored scene and script metadata
- Scene nodes at rest: Canvas and its Camera only
- Runtime component instances: 1
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child skeleton segments: 16
- Resource requests: 17 unique requests
- Resource terminal state: PASS, 17 loaded, 0 failed, 0 duplicates
- Explicit clips:
  - `production-lite-rest-idle`
  - `production-lite-arm-wave`
  - `production-lite-articulation-stress`
- Semantic actions: Rest, Wave, Integration Stress, Pause/Resume, Exact
  Reset, Debug, Transform Stress, Lifecycle Rebuild

The runtime consumes the existing generated production-lite plan derived from
the engine-neutral rig and animation contracts. It does not define a
Cocos-specific hierarchy, pivot table, part table, or semantic clip array.

## Adapter boundaries

- `HarnessLifecycle` owns generation tokens, setup, teardown, stale callback
  rejection, and lifecycle counts.
- `HarnessResourceCoordinator` owns terminal manifest completion and rejects
  duplicate requests or results.
- `BASE_RIG_INPUT_REGISTRY` is the single definition used by the dispatcher
  and HUD for semantic action ID, displayed key, Cocos `KeyCode`, label, and
  typed handler.
- `HARNESS_SORTING_POLICY` owns disjoint production, debug, and HUD ranges.
- `debug-space-projector.ts` reads each real joint world position, converts it
  through `DebugOverlayRoot` local space, and measures the round trip.
- Hierarchy spatial validation fails on tolerance overflow, non-finite
  positions, unknown parents, cycles, sorting violations, or debug geometry
  outside the measured character region.

The component performs no Editor-time runtime loading. Construction occurs
only after every manifest entry succeeds. Rebuild is an explicit
teardown/build sequence that unregisters input, invalidates prior load
generations, destroys generated roots, clears resource state, and then starts
one new generation.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Extension tests: 123 passed, 0 failed.
- Cocos tracked CI-surface tests: 3 passed, 0 failed.
- Tracked-files-only frozen install and `CI=true pnpm verify` — PASS.
- Generated R1/R2 boundary mirrors: byte-deterministic.
- Tracked Scene/script metadata audit: PASS.
- Unknown parent, cycle, unknown track, missing semantic clip, duplicate
  request, invalid sorting, and invalid spatial observations: fail closed.

## Creator 3.8.8 one-pass gate

- Clean import/open: PASS.
- Switch to accepted R1 Scene and reopen R2 Scene: PASS.
- Second lifecycle initialization: PASS.
- Creator Console: 0 warnings, 0 errors.
- Preview Console: 0 warnings, 0 errors; only engine timing information and
  `TASK_013R2_RUNTIME_READY` diagnostics for the initial build and the
  intentional lifecycle rebuild.
- Manifest: 17/17 PASS.
- Base Rest assembly: PASS; all 17 parts visible.
- Wave: PASS; shoulder/elbow/wrist hierarchy visibly articulates.
- Integration Stress: PASS; torso, limbs, and descendants articulate.
- Pause: PASS; current pose and time remain frozen.
- Resume: PASS.
- Exact Reset: PASS; authored Rest, `STOPPED`, `0.00`.
- Root translation/scale/rotation stress: PASS.
- Debug alignment during Rest/Wave/Stress and transform changes: PASS.
- Lifecycle rebuild: PASS; setup 2, teardown 1, one visible character.
- Duplicate input response after rebuild: 0.
- Debug OFF residual geometry: 0 visible pixels.

## Spatial results

- Maximum projected joint-marker error: `0.000 px`
- Maximum skeleton endpoint-to-joint error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Non-finite positions: 0
- Unknown parents: 0
- Parent cycles: 0
- Debug lines outside the character region: 0
- Production/debug/HUD sorting violations: 0

Measurements use current runtime world positions; no Canvas compensation,
character-specific debug offset, or fixed skeleton line is present.

## Evidence status

External visual review passed for
`task-013r2-base-rig-bridge.mp4`, captured from Creator 3.8.8 Web Preview.

- Reviewed feature:
  `fda803194a517960d9edec6ea362a929a0966827`
- Final evidence head:
  `0a11c7d1460c461a2312b4787cf6a69c995df451`
- Uploaded-copy verification source:
  `851c0024e81c214140eb6e116226172a162d8655`
- Size: 1,539,627 bytes
- Duration: 54.000 seconds
- Frames: 1,620
- Codec/profile: H.264 High
- Resolution/frame rate: 1280 x 720 at 30 fps
- Pixel format: `yuv420p`
- SHA-256:
  `8a9f142bd496b001e6e2842ad9d0f8fee28bb583820b887910444526de517219`
- Full decode: PASS
- Re-downloaded evidence SHA-256 identity: PASS

The visual review confirms:

- transition into real Cocos Web Preview;
- correct Base Rest assembly as one coherent 17-part character;
- expected Wave hierarchy articulation;
- arm, leg, and torso articulation during Integration Stress;
- 17 joint markers and 16 skeleton segments remaining aligned;
- Pause freezing the current pose and Resume continuing playback;
- root translation, scale, and rotation without debug drift;
- one visible character after lifecycle rebuild;
- exact Reset to Rest, `STOPPED`, `0.00`;
- no visible debug geometry after Debug OFF; and
- no clipping, duplicate character, flicker, jump, or layer anomaly.

This is Canvas-only video evidence. Creator Console cleanliness and
scene-switch/reopen results are supported by the recorded live acceptance
procedure and automated/runtime diagnostics rather than by video pixels
alone.

After this acceptance record is safely pushed, the temporary
`evidence/task-013r2` branch may be deleted. The ignored local recording is
retained and no MP4 becomes tracked.

## Limits

TASK-013R2 does not include accessories, garments, seams, props, grip,
loadout presets, comparison views, Red Cap, Full Loadout reconnection, VFX,
Unity, Godot, TASK-013R3, or TASK-014.

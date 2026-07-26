# TASK-013R4 Head Accessory Layering Bridge Acceptance

## Result

Implementation acceptance gate: **PASS**.
External visual review: **PASS**.

The accepted R1-R3 Cocos Adapter boundaries now resolve, load, mount, animate,
switch, sort, measure, rebuild, and reset a deterministic collection of
engine-neutral rigid attachments on the production-lite Base Rig. The
production-lite cap and sunglasses are fixture data; collection behavior
remains generic.

## Runtime surface

- Creator: 3.8.8
- Scene: `assets/task-013r4-head-accessory-layering.scene`
- Scene ownership: Creator-authored Scene and script metadata
- Scene nodes at rest: Canvas and its Camera only
- Runtime component instances: 1
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child Skeleton segments: 16
- Declared slots: 2
- Declared attachment parts: 3
- Resource requests: 20 unique requests
- Resource terminal state: PASS, 20 loaded, 0 failed, 0 duplicates
- Explicit clips:
  - `production-lite-rest-idle`
  - `production-lite-arm-wave`
  - `production-lite-articulation-stress`
- Explicit states and active attachment-part counts:
  - Base only: 0
  - Cap only: 2
  - Sunglasses only: 1
  - Cap plus sunglasses: 3

## Adapter boundaries

- The generator parses the existing engine-neutral Attachment Layout and
  resolves every state with the published resolver.
- One deterministic generic bridge plan owns declared slot IDs, attachment
  IDs, transforms, anchors, resources, state membership, draw order, and layer
  roles.
- The runtime extends the accepted single-attachment builder to a map of
  generic attachment bindings. Slot parenting uses declared base part IDs and
  never display-name or filename searches.
- One terminal resource manifest covers all 17 base parts and three attachment
  parts. Construction begins only after complete success.
- One semantic input registry defines action IDs, displayed keys, Cocos
  `KeyCode` values, HUD labels, and typed handlers. Its runtime and attachment
  controls are split into two readable HUD lines without duplicating control
  definitions.
- The accepted sorting registry owns production, debug, and HUD ranges.
  Fractional attachment order is converted into one deterministic total
  production order without fixture-specific Cocos sorting constants.
- Every active socket and attachment anchor is measured from its current
  runtime world transform and projected through `DebugOverlayRoot` local
  space.
- Unknown slots, roles, attachments, parents, resources, states, clips, and
  actions fail clearly without fallback.

The old Full Loadout Scene and monolithic demo are unchanged.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Total tests: 300 passed, 0 failed.
- Extension tests: 148 passed, 0 failed.
- Cocos tracked CI-surface tests: 3 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 300 passed, 0 failed.
- Generated R1-R4 runtime mirrors: byte-deterministic.
- Creator Scene/script/resource metadata audit: PASS.
- Reordered state/slot/attachment input remains deterministic.
- Duplicate IDs, invalid roles, unknown slots/parents/resources, invalid
  ordering, drift, non-finite positions, and duplicate runtime observations
  fail closed.

## Creator 3.8.8 one-pass gate

- Clean code-cache import/open: PASS.
- Switch to accepted R3 Scene and reopen R4 Scene: PASS.
- Second lifecycle initialization: PASS.
- Creator Console: 0 relevant warnings, 0 errors.
- Preview Console: 0 warnings, 0 errors; only engine timing information and
  `TASK_013R4_RUNTIME_READY`.
- Manifest: 20/20 PASS.
- Base-only: PASS; no cap or sunglasses visible.
- Cap-only: PASS; cap back and cap front visible with declared layering.
- Sunglasses-only: PASS; exactly one sunglasses attachment visible.
- Combined: PASS; cap back, sunglasses, and cap front visible exactly once.
- Repeated state switching: PASS; inactive visuals are removed and duplicates
  remain 0.
- Wave and Integration Stress: PASS; every attachment follows its declared
  runtime socket while front/back order remains stable.
- Pause: PASS; current pose and time remain frozen.
- Resume: PASS; playback continues.
- Translation/scale/rotation stress: PASS.
- Lifecycle rebuild: setup 2, teardown 1, rebuild 1, one character, three
  default-state attachment parts, no duplicate input response or resource
  request.
- Post-rebuild repeated switching: PASS.
- Exact Reset: authored Rest, `STOPPED`, `0.00`, default combined state,
  transform stress enabled, no duplicate nodes, Debug OFF.
- Debug OFF residual geometry: 0 visible pixels.

## Spatial, layer, and duplicate results

- Maximum projected joint-marker error: `0.000 px`
- Maximum Skeleton endpoint-to-joint error: `0.000 px`
- Maximum active socket-to-anchor world error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Unknown slots: 0
- Duplicate active attachment nodes: 0
- Duplicate input handlers: 0
- Duplicate resource requests: 0
- Production/debug/HUD sorting violations: 0
- Front/back role violations: 0
- Non-finite positions: 0
- Debug geometry outside the character region: 0

The resolved total order around the head is:

`hair-back < cap-back < head < sunglasses < hair-front < cap-front`.

Measurements use current runtime world positions. There is no Canvas
compensation, attachment-specific offset, fixture-specific sorting constant,
or fixed Skeleton geometry.

## Evidence status

External review accepted the complete real Creator Web Preview recording:

- File: `task-013r4-head-accessory-layering.mp4`
- Evidence commit:
  `6796a7a0744bc0add48f8eba79a453cf2f5ac32f`
- Size: 2,122,565 bytes
- Duration: 90.000 seconds
- Frames: 2,700
- Codec/profile: H.264 High
- Resolution/frame rate/pixel format: 1280 x 720, 30 fps, `yuv420p`
- SHA-256:
  `39052cdc157493dc3b5dc09ca6f4b1f9b8c1cc34072d2f6c78c7e3b71c5b0325`
- Local full decode: PASS
- Uploaded-copy SHA identity, metadata match, and full decode: PASS

The external review visibly verified all four attachment states and exact
active part counts 0/2/1/3, repeated switching, Wave, Integration Stress,
Pause/Resume, exact Reset, transform stress, joint/Skeleton and
socket/anchor alignment, and Debug-OFF cleanup. Lifecycle rebuild visibly
reported setup 2, teardown 1, rebuild 1; post-rebuild Base and Cap switching
remained exact. Resources remained 20/20 PASS, while duplicate attachment,
input, and resource counts, sorting and front/back violations, and spatial
errors remained zero.

The temporary `evidence/task-013r4` branch may be deleted after this
acceptance documentation is safely pushed. The ignored local recording is
preserved and no MP4 is tracked on the R4 feature branch.

## Limits

TASK-013R4 does not add garments, sleeves, cuffs, seams, props, grip,
automatic fitting, comparison views, Full Loadout presets, old Full Loadout
work, Red Cap, Unity, Godot, VFX, R5, TASK-014, a PR, or a merge.

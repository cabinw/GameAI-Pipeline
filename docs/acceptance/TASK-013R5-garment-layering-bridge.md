# TASK-013R5 Multi-Part Garment Layering Bridge Acceptance

## Result

Implementation acceptance gate: **PASS**.
External visual review: **PASS**.

The recovered R1-R4 Cocos Adapter boundaries now resolve, load, mount,
animate, switch, sort, measure, rebuild, and reset one contract-defined
multi-part wearable set together with the accepted generic head accessories.
The production-lite casual jacket is fixture data; runtime behavior remains
generic.

## Runtime surface

- Creator: 3.8.8
- Scene: `assets/task-013r5-garment-layering.scene`
- Scene ownership: Creator-authored Scene and script metadata
- Scene nodes at rest: Canvas and its Camera only
- Runtime component instances: 1
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child Skeleton segments: 16
- Declared slots: 12
- Declared attachment parts: 14
- Garment wearable-set parts: 11
- Head-accessory parts: 3
- Authored garment seams: 10
- Resource requests: 31 unique requests
- Resource terminal state: PASS, 31 loaded, 0 failed, 0 duplicates
- Explicit clips:
  - `production-lite-rest-idle`
  - `production-lite-arm-wave`
  - `production-lite-articulation-stress`
- Explicit states and active garment/accessory counts:
  - Base only: 0 / 0
  - Garment only: 11 / 0
  - Accessories only: 0 / 3
  - Garment plus accessories: 11 / 3

## Adapter boundaries

- The generator parses the existing engine-neutral TASK-011 Attachment Layout
  and resolves every required state through published attachment and
  wearable-set semantics.
- One deterministic bridge plan owns generic slot IDs, attachment IDs,
  transforms, anchors, resources, state membership, wearable membership,
  seam constraints, draw order, and layer roles.
- Runtime construction extends the accepted generic attachment collection;
  it has no jacket, collar, sleeve, cuff, cap, or sunglasses branch.
- One terminal resource manifest covers all 17 base parts and 14 attachment
  parts. No character node is constructed before manifest completion.
- One semantic input registry defines action IDs, displayed keys, Cocos
  `KeyCode` values, HUD labels, and typed handlers for clips, states, group
  toggles, playback, Reset, debug, transform stress, and rebuild.
- The accepted sorting registry owns production, debug, and HUD ranges.
  Contract draw order is converted into one deterministic total order without
  fixture-specific Cocos constants.
- Joint markers, Skeleton endpoints, accessory sockets/anchors, garment seam
  rectangles, and bounds are derived from current runtime world transforms
  and projected through `DebugOverlayRoot` local space.
- Garment seam error is the measured overlap deficit between current runtime
  world-space authored regions. Unknown semantic input fails without fallback.

The old Full Loadout Scene and monolithic demo are unchanged.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Total tests: 313 passed, 0 failed.
- Extension tests: 161 passed, 0 failed.
- Cocos tracked CI-surface tests: 3 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 313 passed, 0 failed.
- Generated R1-R5 runtime mirrors: byte-deterministic.
- Creator Scene/script/resource metadata audit: PASS.
- Reordered state, slot, wearable-set, attachment, and seam declarations
  remain deterministic.
- Duplicate IDs, invalid roles/orders/seams/states/resources, unknown
  slots/parents, drift, non-finite positions, and duplicate runtime
  observations fail closed.

## Creator 3.8.8 one-pass gate

- Full Creator restart and clean project/Scene open: PASS.
- Switch to accepted R4 Scene and reopen R5 Scene: PASS.
- Second lifecycle initialization through explicit rebuild: PASS.
- Creator Console after clearing unrelated editor startup UI output:
  0 relevant warnings, 0 errors.
- Preview Console: 0 warnings, 0 errors; only engine timing information and
  two `TASK_013R5_RUNTIME_READY` records.
- Manifest: 31/31 PASS before construction.
- Base-only: PASS; garment 0/11, accessories 0/3, active seams 0/10.
- Garment-only: PASS; garment 11/11, accessories 0/3, active seams 10/10.
- Accessories-only: PASS; garment 0/11, accessories 3/3, active seams 0/10.
- Garment plus accessories: PASS; garment 11/11, accessories 3/3, active
  seams 10/10.
- Rest, Wave, and Integration Stress: PASS; articulated garment parts follow
  the real base hierarchy, every seam remains within tolerance, and every
  accessory follows its declared socket.
- Pause: PASS; current Wave pose and time remained frozen.
- Resume: PASS; playback continued from the frozen time.
- Translation/scale/rotation stress: PASS; all debug geometry remained
  aligned.
- Lifecycle rebuild: setup 2, teardown 1, rebuild 1, one character, one
  default active set, no duplicate input response or resource request.
- Post-rebuild garment OFF/ON and accessories OFF/ON: PASS; exact active
  counts and rendering were restored without duplicates.
- Exact Reset: authored Rest, `STOPPED`, `0.00`, default combined state,
  transform stress OFF, Debug OFF.
- Debug OFF residual geometry: 0 visible pixels.

## Spatial, layer, and duplicate results

- Maximum projected joint-marker error: `0.000 px`
- Maximum Skeleton endpoint-to-joint error: `0.000 px`
- Maximum active accessory socket-to-anchor world error: `0.000 px`
- Maximum garment seam error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Unknown slots: 0
- Duplicate active garment nodes: 0
- Duplicate active accessory nodes: 0
- Duplicate input handlers: 0
- Duplicate resource requests: 0
- Production/debug/HUD sorting violations: 0
- Front/back role violations: 0
- Non-finite positions: 0
- Debug geometry outside the viewport: 0

Measurements use current Creator runtime world positions. There is no Canvas
compensation, character-specific offset, fixture-specific sorting constant,
automatic fitting, or fixed Skeleton geometry.

## External visual acceptance

External review independently verified the uploaded evidence at
`f0ded791e75811f3b9a48c7030a167b06576d68d`.

- Uploaded SHA-256 identity: PASS
- Encoding: H.264 High, 1280x720, 30 fps, yuv420p
- Frames: 4,095/4,095 decoded successfully
- Base only: garment 0, accessories 0
- Garment only: garment 11, accessories 0
- Accessories only: garment 0, accessories 3
- Garment plus accessories: garment 11, accessories 3
- Garment layering around torso, arms, and cuffs: PASS
- Garment seams in Rest, Wave, and Integration Stress: PASS
- Accessory socket alignment: PASS
- Joint and Skeleton debug alignment: PASS
- Pause/Resume and transform stress: PASS
- Lifecycle rebuild: setup 2, teardown 1, rebuild 1
- Post-rebuild garment/accessory switching: PASS
- Exact Reset: authored Rest, STOPPED, 0.00 seconds
- Final state: transform stress OFF, Debug OFF
- Spatial, sorting, front/back, duplicate, and resource errors: 0

The reviewed video SHA-256 is
`b6c956b15806eb84380945111c6bcec8d2e8b68659c2fb4ca969eb59e7e63908`.
The temporary `evidence/task-013r5` branch may be removed after this
acceptance documentation is safely pushed. The ignored local recording
remains preserved and no MP4 is tracked on the R5 feature branch.

## Limits

TASK-013R5 does not add props, grip, IK, cloth physics, mesh deformation,
automatic garment fitting, root motion, animation blending, Unity/Godot
adapters, Windows work, Red Cap reconstruction, old Full Loadout migration,
R6, TASK-014, a PR, or a merge.

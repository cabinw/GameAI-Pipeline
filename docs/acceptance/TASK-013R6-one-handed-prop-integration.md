# TASK-013R6 Generic One-Handed Prop Integration Acceptance

## Result

Implementation acceptance gate: **PASS**.
External visual review: **PENDING**.

The recovered R1-R5 Cocos Adapter boundaries now resolve, load, mount,
animate, switch, sort, measure, rebuild, and reset one contract-defined
one-handed prop together with the accepted base rig, multi-part garment, and
head accessories. The TASK-012 prop art remains fixture data; runtime
behavior is generic.

## Runtime surface

- Creator: 3.8.8
- Scene: `assets/task-013r6-one-handed-prop-integration.scene`
- Scene ownership: Creator-authored Scene and script metadata
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child Skeleton segments: 16
- Garment parts: 11
- Head-accessory parts: 3
- Prop attachments: 4
- Primary prop attachments: 2
- Hand-overlay attachments: 2
- Authored garment seams: 10
- Resource requests: 35 unique requests
- Resource terminal state: PASS, 35 loaded, 0 failed, 0 duplicates
- Cross-product states: 12
- Explicit prop states:
  - no prop
  - left-hand prop
  - right-hand prop
- Explicit clips:
  - `production-lite-rest-idle`
  - `production-lite-arm-wave`
  - `production-lite-prop-swing`
  - `production-lite-articulation-stress`

## Adapter boundaries under acceptance

- The bridge consumes published TASK-010, TASK-011, and TASK-012
  engine-neutral contracts and resolver behavior.
- One deterministic plan owns generic slots, attachment IDs, anchors,
  transforms, resource IDs, state membership, draw order, and layer roles.
- Runtime behavior understands generic prop attachments and hand overlays;
  fixture item names do not select behavior.
- One terminal resource manifest must complete before construction.
- One semantic input registry supplies action IDs, displayed keys, Cocos
  `KeyCode` values, HUD labels, and typed handlers.
- The accepted global sorting registry owns production, debug, and HUD
  ranges.
- Grip error is the actual current world-space distance between the active
  hand socket and active prop grip anchor.
- All debug geometry is projected from current world positions through the
  accepted `DebugOverlayRoot` world-to-local conversion path.

The old Full Loadout Scene and monolithic demo remain outside this task and
must not change.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Total tests: 327 passed, 0 failed.
- Extension tests: 175 passed, 0 failed.
- Cocos tracked CI-surface tests: 3 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 327 passed, 0 failed.
- Generated R1-R6 runtime mirrors: byte-deterministic.
- Creator Scene/script/resource metadata audit: PASS.
- Reordered prop states, slots, and attachment declarations remain
  deterministic.
- Unknown state/socket/slot/parent/resource/role/clip data and duplicate IDs
  fail closed.
- Prop Swing and Integration Stress were sampled at 60 Hz for both authored
  hand states: 580 samples, maximum grip error `0.000 px`.

## Creator 3.8.8 one-pass gate

- Clean project/Scene import and open: PASS.
- Switch to the accepted R5 Scene and reopen R6: PASS.
- Creator Console: 0 relevant warnings, 0 errors.
- Preview Console: 0 warnings, 0 errors; four engine timing information
  records and two `TASK_013R6_RUNTIME_READY` records.
- Web Preview design resolution: 1280x720.
- Manifest completed 35/35 PASS before construction.
- All 12 garment/accessory/prop cross-product states: PASS.
- No-prop states: zero primary props and zero hand overlays.
- Left/right states: exactly one primary prop and one matching hand overlay.
- Rest, Wave, Prop Swing, and Integration Stress: PASS.
- Pause: current Wave pose and time remained frozen.
- Resume: playback continued from the frozen time.
- Debug markers, real parent-child Skeleton, accessory sockets, garment
  seams, prop socket/grip markers, bounds, and pivots: PASS.
- Translation, scale, rotation, and nested transform stress: PASS.
- Lifecycle rebuild: setup 2, teardown 1, rebuild 1, one character, default
  active garment/accessory state, and no prop.
- Post-rebuild no/left/right/no prop switching: PASS.
- Post-rebuild garment OFF/ON and accessories OFF/ON switching: PASS.
- Exact Reset: authored Rest, `STOPPED`, `0.00`, default combined
  garment/accessory state, no prop, transform stress OFF, Debug OFF.
- Final Debug-OFF state remained clean for more than two seconds.

## Spatial, layer, and duplicate results

- Maximum projected joint-marker error: `0.000 px`
- Maximum Skeleton endpoint-to-joint error: `0.000 px`
- Maximum active accessory socket-to-anchor world error: `0.000 px`
- Maximum garment seam error: `0.000 px`
- Maximum active prop socket-to-grip world error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Unknown hand sockets: 0
- Duplicate active garment nodes: 0
- Duplicate active accessory nodes: 0
- Duplicate active primary prop nodes: 0
- Duplicate input handlers: 0
- Duplicate resource requests: 0
- Production/debug/HUD sorting violations: 0
- Front/back role violations: 0
- Non-finite positions: 0
- Debug geometry outside the character region: 0

Measurements use current Creator runtime world positions. There is no Canvas
compensation, character-specific offset, item-name behavior, implicit
mirroring, inverse grip solving, or fixed Skeleton geometry.

## External visual acceptance

Pending evidence capture and external review. The complete live gate passed
without a runtime defect, so evidence may be recorded from the accepted
Creator Web Preview.

## Limits

TASK-013R6 does not add two-handed props, inverse grip solving, IK, prop
physics, collision, combat, cloth physics, mesh deformation, automatic
fitting, root motion, animation blending, Unity/Godot adapters, Windows
validation, Red Cap reconstruction, old Full Loadout migration, TASK-013R7,
TASK-014, a PR, or a merge.

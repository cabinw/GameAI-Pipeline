# TASK-013R3 Single Attachment Bridge Acceptance

## Result

Feature acceptance gate: **PASS**.

The accepted R1/R2 adapter boundaries now resolve, load, mount, animate,
toggle, measure, rebuild, and reset one engine-neutral rigid attachment on the
production-lite Base Rig. The production-lite sunglasses are acceptance data;
the adapter core remains generic. External visual review is pending.

## Runtime surface

- Creator: 3.8.8
- Scene: `assets/task-013r3-single-attachment-bridge.scene`
- Scene ownership: Creator-authored Scene and script metadata
- Scene nodes at rest: Canvas and its Camera only
- Runtime component instances: 1
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child skeleton segments: 16
- Resolved attachments: 1
- Resource requests: 18 unique requests
- Resource terminal state: PASS, 18 loaded, 0 failed, 0 duplicates
- Explicit clips:
  - `production-lite-rest-idle`
  - `production-lite-arm-wave`
  - `production-lite-articulation-stress`
- Explicit states:
  - Base only
  - Base plus attachment

## Adapter boundaries

- The generator parses and resolves the published Attachment Layout and emits
  a deterministic runtime-safe bridge plan.
- The runtime parents the slot through the declared base part ID, then applies
  generic slot, attachment, anchor, transform, enabled-state, resource, and
  ordering fields.
- The resource coordinator requires terminal completion before construction
  and rejects duplicate requests and results.
- One semantic registry defines the action ID, displayed key, Cocos KeyCode,
  HUD label, and typed handler used by both HUD and dispatcher.
- The accepted global sorting registry owns production, debug, and HUD ranges;
  deterministic fractional production ordering inserts the attachment without
  fixture-name logic.
- Socket and attachment-anchor observations come from current runtime world
  transforms and are projected through `DebugOverlayRoot` local space.
- Unknown attachments, parents, resources, clips, and semantic actions fail
  clearly without fallback.

The old Full Loadout Scene and monolithic demo are unchanged.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Total tests: 287 passed, 0 failed.
- Extension tests: 135 passed, 0 failed.
- Cocos tracked CI-surface tests: 3 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 287 passed, 0 failed.
- Generated R1/R2/R3 runtime mirrors: byte-deterministic.
- Creator Scene/script/resource metadata audit: PASS.
- Unknown attachment, parent, resource, clip, duplicate request, invalid
  sorting, drift, non-finite, and duplicate-node observations: fail closed.

## Creator 3.8.8 one-pass gate

- Clean import/open: PASS.
- Switch to accepted R2 Scene and reopen R3 Scene: PASS.
- Second lifecycle initialization: PASS.
- Creator Console: 0 relevant warnings, 0 errors.
- Preview Console: 0 relevant warnings, 0 errors.
- Manifest: 18/18 PASS.
- Base Rest assembly: PASS; all 17 parts visible.
- Base-only state: PASS; no attachment visible.
- Attachment-enabled state: PASS; exactly one attachment visible.
- Wave and Integration Stress attachment follow: PASS.
- Pause holds the exact current pose and time: PASS.
- Resume continues playback: PASS.
- Translation/scale/rotation stress: PASS.
- Disable/re-enable deduplication: PASS.
- Lifecycle rebuild: setup 2, teardown 1, rebuild 1, one character, one
  attachment.
- Exact Reset: authored Rest, `STOPPED`, `0.00`, default attachment enabled,
  transform stress enabled, Debug OFF.
- Debug OFF residual geometry: 0 visible pixels.

## Spatial and duplicate results

- Maximum projected joint-marker error: `0.000 px`
- Maximum skeleton endpoint-to-joint error: `0.000 px`
- Maximum socket-to-anchor world error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Non-finite positions: 0
- Unknown slots: 0
- Duplicate attachment nodes: 0
- Duplicate input handlers: 0
- Duplicate resource requests: 0
- Debug geometry outside the character region: 0
- Production/debug/HUD sorting violations: 0

Measurements use current runtime world positions. No Canvas compensation,
head-specific offset, sunglasses-specific placement correction, or fixed
skeleton line is present.

## Evidence status

The implementation is ready for a real Cocos Creator 3.8.8 Web Preview
recording on temporary branch `evidence/task-013r3`. The evidence must be
H.264 High, 1280 x 720, 30 fps, `yuv420p`, fully decodable, hashed, uploaded,
re-downloaded, and verified byte-identical before external review.

## Limits

TASK-013R3 does not add cap layering, multiple attachments, garments, seams,
props, grip, comparison views, loadout presets, old Full Loadout work, Red
Cap, VFX, Unity, Godot, TASK-013R4, TASK-014, a PR, or a merge.

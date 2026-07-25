# TASK-013R7 Recovered Full-Loadout Release Candidate Acceptance

## Result

Implementation acceptance gate: **PASS**.
External visual review: **PASS**.

TASK-013R7 publishes the externally accepted R1-R6 recovery chain through one
canonical engine-neutral Cocos adapter facade and one Creator-owned canonical
Scene. It adds no attachment family or runtime capability. The accepted R6
plan remains the runtime source of truth, and the original monolithic
TASK-013 Cocos demo remains tracked only as a superseded, non-production
reference.

## Canonical runtime surface

- Creator: 3.8.8
- Canonical Scene:
  `assets/composable-character-loadout-reference-v2.scene`
- Canonical component:
  `GameAIComposableCharacterLoadoutReferenceV2`
- Canonical adapter ID:
  `gameai-composable-character-loadout-reference-v2`
- Canonical display title:
  `GAMEAI · COMPOSABLE CHARACTER LOADOUT V2`
- Accepted implementation source: TASK-013R6 generic one-handed prop
  integration
- Base Sprite parts: 17
- Runtime joints: 17
- Live parent-child Skeleton segments: 16
- Garment parts: 11
- Head-accessory parts: 3
- Prop attachments: 4
- Total resources: 35
- Cross-product states: 12
- Runtime tolerance: `0.5 px`

The Creator-owned Scene contains one canonical adapter component. It contains
neither the accepted R6 component identity nor the superseded monolithic
TASK-013 component identity. The facade inherits the accepted R6 behavior
without copying pivots, hierarchy, resources, states, clips, controls,
sorting, reset defaults, or tolerance values.

## Canonical boundary and parity

- One canonical descriptor identifies the adapter, schema version, Scene,
  implementation source, state IDs, semantic clip IDs, sorting ranges,
  resource IDs, reset defaults, and spatial tolerance.
- The descriptor is deterministically generated into the Creator runtime
  mirror.
- Canonical and accepted R6 plans are structurally equal.
- All 12 state IDs and resolved attachment membership are equal.
- Manifest logical IDs and resource paths are equal.
- Semantic action IDs, displayed keys, Cocos `KeyCode` values, HUD labels,
  and typed handler intents are equal.
- Production, debug, and HUD sorting ranges and resolved orders are equal.
- Rest, Wave, Prop Swing, and Integration Stress clip IDs are equal.
- Exact Reset defaults and the `0.5 px` tolerance are equal.
- Unknown resources, states, slots, parents, roles, and clips continue to
  fail closed without fallback.

## Automated verification

- Working copy: `CI=true pnpm verify` — PASS.
- Total tests: 337 passed, 0 failed.
- Extension tests: 185 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 337 passed, 0 failed.
- Generated canonical runtime mirror: byte-deterministic.
- Creator Scene/script/resource metadata audit: PASS.
- Global metadata audit: PASS.
- Exactly one canonical Scene component: PASS.
- Accepted R6 Scene and runtime implementation remained unchanged.
- Tracked MP4 count: 0.

## Creator 3.8.8 one-pass gate

- Clean canonical Scene import/open: PASS.
- Switch to the accepted R6 Scene and reopen the canonical Scene: PASS.
- Creator Console: 0 relevant warnings, 0 errors.
- Preview Console: 0 warnings, 0 errors.
- Web Preview design resolution: 1280x720.
- Manifest completed 35/35 PASS before construction.
- All 12 garment/accessory/prop states: PASS.
- No-prop, left-hand prop, and right-hand prop selection: PASS.
- Rest, Wave, Prop Swing, and Integration Stress: PASS.
- Pause froze the active Integration Stress pose and time.
- Resume continued from the frozen time.
- Debug markers, live Skeleton, accessory sockets, garment seams, prop
  socket/grip markers, bounds, and pivots: PASS.
- Translation, scale, rotation, and nested transform stress: PASS.
- First rebuild: `SETUP 2 / TEARDOWN 1 / REBUILDS 1`.
- Post-first-rebuild garment, accessory, and prop inputs: PASS.
- Second rebuild: `SETUP 3 / TEARDOWN 2 / REBUILDS 2`.
- Post-second-rebuild state, clip, debug, and transform inputs: PASS.
- Exact Reset: authored Rest, `STOPPED`, `0.00`, combined garment/accessory
  state, no prop, transform stress OFF, and Debug OFF.
- Accepted R6 parity smoke: PASS for default, left prop, right prop,
  Integration Stress, and Exact Reset.
- No canonical/R6 live difference or defect occurred.

External review of the first evidence capture found a release-blocking
identity leak: the canonical HUD reported the accepted R6 task title. The
focused repair injects the typed canonical display identity through the
adapter boundary while preserving the accepted R6 title in the R6 Scene.
The replacement evidence proved both identities and repeated the
release-candidate gate; external visual acceptance is **PASS**.

### Focused identity repair verification

- Canonical V2 HUD:
  `GAMEAI · COMPOSABLE CHARACTER LOADOUT V2` — PASS.
- Canonical V2 preview contains no visible `TASK-013R6` identity — PASS.
- Accepted R6 HUD retains
  `TASK-013R6 · GENERIC ONE-HANDED PROP INTEGRATION` — PASS.
- Return to canonical V2, no/left/right prop, garment/accessories combined,
  Integration Stress, one Lifecycle Rebuild, and Exact Reset — PASS.
- Manifest remained 35/35 PASS.
- Spatial, duplicate, sorting, role, non-finite, and debug-region counters
  remained 0.
- Creator Console and Preview Console remained clean.
- No other runtime or visual defect appeared during the authorized focused
  gate.

## Spatial, layer, lifecycle, and duplicate results

- Maximum projected joint-marker error: `0.000 px`
- Maximum Skeleton endpoint-to-joint error: `0.000 px`
- Maximum accessory socket-to-anchor error: `0.000 px`
- Maximum garment seam error: `0.000 px`
- Maximum prop socket-to-grip error: `0.000 px`
- Runtime tolerance: `0.5 px`
- Unknown hand sockets: 0
- Duplicate garment nodes: 0
- Duplicate accessory nodes: 0
- Duplicate prop nodes: 0
- Duplicate input handlers: 0
- Duplicate resource requests: 0
- Production/debug/HUD sorting violations: 0
- Front/back role violations: 0
- Non-finite positions: 0
- Debug geometry outside the character region: 0

Measurements use current Creator runtime world positions and the accepted
world-to-`DebugOverlayRoot` projection. There is no Canvas compensation,
character-specific offset, item-name dispatch, implicit mirroring, inverse
grip solving, or fixed Skeleton geometry.

## Evidence status

External visual review of the replacement Creator 3.8.8 Web Preview evidence:
**PASS**.

- Reviewed feature:
  `ce5bb6d1f0b7f1676243ded6e2781d915f7005b4`
- Reviewed evidence:
  `ebd447ad6e7158d1dfa26f7ea5e60bc74daa851f`
- Replacement recording:
  `task-013r7-recovered-full-loadout-release-candidate-v2.mp4`
- Canonical Creator-owned V2 Scene identity: visible
- Canonical HUD identity:
  `GAMEAI · COMPOSABLE CHARACTER LOADOUT V2`
- Visible `TASK-013R6` identity in canonical preview: none
- Loadout coverage: all 12 states, including no/left/right prop states
- Animation coverage: Wave, Prop Swing, and Integration Stress
- Runtime coverage: Pause/Resume, spatial Debug overlays, Transform Stress,
  two Lifecycle Rebuilds, post-rebuild switching, and Exact Reset
- Lifecycle counters: `SETUP 1 / TEARDOWN 0 / REBUILDS 0` to
  `SETUP 3 / TEARDOWN 2 / REBUILDS 2`
- Final state: authored Rest, `STOPPED`, `0.00s`, no prop, Stress OFF,
  Debug OFF
- Spatial, duplicate, sorting, and role violations: 0
- Size: 1,895,523 bytes
- Duration: 93.000 seconds
- Frames: 2,790
- Codec/profile: H.264 High
- Resolution/frame rate/pixel format: 1280x720, 30 fps, `yuv420p`
- SHA-256:
  `84424ea760bbeb721e0610afa380450623f702f5ebd6cadf8acff8f4563420a8`
- Complete 2,790-frame decode: PASS
- Uploaded-copy byte size, SHA-256, frame count, metadata, and full decode:
  PASS

The original
`task-013r7-recovered-full-loadout-release-candidate.mp4` remains recorded in
the reviewed evidence manifest with status
`superseded-canonical-hud-identity-mismatch`.

## Limits

TASK-013R7 does not add a new attachment family, schema or resolver change,
old monolithic demo repair, Red Cap reconstruction, IK, physics, blending,
root motion, VFX, Unity/Godot adapters, Windows validation, TASK-014, or a
merge.

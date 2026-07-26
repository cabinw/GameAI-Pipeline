# TASK-013R7 Recovered Full-Loadout Release Candidate Acceptance

## Result

Implementation acceptance gate: **PASS**.
External visual review: **PASS**.

TASK-013R7 publishes the externally accepted R1-R6 recovery chain through one
canonical engine-neutral Cocos adapter facade and one Creator-owned canonical
Scene. It adds no attachment family or runtime capability. The accepted R6
behavior is preserved as a derived Cocos representation. The tracked
engine-neutral 12-state contract is authoritative,
`resolveCharacterLoadout` validates and resolves that contract, and the
generator converts the resolved output into the R6-compatible Cocos plan.
The original monolithic TASK-013 Cocos demo remains tracked only as a
superseded, non-production provenance reference.

## Canonical runtime surface

- Creator: 3.8.8
- Canonical Scene:
  `assets/composable-character-loadout-reference-v2.scene`
- Canonical component:
  `GameAIComposableCharacterLoadoutReferenceV2`
- Canonical adapter ID:
  `composable-character-loadout-reference-v2`
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

- The engine-neutral contract defines the complete unique 4-by-3 matrix:
  base/garment/accessory membership crossed with no/left/right prop state.
- `resolveCharacterLoadout` is the single semantic validation and resolution
  boundary for all 12 states. The generated Cocos plan is derived output and
  is not a second state authority.
- One canonical descriptor identifies the adapter, schema version, Scene,
  resolved state IDs, semantic clip IDs, sorting ranges, resource IDs, reset
  defaults, and spatial tolerance.
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
- Total tests: 349 passed, 0 failed.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify` — PASS, 349 passed, 0 failed.
- Generated canonical runtime mirror: byte-deterministic.
- Exact expected generated-file closure: PASS; missing, stale, and unexpected
  generated files fail verification.
- Post-verify `git diff --exit-code` and empty tracked
  `git status --porcelain`: PASS.
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
- Duplicate hand-overlay nodes: 0
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

Garment seam checks use axis-aligned world-space bounding boxes (AABBs)
derived from the transformed authored seam regions. They prove the declared
minimum AABB overlap, not oriented-polygon intersection or cloth correctness.

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

## Draft PR #9 pre-merge remediation

The externally reviewed runtime implementation is
`d9e7bfae0151dec71ebb58456f69b900eed9cf3a`. The following commit titled
`docs: accept TASK-013R7 pre-merge remediation` is documentation-only; it
records this acceptance without changing the reviewed runtime.

The focused remediation leaves the accepted visual design, controls, state
membership, resource count, animation IDs, sorting, and Reset defaults
unchanged while hardening the pre-merge boundaries:

- input registration occurs only after terminal manifest PASS, runtime node
  construction, playback creation, exact Reset, and lifecycle READY;
- failure, disable, destroy, and rebuild transitions expose zero stale input
  handlers;
- the engine-neutral contract owns the complete unique 12-state matrix and
  the Cocos plan is a tested derived representation;
- merged duplicate IDs, unknown members and prop states, invalid/conflicting
  exclusive groups, and incompatible rig references fail with stable
  diagnostics before lookup-map construction;
- accessory drift compares the evaluated slot world position with the
  independently resolved attachment-anchor world position;
- duplicate primary prop and hand-overlay nodes are both guarded;
- default generation excludes the superseded monolith, which remains
  available only through the explicit legacy/provenance command;
- affected generators reject missing, stale, or unexpected generated files
  and record transitive provenance.

Runtime readiness is strictly ordered:

`loading → resources-passed → nodes-built → reset-complete → ready`.

Keyboard input is registered only in `ready`. Exactly one handler is active
after successful readiness; loading, terminal failure, rebuild teardown,
disable, and destroy expose zero active handlers. A stale generation cannot
dispatch actions into a rebuilding runtime.

The added stable semantic validation codes are:

- `DUPLICATE_ATTACHMENT_SLOT_ID_ACROSS_FAMILIES`
- `DUPLICATE_WEARABLE_SET_ID_ACROSS_FAMILIES`
- `DUPLICATE_PROP_STATE_ID_ACROSS_FAMILIES`
- `DUPLICATE_ATTACHMENT_SEAM_ID_ACROSS_FAMILIES`
- `DUPLICATE_LOADOUT_STATE_ID`
- `DUPLICATE_EXCLUSIVE_GROUP_ID`
- `UNKNOWN_LOADOUT_PROP_STATE`
- `UNKNOWN_ATTACHMENT_SLOT_MEMBER`
- `UNKNOWN_WEARABLE_SET_MEMBER`
- `UNKNOWN_EXCLUSIVE_GROUP_MEMBER`
- `INVALID_EXCLUSIVE_GROUP_DECLARATION`
- `CONFLICTING_EXCLUSIVE_GROUP_DECLARATION`
- `INCOMPATIBLE_LOADOUT_RIG`

Existing duplicate attachment, draw-order, dependency, exclusivity, state,
schema-version, and semantic-animation diagnostics remain fail-closed. No
duplicate is silently overwritten during `Map` construction, and an unknown
prop state is never interpreted as no prop.

Accessory validation now derives the expected socket world position from the
evaluated rig pose and declared slot, while deriving the actual anchor world
position independently from the resolved attachment transform. A negative
fixture perturbs the attachment anchor by `3 px` and measures a real `3 px`
error. Runtime duplicate validation independently counts both primary prop
nodes and hand-overlay nodes.

The uninterrupted Creator 3.8.8 remediation gate passed with 35/35 resources,
all 12 states, Rest, Wave, Prop Swing, Integration Stress, Pause/Resume,
spatial Debug, Transform Stress, two lifecycle rebuilds, post-rebuild
switching, and Exact Reset. Creator and Preview consoles were clean. Maximum
joint, Skeleton, accessory socket, garment seam, and prop grip errors were
`0.000 px`; duplicate, sorting, role, non-finite, unknown-member, and viewport
violation counts were 0.

External visual review of the replacement remediation evidence: **PASS**.

- Reviewed runtime implementation:
  `d9e7bfae0151dec71ebb58456f69b900eed9cf3a`
- Evidence branch: `evidence/task-013r7-pr-remediation`
- Evidence head: `392b85a95535d7423c8b6dea34af87a9ee225300`
- Publication commit: `f213373700eb090403419c664262f52177d43768`
- Recording:
  `task-013r7-pr-remediation-live-cocos-web-preview.mp4`
- Size/duration/frames: 1,831,062 bytes, 72.000 seconds, 2,160 frames
- Codec/profile: H.264 High
- Resolution/frame rate/pixel format: 1280x720, 30 fps, `yuv420p`
- SHA-256:
  `30fa9988defc305388b93a2bc4b079ff42d00f7b4558ef630986c63e48960abe`
- Local and uploaded-copy metadata/SHA identity: PASS
- Complete FFmpeg decode: PASS

The full timeline visibly passed canonical identity and HUD visibility, all
12 states, no/left/right prop, Rest, Wave, Prop Swing, Integration Stress,
Pause/Resume, spatial Debug, Transform Stress, two rebuilds, post-rebuild
controls, Exact Reset, and the final clean Debug-OFF state. No missing part,
duplicate attachment, layering error, drift, or residual debug geometry was
visible. This remediation evidence supplements rather than rewrites the
earlier accepted identity-repair evidence and the superseded original video
history recorded above.

## Limits

TASK-013R7 does not add a new attachment family or schema, old monolithic demo
repair, Red Cap reconstruction, IK, physics, blending, root motion, VFX,
Unity/Godot adapters, Windows validation, TASK-014, or new user-facing
loadout behavior. Its resolver changes are limited to making the existing
engine-neutral 12-state contract authoritative and adding fail-closed
semantic validation.

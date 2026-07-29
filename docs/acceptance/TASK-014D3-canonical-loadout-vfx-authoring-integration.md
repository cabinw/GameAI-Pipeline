# TASK-014D3 Canonical Full-Loadout Data-Driven VFX Acceptance

## Result

Implementation acceptance gate: **PASS**.
Creator 3.8.8 live gate: **PASS**.
Evidence publication and replay gate: **PASS; external review pending**.
External review status: `pending-external-code-and-visual-review`.

Baseline `main`:
`dc6dad52d4a40714d6e3f12352d5593763655c55`.

## Required evidence

The final closeout records:

- feature and evidence SHAs plus local/remote parity;
- exact hand-authored, generated, Scene/`.meta`, asset and media scope;
- focused, extension, D1, semantic-event, clean-CI and complete verification
  test counts;
- D2 descriptor/runtime/Scene parity and shared-implementation closure;
- all 12 loadout and no/left/right prop target results;
- Dust, hand/tool Trail, Aura coalescing, Combined, Pause/Resume, Stress,
  Debug, two rebuilds, post-rebuild effects and Exact Reset results;
- root/input, ownership, cleanup, position, rotation, four-corner AABB,
  viewport, non-finite and stale-target measurements;
- Creator 3.8.8 clean-import/open/switch/reopen/restart/Preview console matrix;
- evidence links, video SHA/codec/size/rate/pixel format/frame count/decode,
  fixed RGB24 analyzer domain and reproduced analysis JSON;
- feature tracked MP4 count, empty PR query, protected-reference identity and
  explicit confirmation that TASK-014D4 was not started.

## Creator storyboard

One continuous 1280×720, 30 fps, H.264 High, yuv420p Creator Web Preview
recording covers the required 20-gate sequence from D2 open through D3 reopen,
all canonical states/effects, Reset and a final clean hold of at least five
seconds. Relevant Creator and Preview warnings/errors, duplicates, leaks,
stale targets, ownership mismatch, cleanup errors and spatial overflow must
remain zero; root/input remain `1/1`.

The reproducible RGB24 analyzer fixes FFmpeg version, complete-frame hash
domain, frame indices, half-open ROIs and thresholds for Reset→Hand Trail,
Pause stability, Pause→Resume, Reset→Tool Trail, Reset→post-rebuild Trail and
single-instance Aura visibility.

## Automated verification

| Gate | Result |
| --- | --- |
| Focused D3 and Scene integrity | `28/28 PASS` |
| Complete extension | `293/293 PASS` |
| D1 VFX authoring | `16/16 PASS` |
| Character Semantic Events | `24/24 PASS` |
| Cocos CI | `3/3 PASS` |
| Cocos clean-CI typecheck | PASS |
| Working-copy verification | `491/491 PASS` |
| Frozen tracked-files-only verification | `491/491 PASS` |

Schema identity, D1 vectors, D2 parity, generated plan/runtime/Scene closure,
metadata/atomic publication, Markdown links, diff/byte closure, binary/media
and protected-reference audits all pass.

## Creator 3.8.8 result

The final run began from a clean import and opened D2, switched to D3,
switched through an accepted older Scene, reopened D3, then performed a
second Creator startup directly into D3. Creator and Preview relevant
warnings/errors were `0`.

All 12 loadout states and no/left/right prop were visible. Actual evaluated
left/right foot, active hand, prop grip and torso targets drove Dust,
Hand/Tool Trail and Aura. The run covered Rest, Walk, Wave, Prop Swing,
Integration Stress, Pause/Resume, Combined, Transform Stress, Debug, two
consecutive Rebuilds, post-rebuild Dust/Trail/Aura, Exact Reset and a final
clean hold longer than five seconds.

Aura reached `attempts 6`, `accepted 1`, `coalesced 5` with
evaluator/adapter/visible `1/1/1`. Throughout stable states root/input remained
`1/1`; duplicate, missing, extra, mismatched, stale, leaked and cleanup-error
counts remained zero; position/rotation/four-corner AABB, viewport overflow
and non-finite diagnostics remained zero.

The isolated-browser capture contains no pointer or camera-selection glyph.

## Focused transaction cleanup closeout

The real TASK-014D3 component now owns one D2-coordinated teardown
transaction spanning semantic evaluator, VFX runtime, VFX host, input
unregistration, both root detach/destroy pairs, reference clearing and the
parent lifecycle. Setup failure, terminal failure, rebuild, disable and
destroy use that boundary. Target invalidation and Exact Reset use the same
accepted coordinator as scoped VFX cleanup transactions.

The automated real-component/parent fault matrix covers seven entry paths by
all ten component cleanup steps (`70` cases). It verifies the first business
error by object identity, ordered cleanup errors, continuation after every
fault, retained compensation ownership and exactly-once successful steps.
Component compensation reaches root/input/owner/material/node
`0/0/0/0/0`; the same instance then reaches READY `1/1/0/0/0`.

Creator 3.8.8 repeated all ten terminal teardown faults and the six additional
entry cases (`16` cases). Setup, terminal, rebuild and disable recovered to
READY after zero-count compensation; destroy ended DISPOSED with all counts
zero. Target invalidation retried only `runtime-cleanup`, ran old-host cleanup
once and published no replacement map on failure. Exact Reset kept the live
component root/input `1/1` while VFX ownership reached zero. The final normal
Preview reported no warnings or errors.

## Final lifecycle and partial-build ownership closeout

Creator invoked the same component's actual `onDisable` and `onDestroy`
callbacks in sequence by disabling and destroying it. `onDisable` completed
ordinary teardown and left readiness/lifecycle inactive/idle with
root/input/owner/material/node `0/0/0/0/0`. `onDestroy` performed only the
remaining dispose finalization. Both phases ended DISPOSED, while all ten
transaction step attempt counts remained exactly one.

The parent publishes generated-root ownership immediately after attachment
and does the same for the overlay root. Eight Creator faults before
`this.runtime` assignment cover base, attachment, prop, overlay, Graphics,
Graphics Sorting2D, HUD and HUD Sorting2D. Every case preserves the primary
failure, compensates to `0/0/0/0/0`, and retries the same component to READY
`1/1/0/0/0` without a duplicate-root failure.

The `70`-case pure transaction test is explicitly named a synthetic
coordinator closure matrix. Real component and parent claims are supported by
the Creator callback and early-build gates above.

# TASK-014C: Canonical Full-Loadout Semantic VFX Integration

- Status: Implemented — Pending External Visual Review
- Date: 2026-07-27
- Branch: `feat/task-014c-canonical-loadout-semantic-vfx`
- Baseline: `48316aa2603f9235ebafc83c726b7f0bff822348`
- Creator baseline: 3.8.8
- Expected budget: at most 70 changed files and 12,000 changed lines,
  including one Creator-owned Scene/`.meta` pair; zero feature-branch MP4 or
  audio files

## Objective

Integrate the accepted Character Semantic Events evaluator and TASK-014B
Cocos Semantic VFX Adapter into the canonical V2 full-loadout character
runtime without changing the engine-neutral schema/evaluator or canonical
loadout resolver architecture.

## Canonical composition boundary

```text
full-loadout-source.json
→ engine-neutral contracts
→ resolveCharacterLoadout
→ deterministic canonical Cocos plan
→ evaluated pose and semantic target registry
→ Character Semantic Events evaluator
→ accepted TASK-014B semantic VFX adapter
→ Cocos renderer registry
```

The TASK-014C composition layer is Cocos-only. It consumes the canonical plan,
evaluated joint poses, declared sockets/grips, shared evaluator commands, and
the existing adapter. It owns neither a second resolver nor a second event
evaluator. Engine-neutral packages contain no Cocos types.

## Acceptance matrix

| Area | Required coverage | Pass condition |
| --- | --- | --- |
| Loadout | Base, Accessories, Garment, Garment + Accessories × no/left/right prop | All 12 resolver-derived states selectable with exact membership |
| Clips | Rest, Walk, Wave, Prop Swing, Integration Stress | One canonical clip registry drives controls, evaluator selection, and HUD |
| Dust | Walk, left and right foot | Alternating one-shots spawn from captured real foot transforms and clean |
| Trail | Wave and Prop Swing | One looping instance follows active hand/tool position and rotation and stops deterministically |
| Aura | persistent Rest/Aura track | One logical instance across at least six loops and Pause/Resume |
| Target changes | loadout and no/left/right prop changes while active | Atomic re-resolution, valid retention/reprojection, invalid stop once |
| Stress | OFF/ON/OFF and all effects under ON | Finite, aligned transforms with safe viewport and zero projection error above tolerance |
| Lifecycle | clean open, switch/reopen, second startup, two rebuilds | One root/input, no stale generation/target/renderer/resource state |
| Reset | Exact Reset | canonical defaults, Rest/STOPPED/0.00, stress/debug OFF, zero VFX/leaks |
| Presentation | 1280×720 Web Preview | complete HUD, centered character, visible distinct VFX, no clipping/overlap |

## Semantic targets and VFX mapping

| Logical target | Canonical source | Event use | Failure policy |
| --- | --- | --- | --- |
| `left-foot` | evaluated left-foot joint/socket | alternating Dust | stable unknown/unavailable-target diagnostic |
| `right-foot` | evaluated right-foot joint/socket | alternating Dust | stable unknown/unavailable-target diagnostic |
| `body-center` | evaluated torso/body socket | persistent Aura | stable unknown/unavailable-target diagnostic |
| `active-hand-tool` / no prop | authored default hand target | Wave/Prop Swing Trail | never infer another hand |
| `active-hand-tool` / left prop | declared left prop grip/effect target | Prop Swing Trail | no filename or Canvas fallback |
| `active-hand-tool` / right prop | declared right prop grip/effect target | Prop Swing Trail | no filename or Canvas fallback |

Changing loadout state rebuilds the immutable semantic-target snapshot from
the new canonical plan. Active renderers keep logical target IDs, not raw
stale Node ownership. Retention is permitted only when the same logical target
remains valid; retained renderers are atomically reprojected. An invalidated
target stops its active renderer exactly once.

## Control table

One typed registry is the sole source for every action ID, displayed key,
Cocos `KeyCode`, dispatcher intent, HUD help item, and registry test.

| Intent | Required binding |
| --- | --- |
| Rest / Walk / Wave / Prop Swing / Integration Stress | five semantic clip selections |
| Pause/Resume | one playback toggle |
| Exact Reset | one reset action |
| Transform Stress | one stress toggle |
| Lifecycle Rebuild | one rebuild action |
| Garment / Accessories | two independent membership toggles |
| No / Left / Right prop | three explicit prop selections |
| VFX debug / target debug | two explicit debug toggles |
| Reference / Assembled / Overlay | typed view selection where supported |

Exact keys are finalized in the registry after collision validation against
the accepted canonical controls. No runtime or HUD owns a handwritten copy.

## HUD layout

The 1280×720 HUD uses bounded, independently measured lines:

1. canonical TASK-014C identity, readiness, resources, PASS/FAIL;
2. loadout state, prop state, clip/track, playback status/time;
3. semantic target resolution and active logical target;
4. command counts and last command;
5. evaluator/adapter/visible/UIRenderer/Sorting2D instance counts;
6. projection and Dust/Trail/Aura position/rotation maxima;
7. duplicate, unknown-stop, leak, stale-target, root, input, viewport, and
   non-finite counters;
8. lifecycle setup/teardown/rebuild generation;
9. registry-derived clip/playback/reset controls;
10. registry-derived loadout/prop/stress/rebuild/debug/view controls.

Every line must fit the allocated label bounds at design resolution. HUD and
VFX regions must not overlap in Normal or Stress mode.

## Lifecycle policy

```text
LOADING
→ RESOURCES_PASSED
→ LOADOUT_BUILT
→ SOCKETS_RESOLVED
→ EVENTS_READY
→ RESET_COMPLETE
→ READY
```

- Input registers once only after `READY`.
- Failure, disable, destroy, rebuild, and generation invalidation unregister
  input and invalidate pending asynchronous work.
- Teardown disposes evaluator state, delivers/absorbs cleanup exactly once,
  cleans adapter renderers, destroys partial renderer nodes, and clears all
  target references.
- Rebuild creates a new generation and never dispatches through an old one.
- Two consecutive rebuilds must leave one runtime root, one input handler,
  and no duplicated resource requests or stale nodes.

## Exact Reset policy

Exact Reset restores the canonical default combined garment/accessory state
with no prop, authored Rest pose and semantic Rest track, `STOPPED`, `0.00`,
Transform Stress OFF, both debug overlays OFF, zero active VFX, zero stale
targets, one runtime root, one input handler, and zero duplicate starts,
unknown stops, or leaks.

## Evidence storyboard

One continuous real Creator Web Preview capture shows:

1. clean Rest and default loadout;
2. representative traversal proving all 12 loadout states;
3. no/left/right prop;
4. Walk with alternating foot Dust;
5. Wave Trail;
6. Prop Swing Trail at the resolved hand/tool;
7. persistent Aura through six loops and Pause/Resume;
8. loadout/prop switching while VFX is relevant;
9. Transform Stress with Dust, Trail, and Aura;
10. two consecutive Lifecycle Rebuilds;
11. all effects after rebuild;
12. Exact Reset and a final clean two-second hold.

The final file must be H.264 High, 1280×720, 30 fps, yuv420p, fully decoded,
SHA-256 recorded, and self-reviewed with the pointer outside the relevant
Canvas region. Only `manifest.json` and the final MP4 may exist on
`evidence/task-014c`.

## Automated acceptance criteria

- [x] All 12 loadout states and all logical target mappings pass.
- [x] No/left/right prop active-hand/tool resolution is deterministic.
- [x] Target invalidation and atomic re-resolution pass.
- [x] Aura coalescing, Trail lifecycle, Dust capture/cleanup, Pause/Resume,
      loops, switching, rebuild, and Exact Reset pass.
- [x] Unknown target/socket, duplicate renderer, stale target, sorting,
      finite-transform, viewport, and ROI failures are rejected.
- [x] Source/generated mirror identity and typed input/HUD parity pass.
- [x] Build/typecheck, Cocos clean-CI typecheck, focused/extension/semantic
      tests, working-copy verify, and frozen tracked-only verify pass.
- [x] Generated closure, schema identity, metadata/atomic-publication
      regressions, `git diff --check`, binary audit, and post-verify clean
      content pass.
- [x] Creator 3.8.8 and final evidence gates pass exactly as storyboarded.

Implementation, automated verification, Creator acceptance, and local evidence
self-review are complete. The temporary evidence handoff remains
`pending-external-visual-review`; no TASK-014C PR has been created.

## Non-goals

No schema/version or evaluator-semantics change, loadout resolver rewrite,
new VFX art, audio/gameplay execution, canonical V2 behavior change,
superseded TASK-013 monolith reuse, Red Cap work, Unity/Godot/Windows claims,
TASK-014D, tag, release, PR, merge, or protected-reference mutation.

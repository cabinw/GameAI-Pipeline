# TASK-014D3: Canonical Full-Loadout Data-Driven VFX Integration

- Status: Accepted after external code and visual review
- Date: 2026-07-29
- Branch: `feat/task-014d3-canonical-loadout-vfx-authoring-integration`
- Baseline: `dc6dad52d4a40714d6e3f12352d5593763655c55`
- Creator baseline: 3.8.8
- Maximum feature scope: 55 changed files, 12,000 net changed lines
- Feature media budget: zero tracked MP4 files

## Objective

Make the accepted TASK-014D1 authoring contract and TASK-014D2 Cocos Render
Plan adapter the canonical full-loadout VFX data path. The canonical runtime
must consume a compiled concrete Render Plan instead of constructing effects
from cue or resource names.

## Architecture audit

The accepted sources and owners are:

| Boundary | Accepted source | D3 use |
| --- | --- | --- |
| 12-state loadout and resolver | `@gameai/character-contracts` plus the TASK-013/R6 canonical adapter | Reuse unchanged |
| Pose, animation, Stress, Rebuild and Exact Reset | canonical V2 Creator runtime inherited by TASK-014C | Reuse lifecycle hooks and evaluated nodes |
| Semantic target resolution | TASK-014C `canonical-semantic-vfx-contract.ts` | Reuse left/right foot, torso and active hand/prop-grip bindings |
| Event timing and coalescing | `@gameai/character-semantic-events` evaluator | Reuse unchanged |
| Authoring/compiler/sampler | `@gameai/vfx-authoring` and four accepted textual fixtures | Combine fixtures; compile before runtime; mirror sampler exactly |
| Cocos descriptors/runtime | TASK-014D2 descriptor compiler and runtime state | Shared production modules |
| Renderer/material/spatial/cleanup | TASK-014D2 Creator host, factories and cleanup coordinator | Shared by D2 and D3 |

TASK-014C owns current loadout controls, semantic tracks, target re-resolution,
Transform Stress, lifecycle rebuild and Exact Reset composition. TASK-014D1
already provides all required parameters, overrides, typed logical resources,
four primitives and four compiled reference plans. TASK-014D2 already owns
typed recipe dispatch, exact D1 sampling, visibility, sorting, blend readback,
world projection, transformed four-corner bounds, ownership diagnostics and
fault-safe compensation. None of those semantics may be forked in D3.

## Acceptance criteria

- [x] One engine-neutral textual canonical document combines Footstep Dust,
      Hand/Tool Trail, Persistent Aura and Combined without duplicate visual
      semantics.
- [x] D1 parsing, compilation and overrides resolve every parameter to
      concrete values before publication; repeated, permuted and locale
      builds serialize byte-identically.
- [x] The published Render Plan contains no parameter, binding, engine path,
      Node, Material, Cocos API or engine type and has stale/missing closure
      tests.
- [x] Canonical runtime imports only concrete plan/types and contains no JSON
      parser, authoring parser, parameter resolver or second sampler/time math.
- [x] D2 minimal Scene and D3 canonical Scene consume one shared descriptor,
      runtime state, cleanup, renderer/factory, material, sorting, spatial and
      diagnostics implementation.
- [x] D2 preserves primary-versus-cleanup errors, compensation ownership,
      root/input/owner/material/node truth, destroy exactly once,
      same-component retry, Blend Gate ownership and blend readback,
      visibility boundaries and persistent coalescing.
- [x] D3 is an independent Creator-owned Scene and leaves TASK-014C bytes
      unchanged.
- [x] All 12 canonical loadout states and no/left/right prop resolve the
      actual evaluated left foot, right foot, torso and current hand/tool
      world targets.
- [x] Walk alternates Dust feet; Wave follows the active hand; Prop Swing
      follows the prop grip; Aura remains at torso with one logical instance.
- [x] Target invalidation stops the old instance before atomic rebinding.
      Loadout, prop and clip changes leave no stale target or renderer.
- [x] Rest, Walk, Wave, Prop Swing, Integration Stress, Pause/Resume,
      Transform Stress, Debug, Combined, two consecutive rebuilds and
      post-rebuild effects pass.
- [x] Exact Reset restores canonical default loadout, no prop, authored Rest,
      semantic Rest, `STOPPED 0.00s`, Stress/Debug OFF, active/stale VFX zero,
      root/input `1/1`.
- [x] Global production character, attachment/garment/prop, VFX, Debug and HUD
      sorting bands are centralized and non-conflicting.
- [x] Normal/Stress position, rotation, transformed four-corner AABB, viewport
      inset, finite, stale-target and exact renderer ownership guards pass.
- [x] The 1280×720 HUD shows all required state and diagnostic fields without
      clipped single-line shortcut text.
- [x] Focused positive and negative tests cover the complete task matrix,
      D2 parity, no name dispatch/duplicated sampling and generated closure.
- [x] Working-copy and frozen tracked-only full gates, Creator 3.8.8 matrix,
      scope/media/reference audits and post-verify clean closure pass.
- [x] Feature and evidence branches are pushed with local/remote SHA parity;
      the feature tracks zero MP4 files; evidence is downloaded and
      byte/decode/RGB24-analysis verified.
- [x] No PR or merge is created, protected references remain unchanged, and
      TASK-014D4 is not started.
- [x] Real D3 setup and terminal failure, target invalidation, Exact Reset,
      rebuild, disable and destroy enter the accepted D2 all-steps cleanup
      coordinator boundary.
- [x] The first business error object keeps stable identity while ordered
      cleanup errors remain independent; every cleanup step runs, failed
      steps retain compensation ownership and completed steps run exactly
      once.
- [x] Component compensation reaches root/input/owner/material/node
      `0/0/0/0/0`, then the same component retries to READY with root/input
      `1/1`. Exact Reset remains a live-component VFX subtransaction, so its
      root/input stay `1/1` while VFX owner/material/node reach zero.
- [x] Failed target rebind publishes no new target map and removes the old
      target renderer before retry.
- [x] The focused fault matrix covers all ten real D3 component/parent
      teardown steps across all seven entry paths; it does not rely only on a
      fake host or low-level runtime.
- [x] The real Creator callback sequence disables and then destroys the same
      component. Ordinary teardown runs once on disable; destroy performs only
      the remaining dispose finalization, leaving readiness and lifecycle
      DISPOSED without repeating detach/destroy.
- [x] Generated and overlay roots publish ownership immediately after
      attachment. Creator faults before base, attachment, prop, overlay,
      Graphics, both Sorting2D sites and HUD runtime publication compensate to
      zero and retry the same component to READY `1/1` without duplicate roots.
- [x] Synthetic coordinator/counter coverage is named synthetic. Real
      component and parent lifecycle claims are reserved for Creator gates
      that execute the actual callbacks and build path.

## Verification closeout

- Focused D3 and Scene integrity: `28/28`.
- Complete extension: `293/293`.
- D1 VFX authoring: `16/16`.
- Character Semantic Events: `24/24`.
- Cocos CI: `3/3`; clean-CI typecheck passed.
- Working-copy and frozen tracked-files-only verification: `491/491` each.
- Creator 3.8.8 completed clean D2 open, D3 switch/reopen, alternate accepted
  Scene, second startup directly into D3, and the complete 20-gate Preview
  matrix with zero relevant Creator/Preview warning or error.
- The live Aura run reached `attempts 6`, `accepted 1`, `coalesced 5` while
  evaluator/adapter/visible instances remained `1/1/1`.
- Normal, Transform Stress, Debug, two consecutive Rebuilds, post-rebuild
  effects and Exact Reset ended with root/input `1/1`, no active/stale/leaked
  ownership, no cleanup error and no spatial/non-finite/viewport failure.
- External review passed for feature
  `6d43609d099b9a4909b92c7edb288afe615e7615` and reviewed evidence
  `9cdf32003ed654b619acb6a7cf4b4808eed719ac`. The append-only evidence
  acceptance commit is `118003e6e8dc85d7bb86900f5f252e856461e0e9`;
  its manifest status is `passed-external-code-and-visual-review`.

### Focused transaction cleanup closeout

- Automated synthetic coordinator closure matrix: seven entry paths by ten
  cleanup steps (`70` cases), plus target-rebind atomic-publication coverage.
- Creator 3.8.8 component matrix: all ten teardown steps under terminal
  failure, plus setup failure, target invalidation, Exact Reset, rebuild,
  disable and destroy (`16` cases).
- Every Creator case preserved primary error identity and ordered cleanup
  errors. Failed or detach-dependent steps attempted twice; successful
  independent steps attempted once.
- Setup, terminal, rebuild and disable compensation reached
  root/input/owner/material/node `0/0/0/0/0`; same-component retry reached
  READY `1/1/0/0/0`. Destroy ended DISPOSED `0/0/0/0/0`.
- Target invalidation retained `runtime-cleanup` ownership for its second
  attempt while `semantic-stop` and `host-cleanup` each ran once. Exact Reset
  retained the live root/input `1/1` and cleared VFX ownership to zero.
- The restarted normal Preview emitted zero warnings/errors after the
  transaction fault matrix.

### Final lifecycle and partial-build ownership closeout

- Creator invoked the actual callback order `onDisable` then `onDestroy` by
  disabling and destroying the component. After disable, readiness/lifecycle
  were inactive/idle and root/input/owner/material/node were all zero. After
  destroy, both phases were DISPOSED.
- Every component cleanup step had exactly one attempt across the consecutive
  callbacks. Destroy performed dispose-only lifecycle finalization and did
  not repeat either root detach/destroy pair.
- Eight pre-publication Creator build faults covered base, attachment, prop,
  overlay, Graphics, Graphics Sorting2D, HUD and HUD Sorting2D. Each preserved
  the primary error, compensated to `0/0/0/0/0`, then retried the same
  component to READY `1/1/0/0/0` without duplicate-root diagnostics.
- The complete prior 16-case Creator cleanup matrix and full normal matrix
  were repeated after the final correction.

## Stop conditions

Stop only if completion requires changing TASK-014D1 or TASK-014D2 public
semantics, Character Semantic Events schema/evaluator semantics, a protected
reference, exceeding the declared scope, or accepting a Creator defect
outside this task.

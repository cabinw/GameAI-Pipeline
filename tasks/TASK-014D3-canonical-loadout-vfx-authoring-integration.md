# TASK-014D3: Canonical Full-Loadout Data-Driven VFX Integration

- Status: Implemented; external code and visual review pending
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

## Verification closeout

- Focused D3 and Scene integrity: `25/25`.
- Complete extension: `290/290`.
- D1 VFX authoring: `16/16`.
- Character Semantic Events: `24/24`.
- Cocos CI: `3/3`; clean-CI typecheck passed.
- Working-copy and frozen tracked-files-only verification: `488/488` each.
- Creator 3.8.8 completed clean D2 open, D3 switch/reopen, alternate accepted
  Scene, second startup directly into D3, and the complete 20-gate Preview
  matrix with zero relevant Creator/Preview warning or error.
- The live Aura run reached `attempts 15`, `accepted 1`, `coalesced 13` while
  evaluator/adapter/visible instances remained `1/1/1`.
- Normal, Transform Stress, Debug, two consecutive Rebuilds, post-rebuild
  effects and Exact Reset ended with root/input `1/1`, no active/stale/leaked
  ownership, no cleanup error and no spatial/non-finite/viewport failure.
- Evidence is isolated on `evidence/task-014d3`; its status remains
  `pending-external-code-and-visual-review`.

## Stop conditions

Stop only if completion requires changing TASK-014D1 or TASK-014D2 public
semantics, Character Semantic Events schema/evaluator semantics, a protected
reference, exceeding the declared scope, or accepting a Creator defect
outside this task.

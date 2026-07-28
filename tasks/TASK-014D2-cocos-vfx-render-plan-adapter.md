# TASK-014D2: Minimal Cocos VFX Render Plan Adapter

- Status: Implementation and Creator gates complete; external visual review pending
- Date: 2026-07-28
- Branch: `feat/task-014d2-cocos-vfx-render-plan-adapter`
- Baseline: `ae5fb4ef7a68a20706485741ab352a6037d25f12`
- Maximum scope: 48 changed files, 8,000 changed lines

## Objective

Compile the four accepted TASK-014D1 authoring fixtures before runtime and
prove that their concrete engine-neutral Render Plans can drive a generic
Cocos Creator 3.8.8 Graphics runtime.

```text
authoring fixture
→ @gameai/vfx-authoring compiler
→ concrete Render Plan
→ pure typed Cocos descriptor compiler
→ typed resource/recipe registry
→ Cocos runtime host
→ minimal Creator-owned acceptance Scene
```

## Acceptance criteria

- [x] Runtime receives concrete Render Plans only; it neither parses authoring
      JSON nor resolves parameters.
- [x] Descriptor compilation rejects unsupported plan versions, corrupt or
      non-finite concrete values, lifecycle/command contradictions,
      unsupported primitive/resource/blend capability, missing resources,
      and layer/particle budget violations without partial output.
- [x] Sprite quad, ring, ribbon, and burst-particle factories are exhaustive
      and reachable without cue/resource-name dispatch.
- [x] Runtime sampling imports the exact TASK-014D1 sampler source and passes
      its portable boundary vectors, skipped frames, final sample/removal,
      looping, and persistent coalescing behavior.
- [x] Semantic `emit`, `start`, and `stop` remain authoritative for creation
      and cleanup; reset/switch/dispose/rebuild remove every owned renderer.
- [x] Descriptor compilation and generated plan/mirror output are
      deterministic and stale output fails tests.
- [x] One shared input registry owns HUD and dispatcher controls `1`, `2`,
      `3`, `4`, `Space`, `X`, `B`, `D`, and `Esc`.
- [x] Resource completion is terminal before input registration; generation
      tokens prevent stale callbacks and partial builds clean symmetrically.
- [x] The minimal Scene has one runtime root and one input handler, generic
      nested targets, Graphics-before-Sorting2D, centralized sorting,
      world-to-overlay-local projection, and finite/safe-viewport guards.
- [x] Normal and Transform Stress exercise translation, rotation,
      non-uniform scale, and nested transforms within declared spatial
      tolerances.
- [x] Exact Reset produces Rest, STOPPED at `0.00s`, stress/debug off, zero
      active VFX/stale renderers, one runtime root, and one input handler.
- [x] Creator 3.8.8 clean open, alternate-Scene reopen, second startup,
      Preview, all references, pause/resume, six-loop persistent coalescing,
      two rebuilds, post-rebuild playback, reset, and two-second clean hold
      pass with zero relevant console warnings/errors.
- [x] Every primitive has visible ROI/pixel-change proof; renderer AABBs stay
      inside the safe viewport and projection/position/rotation error stays
      within declared tolerance.
- [x] Direct, workspace, frozen, metadata, generated closure, diff, links,
      binary/media, tracked-MP4, scope, and clean-tree gates pass.
- [x] The feature branch is committed and pushed with zero MP4 files and no
      PR; evidence exists only on `evidence/task-014d2` and is byte/decode
      verified for external review.

## Verification record

- Direct adapter package: 247/247 tests passed.
- Working copy and frozen tracked-files-only `CI=true pnpm verify`: passed.
- Creator 3.8.8: clean import/open, alternate-Scene reopen, repeated startup,
  all four fixture controls, pause/resume, Normal/Transform Stress, one
  persistent instance across six starts, two consecutive rebuilds,
  post-rebuild playback, Exact Reset, and a two-second clean hold passed.
- Runtime measurements: one root, one input handler, zero stale renderers,
  zero viewport overflow, and projection/position/rotation errors within the
  declared `0.01 px` / `0.05°` tolerances.
- Creator and Web Preview consoles contained zero relevant warnings/errors.
- Final feature scope: 35 files and 4,642 changed lines before this
  verification record; still below the 48-file/8,000-line ceiling.

## Explicit non-goals

No TASK-014D3 or canonical full-loadout integration, Character Semantic Events
schema/evaluator change, D1 semantic change, Unity/Godot/Windows/Red Cap work,
editor authoring UI, feature-branch media, tag, or Release change.

## Stop conditions

Stop only for an evaluator/schema semantic change, protected-reference
mutation, scope overflow, a genuinely ambiguous architecture, unavailable
required independent approval, or an unresolved Creator defect after complete
in-scope diagnosis and repair.

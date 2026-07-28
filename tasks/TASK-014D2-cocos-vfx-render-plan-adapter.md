# TASK-014D2: Minimal Cocos VFX Render Plan Adapter

- Status: Remediation complete; pending external code and visual review
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

The replacement acceptance pass additionally requires transactional creation
and tick cleanup, exact renderer ownership sets, exhaustive concrete
recipe/blend/lifecycle realization, untrusted-value validation, globally
unique deterministic sorting, transformed primitive world bounds, and one
typed diagnostics model shared by HUD and tests. The original evidence remains
historical and is not acceptance proof.

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

## Remediation closure

- Creation and first update now form one transaction. Any construction,
  sampling, projection, viewport, or renderer-update failure removes the
  active key, detaches and destroys every owned node exactly once, and permits
  retry with the same instance ID. Tick failure enters the same terminal
  cleanup path, unregisters input, and cannot log repeatedly.
- Runtime ownership is the exact set of renderer ID, instance ID, and
  descriptor ID tuples. Missing, extra, and mismatched ownership is reported
  independently even when renderer counts are equal.
- Descriptor compilation accepts `unknown`, validates closed lifecycle,
  command, primitive, recipe, and blend enums plus every concrete field and
  registry capability, performs particle-budget preflight, and returns no
  partial descriptors or thrown structural exceptions.
- Textured recipes produce Cocos `Sprite`/`SpriteFrame` realizations,
  procedural ring/ribbon recipes produce `Graphics`, and accepted alpha,
  additive, screen, and multiply roles compile to explicit blend-factor
  states. Registry capabilities advertise only realizations that exist.
- Active layers receive globally unique orders from authored order plus
  UTF-16 code-unit cue/layer/instance ordering inside the centralized VFX
  range. Activation order cannot affect the result and range overflow fails
  closed.
- Viewport guards project all four transformed bounds corners after nested
  target transforms, sample scale/rotation, non-uniform Stress, and
  primitive/particle extents. Non-finite or safe-inset overflow is terminal.
- One typed diagnostics value supplies both HUD and tests, including lifecycle
  counters, exact ownership, recipe/blend summary, spatial maxima, root/input
  counts, and terminal state.
- Selecting a different start/stop reference first sends the authoritative
  stop for the previously selected start/stop instance; repeated starts of the
  same persistent reference still coalesce. The six-attempt Aura acceptance
  state therefore contains exactly one active instance.

## Verification record

- Direct adapter extension: 256/256 tests passed; Creator CI contract:
  3/3 tests passed; direct `@gameai/vfx-authoring`: 16/16 tests passed.
- Working-copy and frozen tracked-files-only `CI=true pnpm verify`, schema and
  D1 vector identity, generated closure, metadata/atomic publication,
  Markdown links, diff/byte/clean-tree closure, and media audits passed.
- Creator 3.8.8 passed clean import/open, alternate-Scene reopen, second
  startup, all four fixtures with typed recipes/blends, pause/resume, Normal
  and Transform Stress, six persistent starts with one accepted instance,
  two consecutive rebuilds, post-rebuild playback, Exact Reset, and a clean
  hold longer than two seconds.
- Final Creator HUD measured one root, one input handler, zero active
  instances/renderers and zero stale/missing/extra/mismatched ownership,
  `0.000 px` maximum position/AABB overflow, and `0.000°` rotation error.
  Creator and Preview consoles contained zero relevant warnings/errors.
- Replacement evidence is retained on `evidence/task-014d2`; the original is
  retained and marked `failed-external-review-incomplete-runtime-and-visual-coverage`.

## Explicit non-goals

No TASK-014D3 or canonical full-loadout integration, Character Semantic Events
schema/evaluator change, D1 semantic change, Unity/Godot/Windows/Red Cap work,
editor authoring UI, feature-branch media, tag, or Release change.

## Stop conditions

Stop only for an evaluator/schema semantic change, protected-reference
mutation, scope overflow, a genuinely ambiguous architecture, unavailable
required independent approval, or an unresolved Creator defect after complete
in-scope diagnosis and repair.

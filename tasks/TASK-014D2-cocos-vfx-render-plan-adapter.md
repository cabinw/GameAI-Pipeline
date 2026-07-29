# TASK-014D2: Minimal Cocos VFX Render Plan Adapter

- Status: Final transaction/evidence closure complete; pending external code and visual review
- Date: 2026-07-28
- Branch: `feat/task-014d2-cocos-vfx-render-plan-adapter`
- Baseline: `ae5fb4ef7a68a20706485741ab352a6037d25f12`
- Maximum scope: 48 changed files, 9,500 changed lines

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

- The final transaction closure extracts the stateful cleanup coordinator
  actually used by the Creator component and host. Root ownership is staged
  immediately after construction, before parent attachment, UITransform, or
  configuration can throw. Disable, destroy, rebuild, setup failure, and
  terminal runtime failure now execute the same all-steps coordinator.
  Successful operations are never repeated; failed material, node, input,
  runtime, or root operations remain owned and can be compensated on the next
  sweep. The first business failure remains terminal while cleanup failures
  are reported separately.
- Renderer ownership now tracks node detach, every material destruction, and
  node destruction independently. A failure in one step cannot prevent the
  remaining owners from being swept, cannot discard the failing owner, and
  cannot cause an already-completed destroy to run twice.
- The expanded injected-operation matrix covers root attachment,
  UITransform/configuration, material gate, host/runtime construction, initial
  sample, input-then-throw, HUD/input setup, runtime cleanup, intermediate
  material/node cleanup, disable, destroy, rebuild, stale callback, and
  same-instance/component retry. Every case asserts the original failure,
  separate cleanup errors, zero residual ownership after compensation, and
  successful `READY` recovery with one root and one input handler.
- Setup is now one failure transaction from resource completion through
  material gate, host/runtime construction, initial Reset/sample, HUD, and
  input registration. The first error survives cleanup faults; input,
  runtime/host bindings, owned renderers/materials, partial root, references,
  and generation callbacks are swept once. A Canvas-owned failure HUD remains
  after the runtime root reaches zero, while a later enable/retry starts clean.
- A five-case fault matrix covers material mismatch, a registered input before
  throw, initial sample, HUD/input setup, and cleanup failure. Creator negative
  runs visibly end at root `0`, input `0`, no owners/leaks, and retain the
  injected setup error before a clean normal `READY` recovery.
- The invisible Trail was not a color or D1 sampling defect. Cocos Graphics
  creates its real `ui-graphics-material` lazily and custom material instances
  must compile `USE_LOCAL`; copying the pre-Graphics material made submitted
  ribbon vertices render at the Canvas origin while node diagnostics remained
  correct. Graphics now initializes first, copies the real pass, recompiles
  the material instance with `USE_LOCAL`, and retains authored additive blend.
- The Trail framebuffer ROI relative to Exact Reset measures maximum-channel
  difference `252` and `3,647` changed pixels. Paused frames are byte-stable
  (`0` / `0`); Resume changes `3,661` pixels with maximum-channel difference
  `248`. A legal phase-one sample with zero scale no longer asks for an
  undefined rotation measurement.

- The final boundary audit closed five residual proof gaps: a host that
  registered a renderer before throwing is now swept by observed ownership;
  the Creator host explicitly binds every recipe/primitive pair and derives
  inspectable material state from the authored blend role; descriptor
  validation now enforces D1 numeric ranges, unique authored orders, and the
  exact deterministic particle schedule; live instance sorting is ranked as
  one global set; and nested bounds preserve affine shear by transforming all
  corners through every hierarchy level.
- Creator regating then exposed one engine-only measurement gap: quaternion
  decomposition reports a false rotation delta when nested non-uniform scale
  and rotation produce affine shear. Rotation tolerance now maps an observed
  world-space direction axis back through the target transform and compares
  it with the authored local axis without decomposing the matrix.
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
  states. The host creates owned custom `Material` instances with explicit
  pass-state overrides, calls `updateMaterial()`, and reads the resulting
  Cocos material pass target before accepting each renderer. A startup gate
  covers Sprite, Graphics, and particle Sprite for all four blend roles;
  material-pass mismatch is terminal and visible in the shared HUD.
  Registry capabilities advertise only realizations that exist, and every
  declared recipe/primitive pair is checked even when no cue references it.
- Every renderer starts inactive. The exact D1 sample is delivered for
  pending, active, and removed states: pending/removed nodes are inactive and
  bypass spatial measurement, active nodes render and measure, the final
  phase-one sample remains visible, and individual layers become removed
  independently while longer siblings continue. Ownership includes the
  layer visibility state, while the HUD active-renderer count includes only
  nodes that are actually renderable.
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

- Focused TASK-014D2: 33/33 tests passed; complete adapter extension:
  265/265 tests passed; Creator CI contract:
  3/3 tests passed; direct `@gameai/vfx-authoring`: 16/16 tests passed.
- Working-copy and frozen tracked-files-only `CI=true pnpm verify` each passed
  the 463/463 workspace baseline. Schema and
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
- Final runtime-semantics closure measured twelve startup material-pass
  checks (Sprite, Graphics, and particle Sprite across alpha, additive,
  multiply, and screen) with zero mismatch. Focused regressions cover a
  delayed Sprite remaining pending, Footstep ring removal before its longer
  particle sibling, and Combined layer exits at 0.5, 0.65, and 0.8 seconds
  with exact following-tick removal.
- The final 63-second real Web Preview capture is H.264 High, 1280×720,
  30 fps, `yuv420p`, and fully decodes. Its decoded Trail ROI
  `[540,120,240,240]` uses a maximum-channel threshold of 20: Reset→Active
  measures `250` / `2,790` changed pixels, Pause→Pause measures `0` / `0`,
  Pause→Resume measures `249` / `2,742`, and Reset→post-rebuild Trail measures
  `249` / `2,739`. The final Reset hold remains root `1`, input `1`, with no
  active renderer, ownership mismatch, terminal error, or cleanup error.
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

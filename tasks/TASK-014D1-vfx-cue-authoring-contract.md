# TASK-014D1: Engine-Neutral Data-Driven VFX Cue Authoring Contract

- Status: Remediation complete; Draft PR pending external review.
- Date: 2026-07-28
- Branch: `feat/task-014d1-vfx-cue-authoring-contract`
- Baseline: `67a6c702eb701a90762b8b5fd93184e3cf0ebfc5`
- Release baseline: `v0.3.0` at the same commit
- Maximum remediated PR scope: 55 changed files, 10,000 changed lines,
  text/source only

## Objective

Add a validated, deterministic, engine-neutral VFX authoring document and
compiler that resolves existing semantic-event cue IDs into normalized VFX
Render Plans without changing Character Semantic Events semantics.

## Acceptance criteria

- [x] `@gameai/vfx-authoring` and the canonical schema are separate from
      engine runtimes and have byte-identical schema copies after build.
- [x] Footstep Dust, Hand/Tool Trail, Persistent Aura, and a combined
      multi-layer reference compile from textual fixtures.
- [x] Sprite quad, ring, ribbon, and burst-particle layers support stable
      ordering, logical resources, timing, transform, color/opacity, scale and
      rotation curves, seed, emission, blend role, and lifecycle rules.
- [x] Typed parameter defaults and bounded compilation overrides validate and
      normalize deterministically.
- [x] Closed typed bindings resolve defaults/overrides into concrete layer
      opacity, scale, and color; parameter names do not enter the plan.
- [x] Typed semantic descriptors enforce `emit` versus `start-stop`
      lifecycle compatibility without duplicating evaluator behavior.
- [x] Typed resource descriptors carry recipe/capability data and reject
      incompatible primitive use without name-based dispatch.
- [x] Linear/clamped curves, exact endpoints, relative transform and alpha
      composition, layer activation/repetition/removal boundaries, and
      semantic cleanup authority are executable and tested.
- [x] Burst schedules, zero-rate behavior, lifetime fit, `xorshift32-v1`, and
      compiled random samples have golden vectors.
- [x] Every public diagnostic has one focused invalid textual fixture and is
      asserted by tests.
- [x] Unknown semantic cue/resource IDs, unsupported primitives, non-finite
      direct values, invalid properties, conflicts, and budgets fail closed
      without partial output.
- [x] Cues, layers, parameters, defaults, and object keys have stable order;
      repeat compilation and serialization produce byte-identical output.
- [x] Input remains immutable and the plan contains no Cocos, Unity, or Godot
      import/API/type/path.
- [x] Direct package tests and `CI=true pnpm verify` pass in the working copy
      and a frozen tracked-files-only checkout.
- [x] Schema identity, generated-output closure, Markdown links,
      `git diff --check`, post-verify clean tree, binary/media, tracked MP4,
      file-count, and changed-line budgets pass.
- [ ] The feature branch is committed and pushed; a Draft PR targets `main`;
      GitHub Actions passes; the PR remains Draft and unmerged.

## Explicit non-goals

No Cocos rendering, engine compiler, runtime-adapter change, Creator Scene or
`.meta`, video/evidence/media, Character Semantic Events schema/evaluator
change, TASK-014D2, TASK-014D3, release/tag mutation, or protected historical
reference change is authorized.

## Stop conditions

Stop only if implementation requires changing Character Semantic Events
schema/evaluator semantics, mutating protected references, a destructive
operation, exceeding the declared budget, or accepting an unresolved
architectural conflict.

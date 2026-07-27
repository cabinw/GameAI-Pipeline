# TASK-014B: Minimal Cocos Semantic VFX Adapter

- Status: Implementation complete; pending external visual review
- Date: 2026-07-26
- Branch: `feat/task-014b-cocos-semantic-vfx-adapter`
- Baseline: `1ab573e4b99d6c04973dc62803c5c2579c56e4a9`
- Creator baseline: 3.8.8
- Automated baseline: 368/368 tests
- Expected budget: at most 70 changed files and 12,000 changed lines,
  including one Creator-owned Scene/`.meta` pair; zero feature-branch MP4 or
  audio files

## Objective

Build the first visual consumer of Character Semantic Events 1.0: a minimal,
independent stickman/base-rig Cocos reference where engine-neutral evaluator
commands drive visible procedural effects at real runtime sockets through a
typed Cocos-only adapter.

## Required architecture

```text
Character Semantic Events contract
→ shared evaluator emit/start/stop commands
→ Cocos-only semantic VFX adapter
→ generic cue renderer registry
→ socket projection and independent follow axes
→ visible procedural Cocos effects
```

## Acceptance criteria

- [x] Engine-neutral schema, types, evaluator, resolver, and textual contract
  semantics remain unchanged and contain no Cocos imports.
- [x] Independent Creator-owned TASK-014B Scene and `.meta` resolve real
  imported component identity without synthetic UUIDs.
- [x] One-shot footstep dust appears at left/right foot sockets, expands,
  fades, and cleans up deterministically.
- [x] Looping hand trail starts/stops by stable
  `trackId:eventId:cycle`, follows the animated hand socket, and leaves no
  duplicate or stale renderer.
- [x] Persistent aura follows the torso/root socket, survives Pause/Resume,
  and cleans on reset, switch, disposal, and rebuild.
- [x] Audio/gameplay commands are counted diagnostically and never executed or
  treated as VFX.
- [x] Adapter dispatch is exhaustive and rejects unsupported kinds, unknown
  cues/sockets, duplicate starts, and unknown stops with stable codes.
- [x] Local transform, layer role, and position/rotation/scale follow axes are
  independently applied.
- [x] Failure paths clean partial state; all lifecycle exits clean every active
  instance.
- [x] Runtime uses loading → resources passed → nodes built → reset complete
  → ready, generation tokens, symmetric teardown, one input handler, a frozen
  manifest, global Sorting2D ownership, overlay-local projection, and spatial
  assertions.
- [x] HUD derives controls from one typed semantic-input registry and exposes
  identity, track/clip, playback time/state, last command, command counts,
  active IDs/count, resource progress, projection error, duplicate/unknown
  counts, leaks, lifecycle counts, and PASS/FAIL.
- [x] Automated tests cover all 23 required dispatch, validation, lifecycle,
  ordering, transform/follow, sorting, manifest, Scene/meta, tracked-only,
  deterministic-output, path, and portability requirements.
- [x] Direct tests and working-copy/frozen tracked-files-only full verification
  pass; generated outputs are clean and tracked MP4 count is zero.
- [x] Creator 3.8.8 passes clean import/open, Scene switch/reopen, second
  initialization, clean Creator/Web consoles, all visual/socket/lifecycle
  controls, transform stress, final Debug OFF, and zero leaks.
- [ ] Feature branch is committed and pushed only after all automated and
  Creator gates pass; no TASK-014B PR is created.
- [ ] `evidence/task-014b` contains only verified `manifest.json` and one real
  Web Preview H.264 High 1280×720 30 fps yuv420p video whose local/downloaded
  SHA-256 and full FFmpeg decode match.
- [x] TASK-014C, real audio/gameplay execution, Unity/Godot changes, Windows
  claims, and Red Cap reconstruction remain absent.

## Evidence stop

After feature publication, publish verified evidence on
`evidence/task-014b` and stop for external visual review. Do not create or
merge a TASK-014B PR.

## Implementation gate result

- Transform Stress is a typed Cocos-only action owned by the shared input
  registry. `X` is unique because `T` remains the track-switch action.
- Initial and Exact Reset state is Stress OFF. Stress ON applies one outer
  root contribution of translation `(84, -48)`, rotation `17deg`, and scale
  `(1.18, 0.82)` without changing the authored inner rig baseline of
  translation `(100, 60)` and scale `(1.35, 1.35)`.
- Rebuild preserves the current stress state, creates exactly one stress root,
  and retains exactly one input handler. Two live rebuilds reached
  `SETUP 3 / TEARDOWN 2 / REBUILDS 2 / INPUT 1`.
- Focused TASK-014B tests: 21/21 PASS.
- Complete extension tests: 215/215 PASS.
- Semantic-event package tests: 24/24 PASS.
- Working-copy verification: 372/372 PASS.
- Frozen tracked-files-only verification: 372/372 PASS.
- Extension TypeScript, Cocos clean-CI typecheck, generated-output closure,
  schema byte identity, metadata-race regression, and `git diff --check`:
  PASS.
- Creator 3.8.8 identity sequence R1 → TASK-014B → R1 → TASK-014B: PASS;
  Missing class 0, invalid component 0.
- Creator Web Preview: initial resources 1/1 PASS; Walk dust, Wave trail,
  persistent Aura six loops, Pause/Resume, track switch/stop, Stress ON/OFF,
  all three VFX under Stress ON, two rebuilds, all three VFX after rebuild,
  and Exact Reset: PASS.
- Under Stress ON, dust/trail/aura position error is `0.0000px`, rotation
  error is `0.0000deg`, and projection round-trip error is `0.0000px`.
  Duplicate starts, unknown stops, leaked instances, renderer conflicts,
  duplicate roots, duplicate inputs, stale nodes, and non-finite values are
  zero.
- Persistent Aura remains one visible/evaluator/adapter/UIRenderer/Sorting2D
  instance with stable ID
  `aura-semantic-events:torso-persistent-aura:0` across six loops and
  Pause/Resume.
- Final Exact Reset is Rest, `STOPPED`, `0.00s`, Stress OFF, baseline
  transform, zero active VFX, Debug OFF, and zero relevant Creator/Web
  Console warnings/errors.
- Creator did not rewrite the TASK-014B Scene or `.meta`; their frozen
  SHA-256 values remain
  `abea453c7cfa2648c18944d56e42dd43f298cc5c49c59898c267856eb14369c3`
  and
  `fb150603bfb20a5f2645ef0fb56231e41dd6662e0b73bf313d83743c9d1ecd52`.
- Feature publication and evidence publication remain pending. No TASK-014B
  PR exists.

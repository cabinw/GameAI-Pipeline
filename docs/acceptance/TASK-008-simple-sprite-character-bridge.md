# TASK-008 Simple Sprite Character Bridge Acceptance

## Result

Accepted locally on 2026-07-24 in Cocos Creator 3.8.8 and its 1280×720 Web
Game Preview. Automated verification, real SpriteFrame rendering, synchronized
sprite/skeleton motion, debug controls, and dynamic visual acceptance pass.

The implementation is ready for manual visual review. No pull request has
been created.

## Automated evidence

- All 15 checked-in PNGs decode at their authored dimensions, include both
  transparent and visible pixels, and regenerate byte-identically.
- The Rig Layout parses with one `pelvis` root, 15 unique stable part IDs,
  valid normalized anchors, a valid hierarchy, and unique deterministic draw
  order.
- The Cocos plan is deterministic and derives resource paths, visual offsets,
  sizes, parents, poses, and order from contract data without a per-part
  correction table.
- Sprite and skeleton Joint nodes receive the same sampled local pose.
- Tests prove mirrored anatomical limb semantics, positive rounded overlap at
  all animated links, pause/resume continuity, exact authored-rest reset, and
  isolation from complex-character art assumptions.
- The tracked CI TypeScript surface includes every imported Cocos API while
  remaining independent of ignored Creator output and machine-local paths.
- `CI=true pnpm verify` passes all 151 tests in the working copy.
- `CI=true pnpm verify` passes all 151 tests from a tracked-files-only archive
  after a frozen-lockfile install.

## Visual inspection

The dedicated scene and real Web Game Preview were inspected for:

- all 15 transparent SpriteFrames visible in the left Sprite View;
- the corresponding evaluator hierarchy in the right Skeleton/Debug View;
- coincident sprite and skeleton joints through rest, wave, and walk samples;
- shoulder, elbow, wrist, hip, knee, and ankle continuity through the intended
  clip ranges;
- Arm Wave descendant inheritance without moving unrelated branches;
- Walk left/right opposition and stable repeated loops;
- Pause preserving the visible sample and Resume continuing from it;
- `R` restoring `STATE STOPPED`, `TIME 0.00s`, and the exact symmetric authored
  rest pose;
- joint markers, sprite bounds, pivot rings, parent links, and skeleton view
  hiding and restoring independently;
- no preview console error.

## Dynamic visual acceptance

The ignored local H.264 MP4 is:

```text
/Users/wukaibing/Codex/GameAI-Pipline/artifacts/TASK-008/task-008-dynamic-acceptance.mp4
```

It is 21.82 seconds at 1280×674 and records the actual running Creator Web
Preview canvas:

```text
Rest → Arm Wave → Pause → Resume → Walk for more than three loops
→ Reset → J/B/A/L/V debug toggles off and back on
```

The reviewed SHA-256 is
`61a1dd66d1a21e738dcb5b2641c14b88bc6cfde3cb2d6de7b517837ce798b896`.
The MP4 is excluded by `.git/info/exclude` through the existing `artifacts/`
rule and is not committed.

## Exact preview instructions

1. Open `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.x.
2. Open `assets/simple-sprite-character-bridge.scene`.
3. Click Preview and choose Web Game Preview at 1280×720.
4. Click the preview canvas once so it owns keyboard focus.
5. Use `1` Rest/Idle, `2` Arm Wave, `3` Walk, `Space` Pause/Resume, and `R`
   exact authored-rest reset.
6. Use `J` joint markers, `B` sprite bounds, `A` pivot markers, `L` parent
   links, and `V` skeleton/debug view.
7. Confirm the HUD clip, state, and absolute time update and that Sprite View
   motion remains coincident with Skeleton/Debug View.

## Limitations

- The mannequin is deliberately simple acceptance art, not production art.
- Walk is in-place articulation with no root motion, foot locking, IK, blend,
  state machine, mesh deformation, or combat behavior.
- The verification adapter is Cocos-only; it is not a cross-engine compiler.
- The acceptance MP4 captures the Web Preview canvas rather than browser
  chrome or the Creator editor window, and it has no audio.

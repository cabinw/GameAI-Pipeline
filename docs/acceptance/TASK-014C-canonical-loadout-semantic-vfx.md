# TASK-014C Canonical Full-Loadout Semantic VFX Acceptance

## Result

Implementation acceptance gate: **PASS**.
Creator 3.8.8 live gate: **PASS**.
Evidence self-review: **PASS**.
External visual review: **PENDING**.

TASK-014C composes the accepted engine-neutral Character Semantic Events
evaluator, canonical V2 loadout resolver and pose, semantic target resolver,
TASK-014B adapter, and Cocos renderer registry. It introduces neither another
event evaluator nor another loadout resolver, and it does not change the
published semantic-event schema or evaluator semantics.

## Automated verification

- Focused TASK-014C tests: 16/16 PASS.
- Complete extension tests: 232/232 PASS.
- Semantic-event package tests: 24/24 PASS.
- Full working-copy `CI=true pnpm verify`: 414/414 PASS.
- Frozen tracked-files-only install and `CI=true pnpm verify`: 414/414 PASS.
- Extension TypeScript and Cocos clean-CI typecheck: PASS.
- Generated source/runtime mirror closure: PASS.
- Schema byte identity: PASS.
- Scene metadata and atomic-publication race regressions: PASS.
- `git diff --check`, binary audit, tracked-MP4 audit, and post-verify clean
  content closure: PASS.

The focused suite covers all 12 canonical loadout states; no/left/right prop
target resolution; target invalidation and atomic re-resolution; Dust capture
and cleanup; Trail start/follow/stop; persistent Aura coalescing; looping,
Pause/Resume, track and loadout switching; two rebuilds; Exact Reset; stable
unknown-target diagnostics; duplicate renderer/stale target prevention;
sorting, finite transforms, viewport and ROI guards; generated identity; and
typed input/HUD parity.

## Creator 3.8.8 gate

- Clean import and direct TASK-014C open: PASS.
- Switch to canonical V2 Scene and reopen TASK-014C: PASS.
- Second Creator startup/open: PASS.
- Missing class / invalid component: 0 / 0.
- Resource manifest: 35/35 PASS.
- HUD and Normal/Stress safe viewport at 1280×720: PASS.
- All 12 loadout states and no/left/right prop states: PASS.
- Rest, alternating-foot Walk Dust, Wave Trail, and hand/tool Prop Swing
  Trail: PASS.
- Persistent Aura across more than six loops: one logical instance.
- Pause/Resume: same Aura identity.
- Active loadout and prop switching: atomically re-resolved with no stale
  target or duplicate renderer.
- Transform Stress with Dust, Trail, and Aura: PASS.
- Two consecutive Lifecycle Rebuilds followed by all three effects: PASS.
- Exact Reset and final clean hold longer than two seconds: PASS.
- Creator Console relevant warnings/errors: 0.
- Web Preview Console warnings/errors: 0.

Repeated evidence rehearsals made the final recording's cumulative lifecycle
`SETUP 7 / TEARDOWN 6 / REBUILDS 6`; each stable state remains one runtime
root, one input handler, and zero leaks. The acceptance requirement itself is
the consecutive two-rebuild sequence visible in the final recording.

## Runtime measurements

- Socket projection error: `0.0000px`.
- Dust position / rotation error: `0.0000px / 0.0000deg`.
- Trail position / rotation error: `0.0000px / 0.0000deg`.
- Aura position / rotation error: `0.0000px / 0.0000deg`.
- Aura evaluator / adapter / visible renderer instances: `1 / 1 / 1`.
- UIRenderer / Sorting2D instances for the active renderer: `1 / 1`.
- Duplicate starts / unknown stops / leaked instances: `0 / 0 / 0`.
- Stale targets / duplicate roots / duplicate inputs: `0 / 0 / 0`.
- Viewport overflow / non-finite coordinates: `0 / 0`.

## Creator-owned identity and content closure

- Scene SHA-256:
  `1f8575f76fc398ee08a0fa201b6a82194dc274d764547429309420b247ce6943`
- Scene `.meta` SHA-256:
  `24cbdbe17dfcd417b9b7123be01119bf3902ce8552d6a902c4a42462ca2333ee`
- Runtime script SHA-256:
  `8b92f79f16d0735749053f52897bece56d7410bec935b9b1b54b156701db7e5b`
- Runtime script `.meta` SHA-256:
  `b65a5d2b94777eb20628a1660cce4dabfddfb425e3d0dc9e095ff7b3f5cd2341`

Creator import, switching, reopening, Preview, and recording did not rewrite
these tracked bytes.

## Evidence handoff

- Review status: `pending-external-visual-review`.
- Video: `task-014c-canonical-loadout-semantic-vfx.mp4`.
- SHA-256:
  `6952013fe22c9c04dcc1d2fce1731434511617015c640d7f92a336006a00df01`
- Format: H.264 High, yuv420p, 1280×720, 30 fps.
- Duration / frames: 65.000 seconds / 1,950.
- Full FFmpeg decode: PASS.
- Pointer/browser/editor obstruction: none in the published Canvas capture.
- Self-review: complete storyboard and final clean state PASS.

Only the evidence manifest and MP4 belong on `evidence/task-014c`; the feature
branch tracks zero MP4 files. Procedural placeholder VFX are intentionally not
final art. Audio/gameplay execution, TASK-014D, Red Cap, Unity, Godot, and
Windows support remain out of scope.

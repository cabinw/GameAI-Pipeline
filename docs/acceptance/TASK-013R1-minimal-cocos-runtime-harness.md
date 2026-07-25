# TASK-013R1 Minimal Cocos Runtime Harness Acceptance

- Date: 2026-07-25
- Creator: 3.8.8
- Preview: Web, 1280 × 720
- Branch: `recovery/task-013r1-minimal-cocos-harness`
- Implementation commit:
  `8543fc61742b8a95b7c9ded6ad7347e49cd3ca63`
- External visual review: PASS

## Automated verification

- Working-copy `CI=true pnpm verify`: PASS, 263 tests, 0 failures.
- Tracked-files-only `pnpm install --frozen-lockfile`: PASS.
- Tracked-files-only `CI=true pnpm verify`: PASS, 263 tests, 0 failures.
- TASK-013R1-specific coverage: 13 tests, comprising 9 pure TypeScript
  boundary tests and 4 tracked Creator scene/meta/resource tests.

## Creator one-pass gate

The final uninterrupted Creator run passed:

1. clean Creator import and harness open;
2. switch to `stickman-articulation-reference.scene` and reopen the harness;
3. explicit runtime rebuild with lifecycle generation increasing from 1 to 3,
   setup count increasing from 1 to 2, and teardown count increasing from 0 to
   1;
4. one manifest request and terminal `1/1 PASSED` after each initialization;
5. Creator Console with zero relevant warnings and zero errors;
6. Preview Console with zero warnings and zero errors;
7. visible registry-derived HUD and all five semantic controls;
8. Rest and animated stress poses;
9. Pause, Resume, and exact Reset to `STOPPED 0.00s`;
10. live joint, skeleton, socket, and grip overlays;
11. non-zero translation, non-unit scale, rotation, nested-parent transform,
    and animated transform stress;
12. Debug OFF with no visible debug geometry; and
13. no duplicate generated nodes or duplicate input response after rebuild or
    reopen.

## Runtime measurements

| Measurement | Maximum | Limit | Result |
| --- | ---: | ---: | --- |
| Projected marker-to-target error | 0.000 px | 0.5 px | PASS |
| Skeleton endpoint-to-joint error | 0.000 px | 0.5 px | PASS |
| Locked socket-to-grip error | 0.000 px | 0.5 px | PASS |
| Non-finite positions | 0 | 0 | PASS |
| Debug/character bounds intersections | All samples | All samples | PASS |
| Visible debug geometry while Debug OFF | 0 | 0 | PASS |

All positions were sampled from live Cocos Nodes in world space and projected
through the `DebugOverlayRoot` `UITransform`; no fixed Canvas compensation or
character-specific debug offset was used.

## External visual acceptance

External review passed for:

- filename: `task-013r1-cocos-runtime-harness.mp4`;
- size: 944,217 bytes;
- duration: 60.000 seconds;
- codec/profile: H.264 High;
- dimensions: 1280 × 720;
- frame rate: 30 fps;
- pixel format: `yuv420p`;
- SHA-256:
  `7f0122f81151950ac21e3276b8fe1c07fc12ec7449edfe431296e446157c4c3a`;
  and
- complete FFmpeg decode: PASS.

The review confirmed:

- a fully visible, unclipped HUD;
- overlays aligned with animated runtime targets;
- skeleton endpoints following actual joints under transform stress;
- coincident socket and grip markers;
- correct Pause, Resume, and exact Reset;
- one visible character after lifecycle rebuild;
- no residual debug geometry after Debug OFF; and
- no visible drift, flicker, duplication, clipping, or coordinate jump.

The video is Canvas-only evidence. It directly proves visible runtime behavior,
but does not contain Creator editor chrome or Console pixels. Creator Console
cleanliness and scene-switch/reopen behavior remain supported by the
contemporaneous one-pass Creator acceptance record above and by the
automated/runtime lifecycle diagnostics.

The reviewed evidence was published at
`evidence/task-013r1` commit
`6ac3399bb7e3dc67c827504a96a33114bf1b8177`. After this acceptance
documentation is safely committed and pushed, the temporary evidence branch
is eligible for local and remote deletion while the ignored local recording
is preserved.

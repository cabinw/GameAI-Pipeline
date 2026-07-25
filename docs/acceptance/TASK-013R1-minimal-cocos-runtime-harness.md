# TASK-013R1 Minimal Cocos Runtime Harness Acceptance

- Date: 2026-07-25
- Creator: 3.8.8
- Preview: Web, 1280 × 720
- Branch: `recovery/task-013r1-minimal-cocos-harness`

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

## Evidence status

The feature implementation passed the gate. External visual evidence is
published separately on `evidence/task-013r1` and remains pending external
visual review.

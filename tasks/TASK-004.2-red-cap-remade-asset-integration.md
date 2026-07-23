# TASK-004.2: Red Cap Remade Asset Integration

## Status

Complete (2026-07-23)

## Goal

Integrate the supplied transparent Red Cap Remade PNG parts as a separate
engine-neutral fixture and generate a correctly assembled, visible
world-space 2D rig in Cocos Creator 3.8.8 Scene view and Game Preview.

## Deliverables

- A strict asset inventory with decoded dimensions, alpha state, and
  non-transparent bounds.
- An explicit source-filename to canonical `partId` mapping.
- Stable failure diagnostics for missing and ambiguous remade parts.
- A canonical `examples/red-cap-target-remade` fixture with a valid Character
  Rig, Source Annotation, and generator-produced Rig Layout.
- A Cocos AssetDB import mirror under
  `assets/gameai/red-cap-target-remade`, with metadata and UUIDs authored only
  by Creator.
- Builder support for selecting and generating the remade fixture.
- Tests for manifest completeness, mapping, bounds, generated layout,
  SpriteFrame resolution, and idempotent replacement.
- Real Cocos 3.8.8 Scene and Game Preview evidence.

## Safety and compatibility

- Preserve `examples/red-cap-target` and its colored deterministic assets.
- Do not infer uncertain mappings from filenames alone.
- Do not manually assemble the scene hierarchy.
- Do not handcraft or replace AssetDB UUIDs.
- Preserve the TASK-004/004.1 validation-before-mutation boundary,
  Joint/Visual hierarchy, trim compensation, proximal pivots, global
  Sorting2D, UI_3D, RenderRoot2D, camera verification, and atomic
  marker-guarded replacement.
- Do not implement animation.

## Verification

Run generation twice in Cocos Creator 3.8.8, inspect Scene and Game Preview,
and then run:

```bash
pnpm install --frozen-lockfile
CI=true pnpm verify
```

Commit and push with:

```text
feat: integrate red cap remade character assets
```

## Result

- Preserved all 19 supplied PNGs under
  `examples/red-cap-target-remade/source-parts` and added an explicit,
  fail-closed canonical map plus deterministic import-safe derivatives.
- Added a valid 19-part Character Rig and calibrated Source Annotation; the
  existing generator produced the checked-in Rig Layout and assembled preview.
- Extended asset intake with decoded transparency facts and the Cocos builder
  with stable missing/ambiguous/unexpected-art diagnostics.
- Imported the matching real-art mirror through Cocos AssetDB. Creator authored
  every committed `.meta` file and UUID.
- Generated `CHR_red_cap_target_remade` twice in Cocos Creator 3.8.8. The
  second run replaced the marked root, verified all 19 SpriteFrames, retained
  four unrelated roots, preserved camera state, and emitted correlation-linked
  evidence.
- Captured complete Scene and Game Preview images with no colored placeholders
  and zero Cocos console counters.
- Passed `pnpm install --frozen-lockfile` and the complete 91-test
  `CI=true pnpm verify` gate.

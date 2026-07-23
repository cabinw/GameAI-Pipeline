# TASK-004: Cocos Scene Rig Builder MVP

## Status

Complete

## Goal

Build the first production Cocos Creator 3.8.8 editor pipeline that converts a
validated Character Rig, generated Rig Layout, and normalized asset manifest
into an assembled scene rig without allowing contract validation or asset
inspection to leak into the Scene Script.

## Required architecture

```text
Panel
  -> Main Process
  -> engine-neutral validation and layout generation
  -> deterministic scene plan
  -> Scene Script
  -> Cocos Nodes and Sprite components
  -> verification evidence
```

## Deliverables

- A dedicated `gameai-character-rig-builder` Cocos editor extension.
- Reuse of `@gameai/character-contracts`,
  `@gameai/character-asset-intake`, and `@gameai/rig-layout-generator`.
- A deterministic, JSON-serializable scene-plan boundary.
- AssetDB-backed image and SpriteFrame UUID resolution.
- A `Joint_<partId>` / `Visual_<partId>` node pair for every body part.
- Proximal-pivot hierarchy preservation from pelvis through neck, shoulders,
  elbows, wrists, hips, knees, and ankles.
- Center-anchored visuals placed with decoded trim dimensions and the authored
  proximal joint.
- Deterministic global draw ordering across separate joint branches.
- Character-scoped, marker-guarded, idempotent replacement.
- Correlation-preserving diagnostics across Panel, Main, and Scene Script.
- Automated coverage for hierarchy, trim offsets, proximal pivots, scale,
  global draw order, repeat generation, safe replacement, and plan
  determinism.
- A Red Cap Target Cocos Creator acceptance procedure and captured evidence.

## Mutation safety requirements

- The Scene Script receives only a fully validated scene plan.
- Validation failure must not invoke scene mutation.
- All referenced SpriteFrames must load before the existing generated root is
  detached.
- Replacement is allowed only for the exact character root containing the
  generated marker.
- Name collisions, ambiguous generated roots, and generation failures emit
  stable diagnostics and preserve unrelated nodes.
- A replacement failure restores the prior generated root.

## Verification

- Run the unit and integration tests for the extension.
- Exercise the Red Cap Target fixture in Cocos Creator 3.8.8 and retain
  correlation-linked evidence.
- From a clean checkout state run:

  ```bash
  pnpm install --frozen-lockfile
  pnpm verify
  ```

## Out of scope

- Animation playback or generation
- Auto cutting
- Computer-vision joint detection
- Production-game integration
- Editing unrelated scene nodes

## Result

- Added the project-local `gameai-character-rig-builder` extension and its
  Panel, Main Process, AssetDB adapter, deterministic scene plan, and Scene
  Script.
- Reused all three engine-neutral packages before scene mutation.
- Generated 18 proximal Joint/Visual pairs, three sockets, centered trim
  compensation, and unique global `Sorting2D` orders.
- Added stable adapter diagnostics, marker-guarded replacement, and rollback
  when replacement verification fails.
- Added 18 imported Red Cap assets, Cocos-generated `.meta` records, and the
  saved `red-cap-acceptance.scene`.
- Passed real Cocos Creator 3.8.8 generation twice: `created`, then `replaced`,
  with unrelated-root counts unchanged.
- Captured correlation-linked JSON evidence and an editor hierarchy screenshot.
- Added 18 extension tests; the complete clean-checkout suite now contains 81
  passing tests, including all 63 tests that preceded TASK-004.
- Removed all ignored build/dependency/editor state, then passed
  `pnpm install --frozen-lockfile` and `pnpm verify`.

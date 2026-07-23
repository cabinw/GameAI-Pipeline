# TASK-004.1 Red Cap Target Visible Cocos Acceptance

## Environment

- Cocos Creator: 3.8.8
- Project: `cocos/projects/character-rig-builder-mvp`
- Extension: `gameai-character-rig-builder`
- Fixture: `assets/gameai/red-cap-target`

## Procedure

1. From the repository root, run `pnpm install --frozen-lockfile` and
   `pnpm --filter gameai-character-rig-builder build`.
2. Open `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.8.
3. Wait until AssetDB finishes importing the Red Cap PNG files. AssetDB, not
   the extension, creates any project `.meta` data and supplies all UUIDs.
4. Open `red-cap-acceptance.scene`. Its fixture-owned Main Camera is
   orthographic, faces the XY plane from `(0, 0, 10)`, uses an ortho height of
   `6`, and includes `UI_3D` in its visibility mask.
5. Open **Panel → GameAI Pipeline → Character Rig Builder** if the panel is not
   already visible.
6. Keep the default source root and document paths, then select **Build Red Cap
   rig**.
7. Verify the Panel reports the complete
   `panel → main-validation → assetdb → scene → verification` chain.
8. In the Hierarchy, inspect `CHR_red_cap_target/RigRoot` and verify each part
   has `Joint_<partId>/Visual_<partId>`. Inspect the character root and confirm
   `RenderRoot2D` is present.
9. Inspect representative Visual nodes and confirm Sprite, UITransform,
   UIOpacity, and Sorting2D components are present, with centered anchors.
10. Run the builder a second time. Confirm there is still exactly one
    `CHR_red_cap_target`, the result is `replaced`, and unrelated roots remain.
11. Confirm the complete Red Cap assembly is visible in Scene view and the
    editor console error count is zero.
12. Run Web Preview and confirm the complete assembly renders through the
    orthographic camera without missing-component or console errors.
13. Save the scene and copy
    `temp/gameai-character-rig-builder/evidence.json` to the tracked TASK-004
    evidence location.

## Acceptance criteria

- Cocos Creator reports version 3.8.8.
- All 18 validated fixture parts produce 18 Joint and 18 Visual nodes.
- All SpriteFrames were resolved by AssetDB UUID.
- The generated root contains RenderRoot2D; every Visual is below it, all
  generated nodes use UI_3D, and all 18 Visual sizes are non-zero.
- Main Camera is compatible with UI_3D and its state is unchanged by both
  generation runs.
- The proximal hierarchy includes waist, neck, shoulders, elbows, wrists,
  hips, knees, and ankles.
- Sorting orders are unique and cover `0..17`, independent of branch.
- The second run replaces the marked character root without duplication.
- Unrelated root counts match before and after both runs.
- Evidence carries one correlation ID through every stage.
- Scene and Web Preview visibly render the full assembled character with no
  console errors.

## Evidence

The checked-in evidence JSON and editor screenshot are produced by the real
Cocos Creator acceptance run. They are not synthesized by unit tests.

- Scene: `cocos/projects/character-rig-builder-mvp/assets/red-cap-acceptance.scene`
- Evidence:
  `docs/acceptance/evidence/TASK-004-red-cap-cocos-3.8.8.json`
- Screenshot:
  `docs/acceptance/evidence/TASK-004-red-cap-cocos-3.8.8.jpeg`
- Web Preview screenshot:
  `docs/acceptance/evidence/TASK-004.1-red-cap-game-preview-3.8.8.jpeg`
- Creator version: `3.8.8`
- Correlation ID: `task004-1784786876157`
- Second-run result: `replaced`
- Counts: 18 parts, 18 joints, 18 visuals, 3 sockets
- Render verification: RenderRoot2D, 18 SpriteFrames, 18 non-zero content
  sizes, UI_3D, compatible `Main Camera`, and preserved camera state
- Global sorting orders: every integer from 0 through 17
- Unrelated roots: 4 before and 4 after replacement
- Plan SHA-256:
  `c993978b74a51587e9d4a84201d130073e677a2acbb37c58b144dc5a16c6589a`

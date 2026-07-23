# TASK-004.5 Canonical Parts Cocos Refresh

- Date: 2026-07-23
- Creator: 3.8.8
- Scene:
  `cocos/projects/character-rig-builder-mvp/assets/red-cap-remade-acceptance.scene`
- Correlation ID: `task004-1784799620716`

## Procedure

1. Allowed Creator AssetDB to import the 19 canonical PNG replacements and
   refresh their existing `.meta` dimensions without changing UUIDs.
2. Opened `Panel → GameAI Pipeline → Character Rig Builder`.
3. Selected `assets/gameai/red-cap-target-remade`.
4. Ran `Build selected Red Cap rig`.
5. Observed:
   `replaced: 19 parts; panel → main-validation → assetdb → scene → verification`.
6. Saved the acceptance scene.

## Result

- Exactly one `CHR_red_cap_target_remade` generated root remains.
- The serialized generated marker carries correlation ID
  `task004-1784799620716`.
- The assembled character uses the canonical cutouts and is visible in Scene
  view.
- The builder performed safe replacement; it did not duplicate the generated
  root or edit unrelated scene nodes.
- Creator reported zero warnings and zero errors after the refresh.
- Existing SpriteFrame UUID values were preserved; only AssetDB-derived
  dimensions and mesh coordinates changed in the PNG `.meta` files.

## Evidence

- `docs/acceptance/evidence/TASK-004.5-canonical-parts-scene-3.8.8.png`
- `docs/acceptance/evidence/TASK-004.5-canonical-parts-console-3.8.8.png`

This refresh verifies the neutral-pose canonical art in Cocos. It does not make
the flattened-source cutouts animation-ready; occluded joint extensions remain
a separate future art task.

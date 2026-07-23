# TASK-004.1: Cocos Visible Rig Acceptance

## Status

Complete

## Goal

Correct the TASK-004 render integration so generated Character Rigs are
world-space 2D content that is visible in both the Cocos Scene view and an
orthographic acceptance-camera render.

## Root cause

- Generated nodes use `Layers.Enum.UI_2D`.
- `CHR_red_cap_target` has no `Canvas` or `RenderRoot2D`.
- The acceptance camera does not render `UI_2D`.
- Existing evidence proves hierarchy and SpriteFrame assignment, but not
  visible visual assembly.

## Required work

- Add `RenderRoot2D` to a generated render root entirely inside the guarded
  character replacement boundary.
- Use `Layers.Enum.UI_3D` consistently for the character root, RigRoot, Joint,
  Visual, socket, hit-area debug, marker, and metadata nodes.
- Keep all Visual nodes under the generated RenderRoot2D.
- Leave unrelated scene cameras unchanged.
- Configure the checked-in acceptance fixture with an orthographic,
  2D-facing camera whose visibility includes UI_3D.
- Verify in Scene Script before replacement commit:
  - RenderRoot2D exists.
  - Every Visual descends from it.
  - Every Sprite has a SpriteFrame.
  - Every Visual content size is non-zero.
  - Every generated node uses the selected render layer.
  - At least one active scene Camera renders the selected layer.
- Add a stable diagnostic for the missing-camera condition.
- Preserve Joint/Visual hierarchy, trim compensation, proximal pivots,
  Sorting2D global order, atomic idempotent replacement, and unrelated scene
  nodes and cameras.
- Replace acceptance evidence with visible Red Cap assembly and no Cocos
  console errors. Capture Scene and Game/Preview output when practical.

## Verification

- Run deterministic unit tests for the render plan and camera visibility
  policy.
- Run generation twice in Cocos Creator 3.8.8.
- Inspect the saved scene and captured evidence.
- From a clean checkout run:

  ```bash
  pnpm install --frozen-lockfile
  pnpm verify
  ```

## Out of scope

- Automatic modification of unrelated cameras
- Animation playback or generation
- Runtime production-game integration
- Changes to Character Rig, Rig Layout, or asset-intake contracts

## Result

- Generated roots now own RenderRoot2D and all generated nodes use UI_3D.
- Scene mutation preflights a compatible active camera and never changes
  camera state.
- Detached and attached trees verify RenderRoot2D ancestry, SpriteFrames,
  non-zero sizes, and consistent layers.
- `NO_CAMERA_CAN_RENDER_GENERATED_LAYER` provides the stable missing-camera
  diagnostic.
- The acceptance Main Camera is orthographic and 2D-facing; `sorting-2d` is
  included in the project engine features for clean Web Preview loading.
- Cocos Creator 3.8.8 generation succeeded twice with safe replacement. Scene
  and Web Preview both visibly render the complete 18-part Red Cap assembly
  with zero console errors.
- A clean-output `pnpm install --frozen-lockfile` followed by `pnpm verify`
  passed all 84 tests.

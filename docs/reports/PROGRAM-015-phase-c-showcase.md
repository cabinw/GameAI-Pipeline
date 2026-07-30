# PROGRAM-015 Phase C Showcase Report

## Decision

TASK-015C is accepted on 2026-07-30. The Creator-owned
`red-cap-production-showcase.scene` presents production-lite and Red Cap on
the licensed training-ground background with deterministic scene-specific
Dust, Trail, and Aura compiled through the existing D1 authoring and D2
runtime path.

## Deterministic source and resource closure

- The generator verifies the locked background and style-board SHA-256 values
  before writing outputs.
- The licensed 1664×936 background crop is deterministically resized to
  1280×720.
- The accepted production-lite and Red Cap neutral composites are trimmed and
  resized to 212×480 and 274×500.
- A deterministic 64×64 procedural soft mask is the only textured VFX utility
  resource. It prevents character art from being used as a particle or glow
  texture.
- The output contains exactly four new PNG resources, one Creator-owned
  Scene/`.meta` pair, and no feature media.
- The generation report binds every generated PNG and Render Plan to its
  SHA-256 digest.
- No D1/D2 public source, primitive, blend behavior, or runtime contract was
  changed.

## Layout and ownership

- Viewport: 1280×720 with a 64 px safe inset.
- production-lite: center x 380, foot y 646, 212×480 runtime silhouette.
- Red Cap: center x 900, foot y 646, 274×500 runtime silhouette.
- Locked maximum silhouette boxes are separated by 190 px, exceeding the
  required 48 px minimum.
- Both locked maximum silhouette boxes remain inside the safe area.
- Target namespaces are disjoint:
  `showcase.production-lite.*` and `showcase.red-cap.*`.
- Background, character, VFX, debug, and HUD sorting bands remain
  non-overlapping.

## Creator and framebuffer acceptance

Creator 3.8.8 imported all four resources and generated their image and
sprite-frame metadata. The scene was opened after a Creator restart and
previewed at 1280×720.

All changed-pixel counts below use decoded RGB pixels, channel delta greater
than 12, and the predeclared framebuffer ROIs:

| Gate | Required | Observed | Result |
| --- | ---: | ---: | --- |
| Dust | 120 | 376 | PASS |
| Trail | 160 | 4,077 | PASS |
| Aura | 240 | 16,492 | PASS |
| Resume active ROI | 80 | 40,125 | PASS |
| Paused frame stability | 0 changed pixels | 0 | PASS |

Creator interaction also passed:

- automatic Dust → Trail → Aura sequence and final hold;
- Pause/Resume;
- Transform Stress and debug projection;
- two consecutive deterministic rebuilds;
- manual Dust, Trail, and Aura after rebuild;
- Exact Reset to no active or stale renderer;
- clean reopen/restart with both characters and the licensed background
  visible; and
- zero relevant Preview warnings or errors.

## Validation

The automated suite covers:

- layout safe-area and separation closure;
- target namespace and VFX resource closure;
- generated output hashes and PNG dimensions;
- Scene/meta and component UUID identity;
- exactly one enabled showcase component with the inherited motion component
  disabled;
- all four Creator-imported PNG sprite-frame metas;
- published controls and cleanup calls; and
- reuse of the existing D1 compiler and D2 host/runtime without public
  modifications.

No MP4 or other evidence media is tracked on the feature branch.

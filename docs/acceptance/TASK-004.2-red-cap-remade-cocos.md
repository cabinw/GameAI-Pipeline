# TASK-004.2 Red Cap Remade Cocos Acceptance

## Accepted configuration

- Cocos Creator: 3.8.8
- Scene: `assets/red-cap-remade-acceptance.scene`
- Canonical source: `examples/red-cap-target-remade`
- AssetDB mirror: `assets/gameai/red-cap-target-remade`
- Character root: `CHR_red_cap_target_remade`
- Render boundary/layer: `RenderRoot2D` / `UI_3D`
- Camera: fixture-owned orthographic `Main Camera`
- Parts/SpriteFrames: 19 / 19

The builder was run twice. Both runs passed validation before mutation; the
second run reported `replacement: "replaced"`, retained four unrelated scene
roots, preserved camera state, and left exactly one generated character root.
The final evidence correlation ID is `task004-1784792568336`.

## Canonical source mapping

| Supplied file | Canonical import file | `partId` |
| --- | --- | --- |
| `briefcase.png` | `briefcase.png` | `briefcase` |
| `cap.png` | `cap.png` | `cap` |
| `foot_l.png` | `foot-left.png` | `foot-left` |
| `foot_r.png` | `foot-right.png` | `foot-right` |
| `forearm_l.png` | `forearm-left.png` | `forearm-left` |
| `forearm_r.png` | `forearm-right.png` | `forearm-right` |
| `glasses.png` | `sunglasses.png` | `sunglasses` |
| `hair.png` | `hair.png` | `hair` |
| `hand_l.png` | `hand-left.png` | `hand-left` |
| `hand_r.png` | `hand-right.png` | `hand-right` |
| `head.png` | `head.png` | `head` |
| `pelvis.png` | `pelvis.png` | `pelvis` |
| `shin_l.png` | `shin-left.png` | `shin-left` |
| `shin_r.png` | `shin-right.png` | `shin-right` |
| `thigh_l.png` | `thigh-left.png` | `thigh-left` |
| `thigh_r.png` | `thigh-right.png` | `thigh-right` |
| `torso.png` | `torso.png` | `torso` |
| `upper_arm_l.png` | `upper-arm-left.png` | `upper-arm-left` |
| `upper_arm_r.png` | `upper-arm-right.png` | `upper-arm-right` |

The map is data, not a naming heuristic. Missing mappings fail with
`SOURCE_ART_PART_MISSING`; multiple mappings for one canonical part fail with
`SOURCE_ART_PART_AMBIGUOUS`.

## Source asset audit

Every supplied part decoded as PNG/RGBA, contained both transparent and
non-transparent pixels, and had non-empty content. Dimensions and decoded
non-transparent bounds are:

| File | Size | Non-transparent bounds |
| --- | ---: | --- |
| `briefcase.png` | 150×133 | 0,0 150×133 |
| `cap.png` | 126×76 | 0,0 126×76 |
| `foot_l.png` | 69×75 | 0,0 69×75 |
| `foot_r.png` | 60×71 | 0,0 60×71 |
| `forearm_l.png` | 55×147 | 0,0 55×147 |
| `forearm_r.png` | 87×170 | 0,0 87×170 |
| `glasses.png` | 103×30 | 0,0 103×30 |
| `hair.png` | 128×106 | 0,0 128×106 |
| `hand_l.png` | 51×107 | 0,0 51×107 |
| `hand_r.png` | 65×159 | 0,0 65×159 |
| `head.png` | 126×155 | 0,0 126×155 |
| `pelvis.png` | 141×98 | 0,0 141×98 |
| `shin_l.png` | 54×164 | 0,0 54×164 |
| `shin_r.png` | 51×156 | 0,0 51×156 |
| `thigh_l.png` | 64×176 | 0,0 64×176 |
| `thigh_r.png` | 53×173 | 0,0 53×173 |
| `torso.png` | 208×179 | 0,0 208×179 |
| `upper_arm_l.png` | 67×173 | 0,0 67×173 |
| `upper_arm_r.png` | 95×177 | 0,0 95×177 |

Some supplied files include opaque label pixels at an edge. The explicit
`cropRect` entries create deterministic import-safe derivatives while keeping
all supplied bytes unchanged. The asset-intake manifest then validates the
derived dimensions, alpha state, transparent-pixel count, and content bounds.

## Evidence

- [Scene view](evidence/TASK-004.2-red-cap-remade-scene-3.8.8.png)
- [Game Preview](evidence/TASK-004.2-red-cap-remade-game-preview-3.8.8.png)
- [Correlation-linked verification JSON](evidence/TASK-004.2-red-cap-remade-cocos-3.8.8.json)

The Scene capture shows the complete generated character, selected generated
root, `UI_3D`, non-zero 3.26×8.92 root bounds, and `RenderRoot2D`, with zero
console counters. Game Preview shows the complete character at runtime with no
colored placeholder parts.

## Remaining calibration limits

- The supplied raster parts have hard-cut alpha edges; this task does not
  repaint or repair source art.
- Beige overlap/cuff regions remain visible at some wrists, knees, and ankles.
  They preserve connected joints but are not animation-tested.
- The provided head art already contains hair while a separate hair overlay is
  also required by the canonical rig.
- Proportions are calibrated to the supplied 326×892 assembled reference;
  pixel-perfect image-diff acceptance is not yet defined.
- Animation and deformation behavior remain explicitly out of scope.

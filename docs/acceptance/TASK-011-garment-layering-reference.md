# TASK-011 Multi-Part Garment Layering Reference Acceptance

## Automated acceptance

TASK-011 extends Attachment Layout 1.0 with optional `wearableSets`, per-
attachment `wearableSetId`, generic coverage `seams`, and expanded layer roles.
Existing TASK-010 documents remain valid. Group overrides combine with slot
overrides without mutating the layout or base rig.

The deterministic fixture contains jacket back/front, paired upper/lower
sleeves, paired cuffs, collar back/front, and zipper trim. All placement,
pivots, parent binding, enabled state, and draw order come from the contract.

Four independently authored Rest variants reconstruct at fixed zero tolerance:

| Variant | RGBA | Alpha | Seam | Bounds |
| --- | ---: | ---: | ---: | ---: |
| base | 0 | 0 | 0 | 0 px |
| jacket only | 0 | 0 | 0 | 0 px |
| accessories only | 0 | 0 | 0 | 0 px |
| jacket and accessories | 0 | 0 | 0 | 0 px |

Ten seam constraints are sampled at 29 canonical times in each of Rest, Wave,
Walk, Articulation Stress, Accessory Stress, and Garment Stress. Coverage
validation fails on missing items or overlap below the authored minimum.
The resulting 174 clip/time pose samples all pass.

Garment Stress is a seamless 2.8-second loop. It exercises both shoulders,
both elbows, a raised arm, a torso-crossing arm, torso lean, and head tilt
within the ranges recorded in `reference/authoring-provenance.json`.

## Cocos acceptance

Open:

```text
cocos/projects/character-rig-builder-mvp/assets/garment-layering-reference.scene
```

The generated Cocos Creator 3.8.x runtime shows authored reference, assembled
character, overlay, skeleton, garment slots, seams, bounds, pivots, links,
layer labels, and wearable state.

Controls:

- `1` Rest, `2` Wave, `3` Walk, `4` Articulation Stress,
  `5` Accessory Stress, `6` or `H` Garment Stress
- `Space` Pause/Resume, `R` exact Reset
- `K` jacket, `C` cap, `G` sunglasses
- `Q` reference, `E` assembled, `O` overlay
- `J` joints, `B` bounds, `A` pivots, `L` links, `D` layers,
  `S` garment slots, `M` seams, `V` skeleton

No per-frame sorting patch or garment placement correction exists in the
runtime.

## Verification evidence

- Working copy: `CI=true pnpm verify` passed (189/189 tests).
- Tracked-files-only checkout:
  `pnpm install --frozen-lockfile && CI=true pnpm verify` passed
  (189/189 tests).
- All generated PNGs and Cocos mirrors are byte-stable under regeneration.
- No MP4 is tracked.

Ignored local videos:

| Video | Duration | SHA-256 | Coverage |
| --- | ---: | --- | --- |
| `artifacts/TASK-011/task-011-variants-and-motion.mp4` | 38.000 s | `e49f2925cb8a92ebbbaaa9178fe4f50476bf96ec0bd9ac097db58b16c8d470cc` | Four variants, overlay, Wave, Walk |
| `artifacts/TASK-011/task-011-garment-stress-and-debug.mp4` | 39.000 s | `c92fa0a6982c839099bc8d782e91034f38d2b84695f6f396a22aefcde7b2986a` | Garment Stress loops, pause/resume, exact reset, all debug views |

Both files are independently decodable H.264, 1280×720, 30 fps, yuv420p
MP4s. The capture was cropped and pillarboxed to exclude the recorder utility
overlay while retaining the actual Cocos Web Preview.

## External manual visual acceptance

Result: **PASS**.

The reviewer downloaded both MP4 files from `origin/evidence/task-011`,
confirmed that both SHA-256 values matched the manifest, and completed full
FFmpeg decoding. Visual review covered:

- all four wearable/accessory variants;
- authored reference versus assembled output;
- Wave and Walk;
- repeated Garment Stress motion, including crossed-arm and raised-arm poses;
- Pause/Resume and exact Reset; and
- slots, seams, pivots, bounds, links, layer labels, and skeleton overlays.

No visible garment detachment, broken articulation, unexpected layer
switching, persistent seam opening, or animation flicker was found. The
documented rigid-sprite limitations remain accepted.

Temporary evidence metadata:

- Branch: `evidence/task-011`
- Evidence commit:
  `c2a09e27cbad0e462d564b727bb429a13f1779b8`
- `task-011-variants-and-motion.mp4` SHA-256:
  `e49f2925cb8a92ebbbaaa9178fe4f50476bf96ec0bd9ac097db58b16c8d470cc`
- `task-011-garment-stress-and-debug.mp4` SHA-256:
  `c92fa0a6982c839099bc8d782e91034f38d2b84695f6f396a22aefcde7b2986a`

The temporary evidence branch is deleted after this acceptance publication,
so its raw GitHub URLs are not durable evidence.

## Known limitations

The jacket is rigid and authored for this fixture. There is no arbitrary
auto-fitting, cloth physics, mesh deformation, IK, root motion, foot locking,
animation blending, or cross-engine adapter. Debug labels are dense when all
overlays are enabled. This remains production-lite validation art.

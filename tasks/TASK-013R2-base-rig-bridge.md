# TASK-013R2: Base Rig Bridge

## Objective

Connect only the production-lite base character rig to the accepted
TASK-013R1 runtime adapter boundaries. Prove that the minimal adapter scales
from two joints to the complete real base hierarchy without reintroducing the
old monolithic TASK-013 Full Loadout demo.

## Baseline and safety

- Branch: `recovery/task-013r2-base-rig-bridge`
- Accepted R1 baseline:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`:
  `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence:
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive:
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

Do not modify or delete the old Full Loadout scene, production assets,
engine-neutral contracts, frozen branches, or accepted R1 boundaries.

## Required runtime

Create a separate Creator 3.8.8-owned scene that loads and displays:

- the complete production-lite base rig hierarchy;
- every declared base Sprite part;
- engine-neutral pivots, parent relationships, Rest transforms, and sorting;
- explicit Rest, Wave, and Integration Stress semantic clips;
- Pause/Resume and exact Reset;
- root translation, scale, and rotation stress;
- joints, live parent-child skeleton, parent links, and generic pivot/bounds
  diagnostics;
- registry-derived HUD and semantic controls;
- lifecycle rebuild; and
- runtime spatial assertions.

Runtime code consumes tracked engine-neutral rig/pose resources. It must not
define a second Cocos-specific pivot, hierarchy, part, or clip-ID table.

## Reused R1 boundaries

- generation-token lifecycle with teardown/build;
- terminal manifest coordinator;
- semantic input registry;
- global sorting registry;
- `DebugOverlayRoot`;
- world-to-overlay-local projection; and
- finite spatial measurement and fail-closed diagnostics.

Extensions must remain generic and separately testable. Unknown parts,
parents, resources, clips, and semantic states fail without fallback.

## Spatial acceptance

At every live sample:

- projected joint marker error `<= 0.5 px`;
- skeleton endpoint-to-joint error `<= 0.5 px`;
- non-finite positions: 0;
- unknown parents: 0;
- parent cycles: 0;
- debug lines outside the character region: 0; and
- production/debug/HUD sorting violations: 0.

Every skeleton segment is projected from the current world positions of its
actual parent and child joint. No fixed line, Canvas compensation, or
character-specific debug offset is permitted.

## Automated acceptance

- deterministic base resource manifest and one request per logical ID;
- engine-neutral hierarchy and semantic clip validation;
- deterministic Rest/Wave/Integration Stress state;
- exact Reset;
- lifecycle and duplicate-listener coverage;
- arbitrary-hierarchy projection and bounds coverage;
- Creator scene/script/resource metadata integrity;
- working-copy `CI=true pnpm verify`; and
- tracked-files-only frozen install and `CI=true pnpm verify`.

Source-string assertions may be secondary safeguards only.

## Creator acceptance

In one uninterrupted Creator 3.8.8 run:

1. clean import/open;
2. switch to another valid scene and reopen;
3. second lifecycle initialization;
4. Creator and Preview Consoles clean;
5. terminal manifest PASS;
6. all base parts visible in correct Rest assembly;
7. Wave and Integration Stress visibly articulate the hierarchy;
8. Pause freezes and Resume continues;
9. exact Reset returns to stopped time zero Rest;
10. translation, scale, and rotation preserve debug alignment;
11. lifecycle rebuild leaves one character and one input response; and
12. Debug OFF removes all debug geometry.

## Evidence

After the complete gate and both verification modes pass:

- commit and push the R2 branch;
- record `task-013r2-base-rig-bridge.mp4` from Creator 3.8.8 Web
  Preview;
- require H.264, 1280 × 720, 30 fps, `yuv420p`, SHA-256, and full
  decode;
- publish temporarily on `evidence/task-013r2`;
- re-download and verify identical SHA-256 and complete decode; and
- stop for external visual review.

## Non-goals

No cap, glasses, garment, sleeves, cuffs, seams, prop, grip, loadout preset,
comparison mode, Red Cap, old Full Loadout scene work, Unity, Godot, VFX,
TASK-013R3, TASK-014, PR, or merge.

# TASK-013: Composable Full Character Loadout Reference

## Objective

Prove that the accepted engine-neutral rigid-attachment contracts compose
head accessories, a multi-part garment, a one-handed prop, and a
hand-over-handle overlay simultaneously on the production-lite character.
TASK-013 is an integration milestone, not a new attachment-feature family.

The implementation must use one generic path:

```text
character rig
→ resolve loadout state
→ resolve attachment sets
→ resolve parts and transforms
→ resolve global layer ordering
→ validate garment seams, accessory sockets, and prop grip
→ emit an engine-neutral resolved character
→ adapt the resolved result to Cocos Creator 3.8.x
```

Do not use the original Red Cap art or add fixture-specific framework
behavior. Framework code must not recognize cap, sunglasses, jacket, collar,
toolbox, briefcase, Cocos, Unity, or Godot names.

## Required fixture

Generate a deterministic editable production-lite fixture containing:

- the unchanged base character;
- two-layer headwear and face accessory;
- garment back/front, collar back/front, trim, bilateral upper/lower sleeves,
  and bilateral cuffs;
- left- and right-hand one-handed props; and
- left and right hand-over-handle overlays.

Support these exact Rest presets:

1. Base only.
2. Accessories only.
3. Garment only.
4. Prop only.
5. Garment + accessories.
6. Garment + prop.
7. Accessories + prop.
8. Full loadout.

Also support no-prop, left-hand, and right-hand prop states. Resolution must
not depend on JSON property, attachment array, set member, prop state, source
traversal, or animation array order. Array indices are not semantic IDs.

## Contracts and validation

Reuse TASK-010 through TASK-012 contracts. Extend a schema only for a genuine
engine-neutral integration gap, and keep any extension optional where
appropriate, backward compatible, documented, and tested.

Missing or invalid required data must fail without fallback using stable
diagnostics for:

- duplicate attachment IDs across families;
- exclusive-slot conflicts;
- missing socket targets or wearable members;
- states referencing nonexistent attachments;
- missing garment parts or required front/back counterparts;
- missing hand overlays;
- invalid global roles, draw order, or transforms;
- seam, grip-anchor, or accessory-socket drift;
- cyclic or contradictory state dependencies;
- unsupported schema versions; and
- missing or duplicate semantic animation IDs.

Global ordering must be deterministic across body back, garment back, hair
back, accessory back, torso/limbs, face/accessory front, collar and garment
front, sleeves/cuffs, prop behind-hand, hand, hand overlay, foreground, and
debug roles.

## Deterministic outputs

From tracked source descriptions generate:

- transparent PNG parts;
- engine-neutral rig and loadout contracts;
- the Cocos resource mirror;
- authored references, reconstructions, diffs, reports, and provenance.

All eight Rest references must report zero RGBA difference, alpha difference,
seam difference, and bounds expansion. Generated output must not depend on
ignored files, absolute paths, Cocos temp state, or manual post-generation
editing.

## Motion and continuous validation

Create semantic clips:

- `production-lite-full-loadout-rest`;
- `production-lite-full-loadout-walk`;
- `production-lite-full-loadout-wave`;
- `production-lite-full-loadout-prop-swing`; and
- `production-lite-full-loadout-integration-stress`.

Integration Stress must simultaneously exercise head/accessory following,
torso lean, shoulder/elbow/wrist and sleeve/cuff articulation, collar/garment
layering and seams, prop body crossing, hand overlay ordering, and exact grip
lock.

Sample every required clip at 60 Hz. At every sample validate all garment
seams, accessory socket lock, prop grip lock, deterministic ordering, required
presence, finite transforms, and resolved state. Report total samples,
maximum seam/socket/grip errors, maximum ordering violations, and failing clip
ID/time. Exact Reset must return STOPPED at 0.00 to authored Rest and the
deterministic full-loadout state.

## Cocos acceptance

Create one Cocos Creator 3.8.x acceptance scene driven by the generic resolved
character. It must switch all eight presets and three prop states; play all
five clips; pause/resume; reset exactly; show reference/assembled/overlay; and
toggle joints, bounds, pivots, parent links, global layer labels, slots, seams,
sockets, grips, and skeleton.

The HUD must show the active preset/state, actual runtime semantic clip ID,
playback state/time, all validation statuses, and reconstruction result.
Control mappings must be semantic and independent of animation array order.

## Automated acceptance

Add tests for every preset and prop state, reordered inputs, duplicate IDs,
slot conflicts, invalid state references, global ordering, exact
reconstruction, 60 Hz seam/socket/grip validation, semantic mappings,
reordered clips, exact reset, the generic Cocos adapter, resource
reproducibility, and tracked-files-only use. Preserve TASK-010 through
TASK-012 coverage.

Both must pass:

```bash
CI=true pnpm verify
pnpm install --frozen-lockfile # in a tracked-files-only clean checkout
CI=true pnpm verify
```

## Evidence and publication

Keep ignored local H.264 High 1280×720, 30 fps, yuv420p originals under
`artifacts/TASK-013/`:

- `task-013-loadout-variants-and-overlay.mp4`;
- `task-013-full-loadout-motion-and-stress.mp4`.

Fully decode and SHA-256 both. Publish review copies plus `manifest.json` on
temporary branch `evidence/task-013` using an isolated worktree. The manifest
must identify schema/task/feature commit, complete media metadata, hashes,
coverage, and `awaiting-external-visual-review`. Re-download or otherwise
verify the published blobs decode fully.

Do not track MP4 on the feature branch, modify `.gitignore` for evidence,
create a TASK-013 PR, merge TASK-013, delete the evidence branch, change the
protected archive, begin Red Cap reconstruction/VFX/TASK-014, or implement
the listed non-goals.

## Acceptance criteria

- One generic engine-neutral composition path resolves every required state.
- All eight exact Rest reports are zero-difference.
- All continuous validations pass at 60 Hz with reported metrics.
- The integrated Cocos scene and semantic controls satisfy the acceptance
  requirements without duplicated TASK-010/011/012 demo composition logic.
- Both verification modes pass with prior regression coverage intact.
- Feature and evidence branches are pushed; no feature-branch MP4 or PR
  exists; `main` remains unchanged after Phase A; the working tree is clean;
  and `archive/old-task-007-cross-engine` remains
  `ed0923b466e457da7ce9932e0daf6644aa29df39`.

## Non-goals

Original Red Cap reconstruction, automatic fitting or grip solving, IK, foot
locking, root motion, blending, cloth/prop physics, mesh deformation,
two-handed weapons, combat/damage, Unity/Godot adapters, Windows validation,
VFX implementation, and production editor UI.

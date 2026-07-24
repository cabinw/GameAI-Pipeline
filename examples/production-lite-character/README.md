# Production-Lite Layered Character

This fixture is the TASK-009 bridge between the simple TASK-008 mannequin and
complex layered character artwork. It is a repository-owned, deterministic
17-part casual-game humanoid with organic silhouettes, differently trimmed
sprites, explicit front/back layers, and an independently authored Rest Pose
reference.

## Contents

- `source/character-source.json` is the editable deterministic artwork and
  authored-reference description.
- `parts/*.png` are checked-in transparent, irregularly shaped sprite parts.
- `rig-layout.json` and `character-rig.json` are the engine-neutral assembly
  contracts.
- `animations/*.json` contain Rest/Idle, Arm Wave, Walk Cycle, and
  Articulation Stress clips.
- `reference/reference-composite.png` is the independently authored exact Rest
  Pose.
- `reference/reconstructed-rest.png`, `reconstruction-diff.png`, and
  `reconstruction-report.json` are deterministic comparison evidence.

The Rig Layout is the only runtime placement contract. Every part supplies
`partId`, `parentId`, `file`, `sourceCanvas`, `originalRect`, `trimOffset`,
`anchor`, `restPose`, `drawOrder`, and `referenceScale`. Hair-back is ordered
behind the head, hair-front is ordered in front, and rear/front limb ordering
is explicit.

## Regeneration and verification

From the repository root:

```bash
pnpm --filter @gameai/character-asset-intake generate:production-lite
pnpm --filter @gameai/character-asset-intake verify:production-lite
```

Generation rewrites this fixture and its Cocos `resources` mirror. It also
normalizes every Creator SpriteFrame to `trimType: none`, preserving each
contract-declared decoded rectangle instead of allowing a second importer
trim. Tests compare hashes before and after regeneration.

The reconstruction verifier composites decoded parts using only the Rig
Layout hierarchy, anchors, trim offsets, transforms, reference scale, and draw
order. The authored-reference and reconstruction paths are separate. TASK-009
uses a fixed zero-tolerance comparison:

```text
RGBA mismatches:       0
alpha mismatches:      0
bounds expansion:      0 px
seam mismatches:       0
```

Focused mutations prove that missing parts, trim offsets, anchors, rest
transforms, reference scale, draw order, bounds expansion, and visible seams
are rejected.

## Creator preview

Open
`cocos/projects/character-rig-builder-mvp/assets/production-lite-layered-character-reference.scene`
in Cocos Creator 3.8.x and start Web Game Preview at 1280×720.

- `1`: Rest/Idle
- `2`: Arm Wave
- `3`: Walk
- `4`: Articulation Stress
- `Space`: Pause/Resume
- `R`: exact authored-rest Reset
- `Q`: authored reference view
- `E`: assembled SpriteFrame view
- `O`: reference/assembled overlay
- `J`: joint markers
- `B`: sprite bounds
- `A`: anchor/pivot markers
- `L`: parent links
- `D`: draw-order/layer labels
- `V`: skeleton/debug view

The HUD shows clip, playback state/time, debug state, and the exact
reconstruction result. Reference, assembled, overlay, and skeleton views are
independently switchable.

## Limitations

Walk is deliberately in place and can exhibit foot sliding. The fixture has
no IK, foot locking, root motion, blending, mesh deformation, facial
animation, loose cloth, or cross-engine adapter. The rigid SpriteFrame design
is intentionally simpler than a production hero character.

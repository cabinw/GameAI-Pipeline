# Production-Lite Composable Full Loadout

TASK-013 composes the accepted head-accessory, multi-part garment, and
one-handed prop fixtures through one engine-neutral loadout resolver. The
fixture uses the production-lite body and does not use original Red Cap art.

## Source and generated outputs

`source/full-loadout-source.json` is the editable source description. It
declares three attachment families, the complete canonical 12-state matrix,
two mutually exclusive prop/overlay groups, eight exact Rest-output mappings,
and the five required semantic clip IDs.

The generator writes family Attachment Layout 1.0 contracts, the
engine-neutral loadout contract, a deterministic merged reconstruction
contract, resolved character states, transparent PNGs, five semantic clips,
eight Rest references/reconstructions/diffs/reports, provenance, and a Cocos
resource mirror.

Run:

```bash
pnpm --filter @gameai/character-asset-intake generate:production-lite-full-loadout
pnpm --filter @gameai/character-asset-intake verify:production-lite-full-loadout
```

## Presets and prop states

Four base/garment/accessory combinations are crossed with `no-prop`,
`left-hand-prop`, and `right-hand-prop` exactly once. The historical output
names `base-only`, `accessories-only`, `garment-only`, `prop-only`,
`garment-accessories`, `garment-prop`, `accessories-prop`, and `full-loadout`
are deterministic reference-file mappings, not a second state model.

Resolution does not depend on JSON properties, array positions, family/state/
member declarations, or file traversal order.

## Continuous acceptance

All five clips are sampled at 60 Hz. The committed report covers 605 samples
and records zero garment seam error, accessory socket error, prop grip error,
and global ordering violations. Every exact Rest variant records zero RGBA,
alpha, seam, and bounds difference.

The production Cocos Creator 3.8.x entry is
`composable-character-loadout-reference-v2.scene`. The older
`composable-full-loadout-reference.scene` is superseded provenance and is not
selected by the canonical facade.

## Limitations

Fitting, sockets, grips, seams, and ordering are authored. Sprites are rigid,
walk is in place, and only the Cocos adapter is implemented. There is no IK,
automatic fitting or grip solving, blending, root motion, physics, mesh
deformation, two-handed interaction, combat, other-engine adapter, VFX
runtime, or original Red Cap reconstruction.

Garment seam validation uses world-space AABBs derived from transformed
authored regions; it does not claim oriented-polygon or cloth-surface
correctness.

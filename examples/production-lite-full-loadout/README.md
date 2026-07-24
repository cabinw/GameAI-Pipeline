# Production-Lite Composable Full Loadout

TASK-013 composes the accepted head-accessory, multi-part garment, and
one-handed prop fixtures through one engine-neutral loadout resolver. The
fixture uses the production-lite body and does not use original Red Cap art.

## Source and generated outputs

`source/full-loadout-source.json` is the editable source description. It
declares three attachment families, named loadout states, two mutually
exclusive prop/overlay groups, the eight exact Rest presets, and the five
required semantic clip IDs.

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

The exact presets are `base-only`, `accessories-only`, `garment-only`,
`prop-only`, `garment-accessories`, `garment-prop`, `accessories-prop`, and
`full-loadout`. `full-loadout-no-prop`, `full-loadout-left`, and
`full-loadout-right` prove explicit prop-state switching.

Resolution does not depend on JSON properties, array positions, family/state/
member declarations, or file traversal order.

## Continuous acceptance

All five clips are sampled at 60 Hz. The committed report covers 605 samples
and records zero garment seam error, accessory socket error, prop grip error,
and global ordering violations. Every exact Rest variant records zero RGBA,
alpha, seam, and bounds difference.

The Cocos Creator 3.8.x scene `composable-full-loadout-reference.scene`
consumes only the generic resolved plan. F1–F8 select presets, Q/W/E select
prop state, 1–5 select clips by semantic ID, Space pauses/resumes, and Escape
performs exact stopped Rest reset.

## Limitations

Fitting, sockets, grips, seams, and ordering are authored. Sprites are rigid,
walk is in place, and only the Cocos adapter is implemented. There is no IK,
automatic fitting or grip solving, blending, root motion, physics, mesh
deformation, two-handed interaction, combat, other-engine adapter, VFX
runtime, or original Red Cap reconstruction.

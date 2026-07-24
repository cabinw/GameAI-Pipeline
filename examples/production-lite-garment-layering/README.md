# Production-Lite Garment Layering

TASK-011 composes the accepted production-lite body and rigid attachment
contract into a deterministic multi-part casual jacket. The fixture is
validation artwork, not an original Red Cap reconstruction.

## Contents

- `source/garment-source.json`: editable palette, SVG part descriptions,
  transforms, wearable set, slots, seams, layer order, and variants.
- `attachment-layout.json`: backward-compatible Attachment Layout 1.0 data.
- `attachments/*.png`: eleven transparent jacket parts plus byte-identical
  TASK-010 cap and sunglasses parts.
- `animations/garment-stress.json`: data-only shoulder, elbow, torso, and head
  stress clip.
- `reference/*.png`: authored, reconstructed, and diff images for base,
  jacket-only, accessories-only, and combined Rest states.
- `reference/*-report.json`: committed zero-tolerance reconstruction results.

Regenerate and verify with:

```sh
pnpm --filter @gameai/character-asset-intake generate:production-lite-garment
pnpm --filter @gameai/character-asset-intake verify:production-lite-garment
```

The `casual-jacket` wearable set controls all jacket parts without changing
the body rig or head attachment slots. Ten authored seam constraints cover
torso/shoulders, elbows, cuffs/hands, and collar/torso/head relationships.

## Limitations

The jacket is rigid, authored for this accepted body, and has no cloth
simulation, deformation, IK, automatic fitting, or engine-specific correction
constants. Walk remains in place.

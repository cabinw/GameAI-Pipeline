# Canonical Part Remake

TASK-004.5 remakes the Red Cap parts directly from
`examples/red-cap-target-remade/reference/full_character.png`.

## Reproducible inputs and outputs

- `canonical-part-segmentation.json` is the source-canvas pixel-ownership
  specification.
- `extract-canonical-parts.mjs` assigns every nontransparent canonical pixel
  to the first matching semantic ownership polygon.
- Every visible pixel has exactly one owner. Transparent pixels have none.
- Each source part is a tight PNG crop expanded only enough to include its
  proximal joint and child attachment points.
- Original RGBA bytes and source-canvas coordinates are preserved; extraction
  performs no resizing, interpolation, repainting, or generation.
- `canonical-extraction-manifest.json` records dimensions, visible counts, and
  SHA-256 values.
- `part-ownership.png` visualizes ownership without modifying source art.

Run the complete deterministic refresh with:

```bash
pnpm --filter @gameai/character-asset-intake extract:red-cap-canonical
node pipelines/character-asset-intake/scripts/prepare-mapped-assets.mjs \
  examples/red-cap-target-remade/source-asset-map.json
pnpm --filter @gameai/rig-layout-generator fixtures:generate
pnpm --filter @gameai/character-asset-intake reconstruct:red-cap
pnpm --filter @gameai/character-asset-intake audit:red-cap
pnpm --filter @gameai/character-asset-intake sync:red-cap-cocos
```

The sync step copies only fixture inputs into the existing Cocos AssetDB mirror
and preserves its `.meta` files and UUIDs.

## Acceptance

The current result has:

- 19 nonempty canonical parts;
- 162,968 assigned of 162,968 canonical visible pixels;
- zero duplicate pixel ownership;
- zero alpha-silhouette mismatch;
- zero visible RGBA mismatch;
- no generated visible pixels.

## Limitation

The canonical reference is a flattened neutral-pose composite, not a layered
art source. It cannot reveal pixels hidden behind the jacket, neighboring body
parts, hands, or briefcase. Some extracted sprites therefore contain only the
visible neutral-pose fragment of that semantic body part. This is exact for
neutral-pose acceptance but is not yet animation-ready.

Before animation, hidden joint-overlap extensions require a separate art task.
Such pixels must be declared in `asset-provenance.json` and remain fully
covered in the neutral pose.

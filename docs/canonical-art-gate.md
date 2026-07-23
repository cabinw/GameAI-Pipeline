# Canonical Art Asset Gate

TASK-004.4 adds an engine-neutral pixel-provenance gate to
`@gameai/character-asset-intake`. It runs before rig hierarchy and Cocos.

## Provenance input

`examples/red-cap-target-remade/asset-provenance.json` declares:

- the canonical transparent full-body PNG;
- every part exactly once in canonical back-to-front draw order;
- optional part-local hidden-extension rectangles;
- versioned pixel tolerances.

Hidden-extension declarations are narrow exceptions. Generated or painted
pixels are allowed there only when a higher part completely covers them in the
neutral flat composite. A declared region that remains visible still fails.

## Verification

```bash
pnpm --filter @gameai/character-asset-intake audit:red-cap
```

The command exits non-zero for invalid art. To refresh the evidence for an
expected blocked fixture:

```bash
pnpm --filter @gameai/character-asset-intake audit:red-cap:report
```

It writes:

- `examples/red-cap-target-remade/provenance/flat-composite.png`
- `examples/red-cap-target-remade/provenance/diff.png`
- `examples/red-cap-target-remade/provenance/mismatch-statistics.json`

The flat composite resizes each current part to its declared `originalRect`,
places it directly on `sourceCanvas`, and composites by declared draw order.
No Joint, hierarchy, anchor, rest-pose transform, reference-space conversion,
or Cocos API participates.

The diff uses red for alpha-silhouette disagreement and magenta for visible
RGBA disagreement beyond the channel tolerance.

## Acceptance thresholds

- Alpha silhouette mismatch ratio: exactly `0`.
- Maximum per-channel visible RGBA delta: `2`.
- Visible RGBA mismatch ratio: at most `0.001` (0.1%).
- Native nontransparent part pixels with an exact RGBA value present in the
  canonical PNG: at least `0.999` (99.9%), after excluding valid hidden
  extensions.

The exact native-pixel check prevents visually similar redrawn assets from
passing because of favorable placement or palette similarity.

## Stable diagnostics

| Code | Meaning |
| --- | --- |
| `CANONICAL_REFERENCE_MISSING` | The canonical PNG is absent, unreadable, non-transparent, empty, or has the wrong canvas size. |
| `PART_PIXEL_PROVENANCE_MISMATCH` | A part's audited visible/native pixels do not meet canonical provenance thresholds. |
| `FLAT_COMPOSITE_SILHOUETTE_MISMATCH` | The flat alpha silhouette is not identical to the canonical reference. |
| `FLAT_COMPOSITE_PIXEL_DIFF_EXCEEDED` | Visible flat-composite RGBA mismatch exceeds 0.1%. |
| `UNDECLARED_GENERATED_VISIBLE_REGION` | Generated pixels remain visible outside a fully covered declared hidden extension. |

## Current Red Cap Remade result

TASK-004.4 correctly blocked the original replacement pack. TASK-004.5 then
replaced all 19 sprites with direct canonical cutouts.

Current status: `passed`.

- Canonical visible pixels: 162,968
- Assigned visible pixels: 162,968
- Flat-composite visible pixels: 162,968
- Silhouette mismatch pixels: 0 (0%)
- Visible RGBA mismatch pixels: 0 (0%)
- Exact canonical-pixel ratio: 100% for every part
- Passing parts: 19/19

The reproducible ownership input is
`examples/red-cap-target-remade/canonical-part-segmentation.json`; extraction
metadata and the ownership preview are under the fixture's `provenance/`
directory.

The canonical source is a flattened image. Only pixels visible in its neutral
pose can be recovered. Occluded anatomy and joint interiors remain absent and
must not be invented as visible art. Future animation work may add explicitly
declared hidden extensions only where the neutral pose fully covers them.

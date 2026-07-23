# Articulation-Safe Joint Overlaps

TASK-006 adds deterministic hidden overlap art and stress-pose verification
before larger animation presets are authored.

## Contract and generation

`examples/red-cap-target-remade/articulation-safety.json` declares both
shoulders, elbows, wrists, hips, knees, and ankles; each child and higher
draw-order cover; two stress poses that test every joint in both directions;
and the inherited right-arm/hand/briefcase branch.

Generation always recreates the direct canonical cutouts first. Canonical
cutouts remain under `source-parts/`; extended source sprites are generated
separately under `articulation/source-parts/`. Each extension copies fully
opaque pixels from its declared parent cover and is emitted only where that
parent is the neutral topmost owner.

`asset-provenance.json` declares the exact generated pixels as deterministic
run rectangles. A broad joint rectangle is not permission to paint: every
noncanonical pixel must belong to an exact declared region.

Regenerate the art, layout, Cocos mirror, and acceptance scenes with:

```bash
pnpm --filter @gameai/character-asset-intake generate:red-cap-overlaps
```

## Validation

The canonical gate requires every extension pixel to be declared and covered
at rest. A visible declared pixel, incorrect draw order, or generated pixel
outside a region fails.

The articulation verifier renders the hierarchy for both stress poses and
publishes stable diagnostics:

- `ARTICULATION_SPEC_INVALID`
- `ARTICULATION_TRANSPARENT_GAP`
- `ARTICULATION_EXPOSED_CUT_EDGE`
- `ARTICULATION_DRAW_ORDER_INVALID`
- `ARTICULATION_BRIEFCASE_BRANCH_INVALID`

It checks child/cover overlap and proximal joint-disk coverage. Briefcase
verification compares the inherited hand transform with the briefcase pivot
after rotation.

```bash
pnpm --filter @gameai/character-asset-intake verify:red-cap-articulation
```

Evidence under `examples/red-cap-target-remade/articulation/` includes both
stress PNGs, `stress-report.json`, `neutral-pixel-diff.png`, and
`generated-overlaps.json`. The neutral diff ignores RGB payload only where
both pixels are transparent and compares every visible RGBA pixel exactly.

## Cocos acceptance

The Cocos Creator 3.8.x project includes fixed rest, positive-stress, and
negative-stress scenes. Their Joint transforms, Visual offsets, and sizes are
generated from the current Rig Layout, and runtime autoplay is disabled.

Walk, Hit, blending, IK, and animation state machines remain out of scope.

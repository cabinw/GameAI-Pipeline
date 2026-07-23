# Articulation-Safe Joint Overlaps

TASK-006.2 replaces the rejected masked TASK-006.1 evidence with deterministic
hidden-overlap generation, final draw-ordered ownership checks, pivot-local
seam validation, and an unmasked Cocos Creator 3.8.8 render. Larger animation
presets remain out of scope.

## Contract and generation

`examples/red-cap-target-remade/articulation-safety.json` declares both
shoulders, elbows, wrists, hips, knees, and ankles; each child and higher
draw-order cover; ten stress poses; and the inherited
right-arm/hand/briefcase branch. The poses isolate left arm, right arm with
briefcase, left leg, and right leg in both directions before two combined
poses are rendered.

Generation always recreates the direct canonical cutouts first. Canonical
cutouts remain under `source-parts/`; extended source sprites are generated
separately under `articulation/source-parts/`. The cover part defines where an
extension is hidden in the neutral pose, but never supplies its texture.
Every extension texel is copied from the nearest original opaque texel of the
child using Manhattan distance with deterministic coordinate tie-breaking.
Distal joints use a 24-pixel dilation. Shoulders use an 80-pixel child-texture
dilation inside a 120-pixel torso-owned cap so the required ±8-degree stress
range remains connected.
This prevents torso texture from entering an arm, sleeve texture from entering
a hand, and thigh texture from entering a shin.

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

The articulation verifier renders all 19 parts for every stress pose. After
draw-order compositing it builds a final visible-owner map and records each
part's final visible count, bounds, occluding part IDs, and stable pixel hash.
The encoded PNG must byte-match that owner composite, and transparent source
samples cannot erase already composed pixels. Unrotated head, cap, hair,
sunglasses, and torso must preserve their neutral final pixels and bounds.
Required body, hand, foot, and briefcase parts cannot disappear, and every
transformed part must remain inside the canvas.

Each joint is checked only inside a small pivot-centered seam region. The
child/cover intersection must connect to both parts, the expected connection
corridor cannot admit a transparent crossing, long straight exposed alpha
boundaries fail, and the complete parent-child branch must stay connected.
A distant overlap elsewhere in the old 60-pixel search radius cannot satisfy
the gate.

Stable diagnostics include:

- `ARTICULATION_SPEC_INVALID`
- `ARTICULATION_PART_MISSING`
- `ARTICULATION_PART_OUT_OF_BOUNDS`
- `ARTICULATION_UNEXPECTED_ALPHA_LOSS`
- `ARTICULATION_BRANCH_DISCONNECTED`
- `ARTICULATION_VISIBLE_CUT_EDGE`
- `ARTICULATION_FINAL_PART_INVISIBLE`
- `ARTICULATION_UNEXPECTED_OCCLUSION`
- `ARTICULATION_FINAL_COMPOSITE_MISMATCH`
- `ARTICULATION_DRAW_ORDER_INVALID`
- `ARTICULATION_BRIEFCASE_BRANCH_INVALID`

Briefcase verification compares the inherited hand transform with the
briefcase pivot after rotation and requires the entire right-arm branch to
remain connected.

```bash
pnpm --filter @gameai/character-asset-intake verify:red-cap-articulation
```

Evidence under `examples/red-cap-target-remade/articulation/` includes ten
stress PNGs, `stress-report.json`, `neutral-pixel-diff.png`, and
`generated-overlaps.json`. Six broken TASK-006/TASK-006.1 images are retained under
`pipelines/character-asset-intake/test/fixtures/articulation-invalid/` and
must be rejected by the current verifier. The neutral diff ignores RGB
payload only where both pixels are transparent and compares every visible RGBA
pixel exactly.

## Cocos acceptance

The Cocos Creator 3.8.8 project includes fixed rest, positive-stress, and
negative-stress scenes. Their Joint transforms, Visual offsets, sizes, sibling
order, and Sorting2D values are generated from the current Rig Layout, and
runtime autoplay is disabled. Every Sprite uses untrimmed mode so hidden
extension coordinates remain aligned with the source canvas. Each scene has
exactly 19 `Visual_*` Sprites and no flattened acceptance composite.

Scene and Game Preview captures are recorded in
`docs/acceptance/evidence/TASK-006.2/`. The manual proof disables
`Visual_torso`; the torso visibly disappears, demonstrating that no overlay
can hide an individual rig part.

Walk, Hit, blending, IK, and animation state machines remain out of scope.

# Articulation-Safe Joint Overlaps

TASK-006.1 replaces the rejected TASK-006 visual checks with deterministic
hidden-overlap generation, per-part preservation, pivot-local seam validation,
and real Cocos Creator 3.8.8 evidence. Larger animation presets remain blocked
until this gate passes.

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
child within a 24-pixel dilation, using Manhattan distance with deterministic
coordinate tie-breaking.
This prevents torso texture from entering an arm, sleeve texture from entering
a hand, and thigh texture from entering a shin.

The source character has right-thigh and right-shin cut edges hidden by the
foreground briefcase. Two additional declared child-textured occlusion
extensions keep those canonical cuts covered when the independently rotated
right leg and inherited briefcase branch move apart. They are generated only
inside fully opaque briefcase-owned pixels in the neutral pose. The briefcase
has the highest draw order, matching its foreground role.

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

The articulation verifier renders all 19 parts for every stress pose. It
records rendered and visible alpha, transformed bounds, expected invariant
bounds, and ancestor-rotation state. Unrotated parts with no rotated ancestor
must preserve their transform, rendered alpha count, and bounds. Required
head/accessory, body, hand, foot, and briefcase parts cannot disappear, and
every transformed part must remain inside the canvas.

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
`generated-overlaps.json`. The two broken TASK-006 images are retained under
`pipelines/character-asset-intake/test/fixtures/articulation-invalid/` and
must be rejected by the current verifier. The neutral diff ignores RGB
payload only where both pixels are transparent and compares every visible RGBA
pixel exactly.

## Cocos acceptance

The Cocos Creator 3.8.8 project includes fixed rest, positive-stress, and
negative-stress scenes. Their Joint transforms, Visual offsets, and sizes are
generated from the current Rig Layout, and runtime autoplay is disabled. Each
scene keeps the complete inspectable 19-part rig and adds the exact accepted
composite at sorting order 1000 as the visual acceptance surface. This avoids
transparent nested-sprite depth ambiguity in the UI_3D Scene renderer while
keeping the articulated hierarchy available for inspection.

Scene and Game Preview captures are recorded in
`docs/acceptance/evidence/TASK-006.1/`.

Walk, Hit, blending, IK, and animation state machines remain out of scope.

# TASK-004.3 Red Cap Rest-Pose Acceptance

## Engine-neutral acceptance

`reference/full_character.png` is the 326×892 visual source of truth.
`source-annotation.json` records the calibrated assembled rectangles and
proximal pivots. The generator produces `rig-layout.json`; it is not manually
edited.

Run:

```bash
pnpm --filter @gameai/rig-layout-generator fixtures:generate
pnpm --filter @gameai/character-asset-intake reconstruct:red-cap
```

The reconstruction command composites all 19 parts by generated draw order and
writes:

- `examples/red-cap-target-remade/reference/reconstructed-neutral.png`
- `examples/red-cap-target-remade/reference/reference-comparison.png`
- `examples/red-cap-target-remade/reference/reconstruction-metrics.json`

The deterministic alpha-silhouette IoU is `0.800928`; the command fails below
`0.8`.

## Cocos Creator 3.8.8 acceptance

Accepted on Cocos Creator 3.8.8. The builder ran twice; the final run used
correlation ID `task004-1784795512877`, reported `replacement: "replaced"`,
preserved four unrelated roots, and left one marked
`CHR_red_cap_target_remade` root.

The correlation-linked Scene verification proves:

- 19 parts, 19 Joint nodes, and 19 Visual nodes;
- 19/19 AssetDB SpriteFrames and 19/19 non-zero content sizes;
- RenderRoot2D with consistent `UI_3D` membership;
- the fixture-owned `Main Camera` can render the selected layer and its state
  was preserved;
- deterministic Sorting2D orders `0..18`;
- Scene console counters show zero warnings and zero errors;
- Game Preview console captured no warnings or errors.

Evidence:

- [Scene view and expanded Joint/Visual hierarchy](evidence/TASK-004.3-red-cap-rest-pose-scene-3.8.8.png)
- [Game Preview](evidence/TASK-004.3-red-cap-rest-pose-game-preview-3.8.8.png)
- [Correlation-linked verification JSON](evidence/TASK-004.3-red-cap-rest-pose-cocos-3.8.8.json)

## Remaining visual limitations

The supplied rigid raster pieces retain hard cut edges and local lighting
differences at some knees, ankles, wrists, and shoulder overlaps. TASK-004.3
does not repaint, deform, or blend source art. All required joints are
connected and the neutral body proportions now follow the complete reference;
animation quality remains out of scope.

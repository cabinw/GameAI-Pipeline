# TASK-004.5: Canonical Part Remake

## Status

Complete (2026-07-23)

## Goal

Remake every rejected Red Cap Remade part as a deterministic direct cutout
from `reference/full_character.png`, then pass the canonical provenance gate.

## Acceptance criteria

- All 19 canonical `partId` values receive a nonempty PNG.
- Every output nontransparent pixel retains the exact RGBA value and
  source-canvas coordinate of the canonical reference.
- Every canonical nontransparent pixel is owned by exactly one part.
- No visible pixel is generated, painted, interpolated, or resized.
- The ownership specification and extraction are reproducible.
- Source mapping, annotation geometry, generated layout, and Cocos import
  mirror agree with the remade PNG dimensions.
- The flat composite has zero alpha-silhouette mismatch and remains below the
  accepted visible RGBA mismatch threshold.
- Tests detect missing ownership, duplicate ownership, empty parts, changed
  canonical pixels, and nondeterministic outputs.
- No animation or Character Rig Builder/scene behavior is changed.

## Verification

```bash
CI=true pnpm install --frozen-lockfile
CI=true pnpm verify
pnpm --filter @gameai/character-asset-intake audit:red-cap
```

## Result

- Remade all 19 parts from exact canonical RGBA pixels.
- Assigned all 162,968 canonical visible pixels exactly once.
- Produced 19 nonempty PNGs with no generated visible pixels.
- Regenerated source mapping, annotation rectangles, Rig Layout, neutral
  reconstruction, Cocos import mirror, and provenance artifacts.
- Canonical gate result: passed.
- Alpha-silhouette mismatch: 0 pixels (0%).
- Visible RGBA mismatch: 0 pixels (0%).
- Exact canonical-pixel ratio: 100% for every part.
- The source is flattened, so occluded joint interiors are intentionally not
  fabricated. A future hidden-extension art task is required before animation.
- Refreshed the real Creator 3.8.8 acceptance scene through the Character Rig
  Builder. Correlation `task004-1784799620716` safely replaced one generated
  root with 19 canonical SpriteFrames; Creator reported zero warnings/errors.

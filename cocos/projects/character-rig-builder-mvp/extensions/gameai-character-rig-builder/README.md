# GameAI Character Rig Builder

This Cocos Creator 3.8.8 editor extension assembles a validated Character
Pipeline fixture into an idempotent rigid-sprite scene rig.

The process boundary is deliberate:

```text
Panel
  -> Main Process
     -> Character Contracts
     -> Rig Layout Generator
     -> Character Asset Intake
     -> AssetDB UUID resolution
     -> deterministic scene plan
  -> Scene Script
     -> preload SpriteFrames
     -> build detached Joint/Visual tree
     -> character-scoped replacement
  -> evidence
```

The Scene Script never reads files or reparses contracts. Every part is built
as a transform-bearing `Joint_<partId>` with one center-anchored
`Visual_<partId>` Sprite child. `Sorting2D.sortingOrder` provides one global
render order across joint branches.

## Development

From the repository root:

```bash
pnpm --filter gameai-character-rig-builder test
pnpm verify
```

Open `cocos/projects/character-rig-builder-mvp` in Cocos Creator 3.8.8 for the
editor acceptance procedure described in
`docs/acceptance/TASK-004-red-cap-cocos.md`.

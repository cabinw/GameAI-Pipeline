# Production-Lite Head Accessories

TASK-010 extends the byte-identical TASK-009 character with a deterministic
two-layer red cap and sunglasses. It is a generic rigid-attachment reference,
not a reconstruction of the original Red Cap character.

## Authored and generated files

- `source/accessory-source.json`: editable deterministic artwork, slots,
  attachment transforms, layer order, and four enabled-state variants.
- `attachment-layout.json`: engine-independent Attachment Layout 1.0 contract.
- `attachments/*.png`: transparent cap-back, cap-front, and sunglasses parts.
- `animations/head-accessory-stress.json`: data-only head and torso stress clip.
- `reference/*.png`: independently authored references, reconstructed images,
  and zero-valued diff images for all four variants.
- `reference/*-report.json`: fixed zero-tolerance comparison results.
- `reference/authoring-provenance.json`: generator and input provenance.

Regenerate and verify with:

```sh
pnpm --filter @gameai/character-asset-intake generate:production-lite-accessories
pnpm --filter @gameai/character-asset-intake verify:production-lite-accessories
```

The required combined order is:

```text
hair-back < cap-back < head < sunglasses < hair-front < cap-front
```

All slot and attachment placement is authored in the contract. The Cocos
adapter only converts the resolved plan into nodes and renderer sorting
priorities.

# Rig Layout Generator

`@gameai/rig-layout-generator` deterministically converts a versioned source annotation and reusable skeleton template into an engine-neutral Rig Layout.

```ts
import {
  generateRigLayout,
  maleNormalV1,
  serializeRigLayout,
} from "@gameai/rig-layout-generator";

const result = await generateRigLayout({
  annotation,
  template: maleNormalV1,
  characterRig,
  sourceRoot: "/absolute/path/to/character-fixture",
});

if (result.ok) {
  const json = serializeRigLayout(result.rigLayout);
  console.log(result.manifest.parts, json);
} else {
  console.error(result.diagnostics);
}
```

A successful result has passed both `@gameai/character-contracts` and `@gameai/character-asset-intake`. Warnings remain in `diagnostics` without making the result fail. The generator reads source assets but never writes, cuts, repairs, or mutates them.

See `docs/rig-layout-generator.md` for contracts, formulas, diagnostics, and limitations.

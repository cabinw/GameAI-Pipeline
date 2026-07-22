# Character Asset Intake

`@gameai/character-asset-intake` is a read-only, engine-neutral boundary between authored character fixtures and later generators. It loads contracts, delegates JSON validation to `@gameai/character-contracts`, confines filesystem resolution to a source root, decodes referenced images, and returns plain normalized data.

```ts
import { intakeCharacterAssets } from "@gameai/character-asset-intake";

const result = await intakeCharacterAssets({
  sourceRoot: "/absolute/path/to/red-cap-target",
});

if (!result.ok) {
  for (const diagnostic of result.diagnostics) {
    console.error(diagnostic.code, diagnostic.path, diagnostic.message);
  }
} else {
  console.log(result.manifest.parts);
}
```

`characterRigFile` defaults to `character-rig.json`. It is resolved relative to `sourceRoot`; the Rig Layout is resolved relative to the Character Rig file; part images are resolved relative to the Rig Layout file. Lexical traversal and filesystem links outside the source root are rejected.

The package never writes image output and never repairs source contracts or assets. It contains no Cocos Creator types or behavior. See `docs/character-asset-intake.md` and ADR-0005 for the complete validation and decoder rules.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceFile = path.join(
  extensionRoot,
  "source/composable-loadout/canonical-loadout-adapter.ts",
);
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/composable-character-loadout-v2",
);
const runtimeFile = path.join(
  runtimeRoot,
  "canonical-loadout-adapter.ts",
);

await mkdir(runtimeRoot, { recursive: true });
const source = await readFile(sourceFile, "utf8");
const creatorSource = source.replace(
  /from "(\.\.?\/[^"]+)\.js";/gu,
  'from "$1";',
);
await writeFile(
  runtimeFile,
  `// Generated from the tested canonical loadout adapter boundary. Do not hand-edit.\n${creatorSource}`,
);

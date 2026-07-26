import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertExactFlatFileSet } from "./generated-output-closure.mjs";

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

const expectedRuntimeFiles = [
  "canonical-loadout-adapter.ts",
  "composable-character-loadout-reference-v2.ts",
];
await assertExactFlatFileSet(runtimeRoot, expectedRuntimeFiles, {
  include: (file) => file.endsWith(".ts"),
  diagnostic: "TASK_013R7_CANONICAL_GENERATED_OUTPUT_CLOSURE_FAILED",
});

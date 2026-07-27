import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(extensionRoot, "source/task014b");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task014b",
);
const modules = [
  "semantic-vfx-adapter.ts",
  "semantic-vfx-cue-registry.ts",
  "semantic-vfx-diagnostics.ts",
  "semantic-vfx-input-registry.ts",
  "semantic-vfx-reference-contract.ts",
  "semantic-vfx-resource-manifest.ts",
  "semantic-vfx-sorting.ts",
];

await mkdir(runtimeRoot, { recursive: true });
for (const moduleName of modules) {
  const source = await readFile(path.join(sourceRoot, moduleName), "utf8");
  const creatorSource = source.replace(
    /from "(\.\.?\/[^"]+)\.js";/gu,
    'from "$1";',
  );
  await writeFile(
    path.join(runtimeRoot, moduleName),
    `// Generated from the tested TASK-014B semantic VFX adapter boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

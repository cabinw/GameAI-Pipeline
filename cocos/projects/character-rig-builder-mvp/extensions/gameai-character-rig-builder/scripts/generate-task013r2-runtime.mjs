import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(extensionRoot, "source/task013r2");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r2",
);
const modules = [
  "base-rig-contract.ts",
  "base-rig-input-registry.ts",
  "base-rig-resource-manifest.ts",
  "base-rig-state.ts",
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
    `// Generated from the tested TASK-013R2 base-rig bridge boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

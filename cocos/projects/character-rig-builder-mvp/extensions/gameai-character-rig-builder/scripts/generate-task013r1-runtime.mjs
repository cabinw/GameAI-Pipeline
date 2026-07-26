import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(extensionRoot, "source/task013r1");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r1",
);
const modules = [
  "harness-input-registry.ts",
  "harness-lifecycle.ts",
  "harness-resource-manifest.ts",
  "harness-sorting-registry.ts",
  "harness-spatial.ts",
  "harness-state.ts",
];

await mkdir(runtimeRoot, { recursive: true });
for (const moduleName of modules) {
  const source = await readFile(path.join(sourceRoot, moduleName), "utf8");
  await writeFile(
    path.join(runtimeRoot, moduleName),
    `// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.\n${source}`,
  );
}

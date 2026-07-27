import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertExactFlatFileSet } from "./generated-output-closure.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoot = path.join(extensionRoot, "source/task014c");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task014c",
);
const modules = [
  "canonical-semantic-vfx-contract.ts",
  "canonical-semantic-vfx-input-registry.ts",
  "canonical-semantic-vfx-lifecycle.ts",
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
    `// Generated from the tested TASK-014C composition boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

await assertExactFlatFileSet(
  runtimeRoot,
  [...modules, "task014c-canonical-loadout-semantic-vfx.ts"],
  {
    include: (file) => file.endsWith(".ts"),
    diagnostic: "TASK_014C_GENERATED_OUTPUT_CLOSURE_FAILED",
  },
);

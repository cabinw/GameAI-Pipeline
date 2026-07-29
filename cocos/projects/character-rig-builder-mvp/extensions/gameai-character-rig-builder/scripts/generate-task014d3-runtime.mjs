import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAndCompileVfxAuthoring } from "@gameai/vfx-authoring";

import {
  TASK014D3_COMPILE_CONTEXT,
} from "../dist/task014d3/canonical-vfx-authoring-contract.js";
import { assertExactFlatFileSet } from "./generated-output-closure.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task014d3");
const runtimeRoot = path.resolve(extensionRoot, "../../assets/gameai/task014d3");
const authoringPath = path.join(
  repositoryRoot,
  "examples/vfx-cue-authoring/canonical-full-loadout-vfx.json",
);
const modules = [
  "canonical-vfx-semantic-contract.ts",
  "canonical-vfx-runtime-adapter.ts",
  "canonical-vfx-input-registry.ts",
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
    `// Generated from the tested TASK-014D3 composition boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const authoringText = await readFile(authoringPath, "utf8");
const compiled = parseAndCompileVfxAuthoring(
  authoringText,
  TASK014D3_COMPILE_CONTEXT,
);
if (!compiled.ok) {
  throw new Error(
    `TASK_014D3_CANONICAL_AUTHORING_COMPILE_FAILED:${
      JSON.stringify(compiled.errors)
    }`,
  );
}
const sourceHash = createHash("sha256").update(authoringText).digest("hex");
const planHash = createHash("sha256")
  .update(compiled.value.serialized)
  .digest("hex");
await writeFile(
  path.join(runtimeRoot, "render-plan-data.ts"),
  [
    "// Generated from canonical-full-loadout-vfx.json through TASK-014D1. Do not hand-edit.",
    'import type { VfxRenderPlan } from "../task014d2/d1/types";',
    `export const TASK014D3_AUTHORING_SHA256 = "${sourceHash}";`,
    `export const TASK014D3_RENDER_PLAN_SHA256 = "${planHash}";`,
    `export const TASK014D3_RENDER_PLAN = ${
      compiled.value.serialized.trim()
    } as const satisfies VfxRenderPlan;`,
    "",
  ].join("\n"),
);

await assertExactFlatFileSet(
  runtimeRoot,
  [
    ...modules,
    "render-plan-data.ts",
    "task014d3-canonical-loadout-vfx-authoring-integration.ts",
  ],
  {
    include: (file) => file.endsWith(".ts"),
    diagnostic: "TASK_014D3_GENERATED_OUTPUT_CLOSURE_FAILED",
  },
);

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileVfxAuthoring } from "@gameai/vfx-authoring";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task014d2");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task014d2",
);
const d1RuntimeRoot = path.join(runtimeRoot, "d1");
const modules = [
  "cocos-vfx-cleanup-coordinator.ts",
  "cocos-vfx-diagnostics.ts",
  "cocos-vfx-harness-contract.ts",
  "cocos-vfx-render-descriptor.ts",
  "cocos-vfx-runtime-state.ts",
];
const fixtureNames = [
  "footstep-dust.json",
  "hand-trail.json",
  "persistent-aura.json",
  "combined-reference.json",
];
const context = {
  semanticCues: [
    {
      cueId: "combined-reference",
      commandMode: "emit",
      lifecycle: "one-shot",
    },
    {
      cueId: "footstep-dust",
      commandMode: "emit",
      lifecycle: "one-shot",
    },
    {
      cueId: "hand-tool-trail",
      commandMode: "start-stop",
      lifecycle: "looping",
    },
    {
      cueId: "persistent-aura",
      commandMode: "start-stop",
      lifecycle: "persistent",
    },
  ],
  resources: [
    resource("vfx.aura-glow", "textured-sprite", ["sprite-quad"]),
    resource("vfx.aura-ring", "procedural-ring", ["ring"]),
    resource("vfx.dust-soft", "textured-sprite", ["burst-particles"]),
    resource("vfx.ribbon-core", "procedural-ribbon", ["ribbon"]),
    resource("vfx.ring-soft", "procedural-ring", ["ring"]),
    resource("vfx.spark", "textured-sprite", ["burst-particles"]),
  ],
};

function resource(resourceId, recipeKind, compatiblePrimitives) {
  return { resourceId, recipeKind, compatiblePrimitives };
}

await mkdir(d1RuntimeRoot, { recursive: true });
for (const moduleName of modules) {
  const source = await readFile(path.join(sourceRoot, moduleName), "utf8");
  const creatorSource = source
    .replace(/from "(\.\.?\/[^"]+)\.js";/gu, 'from "$1";')
    .replace(
      /from "@gameai\/vfx-authoring";/gu,
      'from "./d1/index";',
    );
  await writeFile(
    path.join(runtimeRoot, moduleName),
    `// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const d1SourceRoot = path.join(repositoryRoot, "pipelines/vfx-authoring/source");
for (const moduleName of ["semantics.ts", "types.ts"]) {
  const source = await readFile(path.join(d1SourceRoot, moduleName), "utf8");
  await writeFile(
    path.join(d1RuntimeRoot, moduleName),
    `// Exact generated TASK-014D1 source mirror. Do not hand-edit.\n${source}`,
  );
}
await writeFile(
  path.join(d1RuntimeRoot, "index.ts"),
  [
    "// Exact generated TASK-014D1 runtime export surface. Do not hand-edit.",
    'export * from "./semantics";',
    'export type * from "./types";',
    "",
  ].join("\n"),
);

const fixtures = await Promise.all(
  fixtureNames.map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(
          repositoryRoot,
          "examples/vfx-cue-authoring",
          name,
        ),
        "utf8",
      ),
    ),
  ),
);
const document = {
  schemaVersion: "1.0.0",
  cues: fixtures.flatMap((fixture) => fixture.cues),
};
const compiled = compileVfxAuthoring(document, context);
if (!compiled.ok) {
  throw new Error(
    `TASK-014D2 fixture compilation failed: ${JSON.stringify(compiled.errors)}`,
  );
}
await writeFile(
  path.join(runtimeRoot, "render-plan-data.ts"),
  [
    "// Generated from all four accepted TASK-014D1 fixtures. Do not hand-edit.",
    'import type { VfxRenderPlan } from "./d1/types";',
    `export const TASK014D2_RENDER_PLAN = ${compiled.value.serialized.trim()} as const satisfies VfxRenderPlan;`,
    "",
  ].join("\n"),
);

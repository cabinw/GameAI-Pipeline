import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosProductionLiteCharacterPlan } from "../dist/production-lite-character-adapter.js";
import { buildSingleAttachmentBridgePlan } from "../dist/task013r3/single-attachment-contract.js";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task013r3");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r3",
);
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const attachmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const modules = [
  "single-attachment-input-registry.ts",
  "single-attachment-resource-manifest.ts",
  "single-attachment-runtime-contract.ts",
  "single-attachment-spatial.ts",
  "single-attachment-state.ts",
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
    `// Generated from the tested TASK-013R3 single-attachment boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const rigLayout = JSON.parse(
  await readFile(path.join(baseFixtureRoot, "rig-layout.json"), "utf8"),
);
const attachmentLayout = JSON.parse(
  await readFile(
    path.join(attachmentFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const clips = await Promise.all(
  ["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(baseFixtureRoot, `animations/${name}.json`),
        "utf8",
      ),
    ),
  ),
);
const baseDimensions = Object.fromEntries(
  await Promise.all(
    rigLayout.parts.map(async (part) => {
      const metadata = await sharp(
        path.join(baseFixtureRoot, part.file),
      ).metadata();
      return [
        part.partId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const basePlan = buildCocosProductionLiteCharacterPlan(
  rigLayout,
  clips,
  baseDimensions,
);
const selectedAttachmentId = "sunglasses";
const attachmentMetadata = await sharp(
  path.join(
    attachmentFixtureRoot,
    attachmentLayout.attachments.find(
      (attachment) => attachment.attachmentId === selectedAttachmentId,
    ).file,
  ),
).metadata();
const plan = buildSingleAttachmentBridgePlan(
  basePlan,
  rigLayout,
  attachmentLayout,
  selectedAttachmentId,
  {
    width: attachmentMetadata.width,
    height: attachmentMetadata.height,
  },
);
await writeFile(
  path.join(runtimeRoot, "single-attachment-plan-data.ts"),
  [
    "// Generated from tracked engine-neutral rig, animation, and attachment contracts. Do not hand-edit.",
    'import type { SingleAttachmentBridgePlan } from "./single-attachment-runtime-contract";',
    "",
    `export const SINGLE_ATTACHMENT_BRIDGE_PLAN = ${JSON.stringify(plan, null, 2)} as unknown as SingleAttachmentBridgePlan;`,
    "",
  ].join("\n"),
);

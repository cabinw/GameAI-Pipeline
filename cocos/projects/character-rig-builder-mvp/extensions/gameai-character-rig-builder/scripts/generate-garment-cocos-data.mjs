import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosGarmentLayeringPlan } from "../dist/garment-layering-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const accessoryRoot = path.join(
  repositoryRoot,
  "examples/production-lite-head-accessories",
);
const garmentRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/garment-layering",
);
const json = async (root, file) =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));
const rig = await json(baseRoot, "rig-layout.json");
const attachments = await json(garmentRoot, "attachment-layout.json");
const clips = await Promise.all([
  ...["rest-idle", "arm-wave", "walk-cycle", "articulation-stress"].map((name) =>
    json(baseRoot, `animations/${name}.json`),
  ),
  json(accessoryRoot, "animations/head-accessory-stress.json"),
  json(garmentRoot, "animations/garment-stress.json"),
]);
const baseDimensions = Object.fromEntries(
  await Promise.all(
    rig.parts.map(async (part) => {
      const metadata = await sharp(path.join(baseRoot, part.file)).metadata();
      return [part.partId, { width: metadata.width, height: metadata.height }];
    }),
  ),
);
const attachmentDimensions = Object.fromEntries(
  await Promise.all(
    attachments.attachments.map(async (attachment) => {
      const metadata = await sharp(path.join(garmentRoot, attachment.file)).metadata();
      return [
        attachment.attachmentId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const plan = buildCocosGarmentLayeringPlan(
  rig,
  attachments,
  clips,
  baseDimensions,
  attachmentDimensions,
);
await mkdir(runtimeRoot, { recursive: true });
await writeFile(
  path.join(runtimeRoot, "garment-layering-data.ts"),
  `// Generated from TASK-009 through TASK-011 contracts. Do not hand-edit.\nexport const GARMENT_LAYERING_PLAN = ${JSON.stringify(plan, null, 2)} as const;\n`,
);

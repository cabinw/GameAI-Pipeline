import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosOneHandedPropPlan } from "../dist/one-handed-prop-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const propRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/one-handed-prop",
);
const json = async (root, file) =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));
const rig = await json(propRoot, "rig-layout.json");
const attachments = await json(propRoot, "attachment-layout.json");
const clips = await Promise.all(
  ["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map((name) =>
    json(propRoot, `animations/${name}.json`),
  ),
);
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
      const metadata = await sharp(path.join(propRoot, attachment.file)).metadata();
      return [
        attachment.attachmentId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const plan = buildCocosOneHandedPropPlan(
  rig,
  attachments,
  clips,
  baseDimensions,
  attachmentDimensions,
);
await mkdir(runtimeRoot, { recursive: true });
await writeFile(
  path.join(runtimeRoot, "one-handed-prop-data.ts"),
  `// Generated from TASK-009 and TASK-012 contracts. Do not hand-edit.\nexport const ONE_HANDED_PROP_PLAN = ${JSON.stringify(plan, null, 2)} as const;\n`,
);

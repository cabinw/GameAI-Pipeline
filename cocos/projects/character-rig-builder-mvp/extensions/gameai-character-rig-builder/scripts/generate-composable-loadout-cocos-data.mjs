import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { buildCocosComposableCharacterLoadoutPlan } from "../dist/composable-character-loadout-adapter.js";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const runtimeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/composable-loadout",
);
const json = async (file) =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
const source = await json("source/full-loadout-source.json");
const rig = await json("rig-layout.json");
const serialized = await json("loadout-contract.json");
const contract = {
  ...serialized,
  families: await Promise.all(
    serialized.families.map(async (family) => ({
      familyId: family.familyId,
      attachmentLayout: await json(family.attachmentLayoutFile),
    })),
  ),
};
const clips = await Promise.all(
  ["rest", "walk", "wave", "prop-swing", "integration-stress"].map((name) =>
    json(`animations/${name}.json`),
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
const attachments = contract.families.flatMap(
  (family) => family.attachmentLayout.attachments,
);
const attachmentDimensions = Object.fromEntries(
  await Promise.all(
    attachments.map(async (attachment) => {
      const metadata = await sharp(
        path.join(fixtureRoot, attachment.file),
      ).metadata();
      return [
        attachment.attachmentId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const plan = buildCocosComposableCharacterLoadoutPlan(
  rig,
  contract,
  clips,
  baseDimensions,
  attachmentDimensions,
  "production-lite-full-loadout",
  source.exactRestStateIds,
);
const controls = await readFile(
  path.join(extensionRoot, "source/composable-character-loadout-controls.ts"),
  "utf8",
);
await mkdir(runtimeRoot, { recursive: true });
await writeFile(
  path.join(runtimeRoot, "composable-loadout-data.ts"),
  `// Generated from the engine-neutral TASK-013 resolved character. Do not hand-edit.\nexport const COMPOSABLE_LOADOUT_PLAN = ${JSON.stringify(plan, null, 2)} as const;\n`,
);
await writeFile(
  path.join(runtimeRoot, "composable-loadout-controls.ts"),
  `// Generated from the tested semantic control resolver. Do not hand-edit.\n${controls}`,
);

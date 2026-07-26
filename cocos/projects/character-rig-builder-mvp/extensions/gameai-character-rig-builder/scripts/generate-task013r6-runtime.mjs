import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { resolveCharacterLoadout } from "@gameai/character-contracts";

import { buildCocosProductionLiteCharacterPlan } from "../dist/production-lite-character-adapter.js";
import { buildGarmentBridgePlan } from "../dist/task013r5/garment-bridge-contract.js";
import { buildPropBridgePlan } from "../dist/task013r6/prop-bridge-contract.js";
import {
  PROP_NO_PROP_STATE_ID,
} from "../dist/task013r6/prop-bridge-runtime-contract.js";
import { assertExactFlatFileSet } from "./generated-output-closure.mjs";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(extensionRoot, "../../../../..");
const sourceRoot = path.join(extensionRoot, "source/task013r6");
const runtimeRoot = path.resolve(
  extensionRoot,
  "../../assets/gameai/task013r6",
);
const baseFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-character",
);
const garmentFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-garment-layering",
);
const propFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const fullLoadoutFixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const modules = [
  "prop-bridge-runtime-contract.ts",
  "prop-input-registry.ts",
  "prop-resource-manifest.ts",
  "runtime-readiness.ts",
  "prop-spatial.ts",
  "prop-state.ts",
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
    `// Generated from the tested TASK-013R6 prop boundary. Do not hand-edit.\n${creatorSource}`,
  );
}

const rigLayout = JSON.parse(
  await readFile(path.join(propFixtureRoot, "rig-layout.json"), "utf8"),
);
const garmentLayout = JSON.parse(
  await readFile(
    path.join(garmentFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const propLayout = JSON.parse(
  await readFile(
    path.join(propFixtureRoot, "attachment-layout.json"),
    "utf8",
  ),
);
const clips = await Promise.all([
  ...["rest-idle", "arm-wave", "articulation-stress"].map(async (name) =>
    JSON.parse(
      await readFile(
        path.join(baseFixtureRoot, `animations/${name}.json`),
        "utf8",
      ),
    ),
  ),
  JSON.parse(
    await readFile(
      path.join(propFixtureRoot, "animations/prop-swing.json"),
      "utf8",
    ),
  ),
]);
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
const garmentDimensions = Object.fromEntries(
  await Promise.all(
    garmentLayout.attachments.map(async (attachment) => {
      const metadata = await sharp(
        path.join(garmentFixtureRoot, attachment.file),
      ).metadata();
      return [
        attachment.attachmentId,
        { width: metadata.width, height: metadata.height },
      ];
    }),
  ),
);
const propDimensions = Object.fromEntries(
  await Promise.all(
    propLayout.attachments.map(async (attachment) => {
      const metadata = await sharp(
        path.join(propFixtureRoot, attachment.file),
      ).metadata();
      return [
        attachment.attachmentId,
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
const serializedLoadout = JSON.parse(
  await readFile(
    path.join(fullLoadoutFixtureRoot, "loadout-contract.json"),
    "utf8",
  ),
);
const engineNeutralContract = {
  ...serializedLoadout,
  families: await Promise.all(
    serializedLoadout.families.map(async (family) => ({
      familyId: family.familyId,
      attachmentLayout: JSON.parse(
        await readFile(
          path.join(
            fullLoadoutFixtureRoot,
            family.attachmentLayoutFile,
          ),
          "utf8",
        ),
      ),
    })),
  ),
};
const garmentStateId = (enabledFamilyIds) => {
  const garment = enabledFamilyIds.includes("garment");
  const accessories = enabledFamilyIds.includes("accessories");
  if (garment && accessories) return "garment-and-accessories";
  if (garment) return "garment-only";
  if (accessories) return "accessories-only";
  return "base-only";
};
const garmentHudLabel = Object.freeze({
  "base-only": "Base Only",
  "garment-only": "Garment Only",
  "accessories-only": "Accessories Only",
  "garment-and-accessories": "Garment + Accessories",
});
const resolvedLoadoutStates = engineNeutralContract.states.map((state) => {
  const resolved = resolveCharacterLoadout(
    rigLayout,
    engineNeutralContract,
    state.stateId,
  );
  const garmentState = garmentStateId(state.enabledFamilyIds);
  const propStateId = state.propStateId ?? PROP_NO_PROP_STATE_ID;
  const propLabel =
    propStateId === "no-prop"
      ? "No Prop"
      : propStateId === "left-hand-prop"
        ? "Left Prop"
        : "Right Prop";
  return Object.freeze({
    stateId: state.stateId,
    garmentStateId: garmentState,
    propStateId,
    hudLabel: `${garmentHudLabel[garmentState]} / ${propLabel}`,
    enabledAttachmentIds: Object.freeze(
      resolved.enabledAttachments
        .map((attachment) => attachment.attachmentId)
        .sort(),
    ),
  });
});
const stateDefinitions = Object.freeze(
  resolvedLoadoutStates
    .filter((state) => state.propStateId === PROP_NO_PROP_STATE_ID)
    .map((state) => {
      const garmentEnabled = state.garmentStateId.includes("garment");
      const accessoriesEnabled =
        state.garmentStateId.includes("accessories");
      return Object.freeze({
        stateId: state.garmentStateId,
        hudLabel: garmentHudLabel[state.garmentStateId],
        garmentEnabled,
        accessoriesEnabled,
        slotEnabled: Object.freeze({
          headwear: accessoriesEnabled,
          "face-accessory": accessoriesEnabled,
        }),
        wearableSetEnabled: Object.freeze({
          "casual-jacket": garmentEnabled,
        }),
      });
    }),
);
const garmentPlan = buildGarmentBridgePlan(
  basePlan,
  rigLayout,
  garmentLayout,
  stateDefinitions,
  baseDimensions,
  garmentDimensions,
);
const plan = buildPropBridgePlan(
  garmentPlan,
  rigLayout,
  propLayout,
  propDimensions,
  "production-lite-one-handed-prop",
  resolvedLoadoutStates,
);
const provenanceInputFiles = [
  fileURLToPath(import.meta.url),
  path.join(propFixtureRoot, "rig-layout.json"),
  path.join(garmentFixtureRoot, "attachment-layout.json"),
  path.join(propFixtureRoot, "attachment-layout.json"),
  path.join(fullLoadoutFixtureRoot, "loadout-contract.json"),
  ...serializedLoadout.families.map((family) =>
    path.join(fullLoadoutFixtureRoot, family.attachmentLayoutFile),
  ),
  ...["rest-idle", "arm-wave", "articulation-stress"].map((name) =>
    path.join(baseFixtureRoot, `animations/${name}.json`),
  ),
  path.join(propFixtureRoot, "animations/prop-swing.json"),
  ...rigLayout.parts.map((part) =>
    path.join(baseFixtureRoot, part.file),
  ),
  ...garmentLayout.attachments.map((attachment) =>
    path.join(garmentFixtureRoot, attachment.file),
  ),
  ...propLayout.attachments.map((attachment) =>
    path.join(propFixtureRoot, attachment.file),
  ),
];
const provenance = {
  generatorVersion: "2.0.0",
  inputs: await Promise.all(
    [...new Set(provenanceInputFiles)].sort().map(async (file) => ({
      path: path.relative(repositoryRoot, file).replaceAll(path.sep, "/"),
      sha256: createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    })),
  ),
};
await writeFile(
  path.join(runtimeRoot, "prop-bridge-plan-data.ts"),
  [
    "// Generated from tracked engine-neutral rig, animation, garment, accessory, prop, socket, and grip contracts. Do not hand-edit.",
    'import type { PropBridgePlan } from "./prop-bridge-runtime-contract";',
    "",
    `export const PROP_BRIDGE_PLAN_PROVENANCE = ${JSON.stringify(provenance, null, 2)} as const;`,
    "",
    `export const PROP_BRIDGE_PLAN = ${JSON.stringify(plan, null, 2)} as unknown as PropBridgePlan;`,
    "",
  ].join("\n"),
);

const expectedRuntimeFiles = [
  ...modules,
  "prop-bridge-plan-data.ts",
  "prop-runtime-builder.ts",
  "task013r6-one-handed-prop-integration.ts",
].sort();
await assertExactFlatFileSet(runtimeRoot, expectedRuntimeFiles, {
  include: (file) => file.endsWith(".ts"),
  diagnostic: "TASK_013R7_R6_GENERATED_OUTPUT_CLOSURE_FAILED",
});

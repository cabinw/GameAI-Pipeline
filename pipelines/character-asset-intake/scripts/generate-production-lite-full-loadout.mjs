import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseAttachmentLayout,
  resolveCharacterLoadout,
} from "@gameai/character-contracts";
import sharp from "sharp";

import { reconstructAttachmentVariant } from "../dist/index.js";
import { atomicWriteFile } from "../../../cocos/projects/character-rig-builder-mvp/extensions/gameai-character-rig-builder/scripts/atomic-write.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`MISSING_OPTION_VALUE:${name}`);
  }
  return path.resolve(value);
};
const inputExamplesRoot = option(
  "--input-examples-root",
  path.join(repositoryRoot, "examples"),
);
const sourceFixtureRoot = path.join(inputExamplesRoot, "production-lite-full-loadout");
const fixtureRoot = option("--fixture-output-root", sourceFixtureRoot);
const sourceFile = path.join(
  sourceFixtureRoot,
  "source/full-loadout-source.json",
);
const source = JSON.parse(await readFile(sourceFile, "utf8"));
const sourceDirectory = path.dirname(sourceFile);
const baseRoot = option(
  "--base-asset-root",
  path.resolve(sourceDirectory, source.baseFixture),
);
const rigLayout = JSON.parse(
  await readFile(path.resolve(sourceDirectory, source.rigSource), "utf8"),
);
const cocosRoot = option(
  "--cocos-output-root",
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-full-loadout",
  ),
);
const outputRoots = [fixtureRoot, cocosRoot];
const generatorFile = fileURLToPath(import.meta.url);
const generatorVersion = "2.0.0";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const loadedSources = new Map();
const families = [];
const attachmentOrigin = new Map();
for (const familySource of [...source.familySources].sort((a, b) =>
  a.familyId.localeCompare(b.familyId),
)) {
  const file = path.resolve(sourceDirectory, familySource.attachmentLayoutFile);
  let layout = loadedSources.get(file);
  if (layout === undefined) {
    layout = JSON.parse(await readFile(file, "utf8"));
    loadedSources.set(file, layout);
  }
  const selected = layout.attachments.filter(
    (attachment) =>
      (familySource.attachmentIds?.includes(attachment.attachmentId) ?? false) ||
      (familySource.wearableSetIds?.includes(attachment.wearableSetId) ?? false) ||
      (familySource.attachmentKinds?.includes(attachment.attachmentKind) ?? false),
  );
  const slotIds = new Set(selected.map((attachment) => attachment.slotId));
  const wearableSetIds = new Set(
    selected.flatMap((attachment) =>
      attachment.wearableSetId === undefined ? [] : [attachment.wearableSetId],
    ),
  );
  const propStateIds = new Set(
    selected.flatMap((attachment) =>
      attachment.propStateId === undefined ? [] : [attachment.propStateId],
    ),
  );
  const attachmentIds = new Set(selected.map((attachment) => attachment.attachmentId));
  const familyLayout = {
    schemaVersion: layout.schemaVersion,
    attachmentLayoutId: `${source.loadoutId}-${familySource.familyId}`,
    rig: layout.rig,
    slots: layout.slots.filter((slot) => slotIds.has(slot.slotId)),
    attachments: selected,
    ...(wearableSetIds.size === 0
      ? {}
      : {
          wearableSets: (layout.wearableSets ?? []).filter((set) =>
            wearableSetIds.has(set.wearableSetId),
          ),
        }),
    ...(propStateIds.size === 0
      ? {}
      : {
          propStates: (layout.propStates ?? []).filter((state) =>
            propStateIds.has(state.propStateId),
          ),
        }),
    ...(
      (layout.seams ?? []).filter(
        (seam) =>
          (attachmentIds.has(seam.firstItemId) ||
            rigLayout.parts.some((part) => part.partId === seam.firstItemId)) &&
          (attachmentIds.has(seam.secondItemId) ||
            rigLayout.parts.some((part) => part.partId === seam.secondItemId)),
      ).length === 0
        ? {}
        : {
            seams: layout.seams.filter(
              (seam) =>
                (attachmentIds.has(seam.firstItemId) ||
                  rigLayout.parts.some((part) => part.partId === seam.firstItemId)) &&
                (attachmentIds.has(seam.secondItemId) ||
                  rigLayout.parts.some((part) => part.partId === seam.secondItemId)),
            ),
          }
    ),
  };
  const parsed = parseAttachmentLayout(JSON.stringify(familyLayout), rigLayout);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  families.push({ familyId: familySource.familyId, attachmentLayout: parsed.value });
  for (const attachment of selected) {
    attachmentOrigin.set(attachment.attachmentId, path.dirname(file));
  }
}

const contract = {
  schemaVersion: source.schemaVersion,
  loadoutId: source.loadoutId,
  rig: {
    layoutId: rigLayout.layoutId,
    schemaVersion: rigLayout.schemaVersion,
  },
  families,
  states: source.states,
  exclusiveGroups: source.exclusiveGroups,
  requiredSemanticClipIds: source.requiredSemanticClipIds,
};

const combinedLayout = {
  schemaVersion: "1.0.0",
  attachmentLayoutId: `${source.loadoutId}-resolved`,
  rig: contract.rig,
  slots: families.flatMap((family) => family.attachmentLayout.slots),
  attachments: families.flatMap((family) => family.attachmentLayout.attachments),
  wearableSets: families.flatMap(
    (family) => family.attachmentLayout.wearableSets ?? [],
  ),
  propStates: families.flatMap(
    (family) => family.attachmentLayout.propStates ?? [],
  ),
  seams: families.flatMap((family) => family.attachmentLayout.seams ?? []),
};
const parsedCombined = parseAttachmentLayout(
  JSON.stringify(combinedLayout),
  rigLayout,
);
if (!parsedCombined.ok) throw new Error(JSON.stringify(parsedCombined.errors));

const serializedContract = {
  schemaVersion: contract.schemaVersion,
  loadoutId: contract.loadoutId,
  rig: contract.rig,
  families: families.map((family) => ({
    familyId: family.familyId,
    attachmentLayoutFile: `families/${family.familyId}.attachment-layout.json`,
  })),
  states: contract.states,
  exclusiveGroups: contract.exclusiveGroups,
  requiredSemanticClipIds: contract.requiredSemanticClipIds,
};

const animationSources = [
  ["rest.json", "production-lite-character/animations/rest-idle.json", "production-lite-full-loadout-rest"],
  ["walk.json", "production-lite-one-handed-prop/animations/prop-walk.json", "production-lite-full-loadout-walk"],
  ["wave.json", "production-lite-character/animations/arm-wave.json", "production-lite-full-loadout-wave"],
  ["prop-swing.json", "production-lite-one-handed-prop/animations/prop-swing.json", "production-lite-full-loadout-prop-swing"],
];
const clips = [];
for (const [fileName, relativeSource, animationId] of animationSources) {
  const clip = JSON.parse(
    await readFile(path.join(inputExamplesRoot, relativeSource), "utf8"),
  );
  clips.push([fileName, { ...clip, animationId }]);
}
const garmentStress = JSON.parse(
  await readFile(
    path.join(
      inputExamplesRoot,
      "production-lite-garment-layering/animations/garment-stress.json",
    ),
    "utf8",
  ),
);
const propStress = JSON.parse(
  await readFile(
    path.join(
      inputExamplesRoot,
      "production-lite-one-handed-prop/animations/prop-stress.json",
    ),
    "utf8",
  ),
);
const stressTracks = new Map();
for (const track of garmentStress.tracks) {
  const keyframes = [...track.keyframes];
  if (keyframes.at(-1)?.time !== propStress.duration) {
    keyframes.push({
      time: propStress.duration,
      value: structuredClone(keyframes[0].value),
      interpolation: keyframes[0].interpolation,
      easing: keyframes[0].easing,
    });
  }
  stressTracks.set(track.jointId, { ...track, keyframes });
}
for (const track of propStress.tracks) {
  stressTracks.set(track.jointId, track);
}
clips.push([
  "integration-stress.json",
  {
    ...propStress,
    animationId: "production-lite-full-loadout-integration-stress",
    tracks: [...stressTracks.values()].sort((a, b) =>
      a.jointId.localeCompare(b.jointId),
    ),
  },
]);

for (const root of outputRoots) {
  await mkdir(path.join(root, "attachments"), { recursive: true });
  await mkdir(path.join(root, "animations"), { recursive: true });
  await mkdir(path.join(root, "families"), { recursive: true });
  await mkdir(path.join(root, "reference"), { recursive: true });
  await mkdir(path.join(root, "resolved"), { recursive: true });
  await atomicWriteFile(path.join(root, "rig-layout.json"), json(rigLayout));
  await atomicWriteFile(
    path.join(root, "loadout-contract.json"),
    json(serializedContract),
  );
  await atomicWriteFile(
    path.join(root, "attachment-layout.json"),
    json(parsedCombined.value),
  );
  for (const family of families) {
    await atomicWriteFile(
      path.join(root, `families/${family.familyId}.attachment-layout.json`),
      json(family.attachmentLayout),
    );
  }
  for (const [fileName, clip] of clips) {
    await atomicWriteFile(path.join(root, `animations/${fileName}`), json(clip));
  }
}

for (const attachment of parsedCombined.value.attachments) {
  const origin = attachmentOrigin.get(attachment.attachmentId);
  if (origin === undefined) throw new Error(`ATTACHMENT_ORIGIN_MISSING:${attachment.attachmentId}`);
  const bytes = await readFile(path.join(origin, attachment.file));
  for (const root of outputRoots) {
    await atomicWriteFile(path.join(root, attachment.file), bytes);
  }
}

const transparentReference = await sharp({
  create: {
    width: rigLayout.sourceCanvas.width,
    height: rigLayout.sourceCanvas.height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
}).png().toBuffer();
const familySlotIds = new Map(
  families.map((family) => [
    family.familyId,
    family.attachmentLayout.slots.map((slot) => slot.slotId),
  ]),
);
const reports = {};
for (const preset of source.exactRestPresets) {
  const { outputId, stateId } = preset;
  const state = source.states.find((candidate) => candidate.stateId === stateId);
  if (state === undefined) throw new Error(`EXACT_REST_STATE_MISSING:${stateId}`);
  const resolved = resolveCharacterLoadout(rigLayout, contract, stateId);
  const enabledFamilies = new Set(state.enabledFamilyIds);
  const slotOverrides = Object.fromEntries(
    [...familySlotIds].flatMap(([familyId, slotIds]) =>
      slotIds.map((slotId) => [slotId, enabledFamilies.has(familyId)]),
    ),
  );
  const propStateOverrides = Object.fromEntries(
    (parsedCombined.value.propStates ?? []).map((propState) => [
      propState.propStateId,
      propState.propStateId === state.propStateId,
    ]),
  );
  const authored = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    rigLayout,
    parsedCombined.value,
    slotOverrides,
    transparentReference,
    {
      rgbaMismatchPixels: Number.MAX_SAFE_INTEGER,
      alphaMismatchPixels: Number.MAX_SAFE_INTEGER,
      seamMismatchPixels: Number.MAX_SAFE_INTEGER,
      boundsExpansionPixels: Number.MAX_SAFE_INTEGER,
    },
    {},
    propStateOverrides,
  );
  const exact = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    rigLayout,
    parsedCombined.value,
    slotOverrides,
    authored.reconstructed,
    undefined,
    {},
    propStateOverrides,
  );
  if (exact.metrics.status !== "passed") {
    throw new Error(`${stateId}:${JSON.stringify(exact.metrics)}`);
  }
  reports[outputId] = exact.metrics;
  for (const root of outputRoots) {
    await atomicWriteFile(
      path.join(root, `reference/${outputId}.png`),
      authored.reconstructed,
    );
    await atomicWriteFile(
      path.join(root, `reference/${outputId}-reconstructed.png`),
      exact.reconstructed,
    );
    await atomicWriteFile(
      path.join(root, `reference/${outputId}-diff.png`),
      exact.comparison,
    );
    await atomicWriteFile(
      path.join(root, `reference/${outputId}-report.json`),
      json(exact.metrics),
    );
    await atomicWriteFile(
      path.join(root, `resolved/${outputId}.json`),
      json(resolved),
    );
  }
}

const provenancePath = (file) => {
  const relativeInput = path.relative(inputExamplesRoot, file);
  if (
    relativeInput !== ".." &&
    !relativeInput.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativeInput)
  ) {
    return `examples/${relativeInput.replaceAll(path.sep, "/")}`;
  }
  return path.relative(repositoryRoot, file).replaceAll(path.sep, "/");
};
const provenanceInputs = [
  generatorFile,
  sourceFile,
  path.resolve(sourceDirectory, source.rigSource),
  ...loadedSources.keys(),
  path.join(baseRoot, "source/character-source.json"),
  ...animationSources.map(([, relativeSource]) =>
    path.join(inputExamplesRoot, relativeSource),
  ),
  path.join(
    inputExamplesRoot,
    "production-lite-garment-layering/animations/garment-stress.json",
  ),
  path.join(
    inputExamplesRoot,
    "production-lite-one-handed-prop/animations/prop-stress.json",
  ),
  ...parsedCombined.value.attachments.map((attachment) =>
    path.join(attachmentOrigin.get(attachment.attachmentId), attachment.file),
  ),
]
  .filter((file, index, files) => files.indexOf(file) === index)
  .map((file) => ({ file, path: provenancePath(file) }))
  .sort((left, right) => left.path.localeCompare(right.path));
const provenance = {
  schemaVersion: "1.0.0",
  taskId: "TASK-013",
  source: "source/full-loadout-source.json",
  generator:
    "pipelines/character-asset-intake/scripts/generate-production-lite-full-loadout.mjs",
  generatorVersion,
  sourceDigest: createHash("sha256")
    .update(await readFile(sourceFile))
    .digest("hex"),
  exactRestPresets: source.exactRestPresets,
  inputs: await Promise.all(
    provenanceInputs.map(async ({ file, path: inputPath }) => ({
        path: inputPath,
        sha256: createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      })),
  ),
  tolerances: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    seamMismatchPixels: 0,
    boundsExpansionPixels: 0,
  },
};
for (const root of outputRoots) {
  await atomicWriteFile(
    path.join(root, "reference/authoring-provenance.json"),
    json(provenance),
  );
  await atomicWriteFile(
    path.join(root, "reference/reconstruction-summary.json"),
    json(reports),
  );
}

console.log("TASK-013 full loadout: 8 exact Rest references generated");

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseAttachmentLayout,
  resolveCharacterLoadout,
} from "@gameai/character-contracts";
import sharp from "sharp";

import { reconstructAttachmentVariant } from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const sourceFile = path.join(fixtureRoot, "source/full-loadout-source.json");
const source = JSON.parse(await readFile(sourceFile, "utf8"));
const sourceDirectory = path.dirname(sourceFile);
const baseRoot = path.resolve(sourceDirectory, source.baseFixture);
const rigLayout = JSON.parse(
  await readFile(path.resolve(sourceDirectory, source.rigSource), "utf8"),
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-full-loadout",
);
const outputRoots = [fixtureRoot, cocosRoot];
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
    await readFile(path.join(repositoryRoot, "examples", relativeSource), "utf8"),
  );
  clips.push([fileName, { ...clip, animationId }]);
}
const garmentStress = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-garment-layering/animations/garment-stress.json",
    ),
    "utf8",
  ),
);
const propStress = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-one-handed-prop/animations/prop-stress.json",
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
  await writeFile(path.join(root, "rig-layout.json"), json(rigLayout));
  await writeFile(path.join(root, "loadout-contract.json"), json(serializedContract));
  await writeFile(
    path.join(root, "attachment-layout.json"),
    json(parsedCombined.value),
  );
  for (const family of families) {
    await writeFile(
      path.join(root, `families/${family.familyId}.attachment-layout.json`),
      json(family.attachmentLayout),
    );
  }
  for (const [fileName, clip] of clips) {
    await writeFile(path.join(root, `animations/${fileName}`), json(clip));
  }
}

for (const attachment of parsedCombined.value.attachments) {
  const origin = attachmentOrigin.get(attachment.attachmentId);
  if (origin === undefined) throw new Error(`ATTACHMENT_ORIGIN_MISSING:${attachment.attachmentId}`);
  for (const root of outputRoots) {
    await copyFile(
      path.join(origin, attachment.file),
      path.join(root, attachment.file),
    );
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
for (const stateId of source.exactRestStateIds) {
  const state = source.states.find((candidate) => candidate.stateId === stateId);
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
  reports[stateId] = exact.metrics;
  for (const root of outputRoots) {
    await writeFile(path.join(root, `reference/${stateId}.png`), authored.reconstructed);
    await writeFile(
      path.join(root, `reference/${stateId}-reconstructed.png`),
      exact.reconstructed,
    );
    await writeFile(path.join(root, `reference/${stateId}-diff.png`), exact.comparison);
    await writeFile(
      path.join(root, `reference/${stateId}-report.json`),
      json(exact.metrics),
    );
    await writeFile(
      path.join(root, `resolved/${stateId}.json`),
      json(resolved),
    );
  }
}

const provenance = {
  schemaVersion: "1.0.0",
  taskId: "TASK-013",
  source: "source/full-loadout-source.json",
  generator:
    "pipelines/character-asset-intake/scripts/generate-production-lite-full-loadout.mjs",
  sourceDigest: createHash("sha256")
    .update(await readFile(sourceFile))
    .digest("hex"),
  exactRestStateIds: source.exactRestStateIds,
  tolerances: {
    rgbaMismatchPixels: 0,
    alphaMismatchPixels: 0,
    seamMismatchPixels: 0,
    boundsExpansionPixels: 0,
  },
};
for (const root of outputRoots) {
  await writeFile(
    path.join(root, "reference/authoring-provenance.json"),
    json(provenance),
  );
  await writeFile(
    path.join(root, "reference/reconstruction-summary.json"),
    json(reports),
  );
}

console.log("TASK-013 full loadout: 8 exact Rest references generated");

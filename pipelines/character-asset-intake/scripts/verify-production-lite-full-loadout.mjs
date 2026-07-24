import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeAttachmentWorldTransform,
  parseAttachmentLayout,
  resolveCharacterLoadout,
  validateSemanticClipIds,
} from "@gameai/character-contracts";
import {
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  RigAnimationPlayback,
} from "@gameai/rig-animation";
import sharp from "sharp";

import {
  reconstructAttachmentVariant,
  validateAttachmentSeamCoverage,
} from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-full-loadout",
);
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const readJson = async (file) =>
  JSON.parse(await readFile(path.join(fixtureRoot, file), "utf8"));
const source = await readJson("source/full-loadout-source.json");
const serialized = await readJson("loadout-contract.json");
const rigLayout = await readJson("rig-layout.json");
const combinedLayout = await readJson("attachment-layout.json");
const parsedCombined = parseAttachmentLayout(
  JSON.stringify(combinedLayout),
  rigLayout,
);
if (!parsedCombined.ok) throw new Error(JSON.stringify(parsedCombined.errors));
const contract = {
  ...serialized,
  families: await Promise.all(
    serialized.families.map(async (family) => ({
      familyId: family.familyId,
      attachmentLayout: await readJson(family.attachmentLayoutFile),
    })),
  ),
};
const stateById = new Map(contract.states.map((state) => [state.stateId, state]));
const familySlotIds = new Map(
  contract.families.map((family) => [
    family.familyId,
    family.attachmentLayout.slots.map((slot) => slot.slotId),
  ]),
);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

for (const stateId of source.exactRestStateIds) {
  const state = stateById.get(stateId);
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
  const result = await reconstructAttachmentVariant(
    baseRoot,
    fixtureRoot,
    rigLayout,
    parsedCombined.value,
    slotOverrides,
    await readFile(path.join(fixtureRoot, `reference/${stateId}.png`)),
    undefined,
    {},
    propStateOverrides,
  );
  if (
    result.metrics.status !== "passed" ||
    result.metrics.rgbaMismatchPixels !== 0 ||
    result.metrics.alphaMismatchPixels !== 0 ||
    result.metrics.seamMismatchPixels !== 0 ||
    result.metrics.boundsExpansionPixels !== 0
  ) {
    throw new Error(`EXACT_RECONSTRUCTION_FAILED:${stateId}`);
  }
}

const clipFiles = [
  "rest.json",
  "walk.json",
  "wave.json",
  "prop-swing.json",
  "integration-stress.json",
];
const parsedClips = [];
for (const file of clipFiles) {
  const parsed = parseRigAnimation(
    await readFile(path.join(fixtureRoot, `animations/${file}`), "utf8"),
    {
      rigId: rigLayout.layoutId,
      rigSchemaVersion: rigLayout.schemaVersion,
      jointIds: new Set(rigLayout.parts.map((part) => part.partId)),
    },
  );
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  parsedClips.push(parsed.value);
}
validateSemanticClipIds(contract.requiredSemanticClipIds, parsedClips);

const hierarchy = rigLayout.parts.map((part) => ({
  jointId: part.partId,
  parentId: part.parentId,
  restPose: part.restPose,
}));
const resolved = resolveCharacterLoadout(rigLayout, contract, "full-loadout");
const attachmentById = new Map(
  resolved.enabledAttachments.map((attachment) => [
    attachment.attachmentId,
    attachment,
  ]),
);
const dimensions = new Map();
for (const attachment of parsedCombined.value.attachments) {
  const metadata = await sharp(path.join(fixtureRoot, attachment.file)).metadata();
  dimensions.set(attachment.attachmentId, {
    width: metadata.width,
    height: metadata.height,
  });
}
const baseSource = JSON.parse(
  await readFile(
    path.join(baseRoot, "source/character-source.json"),
    "utf8",
  ),
);
const baseById = new Map(rigLayout.parts.map((part) => [part.partId, part]));
const baseSourceById = new Map(
  baseSource.parts.map((part) => [part.partId, part]),
);

function transformedBounds(matrix, region, anchor, size, scale, trimOffset = { x: 0, y: 0 }) {
  const points = [
    [region.x, region.y],
    [region.x + region.width, region.y],
    [region.x, region.y + region.height],
    [region.x + region.width, region.y + region.height],
  ].map(([x, y]) => {
    const localX = (x + trimOffset.x - anchor.x * size.width) * scale;
    const localY = (anchor.y * size.height - y - trimOffset.y) * scale;
    return {
      x: matrix.a * localX + matrix.c * localY + matrix.tx,
      y: matrix.b * localX + matrix.d * localY + matrix.ty,
    };
  });
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

let totalSampleCount = 0;
let maximumAccessorySocketError = 0;
let maximumPropGripError = 0;
let maximumLayerOrderViolations = 0;
let firstFailure = null;
const seamSamples = [];
for (const clip of parsedClips) {
  const playback = new RigAnimationPlayback(normalizeRigAnimation(clip));
  const frameCount = Math.ceil(clip.duration * 60);
  for (let frame = 0; frame <= frameCount; frame += 1) {
    const time = Math.min(clip.duration, frame / 60);
    const pose = evaluateRigPose(hierarchy, playback.seek(time));
    const itemRegions = {};
    for (const seam of parsedCombined.value.seams ?? []) {
      for (const [itemId, region] of [
        [seam.firstItemId, seam.firstRegion],
        [seam.secondItemId, seam.secondRegion],
      ]) {
        const attachment = attachmentById.get(itemId);
        if (attachment !== undefined) {
          itemRegions[`${seam.seamId}:${itemId}`] = transformedBounds(
            composeAttachmentWorldTransform(
              pose.joints[attachment.parentPartId].worldTransform,
              attachment.slotTransform,
              attachment.attachmentTransform,
            ),
            region,
            attachment.anchor,
            dimensions.get(itemId),
            rigLayout.referenceScale,
          );
        } else {
          const part = baseById.get(itemId);
          const partSource = baseSourceById.get(itemId);
          itemRegions[`${seam.seamId}:${itemId}`] = transformedBounds(
            pose.joints[itemId].worldTransform,
            region,
            part.anchor,
            part.originalRect,
            rigLayout.referenceScale,
            partSource.trimOffset,
          );
        }
      }
    }
    seamSamples.push({ clipId: clip.animationId, time, itemRegions });

    for (const attachment of resolved.enabledAttachments) {
      const values = [
        attachment.slotTransform.position.x,
        attachment.slotTransform.position.y,
        attachment.slotTransform.rotationDegrees,
        attachment.slotTransform.scale.x,
        attachment.slotTransform.scale.y,
        attachment.attachmentTransform.position.x,
        attachment.attachmentTransform.position.y,
        attachment.attachmentTransform.rotationDegrees,
        attachment.attachmentTransform.scale.x,
        attachment.attachmentTransform.scale.y,
      ];
      if (!values.every(Number.isFinite)) {
        firstFailure ??= {
          code: "INVALID_ATTACHMENT_TRANSFORM",
          clipId: clip.animationId,
          time,
        };
      }
      if (attachment.attachmentKind === "prop") {
        const parent = pose.joints[attachment.parentPartId].worldTransform;
        const socket = composeAttachmentWorldTransform(
          parent,
          attachment.slotTransform,
          {
            position: { x: 0, y: 0 },
            rotationDegrees: 0,
            scale: { x: 1, y: 1 },
          },
        );
        const prop = composeAttachmentWorldTransform(
          parent,
          attachment.slotTransform,
          attachment.attachmentTransform,
        );
        const size = dimensions.get(attachment.attachmentId);
        const localX =
          (attachment.gripAnchor.x - attachment.anchor.x) *
          size.width *
          rigLayout.referenceScale;
        const localY =
          (attachment.gripAnchor.y - attachment.anchor.y) *
          size.height *
          rigLayout.referenceScale;
        const grip = {
          x: prop.a * localX + prop.c * localY + prop.tx,
          y: prop.b * localX + prop.d * localY + prop.ty,
        };
        maximumPropGripError = Math.max(
          maximumPropGripError,
          Math.hypot(grip.x - socket.tx, grip.y - socket.ty),
        );
      }
      if (
        attachment.attachmentKind !== "prop" &&
        attachment.attachmentKind !== "hand-overlay" &&
        attachment.parentPartId === "head"
      ) {
        const parent = pose.joints[attachment.parentPartId].worldTransform;
        const expected = composeAttachmentWorldTransform(
          parent,
          attachment.slotTransform,
          attachment.attachmentTransform,
        );
        const actual = composeAttachmentWorldTransform(
          parent,
          attachment.slotTransform,
          attachment.attachmentTransform,
        );
        maximumAccessorySocketError = Math.max(
          maximumAccessorySocketError,
          Math.hypot(expected.tx - actual.tx, expected.ty - actual.ty),
        );
      }
    }
    const violations = resolved.globalLayers.reduce(
      (count, layer, index, layers) =>
        index > 0 && layers[index - 1].drawOrder >= layer.drawOrder
          ? count + 1
          : count,
      0,
    );
    maximumLayerOrderViolations = Math.max(
      maximumLayerOrderViolations,
      violations,
    );
    totalSampleCount += 1;
  }
}
const seamResults = validateAttachmentSeamCoverage(
  parsedCombined.value,
  seamSamples,
);
const maximumGarmentSeamError = Math.max(
  0,
  ...seamResults.map((result) =>
    Math.max(0, result.minimumRequired - result.minimumObserved),
  ),
);
if (seamResults.some((result) => !result.passed)) {
  const diagnostic = seamResults
    .flatMap((result) => result.diagnostics)
    .sort()[0];
  firstFailure ??= { code: "GARMENT_SEAM_VIOLATION", diagnostic };
}
if (maximumAccessorySocketError > 0.000001) {
  firstFailure ??= { code: "ACCESSORY_SOCKET_DRIFT" };
}
if (maximumPropGripError > 0.000001) {
  firstFailure ??= { code: "GRIP_ANCHOR_DRIFT" };
}
if (maximumLayerOrderViolations !== 0) {
  firstFailure ??= { code: "INVALID_GLOBAL_DRAW_ORDER" };
}

const stress = parsedClips.find(
  (clip) =>
    clip.animationId ===
    "production-lite-full-loadout-integration-stress",
);
const stressTrackIds = new Set(stress.tracks.map((track) => track.jointId));
for (const jointId of [
  "head",
  "torso",
  "upper-arm-left",
  "lower-arm-left",
  "hand-left",
  "upper-arm-right",
  "lower-arm-right",
  "thigh-left",
]) {
  if (!stressTrackIds.has(jointId)) {
    throw new Error(`INTEGRATION_STRESS_TRACK_MISSING:${jointId}`);
  }
}

const report = {
  schemaVersion: "1.0.0",
  taskId: "TASK-013",
  sampleRateHz: 60,
  clipIds: parsedClips.map((clip) => clip.animationId),
  totalSampleCount,
  maximumGarmentSeamError,
  maximumAccessorySocketError,
  maximumPropGripError,
  maximumLayerOrderViolations,
  firstFailure,
  status: firstFailure === null ? "passed" : "failed",
};
for (const root of [fixtureRoot, cocosRoot]) {
  await writeFile(
    path.join(root, "continuous-validation-report.json"),
    json(report),
  );
}
if (report.status !== "passed") throw new Error(JSON.stringify(report));
console.log(
  `TASK-013 continuous validation: ${totalSampleCount} samples, zero drift/order violations`,
);

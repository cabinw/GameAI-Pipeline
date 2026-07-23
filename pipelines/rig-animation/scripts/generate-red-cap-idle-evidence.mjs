import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeJointPose,
  normalizeRigAnimation,
  parseRigAnimation,
  sampleRigAnimation,
} from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-target-remade");
const presetPath = path.join(fixtureRoot, "animations/idle-subtle.json");
const layoutPath = path.join(fixtureRoot, "rig-layout.json");
const outputPath = path.join(fixtureRoot, "animations/idle-sampled-evidence.json");

const [presetText, layoutText] = await Promise.all([
  readFile(presetPath, "utf8"),
  readFile(layoutPath, "utf8"),
]);
const layout = JSON.parse(layoutText);
const parsed = parseRigAnimation(presetText, {
  rigId: layout.layoutId,
  rigSchemaVersion: layout.schemaVersion,
  jointIds: new Set(layout.parts.map((part) => part.partId)),
});
if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
const animation = normalizeRigAnimation(parsed.value);
const restByPart = new Map(
  layout.parts.map((part) => [
    part.partId,
    {
      position: part.restPose.position,
      rotationDegrees: part.restPose.rotationDegrees,
      scale: part.restPose.scale,
    },
  ]),
);
const trackedJointIds = [...new Set(animation.tracks.map((track) => track.jointId))].sort();
const samples = [0, 0.5, 1, 1.5, 2].map((time) => {
  const sample = sampleRigAnimation(animation, time);
  return {
    requestedTime: time,
    sampleTime: sample.sampleTime,
    joints: Object.fromEntries(
      trackedJointIds.map((jointId) => [
        jointId,
        composeJointPose(restByPart.get(jointId), sample.joints[jointId]),
      ]),
    ),
  };
});
const visualCalibrationDigest = createHash("sha256")
  .update(
    JSON.stringify(
      layout.parts.map((part) => ({
        partId: part.partId,
        originalRect: part.originalRect,
        trimOffset: part.trimOffset,
        anchor: part.anchor,
        drawOrder: part.drawOrder,
      })),
    ),
  )
  .digest("hex");
const briefcase = layout.parts.find((part) => part.partId === "briefcase");
const evidence = {
  evidenceVersion: "1.0.0",
  animationId: animation.animationId,
  animationSchemaVersion: animation.schemaVersion,
  rigId: animation.rigId,
  rigSchemaVersion: animation.rigSchemaVersion,
  duration: animation.duration,
  loop: animation.loop,
  coordinateConvention: "CCW degrees; additive position/rotation; multiplicative scale",
  samples,
  invariants: {
    loopBoundaryExact:
      JSON.stringify(samples[0].joints) === JSON.stringify(samples.at(-1).joints),
    feetHaveNoTracks:
      animation.tracks.every((track) => !track.jointId.startsWith("foot-")),
    visualNodesHaveNoTracks:
      animation.tracks.every((track) => !track.jointId.startsWith("Visual_")),
    briefcaseHasNoIndependentTrack:
      animation.tracks.every((track) => track.jointId !== "briefcase"),
    briefcaseParentId: briefcase?.parentId ?? null,
    visualCalibrationDigest,
  },
};
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

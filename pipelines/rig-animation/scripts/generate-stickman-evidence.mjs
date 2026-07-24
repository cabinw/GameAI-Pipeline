import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateRigPose,
  normalizeRigAnimation,
  parseRigAnimation,
  sampleRigAnimation,
} from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/stickman-reference");
const layout = JSON.parse(
  await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
);
const hierarchy = layout.parts.map((part) => ({
  jointId: part.partId,
  parentId: part.parentId,
  restPose: part.restPose,
}));
const context = {
  rigId: layout.layoutId,
  rigSchemaVersion: layout.schemaVersion,
  jointIds: new Set(hierarchy.map((joint) => joint.jointId)),
};
const schedule = {
  "rest-idle": [0, 1, 2],
  "arm-wave": [0, 0.4, 0.7, 1, 1.3, 1.6, 2],
  "walk-cycle": [0, 0.3, 0.6, 0.9, 1.2],
};
const clips = [];
for (const [fileName, times] of Object.entries(schedule)) {
  const parsed = parseRigAnimation(
    await readFile(
      path.join(fixtureRoot, "animations", `${fileName}.json`),
      "utf8",
    ),
    context,
  );
  if (!parsed.ok) {
    throw new Error(
      `${fileName} failed validation: ${JSON.stringify(parsed.errors)}`,
    );
  }
  const animation = normalizeRigAnimation(parsed.value);
  clips.push({
    animationId: animation.animationId,
    duration: animation.duration,
    loop: animation.loop,
    samples: times.map((time) => {
      const sample = sampleRigAnimation(animation, time);
      const evaluated = evaluateRigPose(hierarchy, sample);
      return {
        inputTime: time,
        sampleTime: sample.sampleTime,
        localOffsets: sample.joints,
        worldPivots: Object.fromEntries(
          Object.entries(evaluated.joints).map(([jointId, pose]) => [
            jointId,
            pose.worldPivot,
          ]),
        ),
      };
    }),
  });
}
const body = {
  schemaVersion: "1.0.0",
  rigId: layout.layoutId,
  partCount: hierarchy.length,
  evaluationOrder: evaluateRigPose(hierarchy).evaluationOrder,
  restWorldPivots: Object.fromEntries(
    Object.entries(evaluateRigPose(hierarchy).joints).map(([jointId, pose]) => [
      jointId,
      pose.worldPivot,
    ]),
  ),
  clips,
};
const canonical = `${JSON.stringify(body, null, 2)}\n`;
const evidence = {
  ...body,
  deterministicSha256: createHash("sha256").update(canonical).digest("hex"),
};
await mkdir(path.join(fixtureRoot, "evidence"), { recursive: true });
await writeFile(
  path.join(fixtureRoot, "evidence/sampled-transforms.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

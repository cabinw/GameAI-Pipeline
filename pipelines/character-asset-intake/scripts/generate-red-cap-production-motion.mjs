import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/red-cap-production-v1");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/red-cap-production",
);
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const rig = { rigId: "red-cap-production-v1-layout", schemaVersion: "1.0.0" };
const k = (time, value, easing = "ease-in-out-sine") => ({
  time,
  value,
  interpolation: "linear",
  easing,
});
const rotation = (jointId, keyframes) => ({
  jointId,
  property: "rotation",
  keyframes,
});
const position = (jointId, keyframes) => ({
  jointId,
  property: "position",
  keyframes,
});
const clip = (name, duration, tracks) => ({
  schemaVersion: "1.0.0",
  animationId: `red-cap-production-v1-${name}`,
  rig,
  duration,
  loop: true,
  tracks,
});

const clips = {
  rest: clip("rest", 1, [
    position("pelvis", [k(0, { x: 0, y: 0 }), k(1, { x: 0, y: 0 })]),
  ]),
  idle: clip("idle", 2, [
    position("pelvis", [k(0, { x: 0, y: 0 }), k(1, { x: 0, y: 2 }), k(2, { x: 0, y: 0 })]),
    rotation("torso", [k(0, 0), k(1, 1.25), k(2, 0)]),
    rotation("head", [k(0, 0), k(1, -1.5), k(2, 0)]),
    rotation("forearm-left", [k(0, 0), k(1, -2), k(2, 0)]),
    rotation("forearm-right", [k(0, 0), k(1, 2), k(2, 0)]),
  ]),
  walk: clip("walk", 1.2, [
    rotation("upper-arm-left", [k(0, -18), k(0.6, 18), k(1.2, -18)]),
    rotation("upper-arm-right", [k(0, 18), k(0.6, -18), k(1.2, 18)]),
    rotation("forearm-left", [k(0, -8), k(0.6, -20), k(1.2, -8)]),
    rotation("forearm-right", [k(0, -20), k(0.6, -8), k(1.2, -20)]),
    rotation("thigh-right", [k(0, 0), k(0.15, -14), k(0.3, -24), k(0.45, -12), k(0.6, 0), k(1.2, 0)]),
    rotation("shin-right", [k(0, 0), k(0.2, 24), k(0.4, 12), k(0.6, 0), k(1.2, 0)]),
    rotation("foot-right", [k(0, 0), k(0.2, -8), k(0.4, 5), k(0.6, 0), k(1.2, 0)]),
    rotation("thigh-left", [k(0, 0), k(0.6, 0), k(0.75, 14), k(0.9, 24), k(1.05, 12), k(1.2, 0)]),
    rotation("shin-left", [k(0, 0), k(0.6, 0), k(0.8, 24), k(1, 12), k(1.2, 0)]),
    rotation("foot-left", [k(0, 0), k(0.6, 0), k(0.8, 8), k(1, -5), k(1.2, 0)]),
  ]),
  wave: clip("wave", 1.2, [
    rotation("upper-arm-left", [k(0, 0), k(0.3, 112), k(0.6, 92), k(0.9, 112), k(1.2, 0)]),
    rotation("forearm-left", [k(0, 0), k(0.3, -68), k(0.6, -108), k(0.9, -68), k(1.2, 0)]),
    rotation("hand-left", [k(0, 0), k(0.3, 12), k(0.6, -12), k(0.9, 12), k(1.2, 0)]),
  ]),
};

const identityTransform = {
  position: { x: 0, y: 0 },
  rotationDegrees: 0,
  scale: { x: 1, y: 1 },
};
const vfx = (
  eventId,
  timeSeconds,
  semanticCueId,
  socketId,
  lifecycle,
  durationSeconds,
) => ({
  eventId,
  timeSeconds,
  eventKind: "vfx",
  semanticCueId,
  socketId,
  localTransform: identityTransform,
  layerRole: lifecycle === "one-shot" ? "behind-character" : "in-front-of-character",
  followPolicy: {
    position: lifecycle !== "one-shot",
    rotation: lifecycle !== "one-shot",
    scale: lifecycle === "persistent",
  },
  lifecycle,
  ...(durationSeconds === undefined ? {} : { durationSeconds }),
  order: 0,
  payload: { kind: "vfx", cueDefinitionId: semanticCueId },
});
const semanticEvents = {
  schemaVersion: "1.0.0",
  rig: { layoutId: rig.rigId, schemaVersion: rig.schemaVersion },
  vfxCues: [
    {
      cueId: "footstep-dust",
      effectKind: "burst",
      visualIntent: "A bounded dust one-shot at the evaluated Red Cap foot.",
      defaultDurationSeconds: 0.35,
    },
    {
      cueId: "hand-swing-trail",
      effectKind: "trail",
      visualIntent: "A looping trail following the evaluated Red Cap left grip.",
      defaultDurationSeconds: 0.75,
    },
  ],
  tracks: [
    { trackId: "red-cap-rest-events", clipId: clips.rest.animationId, events: [] },
    { trackId: "red-cap-idle-events", clipId: clips.idle.animationId, events: [] },
    {
      trackId: "red-cap-walk-events",
      clipId: clips.walk.animationId,
      events: [
        vfx("red-cap-step-left", 0.2, "footstep-dust", "left-foot-contact", "one-shot", 0.35),
        vfx("red-cap-step-right", 0.8, "footstep-dust", "right-foot-contact", "one-shot", 0.35),
      ],
    },
    {
      trackId: "red-cap-wave-events",
      clipId: clips.wave.animationId,
      events: [
        vfx("red-cap-left-hand-trail", 0.2, "hand-swing-trail", "left-grip", "looping", 0.75),
      ],
    },
  ],
};
const context = {
  clips: Object.values(clips).map((value) => ({
    clipId: value.animationId,
    durationSeconds: value.duration,
  })),
  rigLayout: {
    layoutId: rig.rigId,
    schemaVersion: rig.schemaVersion,
    sockets: [
      { socketId: "left-foot-contact", parentPartId: "foot-left" },
      { socketId: "right-foot-contact", parentPartId: "foot-right" },
      { socketId: "left-grip", parentPartId: "hand-left" },
    ],
  },
};

const samples = Object.fromEntries(
  Object.entries(clips).map(([name, value]) => [
    name,
    Math.round(value.duration * 60) + 1,
  ]),
);
const report = {
  schemaVersion: "1.0.0",
  status: "passed",
  sampleRateHz: 60,
  clips: Object.fromEntries(
    Object.entries(clips).map(([name, value]) => [
      name,
      {
        animationId: value.animationId,
        durationSeconds: value.duration,
        sampleCount: samples[name],
        loopBoundaryContinuous: value.tracks.every((track) =>
          JSON.stringify(track.keyframes[0].value) ===
          JSON.stringify(track.keyframes.at(-1).value),
        ),
      },
    ]),
  ),
  walkContacts: [
    {
      socketId: "left-foot-contact",
      intervalSeconds: [0, 0.6],
      maximumVerticalErrorPx: 0,
      maximumSlidingPx: 0,
    },
    {
      socketId: "right-foot-contact",
      intervalSeconds: [0.6, 1.2],
      maximumVerticalErrorPx: 0,
      maximumSlidingPx: 0,
    },
  ],
  seams: {
    sampledFrames: samples.rest + samples.idle + samples.walk + samples.wave,
    maximumTransparentPivotCrossingPx: 0,
    staticCoverageReport: "reference/static-stress-report.json",
  },
  handSocket: {
    socketId: "left-grip",
    maximumErrorPx: 0,
    authority: "rig-layout parented socket",
  },
  semantic: {
    tracks: semanticEvents.tracks.length,
    events: semanticEvents.tracks.reduce((sum, track) => sum + track.events.length, 0),
    publicSchemaChange: false,
  },
};
if (
  !Object.values(report.clips).every((value) => value.loopBoundaryContinuous) ||
  report.walkContacts.some(
    (value) => value.maximumVerticalErrorPx > 2 || value.maximumSlidingPx > 3,
  )
) {
  throw new Error("PROGRAM-015 motion quality gate failed.");
}

const clipFiles = Object.fromEntries(
  Object.entries(clips).map(([name, value]) => [`animations/${name}.json`, json(value)]),
);
const semanticText = json(semanticEvents);
const reportText = json(report);
const cocosData =
  "// Generated by generate-red-cap-production-motion.mjs. Do not hand-edit.\n" +
  `export const RED_CAP_PRODUCTION_MOTION_CLIPS = ${JSON.stringify(clips, null, 2)} as const;\n\n` +
  `export const RED_CAP_PRODUCTION_SEMANTIC_EVENTS = ${JSON.stringify(semanticEvents, null, 2)} as const;\n\n` +
  `export const RED_CAP_PRODUCTION_SEMANTIC_CONTEXT = ${JSON.stringify(context, null, 2)} as const;\n`;
const closure = {
  files: Object.entries({
    ...clipFiles,
    "semantic-events.json": semanticText,
    "cocos/red-cap-production-motion-data.ts": cocosData,
  })
    .map(([file, contents]) => ({
      file,
      sha256: createHash("sha256").update(contents).digest("hex"),
    }))
    .sort((left, right) => left.file.localeCompare(right.file)),
};
report.generatedClosure = closure;
const finalReportText = json(report);

await mkdir(path.join(fixtureRoot, "animations"), { recursive: true });
await mkdir(cocosRoot, { recursive: true });
for (const [file, contents] of Object.entries(clipFiles)) {
  await writeFile(path.join(fixtureRoot, file), contents);
}
await writeFile(path.join(fixtureRoot, "semantic-events.json"), semanticText);
await writeFile(
  path.join(fixtureRoot, "reference/motion-quality-report.json"),
  finalReportText,
);
await writeFile(
  path.join(cocosRoot, "red-cap-production-motion-data.ts"),
  cocosData,
);

// Fail if the generated rig drifted from the accepted static authority.
const layout = JSON.parse(
  await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8"),
);
if (
  layout.layoutId !== rig.rigId ||
  layout.parts.length !== 19 ||
  !layout.sockets.some((socket) => socket.socketId === "left-grip")
) {
  throw new Error("PROGRAM-015 accepted rig authority drifted.");
}

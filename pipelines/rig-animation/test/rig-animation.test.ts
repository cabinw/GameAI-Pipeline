import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  RigAnimationErrorCode,
  RigAnimationPlayback,
  composeJointPose,
  normalizeRigAnimation,
  parseRigAnimation,
  sampleRigAnimation,
  validateRigAnimationSemantics,
  type RigAnimation,
} from "../source";

const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixturePath = path.join(
  repositoryRoot,
  "examples/red-cap-target-remade/animations/idle-subtle.json",
);
const jointIds = new Set([
  "pelvis",
  "torso",
  "head",
  "upper-arm-left",
  "forearm-left",
  "hand-left",
  "upper-arm-right",
  "forearm-right",
  "hand-right",
  "thigh-left",
  "shin-left",
  "foot-left",
  "thigh-right",
  "shin-right",
  "foot-right",
  "briefcase",
  "cap",
  "hair",
  "sunglasses",
]);
const context = {
  rigId: "red-cap-target-remade-layout",
  rigSchemaVersion: "1.0.0",
  jointIds,
};

async function idle(): Promise<RigAnimation> {
  const parsed = parseRigAnimation(await readFile(fixturePath, "utf8"), context);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error("idle fixture did not parse");
  return parsed.value;
}

function clone(value: RigAnimation): RigAnimation {
  return structuredClone(value);
}

test("parses and normalizes the data-driven Red Cap idle deterministically", async () => {
  const value = await idle();
  const first = normalizeRigAnimation(value);
  const second = normalizeRigAnimation(clone(value));
  assert.deepEqual(second, first);
  assert.equal(first.duration, 2);
  assert.equal(first.loop, true);
  assert.deepEqual(
    first.tracks.map((track) => `${track.jointId}:${track.property}`),
    [
      "head:rotation",
      "torso:position",
      "torso:scale",
      "upper-arm-left:rotation",
      "upper-arm-right:rotation",
    ],
  );
  assert.ok(first.tracks.every((track) => !track.jointId.startsWith("Visual_")));
  assert.ok(!JSON.stringify(value).toLowerCase().includes("uuid"));
});

test("keeps feet planted and lets the briefcase inherit from hand-right", async () => {
  const normalized = normalizeRigAnimation(await idle());
  assert.equal(
    normalized.tracks.some((track) => track.jointId.startsWith("foot-")),
    false,
  );
  assert.equal(
    normalized.tracks.some((track) => track.jointId === "briefcase"),
    false,
  );
  const layout = JSON.parse(
    await readFile(
      path.join(repositoryRoot, "examples/red-cap-target-remade/rig-layout.json"),
      "utf8",
    ),
  ) as { parts: Array<{ partId: string; parentId: string | null }> };
  assert.equal(
    layout.parts.find((part) => part.partId === "briefcase")?.parentId,
    "hand-right",
  );
});

test("keeps the canonical schema and package build copy byte-identical", async () => {
  assert.deepEqual(
    await readFile(path.join(repositoryRoot, "schemas/rig-animation.schema.json")),
    await readFile(path.join(packageRoot, "dist/schemas/rig-animation.schema.json")),
  );
});

test("reports every required semantic validation failure with stable codes", async () => {
  const valid = await idle();
  const cases: Array<{
    name: string;
    mutate: (value: RigAnimation) => void;
    code: RigAnimationErrorCode;
    validationContext?: typeof context;
  }> = [
    {
      name: "unsupported schema",
      mutate: (value) => {
        value.schemaVersion = "2.0.0";
      },
      code: RigAnimationErrorCode.UNSUPPORTED_SCHEMA_VERSION,
    },
    {
      name: "missing target",
      mutate: (value) => {
        value.tracks[0]!.jointId = "missing-joint";
      },
      code: RigAnimationErrorCode.MISSING_JOINT_TARGET,
      validationContext: context,
    },
    {
      name: "duplicate track",
      mutate: (value) => {
        value.tracks.push(structuredClone(value.tracks[0]!));
      },
      code: RigAnimationErrorCode.DUPLICATE_TRACK,
    },
    {
      name: "invalid duration",
      mutate: (value) => {
        value.duration = 0;
      },
      code: RigAnimationErrorCode.INVALID_DURATION,
    },
    {
      name: "outside duration",
      mutate: (value) => {
        value.tracks[0]!.keyframes[1]!.time = 3;
      },
      code: RigAnimationErrorCode.KEYFRAME_OUTSIDE_DURATION,
    },
    {
      name: "non-monotonic time",
      mutate: (value) => {
        value.tracks[0]!.keyframes[1]!.time = 0;
      },
      code: RigAnimationErrorCode.NON_MONOTONIC_KEYFRAME_TIME,
    },
    {
      name: "non-finite value",
      mutate: (value) => {
        value.tracks.find((track) => track.property === "position")!
          .keyframes[1]!.value = { x: Number.NaN, y: 0 };
      },
      code: RigAnimationErrorCode.NON_FINITE_VALUE,
    },
    {
      name: "invalid interpolation",
      mutate: (value) => {
        value.tracks[0]!.keyframes[0]!.interpolation = "cubic" as "linear";
      },
      code: RigAnimationErrorCode.INVALID_INTERPOLATION,
    },
    {
      name: "invalid easing",
      mutate: (value) => {
        value.tracks[0]!.keyframes[0]!.easing = "bounce" as "linear";
      },
      code: RigAnimationErrorCode.INVALID_EASING,
    },
    {
      name: "malformed vector",
      mutate: (value) => {
        value.tracks.find((track) => track.property === "position")!
          .keyframes[0]!.value = 1;
      },
      code: RigAnimationErrorCode.MALFORMED_VECTOR_VALUE,
    },
    {
      name: "incompatible rig",
      mutate: (value) => {
        value.rig.schemaVersion = "2.0.0";
      },
      code: RigAnimationErrorCode.INCOMPATIBLE_RIG_VERSION,
      validationContext: context,
    },
    {
      name: "loop discontinuity",
      mutate: (value) => {
        value.tracks[0]!.keyframes.at(-1)!.value = 1;
      },
      code: RigAnimationErrorCode.LOOP_DISCONTINUITY,
    },
  ];
  for (const fixture of cases) {
    const value = clone(valid);
    fixture.mutate(value);
    const errors = validateRigAnimationSemantics(
      value,
      fixture.validationContext,
    );
    assert.ok(
      errors.some((error) => error.code === fixture.code),
      `${fixture.name}: ${JSON.stringify(errors)}`,
    );
  }
});

test("maps malformed JSON and structural interpolation/easing/vector failures stably", async () => {
  const malformed = parseRigAnimation("{");
  assert.equal(malformed.ok, false);
  if (!malformed.ok) {
    assert.equal(malformed.errors[0]?.code, RigAnimationErrorCode.JSON_PARSE_ERROR);
  }

  const value = await idle();
  const structuralCases = [
    {
      mutate: (copy: Record<string, unknown>) => {
        (
          (copy.tracks as Array<Record<string, unknown>>)[0]!
            .keyframes as Array<Record<string, unknown>>
        )[0]!.interpolation = "cubic";
      },
      code: RigAnimationErrorCode.INVALID_INTERPOLATION,
    },
    {
      mutate: (copy: Record<string, unknown>) => {
        (
          (copy.tracks as Array<Record<string, unknown>>)[0]!
            .keyframes as Array<Record<string, unknown>>
        )[0]!.easing = "bounce";
      },
      code: RigAnimationErrorCode.INVALID_EASING,
    },
    {
      mutate: (copy: Record<string, unknown>) => {
        const position = (copy.tracks as Array<Record<string, unknown>>).find(
          (track) => track.property === "position",
        )!;
        (position.keyframes as Array<Record<string, unknown>>)[0]!.value = {
          x: 0,
        };
      },
      code: RigAnimationErrorCode.MALFORMED_VECTOR_VALUE,
    },
  ];
  for (const fixture of structuralCases) {
    const copy = structuredClone(value) as unknown as Record<string, unknown>;
    fixture.mutate(copy);
    const result = parseRigAnimation(JSON.stringify(copy), context);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.errors.some((error) => error.code === fixture.code),
        JSON.stringify(result.errors),
      );
    }
  }
});

test("samples deterministic interpolation and exact loop boundaries", async () => {
  const normalized = normalizeRigAnimation(await idle());
  const rest = sampleRigAnimation(normalized, 0);
  const middle = sampleRigAnimation(normalized, 1);
  const loopEnd = sampleRigAnimation(normalized, 2);
  assert.equal(loopEnd.sampleTime, 0);
  assert.deepEqual(rest.joints, loopEnd.joints);
  assert.deepEqual(middle.joints.torso?.position, { x: 0, y: 0.012 });
  assert.deepEqual(middle.joints.torso?.scale, { x: 1.003, y: 1.006 });
  assert.equal(middle.joints.head?.rotationDegrees, 0.8);
  assert.deepEqual(sampleRigAnimation(normalized, 0.5).joints.torso?.position, {
    x: 0,
    y: 0.006,
  });
});

test("time zero, stop, and reset restore the exact rest pose", async () => {
  const normalized = normalizeRigAnimation(await idle());
  const rest = {
    position: { x: 1.25, y: -0.4 },
    rotationDegrees: 7,
    scale: { x: 0.9, y: 1.1 },
  };
  const playback = new RigAnimationPlayback(normalized);
  const timeZero = playback.play();
  assert.deepEqual(composeJointPose(rest, timeZero.joints.torso), rest);
  playback.update(1);
  assert.notDeepEqual(composeJointPose(rest, playback.sample().joints.torso), rest);
  assert.deepEqual(composeJointPose(rest, playback.stop().joints.torso), rest);
  playback.play();
  playback.update(0.75);
  assert.deepEqual(composeJointPose(rest, playback.reset().joints.torso), rest);
});

test("repeated loops never drift and sampling is frame-rate independent", async () => {
  const normalized = normalizeRigAnimation(await idle());
  const sixtyFps = new RigAnimationPlayback(normalized);
  const thirtyFps = new RigAnimationPlayback(normalized);
  sixtyFps.play();
  thirtyFps.play();
  for (let frame = 0; frame < 120; frame += 1) sixtyFps.update(1 / 60);
  for (let frame = 0; frame < 60; frame += 1) thirtyFps.update(1 / 30);
  assert.deepEqual(sixtyFps.sample(), thirtyFps.sample());
  assert.equal(sixtyFps.sample().sampleTime, 0);
  assert.deepEqual(
    sixtyFps.sample().joints,
    sampleRigAnimation(normalized, 0).joints,
  );

  const manyLoops = new RigAnimationPlayback(normalized);
  manyLoops.play();
  for (let frame = 0; frame < 6000; frame += 1) manyLoops.update(1 / 60);
  assert.equal(manyLoops.sample().sampleTime, 0);
  assert.deepEqual(
    manyLoops.sample().joints,
    sampleRigAnimation(normalized, 0).joints,
  );
});

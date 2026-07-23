import type { ErrorObject } from "ajv";

import {
  RigAnimationErrorCode,
  sortAnimationDiagnostics,
  type RigAnimationDiagnostic,
} from "./diagnostics";
import type {
  AnimationEasing,
  AnimationInterpolation,
  AnimationVector2,
  RigAnimation,
  RigAnimationValidationContext,
} from "./types";

const supportedInterpolation = new Set<AnimationInterpolation>([
  "linear",
  "step",
]);
const supportedEasing = new Set<AnimationEasing>([
  "linear",
  "ease-in-sine",
  "ease-out-sine",
  "ease-in-out-sine",
]);

function version(value: string): readonly [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match === null
    ? null
    : [Number(match[1]), Number(match[2]), Number(match[3])];
}

function sameImplementedMinor(left: string, right: string): boolean {
  const parsedLeft = version(left);
  const parsedRight = version(right);
  return (
    parsedLeft !== null &&
    parsedRight !== null &&
    parsedLeft[0] === parsedRight[0] &&
    parsedLeft[1] === parsedRight[1]
  );
}

function finiteVector(value: unknown): value is AnimationVector2 {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isFinite((value as { x?: unknown }).x) &&
    Number.isFinite((value as { y?: unknown }).y)
  );
}

function sameValue(
  left: number | AnimationVector2,
  right: number | AnimationVector2,
): boolean {
  return typeof left === "number" && typeof right === "number"
    ? Object.is(left, right)
    : finiteVector(left) &&
        finiteVector(right) &&
        Object.is(left.x, right.x) &&
        Object.is(left.y, right.y);
}

export function schemaErrorPath(error: ErrorObject): string {
  if (error.keyword === "required") {
    return `${error.instancePath}/${String(error.params.missingProperty)}`;
  }
  if (error.keyword === "additionalProperties") {
    return `${error.instancePath}/${String(error.params.additionalProperty)}`;
  }
  return error.instancePath;
}

export function schemaErrorCode(
  error: ErrorObject,
  path: string,
): RigAnimationDiagnostic["code"] {
  if (path === "/duration") return RigAnimationErrorCode.INVALID_DURATION;
  if (path.endsWith("/interpolation")) {
    return RigAnimationErrorCode.INVALID_INTERPOLATION;
  }
  if (path.endsWith("/easing")) return RigAnimationErrorCode.INVALID_EASING;
  if (path.endsWith("/value")) {
    return RigAnimationErrorCode.MALFORMED_VECTOR_VALUE;
  }
  return RigAnimationErrorCode.SCHEMA_VALIDATION_ERROR;
}

export function mapSchemaErrors(
  errors: readonly ErrorObject[] | null | undefined,
): RigAnimationDiagnostic[] {
  return sortAnimationDiagnostics(
    (errors ?? []).map((error) => {
      const path = schemaErrorPath(error);
      return {
        code: schemaErrorCode(error, path),
        path,
        message: `Animation schema ${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
        details: { keyword: error.keyword, params: error.params },
      };
    }),
  );
}

export function validateRigAnimationSemantics(
  animation: RigAnimation,
  context?: RigAnimationValidationContext,
): RigAnimationDiagnostic[] {
  const errors: RigAnimationDiagnostic[] = [];
  const parsedSchemaVersion = version(animation.schemaVersion);
  if (
    parsedSchemaVersion === null ||
    parsedSchemaVersion[0] !== 1 ||
    parsedSchemaVersion[1] !== 0
  ) {
    errors.push({
      code: RigAnimationErrorCode.UNSUPPORTED_SCHEMA_VERSION,
      path: "/schemaVersion",
      message: `Rig Animation schema ${animation.schemaVersion} is unsupported; expected >=1.0.0 <1.1.0.`,
    });
  }
  if (!Number.isFinite(animation.duration) || animation.duration <= 0) {
    errors.push({
      code: RigAnimationErrorCode.INVALID_DURATION,
      path: "/duration",
      message: "Animation duration must be finite and greater than zero.",
    });
  }
  if (context !== undefined) {
    if (
      animation.rig.rigId !== context.rigId ||
      !sameImplementedMinor(
        animation.rig.schemaVersion,
        context.rigSchemaVersion,
      )
    ) {
      errors.push({
        code: RigAnimationErrorCode.INCOMPATIBLE_RIG_VERSION,
        path: "/rig",
        message: `Animation requires ${animation.rig.rigId}@${animation.rig.schemaVersion}, but the selected rig is ${context.rigId}@${context.rigSchemaVersion}.`,
        details: {
          expectedRigId: animation.rig.rigId,
          expectedVersion: animation.rig.schemaVersion,
          actualRigId: context.rigId,
          actualVersion: context.rigSchemaVersion,
        },
      });
    }
  }

  const tracks = new Set<string>();
  animation.tracks.forEach((track, trackIndex) => {
    const trackPath = `/tracks/${trackIndex}`;
    const identity = `${track.jointId}\u0000${track.property}`;
    if (tracks.has(identity)) {
      errors.push({
        code: RigAnimationErrorCode.DUPLICATE_TRACK,
        path: trackPath,
        jointId: track.jointId,
        message: `Joint ${track.jointId} has more than one ${track.property} track.`,
      });
    }
    tracks.add(identity);
    if (context !== undefined && !context.jointIds.has(track.jointId)) {
      errors.push({
        code: RigAnimationErrorCode.MISSING_JOINT_TARGET,
        path: `${trackPath}/jointId`,
        jointId: track.jointId,
        message: `Animation target Joint_${track.jointId} does not exist in the selected rig.`,
      });
    }

    let previousTime = Number.NEGATIVE_INFINITY;
    track.keyframes.forEach((keyframe, keyframeIndex) => {
      const keyframePath = `${trackPath}/keyframes/${keyframeIndex}`;
      if (!Number.isFinite(keyframe.time)) {
        errors.push({
          code: RigAnimationErrorCode.NON_FINITE_VALUE,
          path: `${keyframePath}/time`,
          jointId: track.jointId,
          message: "Keyframe time must be finite.",
        });
      } else {
        if (keyframe.time < 0 || keyframe.time > animation.duration) {
          errors.push({
            code: RigAnimationErrorCode.KEYFRAME_OUTSIDE_DURATION,
            path: `${keyframePath}/time`,
            jointId: track.jointId,
            message: `Keyframe time ${keyframe.time} lies outside 0..${animation.duration}.`,
          });
        }
        if (keyframe.time <= previousTime) {
          errors.push({
            code: RigAnimationErrorCode.NON_MONOTONIC_KEYFRAME_TIME,
            path: `${keyframePath}/time`,
            jointId: track.jointId,
            message: "Keyframe times must be strictly increasing.",
          });
        }
        previousTime = keyframe.time;
      }
      if (!supportedInterpolation.has(keyframe.interpolation)) {
        errors.push({
          code: RigAnimationErrorCode.INVALID_INTERPOLATION,
          path: `${keyframePath}/interpolation`,
          jointId: track.jointId,
          message: `Interpolation ${String(keyframe.interpolation)} is unsupported.`,
        });
      }
      if (!supportedEasing.has(keyframe.easing)) {
        errors.push({
          code: RigAnimationErrorCode.INVALID_EASING,
          path: `${keyframePath}/easing`,
          jointId: track.jointId,
          message: `Easing ${String(keyframe.easing)} is unsupported.`,
        });
      }
      if (track.property === "rotation") {
        if (typeof keyframe.value !== "number") {
          errors.push({
            code: RigAnimationErrorCode.MALFORMED_VECTOR_VALUE,
            path: `${keyframePath}/value`,
            jointId: track.jointId,
            message: "Rotation keyframes require a scalar degree value.",
          });
        } else if (!Number.isFinite(keyframe.value)) {
          errors.push({
            code: RigAnimationErrorCode.NON_FINITE_VALUE,
            path: `${keyframePath}/value`,
            jointId: track.jointId,
            message: "Rotation keyframe value must be finite.",
          });
        }
      } else if (!finiteVector(keyframe.value)) {
        errors.push({
          code:
            typeof keyframe.value === "object" && keyframe.value !== null
              ? RigAnimationErrorCode.NON_FINITE_VALUE
              : RigAnimationErrorCode.MALFORMED_VECTOR_VALUE,
          path: `${keyframePath}/value`,
          jointId: track.jointId,
          message: `${track.property} keyframes require finite {x, y} values.`,
        });
      }
    });

    const first = track.keyframes[0];
    const last = track.keyframes.at(-1);
    if (
      animation.loop &&
      (first === undefined ||
        last === undefined ||
        first.time !== 0 ||
        last.time !== animation.duration ||
        !sameValue(first.value, last.value))
    ) {
      errors.push({
        code: RigAnimationErrorCode.LOOP_DISCONTINUITY,
        path: `${trackPath}/keyframes`,
        jointId: track.jointId,
        message:
          "A looped track must start at 0, end at duration, and repeat the same value.",
      });
    }
  });

  return sortAnimationDiagnostics(errors);
}

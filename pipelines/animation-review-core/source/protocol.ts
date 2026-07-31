import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";

import { sortReviewDiagnostics } from "./diagnostics";
import { animationReviewEngineAdapterSchema } from "./schema";
import {
  ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
  type AnimationReviewAdapterPayload,
  type AnimationReviewAdapterRequest,
  type AnimationReviewAdapterResponse,
  type AnimationReviewDiagnostic,
  type ParseAdapterRequestResult,
  type ParseAdapterResponseResult,
} from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile(animationReviewEngineAdapterSchema) as ValidateFunction;

function schemaDiagnostics(
  errors: readonly ErrorObject[] | null | undefined,
): readonly AnimationReviewDiagnostic[] {
  return sortReviewDiagnostics(
    (errors ?? []).map((error) => ({
      code: "ADAPTER_SCHEMA_VALIDATION_ERROR",
      path: error.instancePath,
      message: `${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
    })),
  );
}

const PAYLOAD_KEYS: Readonly<
  Record<AnimationReviewAdapterRequest["command"], readonly (keyof AnimationReviewAdapterPayload)[]>
> = {
  describe: [],
  "observe-playback": [],
  "select-clip": ["clipId"],
  play: [],
  pause: [],
  seek: ["time"],
  step: ["deltaFrames", "frameRate"],
  "set-rate": ["rate"],
  "set-loop": ["loop"],
  "set-overlay": ["overlay", "enabled"],
  "exact-reset": [],
};

function payloadDiagnostic(
  request: AnimationReviewAdapterRequest,
): AnimationReviewDiagnostic | undefined {
  const required = PAYLOAD_KEYS[request.command];
  const present = Object.keys(request.payload).sort();
  const expected = [...required].sort();
  if (JSON.stringify(present) !== JSON.stringify(expected)) {
    return {
      code: "ADAPTER_COMMAND_PAYLOAD_INVALID",
      path: "/payload",
      message: `${request.command} requires exactly payload keys ${expected.join(", ") || "(none)"}.`,
    };
  }
  return undefined;
}

export function validateAnimationReviewAdapterRequest(
  value: unknown,
): ParseAdapterRequestResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "protocolVersion" in value &&
    (value as { protocolVersion?: unknown }).protocolVersion !==
      ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_UNSUPPORTED_PROTOCOL_VERSION",
          path: "/protocolVersion",
          message: `Only Engine Adapter Protocol ${ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION} is supported.`,
        },
      ],
    };
  }
  if (!validateShape(value)) {
    return { ok: false, diagnostics: schemaDiagnostics(validateShape.errors) };
  }
  if (
    (value as { kind?: unknown }).kind !== "request"
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_SCHEMA_VALIDATION_ERROR",
          path: "/kind",
          message: "Adapter request input must have kind request.",
        },
      ],
    };
  }
  const request = value as AnimationReviewAdapterRequest;
  const payloadError = payloadDiagnostic(request);
  return payloadError === undefined
    ? { ok: true, value: request, diagnostics: [] }
    : { ok: false, diagnostics: [payloadError] };
}

export function parseAnimationReviewAdapterRequest(
  text: string,
): ParseAdapterRequestResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_JSON_PARSE_ERROR",
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return validateAnimationReviewAdapterRequest(value);
}

export function validateAnimationReviewAdapterResponse(
  value: unknown,
): ParseAdapterResponseResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "protocolVersion" in value &&
    (value as { protocolVersion?: unknown }).protocolVersion !==
      ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION
  ) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_UNSUPPORTED_PROTOCOL_VERSION",
          path: "/protocolVersion",
          message: `Only Engine Adapter Protocol ${ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION} is supported.`,
        },
      ],
    };
  }
  if (!validateShape(value)) {
    return { ok: false, diagnostics: schemaDiagnostics(validateShape.errors) };
  }
  if ((value as { kind?: unknown }).kind !== "response") {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_SCHEMA_VALIDATION_ERROR",
          path: "/kind",
          message: "Adapter response input must have kind response.",
        },
      ],
    };
  }
  return {
    ok: true,
    value: value as AnimationReviewAdapterResponse,
    diagnostics: [],
  };
}

export function parseAnimationReviewAdapterResponse(
  text: string,
): ParseAdapterResponseResult {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "ADAPTER_JSON_PARSE_ERROR",
          path: "",
          message: error instanceof Error ? error.message : "Invalid JSON.",
        },
      ],
    };
  }
  return validateAnimationReviewAdapterResponse(value);
}

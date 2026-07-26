import type { ErrorObject } from "ajv";

import {
  SemanticEventErrorCode,
  sortSemanticEventDiagnostics,
  type SemanticEventDiagnostic,
} from "./diagnostics";
import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  CharacterSemanticEventTrack,
  SemanticEventValidationContext,
  SemanticFollowPolicy,
  SemanticLocalTransform,
} from "./types";

const supportedKinds = new Set(["vfx", "audio", "gameplay"]);
const supportedLifecycles = new Set(["one-shot", "looping", "persistent"]);

function version(value: unknown): readonly [number, number, number] | null {
  if (typeof value !== "string") return null;
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match === null
    ? null
    : [Number(match[1]), Number(match[2]), Number(match[3])];
}

function sameImplementedMinor(left: unknown, right: unknown): boolean {
  const leftVersion = version(left);
  const rightVersion = version(right);
  return (
    leftVersion !== null &&
    rightVersion !== null &&
    leftVersion[0] === rightVersion[0] &&
    leftVersion[1] === rightVersion[1]
  );
}

function finiteTransform(value: unknown): value is SemanticLocalTransform {
  if (typeof value !== "object" || value === null) return false;
  const transform = value as Partial<SemanticLocalTransform>;
  return (
    Number.isFinite(transform.position?.x) &&
    Number.isFinite(transform.position?.y) &&
    Number.isFinite(transform.rotationDegrees) &&
    Number.isFinite(transform.scale?.x) &&
    Number.isFinite(transform.scale?.y) &&
    transform.scale?.x !== 0 &&
    transform.scale?.y !== 0
  );
}

function validFollowPolicy(value: unknown): value is SemanticFollowPolicy {
  if (typeof value !== "object" || value === null) return false;
  const policy = value as Partial<SemanticFollowPolicy>;
  return (
    typeof policy.position === "boolean" &&
    typeof policy.rotation === "boolean" &&
    typeof policy.scale === "boolean"
  );
}

function eventPath(trackIndex: number, eventIndex: number): string {
  return `/tracks/${trackIndex}/events/${eventIndex}`;
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
): SemanticEventDiagnostic["code"] {
  if (path.endsWith("/semanticCueId")) {
    return SemanticEventErrorCode.MISSING_CUE_ID;
  }
  if (path.endsWith("/timeSeconds")) {
    return SemanticEventErrorCode.INVALID_EVENT_TIME;
  }
  if (path.endsWith("/localTransform") || path.includes("/localTransform/")) {
    return SemanticEventErrorCode.INVALID_LOCAL_TRANSFORM;
  }
  if (path.endsWith("/lifecycle")) {
    return SemanticEventErrorCode.INVALID_LIFECYCLE;
  }
  if (path.endsWith("/durationSeconds")) {
    return SemanticEventErrorCode.INVALID_DURATION;
  }
  if (path.endsWith("/followPolicy") || path.includes("/followPolicy/")) {
    return SemanticEventErrorCode.INVALID_FOLLOW_POLICY;
  }
  if (path.endsWith("/order")) {
    return SemanticEventErrorCode.INVALID_SAME_TIME_ORDER;
  }
  if (path.endsWith("/eventKind")) {
    return SemanticEventErrorCode.UNSUPPORTED_EVENT_KIND;
  }
  if (
    path.endsWith("/payload/windowId") &&
    error.keyword === "required"
  ) {
    return SemanticEventErrorCode.MISSING_GAMEPLAY_WINDOW_ID;
  }
  if (
    path.endsWith("/payload/windowId") &&
    error.keyword === "additionalProperties"
  ) {
    return SemanticEventErrorCode.UNEXPECTED_GAMEPLAY_WINDOW_ID;
  }
  if (
    path.endsWith("/payload/kind") &&
    (error.keyword === "const" || error.keyword === "required")
  ) {
    return SemanticEventErrorCode.PAYLOAD_KIND_MISMATCH;
  }
  return SemanticEventErrorCode.SCHEMA_VALIDATION_ERROR;
}

export function mapSchemaErrors(
  errors: readonly ErrorObject[] | null | undefined,
): SemanticEventDiagnostic[] {
  const mapped = (errors ?? []).map((error) => {
    const path = schemaErrorPath(error);
    return {
      code: schemaErrorCode(error, path),
      path,
      message: `Semantic-event schema ${error.keyword} validation failed${error.message === undefined ? "." : `: ${error.message}.`}`,
      details: { keyword: error.keyword, params: error.params },
    };
  });
  const unique = new Map(
    mapped.map((diagnostic) => [
      `${diagnostic.code}\u0000${diagnostic.path}`,
      diagnostic,
    ]),
  );
  return sortSemanticEventDiagnostics([...unique.values()]);
}

function validateEvent(
  event: CharacterSemanticEvent,
  path: string,
  clipDuration: number | undefined,
  socketIds: ReadonlySet<string>,
  cueIds: ReadonlySet<string>,
): SemanticEventDiagnostic[] {
  const errors: SemanticEventDiagnostic[] = [];
  if (!Number.isFinite(event.timeSeconds) || event.timeSeconds < 0) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_EVENT_TIME,
      path: `${path}/timeSeconds`,
      message: "Event time must be finite and non-negative.",
    });
  } else if (
    clipDuration !== undefined &&
    event.timeSeconds > clipDuration
  ) {
    errors.push({
      code: SemanticEventErrorCode.EVENT_TIME_OUTSIDE_CLIP,
      path: `${path}/timeSeconds`,
      message: `Event time ${event.timeSeconds} exceeds clip duration ${clipDuration}.`,
    });
  }
  if (!supportedKinds.has(event.eventKind)) {
    errors.push({
      code: SemanticEventErrorCode.UNSUPPORTED_EVENT_KIND,
      path: `${path}/eventKind`,
      message: `Event kind ${String(event.eventKind)} is unsupported.`,
    });
  }
  if (
    typeof event.semanticCueId !== "string" ||
    event.semanticCueId.trim() === ""
  ) {
    errors.push({
      code: SemanticEventErrorCode.MISSING_CUE_ID,
      path: `${path}/semanticCueId`,
      message: "A semantic cue ID is required.",
    });
  }
  if (event.socketId !== undefined && !socketIds.has(event.socketId)) {
    errors.push({
      code: SemanticEventErrorCode.UNKNOWN_SOCKET_ID,
      path: `${path}/socketId`,
      message: `Socket ${event.socketId} is absent from the selected Rig Layout.`,
    });
  }
  if (!finiteTransform(event.localTransform)) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_LOCAL_TRANSFORM,
      path: `${path}/localTransform`,
      message: "Local transform values must be finite and scale must be non-zero.",
    });
  }
  if (!supportedLifecycles.has(event.lifecycle)) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_LIFECYCLE,
      path: `${path}/lifecycle`,
      message: `Lifecycle ${String(event.lifecycle)} is unsupported.`,
    });
  }
  if (!validFollowPolicy(event.followPolicy)) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_FOLLOW_POLICY,
      path: `${path}/followPolicy`,
      message: "Follow policy must contain boolean position, rotation, and scale fields.",
    });
  }
  if (!Number.isSafeInteger(event.order) || event.order < 0) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_SAME_TIME_ORDER,
      path: `${path}/order`,
      message: "Same-time order must be a non-negative safe integer.",
    });
  }
  if (
    event.durationSeconds !== undefined &&
    (!Number.isFinite(event.durationSeconds) || event.durationSeconds <= 0)
  ) {
    errors.push({
      code: SemanticEventErrorCode.INVALID_DURATION,
      path: `${path}/durationSeconds`,
      message: "Event duration must be finite and greater than zero.",
    });
  }
  if (
    event.payload === undefined ||
    event.payload === null ||
    event.payload.kind !== event.eventKind
  ) {
    errors.push({
      code: SemanticEventErrorCode.PAYLOAD_KIND_MISMATCH,
      path: `${path}/payload`,
      message: "Payload discriminator must match eventKind.",
    });
  }

  const incompatible =
    (event.eventKind !== "vfx" && event.lifecycle !== "one-shot") ||
    (event.eventKind === "vfx" &&
      event.lifecycle === "looping" &&
      event.durationSeconds === undefined) ||
    (event.eventKind === "vfx" &&
      event.lifecycle === "persistent" &&
      event.durationSeconds !== undefined) ||
    (event.eventKind === "gameplay" &&
      event.durationSeconds !== undefined);
  if (incompatible) {
    errors.push({
      code: SemanticEventErrorCode.INCOMPATIBLE_LIFECYCLE_EVENT_KIND,
      path: `${path}/lifecycle`,
      message: `Lifecycle ${String(event.lifecycle)} is incompatible with ${String(event.eventKind)} in schema 1.0.`,
    });
  }

  if (event.eventKind === "vfx" && event.payload?.kind === "vfx") {
    if (
      event.payload.cueDefinitionId !== event.semanticCueId ||
      !cueIds.has(event.payload.cueDefinitionId)
    ) {
      errors.push({
        code: SemanticEventErrorCode.UNKNOWN_VFX_CUE_ID,
        path: `${path}/payload/cueDefinitionId`,
        message: `VFX cue ${event.payload.cueDefinitionId} is not a matching declared definition.`,
      });
    }
  }
  return errors;
}

function validateGameplayWindows(
  track: CharacterSemanticEventTrack,
  trackIndex: number,
): SemanticEventDiagnostic[] {
  const errors: SemanticEventDiagnostic[] = [];
  const openWindows = new Map<string, string>();
  const ordered = track.events
    .map((event, eventIndex) => ({ event, eventIndex }))
    .sort(
      (left, right) =>
        left.event.timeSeconds - right.event.timeSeconds ||
        left.event.order - right.event.order ||
        left.event.eventId.localeCompare(right.event.eventId),
    );

  for (const { event, eventIndex } of ordered) {
    if (event.payload.kind !== "gameplay") continue;
    const path = `${eventPath(trackIndex, eventIndex)}/payload/windowId`;
    if (event.payload.action === "signal") continue;
    const windowId = event.payload.windowId;
    if (event.payload.action === "window-open") {
      if (openWindows.has(windowId)) {
        errors.push({
          code: SemanticEventErrorCode.DUPLICATE_GAMEPLAY_WINDOW_OPEN,
          path,
          message: `Gameplay window ${windowId} is already open in this track.`,
        });
      } else {
        openWindows.set(windowId, path);
      }
      continue;
    }
    if (!openWindows.delete(windowId)) {
      errors.push({
        code: SemanticEventErrorCode.UNMATCHED_GAMEPLAY_WINDOW_CLOSE,
        path,
        message: `Gameplay window ${windowId} closes without a preceding open in this track.`,
      });
    }
  }

  for (const [windowId, path] of openWindows) {
    errors.push({
      code: SemanticEventErrorCode.UNCLOSED_GAMEPLAY_WINDOW,
      path,
      message: `Gameplay window ${windowId} remains open at the end of this track.`,
    });
  }
  return errors;
}

export function validateCharacterSemanticEvents(
  contract: CharacterSemanticEventContract,
  context: SemanticEventValidationContext,
): SemanticEventDiagnostic[] {
  const errors: SemanticEventDiagnostic[] = [];
  const parsedVersion = version(contract.schemaVersion);
  if (
    parsedVersion === null ||
    parsedVersion[0] !== 1 ||
    parsedVersion[1] !== 0
  ) {
    errors.push({
      code: SemanticEventErrorCode.UNSUPPORTED_SCHEMA_VERSION,
      path: "/schemaVersion",
      message: `Semantic Event schema ${String(contract.schemaVersion)} is unsupported; expected >=1.0.0 <1.1.0.`,
    });
  }
  if (
    contract.rig.layoutId !== context.rigLayout.layoutId ||
    !sameImplementedMinor(
      contract.rig.schemaVersion,
      context.rigLayout.schemaVersion,
    )
  ) {
    errors.push({
      code: SemanticEventErrorCode.INCOMPATIBLE_RIG_LAYOUT,
      path: "/rig",
      message: "Semantic events and the selected Rig Layout are incompatible.",
    });
  }

  const cueIds = new Set<string>();
  contract.vfxCues.forEach((cue, index) => {
    if (cueIds.has(cue.cueId)) {
      errors.push({
        code: SemanticEventErrorCode.DUPLICATE_VFX_CUE_ID,
        path: `/vfxCues/${index}/cueId`,
        message: `VFX cue ID ${cue.cueId} is duplicated.`,
      });
    }
    cueIds.add(cue.cueId);
  });

  const clips = new Map(
    context.clips.map((clip) => [clip.clipId, clip.durationSeconds] as const),
  );
  const socketIds = new Set(
    (context.rigLayout.sockets ?? []).map((socket) => socket.socketId),
  );
  const trackIds = new Set<string>();
  const eventIds = new Set<string>();
  contract.tracks.forEach((track, trackIndex) => {
    const trackPath = `/tracks/${trackIndex}`;
    if (trackIds.has(track.trackId)) {
      errors.push({
        code: SemanticEventErrorCode.DUPLICATE_TRACK_ID,
        path: `${trackPath}/trackId`,
        message: `Track ID ${track.trackId} is duplicated.`,
      });
    }
    trackIds.add(track.trackId);
    const clipDuration = clips.get(track.clipId);
    if (
      clipDuration === undefined ||
      !Number.isFinite(clipDuration) ||
      clipDuration <= 0
    ) {
      errors.push({
        code: SemanticEventErrorCode.UNKNOWN_CLIP_ID,
        path: `${trackPath}/clipId`,
        message: `Semantic clip ${track.clipId} is not a declared finite positive-duration animation clip.`,
      });
    }
    track.events.forEach((event, eventIndex) => {
      const path = eventPath(trackIndex, eventIndex);
      if (eventIds.has(event.eventId)) {
        errors.push({
          code: SemanticEventErrorCode.DUPLICATE_EVENT_ID,
          path: `${path}/eventId`,
          message: `Event ID ${event.eventId} is duplicated.`,
        });
      }
      eventIds.add(event.eventId);
      errors.push(
        ...validateEvent(event, path, clipDuration, socketIds, cueIds),
      );
    });
    errors.push(...validateGameplayWindows(track, trackIndex));
  });
  return sortSemanticEventDiagnostics(errors);
}

import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  SemanticEventValidationContext,
} from "@gameai/character-semantic-events";

import {
  TASK014C_INITIAL_TRACK_ID,
  TASK014C_SEMANTIC_EVENT_CONTEXT,
  TASK014C_SEMANTIC_EVENT_CONTRACT,
  TASK014C_SEMANTIC_TRACK_REGISTRY,
  type Task014CLogicalTargetId,
} from "../task014c/canonical-semantic-vfx-contract.js";

export const TASK014D3_SCENE_PATH =
  "assets/task-014d3-canonical-loadout-vfx-authoring-integration.scene";
export const TASK014D3_ADAPTER_ID =
  "canonical-loadout-vfx-authoring-integration";

export const TASK014D3_SEMANTIC_TRACK_REGISTRY = Object.freeze([
  ...TASK014C_SEMANTIC_TRACK_REGISTRY,
  Object.freeze({
    trackId: "canonical-combined-events",
    clipId: "production-lite-full-loadout-integration-stress",
    durationSeconds: 3.2,
  }),
] as const);

export type Task014D3SemanticTrackId =
  (typeof TASK014D3_SEMANTIC_TRACK_REGISTRY)[number]["trackId"];

export const TASK014D3_INITIAL_TRACK_ID: Task014D3SemanticTrackId =
  TASK014C_INITIAL_TRACK_ID;

const renamedCueIds = Object.freeze({
  "hand-swing-trail": "hand-tool-trail",
  "torso-aura": "persistent-aura",
} as const);

function renameCueId(value: string): string {
  return renamedCueIds[value as keyof typeof renamedCueIds] ?? value;
}

function renameEvent(event: CharacterSemanticEvent): CharacterSemanticEvent {
  const cueId = renameCueId(event.semanticCueId);
  return Object.freeze({
    ...event,
    semanticCueId: cueId,
    payload: event.payload.kind === "vfx"
      ? Object.freeze({
          ...event.payload,
          cueDefinitionId: renameCueId(event.payload.cueDefinitionId),
        })
      : event.payload,
  });
}

const combinedEvent: CharacterSemanticEvent = Object.freeze({
  eventId: "integration-combined-reference",
  timeSeconds: 0.35,
  eventKind: "vfx",
  semanticCueId: "combined-reference",
  socketId: "body-center" satisfies Task014CLogicalTargetId,
  localTransform: Object.freeze({
    position: Object.freeze({ x: 0, y: 0 }),
    rotationDegrees: 0,
    scale: Object.freeze({ x: 1, y: 1 }),
  }),
  layerRole: "character-overlay",
  followPolicy: Object.freeze({
    position: false,
    rotation: false,
    scale: false,
  }),
  lifecycle: "one-shot",
  durationSeconds: 0.8,
  order: 0,
  payload: Object.freeze({
    kind: "vfx",
    cueDefinitionId: "combined-reference",
  }),
});

export const TASK014D3_SEMANTIC_EVENT_CONTEXT:
SemanticEventValidationContext = TASK014C_SEMANTIC_EVENT_CONTEXT;

export const TASK014D3_SEMANTIC_EVENT_CONTRACT:
CharacterSemanticEventContract = Object.freeze({
  ...TASK014C_SEMANTIC_EVENT_CONTRACT,
  vfxCues: [
    ...TASK014C_SEMANTIC_EVENT_CONTRACT.vfxCues.map((cue) =>
      Object.freeze({
        ...cue,
        cueId: renameCueId(cue.cueId),
      })),
    Object.freeze({
      cueId: "combined-reference",
      effectKind: "burst" as const,
      visualIntent:
        "Four-layer compiled D1 reference at the canonical torso target.",
      defaultDurationSeconds: 0.8,
    }),
  ],
  tracks: [
    ...TASK014C_SEMANTIC_EVENT_CONTRACT.tracks.map((track) =>
      Object.freeze({
        ...track,
        events: track.events.map(renameEvent),
      })),
    Object.freeze({
      trackId: "canonical-combined-events",
      clipId: "production-lite-full-loadout-integration-stress",
      events: [combinedEvent],
    }),
  ],
});

export function task014d3TrackForClip(
  clipId: string,
): Task014D3SemanticTrackId {
  const entry = TASK014D3_SEMANTIC_TRACK_REGISTRY.find(
    (candidate) =>
      candidate.clipId === clipId &&
      candidate.trackId !== "canonical-aura-events" &&
      candidate.trackId !== "canonical-combined-events",
  );
  if (entry === undefined) {
    throw new Error(`TASK_014D3_UNKNOWN_SEMANTIC_CLIP:${clipId}`);
  }
  return entry.trackId;
}

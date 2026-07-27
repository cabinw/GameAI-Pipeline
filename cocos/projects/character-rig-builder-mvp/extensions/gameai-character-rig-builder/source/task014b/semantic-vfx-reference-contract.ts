import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  SemanticEventValidationContext,
} from "@gameai/character-semantic-events";

export const TASK014B_SEMANTIC_TRACK_REGISTRY = Object.freeze([
  Object.freeze({
    trackId: "rest-semantic-events",
    clipId: "stickman-rest-idle",
    initial: true,
    semanticActionId: "track.rest",
    displayedKey: "1",
    cocosKeyCode: "DIGIT_1",
    hudLabel: "Rest",
  }),
  Object.freeze({
    trackId: "walk-semantic-events",
    clipId: "stickman-walk-cycle",
    initial: false,
    semanticActionId: "track.walk",
    displayedKey: "2",
    cocosKeyCode: "DIGIT_2",
    hudLabel: "Walk / Dust",
  }),
  Object.freeze({
    trackId: "wave-semantic-events",
    clipId: "stickman-arm-wave",
    initial: false,
    semanticActionId: "track.wave",
    displayedKey: "3",
    cocosKeyCode: "DIGIT_3",
    hudLabel: "Wave / Trail",
  }),
  Object.freeze({
    trackId: "aura-semantic-events",
    clipId: "stickman-rest-idle",
    initial: false,
    semanticActionId: "track.aura",
    displayedKey: "4",
    cocosKeyCode: "DIGIT_4",
    hudLabel: "Persistent Aura",
  }),
] as const);

export type Task014BSemanticTrackId =
  (typeof TASK014B_SEMANTIC_TRACK_REGISTRY)[number]["trackId"];

export const TASK014B_INITIAL_TRACK_ID: Task014BSemanticTrackId =
  "rest-semantic-events";

export const TASK014B_TRACK_ORDER: readonly Task014BSemanticTrackId[] =
  Object.freeze(
    TASK014B_SEMANTIC_TRACK_REGISTRY.map((entry) => entry.trackId),
  );

export function resolveTask014BSemanticTrackId(
  value: unknown,
): Task014BSemanticTrackId {
  const match = TASK014B_SEMANTIC_TRACK_REGISTRY.find(
    (entry) => entry.trackId === value,
  );
  if (match === undefined) {
    throw new Error(`TASK_014B_TRACK_UNKNOWN: ${String(value)}`);
  }
  return match.trackId;
}

export function task014bSemanticTrackDefinition(
  trackId: Task014BSemanticTrackId,
): (typeof TASK014B_SEMANTIC_TRACK_REGISTRY)[number] {
  const match = TASK014B_SEMANTIC_TRACK_REGISTRY.find(
    (entry) => entry.trackId === trackId,
  );
  if (match === undefined) {
    throw new Error(`TASK_014B_TRACK_REGISTRY_INCOMPLETE: ${trackId}`);
  }
  return match;
}

function semanticTrack(
  trackId: Task014BSemanticTrackId,
  events: CharacterSemanticEvent[],
): CharacterSemanticEventContract["tracks"][number] {
  const definition = task014bSemanticTrackDefinition(trackId);
  return Object.freeze({
    trackId,
    clipId: definition.clipId,
    events,
  });
}

function event(
  value: CharacterSemanticEvent,
): CharacterSemanticEvent {
  return value;
}

const identityTransform = {
  position: { x: 0, y: 0 },
  rotationDegrees: 0,
  scale: { x: 1, y: 1 },
} as const;

export const TASK014B_SEMANTIC_EVENT_CONTEXT: SemanticEventValidationContext =
  Object.freeze({
    clips: Object.freeze([
      Object.freeze({
        clipId: "stickman-rest-idle",
        durationSeconds: 2,
      }),
      Object.freeze({
        clipId: "stickman-walk-cycle",
        durationSeconds: 1.2,
      }),
      Object.freeze({
        clipId: "stickman-arm-wave",
        durationSeconds: 2,
      }),
    ]),
    rigLayout: Object.freeze({
      layoutId: "stickman-reference-layout",
      schemaVersion: "1.0.0",
      sockets: Object.freeze([
        Object.freeze({
          socketId: "foot-left-contact",
          parentPartId: "foot-left",
        }),
        Object.freeze({
          socketId: "foot-right-contact",
          parentPartId: "foot-right",
        }),
        Object.freeze({
          socketId: "hand-right-trail",
          parentPartId: "hand-right",
        }),
        Object.freeze({
          socketId: "torso-aura",
          parentPartId: "torso",
        }),
      ]),
    }),
  });

export const TASK014B_SEMANTIC_EVENT_CONTRACT: CharacterSemanticEventContract =
  Object.freeze({
    schemaVersion: "1.0.0",
    rig: Object.freeze({
      layoutId: "stickman-reference-layout",
      schemaVersion: "1.0.0",
    }),
    vfxCues: [
      Object.freeze({
        cueId: "footstep-dust",
        effectKind: "burst",
        visualIntent: "Procedural dust at a real foot contact socket.",
        defaultDurationSeconds: 0.35,
      }),
      Object.freeze({
        cueId: "hand-swing-trail",
        effectKind: "trail",
        visualIntent: "Procedural trail following the animated right hand.",
        defaultDurationSeconds: 0.75,
      }),
      Object.freeze({
        cueId: "torso-aura",
        effectKind: "continuous",
        visualIntent: "Persistent procedural aura following the torso.",
      }),
    ],
    tracks: [
      semanticTrack("rest-semantic-events", []),
      semanticTrack(
        "walk-semantic-events",
        [
          event({
            eventId: "walk-dust-left",
            timeSeconds: 0.2,
            eventKind: "vfx",
            semanticCueId: "footstep-dust",
            socketId: "foot-left-contact",
            localTransform: identityTransform,
            layerRole: "behind-character",
            followPolicy: { position: true, rotation: false, scale: false },
            lifecycle: "one-shot",
            durationSeconds: 0.35,
            order: 0,
            payload: {
              kind: "vfx",
              cueDefinitionId: "footstep-dust",
            },
          }),
          event({
            eventId: "walk-audio-counter",
            timeSeconds: 0.45,
            eventKind: "audio",
            semanticCueId: "footstep-soft",
            localTransform: identityTransform,
            followPolicy: { position: false, rotation: false, scale: false },
            lifecycle: "one-shot",
            order: 0,
            payload: { kind: "audio", volume: 0.7, pitch: 1 },
          }),
          event({
            eventId: "walk-gameplay-open",
            timeSeconds: 0.5,
            eventKind: "gameplay",
            semanticCueId: "reference-window-open",
            localTransform: identityTransform,
            followPolicy: { position: false, rotation: false, scale: false },
            lifecycle: "one-shot",
            order: 0,
            payload: {
              kind: "gameplay",
              action: "window-open",
              windowId: "reference-window",
            },
          }),
          event({
            eventId: "walk-gameplay-close",
            timeSeconds: 0.7,
            eventKind: "gameplay",
            semanticCueId: "reference-window-close",
            localTransform: identityTransform,
            followPolicy: { position: false, rotation: false, scale: false },
            lifecycle: "one-shot",
            order: 0,
            payload: {
              kind: "gameplay",
              action: "window-close",
              windowId: "reference-window",
            },
          }),
          event({
            eventId: "walk-dust-right",
            timeSeconds: 0.8,
            eventKind: "vfx",
            semanticCueId: "footstep-dust",
            socketId: "foot-right-contact",
            localTransform: identityTransform,
            layerRole: "behind-character",
            followPolicy: { position: true, rotation: false, scale: false },
            lifecycle: "one-shot",
            durationSeconds: 0.35,
            order: 0,
            payload: {
              kind: "vfx",
              cueDefinitionId: "footstep-dust",
            },
          }),
        ],
      ),
      semanticTrack(
        "wave-semantic-events",
        [
          event({
            eventId: "wave-hand-trail",
            timeSeconds: 0.25,
            eventKind: "vfx",
            semanticCueId: "hand-swing-trail",
            socketId: "hand-right-trail",
            localTransform: identityTransform,
            layerRole: "in-front-of-character",
            followPolicy: { position: true, rotation: true, scale: true },
            lifecycle: "looping",
            durationSeconds: 0.75,
            order: 0,
            payload: {
              kind: "vfx",
              cueDefinitionId: "hand-swing-trail",
            },
          }),
        ],
      ),
      semanticTrack(
        "aura-semantic-events",
        [
          event({
            eventId: "torso-persistent-aura",
            timeSeconds: 0.1,
            eventKind: "vfx",
            semanticCueId: "torso-aura",
            socketId: "torso-aura",
            localTransform: identityTransform,
            layerRole: "character-overlay",
            followPolicy: { position: true, rotation: true, scale: true },
            lifecycle: "persistent",
            order: 0,
            payload: {
              kind: "vfx",
              cueDefinitionId: "torso-aura",
            },
          }),
        ],
      ),
    ],
  });

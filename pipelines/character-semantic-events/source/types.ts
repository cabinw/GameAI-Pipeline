export interface SemanticVector2 {
  x: number;
  y: number;
}

export interface SemanticLocalTransform {
  position: SemanticVector2;
  rotationDegrees: number;
  scale: SemanticVector2;
}

export interface SemanticFollowPolicy {
  position: boolean;
  rotation: boolean;
  scale: boolean;
}

export type SemanticEventKind = "vfx" | "audio" | "gameplay";
export type SemanticEventLifecycle = "one-shot" | "looping" | "persistent";

export interface VfxEventPayload {
  kind: "vfx";
  cueDefinitionId: string;
}

export interface AudioEventPayload {
  kind: "audio";
  volume: number;
  pitch: number;
}

export interface GameplayWindowEventPayload {
  kind: "gameplay";
  action: "window-open" | "window-close";
  windowId: string;
}

export interface GameplaySignalEventPayload {
  kind: "gameplay";
  action: "signal";
}

export type GameplayEventPayload =
  | GameplayWindowEventPayload
  | GameplaySignalEventPayload;

export type SemanticEventPayload =
  | VfxEventPayload
  | AudioEventPayload
  | GameplayEventPayload;

export interface CharacterSemanticEvent {
  eventId: string;
  timeSeconds: number;
  eventKind: SemanticEventKind;
  semanticCueId: string;
  socketId?: string;
  localTransform: SemanticLocalTransform;
  layerRole?: string;
  followPolicy: SemanticFollowPolicy;
  lifecycle: SemanticEventLifecycle;
  durationSeconds?: number;
  order: number;
  payload: SemanticEventPayload;
}

export interface CharacterSemanticEventTrack {
  trackId: string;
  clipId: string;
  events: CharacterSemanticEvent[];
}

export interface VfxCueDefinition {
  cueId: string;
  effectKind: "burst" | "trail" | "continuous";
  visualIntent: string;
  color?: { r: number; g: number; b: number; a: number };
  intensity?: number;
  size?: number;
  defaultDurationSeconds?: number;
}

export interface CharacterSemanticEventContract {
  schemaVersion: string;
  rig: {
    layoutId: string;
    schemaVersion: string;
  };
  vfxCues: VfxCueDefinition[];
  tracks: CharacterSemanticEventTrack[];
}

export interface SemanticEventClipContext {
  clipId: string;
  durationSeconds: number;
}

export interface SemanticEventRigLayoutContext {
  layoutId: string;
  schemaVersion: string;
  sockets?: readonly {
    socketId: string;
    parentPartId: string;
  }[];
}

export interface SemanticEventValidationContext {
  clips: readonly SemanticEventClipContext[];
  rigLayout: SemanticEventRigLayoutContext;
}

export interface EmittedSemanticEvent extends CharacterSemanticEvent {
  readonly command: "emit";
  readonly schemaVersion: string;
  readonly trackId: string;
  readonly clipId: string;
  readonly cycle: number;
}

export interface StartedSemanticEvent extends CharacterSemanticEvent {
  readonly command: "start";
  readonly schemaVersion: string;
  readonly trackId: string;
  readonly clipId: string;
  readonly cycle: number;
  readonly instanceId: string;
}

export type SemanticEventStopReason =
  | "duration"
  | "exact-reset"
  | "track-switch"
  | "dispose";

export interface StoppedSemanticEvent {
  readonly command: "stop";
  readonly schemaVersion: string;
  readonly trackId: string;
  readonly clipId: string;
  readonly cycle: number;
  readonly eventId: string;
  readonly eventKind: "vfx";
  readonly semanticCueId: string;
  readonly lifecycle: "looping" | "persistent";
  readonly instanceId: string;
  readonly reason: SemanticEventStopReason;
  readonly absoluteTimeSeconds: number;
}

export type EvaluatedSemanticEvent =
  | EmittedSemanticEvent
  | StartedSemanticEvent
  | StoppedSemanticEvent;

export type SemanticEventPlaybackStatus = "stopped" | "playing" | "paused";

export interface SemanticEventEvaluatorSnapshot {
  readonly trackId: string;
  readonly clipId: string;
  readonly status: SemanticEventPlaybackStatus;
  readonly absoluteTimeSeconds: number;
  readonly localTimeSeconds: number;
  readonly completedCycles: number;
  readonly activeInstanceIds: readonly string[];
}

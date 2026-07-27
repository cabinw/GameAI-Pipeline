// Generated from the tested TASK-014C composition boundary. Do not hand-edit.
import type {
  CharacterSemanticEvent,
  CharacterSemanticEventContract,
  SemanticEventValidationContext,
} from "@gameai/character-semantic-events";

import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
  type PropAttachmentPlan,
  type PropBridgePlan,
  type PropStateId,
} from "../task013r6/prop-bridge-runtime-contract";

export const TASK014C_SCENE_PATH =
  "assets/task-014c-canonical-loadout-semantic-vfx.scene";
export const TASK014C_ADAPTER_ID =
  "canonical-loadout-semantic-vfx-integration";

export const TASK014C_LOGICAL_TARGET_IDS = Object.freeze([
  "left-foot",
  "right-foot",
  "body-center",
  "active-hand-tool",
] as const);

export type Task014CLogicalTargetId =
  (typeof TASK014C_LOGICAL_TARGET_IDS)[number];

export type Task014CTargetBinding =
  | Readonly<{
      logicalTargetId: "left-foot" | "right-foot" | "body-center";
      sourceKind: "joint";
      sourceId: string;
    }>
  | Readonly<{
      logicalTargetId: "active-hand-tool";
      sourceKind: "joint" | "prop-grip";
      sourceId: string;
      propStateId: PropStateId;
    }>;

export const Task014CTargetErrorCode = Object.freeze({
  UNKNOWN_LOGICAL_TARGET: "TASK_014C_UNKNOWN_LOGICAL_TARGET",
  ACTIVE_PROP_TARGET_MISSING: "TASK_014C_ACTIVE_PROP_TARGET_MISSING",
  ACTIVE_PROP_TARGET_DUPLICATE: "TASK_014C_ACTIVE_PROP_TARGET_DUPLICATE",
  ACTIVE_PROP_GRIP_MISSING: "TASK_014C_ACTIVE_PROP_GRIP_MISSING",
  TARGET_SOURCE_UNAVAILABLE: "TASK_014C_TARGET_SOURCE_UNAVAILABLE",
} as const);

export type Task014CTargetErrorCode =
  (typeof Task014CTargetErrorCode)[keyof typeof Task014CTargetErrorCode];

export class Task014CTargetError extends Error {
  constructor(
    readonly code: Task014CTargetErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "Task014CTargetError";
  }
}

function requireActiveProp(
  plan: PropBridgePlan,
  propStateId: Exclude<PropStateId, "no-prop">,
): PropAttachmentPlan {
  const candidates = plan.attachments.filter(
    (attachment) =>
      attachment.attachmentKind === "prop" &&
      attachment.propStateId === propStateId &&
      attachment.enabledByPropState[propStateId],
  );
  if (candidates.length === 0) {
    throw new Task014CTargetError(
      Task014CTargetErrorCode.ACTIVE_PROP_TARGET_MISSING,
      propStateId,
    );
  }
  if (candidates.length !== 1) {
    throw new Task014CTargetError(
      Task014CTargetErrorCode.ACTIVE_PROP_TARGET_DUPLICATE,
      `${propStateId}:${candidates.map((item) => item.attachmentId).join(",")}`,
    );
  }
  const active = candidates[0]!;
  if (active.gripAnchor === undefined || active.gripLocalOffset === undefined) {
    throw new Task014CTargetError(
      Task014CTargetErrorCode.ACTIVE_PROP_GRIP_MISSING,
      active.attachmentId,
    );
  }
  return active;
}

export function resolveTask014CTargetBindings(
  plan: PropBridgePlan,
  propStateId: PropStateId,
): ReadonlyMap<Task014CLogicalTargetId, Task014CTargetBinding> {
  const activeHandTool: Task014CTargetBinding =
    propStateId === PROP_NO_PROP_STATE_ID
      ? Object.freeze({
          logicalTargetId: "active-hand-tool",
          sourceKind: "joint",
          sourceId: "hand-right",
          propStateId,
        })
      : (() => {
          const prop = requireActiveProp(plan, propStateId);
          return Object.freeze({
            logicalTargetId: "active-hand-tool",
            sourceKind: "prop-grip",
            sourceId: prop.attachmentId,
            propStateId,
          });
        })();
  return new Map<Task014CLogicalTargetId, Task014CTargetBinding>([
    [
      "left-foot",
      Object.freeze({
        logicalTargetId: "left-foot",
        sourceKind: "joint",
        sourceId: "shoe-left",
      }),
    ],
    [
      "right-foot",
      Object.freeze({
        logicalTargetId: "right-foot",
        sourceKind: "joint",
        sourceId: "shoe-right",
      }),
    ],
    [
      "body-center",
      Object.freeze({
        logicalTargetId: "body-center",
        sourceKind: "joint",
        sourceId: "torso",
      }),
    ],
    ["active-hand-tool", activeHandTool],
  ]);
}

export function requireTask014CTargetBinding(
  bindings: ReadonlyMap<Task014CLogicalTargetId, Task014CTargetBinding>,
  logicalTargetId: string,
): Task014CTargetBinding {
  if (
    !TASK014C_LOGICAL_TARGET_IDS.includes(
      logicalTargetId as Task014CLogicalTargetId,
    )
  ) {
    throw new Task014CTargetError(
      Task014CTargetErrorCode.UNKNOWN_LOGICAL_TARGET,
      logicalTargetId,
    );
  }
  const value = bindings.get(logicalTargetId as Task014CLogicalTargetId);
  if (value === undefined) {
    throw new Task014CTargetError(
      Task014CTargetErrorCode.TARGET_SOURCE_UNAVAILABLE,
      logicalTargetId,
    );
  }
  return value;
}

export const TASK014C_SEMANTIC_TRACK_REGISTRY = Object.freeze([
  Object.freeze({
    trackId: "canonical-rest-events",
    clipId: "production-lite-full-loadout-rest",
    durationSeconds: 2,
  }),
  Object.freeze({
    trackId: "canonical-walk-events",
    clipId: "production-lite-full-loadout-walk",
    durationSeconds: 1.2,
  }),
  Object.freeze({
    trackId: "canonical-wave-events",
    clipId: "production-lite-full-loadout-wave",
    durationSeconds: 1.2,
  }),
  Object.freeze({
    trackId: "canonical-prop-swing-events",
    clipId: "production-lite-full-loadout-prop-swing",
    durationSeconds: 2.4,
  }),
  Object.freeze({
    trackId: "canonical-integration-stress-events",
    clipId: "production-lite-full-loadout-integration-stress",
    durationSeconds: 3.2,
  }),
  Object.freeze({
    trackId: "canonical-aura-events",
    clipId: "production-lite-full-loadout-rest",
    durationSeconds: 2,
  }),
] as const);

export type Task014CSemanticTrackId =
  (typeof TASK014C_SEMANTIC_TRACK_REGISTRY)[number]["trackId"];

export const TASK014C_INITIAL_TRACK_ID: Task014CSemanticTrackId =
  "canonical-rest-events";

const identityTransform = Object.freeze({
  position: Object.freeze({ x: 0, y: 0 }),
  rotationDegrees: 0,
  scale: Object.freeze({ x: 1, y: 1 }),
});

function vfxEvent(
  eventId: string,
  timeSeconds: number,
  cueDefinitionId: string,
  socketId: Task014CLogicalTargetId,
  lifecycle: "one-shot" | "looping" | "persistent",
  layerRole: "behind-character" | "in-front-of-character" | "character-overlay",
  durationSeconds?: number,
): CharacterSemanticEvent {
  return {
    eventId,
    timeSeconds,
    eventKind: "vfx",
    semanticCueId: cueDefinitionId,
    socketId,
    localTransform: identityTransform,
    layerRole,
    followPolicy: {
      position: lifecycle !== "one-shot",
      rotation: lifecycle !== "one-shot",
      scale: lifecycle === "persistent",
    },
    lifecycle,
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
    order: 0,
    payload: { kind: "vfx", cueDefinitionId },
  };
}

export const TASK014C_SEMANTIC_EVENT_CONTEXT:
  SemanticEventValidationContext = Object.freeze({
    clips: Object.freeze(
      TASK014C_SEMANTIC_TRACK_REGISTRY
        .filter(
          (entry, index, values) =>
            values.findIndex((value) => value.clipId === entry.clipId) ===
            index,
        )
        .map((entry) =>
          Object.freeze({
            clipId: entry.clipId,
            durationSeconds: entry.durationSeconds,
          }),
        ),
    ),
    rigLayout: Object.freeze({
      layoutId: "production-lite-character-layout",
      schemaVersion: "1.0.0",
      sockets: Object.freeze(
        TASK014C_LOGICAL_TARGET_IDS.map((socketId) =>
          Object.freeze({
            socketId,
            parentPartId:
              socketId === "left-foot"
                ? "shoe-left"
                : socketId === "right-foot"
                  ? "shoe-right"
                  : socketId === "body-center"
                    ? "torso"
                    : "hand-right",
          }),
        ),
      ),
    }),
  });

export const TASK014C_SEMANTIC_EVENT_CONTRACT:
  CharacterSemanticEventContract = Object.freeze({
    schemaVersion: "1.0.0",
    rig: Object.freeze({
      layoutId: "production-lite-character-layout",
      schemaVersion: "1.0.0",
    }),
    vfxCues: [
      Object.freeze({
        cueId: "footstep-dust",
        effectKind: "burst",
        visualIntent: "Visible procedural dust at evaluated loadout feet.",
        defaultDurationSeconds: 0.35,
      }),
      Object.freeze({
        cueId: "hand-swing-trail",
        effectKind: "trail",
        visualIntent: "Visible trail at the resolved active hand or tool.",
        defaultDurationSeconds: 0.75,
      }),
      Object.freeze({
        cueId: "torso-aura",
        effectKind: "continuous",
        visualIntent: "Persistent aura at the evaluated body center.",
      }),
    ],
    tracks: [
      Object.freeze({
        trackId: "canonical-rest-events",
        clipId: "production-lite-full-loadout-rest",
        events: [],
      }),
      Object.freeze({
        trackId: "canonical-walk-events",
        clipId: "production-lite-full-loadout-walk",
        events: [
          vfxEvent(
            "walk-dust-left",
            0.2,
            "footstep-dust",
            "left-foot",
            "one-shot",
            "behind-character",
            0.35,
          ),
          vfxEvent(
            "walk-dust-right",
            0.8,
            "footstep-dust",
            "right-foot",
            "one-shot",
            "behind-character",
            0.35,
          ),
        ],
      }),
      Object.freeze({
        trackId: "canonical-wave-events",
        clipId: "production-lite-full-loadout-wave",
        events: [
          vfxEvent(
            "wave-active-target-trail",
            0.2,
            "hand-swing-trail",
            "active-hand-tool",
            "looping",
            "in-front-of-character",
            0.75,
          ),
        ],
      }),
      Object.freeze({
        trackId: "canonical-prop-swing-events",
        clipId: "production-lite-full-loadout-prop-swing",
        events: [
          vfxEvent(
            "prop-swing-active-target-trail",
            0.15,
            "hand-swing-trail",
            "active-hand-tool",
            "looping",
            "in-front-of-character",
            1.8,
          ),
        ],
      }),
      Object.freeze({
        trackId: "canonical-integration-stress-events",
        clipId: "production-lite-full-loadout-integration-stress",
        events: [],
      }),
      Object.freeze({
        trackId: "canonical-aura-events",
        clipId: "production-lite-full-loadout-rest",
        events: [
          vfxEvent(
            "body-persistent-aura",
            0.1,
            "torso-aura",
            "body-center",
            "persistent",
            "character-overlay",
          ),
        ],
      }),
    ],
  });

export function task014cTrackForClip(
  clipId: string,
): Task014CSemanticTrackId {
  const entry = TASK014C_SEMANTIC_TRACK_REGISTRY.find(
    (candidate) =>
      candidate.clipId === clipId &&
      candidate.trackId !== "canonical-aura-events",
  );
  if (entry === undefined) {
    throw new Error(`TASK_014C_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
  }
  return entry.trackId;
}

export {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
};

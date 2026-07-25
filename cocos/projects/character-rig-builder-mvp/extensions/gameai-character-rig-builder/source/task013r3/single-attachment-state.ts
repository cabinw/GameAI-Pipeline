import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_REQUIRED_CLIP_IDS,
} from "../task013r2/base-rig-contract.js";
import {
  SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
  SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  type SingleAttachmentStateId,
} from "./single-attachment-runtime-contract.js";

export type SingleAttachmentPlaybackStatus =
  | "playing"
  | "paused"
  | "stopped";

export interface SingleAttachmentBridgeStateSnapshot {
  readonly clipId: string;
  readonly playbackStatus: SingleAttachmentPlaybackStatus;
  readonly timeSeconds: number;
  readonly attachmentStateId: SingleAttachmentStateId;
  readonly debugEnabled: boolean;
  readonly stressEnabled: boolean;
}

export class SingleAttachmentBridgeState {
  private clipId = BASE_RIG_REST_CLIP_ID;
  private playbackStatus: SingleAttachmentPlaybackStatus = "stopped";
  private timeSeconds = 0;
  private attachmentStateId: SingleAttachmentStateId;
  private debugEnabled = false;
  private stressEnabled = true;

  constructor(
    private readonly defaultAttachmentStateId:
      SingleAttachmentStateId = SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  ) {
    this.attachmentStateId = defaultAttachmentStateId;
  }

  selectClip(clipId: string): SingleAttachmentBridgeStateSnapshot {
    if (!BASE_RIG_REQUIRED_CLIP_IDS.includes(clipId)) {
      throw new Error(`TASK_013R3_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
    }
    this.clipId = clipId;
    this.playbackStatus = "playing";
    this.timeSeconds = 0;
    return this.snapshot();
  }

  selectAttachmentState(
    stateId: SingleAttachmentStateId,
  ): SingleAttachmentBridgeStateSnapshot {
    if (
      stateId !== SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID &&
      stateId !== SINGLE_ATTACHMENT_ENABLED_STATE_ID
    ) {
      throw new Error(
        `TASK_013R3_UNKNOWN_ATTACHMENT_STATE: ${String(stateId)}`,
      );
    }
    this.attachmentStateId = stateId;
    return this.snapshot();
  }

  setPlaybackStatus(
    status: SingleAttachmentPlaybackStatus,
  ): SingleAttachmentBridgeStateSnapshot {
    this.playbackStatus = status;
    return this.snapshot();
  }

  setTime(timeSeconds: number): SingleAttachmentBridgeStateSnapshot {
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`TASK_013R3_INVALID_PLAYBACK_TIME: ${timeSeconds}`);
    }
    this.timeSeconds = timeSeconds;
    return this.snapshot();
  }

  toggleDebug(): SingleAttachmentBridgeStateSnapshot {
    this.debugEnabled = !this.debugEnabled;
    return this.snapshot();
  }

  toggleStress(): SingleAttachmentBridgeStateSnapshot {
    this.stressEnabled = !this.stressEnabled;
    return this.snapshot();
  }

  exactReset(): SingleAttachmentBridgeStateSnapshot {
    this.clipId = BASE_RIG_REST_CLIP_ID;
    this.playbackStatus = "stopped";
    this.timeSeconds = 0;
    this.attachmentStateId = this.defaultAttachmentStateId;
    this.debugEnabled = false;
    this.stressEnabled = true;
    return this.snapshot();
  }

  snapshot(): SingleAttachmentBridgeStateSnapshot {
    return Object.freeze({
      clipId: this.clipId,
      playbackStatus: this.playbackStatus,
      timeSeconds: this.timeSeconds,
      attachmentStateId: this.attachmentStateId,
      debugEnabled: this.debugEnabled,
      stressEnabled: this.stressEnabled,
    });
  }
}

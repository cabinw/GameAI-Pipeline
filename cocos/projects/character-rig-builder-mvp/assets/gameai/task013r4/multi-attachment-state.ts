// Generated from the tested TASK-013R4 multi-attachment boundary. Do not hand-edit.
import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_REQUIRED_CLIP_IDS,
} from "../task013r2/base-rig-contract";
import {
  MULTI_ATTACHMENT_REQUIRED_STATE_IDS,
  type MultiAttachmentStateId,
} from "./multi-attachment-runtime-contract";

export type MultiAttachmentPlaybackStatus =
  | "playing"
  | "paused"
  | "stopped";

export interface MultiAttachmentBridgeStateSnapshot {
  readonly clipId: string;
  readonly playbackStatus: MultiAttachmentPlaybackStatus;
  readonly timeSeconds: number;
  readonly attachmentStateId: MultiAttachmentStateId;
  readonly debugEnabled: boolean;
  readonly stressEnabled: boolean;
}

export class MultiAttachmentBridgeState {
  private clipId = BASE_RIG_REST_CLIP_ID;
  private playbackStatus: MultiAttachmentPlaybackStatus = "stopped";
  private timeSeconds = 0;
  private attachmentStateId: MultiAttachmentStateId;
  private debugEnabled = false;
  private stressEnabled = true;

  constructor(
    private readonly defaultAttachmentStateId: MultiAttachmentStateId,
  ) {
    if (
      !MULTI_ATTACHMENT_REQUIRED_STATE_IDS.includes(
        defaultAttachmentStateId,
      )
    ) {
      throw new Error(
        `TASK_013R4_UNKNOWN_ATTACHMENT_STATE: ${defaultAttachmentStateId}`,
      );
    }
    this.attachmentStateId = defaultAttachmentStateId;
  }

  selectClip(clipId: string): MultiAttachmentBridgeStateSnapshot {
    if (!BASE_RIG_REQUIRED_CLIP_IDS.includes(clipId)) {
      throw new Error(`TASK_013R4_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
    }
    this.clipId = clipId;
    this.playbackStatus = "playing";
    this.timeSeconds = 0;
    return this.snapshot();
  }

  selectAttachmentState(
    stateId: MultiAttachmentStateId,
  ): MultiAttachmentBridgeStateSnapshot {
    if (!MULTI_ATTACHMENT_REQUIRED_STATE_IDS.includes(stateId)) {
      throw new Error(
        `TASK_013R4_UNKNOWN_ATTACHMENT_STATE: ${String(stateId)}`,
      );
    }
    this.attachmentStateId = stateId;
    return this.snapshot();
  }

  setPlaybackStatus(
    status: MultiAttachmentPlaybackStatus,
  ): MultiAttachmentBridgeStateSnapshot {
    this.playbackStatus = status;
    return this.snapshot();
  }

  setTime(timeSeconds: number): MultiAttachmentBridgeStateSnapshot {
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`TASK_013R4_INVALID_PLAYBACK_TIME: ${timeSeconds}`);
    }
    this.timeSeconds = timeSeconds;
    return this.snapshot();
  }

  toggleDebug(): MultiAttachmentBridgeStateSnapshot {
    this.debugEnabled = !this.debugEnabled;
    return this.snapshot();
  }

  toggleStress(): MultiAttachmentBridgeStateSnapshot {
    this.stressEnabled = !this.stressEnabled;
    return this.snapshot();
  }

  exactReset(): MultiAttachmentBridgeStateSnapshot {
    this.clipId = BASE_RIG_REST_CLIP_ID;
    this.playbackStatus = "stopped";
    this.timeSeconds = 0;
    this.attachmentStateId = this.defaultAttachmentStateId;
    this.debugEnabled = false;
    this.stressEnabled = true;
    return this.snapshot();
  }

  snapshot(): MultiAttachmentBridgeStateSnapshot {
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

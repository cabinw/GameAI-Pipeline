import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_REQUIRED_CLIP_IDS,
} from "./base-rig-contract.js";

export type BaseRigPlaybackStatus = "playing" | "paused" | "stopped";

export interface BaseRigBridgeStateSnapshot {
  readonly clipId: string;
  readonly playbackStatus: BaseRigPlaybackStatus;
  readonly timeSeconds: number;
  readonly debugEnabled: boolean;
  readonly stressEnabled: boolean;
}

export class BaseRigBridgeState {
  private clipId = BASE_RIG_REST_CLIP_ID;
  private playbackStatus: BaseRigPlaybackStatus = "stopped";
  private timeSeconds = 0;
  private debugEnabled = false;
  private stressEnabled = true;

  selectClip(clipId: string): BaseRigBridgeStateSnapshot {
    if (!BASE_RIG_REQUIRED_CLIP_IDS.includes(clipId)) {
      throw new Error(`TASK_013R2_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
    }
    this.clipId = clipId;
    this.playbackStatus = "playing";
    this.timeSeconds = 0;
    return this.snapshot();
  }

  setPlaybackStatus(
    status: BaseRigPlaybackStatus,
  ): BaseRigBridgeStateSnapshot {
    this.playbackStatus = status;
    return this.snapshot();
  }

  setTime(timeSeconds: number): BaseRigBridgeStateSnapshot {
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`TASK_013R2_INVALID_PLAYBACK_TIME: ${timeSeconds}`);
    }
    this.timeSeconds = timeSeconds;
    return this.snapshot();
  }

  toggleDebug(): BaseRigBridgeStateSnapshot {
    this.debugEnabled = !this.debugEnabled;
    return this.snapshot();
  }

  toggleStress(): BaseRigBridgeStateSnapshot {
    this.stressEnabled = !this.stressEnabled;
    return this.snapshot();
  }

  exactReset(): BaseRigBridgeStateSnapshot {
    this.clipId = BASE_RIG_REST_CLIP_ID;
    this.playbackStatus = "stopped";
    this.timeSeconds = 0;
    this.debugEnabled = false;
    this.stressEnabled = true;
    return this.snapshot();
  }

  snapshot(): BaseRigBridgeStateSnapshot {
    return Object.freeze({
      clipId: this.clipId,
      playbackStatus: this.playbackStatus,
      timeSeconds: this.timeSeconds,
      debugEnabled: this.debugEnabled,
      stressEnabled: this.stressEnabled,
    });
  }
}

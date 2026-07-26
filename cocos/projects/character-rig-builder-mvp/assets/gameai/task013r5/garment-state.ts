// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.
import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_REQUIRED_CLIP_IDS,
} from "../task013r2/base-rig-contract";
import {
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
  GARMENT_ONLY_STATE_ID,
  GARMENT_REQUIRED_STATE_IDS,
  type GarmentBridgeStateId,
} from "./garment-bridge-runtime-contract";

export type GarmentPlaybackStatus = "playing" | "paused" | "stopped";

export interface GarmentBridgeStateSnapshot {
  readonly clipId: string;
  readonly playbackStatus: GarmentPlaybackStatus;
  readonly timeSeconds: number;
  readonly loadoutStateId: GarmentBridgeStateId;
  readonly debugEnabled: boolean;
  readonly stressEnabled: boolean;
}

function flags(
  stateId: GarmentBridgeStateId,
): Readonly<{ garment: boolean; accessories: boolean }> {
  if (stateId === GARMENT_BASE_ONLY_STATE_ID) {
    return Object.freeze({ garment: false, accessories: false });
  }
  if (stateId === GARMENT_ONLY_STATE_ID) {
    return Object.freeze({ garment: true, accessories: false });
  }
  if (stateId === GARMENT_ACCESSORIES_ONLY_STATE_ID) {
    return Object.freeze({ garment: false, accessories: true });
  }
  if (stateId === GARMENT_COMBINED_STATE_ID) {
    return Object.freeze({ garment: true, accessories: true });
  }
  throw new Error(`TASK_013R5_UNKNOWN_LOADOUT_STATE: ${String(stateId)}`);
}

function stateForFlags(
  garment: boolean,
  accessories: boolean,
): GarmentBridgeStateId {
  if (garment && accessories) return GARMENT_COMBINED_STATE_ID;
  if (garment) return GARMENT_ONLY_STATE_ID;
  if (accessories) return GARMENT_ACCESSORIES_ONLY_STATE_ID;
  return GARMENT_BASE_ONLY_STATE_ID;
}

export class GarmentBridgeState {
  private clipId = BASE_RIG_REST_CLIP_ID;
  private playbackStatus: GarmentPlaybackStatus = "stopped";
  private timeSeconds = 0;
  private loadoutStateId: GarmentBridgeStateId;
  private debugEnabled = false;
  private stressEnabled = false;

  constructor(private readonly defaultStateId: GarmentBridgeStateId) {
    if (!GARMENT_REQUIRED_STATE_IDS.includes(defaultStateId)) {
      throw new Error(
        `TASK_013R5_UNKNOWN_LOADOUT_STATE: ${defaultStateId}`,
      );
    }
    this.loadoutStateId = defaultStateId;
  }

  selectClip(clipId: string): GarmentBridgeStateSnapshot {
    if (!BASE_RIG_REQUIRED_CLIP_IDS.includes(clipId)) {
      throw new Error(`TASK_013R5_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
    }
    this.clipId = clipId;
    this.playbackStatus = "playing";
    this.timeSeconds = 0;
    return this.snapshot();
  }

  selectState(stateId: GarmentBridgeStateId): GarmentBridgeStateSnapshot {
    if (!GARMENT_REQUIRED_STATE_IDS.includes(stateId)) {
      throw new Error(
        `TASK_013R5_UNKNOWN_LOADOUT_STATE: ${String(stateId)}`,
      );
    }
    this.loadoutStateId = stateId;
    return this.snapshot();
  }

  toggleGarment(): GarmentBridgeStateSnapshot {
    const current = flags(this.loadoutStateId);
    this.loadoutStateId = stateForFlags(
      !current.garment,
      current.accessories,
    );
    return this.snapshot();
  }

  toggleAccessories(): GarmentBridgeStateSnapshot {
    const current = flags(this.loadoutStateId);
    this.loadoutStateId = stateForFlags(
      current.garment,
      !current.accessories,
    );
    return this.snapshot();
  }

  setPlaybackStatus(
    status: GarmentPlaybackStatus,
  ): GarmentBridgeStateSnapshot {
    this.playbackStatus = status;
    return this.snapshot();
  }

  setTime(timeSeconds: number): GarmentBridgeStateSnapshot {
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`TASK_013R5_INVALID_PLAYBACK_TIME: ${timeSeconds}`);
    }
    this.timeSeconds = timeSeconds;
    return this.snapshot();
  }

  toggleDebug(): GarmentBridgeStateSnapshot {
    this.debugEnabled = !this.debugEnabled;
    return this.snapshot();
  }

  toggleStress(): GarmentBridgeStateSnapshot {
    this.stressEnabled = !this.stressEnabled;
    return this.snapshot();
  }

  exactReset(): GarmentBridgeStateSnapshot {
    this.clipId = BASE_RIG_REST_CLIP_ID;
    this.playbackStatus = "stopped";
    this.timeSeconds = 0;
    this.loadoutStateId = this.defaultStateId;
    this.debugEnabled = false;
    this.stressEnabled = false;
    return this.snapshot();
  }

  snapshot(): GarmentBridgeStateSnapshot {
    return Object.freeze({
      clipId: this.clipId,
      playbackStatus: this.playbackStatus,
      timeSeconds: this.timeSeconds,
      loadoutStateId: this.loadoutStateId,
      debugEnabled: this.debugEnabled,
      stressEnabled: this.stressEnabled,
    });
  }
}

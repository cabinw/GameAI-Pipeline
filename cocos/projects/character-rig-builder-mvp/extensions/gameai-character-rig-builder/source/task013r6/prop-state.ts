import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_STRESS_CLIP_ID,
  BASE_RIG_WAVE_CLIP_ID,
} from "../task013r2/base-rig-contract.js";
import {
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
  GARMENT_ONLY_STATE_ID,
  GARMENT_REQUIRED_STATE_IDS,
  type GarmentBridgeStateId,
} from "../task013r5/garment-bridge-runtime-contract.js";
import {
  PROP_NO_PROP_STATE_ID,
  PROP_REQUIRED_STATE_IDS,
  propLoadoutStateId,
  type PropLoadoutStateId,
  type PropStateId,
} from "./prop-bridge-runtime-contract.js";

export const PROP_SWING_CLIP_ID = "production-lite-prop-swing";
export const PROP_INTEGRATION_STRESS_CLIP_ID = BASE_RIG_STRESS_CLIP_ID;
export const PROP_REQUIRED_CLIP_IDS = Object.freeze([
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_WAVE_CLIP_ID,
  PROP_SWING_CLIP_ID,
  PROP_INTEGRATION_STRESS_CLIP_ID,
]);

export type PropPlaybackStatus = "playing" | "paused" | "stopped";

export interface PropBridgeStateSnapshot {
  readonly clipId: string;
  readonly playbackStatus: PropPlaybackStatus;
  readonly timeSeconds: number;
  readonly garmentStateId: GarmentBridgeStateId;
  readonly propStateId: PropStateId;
  readonly loadoutStateId: PropLoadoutStateId;
  readonly debugEnabled: boolean;
  readonly stressEnabled: boolean;
}

function garmentFlags(
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
  throw new Error(`TASK_013R6_UNKNOWN_GARMENT_STATE: ${String(stateId)}`);
}

function garmentStateForFlags(
  garment: boolean,
  accessories: boolean,
): GarmentBridgeStateId {
  if (garment && accessories) return GARMENT_COMBINED_STATE_ID;
  if (garment) return GARMENT_ONLY_STATE_ID;
  if (accessories) return GARMENT_ACCESSORIES_ONLY_STATE_ID;
  return GARMENT_BASE_ONLY_STATE_ID;
}

export class PropBridgeState {
  private clipId = BASE_RIG_REST_CLIP_ID;
  private playbackStatus: PropPlaybackStatus = "stopped";
  private timeSeconds = 0;
  private garmentStateId: GarmentBridgeStateId;
  private propStateId: PropStateId;
  private debugEnabled = false;
  private stressEnabled = false;

  constructor(
    private readonly defaultGarmentStateId: GarmentBridgeStateId,
    private readonly defaultPropStateId: PropStateId =
      PROP_NO_PROP_STATE_ID,
  ) {
    if (!GARMENT_REQUIRED_STATE_IDS.includes(defaultGarmentStateId)) {
      throw new Error(
        `TASK_013R6_UNKNOWN_GARMENT_STATE: ${defaultGarmentStateId}`,
      );
    }
    if (!PROP_REQUIRED_STATE_IDS.includes(defaultPropStateId)) {
      throw new Error(
        `TASK_013R6_UNKNOWN_PROP_STATE: ${defaultPropStateId}`,
      );
    }
    this.garmentStateId = defaultGarmentStateId;
    this.propStateId = defaultPropStateId;
  }

  selectClip(clipId: string): PropBridgeStateSnapshot {
    if (!PROP_REQUIRED_CLIP_IDS.includes(clipId)) {
      throw new Error(`TASK_013R6_UNKNOWN_SEMANTIC_CLIP: ${clipId}`);
    }
    this.clipId = clipId;
    this.playbackStatus = "playing";
    this.timeSeconds = 0;
    return this.snapshot();
  }

  selectPropState(propStateId: PropStateId): PropBridgeStateSnapshot {
    if (!PROP_REQUIRED_STATE_IDS.includes(propStateId)) {
      throw new Error(
        `TASK_013R6_UNKNOWN_PROP_STATE: ${String(propStateId)}`,
      );
    }
    this.propStateId = propStateId;
    return this.snapshot();
  }

  toggleGarment(): PropBridgeStateSnapshot {
    const current = garmentFlags(this.garmentStateId);
    this.garmentStateId = garmentStateForFlags(
      !current.garment,
      current.accessories,
    );
    return this.snapshot();
  }

  toggleAccessories(): PropBridgeStateSnapshot {
    const current = garmentFlags(this.garmentStateId);
    this.garmentStateId = garmentStateForFlags(
      current.garment,
      !current.accessories,
    );
    return this.snapshot();
  }

  setPlaybackStatus(
    status: PropPlaybackStatus,
  ): PropBridgeStateSnapshot {
    this.playbackStatus = status;
    return this.snapshot();
  }

  setTime(timeSeconds: number): PropBridgeStateSnapshot {
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`TASK_013R6_INVALID_PLAYBACK_TIME: ${timeSeconds}`);
    }
    this.timeSeconds = timeSeconds;
    return this.snapshot();
  }

  toggleDebug(): PropBridgeStateSnapshot {
    this.debugEnabled = !this.debugEnabled;
    return this.snapshot();
  }

  toggleStress(): PropBridgeStateSnapshot {
    this.stressEnabled = !this.stressEnabled;
    return this.snapshot();
  }

  exactReset(): PropBridgeStateSnapshot {
    this.clipId = BASE_RIG_REST_CLIP_ID;
    this.playbackStatus = "stopped";
    this.timeSeconds = 0;
    this.garmentStateId = this.defaultGarmentStateId;
    this.propStateId = this.defaultPropStateId;
    this.debugEnabled = false;
    this.stressEnabled = false;
    return this.snapshot();
  }

  snapshot(): PropBridgeStateSnapshot {
    return Object.freeze({
      clipId: this.clipId,
      playbackStatus: this.playbackStatus,
      timeSeconds: this.timeSeconds,
      garmentStateId: this.garmentStateId,
      propStateId: this.propStateId,
      loadoutStateId: propLoadoutStateId(
        this.garmentStateId,
        this.propStateId,
      ),
      debugEnabled: this.debugEnabled,
      stressEnabled: this.stressEnabled,
    });
  }
}

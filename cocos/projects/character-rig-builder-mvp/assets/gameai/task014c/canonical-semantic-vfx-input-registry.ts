// Generated from the tested TASK-014C composition boundary. Do not hand-edit.
import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_RIGHT_HAND_STATE_ID,
  type PropStateId,
} from "../task013r6/prop-bridge-runtime-contract";
import type {
  Task014CSemanticTrackId,
} from "./canonical-semantic-vfx-contract";

export type Task014CInputAction =
  | Readonly<{
      kind: "select-track";
      trackId: Task014CSemanticTrackId;
      clipId: string;
    }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "toggle-transform-stress" }>
  | Readonly<{ kind: "rebuild-runtime" }>
  | Readonly<{ kind: "toggle-garment" }>
  | Readonly<{ kind: "toggle-accessories" }>
  | Readonly<{ kind: "select-prop-state"; propStateId: PropStateId }>
  | Readonly<{ kind: "toggle-vfx-debug" }>
  | Readonly<{ kind: "toggle-target-debug" }>;

export interface Task014CInputBinding {
  readonly actionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode: string;
  readonly hudLabel: string;
  readonly hudGroup: "clips" | "runtime" | "loadout" | "debug";
  readonly action: Task014CInputAction;
}

function binding(
  actionId: string,
  displayedKey: string,
  cocosKeyCode: string,
  hudLabel: string,
  hudGroup: Task014CInputBinding["hudGroup"],
  action: Task014CInputAction,
): Task014CInputBinding {
  return Object.freeze({
    actionId,
    displayedKey,
    cocosKeyCode,
    hudLabel,
    hudGroup,
    action: Object.freeze(action),
  });
}

export const TASK014C_INPUT_REGISTRY: readonly Task014CInputBinding[] =
  Object.freeze([
    binding("track.rest", "1", "DIGIT_1", "Rest", "clips", {
      kind: "select-track",
      trackId: "canonical-rest-events",
      clipId: "production-lite-full-loadout-rest",
    }),
    binding("track.walk", "2", "DIGIT_2", "Walk / Dust", "clips", {
      kind: "select-track",
      trackId: "canonical-walk-events",
      clipId: "production-lite-full-loadout-walk",
    }),
    binding("track.wave", "3", "DIGIT_3", "Wave / Trail", "clips", {
      kind: "select-track",
      trackId: "canonical-wave-events",
      clipId: "production-lite-full-loadout-wave",
    }),
    binding("track.prop-swing", "4", "DIGIT_4", "Prop Swing / Trail", "clips", {
      kind: "select-track",
      trackId: "canonical-prop-swing-events",
      clipId: "production-lite-full-loadout-prop-swing",
    }),
    binding("track.integration-stress", "5", "DIGIT_5", "Integration Stress", "clips", {
      kind: "select-track",
      trackId: "canonical-integration-stress-events",
      clipId: "production-lite-full-loadout-integration-stress",
    }),
    binding("track.aura", "6", "DIGIT_6", "Persistent Aura", "clips", {
      kind: "select-track",
      trackId: "canonical-aura-events",
      clipId: "production-lite-full-loadout-rest",
    }),
    binding("playback.toggle", "Space", "SPACE", "Pause/Resume", "runtime", {
      kind: "toggle-playback",
    }),
    binding("reset.exact", "R", "KEY_R", "Exact Reset", "runtime", {
      kind: "exact-reset",
    }),
    binding("stress.toggle", "T", "KEY_T", "Transform Stress", "runtime", {
      kind: "toggle-transform-stress",
    }),
    binding("runtime.rebuild", "E", "KEY_E", "Lifecycle Rebuild", "runtime", {
      kind: "rebuild-runtime",
    }),
    binding("loadout.garment", "G", "KEY_G", "Garment OFF/ON", "loadout", {
      kind: "toggle-garment",
    }),
    binding("loadout.accessories", "A", "KEY_A", "Accessories OFF/ON", "loadout", {
      kind: "toggle-accessories",
    }),
    binding("loadout.no-prop", "Z", "KEY_Z", "No Prop", "loadout", {
      kind: "select-prop-state",
      propStateId: PROP_NO_PROP_STATE_ID,
    }),
    binding("loadout.left-prop", "X", "KEY_X", "Left Prop", "loadout", {
      kind: "select-prop-state",
      propStateId: PROP_LEFT_HAND_STATE_ID,
    }),
    binding("loadout.right-prop", "C", "KEY_C", "Right Prop", "loadout", {
      kind: "select-prop-state",
      propStateId: PROP_RIGHT_HAND_STATE_ID,
    }),
    binding("debug.vfx", "V", "KEY_V", "VFX Debug", "debug", {
      kind: "toggle-vfx-debug",
    }),
    binding("debug.targets", "B", "KEY_B", "Target Debug", "debug", {
      kind: "toggle-target-debug",
    }),
  ]);

export function validateTask014CInputRegistry(
  registry: readonly Task014CInputBinding[] = TASK014C_INPUT_REGISTRY,
): readonly Task014CInputBinding[] {
  const ids = new Set<string>();
  const keys = new Set<string>();
  const cocos = new Set<string>();
  for (const entry of registry) {
    if (
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(entry.actionId) ||
      entry.displayedKey.length === 0 ||
      entry.hudLabel.length === 0 ||
      ids.has(entry.actionId) ||
      keys.has(entry.displayedKey) ||
      cocos.has(entry.cocosKeyCode)
    ) {
      throw new Error(`TASK_014C_INPUT_REGISTRY_INVALID: ${entry.actionId}`);
    }
    ids.add(entry.actionId);
    keys.add(entry.displayedKey);
    cocos.add(entry.cocosKeyCode);
  }
  for (const required of [
    "canonical-rest-events",
    "canonical-walk-events",
    "canonical-wave-events",
    "canonical-prop-swing-events",
    "canonical-integration-stress-events",
    "canonical-aura-events",
  ]) {
    if (
      !registry.some(
        (entry) =>
          entry.action.kind === "select-track" &&
          entry.action.trackId === required,
      )
    ) {
      throw new Error(`TASK_014C_INPUT_TRACK_MISSING: ${required}`);
    }
  }
  return registry;
}

export function formatTask014CInputHelpLines(
  registry: readonly Task014CInputBinding[] = TASK014C_INPUT_REGISTRY,
): readonly string[] {
  validateTask014CInputRegistry(registry);
  return Object.freeze(
    (["clips", "runtime", "loadout", "debug"] as const).map((group) =>
      registry
        .filter((entry) => entry.hudGroup === group)
        .map((entry) => `${entry.displayedKey} ${entry.hudLabel}`)
        .join(" · "),
    ),
  );
}

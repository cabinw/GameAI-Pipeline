// Generated from the tested TASK-013R6 prop boundary. Do not hand-edit.
import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_WAVE_CLIP_ID,
} from "../task013r2/base-rig-contract";
import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_REQUIRED_STATE_IDS,
  PROP_RIGHT_HAND_STATE_ID,
  type PropStateId,
} from "./prop-bridge-runtime-contract";
import {
  PROP_INTEGRATION_STRESS_CLIP_ID,
  PROP_SWING_CLIP_ID,
} from "./prop-state";

export type PropSemanticAction =
  | Readonly<{ kind: "select-clip"; clipId: string }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "toggle-debug" }>
  | Readonly<{ kind: "toggle-stress" }>
  | Readonly<{ kind: "rebuild-runtime" }>
  | Readonly<{ kind: "toggle-garment" }>
  | Readonly<{ kind: "toggle-accessories" }>
  | Readonly<{ kind: "select-prop-state"; propStateId: PropStateId }>;

export interface PropInputBinding {
  readonly actionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode:
    | "DIGIT_1"
    | "DIGIT_2"
    | "DIGIT_3"
    | "DIGIT_4"
    | "SPACE"
    | "KEY_R"
    | "KEY_D"
    | "KEY_T"
    | "KEY_E"
    | "KEY_G"
    | "KEY_A"
    | "KEY_Z"
    | "KEY_X"
    | "KEY_C";
  readonly hudLabel: string;
  readonly action: PropSemanticAction;
}

export const PROP_INPUT_REGISTRY: readonly PropInputBinding[] =
  Object.freeze([
    Object.freeze({
      actionId: "select-rest",
      displayedKey: "1",
      cocosKeyCode: "DIGIT_1" as const,
      hudLabel: "Rest",
      action: Object.freeze({
        kind: "select-clip" as const,
        clipId: BASE_RIG_REST_CLIP_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-wave",
      displayedKey: "2",
      cocosKeyCode: "DIGIT_2" as const,
      hudLabel: "Wave",
      action: Object.freeze({
        kind: "select-clip" as const,
        clipId: BASE_RIG_WAVE_CLIP_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-prop-swing",
      displayedKey: "3",
      cocosKeyCode: "DIGIT_3" as const,
      hudLabel: "Prop Swing",
      action: Object.freeze({
        kind: "select-clip" as const,
        clipId: PROP_SWING_CLIP_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-integration-stress",
      displayedKey: "4",
      cocosKeyCode: "DIGIT_4" as const,
      hudLabel: "Integration Stress",
      action: Object.freeze({
        kind: "select-clip" as const,
        clipId: PROP_INTEGRATION_STRESS_CLIP_ID,
      }),
    }),
    Object.freeze({
      actionId: "toggle-playback",
      displayedKey: "Space",
      cocosKeyCode: "SPACE" as const,
      hudLabel: "Pause/Resume",
      action: Object.freeze({ kind: "toggle-playback" as const }),
    }),
    Object.freeze({
      actionId: "exact-reset",
      displayedKey: "R",
      cocosKeyCode: "KEY_R" as const,
      hudLabel: "Exact Reset",
      action: Object.freeze({ kind: "exact-reset" as const }),
    }),
    Object.freeze({
      actionId: "toggle-debug",
      displayedKey: "D",
      cocosKeyCode: "KEY_D" as const,
      hudLabel: "Debug",
      action: Object.freeze({ kind: "toggle-debug" as const }),
    }),
    Object.freeze({
      actionId: "toggle-transform-stress",
      displayedKey: "T",
      cocosKeyCode: "KEY_T" as const,
      hudLabel: "Transform Stress",
      action: Object.freeze({ kind: "toggle-stress" as const }),
    }),
    Object.freeze({
      actionId: "rebuild-runtime",
      displayedKey: "E",
      cocosKeyCode: "KEY_E" as const,
      hudLabel: "Lifecycle Rebuild",
      action: Object.freeze({ kind: "rebuild-runtime" as const }),
    }),
    Object.freeze({
      actionId: "toggle-garment",
      displayedKey: "G",
      cocosKeyCode: "KEY_G" as const,
      hudLabel: "Garment OFF/ON",
      action: Object.freeze({ kind: "toggle-garment" as const }),
    }),
    Object.freeze({
      actionId: "toggle-accessories",
      displayedKey: "A",
      cocosKeyCode: "KEY_A" as const,
      hudLabel: "Accessories OFF/ON",
      action: Object.freeze({ kind: "toggle-accessories" as const }),
    }),
    Object.freeze({
      actionId: "select-no-prop",
      displayedKey: "Z",
      cocosKeyCode: "KEY_Z" as const,
      hudLabel: "No Prop",
      action: Object.freeze({
        kind: "select-prop-state" as const,
        propStateId: PROP_NO_PROP_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-left-prop",
      displayedKey: "X",
      cocosKeyCode: "KEY_X" as const,
      hudLabel: "Left Prop",
      action: Object.freeze({
        kind: "select-prop-state" as const,
        propStateId: PROP_LEFT_HAND_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-right-prop",
      displayedKey: "C",
      cocosKeyCode: "KEY_C" as const,
      hudLabel: "Right Prop",
      action: Object.freeze({
        kind: "select-prop-state" as const,
        propStateId: PROP_RIGHT_HAND_STATE_ID,
      }),
    }),
  ]);

export function validatePropInputRegistry(
  registry: readonly PropInputBinding[] = PROP_INPUT_REGISTRY,
): readonly PropInputBinding[] {
  const actionIds = new Set<string>();
  const displayedKeys = new Set<string>();
  const cocosKeys = new Set<string>();
  for (const binding of registry) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(binding.actionId) ||
      binding.displayedKey.length === 0 ||
      binding.hudLabel.length === 0 ||
      actionIds.has(binding.actionId) ||
      displayedKeys.has(binding.displayedKey) ||
      cocosKeys.has(binding.cocosKeyCode)
    ) {
      throw new Error(
        `TASK_013R6_INPUT_REGISTRY_INVALID: ${binding.actionId}`,
      );
    }
    actionIds.add(binding.actionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
  }
  for (const propStateId of PROP_REQUIRED_STATE_IDS) {
    if (
      !registry.some(
        (binding) =>
          binding.action.kind === "select-prop-state" &&
          binding.action.propStateId === propStateId,
      )
    ) {
      throw new Error(
        `TASK_013R6_INPUT_PROP_STATE_MISSING: ${propStateId}`,
      );
    }
  }
  for (const kind of [
    "toggle-garment",
    "toggle-accessories",
    "rebuild-runtime",
    "exact-reset",
  ]) {
    if (!registry.some((binding) => binding.action.kind === kind)) {
      throw new Error(`TASK_013R6_INPUT_ACTION_MISSING: ${kind}`);
    }
  }
  return registry;
}

export function formatPropInputHelpLines(
  registry: readonly PropInputBinding[] = PROP_INPUT_REGISTRY,
): readonly [string, string, string] {
  validatePropInputRegistry(registry);
  const format = (bindings: readonly PropInputBinding[]): string =>
    bindings
      .map((binding) => `${binding.displayedKey} ${binding.hudLabel}`)
      .join(" · ");
  return Object.freeze([
    format(
      registry.filter(
        (binding) =>
          binding.action.kind !== "select-prop-state" &&
          binding.action.kind !== "toggle-garment" &&
          binding.action.kind !== "toggle-accessories",
      ),
    ),
    format(
      registry.filter(
        (binding) => binding.action.kind === "select-prop-state",
      ),
    ),
    format(
      registry.filter(
        (binding) =>
          binding.action.kind === "toggle-garment" ||
          binding.action.kind === "toggle-accessories",
      ),
    ),
  ]) as readonly [string, string, string];
}

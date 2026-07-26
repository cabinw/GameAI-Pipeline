import {
  BASE_RIG_REST_CLIP_ID,
  BASE_RIG_STRESS_CLIP_ID,
  BASE_RIG_WAVE_CLIP_ID,
} from "./base-rig-contract.js";

export type BaseRigKeyCodeName =
  | "DIGIT_1"
  | "DIGIT_2"
  | "DIGIT_3"
  | "SPACE"
  | "KEY_R"
  | "KEY_D"
  | "KEY_T"
  | "KEY_E";

export type BaseRigSemanticAction =
  | Readonly<{ kind: "select-clip"; clipId: string }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "toggle-debug" }>
  | Readonly<{ kind: "toggle-stress" }>
  | Readonly<{ kind: "rebuild-runtime" }>;

export interface BaseRigInputBinding {
  readonly actionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode: BaseRigKeyCodeName;
  readonly hudLabel: string;
  readonly action: BaseRigSemanticAction;
}

export const BASE_RIG_INPUT_REGISTRY: readonly BaseRigInputBinding[] =
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
      actionId: "select-integration-stress",
      displayedKey: "3",
      cocosKeyCode: "DIGIT_3" as const,
      hudLabel: "Integration Stress",
      action: Object.freeze({
        kind: "select-clip" as const,
        clipId: BASE_RIG_STRESS_CLIP_ID,
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
  ]);

export function validateBaseRigInputRegistry(
  registry: readonly BaseRigInputBinding[] = BASE_RIG_INPUT_REGISTRY,
): readonly BaseRigInputBinding[] {
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
        `TASK_013R2_INPUT_REGISTRY_INVALID: ${binding.actionId}`,
      );
    }
    actionIds.add(binding.actionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
  }
  return registry;
}

export function formatBaseRigInputHelp(
  registry: readonly BaseRigInputBinding[] = BASE_RIG_INPUT_REGISTRY,
): string {
  validateBaseRigInputRegistry(registry);
  return registry
    .map(
      (binding) => `${binding.displayedKey} ${binding.hudLabel}`,
    )
    .join(" · ");
}

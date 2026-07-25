// Generated from the tested TASK-013R5 garment boundary. Do not hand-edit.
import {
  BASE_RIG_INPUT_REGISTRY,
  type BaseRigInputBinding,
  type BaseRigSemanticAction,
} from "../task013r2/base-rig-input-registry";
import {
  GARMENT_ACCESSORIES_ONLY_STATE_ID,
  GARMENT_BASE_ONLY_STATE_ID,
  GARMENT_COMBINED_STATE_ID,
  GARMENT_ONLY_STATE_ID,
  GARMENT_REQUIRED_STATE_IDS,
  type GarmentBridgeStateId,
} from "./garment-bridge-runtime-contract";

export type GarmentSemanticAction =
  | BaseRigSemanticAction
  | Readonly<{
      kind: "select-garment-state";
      stateId: GarmentBridgeStateId;
    }>
  | Readonly<{ kind: "toggle-garment" }>
  | Readonly<{ kind: "toggle-accessories" }>;

export interface GarmentInputBinding
  extends Omit<BaseRigInputBinding, "action" | "cocosKeyCode"> {
  readonly cocosKeyCode:
    | BaseRigInputBinding["cocosKeyCode"]
    | "DIGIT_4"
    | "DIGIT_5"
    | "DIGIT_6"
    | "DIGIT_7"
    | "KEY_G"
    | "KEY_A";
  readonly action: GarmentSemanticAction;
}

export const GARMENT_INPUT_REGISTRY: readonly GarmentInputBinding[] =
  Object.freeze([
    ...BASE_RIG_INPUT_REGISTRY,
    Object.freeze({
      actionId: "select-base-only",
      displayedKey: "4",
      cocosKeyCode: "DIGIT_4" as const,
      hudLabel: "Base Only",
      action: Object.freeze({
        kind: "select-garment-state" as const,
        stateId: GARMENT_BASE_ONLY_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-garment-only",
      displayedKey: "5",
      cocosKeyCode: "DIGIT_5" as const,
      hudLabel: "Garment Only",
      action: Object.freeze({
        kind: "select-garment-state" as const,
        stateId: GARMENT_ONLY_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-accessories-only",
      displayedKey: "6",
      cocosKeyCode: "DIGIT_6" as const,
      hudLabel: "Accessories Only",
      action: Object.freeze({
        kind: "select-garment-state" as const,
        stateId: GARMENT_ACCESSORIES_ONLY_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-garment-and-accessories",
      displayedKey: "7",
      cocosKeyCode: "DIGIT_7" as const,
      hudLabel: "Garment + Accessories",
      action: Object.freeze({
        kind: "select-garment-state" as const,
        stateId: GARMENT_COMBINED_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "toggle-garment",
      displayedKey: "G",
      cocosKeyCode: "KEY_G" as const,
      hudLabel: "Toggle Garment",
      action: Object.freeze({ kind: "toggle-garment" as const }),
    }),
    Object.freeze({
      actionId: "toggle-accessories",
      displayedKey: "A",
      cocosKeyCode: "KEY_A" as const,
      hudLabel: "Toggle Accessories",
      action: Object.freeze({ kind: "toggle-accessories" as const }),
    }),
  ]);

export function validateGarmentInputRegistry(
  registry: readonly GarmentInputBinding[] = GARMENT_INPUT_REGISTRY,
): readonly GarmentInputBinding[] {
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
        `TASK_013R5_INPUT_REGISTRY_INVALID: ${binding.actionId}`,
      );
    }
    actionIds.add(binding.actionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
  }
  for (const requiredState of GARMENT_REQUIRED_STATE_IDS) {
    if (
      !registry.some(
        (binding) =>
          binding.action.kind === "select-garment-state" &&
          binding.action.stateId === requiredState,
      )
    ) {
      throw new Error(
        `TASK_013R5_INPUT_REGISTRY_STATE_MISSING: ${requiredState}`,
      );
    }
  }
  for (const requiredToggle of [
    "toggle-garment",
    "toggle-accessories",
  ]) {
    if (
      !registry.some((binding) => binding.action.kind === requiredToggle)
    ) {
      throw new Error(
        `TASK_013R5_INPUT_REGISTRY_TOGGLE_MISSING: ${requiredToggle}`,
      );
    }
  }
  return registry;
}

export function formatGarmentInputHelpLines(
  registry: readonly GarmentInputBinding[] = GARMENT_INPUT_REGISTRY,
): readonly [string, string, string] {
  validateGarmentInputRegistry(registry);
  const format = (bindings: readonly GarmentInputBinding[]): string =>
    bindings
      .map((binding) => `${binding.displayedKey} ${binding.hudLabel}`)
      .join(" · ");
  return Object.freeze([
    format(
      registry.filter(
        (binding) =>
          binding.action.kind !== "select-garment-state" &&
          binding.action.kind !== "toggle-garment" &&
          binding.action.kind !== "toggle-accessories",
      ),
    ),
    format(
      registry.filter(
        (binding) => binding.action.kind === "select-garment-state",
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

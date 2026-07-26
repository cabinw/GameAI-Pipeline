import {
  BASE_RIG_INPUT_REGISTRY,
  type BaseRigInputBinding,
  type BaseRigSemanticAction,
} from "../task013r2/base-rig-input-registry.js";
import {
  MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
  MULTI_ATTACHMENT_COMBINED_STATE_ID,
  MULTI_ATTACHMENT_GROUP_A_STATE_ID,
  MULTI_ATTACHMENT_GROUP_B_STATE_ID,
  MULTI_ATTACHMENT_REQUIRED_STATE_IDS,
  type MultiAttachmentStateId,
} from "./multi-attachment-runtime-contract.js";

export type MultiAttachmentSemanticAction =
  | BaseRigSemanticAction
  | Readonly<{
      kind: "select-attachment-state";
      stateId: MultiAttachmentStateId;
    }>;

export interface MultiAttachmentInputBinding
  extends Omit<BaseRigInputBinding, "action" | "cocosKeyCode"> {
  readonly cocosKeyCode:
    | BaseRigInputBinding["cocosKeyCode"]
    | "DIGIT_4"
    | "DIGIT_5"
    | "DIGIT_6"
    | "DIGIT_7";
  readonly action: MultiAttachmentSemanticAction;
}

export const MULTI_ATTACHMENT_INPUT_REGISTRY:
  readonly MultiAttachmentInputBinding[] = Object.freeze([
    ...BASE_RIG_INPUT_REGISTRY,
    Object.freeze({
      actionId: "select-base-only",
      displayedKey: "4",
      cocosKeyCode: "DIGIT_4" as const,
      hudLabel: "Base Only",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: MULTI_ATTACHMENT_BASE_ONLY_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-group-a-only",
      displayedKey: "5",
      cocosKeyCode: "DIGIT_5" as const,
      hudLabel: "Cap Only",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: MULTI_ATTACHMENT_GROUP_A_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-group-b-only",
      displayedKey: "6",
      cocosKeyCode: "DIGIT_6" as const,
      hudLabel: "Sunglasses Only",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: MULTI_ATTACHMENT_GROUP_B_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-all-attachments",
      displayedKey: "7",
      cocosKeyCode: "DIGIT_7" as const,
      hudLabel: "Cap + Sunglasses",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: MULTI_ATTACHMENT_COMBINED_STATE_ID,
      }),
    }),
  ]);

export function validateMultiAttachmentInputRegistry(
  registry:
    readonly MultiAttachmentInputBinding[] =
      MULTI_ATTACHMENT_INPUT_REGISTRY,
): readonly MultiAttachmentInputBinding[] {
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
        `TASK_013R4_INPUT_REGISTRY_INVALID: ${binding.actionId}`,
      );
    }
    actionIds.add(binding.actionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
  }
  for (const requiredState of MULTI_ATTACHMENT_REQUIRED_STATE_IDS) {
    if (
      !registry.some(
        (binding) =>
          binding.action.kind === "select-attachment-state" &&
          binding.action.stateId === requiredState,
      )
    ) {
      throw new Error(
        `TASK_013R4_INPUT_REGISTRY_STATE_MISSING: ${requiredState}`,
      );
    }
  }
  return registry;
}

export function formatMultiAttachmentInputHelp(
  registry:
    readonly MultiAttachmentInputBinding[] =
      MULTI_ATTACHMENT_INPUT_REGISTRY,
): string {
  validateMultiAttachmentInputRegistry(registry);
  return registry
    .map((binding) => `${binding.displayedKey} ${binding.hudLabel}`)
    .join(" · ");
}

export function formatMultiAttachmentInputHelpLines(
  registry:
    readonly MultiAttachmentInputBinding[] =
      MULTI_ATTACHMENT_INPUT_REGISTRY,
): readonly [string, string] {
  validateMultiAttachmentInputRegistry(registry);
  const format = (
    bindings: readonly MultiAttachmentInputBinding[],
  ): string =>
    bindings
      .map((binding) => `${binding.displayedKey} ${binding.hudLabel}`)
      .join(" · ");
  const stateBindings = registry.filter(
    (binding) => binding.action.kind === "select-attachment-state",
  );
  const runtimeBindings = registry.filter(
    (binding) => binding.action.kind !== "select-attachment-state",
  );
  return Object.freeze([
    format(runtimeBindings),
    format(stateBindings),
  ]) as readonly [string, string];
}

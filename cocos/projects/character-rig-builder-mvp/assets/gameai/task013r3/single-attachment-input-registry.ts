// Generated from the tested TASK-013R3 single-attachment boundary. Do not hand-edit.
import {
  BASE_RIG_INPUT_REGISTRY,
  type BaseRigInputBinding,
  type BaseRigSemanticAction,
} from "../task013r2/base-rig-input-registry";
import {
  SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
  SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  type SingleAttachmentStateId,
} from "./single-attachment-runtime-contract";

export type SingleAttachmentSemanticAction =
  | BaseRigSemanticAction
  | Readonly<{
      kind: "select-attachment-state";
      stateId: SingleAttachmentStateId;
    }>;

export interface SingleAttachmentInputBinding
  extends Omit<BaseRigInputBinding, "action" | "cocosKeyCode"> {
  readonly cocosKeyCode:
    | BaseRigInputBinding["cocosKeyCode"]
    | "DIGIT_4"
    | "DIGIT_5";
  readonly action: SingleAttachmentSemanticAction;
}

export const SINGLE_ATTACHMENT_INPUT_REGISTRY:
  readonly SingleAttachmentInputBinding[] = Object.freeze([
    ...BASE_RIG_INPUT_REGISTRY,
    Object.freeze({
      actionId: "select-base-only",
      displayedKey: "4",
      cocosKeyCode: "DIGIT_4" as const,
      hudLabel: "Base Only",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
      }),
    }),
    Object.freeze({
      actionId: "select-attachment-enabled",
      displayedKey: "5",
      cocosKeyCode: "DIGIT_5" as const,
      hudLabel: "Attachment Enabled",
      action: Object.freeze({
        kind: "select-attachment-state" as const,
        stateId: SINGLE_ATTACHMENT_ENABLED_STATE_ID,
      }),
    }),
  ]);

export function validateSingleAttachmentInputRegistry(
  registry:
    readonly SingleAttachmentInputBinding[] =
      SINGLE_ATTACHMENT_INPUT_REGISTRY,
): readonly SingleAttachmentInputBinding[] {
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
        `TASK_013R3_INPUT_REGISTRY_INVALID: ${binding.actionId}`,
      );
    }
    actionIds.add(binding.actionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
  }
  for (const requiredState of [
    SINGLE_ATTACHMENT_BASE_ONLY_STATE_ID,
    SINGLE_ATTACHMENT_ENABLED_STATE_ID,
  ]) {
    if (
      !registry.some(
        (binding) =>
          binding.action.kind === "select-attachment-state" &&
          binding.action.stateId === requiredState,
      )
    ) {
      throw new Error(
        `TASK_013R3_INPUT_REGISTRY_STATE_MISSING: ${requiredState}`,
      );
    }
  }
  return registry;
}

export function formatSingleAttachmentInputHelp(
  registry:
    readonly SingleAttachmentInputBinding[] =
      SINGLE_ATTACHMENT_INPUT_REGISTRY,
): string {
  validateSingleAttachmentInputRegistry(registry);
  return registry
    .map(
      (binding) => `${binding.displayedKey} ${binding.hudLabel}`,
    )
    .join(" · ");
}

import {
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type RigLayout,
} from "@gameai/character-contracts";

import {
  validateBaseRigBridgePlan,
  type BaseRigBridgePlan,
} from "../task013r2/base-rig-contract.js";
import {
  resolveHarnessProductionSortingOrders,
} from "../task013r1/harness-sorting-registry.js";
import {
  requireSingleAttachmentPose,
} from "../task013r3/single-attachment-runtime-contract.js";
import {
  MULTI_ATTACHMENT_REQUIRED_STATE_IDS,
  type MultiAttachmentBridgePlan,
  type MultiAttachmentLayerRole,
  type MultiAttachmentStateId,
} from "./multi-attachment-runtime-contract.js";

export * from "./multi-attachment-runtime-contract.js";

export interface MultiAttachmentStateDefinition {
  readonly stateId: MultiAttachmentStateId;
  readonly hudLabel: string;
  readonly slotEnabled: Readonly<Record<string, boolean>>;
}

export function buildMultiAttachmentBridgePlan(
  base: BaseRigBridgePlan,
  rigLayout: RigLayout,
  attachmentInput: unknown,
  stateDefinitions: readonly MultiAttachmentStateDefinition[],
  dimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
): MultiAttachmentBridgePlan {
  validateBaseRigBridgePlan(base);
  if (base.rigId !== rigLayout.layoutId) {
    throw new Error(
      `TASK_013R4_INCOMPATIBLE_BASE_RIG: ${base.rigId}->${rigLayout.layoutId}`,
    );
  }
  if (
    stateDefinitions.length !== MULTI_ATTACHMENT_REQUIRED_STATE_IDS.length ||
    MULTI_ATTACHMENT_REQUIRED_STATE_IDS.some(
      (stateId) =>
        !stateDefinitions.some(
          (definition) => definition.stateId === stateId,
        ),
    )
  ) {
    throw new Error("TASK_013R4_STATE_DEFINITIONS_INVALID");
  }
  const orderedStateDefinitions = MULTI_ATTACHMENT_REQUIRED_STATE_IDS.map(
    (stateId) =>
      stateDefinitions.find(
        (definition) => definition.stateId === stateId,
      )!,
  );

  const parsed = parseAttachmentLayout(
    JSON.stringify(attachmentInput),
    rigLayout,
  );
  if (!parsed.ok) {
    throw new Error(
      `TASK_013R4_ATTACHMENT_CONTRACT_INVALID: ${JSON.stringify(parsed.errors)}`,
    );
  }
  const layout = parsed.value;
  const slotIds = new Set(layout.slots.map((slot) => slot.slotId));
  for (const definition of orderedStateDefinitions) {
    if (
      definition.hudLabel.length === 0 ||
      Object.keys(definition.slotEnabled).some(
        (slotId) => !slotIds.has(slotId),
      )
    ) {
      throw new Error(
        `TASK_013R4_STATE_DEFINITION_INVALID: ${definition.stateId}`,
      );
    }
  }
  const resolvedByState = new Map(
    orderedStateDefinitions.map((definition) => [
      definition.stateId,
      resolveAttachmentLayout(layout, definition.slotEnabled),
    ]),
  );
  const defaultResolved = resolveAttachmentLayout(layout);
  const attachments = [...defaultResolved].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder ||
      left.attachmentId.localeCompare(right.attachmentId),
  );
  if (
    attachments.length === 0 ||
    new Set(attachments.map((attachment) => attachment.attachmentId)).size !==
      attachments.length
  ) {
    throw new Error("TASK_013R4_ATTACHMENTS_NOT_UNIQUE");
  }
  const sortingOrders = resolveHarnessProductionSortingOrders([
    ...base.parts.map((part) => ({
      semanticId: part.jointId,
      drawOrder: part.drawOrder,
    })),
    ...attachments.map((attachment) => ({
      semanticId: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
    })),
  ]);
  const defaultEnabledIds = defaultResolved
    .filter((attachment) => attachment.enabled)
    .map((attachment) => attachment.attachmentId)
    .sort();
  const defaultStates = orderedStateDefinitions.filter((definition) => {
    const enabledIds = resolvedByState
      .get(definition.stateId)!
      .filter((attachment) => attachment.enabled)
      .map((attachment) => attachment.attachmentId)
      .sort();
    return JSON.stringify(enabledIds) === JSON.stringify(defaultEnabledIds);
  });
  if (defaultStates.length !== 1) {
    throw new Error("TASK_013R4_DEFAULT_STATE_NOT_UNIQUE");
  }

  const referenceScale = rigLayout.referenceScale;
  return Object.freeze({
    planVersion: "1.0.0",
    rigId: base.rigId,
    defaultStateId: defaultStates[0]!.stateId,
    base,
    baseSortingOrders: Object.freeze(
      Object.fromEntries(
        base.parts.map((part) => [
          part.jointId,
          sortingOrders.get(part.jointId)!,
        ]),
      ),
    ),
    states: Object.freeze(
      orderedStateDefinitions.map((definition) => {
        const enabledAttachmentIds = resolvedByState
          .get(definition.stateId)!
          .filter((attachment) => attachment.enabled)
          .map((attachment) => attachment.attachmentId)
          .sort();
        return Object.freeze({
          stateId: definition.stateId,
          hudLabel: definition.hudLabel,
          enabledAttachmentIds: Object.freeze(enabledAttachmentIds),
        });
      }),
    ),
    slots: Object.freeze(
      [...layout.slots]
        .sort((left, right) => left.slotId.localeCompare(right.slotId))
        .map((slot) => {
          if (!base.parts.some((part) => part.jointId === slot.parentPartId)) {
            throw new Error(
              `TASK_013R4_UNKNOWN_SLOT_PARENT: ${slot.parentPartId}`,
            );
          }
          return Object.freeze({
            slotId: slot.slotId,
            parentPartId: slot.parentPartId,
            transform: requireSingleAttachmentPose(
              slot.transform,
              `slot:${slot.slotId}`,
            ),
          });
        }),
    ),
    attachments: Object.freeze(
      attachments.map((resolved) => {
        const assetDimensions = dimensions[resolved.attachmentId];
        if (
          assetDimensions === undefined ||
          !Number.isInteger(assetDimensions.width) ||
          !Number.isInteger(assetDimensions.height) ||
          assetDimensions.width <= 0 ||
          assetDimensions.height <= 0
        ) {
          throw new Error(
            `TASK_013R4_ATTACHMENT_DIMENSIONS_MISSING: ${resolved.attachmentId}`,
          );
        }
        const slot = layout.slots.find(
          (candidate) => candidate.slotId === resolved.slotId,
        );
        if (slot === undefined) {
          throw new Error(`TASK_013R4_UNKNOWN_SLOT: ${resolved.slotId}`);
        }
        const attachmentSortingOrder = sortingOrders.get(
          resolved.attachmentId,
        );
        if (attachmentSortingOrder === undefined) {
          throw new Error(
            `TASK_013R4_ATTACHMENT_SORTING_MISSING: ${resolved.attachmentId}`,
          );
        }
        return Object.freeze({
          attachmentId: resolved.attachmentId,
          slotId: resolved.slotId,
          parentPartId: resolved.parentPartId,
          resourcePath:
            `${layout.attachmentLayoutId}/${resolved.file.replace(/\.png$/u, "")}/spriteFrame`,
          transform: requireSingleAttachmentPose(
            resolved.attachmentTransform,
            `attachment:${resolved.attachmentId}`,
          ),
          anchor: Object.freeze({ ...resolved.anchor }),
          visualOffset: Object.freeze({
            x:
              (0.5 - resolved.anchor.x) *
              assetDimensions.width *
              referenceScale,
            y:
              (resolved.anchor.y - 0.5) *
              assetDimensions.height *
              referenceScale,
          }),
          visualSize: Object.freeze({
            width: assetDimensions.width * referenceScale,
            height: assetDimensions.height * referenceScale,
          }),
          drawOrder: resolved.drawOrder,
          sortingOrder: attachmentSortingOrder,
          ...(resolved.layerRole === undefined
            ? {}
            : {
                layerRole:
                  resolved.layerRole as MultiAttachmentLayerRole,
              }),
          enabledByState: Object.freeze(
            Object.fromEntries(
              orderedStateDefinitions.map((definition) => {
                const stateAttachment = resolvedByState
                  .get(definition.stateId)!
                  .find(
                    (attachment) =>
                      attachment.attachmentId === resolved.attachmentId,
                  );
                if (stateAttachment === undefined) {
                  throw new Error(
                    `TASK_013R4_ATTACHMENT_STATE_MISSING: ${resolved.attachmentId}:${definition.stateId}`,
                  );
                }
                return [definition.stateId, stateAttachment.enabled];
              }),
            ) as Record<MultiAttachmentStateId, boolean>,
          ),
        });
      }),
    ),
  });
}

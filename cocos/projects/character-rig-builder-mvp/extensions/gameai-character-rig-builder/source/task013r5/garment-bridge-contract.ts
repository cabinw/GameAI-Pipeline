import {
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type Rectangle,
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
  GARMENT_REQUIRED_STATE_IDS,
  type GarmentBridgePlan,
  type GarmentBridgeStateId,
  type GarmentLayerRole,
  type GarmentLocalBounds,
  type GarmentSeamItemPlan,
} from "./garment-bridge-runtime-contract.js";

export * from "./garment-bridge-runtime-contract.js";

export interface GarmentStateDefinition {
  readonly stateId: GarmentBridgeStateId;
  readonly hudLabel: string;
  readonly garmentEnabled: boolean;
  readonly accessoriesEnabled: boolean;
  readonly slotEnabled: Readonly<Record<string, boolean>>;
  readonly wearableSetEnabled: Readonly<Record<string, boolean>>;
}

interface AssetDimensions {
  readonly width: number;
  readonly height: number;
}

function localBounds(
  region: Rectangle,
  dimensions: AssetDimensions,
  referenceScale: number,
): GarmentLocalBounds {
  return Object.freeze({
    left: (region.x - dimensions.width / 2) * referenceScale,
    right:
      (region.x + region.width - dimensions.width / 2) *
      referenceScale,
    bottom:
      (dimensions.height / 2 - region.y - region.height) *
      referenceScale,
    top: (dimensions.height / 2 - region.y) * referenceScale,
  });
}

export function buildGarmentBridgePlan(
  base: BaseRigBridgePlan,
  rigLayout: RigLayout,
  attachmentInput: unknown,
  stateDefinitions: readonly GarmentStateDefinition[],
  baseDimensions: Readonly<Record<string, AssetDimensions>>,
  attachmentDimensions: Readonly<Record<string, AssetDimensions>>,
): GarmentBridgePlan {
  validateBaseRigBridgePlan(base);
  if (base.rigId !== rigLayout.layoutId) {
    throw new Error(
      `TASK_013R5_INCOMPATIBLE_BASE_RIG: ${base.rigId}->${rigLayout.layoutId}`,
    );
  }
  if (
    stateDefinitions.length !== GARMENT_REQUIRED_STATE_IDS.length ||
    GARMENT_REQUIRED_STATE_IDS.some(
      (stateId) =>
        !stateDefinitions.some(
          (definition) => definition.stateId === stateId,
        ),
    )
  ) {
    throw new Error("TASK_013R5_STATE_DEFINITIONS_INVALID");
  }
  const orderedDefinitions = GARMENT_REQUIRED_STATE_IDS.map(
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
      `TASK_013R5_ATTACHMENT_CONTRACT_INVALID: ${JSON.stringify(parsed.errors)}`,
    );
  }
  const layout = parsed.value;
  const slotIds = new Set(layout.slots.map((slot) => slot.slotId));
  const wearableSetIds = new Set(
    (layout.wearableSets ?? []).map((set) => set.wearableSetId),
  );
  if (wearableSetIds.size === 0 || (layout.seams ?? []).length === 0) {
    throw new Error("TASK_013R5_WEARABLE_OR_SEAM_DATA_MISSING");
  }
  for (const definition of orderedDefinitions) {
    if (
      definition.hudLabel.length === 0 ||
      Object.keys(definition.slotEnabled).some(
        (slotId) => !slotIds.has(slotId),
      ) ||
      Object.keys(definition.wearableSetEnabled).some(
        (setId) => !wearableSetIds.has(setId),
      )
    ) {
      throw new Error(
        `TASK_013R5_STATE_DEFINITION_INVALID: ${definition.stateId}`,
      );
    }
  }
  const resolvedByState = new Map(
    orderedDefinitions.map((definition) => [
      definition.stateId,
      resolveAttachmentLayout(
        layout,
        definition.slotEnabled,
        definition.wearableSetEnabled,
      ),
    ]),
  );
  const defaultResolved = resolveAttachmentLayout(layout);
  const attachments = [...defaultResolved].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder ||
      left.attachmentId.localeCompare(right.attachmentId),
  );
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
  const defaultStates = orderedDefinitions.filter((definition) => {
    const enabledIds = resolvedByState
      .get(definition.stateId)!
      .filter((attachment) => attachment.enabled)
      .map((attachment) => attachment.attachmentId)
      .sort();
    return JSON.stringify(enabledIds) === JSON.stringify(defaultEnabledIds);
  });
  if (defaultStates.length !== 1) {
    throw new Error("TASK_013R5_DEFAULT_STATE_NOT_UNIQUE");
  }

  const referenceScale = rigLayout.referenceScale;
  const builtAttachments = attachments.map((resolved) => {
    const dimensions = attachmentDimensions[resolved.attachmentId];
    if (
      dimensions === undefined ||
      !Number.isInteger(dimensions.width) ||
      !Number.isInteger(dimensions.height) ||
      dimensions.width <= 0 ||
      dimensions.height <= 0
    ) {
      throw new Error(
        `TASK_013R5_ATTACHMENT_DIMENSIONS_MISSING: ${resolved.attachmentId}`,
      );
    }
    const slot = layout.slots.find(
      (candidate) => candidate.slotId === resolved.slotId,
    );
    if (slot === undefined) {
      throw new Error(`TASK_013R5_UNKNOWN_SLOT: ${resolved.slotId}`);
    }
    if (!base.parts.some((part) => part.jointId === slot.parentPartId)) {
      throw new Error(
        `TASK_013R5_UNKNOWN_SLOT_PARENT: ${slot.parentPartId}`,
      );
    }
    const sortingOrder = sortingOrders.get(resolved.attachmentId);
    if (sortingOrder === undefined) {
      throw new Error(
        `TASK_013R5_ATTACHMENT_SORTING_MISSING: ${resolved.attachmentId}`,
      );
    }
    return Object.freeze({
      attachmentId: resolved.attachmentId,
      slotId: resolved.slotId,
      parentPartId: resolved.parentPartId,
      category:
        resolved.wearableSetId === undefined
          ? ("accessory" as const)
          : ("wearable" as const),
      ...(resolved.wearableSetId === undefined
        ? {}
        : { wearableSetId: resolved.wearableSetId }),
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
          dimensions.width *
          referenceScale,
        y:
          (resolved.anchor.y - 0.5) *
          dimensions.height *
          referenceScale,
      }),
      visualSize: Object.freeze({
        width: dimensions.width * referenceScale,
        height: dimensions.height * referenceScale,
      }),
      drawOrder: resolved.drawOrder,
      sortingOrder,
      ...(resolved.layerRole === undefined
        ? {}
        : {
            layerRole: resolved.layerRole as GarmentLayerRole,
          }),
      enabledByState: Object.freeze(
        Object.fromEntries(
          orderedDefinitions.map((definition) => {
            const stateAttachment = resolvedByState
              .get(definition.stateId)!
              .find(
                (attachment) =>
                  attachment.attachmentId === resolved.attachmentId,
              );
            if (stateAttachment === undefined) {
              throw new Error(
                `TASK_013R5_ATTACHMENT_STATE_MISSING: ${resolved.attachmentId}:${definition.stateId}`,
              );
            }
            return [definition.stateId, stateAttachment.enabled];
          }),
        ) as Record<GarmentBridgeStateId, boolean>,
      ),
    });
  });
  const attachmentIds = new Set(
    builtAttachments.map((attachment) => attachment.attachmentId),
  );
  const baseIds = new Set(base.parts.map((part) => part.jointId));
  const seamItem = (
    itemId: string,
    region: Rectangle,
    seamId: string,
  ): GarmentSeamItemPlan => {
    const itemKind = attachmentIds.has(itemId)
      ? ("attachment" as const)
      : baseIds.has(itemId)
        ? ("base" as const)
        : null;
    const dimensions =
      itemKind === "attachment"
        ? attachmentDimensions[itemId]
        : itemKind === "base"
          ? baseDimensions[itemId]
          : undefined;
    if (itemKind === null || dimensions === undefined) {
      throw new Error(
        `TASK_013R5_SEAM_ITEM_MISSING: ${seamId}:${itemId}`,
      );
    }
    return Object.freeze({
      itemId,
      itemKind,
      localBounds: localBounds(region, dimensions, referenceScale),
    });
  };

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
    wearableSetIds: Object.freeze([...wearableSetIds].sort()),
    states: Object.freeze(
      orderedDefinitions.map((definition) => {
        const enabledAttachmentIds = resolvedByState
          .get(definition.stateId)!
          .filter((attachment) => attachment.enabled)
          .map((attachment) => attachment.attachmentId)
          .sort();
        return Object.freeze({
          stateId: definition.stateId,
          hudLabel: definition.hudLabel,
          garmentEnabled: definition.garmentEnabled,
          accessoriesEnabled: definition.accessoriesEnabled,
          enabledAttachmentIds: Object.freeze(enabledAttachmentIds),
        });
      }),
    ),
    slots: Object.freeze(
      [...layout.slots]
        .sort((left, right) => left.slotId.localeCompare(right.slotId))
        .map((slot) =>
          Object.freeze({
            slotId: slot.slotId,
            parentPartId: slot.parentPartId,
            transform: requireSingleAttachmentPose(
              slot.transform,
              `slot:${slot.slotId}`,
            ),
          }),
        ),
    ),
    attachments: Object.freeze(builtAttachments),
    seams: Object.freeze(
      [...(layout.seams ?? [])]
        .sort((left, right) => left.seamId.localeCompare(right.seamId))
        .map((seam) =>
          Object.freeze({
            seamId: seam.seamId,
            first: seamItem(
              seam.firstItemId,
              seam.firstRegion,
              seam.seamId,
            ),
            second: seamItem(
              seam.secondItemId,
              seam.secondRegion,
              seam.seamId,
            ),
            minimumOverlap: seam.minimumOverlap,
          }),
        ),
    ),
  });
}

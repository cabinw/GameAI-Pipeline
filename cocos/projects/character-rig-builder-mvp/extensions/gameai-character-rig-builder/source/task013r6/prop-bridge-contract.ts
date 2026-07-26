import {
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type RigLayout,
} from "@gameai/character-contracts";

import {
  resolveHarnessProductionSortingOrders,
} from "../task013r1/harness-sorting-registry.js";
import {
  requireSingleAttachmentPose,
} from "../task013r3/single-attachment-runtime-contract.js";
import {
  validateGarmentBridgePlan,
  type GarmentBridgePlan,
} from "../task013r5/garment-bridge-runtime-contract.js";
import {
  PROP_LEFT_HAND_STATE_ID,
  PROP_NO_PROP_STATE_ID,
  PROP_REQUIRED_STATE_IDS,
  PROP_RIGHT_HAND_STATE_ID,
  propLoadoutStateId,
  validatePropBridgePlan,
  type PropAttachmentKind,
  type PropBridgePlan,
  type PropLayerRole,
  type PropStateId,
} from "./prop-bridge-runtime-contract.js";

export * from "./prop-bridge-runtime-contract.js";

interface AssetDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ResolvedLoadoutStateInput {
  readonly stateId: string;
  readonly garmentStateId: GarmentBridgePlan["states"][number]["stateId"];
  readonly propStateId: PropStateId;
  readonly hudLabel: string;
  readonly enabledAttachmentIds: readonly string[];
}

const PROP_STATE_OVERRIDES: Readonly<
  Record<PropStateId, Readonly<Record<string, boolean>>>
> = Object.freeze({
  [PROP_NO_PROP_STATE_ID]: Object.freeze({
    [PROP_LEFT_HAND_STATE_ID]: false,
    [PROP_RIGHT_HAND_STATE_ID]: false,
  }),
  [PROP_LEFT_HAND_STATE_ID]: Object.freeze({
    [PROP_LEFT_HAND_STATE_ID]: true,
    [PROP_RIGHT_HAND_STATE_ID]: false,
  }),
  [PROP_RIGHT_HAND_STATE_ID]: Object.freeze({
    [PROP_LEFT_HAND_STATE_ID]: false,
    [PROP_RIGHT_HAND_STATE_ID]: true,
  }),
});

function requireResourceRoot(resourceRoot: string): string {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u.test(
      resourceRoot,
    )
  ) {
    throw new Error(
      `TASK_013R6_RESOURCE_ROOT_INVALID: ${resourceRoot}`,
    );
  }
  return resourceRoot;
}

export function buildPropBridgePlan(
  garmentInput: GarmentBridgePlan,
  rigLayout: RigLayout,
  propAttachmentInput: unknown,
  propDimensions: Readonly<Record<string, AssetDimensions>>,
  resourceRoot: string,
  resolvedLoadoutStates: readonly ResolvedLoadoutStateInput[],
): PropBridgePlan {
  const garmentValidation = validateGarmentBridgePlan(garmentInput);
  if (
    garmentInput.rigId !== rigLayout.layoutId ||
    garmentValidation.rigId !== rigLayout.layoutId
  ) {
    throw new Error(
      `TASK_013R6_INCOMPATIBLE_BASE_RIG: ${garmentInput.rigId}->${rigLayout.layoutId}`,
    );
  }
  const parsed = parseAttachmentLayout(
    JSON.stringify(propAttachmentInput),
    rigLayout,
  );
  if (!parsed.ok) {
    throw new Error(
      `TASK_013R6_PROP_CONTRACT_INVALID: ${JSON.stringify(parsed.errors)}`,
    );
  }
  const layout = parsed.value;
  const authoredPropStateIds = (layout.propStates ?? [])
    .map((state) => state.propStateId)
    .sort();
  if (
    JSON.stringify(authoredPropStateIds) !==
      JSON.stringify(
        [PROP_LEFT_HAND_STATE_ID, PROP_RIGHT_HAND_STATE_ID].sort(),
      )
  ) {
    throw new Error("TASK_013R6_PROP_STATES_INVALID");
  }
  const sockets = new Map(
    (rigLayout.sockets ?? []).map((socket) => [socket.socketId, socket]),
  );
  const resolvedByState = new Map(
    PROP_REQUIRED_STATE_IDS.map((stateId) => [
      stateId,
      resolveAttachmentLayout(
        layout,
        {},
        {},
        PROP_STATE_OVERRIDES[stateId],
      ),
    ]),
  );
  const allResolved = resolveAttachmentLayout(
    layout,
    {},
    {},
    PROP_STATE_OVERRIDES[PROP_NO_PROP_STATE_ID],
  );
  const sortingOrders = resolveHarnessProductionSortingOrders([
    ...garmentInput.base.parts.map((part) => ({
      semanticId: part.jointId,
      drawOrder: part.drawOrder,
    })),
    ...garmentInput.attachments.map((attachment) => ({
      semanticId: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
    })),
    ...allResolved.map((attachment) => ({
      semanticId: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
    })),
  ]);
  const garment: GarmentBridgePlan = Object.freeze({
    ...garmentInput,
    baseSortingOrders: Object.freeze(
      Object.fromEntries(
        garmentInput.base.parts.map((part) => [
          part.jointId,
          sortingOrders.get(part.jointId)!,
        ]),
      ),
    ),
    attachments: Object.freeze(
      garmentInput.attachments.map((attachment) =>
        Object.freeze({
          ...attachment,
          sortingOrder: sortingOrders.get(attachment.attachmentId)!,
        }),
      ),
    ),
  });
  validateGarmentBridgePlan(garment);

  const root = requireResourceRoot(resourceRoot);
  const slots = Object.freeze(
    [...layout.slots]
      .sort((left, right) => left.slotId.localeCompare(right.slotId))
      .map((slot) => {
        if (slot.target?.kind !== "socket") {
          throw new Error(
            `TASK_013R6_PROP_SLOT_TARGET_INVALID: ${slot.slotId}`,
          );
        }
        const socket = sockets.get(slot.target.id);
        if (
          socket === undefined ||
          socket.parentPartId !== slot.parentPartId ||
          socket.position.x !== slot.transform.position.x ||
          socket.position.y !== slot.transform.position.y ||
          socket.rotationDegrees !== slot.transform.rotationDegrees
        ) {
          throw new Error(
            `TASK_013R6_HAND_SOCKET_BINDING_INVALID: ${slot.slotId}:${slot.target.id}`,
          );
        }
        return Object.freeze({
          slotId: slot.slotId,
          parentPartId: slot.parentPartId,
          targetSocketId: slot.target.id,
          transform: requireSingleAttachmentPose(
            slot.transform,
            `prop-slot:${slot.slotId}`,
          ),
        });
      }),
  );

  const referenceScale = rigLayout.referenceScale;
  const attachments = Object.freeze(
    allResolved.map((resolved) => {
      const dimensions = propDimensions[resolved.attachmentId];
      const slot = slots.find(
        (candidate) => candidate.slotId === resolved.slotId,
      );
      if (
        dimensions === undefined ||
        !Number.isInteger(dimensions.width) ||
        !Number.isInteger(dimensions.height) ||
        dimensions.width <= 0 ||
        dimensions.height <= 0
      ) {
        throw new Error(
          `TASK_013R6_PROP_DIMENSIONS_MISSING: ${resolved.attachmentId}`,
        );
      }
      if (slot === undefined || resolved.target?.kind !== "socket") {
        throw new Error(
          `TASK_013R6_PROP_SLOT_MISSING: ${resolved.attachmentId}`,
        );
      }
      if (
        resolved.attachmentKind !== "prop" &&
        resolved.attachmentKind !== "hand-overlay"
      ) {
        throw new Error(
          `TASK_013R6_PROP_KIND_INVALID: ${resolved.attachmentId}`,
        );
      }
      if (
        resolved.propStateId !== PROP_LEFT_HAND_STATE_ID &&
        resolved.propStateId !== PROP_RIGHT_HAND_STATE_ID
      ) {
        throw new Error(
          `TASK_013R6_PROP_STATE_INVALID: ${resolved.attachmentId}`,
        );
      }
      const sortingOrder = sortingOrders.get(resolved.attachmentId);
      if (sortingOrder === undefined) {
        throw new Error(
          `TASK_013R6_PROP_SORTING_MISSING: ${resolved.attachmentId}`,
        );
      }
      const gripLocalOffset =
        resolved.gripAnchor === undefined
          ? undefined
          : Object.freeze({
              x:
                (resolved.gripAnchor.x - resolved.anchor.x) *
                dimensions.width *
                referenceScale,
              y:
                (resolved.anchor.y - resolved.gripAnchor.y) *
                dimensions.height *
                referenceScale,
            });
      return Object.freeze({
        attachmentId: resolved.attachmentId,
        slotId: resolved.slotId,
        parentPartId: resolved.parentPartId,
        targetSocketId: slot.targetSocketId,
        propStateId: resolved.propStateId,
        attachmentKind: resolved.attachmentKind as PropAttachmentKind,
        resourcePath:
          `${root}/${resolved.file.replace(/\.png$/u, "")}/spriteFrame`,
        transform: requireSingleAttachmentPose(
          resolved.attachmentTransform,
          `prop-attachment:${resolved.attachmentId}`,
        ),
        anchor: Object.freeze({ ...resolved.anchor }),
        ...(resolved.gripAnchor === undefined
          ? {}
          : { gripAnchor: Object.freeze({ ...resolved.gripAnchor }) }),
        ...(gripLocalOffset === undefined ? {} : { gripLocalOffset }),
        ...(resolved.handOverlayAttachmentId === undefined
          ? {}
          : {
              handOverlayAttachmentId:
                resolved.handOverlayAttachmentId,
            }),
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
        layerRole: resolved.layerRole as PropLayerRole,
        enabledByPropState: Object.freeze(
          Object.fromEntries(
            PROP_REQUIRED_STATE_IDS.map((stateId) => {
              const stateAttachment = resolvedByState
                .get(stateId)!
                .find(
                  (candidate) =>
                    candidate.attachmentId === resolved.attachmentId,
                );
              if (stateAttachment === undefined) {
                throw new Error(
                  `TASK_013R6_PROP_STATE_ATTACHMENT_MISSING: ${resolved.attachmentId}:${stateId}`,
                );
              }
              return [stateId, stateAttachment.enabled];
            }),
          ) as Record<PropStateId, boolean>,
        ),
      });
    }),
  );

  for (const attachment of attachments) {
    if (attachment.attachmentKind !== "prop") continue;
    const overlay = attachments.find(
      (candidate) =>
        candidate.attachmentId === attachment.handOverlayAttachmentId,
    );
    if (
      overlay?.attachmentKind !== "hand-overlay" ||
      overlay.propStateId !== attachment.propStateId ||
      overlay.slotId !== attachment.slotId
    ) {
      throw new Error(
        `TASK_013R6_LINKED_OVERLAY_INVALID: ${attachment.attachmentId}`,
      );
    }
  }

  const states = Object.freeze(
    [...resolvedLoadoutStates]
      .sort((left, right) => left.stateId.localeCompare(right.stateId))
      .map((resolvedState) => {
        const garmentState = garment.states.find(
          (candidate) =>
            candidate.stateId === resolvedState.garmentStateId,
        );
        if (
          garmentState === undefined ||
          !PROP_REQUIRED_STATE_IDS.includes(resolvedState.propStateId) ||
          resolvedState.stateId !==
            propLoadoutStateId(
              resolvedState.garmentStateId,
              resolvedState.propStateId,
            )
        ) {
          throw new Error(
            `TASK_013R7_ENGINE_NEUTRAL_LOADOUT_STATE_INVALID: ${resolvedState.stateId}`,
          );
        }
        const propStateId = resolvedState.propStateId;
        const enabledPropAttachmentIds = attachments
          .filter(
            (attachment) =>
              attachment.enabledByPropState[propStateId],
          )
          .map((attachment) => attachment.attachmentId)
          .sort();
        const activePrimaryPropCount = attachments.filter(
          (attachment) =>
            attachment.attachmentKind === "prop" &&
            attachment.enabledByPropState[propStateId],
        ).length;
        const propLabel =
          propStateId === PROP_NO_PROP_STATE_ID
            ? "No Prop"
            : propStateId === PROP_LEFT_HAND_STATE_ID
              ? "Left Prop"
              : "Right Prop";
        const expectedEnabledIds = [
          ...garmentState.enabledAttachmentIds,
          ...enabledPropAttachmentIds,
        ].sort();
        if (
          JSON.stringify([...resolvedState.enabledAttachmentIds].sort()) !==
          JSON.stringify(expectedEnabledIds)
        ) {
          throw new Error(
            `TASK_013R7_ENGINE_NEUTRAL_LOADOUT_PARITY_MISMATCH: ${resolvedState.stateId}`,
          );
        }
        return Object.freeze({
          stateId: resolvedState.stateId as ReturnType<
            typeof propLoadoutStateId
          >,
          garmentStateId: resolvedState.garmentStateId,
          propStateId,
          hudLabel:
            resolvedState.hudLabel ||
            `${garmentState.hudLabel} / ${propLabel}`,
          enabledGarmentAttachmentIds:
            garmentState.enabledAttachmentIds,
          enabledPropAttachmentIds: Object.freeze(
            enabledPropAttachmentIds,
          ),
          activePrimaryPropCount,
        });
      }),
  );

  const plan: PropBridgePlan = Object.freeze({
    planVersion: "1.0.0",
    rigId: garment.rigId,
    defaultGarmentStateId: garment.defaultStateId,
    defaultPropStateId: PROP_NO_PROP_STATE_ID,
    defaultStateId: propLoadoutStateId(
      garment.defaultStateId,
      PROP_NO_PROP_STATE_ID,
    ),
    garment,
    states,
    slots,
    attachments,
  });
  validatePropBridgePlan(plan);
  return plan;
}

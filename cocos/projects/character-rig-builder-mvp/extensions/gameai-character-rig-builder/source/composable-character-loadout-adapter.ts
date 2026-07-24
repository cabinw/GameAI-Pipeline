import {
  resolveCharacterLoadout,
  validateSemanticClipIds,
  type CharacterLoadoutContract,
  type RigLayout,
} from "@gameai/character-contracts";
import type { RigAnimation } from "@gameai/rig-animation";

import {
  buildCocosProductionLiteCharacterPlan,
  type CocosProductionLiteCharacterPlan,
} from "./production-lite-character-adapter";

export interface CocosComposableCharacterLoadoutPlan {
  readonly planVersion: "1.0.0";
  readonly loadoutId: string;
  readonly base: Omit<CocosProductionLiteCharacterPlan, "parts"> & {
    readonly parts: readonly (CocosProductionLiteCharacterPlan["parts"][number] & {
      readonly sortingOrder: number;
    })[];
  };
  readonly states: Readonly<
    Record<
      string,
      Readonly<{
        enabledAttachmentIds: readonly string[];
        globalLayerIds: readonly string[];
      }>
    >
  >;
  readonly slots: readonly CharacterLoadoutContract["families"][number]["attachmentLayout"]["slots"][number][];
  readonly attachments: readonly {
    readonly attachmentId: string;
    readonly familyId: string;
    readonly slotId: string;
    readonly parentPartId: string;
    readonly resourcePath: string;
    readonly transform: Readonly<{
      position: Readonly<{ x: number; y: number }>;
      rotationDegrees: number;
      scale: Readonly<{ x: number; y: number }>;
    }>;
    readonly anchor: Readonly<{ x: number; y: number }>;
    readonly visualSize: Readonly<{ width: number; height: number }>;
    readonly visualOffset: Readonly<{ x: number; y: number }>;
    readonly drawOrder: number;
    readonly sortingOrder: number;
    readonly attachmentKind?: string;
    readonly layerRole?: string;
    readonly propStateId?: string;
    readonly handOverlayAttachmentId?: string;
    readonly gripAnchor?: Readonly<{ x: number; y: number }>;
  }[];
  readonly referenceResourcePaths: Readonly<Record<string, string>>;
  readonly reconstructionStatus: Readonly<
    Record<string, "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS">
  >;
}

export function buildCocosComposableCharacterLoadoutPlan(
  rigLayout: RigLayout,
  contract: CharacterLoadoutContract,
  clips: readonly RigAnimation[],
  baseAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
  attachmentAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
  resourceRoot: string,
  exactReferenceStateIds: readonly string[],
): CocosComposableCharacterLoadoutPlan {
  validateSemanticClipIds(contract.requiredSemanticClipIds, clips);
  const base = buildCocosProductionLiteCharacterPlan(
    rigLayout,
    clips,
    baseAssetDimensions,
  );
  const familyByAttachmentId = new Map<string, string>();
  const allAttachments = contract.families.flatMap((family) =>
    family.attachmentLayout.attachments.map((attachment) => {
      familyByAttachmentId.set(attachment.attachmentId, family.familyId);
      return attachment;
    }),
  );
  const combinedOrder = [
    ...rigLayout.parts.map((part) => ({
      id: part.partId,
      drawOrder: part.drawOrder,
    })),
    ...allAttachments.map((attachment) => ({
      id: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
    })),
  ].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder || left.id.localeCompare(right.id),
  );
  const sortingOrder = new Map(
    combinedOrder.map((entry, index) => [entry.id, index] as const),
  );
  const slots = contract.families
    .flatMap((family) => family.attachmentLayout.slots)
    .sort((left, right) => left.slotId.localeCompare(right.slotId));
  const slotById = new Map(slots.map((slot) => [slot.slotId, slot] as const));
  const attachments = allAttachments
    .sort(
      (left, right) =>
        left.drawOrder - right.drawOrder ||
        left.attachmentId.localeCompare(right.attachmentId),
    )
    .map((attachment) => {
      const dimensions = attachmentAssetDimensions[attachment.attachmentId];
      const slot = slotById.get(attachment.slotId);
      if (dimensions === undefined || dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error(`LOADOUT_ASSET_DIMENSIONS_MISSING:${attachment.attachmentId}`);
      }
      if (slot === undefined) {
        throw new Error(`LOADOUT_SLOT_MISSING:${attachment.slotId}`);
      }
      return Object.freeze({
        attachmentId: attachment.attachmentId,
        familyId: familyByAttachmentId.get(attachment.attachmentId)!,
        slotId: attachment.slotId,
        parentPartId: slot.parentPartId,
        resourcePath: `${resourceRoot}/${attachment.file.replace(/\.png$/, "")}/spriteFrame`,
        transform: Object.freeze({
          position: Object.freeze({ ...attachment.transform.position }),
          rotationDegrees: attachment.transform.rotationDegrees,
          scale: Object.freeze({ ...attachment.transform.scale }),
        }),
        anchor: Object.freeze({ ...attachment.anchor }),
        visualSize: Object.freeze({
          width: dimensions.width * rigLayout.referenceScale,
          height: dimensions.height * rigLayout.referenceScale,
        }),
        visualOffset: Object.freeze({
          x:
            (0.5 - attachment.anchor.x) *
            dimensions.width *
            rigLayout.referenceScale,
          y:
            (attachment.anchor.y - 0.5) *
            dimensions.height *
            rigLayout.referenceScale,
        }),
        drawOrder: attachment.drawOrder,
        sortingOrder: sortingOrder.get(attachment.attachmentId)!,
        ...(attachment.attachmentKind === undefined
          ? {}
          : { attachmentKind: attachment.attachmentKind }),
        ...(attachment.layerRole === undefined
          ? {}
          : { layerRole: attachment.layerRole }),
        ...(attachment.propStateId === undefined
          ? {}
          : { propStateId: attachment.propStateId }),
        ...(attachment.handOverlayAttachmentId === undefined
          ? {}
          : { handOverlayAttachmentId: attachment.handOverlayAttachmentId }),
        ...(attachment.gripAnchor === undefined
          ? {}
          : { gripAnchor: Object.freeze({ ...attachment.gripAnchor }) }),
      });
    });
  const states = Object.fromEntries(
    [...contract.states]
      .sort((left, right) => left.stateId.localeCompare(right.stateId))
      .map((state) => {
        const resolved = resolveCharacterLoadout(
          rigLayout,
          contract,
          state.stateId,
        );
        return [
          state.stateId,
          Object.freeze({
            enabledAttachmentIds: Object.freeze(
              resolved.enabledAttachments.map(
                (attachment) => attachment.attachmentId,
              ),
            ),
            globalLayerIds: Object.freeze(
              resolved.globalLayers.map((layer) => layer.itemId),
            ),
          }),
        ];
      }),
  );
  const exact = "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS" as const;
  return Object.freeze({
    planVersion: "1.0.0",
    loadoutId: contract.loadoutId,
    base: Object.freeze({
      ...base,
      parts: Object.freeze(
        base.parts.map((part) =>
          Object.freeze({
            ...part,
            sortingOrder: sortingOrder.get(part.jointId)!,
          }),
        ),
      ),
    }),
    states: Object.freeze(states),
    slots: Object.freeze(slots),
    attachments: Object.freeze(attachments),
    referenceResourcePaths: Object.freeze(
      Object.fromEntries(
        exactReferenceStateIds.map((stateId) => [
          stateId,
          `${resourceRoot}/reference/${stateId}/spriteFrame`,
        ]),
      ),
    ),
    reconstructionStatus: Object.freeze(
      Object.fromEntries(exactReferenceStateIds.map((stateId) => [stateId, exact])),
    ),
  });
}

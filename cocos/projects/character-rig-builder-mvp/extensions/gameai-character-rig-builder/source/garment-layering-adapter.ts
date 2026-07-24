import {
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type AttachmentLayout,
  type RigLayout,
} from "@gameai/character-contracts";
import type { RigAnimation } from "@gameai/rig-animation";

import {
  buildCocosProductionLiteCharacterPlan,
  type CocosProductionLiteCharacterPlan,
} from "./production-lite-character-adapter";

export interface CocosGarmentLayeringPlan {
  readonly planVersion: "1.0.0";
  readonly base: Omit<CocosProductionLiteCharacterPlan, "parts"> & {
    readonly parts: readonly (CocosProductionLiteCharacterPlan["parts"][number] & {
      readonly sortingOrder: number;
    })[];
  };
  readonly wearableSets: Readonly<NonNullable<AttachmentLayout["wearableSets"]>>;
  readonly slots: Readonly<AttachmentLayout["slots"]>;
  readonly seams: Readonly<NonNullable<AttachmentLayout["seams"]>>;
  readonly attachments: readonly {
    readonly attachmentId: string;
    readonly slotId: string;
    readonly parentPartId: string;
    readonly wearableSetId?: string;
    readonly resourcePath: string;
    readonly transform: AttachmentLayout["attachments"][number]["transform"];
    readonly anchor: AttachmentLayout["attachments"][number]["anchor"];
    readonly visualOffset: Readonly<{ x: number; y: number }>;
    readonly visualSize: Readonly<{ width: number; height: number }>;
    readonly drawOrder: number;
    readonly sortingOrder: number;
    readonly layerRole?: "back" | "middle" | "front" | "cover";
  }[];
  readonly referenceResourcePaths: Readonly<Record<string, string>>;
  readonly reconstructionStatus: Readonly<
    Record<string, "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS">
  >;
}

export function buildCocosGarmentLayeringPlan(
  rigLayout: RigLayout,
  attachmentInput: unknown,
  clips: readonly RigAnimation[],
  baseAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
  attachmentAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
): CocosGarmentLayeringPlan {
  const parsed = parseAttachmentLayout(JSON.stringify(attachmentInput), rigLayout);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  const attachmentLayout = parsed.value;
  const resolved = resolveAttachmentLayout(attachmentLayout);
  const combinedOrder = [
    ...rigLayout.parts.map((part) => ({
      id: part.partId,
      drawOrder: part.drawOrder,
    })),
    ...resolved.map((attachment) => ({
      id: attachment.attachmentId,
      drawOrder: attachment.drawOrder,
    })),
  ].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder || left.id.localeCompare(right.id),
  );
  const sortingOrders = new Map(
    combinedOrder.map((entry, index) => [entry.id, index] as const),
  );
  const base = buildCocosProductionLiteCharacterPlan(
    rigLayout,
    clips,
    baseAssetDimensions,
  );
  const attachments = resolved.map((attachment) => {
    const dimensions = attachmentAssetDimensions[attachment.attachmentId];
    if (dimensions === undefined || dimensions.width <= 0 || dimensions.height <= 0) {
      throw new Error(`GARMENT_ASSET_DIMENSIONS_MISSING:${attachment.attachmentId}`);
    }
    return Object.freeze({
      attachmentId: attachment.attachmentId,
      slotId: attachment.slotId,
      parentPartId: attachment.parentPartId,
      ...(attachment.wearableSetId === undefined
        ? {}
        : { wearableSetId: attachment.wearableSetId }),
      resourcePath:
        `production-lite-garment-layering/${attachment.file.replace(/\.png$/, "")}/spriteFrame`,
      transform: attachment.attachmentTransform,
      anchor: attachment.anchor,
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
      visualSize: Object.freeze({
        width: dimensions.width * rigLayout.referenceScale,
        height: dimensions.height * rigLayout.referenceScale,
      }),
      drawOrder: attachment.drawOrder,
      sortingOrder: sortingOrders.get(attachment.attachmentId)!,
      ...(attachment.layerRole === undefined
        ? {}
        : { layerRole: attachment.layerRole }),
    });
  });
  const exact = "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS" as const;
  const variants = [
    "base",
    "jacket-only",
    "accessories-only",
    "jacket-and-accessories",
  ];
  return Object.freeze({
    planVersion: "1.0.0",
    base: Object.freeze({
      ...base,
      parts: Object.freeze(
        base.parts.map((part) =>
          Object.freeze({
            ...part,
            sortingOrder: sortingOrders.get(part.jointId)!,
          }),
        ),
      ),
    }),
    wearableSets: Object.freeze(attachmentLayout.wearableSets ?? []),
    slots: Object.freeze(attachmentLayout.slots),
    seams: Object.freeze(attachmentLayout.seams ?? []),
    attachments: Object.freeze(attachments),
    referenceResourcePaths: Object.freeze(
      Object.fromEntries(
        variants.map((variant) => [
          variant,
          `production-lite-garment-layering/reference/${variant}/spriteFrame`,
        ]),
      ),
    ),
    reconstructionStatus: Object.freeze(
      Object.fromEntries(variants.map((variant) => [variant, exact])),
    ),
  });
}

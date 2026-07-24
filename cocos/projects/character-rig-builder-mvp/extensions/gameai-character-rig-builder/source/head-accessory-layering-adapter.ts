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

export interface CocosAttachmentSlotPlan {
  readonly slotId: string;
  readonly parentPartId: string;
  readonly transform: AttachmentLayout["slots"][number]["transform"];
  readonly defaultEnabled: boolean;
}

export interface CocosAttachmentPlan {
  readonly attachmentId: string;
  readonly slotId: string;
  readonly parentPartId: string;
  readonly resourcePath: string;
  readonly transform: AttachmentLayout["attachments"][number]["transform"];
  readonly anchor: AttachmentLayout["attachments"][number]["anchor"];
  readonly visualOffset: Readonly<{ x: number; y: number }>;
  readonly visualSize: Readonly<{ width: number; height: number }>;
  readonly drawOrder: number;
  readonly sortingOrder: number;
  readonly layerRole?: "back" | "middle" | "front" | "cover";
}

export interface CocosHeadAccessoryLayeringPlan {
  readonly planVersion: "1.0.0";
  readonly base: Omit<CocosProductionLiteCharacterPlan, "parts"> & {
    readonly parts: readonly (CocosProductionLiteCharacterPlan["parts"][number] & {
      readonly sortingOrder: number;
    })[];
  };
  readonly slots: readonly CocosAttachmentSlotPlan[];
  readonly attachments: readonly CocosAttachmentPlan[];
  readonly referenceResourcePaths: Readonly<Record<string, string>>;
  readonly reconstructionStatus: Readonly<Record<string, "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM">>;
}

export function buildCocosHeadAccessoryLayeringPlan(
  rigLayout: RigLayout,
  attachmentInput: unknown,
  clips: readonly RigAnimation[],
  baseAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
  attachmentAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
): CocosHeadAccessoryLayeringPlan {
  const parsedAttachmentLayout = parseAttachmentLayout(
    JSON.stringify(attachmentInput),
    rigLayout,
  );
  if (!parsedAttachmentLayout.ok) {
    throw new Error(JSON.stringify(parsedAttachmentLayout.errors));
  }
  const attachmentLayout = parsedAttachmentLayout.value;
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
    if (
      dimensions === undefined ||
      !Number.isInteger(dimensions.width) ||
      !Number.isInteger(dimensions.height) ||
      dimensions.width <= 0 ||
      dimensions.height <= 0
    ) {
      throw new Error(
        `HEAD_ACCESSORY_ASSET_DIMENSIONS_MISSING:${attachment.attachmentId}`,
      );
    }
    return Object.freeze({
      attachmentId: attachment.attachmentId,
      slotId: attachment.slotId,
      parentPartId: attachment.parentPartId,
      resourcePath:
        `production-lite-head-accessories/${attachment.file.replace(/\.png$/, "")}/spriteFrame`,
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

  const exact = "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM" as const;
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
    slots: Object.freeze(
      attachmentLayout.slots.map((slot) =>
        Object.freeze({
          slotId: slot.slotId,
          parentPartId: slot.parentPartId,
          transform: slot.transform,
          defaultEnabled: slot.defaultEnabled,
        }),
      ),
    ),
    attachments: Object.freeze(attachments),
    referenceResourcePaths: Object.freeze({
      base: "production-lite-head-accessories/reference/base/spriteFrame",
      "cap-only":
        "production-lite-head-accessories/reference/cap-only/spriteFrame",
      "sunglasses-only":
        "production-lite-head-accessories/reference/sunglasses-only/spriteFrame",
      "cap-and-sunglasses":
        "production-lite-head-accessories/reference/cap-and-sunglasses/spriteFrame",
    }),
    reconstructionStatus: Object.freeze({
      base: exact,
      "cap-only": exact,
      "sunglasses-only": exact,
      "cap-and-sunglasses": exact,
    }),
  });
}

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

export interface CocosOneHandedPropPlan {
  readonly planVersion: "1.0.0";
  readonly base: Omit<CocosProductionLiteCharacterPlan, "parts"> & {
    readonly parts: readonly (CocosProductionLiteCharacterPlan["parts"][number] & {
      readonly sortingOrder: number;
    })[];
  };
  readonly sockets: Readonly<NonNullable<RigLayout["sockets"]>>;
  readonly propStates: Readonly<NonNullable<AttachmentLayout["propStates"]>>;
  readonly slots: Readonly<AttachmentLayout["slots"]>;
  readonly attachments: readonly {
    readonly attachmentId: string;
    readonly slotId: string;
    readonly parentPartId: string;
    readonly target?: Readonly<{ kind: string; id: string }>;
    readonly propStateId?: string;
    readonly attachmentKind?: string;
    readonly handOverlayAttachmentId?: string;
    readonly resourcePath: string;
    readonly transform: AttachmentLayout["attachments"][number]["transform"];
    readonly anchor: AttachmentLayout["attachments"][number]["anchor"];
    readonly gripAnchor?: AttachmentLayout["attachments"][number]["gripAnchor"];
    readonly visualOffset: Readonly<{ x: number; y: number }>;
    readonly visualSize: Readonly<{ width: number; height: number }>;
    readonly drawOrder: number;
    readonly sortingOrder: number;
    readonly layerRole?: string;
  }[];
  readonly referenceResourcePaths: Readonly<Record<string, string>>;
  readonly reconstructionStatus: Readonly<
    Record<string, "EXACT · 0 RGBA / 0 ALPHA / 0 SEAM / 0 BOUNDS">
  >;
}

export function buildCocosOneHandedPropPlan(
  rigLayout: RigLayout,
  attachmentInput: unknown,
  clips: readonly RigAnimation[],
  baseAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
  attachmentAssetDimensions: Readonly<
    Record<string, Readonly<{ width: number; height: number }>>
  >,
): CocosOneHandedPropPlan {
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
      throw new Error(`PROP_ASSET_DIMENSIONS_MISSING:${attachment.attachmentId}`);
    }
    return Object.freeze({
      attachmentId: attachment.attachmentId,
      slotId: attachment.slotId,
      parentPartId: attachment.parentPartId,
      ...(attachment.target === undefined ? {} : { target: attachment.target }),
      ...(attachment.propStateId === undefined
        ? {}
        : { propStateId: attachment.propStateId }),
      ...(attachment.attachmentKind === undefined
        ? {}
        : { attachmentKind: attachment.attachmentKind }),
      ...(attachment.handOverlayAttachmentId === undefined
        ? {}
        : { handOverlayAttachmentId: attachment.handOverlayAttachmentId }),
      resourcePath:
        `production-lite-one-handed-prop/${attachment.file.replace(/\.png$/, "")}/spriteFrame`,
      transform: attachment.attachmentTransform,
      anchor: attachment.anchor,
      ...(attachment.gripAnchor === undefined
        ? {}
        : { gripAnchor: attachment.gripAnchor }),
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
  const variants = ["no-prop", "left-hand", "right-hand"];
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
    sockets: Object.freeze(rigLayout.sockets ?? []),
    propStates: Object.freeze(attachmentLayout.propStates ?? []),
    slots: Object.freeze(attachmentLayout.slots),
    attachments: Object.freeze(attachments),
    referenceResourcePaths: Object.freeze(
      Object.fromEntries(
        variants.map((variant) => [
          variant,
          `production-lite-one-handed-prop/reference/${variant}/spriteFrame`,
        ]),
      ),
    ),
    reconstructionStatus: Object.freeze(
      Object.fromEntries(variants.map((variant) => [variant, exact])),
    ),
  });
}

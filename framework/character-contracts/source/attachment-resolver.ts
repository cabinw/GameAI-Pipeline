import type {
  AffineTransform2D,
  AttachmentLayout,
  AttachmentTransform,
  ResolvedAttachment,
} from "./types";

function round(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

function matrix(transform: AttachmentTransform): AffineTransform2D {
  const radians = (transform.rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return Object.freeze({
    a: round(cosine * transform.scale.x),
    b: round(sine * transform.scale.x),
    c: round(-sine * transform.scale.y),
    d: round(cosine * transform.scale.y),
    tx: round(transform.position.x),
    ty: round(transform.position.y),
  });
}

export function multiplyAttachmentTransforms(
  parent: AffineTransform2D,
  local: AffineTransform2D,
): AffineTransform2D {
  return Object.freeze({
    a: round(parent.a * local.a + parent.c * local.b),
    b: round(parent.b * local.a + parent.d * local.b),
    c: round(parent.a * local.c + parent.c * local.d),
    d: round(parent.b * local.c + parent.d * local.d),
    tx: round(parent.a * local.tx + parent.c * local.ty + parent.tx),
    ty: round(parent.b * local.tx + parent.d * local.ty + parent.ty),
  });
}

export function composeAttachmentWorldTransform(
  parentWorld: AffineTransform2D,
  slotTransform: AttachmentTransform,
  attachmentTransform: AttachmentTransform,
): AffineTransform2D {
  return multiplyAttachmentTransforms(
    multiplyAttachmentTransforms(parentWorld, matrix(slotTransform)),
    matrix(attachmentTransform),
  );
}

export function resolveAttachmentLayout(
  layout: AttachmentLayout,
  slotOverrides: Readonly<Record<string, boolean>> = {},
  wearableSetOverrides: Readonly<Record<string, boolean>> = {},
): readonly ResolvedAttachment[] {
  const slots = new Map(layout.slots.map((slot) => [slot.slotId, slot] as const));
  const wearableSets = new Map(
    (layout.wearableSets ?? []).map(
      (wearableSet) => [wearableSet.wearableSetId, wearableSet] as const,
    ),
  );
  return Object.freeze(
    [...layout.attachments]
      .sort(
        (left, right) =>
          left.drawOrder - right.drawOrder ||
          left.attachmentId.localeCompare(right.attachmentId),
      )
      .map((attachment) => {
        const slot = slots.get(attachment.slotId);
        if (slot === undefined) {
          throw new Error(`UNKNOWN_ATTACHMENT_SLOT:${attachment.slotId}`);
        }
        const slotEnabled = slotOverrides[slot.slotId] ?? slot.defaultEnabled;
        const wearableSet =
          attachment.wearableSetId === undefined
            ? undefined
            : wearableSets.get(attachment.wearableSetId);
        if (attachment.wearableSetId !== undefined && wearableSet === undefined) {
          throw new Error(`UNKNOWN_WEARABLE_SET:${attachment.wearableSetId}`);
        }
        const setEnabled =
          wearableSet === undefined
            ? true
            : (wearableSetOverrides[wearableSet.wearableSetId] ??
              wearableSet.defaultEnabled);
        const enabled = slotEnabled && setEnabled;
        return Object.freeze({
          attachmentId: attachment.attachmentId,
          slotId: slot.slotId,
          parentPartId: slot.parentPartId,
          file: attachment.file,
          slotTransform: Object.freeze({
            position: Object.freeze({ ...slot.transform.position }),
            rotationDegrees: slot.transform.rotationDegrees,
            scale: Object.freeze({ ...slot.transform.scale }),
          }),
          attachmentTransform: Object.freeze({
            position: Object.freeze({ ...attachment.transform.position }),
            rotationDegrees: attachment.transform.rotationDegrees,
            scale: Object.freeze({ ...attachment.transform.scale }),
          }),
          anchor: Object.freeze({ ...attachment.anchor }),
          drawOrder: attachment.drawOrder,
          ...(attachment.wearableSetId === undefined
            ? {}
            : { wearableSetId: attachment.wearableSetId }),
          ...(attachment.layerRole === undefined
            ? {}
            : { layerRole: attachment.layerRole }),
          enabled,
        });
      }),
  );
}

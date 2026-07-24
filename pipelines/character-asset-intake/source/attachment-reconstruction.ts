import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  composeAttachmentWorldTransform,
  resolveAttachmentLayout,
  type AttachmentLayout,
} from "@gameai/character-contracts";
import {
  evaluateRigPose,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
import sharp from "sharp";

import type {
  ProductionLiteLayout,
  ReconstructionMetrics,
  ReconstructionResult,
  ReconstructionTolerance,
} from "./production-lite-reconstruction";

const ZERO_TOLERANCE: ReconstructionTolerance = Object.freeze({
  rgbaMismatchPixels: 0,
  alphaMismatchPixels: 0,
  boundsExpansionPixels: 0,
  seamMismatchPixels: 0,
});

interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function alphaBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0
    ? null
    : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function boundsExpansion(reference: Bounds | null, actual: Bounds | null): number {
  if (reference === null) return actual === null ? 0 : actual.width * actual.height;
  if (actual === null) return 0;
  return Math.max(
    0,
    reference.x - actual.x,
    reference.y - actual.y,
    actual.x + actual.width - (reference.x + reference.width),
    actual.y + actual.height - (reference.y + reference.height),
  );
}

export async function reconstructAttachmentVariant(
  baseAssetRoot: string,
  accessoryAssetRoot: string,
  rigLayout: ProductionLiteLayout & {
    readonly layoutId: string;
    readonly schemaVersion: string;
  },
  attachmentLayout: AttachmentLayout,
  slotOverrides: Readonly<Record<string, boolean>>,
  referencePng: Buffer,
  tolerance: ReconstructionTolerance = ZERO_TOLERANCE,
  wearableSetOverrides: Readonly<Record<string, boolean>> = {},
  propStateOverrides: Readonly<Record<string, boolean>> = {},
): Promise<ReconstructionResult> {
  const diagnostics: string[] = [];
  const hierarchy: RigHierarchyJoint[] = rigLayout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: {
      position: { ...part.restPose.position },
      rotationDegrees: part.restPose.rotationDegrees,
      scale: { ...part.restPose.scale },
    },
  }));
  let pose: ReturnType<typeof evaluateRigPose> | null = null;
  try {
    pose = evaluateRigPose(hierarchy);
  } catch {
    diagnostics.push("ATTACHMENT_RECONSTRUCTION_HIERARCHY_INVALID");
  }

  const items: Array<{
    id: string;
    drawOrder: number;
    svg: string;
  }> = [];
  const scale = rigLayout.referenceScale;
  const canvas = rigLayout.sourceCanvas;
  if (pose !== null) {
    for (const part of rigLayout.parts) {
      let png: Buffer;
      try {
        png = await readFile(path.join(baseAssetRoot, part.file));
      } catch {
        diagnostics.push(`ATTACHMENT_RECONSTRUCTION_BASE_PART_MISSING:${part.partId}`);
        continue;
      }
      const metadata = await sharp(png).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const transform = pose.joints[part.partId]!.worldTransform;
      const jointSourceX =
        part.originalRect.x + part.anchor.x * part.originalRect.width;
      const jointSourceY =
        part.originalRect.y + part.anchor.y * part.originalRect.height;
      const localX =
        (part.originalRect.x + part.trimOffset.x - jointSourceX) * scale;
      const localY =
        (jointSourceY - part.originalRect.y - part.trimOffset.y) * scale;
      const e =
        (transform.a * localX + transform.c * localY + transform.tx) / scale +
        canvas.width / 2;
      const f =
        canvas.height / 2 -
        (transform.b * localX + transform.d * localY + transform.ty) / scale;
      items.push({
        id: part.partId,
        drawOrder: part.drawOrder,
        svg: `<image width="${width}" height="${height}" href="data:image/png;base64,${png.toString("base64")}" opacity="${part.restPose.opacity}" transform="matrix(${transform.a} ${-transform.b} ${-transform.c} ${transform.d} ${e} ${f})"/>`,
      });
    }

    for (const attachment of resolveAttachmentLayout(
      attachmentLayout,
      slotOverrides,
      wearableSetOverrides,
      propStateOverrides,
    )) {
      if (!attachment.enabled) continue;
      let png: Buffer;
      try {
        png = await readFile(path.join(accessoryAssetRoot, attachment.file));
      } catch {
        diagnostics.push(
          `ATTACHMENT_RECONSTRUCTION_FILE_MISSING:${attachment.attachmentId}`,
        );
        continue;
      }
      const metadata = await sharp(png).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const parentWorld = pose.joints[attachment.parentPartId]?.worldTransform;
      if (parentWorld === undefined) {
        diagnostics.push(
          `ATTACHMENT_RECONSTRUCTION_PARENT_MISSING:${attachment.parentPartId}`,
        );
        continue;
      }
      const transform = composeAttachmentWorldTransform(
        parentWorld,
        attachment.slotTransform,
        attachment.attachmentTransform,
      );
      const localX = -attachment.anchor.x * width * scale;
      const localY = attachment.anchor.y * height * scale;
      const e =
        (transform.a * localX + transform.c * localY + transform.tx) / scale +
        canvas.width / 2;
      const f =
        canvas.height / 2 -
        (transform.b * localX + transform.d * localY + transform.ty) / scale;
      items.push({
        id: attachment.attachmentId,
        drawOrder: attachment.drawOrder,
        svg: `<image width="${width}" height="${height}" href="data:image/png;base64,${png.toString("base64")}" transform="matrix(${transform.a} ${-transform.b} ${-transform.c} ${transform.d} ${e} ${f})"/>`,
      });
    }
  }

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><g style="image-rendering:pixelated">${items
      .sort(
        (left, right) =>
          left.drawOrder - right.drawOrder || left.id.localeCompare(right.id),
      )
      .map((item) => item.svg)
      .join("")}</g></svg>`,
  );
  const reconstructed = await sharp(svg)
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const [reference, actual] = await Promise.all([
    sharp(referencePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(reconstructed).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const pixels = Math.min(
    reference.info.width * reference.info.height,
    actual.info.width * actual.info.height,
  );
  const diff = Buffer.alloc(reference.data.length);
  let rgbaMismatchPixels = 0;
  let alphaMismatchPixels = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    let mismatch = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(
        reference.data[offset + channel]! - actual.data[offset + channel]!,
      );
      diff[offset + channel] = channel === 3 ? 255 : delta;
      if (delta !== 0) mismatch = true;
    }
    if (mismatch) rgbaMismatchPixels += 1;
    if (reference.data[offset + 3] !== actual.data[offset + 3]) {
      alphaMismatchPixels += 1;
    }
  }
  const referenceBounds = alphaBounds(
    reference.data,
    reference.info.width,
    reference.info.height,
    reference.info.channels,
  );
  const reconstructedBounds = alphaBounds(
    actual.data,
    actual.info.width,
    actual.info.height,
    actual.info.channels,
  );
  const expansion = boundsExpansion(referenceBounds, reconstructedBounds);
  const seamMismatchPixels = alphaMismatchPixels;
  if (rgbaMismatchPixels > tolerance.rgbaMismatchPixels) {
    diagnostics.push("ATTACHMENT_RECONSTRUCTION_RGBA_MISMATCH");
  }
  if (alphaMismatchPixels > tolerance.alphaMismatchPixels) {
    diagnostics.push("ATTACHMENT_RECONSTRUCTION_ALPHA_MISMATCH");
  }
  if (seamMismatchPixels > tolerance.seamMismatchPixels) {
    diagnostics.push("ATTACHMENT_RECONSTRUCTION_VISIBLE_SEAM");
  }
  if (expansion > tolerance.boundsExpansionPixels) {
    diagnostics.push("ATTACHMENT_RECONSTRUCTION_BOUNDS_EXPANDED");
  }
  const comparison = await sharp(diff, {
    raw: {
      width: reference.info.width,
      height: reference.info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const metrics: ReconstructionMetrics = Object.freeze({
    status: diagnostics.length === 0 ? "passed" : "failed",
    rgbaMismatchPixels,
    alphaMismatchPixels,
    seamMismatchPixels,
    referenceBounds,
    reconstructedBounds,
    boundsExpansionPixels: expansion,
    tolerance,
    diagnostics: Object.freeze([...diagnostics].sort()),
  });
  return { reconstructed, comparison, metrics };
}

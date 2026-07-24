import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateRigPose,
  type RigHierarchyJoint,
} from "@gameai/rig-animation";
import sharp from "sharp";

export interface ProductionLiteLayoutPart {
  readonly partId: string;
  readonly file: string;
  readonly parentId: string | null;
  readonly originalRect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly trimOffset: { readonly x: number; readonly y: number };
  readonly anchor: { readonly x: number; readonly y: number };
  readonly restPose: RigHierarchyJoint["restPose"] & { readonly opacity: number };
  readonly drawOrder: number;
}

export interface ProductionLiteLayout {
  readonly sourceCanvas: { readonly width: number; readonly height: number };
  readonly referenceScale: number;
  readonly drawOrderPolicy: "unique" | "shared";
  readonly visualPlacementMode?: string;
  readonly parts: readonly ProductionLiteLayoutPart[];
}

export interface ReconstructionTolerance {
  readonly rgbaMismatchPixels: number;
  readonly alphaMismatchPixels: number;
  readonly boundsExpansionPixels: number;
  readonly seamMismatchPixels: number;
}

interface PixelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ReconstructionMetrics {
  readonly status: "passed" | "failed";
  readonly rgbaMismatchPixels: number;
  readonly alphaMismatchPixels: number;
  readonly seamMismatchPixels: number;
  readonly referenceBounds: PixelBounds | null;
  readonly reconstructedBounds: PixelBounds | null;
  readonly boundsExpansionPixels: number;
  readonly tolerance: ReconstructionTolerance;
  readonly diagnostics: readonly string[];
}

export interface ReconstructionResult {
  readonly reconstructed: Buffer;
  readonly comparison: Buffer;
  readonly metrics: ReconstructionMetrics;
}

const DEFAULT_TOLERANCE: ReconstructionTolerance = Object.freeze({
  rgbaMismatchPixels: 0,
  alphaMismatchPixels: 0,
  boundsExpansionPixels: 0,
  seamMismatchPixels: 0,
});

function alphaBounds(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): PixelBounds | null {
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

function boundsExpansion(reference: PixelBounds | null, actual: PixelBounds | null): number {
  if (reference === null) return actual === null ? 0 : actual.width * actual.height;
  if (actual === null) return 0;
  const referenceRight = reference.x + reference.width - 1;
  const referenceBottom = reference.y + reference.height - 1;
  const actualRight = actual.x + actual.width - 1;
  const actualBottom = actual.y + actual.height - 1;
  return Math.max(
    0,
    reference.x - actual.x,
    reference.y - actual.y,
    actualRight - referenceRight,
    actualBottom - referenceBottom,
  );
}

export async function reconstructProductionLiteRest(
  assetRoot: string,
  layout: ProductionLiteLayout,
  referencePng: Buffer,
  tolerance: ReconstructionTolerance = DEFAULT_TOLERANCE,
): Promise<ReconstructionResult> {
  const diagnostics: string[] = [];
  if (layout.visualPlacementMode !== "trimmed-pixels") {
    diagnostics.push("RECONSTRUCTION_TRIMMED_PIXEL_MODE_REQUIRED");
  }
  if (!Number.isFinite(layout.referenceScale) || layout.referenceScale <= 0) {
    diagnostics.push("RECONSTRUCTION_REFERENCE_SCALE_INVALID");
  }
  if (
    layout.drawOrderPolicy !== "unique" ||
    new Set(layout.parts.map((part) => part.drawOrder)).size !== layout.parts.length
  ) {
    diagnostics.push("RECONSTRUCTION_DRAW_ORDER_INVALID");
  }

  const hierarchy: RigHierarchyJoint[] = layout.parts.map((part) => ({
    jointId: part.partId,
    parentId: part.parentId,
    restPose: {
      position: { ...part.restPose.position },
      rotationDegrees: part.restPose.rotationDegrees,
      scale: { ...part.restPose.scale },
    },
  }));
  let evaluated: ReturnType<typeof evaluateRigPose> | null = null;
  try {
    evaluated = evaluateRigPose(hierarchy);
  } catch {
    diagnostics.push("RECONSTRUCTION_HIERARCHY_INVALID");
  }

  const images = new Map<string, Buffer>();
  for (const part of layout.parts) {
    try {
      images.set(part.partId, await readFile(path.join(assetRoot, part.file)));
    } catch {
      diagnostics.push(`RECONSTRUCTION_PART_MISSING:${part.partId}`);
    }
  }

  const canvas = layout.sourceCanvas;
  const scale = layout.referenceScale;
  const imageElements: string[] = [];
  if (evaluated !== null && scale > 0) {
    for (const part of [...layout.parts].sort(
      (left, right) =>
        left.drawOrder - right.drawOrder ||
        left.partId.localeCompare(right.partId),
    )) {
      const png = images.get(part.partId);
      if (png === undefined) continue;
      const metadata = await sharp(png).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const transform = evaluated.joints[part.partId]!.worldTransform;
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
      imageElements.push(
        `<image width="${width}" height="${height}" href="data:image/png;base64,${png.toString("base64")}" opacity="${part.restPose.opacity}" transform="matrix(${transform.a} ${-transform.b} ${-transform.c} ${transform.d} ${e} ${f})"/>`,
      );
    }
  }
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><g style="image-rendering:pixelated">${imageElements.join("")}</g></svg>`,
  );
  const reconstructed = await sharp(svg)
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const [referenceRaw, reconstructedRaw] = await Promise.all([
    sharp(referencePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(reconstructed).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (
    referenceRaw.info.width !== reconstructedRaw.info.width ||
    referenceRaw.info.height !== reconstructedRaw.info.height
  ) {
    diagnostics.push("RECONSTRUCTION_CANVAS_SIZE_MISMATCH");
  }

  let rgbaMismatchPixels = 0;
  let alphaMismatchPixels = 0;
  const diff = Buffer.alloc(referenceRaw.data.length);
  const pixelCount = Math.min(
    referenceRaw.info.width * referenceRaw.info.height,
    reconstructedRaw.info.width * reconstructedRaw.info.height,
  );
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    let mismatch = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(
        referenceRaw.data[offset + channel]! -
          reconstructedRaw.data[offset + channel]!,
      );
      diff[offset + channel] = channel === 3 ? 255 : delta;
      if (delta !== 0) mismatch = true;
    }
    if (mismatch) rgbaMismatchPixels += 1;
    if (referenceRaw.data[offset + 3] !== reconstructedRaw.data[offset + 3]) {
      alphaMismatchPixels += 1;
    }
  }

  let seamMismatchPixels = 0;
  for (const part of layout.parts) {
    if (part.parentId === null) continue;
    const joint = evaluated?.joints[part.partId]?.worldPivot;
    if (joint === undefined || scale <= 0) continue;
    const centerX = Math.round(joint.x / scale + canvas.width / 2);
    const centerY = Math.round(canvas.height / 2 - joint.y / scale);
    for (let y = centerY - 3; y <= centerY + 3; y += 1) {
      for (let x = centerX - 3; x <= centerX + 3; x += 1) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
        const offset = (y * canvas.width + x) * 4;
        if (
          referenceRaw.data[offset + 3] !== reconstructedRaw.data[offset + 3]
        ) {
          seamMismatchPixels += 1;
        }
      }
    }
  }

  const referenceBounds = alphaBounds(
    referenceRaw.data,
    referenceRaw.info.width,
    referenceRaw.info.height,
    referenceRaw.info.channels,
  );
  const reconstructedBounds = alphaBounds(
    reconstructedRaw.data,
    reconstructedRaw.info.width,
    reconstructedRaw.info.height,
    reconstructedRaw.info.channels,
  );
  const expansion = boundsExpansion(referenceBounds, reconstructedBounds);
  if (rgbaMismatchPixels > tolerance.rgbaMismatchPixels) {
    diagnostics.push("RECONSTRUCTION_RGBA_MISMATCH");
  }
  if (alphaMismatchPixels > tolerance.alphaMismatchPixels) {
    diagnostics.push("RECONSTRUCTION_ALPHA_MISMATCH");
  }
  if (seamMismatchPixels > tolerance.seamMismatchPixels) {
    diagnostics.push("RECONSTRUCTION_VISIBLE_SEAM");
  }
  if (expansion > tolerance.boundsExpansionPixels) {
    diagnostics.push("RECONSTRUCTION_BOUNDS_EXPANDED");
  }

  const comparison = await sharp(diff, {
    raw: {
      width: referenceRaw.info.width,
      height: referenceRaw.info.height,
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

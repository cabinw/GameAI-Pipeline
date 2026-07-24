import type { AttachmentLayout, Rectangle } from "@gameai/character-contracts";

export interface AttachmentSeamSample {
  readonly clipId: string;
  readonly time: number;
  readonly itemRegions: Readonly<Record<string, Rectangle>>;
}

export interface AttachmentSeamResult {
  readonly seamId: string;
  readonly minimumRequired: number;
  readonly minimumObserved: number;
  readonly passed: boolean;
  readonly diagnostics: readonly string[];
}

function overlap(left: Rectangle, right: Rectangle): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  return Math.min(width, height);
}

export function validateAttachmentSeamCoverage(
  layout: AttachmentLayout,
  samples: readonly AttachmentSeamSample[],
): readonly AttachmentSeamResult[] {
  return Object.freeze(
    (layout.seams ?? []).map((seam) => {
      const diagnostics: string[] = [];
      let minimumObserved = Number.POSITIVE_INFINITY;
      for (const sample of samples) {
        const first =
          sample.itemRegions[`${seam.seamId}:${seam.firstItemId}`] ??
          sample.itemRegions[seam.firstItemId];
        const second =
          sample.itemRegions[`${seam.seamId}:${seam.secondItemId}`] ??
          sample.itemRegions[seam.secondItemId];
        if (first === undefined || second === undefined) {
          diagnostics.push(
            `GARMENT_SEAM_ITEM_MISSING:${seam.seamId}:${sample.clipId}:${sample.time}`,
          );
          minimumObserved = 0;
          continue;
        }
        const observed = overlap(first, second);
        minimumObserved = Math.min(minimumObserved, observed);
        if (observed < seam.minimumOverlap) {
          diagnostics.push(
            `GARMENT_SEAM_INSUFFICIENT_OVERLAP:${seam.seamId}:${sample.clipId}:${sample.time}`,
          );
        }
      }
      if (samples.length === 0) {
        diagnostics.push(`GARMENT_SEAM_SAMPLES_MISSING:${seam.seamId}`);
        minimumObserved = 0;
      }
      return Object.freeze({
        seamId: seam.seamId,
        minimumRequired: seam.minimumOverlap,
        minimumObserved,
        passed: diagnostics.length === 0,
        diagnostics: Object.freeze(diagnostics),
      });
    }),
  );
}

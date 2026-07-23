import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  AssetDiagnosticCode,
  sortDiagnostics,
  type CharacterAssetDiagnostic,
} from "./diagnostics";
import type {
  CharacterAssetManifest,
  CharacterAssetPart,
  PixelBounds,
} from "./types";

export interface CanonicalArtTolerance {
  maxChannelDelta: number;
  maxVisiblePixelMismatchRatio: number;
  maxSilhouetteMismatchRatio: number;
  minExactCanonicalPixelRatio: number;
}

export interface HiddenExtensionDeclaration {
  partId: string;
  jointId?: string;
  coverPartId?: string;
  regions: readonly PixelBounds[];
}

export interface CanonicalArtProvenance {
  schemaVersion: "1.0.0";
  canonicalReference: string;
  drawOrder: readonly string[];
  hiddenExtensions: readonly HiddenExtensionDeclaration[];
  tolerance: CanonicalArtTolerance;
}

export interface CanonicalArtPartReport {
  partId: string;
  file: string;
  auditedPixelCount: number;
  ignoredDeclaredHiddenPixelCount: number;
  mismatchPixelCount: number;
  mismatchRatio: number;
  visiblePixelCount: number;
  visibleMismatchPixelCount: number;
  generatedVisiblePixelCount: number;
  nativeAuditedPixelCount: number;
  exactCanonicalPixelCount: number;
  exactCanonicalPixelRatio: number;
  directCanonicalPixels: boolean;
}

export interface CanonicalArtGateReport {
  status: "passed" | "BLOCKED_BY_INVALID_ART_ASSETS";
  canonicalReferencePath: string;
  sourceCanvas: { width: number; height: number };
  tolerance: CanonicalArtTolerance;
  canonicalVisiblePixelCount: number;
  compositeVisiblePixelCount: number;
  silhouetteMismatchPixelCount: number;
  silhouetteMismatchRatio: number;
  visiblePixelMismatchCount: number;
  visiblePixelMismatchRatio: number;
  mismatchPercentage: number;
  mismatchedParts: readonly string[];
  parts: readonly CanonicalArtPartReport[];
}

export interface CanonicalArtGateArtifacts {
  flatCompositePng: Buffer;
  diffPng: Buffer;
}

export type CanonicalArtGateResult =
  | {
      ok: true;
      report: CanonicalArtGateReport & { status: "passed" };
      artifacts: CanonicalArtGateArtifacts;
      diagnostics: readonly [];
    }
  | {
      ok: false;
      report: CanonicalArtGateReport | null;
      artifacts: CanonicalArtGateArtifacts | null;
      diagnostics: readonly CharacterAssetDiagnostic[];
    };

export interface CanonicalArtGateOptions {
  manifest: CharacterAssetManifest;
  provenance: CanonicalArtProvenance;
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

interface PreparedPart {
  part: CharacterAssetPart;
  orderIndex: number;
  nativePixels: RawImage;
  pixels: RawImage;
  hiddenRegions: readonly PixelBounds[];
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function inside(rect: PixelBounds, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height
  );
}

function maximumChannelDelta(
  left: Buffer,
  leftOffset: number,
  right: Buffer,
  rightOffset: number,
): number {
  let maximum = 0;
  for (let channel = 0; channel < 4; channel += 1) {
    maximum = Math.max(
      maximum,
      Math.abs(
        (left[leftOffset + channel] ?? 0) -
          (right[rightOffset + channel] ?? 0),
      ),
    );
  }
  return maximum;
}

async function decodeCanonical(
  absolutePath: string,
  manifest: CharacterAssetManifest,
): Promise<RawImage | CharacterAssetDiagnostic> {
  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePath);
  } catch (error) {
    return {
      code: AssetDiagnosticCode.CANONICAL_REFERENCE_MISSING,
      stage: "provenance",
      path: absolutePath,
      message: "The canonical full-body transparent PNG is missing or unreadable.",
      details: { cause: error instanceof Error ? error.message : String(error) },
    };
  }

  try {
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    const decoded = await sharp(bytes, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let hasVisible = false;
    let hasTransparent = false;
    for (let offset = 3; offset < decoded.data.length; offset += 4) {
      const alpha = decoded.data[offset] ?? 0;
      if (alpha > 0) hasVisible = true;
      if (alpha < 255) hasTransparent = true;
    }
    if (
      metadata.format !== "png" ||
      metadata.hasAlpha !== true ||
      !hasVisible ||
      !hasTransparent ||
      decoded.info.width !== manifest.sourceCanvas.width ||
      decoded.info.height !== manifest.sourceCanvas.height
    ) {
      throw new Error(
        "Reference must be a visible transparent PNG matching sourceCanvas dimensions.",
      );
    }
    return {
      data: decoded.data,
      width: decoded.info.width,
      height: decoded.info.height,
    };
  } catch (error) {
    return {
      code: AssetDiagnosticCode.CANONICAL_REFERENCE_MISSING,
      stage: "provenance",
      path: absolutePath,
      message:
        "The canonical reference exists but is not a usable transparent sourceCanvas PNG.",
      details: { cause: error instanceof Error ? error.message : String(error) },
    };
  }
}

function validateProvenance(
  manifest: CharacterAssetManifest,
  provenance: CanonicalArtProvenance,
): readonly CharacterAssetDiagnostic[] {
  const diagnostics: CharacterAssetDiagnostic[] = [];
  const partIds = new Set(manifest.parts.map((part) => part.partId));
  const orderIds = new Set(provenance.drawOrder);
  if (
    provenance.schemaVersion !== "1.0.0" ||
    provenance.drawOrder.length !== manifest.parts.length ||
    orderIds.size !== manifest.parts.length ||
    [...partIds].some((partId) => !orderIds.has(partId))
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.PART_PIXEL_PROVENANCE_MISMATCH,
      stage: "provenance",
      path: "asset-provenance.json",
      message: "Canonical drawOrder must name every manifest part exactly once.",
    });
  }
  for (const declaration of provenance.hiddenExtensions) {
    const part = manifest.parts.find(
      (candidate) => candidate.partId === declaration.partId,
    );
    if (
      part === undefined ||
      declaration.regions.some(
        (region) =>
          region.width <= 0 ||
          region.height <= 0 ||
          region.x < 0 ||
          region.y < 0 ||
          region.x + region.width > (part?.originalRect.width ?? 0) ||
          region.y + region.height > (part?.originalRect.height ?? 0),
      )
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.UNDECLARED_GENERATED_VISIBLE_REGION,
        stage: "provenance",
        path: "asset-provenance.json",
        partId: declaration.partId,
        message: "A hidden-extension declaration is unknown or leaves its part bounds.",
      });
    }
  }
  const tolerance = provenance.tolerance;
  if (
    !Number.isInteger(tolerance.maxChannelDelta) ||
    tolerance.maxChannelDelta < 0 ||
    tolerance.maxChannelDelta > 255 ||
    tolerance.maxVisiblePixelMismatchRatio < 0 ||
    tolerance.maxVisiblePixelMismatchRatio > 1 ||
    tolerance.maxSilhouetteMismatchRatio < 0 ||
    tolerance.maxSilhouetteMismatchRatio > 1 ||
    tolerance.minExactCanonicalPixelRatio < 0 ||
    tolerance.minExactCanonicalPixelRatio > 1
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.PART_PIXEL_PROVENANCE_MISMATCH,
      stage: "provenance",
      path: "asset-provenance.json",
      message: "Canonical pixel tolerances are invalid.",
    });
  }
  return sortDiagnostics(diagnostics);
}

async function prepareParts(
  manifest: CharacterAssetManifest,
  provenance: CanonicalArtProvenance,
): Promise<readonly PreparedPart[]> {
  const byPartId = new Map(manifest.parts.map((part) => [part.partId, part]));
  const hiddenByPart = new Map<string, PixelBounds[]>();
  for (const entry of provenance.hiddenExtensions) {
    hiddenByPart.set(entry.partId, [
      ...(hiddenByPart.get(entry.partId) ?? []),
      ...entry.regions,
    ]);
  }
  const prepared: PreparedPart[] = [];
  for (const [orderIndex, partId] of provenance.drawOrder.entries()) {
    const part = byPartId.get(partId)!;
    const native = await sharp(part.resolvedPath, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = await sharp(part.resolvedPath, { failOn: "error" })
      .resize(part.originalRect.width, part.originalRect.height, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    prepared.push({
      part,
      orderIndex,
      nativePixels: {
        data: native.data,
        width: native.info.width,
        height: native.info.height,
      },
      pixels: {
        data: decoded.data,
        width: decoded.info.width,
        height: decoded.info.height,
      },
      hiddenRegions: hiddenByPart.get(partId) ?? [],
    });
  }
  return prepared;
}

export async function auditCanonicalArt(
  options: CanonicalArtGateOptions,
): Promise<CanonicalArtGateResult> {
  const { manifest, provenance } = options;
  const contractDiagnostics = validateProvenance(manifest, provenance);
  if (contractDiagnostics.length > 0) {
    return {
      ok: false,
      report: null,
      artifacts: null,
      diagnostics: contractDiagnostics,
    };
  }

  const canonicalPath = path.resolve(
    manifest.sourceRoot,
    provenance.canonicalReference,
  );
  const canonical = await decodeCanonical(canonicalPath, manifest);
  if ("code" in canonical) {
    return {
      ok: false,
      report: null,
      artifacts: null,
      diagnostics: [canonical],
    };
  }

  const prepared = await prepareParts(manifest, provenance);
  const compositeInputs = prepared.map(({ part, pixels }) => ({
    input: pixels.data,
    raw: {
      width: pixels.width,
      height: pixels.height,
      channels: 4 as const,
    },
    left: part.originalRect.x,
    top: part.originalRect.y,
  }));
  const flatCompositePng = await sharp({
    create: {
      width: manifest.sourceCanvas.width,
      height: manifest.sourceCanvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeInputs)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const composite = await sharp(flatCompositePng)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = manifest.sourceCanvas.width * manifest.sourceCanvas.height;
  const owner = new Int16Array(pixelCount).fill(-1);
  for (const preparedPart of prepared) {
    const { part, pixels, orderIndex } = preparedPart;
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const sourceOffset = (y * pixels.width + x) * 4;
        if ((pixels.data[sourceOffset + 3] ?? 0) > 0) {
          const canvasIndex =
            (part.originalRect.y + y) * manifest.sourceCanvas.width +
            part.originalRect.x +
            x;
          owner[canvasIndex] = orderIndex;
        }
      }
    }
  }

  const diff = Buffer.alloc(pixelCount * 4);
  let canonicalVisiblePixelCount = 0;
  let compositeVisiblePixelCount = 0;
  let silhouetteMismatchPixelCount = 0;
  let visiblePixelMismatchCount = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const canonicalVisible = (canonical.data[offset + 3] ?? 0) > 0;
    const compositeVisible = (composite.data[offset + 3] ?? 0) > 0;
    if (canonicalVisible) canonicalVisiblePixelCount += 1;
    if (compositeVisible) compositeVisiblePixelCount += 1;
    if (canonicalVisible !== compositeVisible) {
      silhouetteMismatchPixelCount += 1;
      diff[offset] = 255;
      diff[offset + 3] = 255;
    } else if (
      canonicalVisible &&
      maximumChannelDelta(canonical.data, offset, composite.data, offset) >
        provenance.tolerance.maxChannelDelta
    ) {
      visiblePixelMismatchCount += 1;
      diff[offset] = 255;
      diff[offset + 2] = 255;
      diff[offset + 3] = 255;
    }
  }

  const reports: CanonicalArtPartReport[] = [];
  const diagnostics: CharacterAssetDiagnostic[] = [];
  const canonicalColors = new Set<number>();
  for (let offset = 0; offset < canonical.data.length; offset += 4) {
    if ((canonical.data[offset + 3] ?? 0) === 0) continue;
    canonicalColors.add(
      ((((canonical.data[offset] ?? 0) << 24) |
        ((canonical.data[offset + 1] ?? 0) << 16) |
        ((canonical.data[offset + 2] ?? 0) << 8) |
        (canonical.data[offset + 3] ?? 0)) >>>
        0),
    );
  }
  for (const preparedPart of prepared) {
    const { part, nativePixels, pixels, orderIndex, hiddenRegions } = preparedPart;
    let auditedPixelCount = 0;
    let ignoredDeclaredHiddenPixelCount = 0;
    let mismatchPixelCount = 0;
    let visiblePixelCount = 0;
    let visibleMismatchPixelCount = 0;
    let generatedVisiblePixelCount = 0;
    let nativeAuditedPixelCount = 0;
    let exactCanonicalPixelCount = 0;
    for (let y = 0; y < nativePixels.height; y += 1) {
      for (let x = 0; x < nativePixels.width; x += 1) {
        const offset = (y * nativePixels.width + x) * 4;
        if ((nativePixels.data[offset + 3] ?? 0) === 0) continue;
        const destinationX = Math.min(
          part.originalRect.width - 1,
          Math.floor(((x + 0.5) * part.originalRect.width) / nativePixels.width),
        );
        const destinationY = Math.min(
          part.originalRect.height - 1,
          Math.floor(((y + 0.5) * part.originalRect.height) / nativePixels.height),
        );
        if (
          hiddenRegions.some((region) =>
            inside(region, destinationX, destinationY),
          )
        ) {
          continue;
        }
        nativeAuditedPixelCount += 1;
        const color =
          ((((nativePixels.data[offset] ?? 0) << 24) |
            ((nativePixels.data[offset + 1] ?? 0) << 16) |
            ((nativePixels.data[offset + 2] ?? 0) << 8) |
            (nativePixels.data[offset + 3] ?? 0)) >>>
            0);
        if (canonicalColors.has(color)) exactCanonicalPixelCount += 1;
      }
    }
    for (let y = 0; y < pixels.height; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        const partOffset = (y * pixels.width + x) * 4;
        if ((pixels.data[partOffset + 3] ?? 0) === 0) continue;
        const canvasIndex =
          (part.originalRect.y + y) * manifest.sourceCanvas.width +
          part.originalRect.x +
          x;
        const canvasOffset = canvasIndex * 4;
        const visible = owner[canvasIndex] === orderIndex;
        const declaredHidden = hiddenRegions.some((region) =>
          inside(region, x, y),
        );
        if (!visible && declaredHidden) {
          ignoredDeclaredHiddenPixelCount += 1;
          continue;
        }
        auditedPixelCount += 1;
        if (visible) visiblePixelCount += 1;
        const canonicalVisible = (canonical.data[canvasOffset + 3] ?? 0) > 0;
        const comparisonPixels = visible ? composite.data : pixels.data;
        const comparisonOffset = visible ? canvasOffset : partOffset;
        const mismatched =
          maximumChannelDelta(
            canonical.data,
            canvasOffset,
            comparisonPixels,
            comparisonOffset,
          ) > provenance.tolerance.maxChannelDelta;
        if (mismatched) {
          mismatchPixelCount += 1;
          if (visible) visibleMismatchPixelCount += 1;
        }
        if (visible && (!canonicalVisible || declaredHidden)) {
          generatedVisiblePixelCount += 1;
        }
      }
    }
    const mismatchRatio =
      auditedPixelCount === 0 ? 0 : mismatchPixelCount / auditedPixelCount;
    const exactCanonicalPixelRatio =
      nativeAuditedPixelCount === 0
        ? 0
        : exactCanonicalPixelCount / nativeAuditedPixelCount;
    const directCanonicalPixels =
      mismatchRatio <= provenance.tolerance.maxVisiblePixelMismatchRatio &&
      exactCanonicalPixelRatio >=
        provenance.tolerance.minExactCanonicalPixelRatio &&
      generatedVisiblePixelCount === 0;
    const report: CanonicalArtPartReport = {
      partId: part.partId,
      file: part.sourceRelativePath,
      auditedPixelCount,
      ignoredDeclaredHiddenPixelCount,
      mismatchPixelCount,
      mismatchRatio: round(mismatchRatio),
      visiblePixelCount,
      visibleMismatchPixelCount,
      generatedVisiblePixelCount,
      nativeAuditedPixelCount,
      exactCanonicalPixelCount,
      exactCanonicalPixelRatio: round(exactCanonicalPixelRatio),
      directCanonicalPixels,
    };
    reports.push(report);
    if (!directCanonicalPixels) {
      diagnostics.push({
        code: AssetDiagnosticCode.PART_PIXEL_PROVENANCE_MISMATCH,
        stage: "provenance",
        path: part.sourceRelativePath,
        partId: part.partId,
        message: `Visible pixels for ${part.partId} do not originate from the canonical reference.`,
        details: { ...report },
      });
    }
    if (generatedVisiblePixelCount > 0) {
      diagnostics.push({
        code: AssetDiagnosticCode.UNDECLARED_GENERATED_VISIBLE_REGION,
        stage: "provenance",
        path: part.sourceRelativePath,
        partId: part.partId,
        message:
          "Generated or painted pixels are visible outside a fully covered hidden extension.",
        details: { generatedVisiblePixelCount },
      });
    }
  }

  const silhouetteDenominator = Math.max(
    canonicalVisiblePixelCount,
    compositeVisiblePixelCount,
    1,
  );
  const silhouetteMismatchRatio =
    silhouetteMismatchPixelCount / silhouetteDenominator;
  const visiblePixelMismatchRatio =
    visiblePixelMismatchCount / Math.max(canonicalVisiblePixelCount, 1);
  if (
    silhouetteMismatchRatio >
    provenance.tolerance.maxSilhouetteMismatchRatio
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.FLAT_COMPOSITE_SILHOUETTE_MISMATCH,
      stage: "provenance",
      path: provenance.canonicalReference,
      message:
        "The flat-composite alpha silhouette differs from the canonical reference.",
      details: {
        silhouetteMismatchPixelCount,
        silhouetteMismatchRatio: round(silhouetteMismatchRatio),
      },
    });
  }
  if (
    visiblePixelMismatchRatio >
    provenance.tolerance.maxVisiblePixelMismatchRatio
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.FLAT_COMPOSITE_PIXEL_DIFF_EXCEEDED,
      stage: "provenance",
      path: provenance.canonicalReference,
      message:
        "The flat-composite visible RGBA mismatch exceeds the accepted tolerance.",
      details: {
        visiblePixelMismatchCount,
        visiblePixelMismatchRatio: round(visiblePixelMismatchRatio),
      },
    });
  }

  const mismatchedParts = reports
    .filter((report) => !report.directCanonicalPixels)
    .map((report) => report.partId)
    .sort();
  const report: CanonicalArtGateReport = {
    status:
      diagnostics.length === 0 ? "passed" : "BLOCKED_BY_INVALID_ART_ASSETS",
    canonicalReferencePath: canonicalPath,
    sourceCanvas: { ...manifest.sourceCanvas },
    tolerance: { ...provenance.tolerance },
    canonicalVisiblePixelCount,
    compositeVisiblePixelCount,
    silhouetteMismatchPixelCount,
    silhouetteMismatchRatio: round(silhouetteMismatchRatio),
    visiblePixelMismatchCount,
    visiblePixelMismatchRatio: round(visiblePixelMismatchRatio),
    mismatchPercentage: round(visiblePixelMismatchRatio * 100),
    mismatchedParts,
    parts: reports.sort((left, right) =>
      left.partId.localeCompare(right.partId),
    ),
  };
  const diffPng = await sharp(diff, {
    raw: {
      width: manifest.sourceCanvas.width,
      height: manifest.sourceCanvas.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  const artifacts = { flatCompositePng, diffPng };
  if (diagnostics.length > 0) {
    return {
      ok: false,
      report,
      artifacts,
      diagnostics: sortDiagnostics(diagnostics),
    };
  }
  return {
    ok: true,
    report: report as CanonicalArtGateReport & { status: "passed" },
    artifacts,
    diagnostics: [],
  };
}

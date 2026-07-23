import { readFile } from "node:fs/promises";

import sharp from "sharp";

import {
  AssetDiagnosticCode,
  type CharacterAssetDiagnostic,
} from "./diagnostics";
import type { PixelBounds, SupportedImageFormat } from "./types";

const SUPPORTED_FORMATS = new Set<SupportedImageFormat>(["png", "jpeg", "webp"]);

export interface InspectedImage {
  imageFormat: SupportedImageFormat;
  width: number;
  height: number;
  hasAlpha: boolean;
  hasTransparency: boolean;
  transparentPixelCount: number;
  contentBounds: PixelBounds | null;
}

export type InspectImageResult =
  | { ok: true; value: InspectedImage; diagnostics: CharacterAssetDiagnostic[] }
  | { ok: false; diagnostics: CharacterAssetDiagnostic[] };

function imageDiagnostic(
  code: CharacterAssetDiagnostic["code"],
  imagePath: string,
  partId: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): CharacterAssetDiagnostic {
  return {
    code,
    stage: "image",
    path: imagePath,
    partId,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function findAlphaBounds(
  pixels: Uint8Array,
  width: number,
  height: number,
  channels: number,
): PixelBounds | null {
  const alphaIndex = channels - 1;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * channels + alphaIndex];
      if (alpha !== undefined && alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return maxX < 0
    ? null
    : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function transparentPixelCount(
  pixels: Uint8Array,
  channels: number,
): number {
  const alphaIndex = channels - 1;
  let count = 0;
  for (let index = alphaIndex; index < pixels.length; index += channels) {
    if ((pixels[index] ?? 255) < 255) count += 1;
  }
  return count;
}

export async function inspectImage(
  resolvedPath: string,
  manifestPath: string,
  partId: string,
): Promise<InspectImageResult> {
  let bytes: Buffer;
  try {
    bytes = await readFile(resolvedPath);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        imageDiagnostic(
          AssetDiagnosticCode.ASSET_FILE_NOT_FOUND,
          manifestPath,
          partId,
          `Image file could not be read: ${manifestPath}.`,
          { cause: error instanceof Error ? error.message : String(error) },
        ),
      ],
    };
  }

  try {
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    const format = metadata.format;
    if (format === undefined || !SUPPORTED_FORMATS.has(format as SupportedImageFormat)) {
      return {
        ok: false,
        diagnostics: [
          imageDiagnostic(
            AssetDiagnosticCode.UNSUPPORTED_IMAGE_FORMAT,
            manifestPath,
            partId,
            `Decoded image format ${format ?? "unknown"} is unsupported.`,
            { format: format ?? null, supportedFormats: [...SUPPORTED_FORMATS] },
          ),
        ],
      };
    }
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Decoder did not return image dimensions.");
    }

    const decoded = await sharp(bytes, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== metadata.width || decoded.info.height !== metadata.height) {
      throw new Error("Metadata dimensions do not match decoded pixel dimensions.");
    }

    const hasAlpha = metadata.hasAlpha === true;
    const contentBounds = findAlphaBounds(
      decoded.data,
      decoded.info.width,
      decoded.info.height,
      decoded.info.channels,
    );
    const transparentPixels = transparentPixelCount(
      decoded.data,
      decoded.info.channels,
    );
    const diagnostics: CharacterAssetDiagnostic[] = [];

    if (!hasAlpha) {
      diagnostics.push(
        imageDiagnostic(
          AssetDiagnosticCode.IMAGE_HAS_NO_ALPHA,
          manifestPath,
          partId,
          `Sprite image has no alpha channel: ${manifestPath}.`,
        ),
      );
    }
    if (hasAlpha && contentBounds === null) {
      diagnostics.push(
        imageDiagnostic(
          AssetDiagnosticCode.IMAGE_FULLY_TRANSPARENT,
          manifestPath,
          partId,
          `Sprite image is fully transparent: ${manifestPath}.`,
        ),
        imageDiagnostic(
          AssetDiagnosticCode.IMAGE_EMPTY_CONTENT_BOUNDS,
          manifestPath,
          partId,
          `No non-transparent content bounds exist: ${manifestPath}.`,
        ),
      );
    }

    return {
      ok: true,
      value: {
        imageFormat: format as SupportedImageFormat,
        width: metadata.width,
        height: metadata.height,
        hasAlpha,
        hasTransparency: hasAlpha && transparentPixels > 0,
        transparentPixelCount: transparentPixels,
        contentBounds,
      },
      diagnostics,
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        imageDiagnostic(
          AssetDiagnosticCode.IMAGE_DECODE_ERROR,
          manifestPath,
          partId,
          `Image could not be decoded: ${manifestPath}.`,
          { cause: error instanceof Error ? error.message : String(error) },
        ),
      ],
    };
  }
}

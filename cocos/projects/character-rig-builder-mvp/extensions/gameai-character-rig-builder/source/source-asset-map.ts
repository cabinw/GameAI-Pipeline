import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "./diagnostics";

export interface SourceAssetMapEntry {
  sourceFile: string;
  importFile: string;
  partId: string;
  cropRect?: { x: number; y: number; width: number; height: number };
}

export interface SourceAssetMap {
  mappingVersion: "1.0.0";
  assetDirectory: string;
  parts: readonly SourceAssetMapEntry[];
}

interface AnnotationPartReference {
  partId: string;
  file: string;
}

function fail(
  code: typeof SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID |
    typeof SceneRigDiagnosticCode.SOURCE_ART_PART_MISSING |
    typeof SceneRigDiagnosticCode.SOURCE_ART_PART_AMBIGUOUS |
    typeof SceneRigDiagnosticCode.SOURCE_ART_UNEXPECTED_PNG,
  message: string,
  correlationId: string,
  details?: Readonly<Record<string, unknown>>,
): never {
  throw new SceneRigBuilderError({
    code,
    message,
    stage: "main",
    correlationId,
    ...(details === undefined ? {} : { details }),
  });
}

function isContained(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return (
    local === "" ||
    (local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local))
  );
}

function safeRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    value.split("/").every((segment) => segment !== "" && segment !== "..")
  );
}

function annotationParts(
  annotation: unknown,
  correlationId: string,
): readonly AnnotationPartReference[] {
  if (
    typeof annotation !== "object" ||
    annotation === null ||
    !Array.isArray((annotation as { parts?: unknown }).parts)
  ) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
      "Source annotation has no parts array for asset-map verification.",
      correlationId,
    );
  }
  const parts = (annotation as { parts: unknown[] }).parts.map((value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      typeof (value as { partId?: unknown }).partId !== "string" ||
      typeof (value as { file?: unknown }).file !== "string"
    ) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
        "Every source annotation part must expose string partId and file values.",
        correlationId,
      );
    }
    return {
      partId: (value as { partId: string }).partId,
      file: (value as { file: string }).file,
    };
  });
  return parts.sort((left, right) => left.partId.localeCompare(right.partId));
}

export function parseSourceAssetMap(
  value: unknown,
  correlationId: string,
): SourceAssetMap {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { mappingVersion?: unknown }).mappingVersion !== "1.0.0" ||
    !safeRelativePath((value as { assetDirectory?: unknown }).assetDirectory) ||
    !Array.isArray((value as { parts?: unknown }).parts)
  ) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
      "Source asset map must use mappingVersion 1.0.0 and contain an assetDirectory and parts array.",
      correlationId,
    );
  }

  const rawParts = (value as { parts: unknown[] }).parts;
  const parts: SourceAssetMapEntry[] = rawParts.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !safeRelativePath((entry as { sourceFile?: unknown }).sourceFile) ||
      ((entry as { importFile?: unknown }).importFile !== undefined &&
        !safeRelativePath((entry as { importFile?: unknown }).importFile)) ||
      typeof (entry as { partId?: unknown }).partId !== "string" ||
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(
        (entry as { partId: string }).partId,
      )
    ) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
        "Each source asset mapping requires one safe sourceFile and canonical partId.",
        correlationId,
      );
    }
    const cropRect = (entry as { cropRect?: unknown }).cropRect;
    if (
      cropRect !== undefined &&
      (typeof cropRect !== "object" ||
        cropRect === null ||
        !Number.isInteger((cropRect as { x?: unknown }).x) ||
        !Number.isInteger((cropRect as { y?: unknown }).y) ||
        !Number.isInteger((cropRect as { width?: unknown }).width) ||
        !Number.isInteger((cropRect as { height?: unknown }).height) ||
        (cropRect as { x: number }).x < 0 ||
        (cropRect as { y: number }).y < 0 ||
        (cropRect as { width: number }).width <= 0 ||
        (cropRect as { height: number }).height <= 0)
    ) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
        "Mapped cropRect values must form a positive integer rectangle.",
        correlationId,
      );
    }
    const sourceFile = (entry as { sourceFile: string }).sourceFile;
    return {
      sourceFile,
      importFile: (entry as { importFile?: string }).importFile ?? sourceFile,
      partId: (entry as { partId: string }).partId,
      ...(cropRect === undefined
        ? {}
        : {
            cropRect: {
              x: (cropRect as { x: number }).x,
              y: (cropRect as { y: number }).y,
              width: (cropRect as { width: number }).width,
              height: (cropRect as { height: number }).height,
            },
          }),
    };
  });

  const byPartId = new Set<string>();
  const bySourceFile = new Set<string>();
  const byImportFile = new Set<string>();
  for (const entry of parts) {
    const foldedFile = entry.sourceFile.toLocaleLowerCase("en-US");
    const foldedImport = entry.importFile.toLocaleLowerCase("en-US");
    if (
      byPartId.has(entry.partId) ||
      bySourceFile.has(foldedFile) ||
      byImportFile.has(foldedImport)
    ) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_PART_AMBIGUOUS,
        `Source asset mapping is not one-to-one at ${entry.sourceFile} → ${entry.partId}.`,
        correlationId,
        { sourceFile: entry.sourceFile, partId: entry.partId },
      );
    }
    byPartId.add(entry.partId);
    bySourceFile.add(foldedFile);
    byImportFile.add(foldedImport);
  }

  return {
    mappingVersion: "1.0.0",
    assetDirectory: (value as { assetDirectory: string }).assetDirectory,
    parts: parts.sort((left, right) => left.partId.localeCompare(right.partId)),
  };
}

export async function auditSourceAssetMap(options: {
  sourceRoot: string;
  mappingFile: string;
  annotation: unknown;
  correlationId: string;
}): Promise<SourceAssetMap> {
  const mappingPath = resolve(options.sourceRoot, options.mappingFile);
  if (!isContained(options.sourceRoot, mappingPath)) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
      "Source asset map must remain inside the selected source root.",
      options.correlationId,
      { mappingFile: options.mappingFile },
    );
  }

  let rawMapping: unknown;
  try {
    rawMapping = JSON.parse(await readFile(mappingPath, "utf8")) as unknown;
  } catch (error) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
      `Source asset map could not be read: ${options.mappingFile}.`,
      options.correlationId,
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }

  const mapping = parseSourceAssetMap(rawMapping, options.correlationId);
  const expected = annotationParts(options.annotation, options.correlationId);
  const mappedByPart = new Map(mapping.parts.map((entry) => [entry.partId, entry]));
  const expectedByPart = new Map(expected.map((entry) => [entry.partId, entry]));

  for (const part of expected) {
    const mapped = mappedByPart.get(part.partId);
    if (mapped === undefined || mapped.importFile !== part.file) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_PART_MISSING,
        `No exact source filename mapping exists for canonical part ${part.partId}.`,
        options.correlationId,
        {
          partId: part.partId,
          annotationFile: part.file,
          mappedFile: mapped?.importFile ?? null,
        },
      );
    }
  }
  for (const mapped of mapping.parts) {
    if (!expectedByPart.has(mapped.partId)) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_PART_AMBIGUOUS,
        `Mapped part ${mapped.partId} has no unique annotation target.`,
        options.correlationId,
        { partId: mapped.partId, sourceFile: mapped.sourceFile },
      );
    }
  }

  for (const mapped of mapping.parts) {
    const assetPath = resolve(options.sourceRoot, mapped.importFile);
    if (!isContained(options.sourceRoot, assetPath)) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
        `Mapped import file escapes the source root: ${mapped.importFile}.`,
        options.correlationId,
      );
    }
    try {
      if (!(await stat(assetPath)).isFile()) throw new Error("not a file");
    } catch (error) {
      return fail(
        SceneRigDiagnosticCode.SOURCE_ART_PART_MISSING,
        `Mapped PNG is missing for ${mapped.partId}: ${mapped.importFile}.`,
        options.correlationId,
        {
          partId: mapped.partId,
          sourceFile: mapped.sourceFile,
          importFile: mapped.importFile,
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const assetDirectory = resolve(options.sourceRoot, mapping.assetDirectory);
  if (!isContained(options.sourceRoot, assetDirectory)) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_MAPPING_INVALID,
      "Mapped asset directory escapes the selected source root.",
      options.correlationId,
    );
  }
  const actualPngs = (await readdir(assetDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => `${mapping.assetDirectory}/${entry.name}`)
    .sort();
  const mappedFiles = new Set(mapping.parts.map((entry) => entry.importFile));
  const unexpected = actualPngs.filter((file) => !mappedFiles.has(file));
  if (unexpected.length > 0) {
    return fail(
      SceneRigDiagnosticCode.SOURCE_ART_UNEXPECTED_PNG,
      `Unmapped PNG files require an explicit canonical decision: ${unexpected.join(", ")}.`,
      options.correlationId,
      { files: unexpected },
    );
  }
  return mapping;
}

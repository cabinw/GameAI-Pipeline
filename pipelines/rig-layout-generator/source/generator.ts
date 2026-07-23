import {
  validateCharacterAssetDocuments,
  type CharacterAssetDiagnostic,
} from "@gameai/character-asset-intake";
import {
  parseRigLayout,
  type RigHitArea,
  type RigLayout,
  type RigPart,
  type RigSocket,
} from "@gameai/character-contracts";

import {
  RigLayoutDiagnosticCode,
  sortRigLayoutDiagnostics,
  type RigLayoutDiagnostic,
} from "./diagnostics";
import { parseSkeletonTemplate, parseSourceCanvasAnnotation } from "./parser";
import type {
  GenerateRigLayoutOptions,
  Point,
  RigLayoutGenerationResult,
  SkeletonTemplate,
  SourceAnnotationPart,
  SourceCanvasAnnotation,
  SourceRect,
  TrimMetadata,
} from "./types";

const SUPPORTED_SCHEMA_RANGE = ">=1.0.0 <1.1.0";
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function round(value: number): number {
  const result = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(result, -0) ? 0 : result;
}

function diagnostic(
  code: RigLayoutDiagnostic["code"],
  path: string,
  message: string,
  options: {
    severity?: "error" | "warning";
    partId?: string;
    details?: Readonly<Record<string, unknown>>;
  } = {},
): RigLayoutDiagnostic {
  return {
    code,
    severity: options.severity ?? "error",
    path,
    message,
    ...(options.partId === undefined ? {} : { partId: options.partId }),
    ...(options.details === undefined ? {} : { details: options.details }),
  };
}

function isSupportedVersion(version: string): boolean {
  const match = VERSION_PATTERN.exec(version);
  return match !== null && Number(match[1]) === 1 && Number(match[2]) === 0;
}

function sourceRect(part: SourceAnnotationPart): SourceRect {
  return "sourceRect" in part && part.sourceRect !== undefined
    ? part.sourceRect
    : part.originalRect;
}

function resolvedParentId(
  part: SourceAnnotationPart,
  templatePart: SkeletonTemplate["parts"][number] | undefined,
): string | null | undefined {
  return part.overrides?.parentId !== undefined
    ? part.overrides.parentId
    : templatePart?.parentId;
}

function trimMetadata(part: SourceAnnotationPart): TrimMetadata {
  if ("trim" in part && part.trim !== undefined) {
    return part.trim;
  }
  const original = sourceRect(part);
  const trimmed = part.trimmedRect;
  return {
    offset: { x: trimmed.x - original.x, y: trimmed.y - original.y },
    size: { width: trimmed.width, height: trimmed.height },
  };
}

function pointInsideRect(point: Point, rect: SourceRect): boolean {
  return (
    point.x >= rect.x &&
    point.y >= rect.y &&
    point.x <= rect.x + rect.width &&
    point.y <= rect.y + rect.height
  );
}

function rectanglesOverlap(left: SourceRect, right: SourceRect): boolean {
  return (
    Math.max(left.x, right.x) < Math.min(left.x + left.width, right.x + right.width) &&
    Math.max(left.y, right.y) < Math.min(left.y + left.height, right.y + right.height)
  );
}

function templateHierarchyDiagnostics(template: SkeletonTemplate): RigLayoutDiagnostic[] {
  const diagnostics: RigLayoutDiagnostic[] = [];
  const partById = new Map<string, SkeletonTemplate["parts"][number]>();
  for (const [index, part] of template.parts.entries()) {
    if (partById.has(part.partId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          `/parts/${index}/partId`,
          `Template part ${part.partId} is duplicated.`,
          { partId: part.partId },
        ),
      );
    }
    partById.set(part.partId, part);
  }

  const roots = template.parts.filter((part) => part.parentId === null);
  if (roots.length !== 1) {
    diagnostics.push(
      diagnostic(
        RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
        "/parts",
        `Template must contain exactly one root; found ${roots.length}.`,
      ),
    );
  }

  for (const [index, part] of template.parts.entries()) {
    if (part.parentId !== null && !partById.has(part.parentId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          `/parts/${index}/parentId`,
          `Template part ${part.partId} references unknown parent ${part.parentId}.`,
          { partId: part.partId },
        ),
      );
    }
  }

  for (const requiredPart of template.requiredParts) {
    if (!partById.has(requiredPart)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          "/requiredParts",
          `Required part ${requiredPart} has no template hierarchy entry.`,
          { partId: requiredPart },
        ),
      );
    }
  }

  for (const [index, socket] of (template.sockets ?? []).entries()) {
    if (!partById.has(socket.parentPartId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          `/sockets/${index}/parentPartId`,
          `Template socket ${socket.socketId} references unknown part ${socket.parentPartId}.`,
        ),
      );
    }
  }
  for (const [index, hitArea] of (template.hitAreas ?? []).entries()) {
    if (!partById.has(hitArea.parentPartId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          `/hitAreas/${index}/parentPartId`,
          `Template hit area ${hitArea.hitAreaId} references unknown part ${hitArea.parentPartId}.`,
        ),
      );
    }
  }
  for (const [index, target] of template.animationTargets.entries()) {
    if (!partById.has(target.partId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
          `/animationTargets/${index}/partId`,
          `Template animation target ${target.targetId} references unknown part ${target.partId}.`,
        ),
      );
    }
  }

  for (const start of [...partById.keys()].sort()) {
    const path: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = start;
    while (cursor !== null && partById.has(cursor)) {
      if (seen.has(cursor)) {
        path.push(cursor);
        diagnostics.push(
          diagnostic(
            RigLayoutDiagnosticCode.TEMPLATE_HIERARCHY_ERROR,
            "/parts",
            `Template hierarchy cycle detected: ${path.join(" -> ")}.`,
            { partId: start, details: { cycle: path } },
          ),
        );
        break;
      }
      seen.add(cursor);
      path.push(cursor);
      cursor = partById.get(cursor)?.parentId ?? null;
    }
  }
  return diagnostics;
}

function inputDiagnostics(
  annotation: SourceCanvasAnnotation,
  template: SkeletonTemplate,
): RigLayoutDiagnostic[] {
  const diagnostics: RigLayoutDiagnostic[] = [];
  if (!isSupportedVersion(annotation.schemaVersion)) {
    diagnostics.push(
      diagnostic(
        RigLayoutDiagnosticCode.UNSUPPORTED_GENERATOR_SCHEMA_VERSION,
        "/annotation/schemaVersion",
        `Annotation schema version ${annotation.schemaVersion} is unsupported; supported range is ${SUPPORTED_SCHEMA_RANGE}.`,
      ),
    );
  }
  if (!isSupportedVersion(template.schemaVersion)) {
    diagnostics.push(
      diagnostic(
        RigLayoutDiagnosticCode.UNSUPPORTED_GENERATOR_SCHEMA_VERSION,
        "/template/schemaVersion",
        `Template schema version ${template.schemaVersion} is unsupported; supported range is ${SUPPORTED_SCHEMA_RANGE}.`,
      ),
    );
  }
  diagnostics.push(...templateHierarchyDiagnostics(template));

  const annotationById = new Map(annotation.parts.map((part) => [part.partId, part]));
  const templateById = new Map(template.parts.map((part) => [part.partId, part]));
  const referencedTemplateParts = new Set([
    ...(template.sockets ?? []).map((socket) => socket.parentPartId),
    ...(template.hitAreas ?? []).map((hitArea) => hitArea.parentPartId),
    ...template.animationTargets.map((target) => target.partId),
  ]);

  for (const partId of template.requiredParts) {
    if (!annotationById.has(partId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_PART_MISSING,
          "/annotation/parts",
          `Required template part ${partId} is missing from the annotation.`,
          { partId },
        ),
      );
    }
  }
  for (const partId of [...referencedTemplateParts].sort()) {
    if (!annotationById.has(partId) && !template.requiredParts.includes(partId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_PART_MISSING,
          "/annotation/parts",
          `Template feature references part ${partId}, but the annotation does not contain it.`,
          { partId },
        ),
      );
    }
  }

  for (const [index, part] of annotation.parts.entries()) {
    const templatePart = templateById.get(part.partId);
    if (
      templatePart === undefined &&
      (template.additionalPartPolicy === "reject" ||
        part.overrides?.parentId === undefined ||
        part.overrides.drawOrder === undefined)
    ) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.TEMPLATE_UNKNOWN_PART,
          `/annotation/parts/${index}`,
          `Annotated part ${part.partId} is not declared by the template and lacks complete hierarchy overrides.`,
          { partId: part.partId },
        ),
      );
    }

    const original = sourceRect(part);
    const trim = trimMetadata(part);
    if (
      part.joint.x < 0 ||
      part.joint.y < 0 ||
      part.joint.x > annotation.sourceCanvas.width ||
      part.joint.y > annotation.sourceCanvas.height
    ) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.INVALID_JOINT_POSITION,
          `/annotation/parts/${index}/joint`,
          `Joint for ${part.partId} lies outside sourceCanvas.`,
          { partId: part.partId, details: { joint: part.joint } },
        ),
      );
    } else if (!pointInsideRect(part.joint, original)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.JOINT_OUTSIDE_PART_RECT,
          `/annotation/parts/${index}/joint`,
          `Joint for ${part.partId} lies outside its untrimmed source rectangle.`,
          { partId: part.partId, details: { joint: part.joint, originalRect: original } },
        ),
      );
    }

    const invalidTrim =
      original.x < 0 ||
      original.y < 0 ||
      original.x + original.width > annotation.sourceCanvas.width ||
      original.y + original.height > annotation.sourceCanvas.height ||
      trim.offset.x < 0 ||
      trim.offset.y < 0 ||
      trim.size.width <= 0 ||
      trim.size.height <= 0 ||
      trim.offset.x + trim.size.width > original.width ||
      trim.offset.y + trim.size.height > original.height;
    if (invalidTrim) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.INVALID_TRIM_METADATA,
          `/annotation/parts/${index}`,
          `Trim metadata for ${part.partId} does not fit its untrimmed rectangle and source canvas.`,
          { partId: part.partId, details: { originalRect: original, trim } },
        ),
      );
    }

    const parentId = resolvedParentId(part, templatePart);
    if (parentId !== null && parentId !== undefined && !annotationById.has(parentId)) {
      diagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.MISSING_PARENT_JOINT,
          `/annotation/parts/${index}/joint`,
          `Part ${part.partId} cannot derive a rest pose because parent ${parentId} has no annotated joint.`,
          { partId: part.partId, details: { parentId } },
        ),
      );
    }
  }

  if ((annotation.overrides?.sourceRectOverlapPolicy ?? "warn") === "warn") {
    const ordered = [...annotation.parts].sort((left, right) => left.partId.localeCompare(right.partId));
    for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
      const left = ordered[leftIndex];
      if (left === undefined) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
        const right = ordered[rightIndex];
        if (right !== undefined && rectanglesOverlap(sourceRect(left), sourceRect(right))) {
          diagnostics.push(
            diagnostic(
              RigLayoutDiagnosticCode.SOURCE_RECT_OVERLAP_WARNING,
              "/annotation/parts",
              `Source rectangles for ${left.partId} and ${right.partId} overlap.`,
              {
                severity: "warning",
                details: { partIds: [left.partId, right.partId] },
              },
            ),
          );
        }
      }
    }
  }
  return diagnostics;
}

function deriveRestPosition(
  annotation: SourceCanvasAnnotation,
  part: SourceAnnotationPart,
  parent: SourceAnnotationPart | undefined,
  referenceScale: number,
): Point {
  const origin = parent?.joint ?? {
    x: annotation.sourceCanvas.width / 2,
    y: annotation.sourceCanvas.height / 2,
  };
  return {
    x: round((part.joint.x - origin.x) * referenceScale),
    y: round((origin.y - part.joint.y) * referenceScale),
  };
}

function deriveSocket(
  socket: NonNullable<SkeletonTemplate["sockets"]>[number],
  annotationPart: SourceAnnotationPart,
  referenceScale: number,
): RigSocket {
  const rect = sourceRect(annotationPart);
  const sourcePoint = {
    x: rect.x + socket.normalizedPosition.x * rect.width,
    y: rect.y + socket.normalizedPosition.y * rect.height,
  };
  return {
    socketId: socket.socketId,
    parentPartId: socket.parentPartId,
    position: {
      x: round((sourcePoint.x - annotationPart.joint.x) * referenceScale),
      y: round((annotationPart.joint.y - sourcePoint.y) * referenceScale),
    },
    rotationDegrees: socket.rotationDegrees,
  };
}

function deriveHitArea(
  hitArea: NonNullable<SkeletonTemplate["hitAreas"]>[number],
  annotationPart: SourceAnnotationPart,
  referenceScale: number,
): RigHitArea {
  const rect = sourceRect(annotationPart);
  const shape = hitArea.normalizedShape;
  if (shape.type === "circle") {
    const center = {
      x: rect.x + shape.x * rect.width,
      y: rect.y + shape.y * rect.height,
    };
    return {
      hitAreaId: hitArea.hitAreaId,
      parentPartId: hitArea.parentPartId,
      shape: {
        type: "circle",
        x: round((center.x - annotationPart.joint.x) * referenceScale),
        y: round((annotationPart.joint.y - center.y) * referenceScale),
        radius: round(shape.radius * Math.min(rect.width, rect.height) * referenceScale),
      },
    };
  }
  const left = rect.x + shape.x * rect.width;
  const bottom = rect.y + (shape.y + shape.height) * rect.height;
  return {
    hitAreaId: hitArea.hitAreaId,
    parentPartId: hitArea.parentPartId,
    shape: {
      type: "rect",
      x: round((left - annotationPart.joint.x) * referenceScale),
      y: round((annotationPart.joint.y - bottom) * referenceScale),
      width: round(shape.width * rect.width * referenceScale),
      height: round(shape.height * rect.height * referenceScale),
    },
  };
}

function deriveLayout(
  annotation: SourceCanvasAnnotation,
  template: SkeletonTemplate,
): RigLayout {
  const annotationById = new Map(annotation.parts.map((part) => [part.partId, part]));
  const templateById = new Map(template.parts.map((part) => [part.partId, part]));
  const referenceScale = annotation.overrides?.referenceScale ?? template.referenceScale;
  const orderedParts = [
    ...template.parts
      .map((templatePart) => annotationById.get(templatePart.partId))
      .filter((part): part is SourceAnnotationPart => part !== undefined),
    ...annotation.parts
      .filter((part) => !templateById.has(part.partId))
      .sort((left, right) => left.partId.localeCompare(right.partId)),
  ];
  const parts: RigPart[] = orderedParts.map((part) => {
    const templatePart = templateById.get(part.partId);
    const parentId = resolvedParentId(part, templatePart) ?? null;
    const original = sourceRect(part);
    const trim = trimMetadata(part);
    return {
      partId: part.partId,
      file: part.file,
      parentId,
      originalRect: { ...original },
      trimOffset: { ...trim.offset },
      anchor: {
        x: round((part.joint.x - original.x) / original.width),
        y: round((part.joint.y - original.y) / original.height),
      },
      restPose: {
        position: deriveRestPosition(annotation, part, parentId === null ? undefined : annotationById.get(parentId), referenceScale),
        rotationDegrees: part.overrides?.rotationDegrees ?? 0,
        scale: { ...(part.overrides?.scale ?? { x: 1, y: 1 }) },
        opacity: part.overrides?.opacity ?? 1,
      },
      drawOrder: part.overrides?.drawOrder ?? templatePart?.drawOrder ?? 0,
    };
  });
  const sockets = (template.sockets ?? []).map((socket) =>
    deriveSocket(socket, annotationById.get(socket.parentPartId)!, referenceScale),
  );
  const hitAreas = (template.hitAreas ?? []).map((hitArea) =>
    deriveHitArea(hitArea, annotationById.get(hitArea.parentPartId)!, referenceScale),
  );
  return {
    schemaVersion: "1.0.0",
    layoutId: annotation.layoutId,
    sourceCanvas: { ...annotation.sourceCanvas },
    referenceScale,
    drawOrderPolicy: template.drawOrderPolicy,
    parts,
    ...(sockets.length === 0 ? {} : { sockets }),
    ...(hitAreas.length === 0 ? {} : { hitAreas }),
  };
}

function downstreamDiagnostic(value: CharacterAssetDiagnostic): RigLayoutDiagnostic {
  return diagnostic(
    RigLayoutDiagnosticCode.GENERATED_LAYOUT_INVALID,
    value.path,
    `Generated layout failed asset intake with ${value.code}: ${value.message}`,
    {
      ...(value.partId === undefined ? {} : { partId: value.partId }),
      details: { downstreamCode: value.code, ...value.details },
    },
  );
}

function failure(diagnostics: readonly RigLayoutDiagnostic[]): RigLayoutGenerationResult {
  return {
    ok: false,
    rigLayout: null,
    manifest: null,
    animationTargets: [],
    diagnostics: sortRigLayoutDiagnostics(diagnostics),
  };
}

export async function generateRigLayout(
  options: GenerateRigLayoutOptions,
): Promise<RigLayoutGenerationResult> {
  const annotation = parseSourceCanvasAnnotation(options.annotation);
  const template = parseSkeletonTemplate(options.template);
  if (!annotation.ok || !template.ok) {
    return failure([
      ...(annotation.ok ? [] : annotation.diagnostics),
      ...(template.ok ? [] : template.diagnostics),
    ]);
  }

  const diagnostics = inputDiagnostics(annotation.value, template.value);
  if (annotation.value.characterId !== options.characterRig.characterId) {
    diagnostics.push(
      diagnostic(
        RigLayoutDiagnosticCode.GENERATED_LAYOUT_INVALID,
        "/annotation/characterId",
        `Annotation characterId ${annotation.value.characterId} does not match Character Rig ${options.characterRig.characterId}.`,
      ),
    );
  }
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    return failure(diagnostics);
  }

  const rigLayout = deriveLayout(annotation.value, template.value);
  const parsedLayout = parseRigLayout(serializeRigLayout(rigLayout));
  if (!parsedLayout.ok) {
    return failure([
      ...diagnostics,
      ...parsedLayout.errors.map((issue) =>
        diagnostic(
          RigLayoutDiagnosticCode.GENERATED_LAYOUT_INVALID,
          issue.path,
          `Generated Rig Layout failed Character Contract validation with ${issue.code}: ${issue.message}`,
          { details: { downstreamCode: issue.code, ...issue.details } },
        ),
      ),
    ]);
  }

  const expectedTargets = new Map(template.value.animationTargets.map((target) => [target.targetId, target.partId]));
  const actualTargets = new Map(options.characterRig.animationTargets.map((target) => [target.targetId, target.partId]));
  for (const [targetId, partId] of expectedTargets) {
    if (actualTargets.get(targetId) !== partId) {
      return failure([
        ...diagnostics,
        diagnostic(
          RigLayoutDiagnosticCode.GENERATED_LAYOUT_INVALID,
          "/characterRig/animationTargets",
          `Character Rig animation target ${targetId} must map to template part ${partId}.`,
          { details: { targetId, expectedPartId: partId, actualPartId: actualTargets.get(targetId) ?? null } },
        ),
      ]);
    }
  }

  const intake = await validateCharacterAssetDocuments({
    sourceRoot: options.sourceRoot,
    characterRig: options.characterRig,
    rigLayout: parsedLayout.value,
    ...(options.characterRigPath === undefined ? {} : { characterRigPath: options.characterRigPath }),
    rigLayoutPath: options.rigLayoutPath ?? options.characterRig.rigLayoutFile,
  });
  if (!intake.ok) {
    return failure([...diagnostics, ...intake.diagnostics.map(downstreamDiagnostic)]);
  }

  const annotationById = new Map(annotation.value.parts.map((part) => [part.partId, part]));
  const trimDiagnostics: RigLayoutDiagnostic[] = [];
  for (const assetPart of intake.manifest.parts) {
    const annotationPart = annotationById.get(assetPart.partId);
    if (annotationPart === undefined) continue;
    const trim = trimMetadata(annotationPart);
    if (assetPart.width !== trim.size.width || assetPart.height !== trim.size.height) {
      trimDiagnostics.push(
        diagnostic(
          RigLayoutDiagnosticCode.INVALID_TRIM_METADATA,
          `/annotation/parts/${assetPart.partId}`,
          `Annotated trim size ${trim.size.width}x${trim.size.height} does not match decoded asset ${assetPart.width}x${assetPart.height}.`,
          { partId: assetPart.partId },
        ),
      );
    }
  }
  if (trimDiagnostics.length > 0) {
    return failure([...diagnostics, ...trimDiagnostics]);
  }

  return {
    ok: true,
    rigLayout: parsedLayout.value,
    manifest: intake.manifest,
    animationTargets: template.value.animationTargets.map((target) => ({ ...target })),
    diagnostics: sortRigLayoutDiagnostics(diagnostics),
  };
}

export function serializeRigLayout(rigLayout: RigLayout): string {
  return `${JSON.stringify(rigLayout, null, 2)}\n`;
}

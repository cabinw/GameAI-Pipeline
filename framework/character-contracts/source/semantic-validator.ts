import {
  ValidationErrorCode,
  sortIssues,
  type ContractDocument,
  type ValidationIssue,
} from "./errors";
import type { CharacterRig, RigLayout, RigPart } from "./types";

export const SUPPORTED_SCHEMA_RANGE = ">=1.0.0 <1.1.0";

const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function issue(
  code: ValidationIssue["code"],
  document: ContractDocument,
  path: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): ValidationIssue {
  return details === undefined
    ? { code, document, path, message }
    : { code, document, path, message, details };
}

export function isSupportedSchemaVersion(schemaVersion: string): boolean {
  const match = SEMVER_PATTERN.exec(schemaVersion);
  if (match === null) {
    return false;
  }

  return Number(match[1]) === 1 && Number(match[2]) === 0;
}

function validateSchemaVersion(
  schemaVersion: string,
  document: Exclude<ContractDocument, "contract">,
): ValidationIssue[] {
  if (isSupportedSchemaVersion(schemaVersion)) {
    return [];
  }

  return [
    issue(
      ValidationErrorCode.UNSUPPORTED_SCHEMA_VERSION,
      document,
      "/schemaVersion",
      `Schema version ${schemaVersion} is unsupported; supported range is ${SUPPORTED_SCHEMA_RANGE}.`,
      { schemaVersion, supportedRange: SUPPORTED_SCHEMA_RANGE },
    ),
  ];
}

function isSafeRelativePath(path: string, extensionPattern: RegExp): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) &&
    !path.includes("\\") &&
    !path.split("/").includes("..") &&
    !path.includes("\u0000") &&
    extensionPattern.test(path)
  );
}

function findDuplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function findParentCycles(parts: readonly RigPart[]): string[][] {
  const parentByPart = new Map(parts.map((part) => [part.partId, part.parentId]));
  const complete = new Set<string>();
  const cycles: string[][] = [];
  const cycleKeys = new Set<string>();

  for (const start of [...parentByPart.keys()].sort()) {
    if (complete.has(start)) {
      continue;
    }

    const path: string[] = [];
    const indexByPart = new Map<string, number>();
    let cursor: string | null | undefined = start;

    while (cursor !== null && cursor !== undefined && parentByPart.has(cursor)) {
      const cycleStart = indexByPart.get(cursor);
      if (cycleStart !== undefined) {
        const cycle = [...path.slice(cycleStart), cursor];
        const members = [...new Set(cycle.slice(0, -1))].sort();
        const key = members.join("\u0000");
        if (!cycleKeys.has(key)) {
          cycles.push(cycle);
          cycleKeys.add(key);
        }
        break;
      }

      if (complete.has(cursor)) {
        break;
      }

      indexByPart.set(cursor, path.length);
      path.push(cursor);
      cursor = parentByPart.get(cursor);
    }

    for (const partId of path) {
      complete.add(partId);
    }
  }

  return cycles;
}

export function validateCharacterRigSemantics(characterRig: CharacterRig): ValidationIssue[] {
  const issues = validateSchemaVersion(characterRig.schemaVersion, "characterRig");

  if (!isSafeRelativePath(characterRig.rigLayoutFile, /\.json$/)) {
    issues.push(
      issue(
        ValidationErrorCode.INVALID_FILE_PATH,
        "characterRig",
        "/rigLayoutFile",
        "rigLayoutFile must be a safe relative POSIX JSON path.",
        { file: characterRig.rigLayoutFile },
      ),
    );
  }

  for (const targetId of findDuplicateValues(
    characterRig.animationTargets.map((target) => target.targetId),
  )) {
    issues.push(
      issue(
        ValidationErrorCode.DUPLICATE_ANIMATION_TARGET_ID,
        "characterRig",
        "/animationTargets",
        `Animation target ID ${targetId} is declared more than once.`,
        { targetId },
      ),
    );
  }

  return sortIssues(issues);
}

export function validateRigLayoutSemantics(rigLayout: RigLayout): ValidationIssue[] {
  const issues = validateSchemaVersion(rigLayout.schemaVersion, "rigLayout");
  const partIds = new Set(rigLayout.parts.map((part) => part.partId));

  for (const partId of findDuplicateValues(rigLayout.parts.map((part) => part.partId))) {
    issues.push(
      issue(
        ValidationErrorCode.DUPLICATE_PART_ID,
        "rigLayout",
        "/parts",
        `Part ID ${partId} is declared more than once.`,
        { partId },
      ),
    );
  }

  const roots = rigLayout.parts.filter((part) => part.parentId === null);
  if (roots.length !== 1) {
    issues.push(
      issue(
        ValidationErrorCode.INVALID_ROOT_COUNT,
        "rigLayout",
        "/parts",
        `A rig layout must have exactly one root part; found ${roots.length}.`,
        { rootPartIds: roots.map((part) => part.partId).sort() },
      ),
    );
  }

  rigLayout.parts.forEach((part, index) => {
    const basePath = `/parts/${index}`;

    if (!isSafeRelativePath(part.file, /\.(?:png|jpg|jpeg|webp)$/)) {
      issues.push(
        issue(
          ValidationErrorCode.INVALID_FILE_PATH,
          "rigLayout",
          `${basePath}/file`,
          `Part ${part.partId} must use a safe relative POSIX image path.`,
          { partId: part.partId, file: part.file },
        ),
      );
    }

    if (part.parentId !== null && !partIds.has(part.parentId)) {
      issues.push(
        issue(
          ValidationErrorCode.UNKNOWN_PARENT,
          "rigLayout",
          `${basePath}/parentId`,
          `Part ${part.partId} references unknown parent ${part.parentId}.`,
          { partId: part.partId, parentId: part.parentId },
        ),
      );
    }

    if (
      part.anchor.x < 0 ||
      part.anchor.x > 1 ||
      part.anchor.y < 0 ||
      part.anchor.y > 1
    ) {
      issues.push(
        issue(
          ValidationErrorCode.INVALID_NORMALIZED_ANCHOR,
          "rigLayout",
          `${basePath}/anchor`,
          `Part ${part.partId} anchor coordinates must be within [0, 1].`,
          { partId: part.partId, anchor: part.anchor },
        ),
      );
    }

    const rectangle = part.originalRect;
    const rectangleIsInvalid =
      rectangle.x < 0 ||
      rectangle.y < 0 ||
      rectangle.width <= 0 ||
      rectangle.height <= 0 ||
      rectangle.x + rectangle.width > rigLayout.sourceCanvas.width ||
      rectangle.y + rectangle.height > rigLayout.sourceCanvas.height ||
      part.trimOffset.x < 0 ||
      part.trimOffset.y < 0 ||
      part.trimOffset.x >= rectangle.width ||
      part.trimOffset.y >= rectangle.height;

    if (rectangleIsInvalid) {
      issues.push(
        issue(
          ValidationErrorCode.INVALID_RECTANGLE,
          "rigLayout",
          `${basePath}/originalRect`,
          `Part ${part.partId} rectangle and trim offset must fit inside sourceCanvas and the original rectangle.`,
          {
            partId: part.partId,
            originalRect: rectangle,
            trimOffset: part.trimOffset,
            sourceCanvas: rigLayout.sourceCanvas,
          },
        ),
      );
    }
  });

  if (rigLayout.drawOrderPolicy === "unique") {
    const duplicates = findDuplicateValues(
      rigLayout.parts.map((part) => String(part.drawOrder)),
    );
    for (const drawOrder of duplicates) {
      issues.push(
        issue(
          ValidationErrorCode.DUPLICATE_DRAW_ORDER,
          "rigLayout",
          "/parts",
          `Draw order ${drawOrder} is duplicated while drawOrderPolicy is unique.`,
          { drawOrder: Number(drawOrder) },
        ),
      );
    }
  }

  for (const cycle of findParentCycles(rigLayout.parts)) {
    issues.push(
      issue(
        ValidationErrorCode.PARENT_CYCLE,
        "rigLayout",
        "/parts",
        `Parent cycle detected: ${cycle.join(" -> ")}.`,
        { cycle },
      ),
    );
  }

  const sockets = rigLayout.sockets ?? [];
  for (const socketId of findDuplicateValues(sockets.map((socket) => socket.socketId))) {
    issues.push(
      issue(
        ValidationErrorCode.DUPLICATE_SOCKET_ID,
        "rigLayout",
        "/sockets",
        `Socket ID ${socketId} is declared more than once.`,
        { socketId },
      ),
    );
  }

  for (const [index, socket] of sockets.entries()) {
    if (!partIds.has(socket.parentPartId)) {
      issues.push(
        issue(
          ValidationErrorCode.UNKNOWN_PARENT,
          "rigLayout",
          `/sockets/${index}/parentPartId`,
          `Socket ${socket.socketId} references unknown parent ${socket.parentPartId}.`,
          { socketId: socket.socketId, parentPartId: socket.parentPartId },
        ),
      );
    }
  }

  const hitAreas = rigLayout.hitAreas ?? [];
  for (const hitAreaId of findDuplicateValues(hitAreas.map((hitArea) => hitArea.hitAreaId))) {
    issues.push(
      issue(
        ValidationErrorCode.DUPLICATE_HIT_AREA_ID,
        "rigLayout",
        "/hitAreas",
        `Hit area ID ${hitAreaId} is declared more than once.`,
        { hitAreaId },
      ),
    );
  }

  for (const [index, hitArea] of hitAreas.entries()) {
    if (!partIds.has(hitArea.parentPartId)) {
      issues.push(
        issue(
          ValidationErrorCode.UNKNOWN_PARENT,
          "rigLayout",
          `/hitAreas/${index}/parentPartId`,
          `Hit area ${hitArea.hitAreaId} references unknown parent ${hitArea.parentPartId}.`,
          { hitAreaId: hitArea.hitAreaId, parentPartId: hitArea.parentPartId },
        ),
      );
    }
  }

  return sortIssues(issues);
}

export function validateCharacterContractSemantics(
  characterRig: CharacterRig,
  rigLayout: RigLayout,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const partIds = new Set(rigLayout.parts.map((part) => part.partId));

  characterRig.requiredParts.forEach((partId, index) => {
    if (!partIds.has(partId)) {
      issues.push(
        issue(
          ValidationErrorCode.MISSING_REQUIRED_PART,
          "contract",
          `/characterRig/requiredParts/${index}`,
          `Required part ${partId} is missing from rig layout ${rigLayout.layoutId}.`,
          { partId, layoutId: rigLayout.layoutId },
        ),
      );
    }
  });

  const targetById = new Map(
    characterRig.animationTargets.map((target) => [target.targetId, target]),
  );
  characterRig.requiredAnimationTargets.forEach((targetId, index) => {
    if (!targetById.has(targetId)) {
      issues.push(
        issue(
          ValidationErrorCode.MISSING_ANIMATION_TARGET,
          "contract",
          `/characterRig/requiredAnimationTargets/${index}`,
          `Required animation target ${targetId} has no binding.`,
          { targetId },
        ),
      );
    }
  });

  characterRig.animationTargets.forEach((target, index) => {
    if (!partIds.has(target.partId)) {
      issues.push(
        issue(
          ValidationErrorCode.MISSING_ANIMATION_TARGET,
          "contract",
          `/characterRig/animationTargets/${index}/partId`,
          `Animation target ${target.targetId} references missing part ${target.partId}.`,
          { targetId: target.targetId, partId: target.partId },
        ),
      );
    }
  });

  return sortIssues(issues);
}

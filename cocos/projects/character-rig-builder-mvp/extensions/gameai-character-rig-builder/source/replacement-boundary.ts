import {
  SceneRigBuilderError,
  SceneRigDiagnosticCode,
} from "./diagnostics";

export interface ExistingSceneRoot {
  name: string;
  hasGeneratedMarker: boolean;
}

export interface ReplacementDecision {
  action: "create" | "replace";
  matchingIndex: number | null;
  unrelatedRootCount: number;
}

export interface AtomicReplacementOperations<T> {
  isAttached(node: T): boolean;
  attach(node: T): void;
  detach(node: T): void;
  destroy(node: T): void;
  verify(): void;
}

export function commitGeneratedRootReplacement<T>(
  current: T | null,
  replacement: T,
  operations: AtomicReplacementOperations<T>,
): void {
  if (current !== null) operations.detach(current);
  try {
    operations.attach(replacement);
    operations.verify();
  } catch (error) {
    if (operations.isAttached(replacement)) operations.detach(replacement);
    operations.destroy(replacement);
    if (current !== null) operations.attach(current);
    throw error;
  }
  if (current !== null) operations.destroy(current);
}

export function decideGeneratedRootReplacement(
  roots: readonly ExistingSceneRoot[],
  characterRootName: string,
  correlationId: string,
): ReplacementDecision {
  const matches = roots
    .map((root, index) => ({ root, index }))
    .filter(({ root }) => root.name === characterRootName);
  const unrelatedRootCount = roots.length - matches.length;

  if (matches.length > 1) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.GENERATED_ROOT_AMBIGUOUS,
      message: `Scene contains ${matches.length} roots named ${characterRootName}; replacement is unsafe.`,
      stage: "scene",
      correlationId,
      details: { characterRootName, matchCount: matches.length },
    });
  }
  const match = matches[0];
  if (match === undefined) {
    return { action: "create", matchingIndex: null, unrelatedRootCount };
  }
  if (!match.root.hasGeneratedMarker) {
    throw new SceneRigBuilderError({
      code: SceneRigDiagnosticCode.GENERATED_ROOT_CONFLICT,
      message: `Root ${characterRootName} is not marked as GameAI-generated and will not be replaced.`,
      stage: "scene",
      correlationId,
      details: { characterRootName },
    });
  }
  return {
    action: "replace",
    matchingIndex: match.index,
    unrelatedRootCount,
  };
}

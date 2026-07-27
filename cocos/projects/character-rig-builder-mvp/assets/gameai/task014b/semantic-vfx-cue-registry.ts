// Generated from the tested TASK-014B semantic VFX adapter boundary. Do not hand-edit.
const RAW_SEMANTIC_VFX_CUE_REGISTRY = [
  {
    cueDefinitionId: "footstep-dust",
    rendererKind: "footstep-dust",
    defaultDurationSeconds: 0.35,
  },
  {
    cueDefinitionId: "hand-swing-trail",
    rendererKind: "hand-trail",
    defaultDurationSeconds: 0.75,
  },
  {
    cueDefinitionId: "torso-aura",
    rendererKind: "persistent-aura",
    defaultDurationSeconds: 1,
  },
] as const;

export type SemanticVfxRendererKind =
  (typeof RAW_SEMANTIC_VFX_CUE_REGISTRY)[number]["rendererKind"];

export type SemanticVfxCueDefinitionId =
  (typeof RAW_SEMANTIC_VFX_CUE_REGISTRY)[number]["cueDefinitionId"];

export interface SemanticVfxCueRendererDefinition {
  readonly cueDefinitionId: SemanticVfxCueDefinitionId;
  readonly rendererKind: SemanticVfxRendererKind;
  readonly defaultDurationSeconds: number;
}

export const SEMANTIC_VFX_CUE_REGISTRY = validateSemanticVfxCueRegistry(
  RAW_SEMANTIC_VFX_CUE_REGISTRY,
);

export function validateSemanticVfxCueRegistry(
  entries: readonly SemanticVfxCueRendererDefinition[],
): readonly SemanticVfxCueRendererDefinition[] {
  const cueIds = new Set<string>();
  const kinds = new Set<string>();
  for (const entry of entries) {
    if (
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(entry.cueDefinitionId) ||
      !Number.isFinite(entry.defaultDurationSeconds) ||
      entry.defaultDurationSeconds <= 0 ||
      cueIds.has(entry.cueDefinitionId) ||
      kinds.has(entry.rendererKind)
    ) {
      throw new Error(
        `TASK_014B_CUE_REGISTRY_INVALID: ${entry.cueDefinitionId}`,
      );
    }
    cueIds.add(entry.cueDefinitionId);
    kinds.add(entry.rendererKind);
  }
  return Object.freeze(
    [...entries]
      .sort((left, right) =>
        left.cueDefinitionId.localeCompare(right.cueDefinitionId),
      )
      .map((entry) => Object.freeze({ ...entry })),
  );
}

export function assertNeverSemanticVfxRendererKind(value: never): never {
  throw new Error(`TASK_014B_RENDERER_KIND_UNREACHABLE: ${String(value)}`);
}

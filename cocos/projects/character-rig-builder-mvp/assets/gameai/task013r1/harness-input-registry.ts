// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.
export type HarnessSemanticAction =
  | Readonly<{ kind: "toggle-debug" }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "toggle-stress" }>
  | Readonly<{ kind: "rebuild-runtime" }>;

export interface HarnessInputBinding {
  readonly semanticActionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode: "KEY_D" | "SPACE" | "ESCAPE" | "KEY_T" | "KEY_E";
  readonly hudLabel: string;
  readonly action: HarnessSemanticAction;
  readonly displayOrder: number;
}

const RAW_HARNESS_INPUT_REGISTRY: readonly HarnessInputBinding[] = [
  {
    semanticActionId: "debug.toggle",
    displayedKey: "D",
    cocosKeyCode: "KEY_D",
    hudLabel: "Debug",
    action: { kind: "toggle-debug" },
    displayOrder: 0,
  },
  {
    semanticActionId: "playback.toggle",
    displayedKey: "Space",
    cocosKeyCode: "SPACE",
    hudLabel: "Pause/Resume",
    action: { kind: "toggle-playback" },
    displayOrder: 1,
  },
  {
    semanticActionId: "reset.exact",
    displayedKey: "Esc",
    cocosKeyCode: "ESCAPE",
    hudLabel: "Exact Reset",
    action: { kind: "exact-reset" },
    displayOrder: 2,
  },
  {
    semanticActionId: "stress.toggle",
    displayedKey: "T",
    cocosKeyCode: "KEY_T",
    hudLabel: "Transform Stress",
    action: { kind: "toggle-stress" },
    displayOrder: 3,
  },
  {
    semanticActionId: "lifecycle.rebuild",
    displayedKey: "E",
    cocosKeyCode: "KEY_E",
    hudLabel: "Lifecycle Rebuild",
    action: { kind: "rebuild-runtime" },
    displayOrder: 4,
  },
];

export function validateHarnessInputRegistry(
  bindings: readonly HarnessInputBinding[],
): readonly HarnessInputBinding[] {
  const semanticIds = new Set<string>();
  const displayedKeys = new Set<string>();
  const cocosKeys = new Set<string>();
  const actionKinds = new Set<string>();
  for (const binding of bindings) {
    if (
      semanticIds.has(binding.semanticActionId) ||
      displayedKeys.has(binding.displayedKey) ||
      cocosKeys.has(binding.cocosKeyCode) ||
      actionKinds.has(binding.action.kind)
    ) {
      throw new Error(
        `TASK_013R1_INPUT_REGISTRY_DUPLICATE: ${binding.semanticActionId}`,
      );
    }
    semanticIds.add(binding.semanticActionId);
    displayedKeys.add(binding.displayedKey);
    cocosKeys.add(binding.cocosKeyCode);
    actionKinds.add(binding.action.kind);
  }
  const required = new Set([
    "debug.toggle",
    "playback.toggle",
    "reset.exact",
    "stress.toggle",
    "lifecycle.rebuild",
  ]);
  const missing = [...required].filter((id) => !semanticIds.has(id));
  if (missing.length > 0) {
    throw new Error(`TASK_013R1_INPUT_REGISTRY_MISSING: ${missing.join(",")}`);
  }
  return Object.freeze(
    [...bindings]
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.semanticActionId.localeCompare(right.semanticActionId),
      )
      .map((entry) => Object.freeze(entry)),
  );
}

export const HARNESS_INPUT_REGISTRY = validateHarnessInputRegistry(
  RAW_HARNESS_INPUT_REGISTRY,
);

export function formatHarnessInputHelp(
  bindings: readonly HarnessInputBinding[] = HARNESS_INPUT_REGISTRY,
): string {
  return validateHarnessInputRegistry(bindings)
    .map(
      (binding) =>
        `${binding.displayedKey} ${binding.hudLabel}`,
    )
    .join(" · ");
}

export function resolveHarnessInputByCocosKey(
  cocosKeyCode: HarnessInputBinding["cocosKeyCode"],
  bindings: readonly HarnessInputBinding[] = HARNESS_INPUT_REGISTRY,
): HarnessInputBinding {
  const binding = validateHarnessInputRegistry(bindings).find(
    (entry) => entry.cocosKeyCode === cocosKeyCode,
  );
  if (binding === undefined) {
    throw new Error(`TASK_013R1_UNKNOWN_INPUT: ${cocosKeyCode}`);
  }
  return binding;
}

// Generated from the tested TASK-014B semantic VFX adapter boundary. Do not hand-edit.
import {
  TASK014B_SEMANTIC_TRACK_REGISTRY,
  type Task014BSemanticTrackId,
} from "./semantic-vfx-reference-contract";

export type SemanticVfxAction =
  | Readonly<{ kind: "select-track"; trackId: Task014BSemanticTrackId }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "switch-track" }>
  | Readonly<{ kind: "rebuild-runtime" }>
  | Readonly<{ kind: "toggle-transform-stress" }>
  | Readonly<{ kind: "toggle-debug"; debug: "joints" | "vfx" | "skeleton" | "links" }>;

export interface Task014BTransform2D {
  readonly position: Readonly<{ x: number; y: number }>;
  readonly rotationDegrees: number;
  readonly scale: Readonly<{ x: number; y: number }>;
}

export interface Task014BPoint2D {
  readonly x: number;
  readonly y: number;
}

function transform2D(
  x: number,
  y: number,
  rotationDegrees: number,
  scaleX: number,
  scaleY: number,
): Task014BTransform2D {
  const values = [x, y, rotationDegrees, scaleX, scaleY];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    scaleX === 0 ||
    scaleY === 0
  ) {
    throw new Error("TASK_014B_TRANSFORM_STRESS_INVALID");
  }
  return Object.freeze({
    position: Object.freeze({ x, y }),
    rotationDegrees,
    scale: Object.freeze({ x: scaleX, y: scaleY }),
  });
}

export const TASK014B_TRANSFORM_STRESS = Object.freeze({
  off: transform2D(0, 0, 0, 1, 1),
  on: transform2D(84, -48, 17, 1.18, 0.82),
});

export function task014bTransformStressPose(
  enabled: boolean,
): Task014BTransform2D {
  return enabled
    ? TASK014B_TRANSFORM_STRESS.on
    : TASK014B_TRANSFORM_STRESS.off;
}

export function transformTask014BPoint(
  transform: Task014BTransform2D,
  point: Task014BPoint2D,
): Task014BPoint2D {
  const radians = (transform.rotationDegrees * Math.PI) / 180;
  const scaledX = point.x * transform.scale.x;
  const scaledY = point.y * transform.scale.y;
  return Object.freeze({
    x:
      transform.position.x +
      scaledX * Math.cos(radians) -
      scaledY * Math.sin(radians),
    y:
      transform.position.y +
      scaledX * Math.sin(radians) +
      scaledY * Math.cos(radians),
  });
}

export function composeTask014BTransformPoint(
  outer: Task014BTransform2D,
  inner: Task014BTransform2D,
  point: Task014BPoint2D,
): Task014BPoint2D {
  return transformTask014BPoint(
    outer,
    transformTask014BPoint(inner, point),
  );
}

export function assertNeverSemanticVfxAction(value: never): never {
  throw new Error(
    `TASK_014B_ACTION_UNKNOWN: ${JSON.stringify(value)}`,
  );
}

export function nextTask014BTransformStressState(
  current: boolean,
  action: SemanticVfxAction,
): boolean {
  switch (action.kind) {
    case "toggle-transform-stress":
      return !current;
    case "select-track":
    case "toggle-playback":
    case "exact-reset":
    case "switch-track":
    case "rebuild-runtime":
    case "toggle-debug":
      return current;
    default:
      return assertNeverSemanticVfxAction(action);
  }
}

export interface SemanticVfxInputBinding {
  readonly semanticActionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode:
    | "DIGIT_1"
    | "DIGIT_2"
    | "DIGIT_3"
    | "DIGIT_4"
    | "SPACE"
    | "ESCAPE"
    | "KEY_T"
    | "KEY_R"
    | "KEY_J"
    | "KEY_V"
    | "KEY_K"
    | "KEY_Y"
    | "KEY_X";
  readonly hudLabel: string;
  readonly action: SemanticVfxAction;
  readonly displayOrder: number;
}

const TRACK_INPUTS: readonly SemanticVfxInputBinding[] =
  TASK014B_SEMANTIC_TRACK_REGISTRY.map((entry, index) => ({
    semanticActionId: entry.semanticActionId,
    displayedKey: entry.displayedKey,
    cocosKeyCode: entry.cocosKeyCode,
    hudLabel: entry.hudLabel,
    action: Object.freeze({
      kind: "select-track",
      trackId: entry.trackId,
    }),
    displayOrder: index,
  }));

type SemanticVfxControlAction = Exclude<
  SemanticVfxAction,
  Readonly<{ kind: "select-track"; trackId: Task014BSemanticTrackId }>
>;

function controlBinding(
  displayOrder: number,
  semanticActionId: string,
  displayedKey: string,
  cocosKeyCode: SemanticVfxInputBinding["cocosKeyCode"],
  hudLabel: string,
  action: SemanticVfxControlAction,
): SemanticVfxInputBinding {
  return Object.freeze({
    semanticActionId,
    displayedKey,
    cocosKeyCode,
    hudLabel,
    action,
    displayOrder,
  });
}

const CONTROL_INPUTS: readonly SemanticVfxInputBinding[] = [
  controlBinding(4, "playback.toggle", "Space", "SPACE", "Pause/Resume", {
    kind: "toggle-playback",
  }),
  controlBinding(5, "reset.exact", "Esc", "ESCAPE", "Exact Reset", {
    kind: "exact-reset",
  }),
  controlBinding(6, "track.switch", "T", "KEY_T", "Switch Track", {
    kind: "switch-track",
  }),
  controlBinding(
    7,
    "lifecycle.rebuild",
    "R",
    "KEY_R",
    "Lifecycle Rebuild",
    { kind: "rebuild-runtime" },
  ),
  controlBinding(
    8,
    "transform-stress.toggle",
    "X",
    "KEY_X",
    "Transform Stress",
    { kind: "toggle-transform-stress" },
  ),
  controlBinding(9, "debug.joints", "J", "KEY_J", "Joint Markers", {
    kind: "toggle-debug",
    debug: "joints",
  }),
  controlBinding(10, "debug.vfx", "V", "KEY_V", "VFX Bounds", {
    kind: "toggle-debug",
    debug: "vfx",
  }),
  controlBinding(11, "debug.skeleton", "K", "KEY_K", "Skeleton", {
    kind: "toggle-debug",
    debug: "skeleton",
  }),
  controlBinding(12, "debug.links", "Y", "KEY_Y", "Socket Links", {
    kind: "toggle-debug",
    debug: "links",
  }),
];

const RAW_INPUTS: readonly SemanticVfxInputBinding[] = [
  ...TRACK_INPUTS,
  ...CONTROL_INPUTS,
];

export const SEMANTIC_VFX_INPUT_REGISTRY =
  validateSemanticVfxInputRegistry(RAW_INPUTS);

export function validateSemanticVfxInputRegistry(
  bindings: readonly SemanticVfxInputBinding[],
): readonly SemanticVfxInputBinding[] {
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const binding of bindings) {
    if (
      ids.has(binding.semanticActionId) ||
      keys.has(binding.cocosKeyCode)
    ) {
      throw new Error(
        `TASK_014B_INPUT_REGISTRY_DUPLICATE: ${binding.semanticActionId}`,
      );
    }
    ids.add(binding.semanticActionId);
    keys.add(binding.cocosKeyCode);
  }
  if (bindings.length !== 13) {
    throw new Error("TASK_014B_INPUT_REGISTRY_INCOMPLETE");
  }
  return Object.freeze(
    [...bindings]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((entry) => Object.freeze(entry)),
  );
}

export function formatSemanticVfxInputHelp(): string {
  return SEMANTIC_VFX_INPUT_REGISTRY.map(
    (binding) => `${binding.displayedKey} ${binding.hudLabel}`,
  ).join(" · ");
}

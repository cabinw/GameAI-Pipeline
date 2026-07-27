import {
  TASK014B_SEMANTIC_TRACK_REGISTRY,
  type Task014BSemanticTrackId,
} from "./semantic-vfx-reference-contract.js";

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

export interface Task014BAabb {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
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

function aabb(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Task014BAabb {
  if (
    [minX, minY, maxX, maxY].some((value) => !Number.isFinite(value)) ||
    minX > maxX ||
    minY > maxY
  ) {
    throw new Error("TASK_014B_VISUAL_AABB_INVALID");
  }
  return Object.freeze({ minX, minY, maxX, maxY });
}

export const TASK014B_VISUAL_ACCEPTANCE = Object.freeze({
  viewport: aabb(-640, -360, 640, 360),
  safeInsetPx: 8,
  authoredRig: transform2D(100, 60, 0, 1.35, 1.35),
  characterLocalBounds: aabb(-130, -265, 130, 40),
  hudBounds: aabb(-620, 75, 620, 345),
  maximumHelpLineCharacters: 110,
  rendererLocalBounds: Object.freeze({
    "footstep-dust": aabb(-52, -24, 52, 64),
    "hand-trail": aabb(-72, -38, 18, 38),
    "persistent-aura": aabb(-72, -72, 72, 72),
  }),
  minimumRoiPixelDelta: Object.freeze({
    "footstep-dust": 300,
    "hand-trail": 500,
    "persistent-aura": 700,
  }),
});

export function transformTask014BAabb(
  transform: Task014BTransform2D,
  bounds: Task014BAabb,
): Task014BAabb {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
  ].map((point) => transformTask014BPoint(transform, point));
  return aabb(
    Math.min(...corners.map((point) => point.x)),
    Math.min(...corners.map((point) => point.y)),
    Math.max(...corners.map((point) => point.x)),
    Math.max(...corners.map((point) => point.y)),
  );
}

export function composeTask014BTransformAabb(
  outer: Task014BTransform2D,
  inner: Task014BTransform2D,
  bounds: Task014BAabb,
): Task014BAabb {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
  ].map((point) => composeTask014BTransformPoint(outer, inner, point));
  return aabb(
    Math.min(...corners.map((point) => point.x)),
    Math.min(...corners.map((point) => point.y)),
    Math.max(...corners.map((point) => point.x)),
    Math.max(...corners.map((point) => point.y)),
  );
}

export function task014bViewportOverflowPx(bounds: Task014BAabb): number {
  const { viewport, safeInsetPx } = TASK014B_VISUAL_ACCEPTANCE;
  return Math.max(
    0,
    viewport.minX + safeInsetPx - bounds.minX,
    viewport.minY + safeInsetPx - bounds.minY,
    bounds.maxX - (viewport.maxX - safeInsetPx),
    bounds.maxY - (viewport.maxY - safeInsetPx),
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

export function formatSemanticVfxInputHelpLines(): readonly string[] {
  const groups = [
    ["TRACKS", SEMANTIC_VFX_INPUT_REGISTRY.slice(0, 4)],
    ["CONTROLS", SEMANTIC_VFX_INPUT_REGISTRY.slice(4, 9)],
    ["DEBUG", SEMANTIC_VFX_INPUT_REGISTRY.slice(9)],
  ] as const;
  const lines = groups.map(
    ([label, bindings]) =>
      `${label} ${bindings
        .map((binding) => `${binding.displayedKey} ${binding.hudLabel}`)
        .join(" · ")}`,
  );
  if (
    lines.some(
      (line) =>
        line.length >
        TASK014B_VISUAL_ACCEPTANCE.maximumHelpLineCharacters,
    )
  ) {
    throw new Error("TASK_014B_HUD_HELP_OVERFLOW");
  }
  return Object.freeze(lines);
}

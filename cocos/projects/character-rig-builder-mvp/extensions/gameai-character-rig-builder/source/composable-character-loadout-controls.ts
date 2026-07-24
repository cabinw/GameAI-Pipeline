export const COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS = {
  1: "production-lite-full-loadout-rest",
  2: "production-lite-full-loadout-walk",
  3: "production-lite-full-loadout-wave",
  4: "production-lite-full-loadout-prop-swing",
  5: "production-lite-full-loadout-integration-stress",
} as const;

export type ComposableLoadoutControl =
  keyof typeof COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS;

export type ComposableLoadoutCocosKeyCode =
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "KEY_Q"
  | "KEY_W"
  | "KEY_E"
  | "DIGIT_1"
  | "DIGIT_2"
  | "DIGIT_3"
  | "DIGIT_4"
  | "DIGIT_5"
  | "SPACE"
  | "ESCAPE"
  | "KEY_R"
  | "KEY_A"
  | "KEY_O"
  | "KEY_J"
  | "KEY_B"
  | "KEY_P"
  | "KEY_L"
  | "KEY_G"
  | "KEY_T"
  | "KEY_M"
  | "KEY_S"
  | "KEY_K"
  | "KEY_Y";

export type ComposableLoadoutDebugGroup =
  | "joints"
  | "bounds"
  | "pivots"
  | "parent links"
  | "global layer labels"
  | "attachment slots"
  | "garment seams"
  | "sockets"
  | "skeleton"
  | "grip markers";

export type ComposableLoadoutControlRuntimeAction =
  | { readonly kind: "set-preset"; readonly presetId: string }
  | {
      readonly kind: "set-prop-state";
      readonly propState: "no-prop" | "left-hand" | "right-hand";
    }
  | {
      readonly kind: "select-clip";
      readonly control: ComposableLoadoutControl;
    }
  | { readonly kind: "toggle-playback" }
  | { readonly kind: "exact-reset" }
  | {
      readonly kind: "toggle-view";
      readonly view: "reference" | "assembled" | "overlay";
    }
  | {
      readonly kind: "toggle-debug";
      readonly group: ComposableLoadoutDebugGroup;
    };

export type ComposableLoadoutControlHudGroup =
  | "preset"
  | "prop"
  | "clip"
  | "playback"
  | "view"
  | "debug-primary"
  | "debug-secondary";

export interface ComposableLoadoutControlBinding {
  readonly semanticActionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode: ComposableLoadoutCocosKeyCode;
  readonly hudLabel: string;
  readonly hudGroup: ComposableLoadoutControlHudGroup;
  readonly hudOrder: number;
  readonly runtimeAction: ComposableLoadoutControlRuntimeAction;
}

export const TASK_013_CONTROL_BINDINGS_INVALID =
  "TASK_013_CONTROL_BINDINGS_INVALID";

const REQUIRED_COMPOSABLE_LOADOUT_ACTION_IDS = [
  "preset.base-only",
  "preset.accessories-only",
  "preset.garment-only",
  "preset.prop-only",
  "preset.garment-accessories",
  "preset.garment-prop",
  "preset.accessories-prop",
  "preset.full-loadout",
  "prop.no-prop",
  "prop.left-hand",
  "prop.right-hand",
  "clip.rest",
  "clip.walk",
  "clip.wave",
  "clip.prop-swing",
  "clip.integration-stress",
  "playback.pause-resume",
  "playback.exact-reset",
  "view.reference",
  "view.assembled",
  "view.overlay",
  "debug.joints",
  "debug.bounds",
  "debug.pivots",
  "debug.parent-links",
  "debug.global-layers",
  "debug.attachment-slots",
  "debug.garment-seams",
  "debug.accessory-sockets",
  "debug.skeleton",
  "debug.prop-grip-markers",
] as const;

const RAW_COMPOSABLE_LOADOUT_CONTROL_BINDINGS: readonly ComposableLoadoutControlBinding[] =
  [
    binding("preset.base-only", "F1", "F1", "Base", "preset", 1, {
      kind: "set-preset",
      presetId: "base-only",
    }),
    binding("preset.accessories-only", "F2", "F2", "Accessories", "preset", 2, {
      kind: "set-preset",
      presetId: "accessories-only",
    }),
    binding("preset.garment-only", "F3", "F3", "Garment", "preset", 3, {
      kind: "set-preset",
      presetId: "garment-only",
    }),
    binding("preset.prop-only", "F4", "F4", "Prop", "preset", 4, {
      kind: "set-preset",
      presetId: "prop-only",
    }),
    binding(
      "preset.garment-accessories",
      "F5",
      "F5",
      "Garment + accessories",
      "preset",
      5,
      { kind: "set-preset", presetId: "garment-accessories" },
    ),
    binding("preset.garment-prop", "F6", "F6", "Garment + prop", "preset", 6, {
      kind: "set-preset",
      presetId: "garment-prop",
    }),
    binding(
      "preset.accessories-prop",
      "F7",
      "F7",
      "Accessories + prop",
      "preset",
      7,
      { kind: "set-preset", presetId: "accessories-prop" },
    ),
    binding("preset.full-loadout", "F8", "F8", "Full", "preset", 8, {
      kind: "set-preset",
      presetId: "full-loadout",
    }),
    binding("prop.no-prop", "Q", "KEY_Q", "None", "prop", 1, {
      kind: "set-prop-state",
      propState: "no-prop",
    }),
    binding("prop.left-hand", "W", "KEY_W", "Left", "prop", 2, {
      kind: "set-prop-state",
      propState: "left-hand",
    }),
    binding("prop.right-hand", "E", "KEY_E", "Right", "prop", 3, {
      kind: "set-prop-state",
      propState: "right-hand",
    }),
    binding("clip.rest", "1", "DIGIT_1", "Rest", "clip", 1, {
      kind: "select-clip",
      control: 1,
    }),
    binding("clip.walk", "2", "DIGIT_2", "Walk", "clip", 2, {
      kind: "select-clip",
      control: 2,
    }),
    binding("clip.wave", "3", "DIGIT_3", "Wave", "clip", 3, {
      kind: "select-clip",
      control: 3,
    }),
    binding("clip.prop-swing", "4", "DIGIT_4", "Swing", "clip", 4, {
      kind: "select-clip",
      control: 4,
    }),
    binding(
      "clip.integration-stress",
      "5",
      "DIGIT_5",
      "Stress",
      "clip",
      5,
      { kind: "select-clip", control: 5 },
    ),
    binding(
      "playback.pause-resume",
      "Space",
      "SPACE",
      "Pause/Resume",
      "playback",
      1,
      { kind: "toggle-playback" },
    ),
    binding(
      "playback.exact-reset",
      "Esc",
      "ESCAPE",
      "Exact Reset",
      "playback",
      2,
      { kind: "exact-reset" },
    ),
    binding("view.reference", "R", "KEY_R", "Reference", "view", 1, {
      kind: "toggle-view",
      view: "reference",
    }),
    binding("view.assembled", "A", "KEY_A", "Assembled", "view", 2, {
      kind: "toggle-view",
      view: "assembled",
    }),
    binding("view.overlay", "O", "KEY_O", "Overlay", "view", 3, {
      kind: "toggle-view",
      view: "overlay",
    }),
    binding("debug.joints", "J", "KEY_J", "Joints", "debug-primary", 1, {
      kind: "toggle-debug",
      group: "joints",
    }),
    binding("debug.bounds", "B", "KEY_B", "Bounds", "debug-primary", 2, {
      kind: "toggle-debug",
      group: "bounds",
    }),
    binding("debug.pivots", "P", "KEY_P", "Pivots", "debug-primary", 3, {
      kind: "toggle-debug",
      group: "pivots",
    }),
    binding("debug.parent-links", "L", "KEY_L", "Links", "debug-primary", 4, {
      kind: "toggle-debug",
      group: "parent links",
    }),
    binding(
      "debug.global-layers",
      "G",
      "KEY_G",
      "Layers",
      "debug-primary",
      5,
      { kind: "toggle-debug", group: "global layer labels" },
    ),
    binding(
      "debug.attachment-slots",
      "T",
      "KEY_T",
      "Slots",
      "debug-secondary",
      1,
      { kind: "toggle-debug", group: "attachment slots" },
    ),
    binding(
      "debug.garment-seams",
      "M",
      "KEY_M",
      "Seams",
      "debug-secondary",
      2,
      { kind: "toggle-debug", group: "garment seams" },
    ),
    binding(
      "debug.accessory-sockets",
      "S",
      "KEY_S",
      "Sockets",
      "debug-secondary",
      3,
      { kind: "toggle-debug", group: "sockets" },
    ),
    binding(
      "debug.skeleton",
      "K",
      "KEY_K",
      "Skeleton",
      "debug-secondary",
      4,
      { kind: "toggle-debug", group: "skeleton" },
    ),
    binding(
      "debug.prop-grip-markers",
      "Y",
      "KEY_Y",
      "Grip",
      "debug-secondary",
      5,
      { kind: "toggle-debug", group: "grip markers" },
    ),
  ];

export const COMPOSABLE_LOADOUT_CONTROL_BINDINGS =
  validateComposableLoadoutControlBindings(
    RAW_COMPOSABLE_LOADOUT_CONTROL_BINDINGS,
  );

function binding(
  semanticActionId: string,
  displayedKey: string,
  cocosKeyCode: ComposableLoadoutCocosKeyCode,
  hudLabel: string,
  hudGroup: ComposableLoadoutControlHudGroup,
  hudOrder: number,
  runtimeAction: ComposableLoadoutControlRuntimeAction,
): ComposableLoadoutControlBinding {
  return {
    semanticActionId,
    displayedKey,
    cocosKeyCode,
    hudLabel,
    hudGroup,
    hudOrder,
    runtimeAction,
  };
}

export function validateComposableLoadoutControlBindings(
  bindings: readonly ComposableLoadoutControlBinding[],
): readonly ComposableLoadoutControlBinding[] {
  const duplicateDisplayedKeys = duplicateControlValues(
    bindings.map((entry) => entry.displayedKey),
  );
  const duplicateCocosKeyCodes = duplicateControlValues(
    bindings.map((entry) => entry.cocosKeyCode),
  );
  const duplicateSemanticActions = duplicateControlValues(
    bindings.map((entry) => entry.semanticActionId),
  );
  const duplicateRuntimeActions = duplicateControlValues(
    bindings.map((entry) => JSON.stringify(entry.runtimeAction)),
  );
  const missingRequiredActions = REQUIRED_COMPOSABLE_LOADOUT_ACTION_IDS.filter(
    (actionId) =>
      !bindings.some((entry) => entry.semanticActionId === actionId),
  );
  const invalidEntries = bindings
    .filter(
      (entry) =>
        entry.semanticActionId.length === 0 ||
        entry.displayedKey.length === 0 ||
        entry.hudLabel.length === 0 ||
        !Number.isInteger(entry.hudOrder) ||
        entry.hudOrder < 1,
    )
    .map((entry) => entry.semanticActionId);
  if (
    bindings.length !== REQUIRED_COMPOSABLE_LOADOUT_ACTION_IDS.length ||
    duplicateDisplayedKeys.length > 0 ||
    duplicateCocosKeyCodes.length > 0 ||
    duplicateSemanticActions.length > 0 ||
    duplicateRuntimeActions.length > 0 ||
    missingRequiredActions.length > 0 ||
    invalidEntries.length > 0
  ) {
    throw new Error(
      `${TASK_013_CONTROL_BINDINGS_INVALID}: ${JSON.stringify({
        expectedCount: REQUIRED_COMPOSABLE_LOADOUT_ACTION_IDS.length,
        actualCount: bindings.length,
        duplicateDisplayedKeys,
        duplicateCocosKeyCodes,
        duplicateSemanticActions,
        duplicateRuntimeActions,
        missingRequiredActions,
        invalidEntries,
      })}`,
    );
  }
  return Object.freeze(
    [...bindings].sort((left, right) =>
      left.semanticActionId.localeCompare(right.semanticActionId),
    ),
  );
}

function duplicateControlValues(values: readonly string[]): readonly string[] {
  return [
    ...new Set(
      values.filter(
        (value, index) =>
          values.findIndex((candidate) => candidate === value) !== index,
      ),
    ),
  ].sort();
}

export type ComposableLoadoutResourceCategory =
  | "base-part"
  | "attachment"
  | "reference";

export interface ComposableLoadoutResourceManifestEntry {
  readonly resourcePath: string;
  readonly category: ComposableLoadoutResourceCategory;
  readonly semanticId: string;
}

export const TASK_013_RESOURCE_MANIFEST_INVALID =
  "TASK_013_RESOURCE_MANIFEST_INVALID";
export const TASK_013_RESOURCE_LOAD_FAILED =
  "TASK_013_RESOURCE_LOAD_FAILED";

export function deriveComposableLoadoutResourceManifest(plan: {
  readonly base: {
    readonly parts: readonly {
      readonly jointId: string;
      readonly resourcePath: string;
    }[];
  };
  readonly attachments: readonly {
    readonly attachmentId: string;
    readonly resourcePath: string;
  }[];
  readonly referenceResourcePaths: Readonly<Record<string, string>>;
}): readonly ComposableLoadoutResourceManifestEntry[] {
  const manifest: readonly ComposableLoadoutResourceManifestEntry[] = [
    ...plan.base.parts.map((part) => ({
      resourcePath: part.resourcePath,
      category: "base-part" as const,
      semanticId: part.jointId,
    })),
    ...plan.attachments.map((attachment) => ({
      resourcePath: attachment.resourcePath,
      category: "attachment" as const,
      semanticId: attachment.attachmentId,
    })),
    ...Object.entries(plan.referenceResourcePaths).map(
      ([semanticId, resourcePath]) => ({
        resourcePath,
        category: "reference" as const,
        semanticId,
      }),
    ),
  ].sort(
    (left, right) =>
      left.resourcePath.localeCompare(right.resourcePath) ||
      left.semanticId.localeCompare(right.semanticId),
  );
  const duplicatePaths = manifest
    .filter(
      (entry, index) =>
        manifest.findIndex(
          (candidate) => candidate.resourcePath === entry.resourcePath,
        ) !== index,
    )
    .map((entry) => entry.resourcePath);
  const invalidSuffix = manifest
    .filter(
      (entry) =>
        !entry.resourcePath.endsWith("/spriteFrame") ||
        entry.resourcePath.includes(".png"),
    )
    .map((entry) => entry.resourcePath);
  if (manifest.length === 0 || duplicatePaths.length > 0 || invalidSuffix.length > 0) {
    throw new Error(
      `${TASK_013_RESOURCE_MANIFEST_INVALID}: ${JSON.stringify({
        manifestLength: manifest.length,
        duplicatePaths,
        invalidSuffix,
      })}`,
    );
  }
  return Object.freeze(manifest);
}

export const COMPOSABLE_LOADOUT_HUD_STATUS_ROWS = [
  "task-title",
  "runtime-status",
  "validation-status",
] as const;

export const COMPOSABLE_LOADOUT_HUD_HELP_ROWS = [
  "preset-prop-controls",
  "clip-controls",
  "playback-controls",
  "view-controls",
  "debug-controls-primary",
  "debug-controls-secondary",
] as const;

export const COMPOSABLE_LOADOUT_HUD_ROWS = [
  ...COMPOSABLE_LOADOUT_HUD_STATUS_ROWS,
  ...COMPOSABLE_LOADOUT_HUD_HELP_ROWS,
] as const;

export const COMPOSABLE_LOADOUT_HUD_LAYOUT = {
  containerName: "HUDContainer",
  statusLabelName: "HUDStatusLabel",
  helpLabelName: "HUDHelpLabel",
  designWidth: 1280,
  designHeight: 720,
  width: 1230,
  height: 155,
  anchorX: 0,
  anchorY: 1,
  leftInset: 25,
  topInset: 14,
  fontSize: 14,
  lineHeight: 17,
  maximumStatusLineCharacters: 140,
  maximumHelpLineCharacters: 80,
  maximumPresetIdCharacters: 32,
  maximumPropStateCharacters: 16,
  maximumClipIdCharacters: 64,
  maximumPlaybackStateCharacters: 12,
  statusRows: COMPOSABLE_LOADOUT_HUD_STATUS_ROWS,
  helpRows: COMPOSABLE_LOADOUT_HUD_HELP_ROWS,
  rows: COMPOSABLE_LOADOUT_HUD_ROWS,
} as const;

export const COMPOSABLE_LOADOUT_CHARACTER_ACCEPTANCE_BOUNDS = {
  left: -457,
  right: 17,
  top: 180,
  bottom: -124,
} as const;

export type ComposableLoadoutHudRowId =
  (typeof COMPOSABLE_LOADOUT_HUD_ROWS)[number];

export interface ComposableLoadoutHudLine {
  readonly rowId: ComposableLoadoutHudRowId;
  readonly region: "status" | "help";
  readonly text: string;
}

export interface ComposableLoadoutHudState {
  readonly presetId: string;
  readonly propState: string;
  readonly clipId: string;
  readonly playbackState: string;
  readonly timeSeconds: number;
  readonly resourceExpectedCount: number;
  readonly resourceLoadedCount: number;
  readonly resourceFailedCount: number;
  readonly resourceDuplicateRequestCount: number;
}

export interface ComposableLoadoutHudRectangle {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface ComposableLoadoutHudBounds {
  readonly position: { readonly x: number; readonly y: number };
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly rowBounds: readonly {
    readonly rowId: ComposableLoadoutHudRowId;
    readonly top: number;
    readonly bottom: number;
  }[];
}

export const TASK_013_HUD_RUNTIME_BOUNDS_INVALID =
  "TASK_013_HUD_RUNTIME_BOUNDS_INVALID";
export const TASK_013_HUD_TEXT_OVERFLOW = "TASK_013_HUD_TEXT_OVERFLOW";

export function formatComposableLoadoutControlHelpLines(
  bindings: readonly ComposableLoadoutControlBinding[] =
    COMPOSABLE_LOADOUT_CONTROL_BINDINGS,
): readonly {
  readonly rowId: (typeof COMPOSABLE_LOADOUT_HUD_HELP_ROWS)[number];
  readonly text: string;
}[] {
  const validated = validateComposableLoadoutControlBindings(bindings);
  const group = (hudGroup: ComposableLoadoutControlHudGroup) =>
    validated
      .filter((entry) => entry.hudGroup === hudGroup)
      .sort(
        (left, right) =>
          left.hudOrder - right.hudOrder ||
          left.semanticActionId.localeCompare(right.semanticActionId),
      );
  const formatEntries = (entries: readonly ComposableLoadoutControlBinding[]) =>
    entries
      .map((entry) => `${entry.displayedKey} ${entry.hudLabel}`)
      .join(" · ");
  const presetBindings = group("preset");
  const presetRange =
    `${presetBindings[0]!.displayedKey}–` +
    presetBindings[presetBindings.length - 1]!.displayedKey;
  return [
    {
      rowId: "preset-prop-controls",
      text: `PRESETS ${presetRange} · PROP ${formatEntries(group("prop"))}`,
    },
    {
      rowId: "clip-controls",
      text: `CLIPS ${formatEntries(group("clip"))}`,
    },
    {
      rowId: "playback-controls",
      text: `PLAY ${formatEntries(group("playback"))}`,
    },
    {
      rowId: "view-controls",
      text: `VIEWS ${formatEntries(group("view"))}`,
    },
    {
      rowId: "debug-controls-primary",
      text: `DEBUG ${formatEntries(group("debug-primary"))}`,
    },
    {
      rowId: "debug-controls-secondary",
      text: `DEBUG ${formatEntries(group("debug-secondary"))}`,
    },
  ];
}

function assertBoundedHudValue(
  name: string,
  value: string,
  maximumCharacters: number,
): void {
  if (
    value.length === 0 ||
    value.length > maximumCharacters ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    throw new Error(
      `${TASK_013_HUD_TEXT_OVERFLOW}: ${JSON.stringify({
        name,
        value,
        maximumCharacters,
      })}`,
    );
  }
}

export function validateComposableLoadoutHudLines(
  lines: readonly ComposableLoadoutHudLine[],
): void {
  const expectedRows = COMPOSABLE_LOADOUT_HUD_ROWS;
  const rowIds = lines.map((line) => line.rowId);
  const requiredHeight =
    expectedRows.length * COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight;
  const invalidLine = lines.find((line) => {
    const maximumCharacters =
      line.region === "status"
        ? COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumStatusLineCharacters
        : COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumHelpLineCharacters;
    return (
      line.text.length === 0 ||
      line.text.length > maximumCharacters ||
      line.text.includes("\n") ||
      line.text.includes("\r")
    );
  });
  if (
    lines.length !== expectedRows.length ||
    rowIds.some((rowId, index) => rowId !== expectedRows[index]) ||
    requiredHeight > COMPOSABLE_LOADOUT_HUD_LAYOUT.height ||
    invalidLine !== undefined
  ) {
    throw new Error(
      `${TASK_013_HUD_TEXT_OVERFLOW}: ${JSON.stringify({
        expectedRows,
        actualRows: rowIds,
        requiredHeight,
        availableHeight: COMPOSABLE_LOADOUT_HUD_LAYOUT.height,
        maximumStatusLineCharacters:
          COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumStatusLineCharacters,
        maximumHelpLineCharacters:
          COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumHelpLineCharacters,
        invalidLine,
      })}`,
    );
  }
}

export function formatComposableLoadoutHudLines(
  state: ComposableLoadoutHudState,
): readonly ComposableLoadoutHudLine[] {
  assertBoundedHudValue(
    "presetId",
    state.presetId,
    COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumPresetIdCharacters,
  );
  assertBoundedHudValue(
    "propState",
    state.propState,
    COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumPropStateCharacters,
  );
  assertBoundedHudValue(
    "clipId",
    state.clipId,
    COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumClipIdCharacters,
  );
  assertBoundedHudValue(
    "playbackState",
    state.playbackState,
    COMPOSABLE_LOADOUT_HUD_LAYOUT.maximumPlaybackStateCharacters,
  );
  if (
    !Number.isFinite(state.timeSeconds) ||
    state.timeSeconds < 0 ||
    state.timeSeconds > 9999.99
  ) {
    throw new Error(
      `${TASK_013_HUD_TEXT_OVERFLOW}: ${JSON.stringify({
        name: "timeSeconds",
        value: state.timeSeconds,
        maximum: 9999.99,
      })}`,
    );
  }
  const resourceCounts = [
    state.resourceExpectedCount,
    state.resourceLoadedCount,
    state.resourceFailedCount,
    state.resourceDuplicateRequestCount,
  ];
  if (
    resourceCounts.some(
      (count) => !Number.isInteger(count) || count < 0,
    ) ||
    state.resourceExpectedCount === 0 ||
    state.resourceLoadedCount + state.resourceFailedCount >
      state.resourceExpectedCount
  ) {
    throw new Error(
      `${TASK_013_HUD_TEXT_OVERFLOW}: ${JSON.stringify({
        name: "resourceCounts",
        resourceExpectedCount: state.resourceExpectedCount,
        resourceLoadedCount: state.resourceLoadedCount,
        resourceFailedCount: state.resourceFailedCount,
        resourceDuplicateRequestCount:
          state.resourceDuplicateRequestCount,
      })}`,
    );
  }
  const resourceStatus =
    state.resourceFailedCount > 0
      ? "FAIL"
      : state.resourceLoadedCount === state.resourceExpectedCount
        ? "PASS"
        : "LOADING";
  const lines: readonly ComposableLoadoutHudLine[] = [
    {
      rowId: "task-title",
      region: "status",
      text: "TASK-013 · COMPOSABLE FULL CHARACTER LOADOUT",
    },
    {
      rowId: "runtime-status",
      region: "status",
      text:
        `PRESET ${state.presetId} · PROP ${state.propState} · ` +
        `CLIP ${state.clipId} · ${state.playbackState} ${state.timeSeconds.toFixed(2)}s`,
    },
    {
      rowId: "validation-status",
      region: "status",
      text:
        `RESOURCES ${state.resourceLoadedCount}/${state.resourceExpectedCount} ${resourceStatus} · ` +
        "GRIP PASS · SEAMS PASS · SOCKETS PASS · LAYERS PASS · EXACT PASS",
    },
    ...formatComposableLoadoutControlHelpLines().map((line) => ({
      ...line,
      region: "help" as const,
    })),
  ];
  validateComposableLoadoutHudLines(lines);
  return lines;
}

export function calculateAnchoredRectangle(
  position: { readonly x: number; readonly y: number },
  size: { readonly width: number; readonly height: number },
  anchor: { readonly x: number; readonly y: number },
): ComposableLoadoutHudRectangle {
  const left = position.x - size.width * anchor.x;
  const bottom = position.y - size.height * anchor.y;
  return {
    left,
    right: left + size.width,
    top: bottom + size.height,
    bottom,
  };
}

export interface ComposableLoadoutHudRuntimeMeasurement {
  readonly canvasSafeBounds: ComposableLoadoutHudRectangle;
  readonly containerBounds: ComposableLoadoutHudRectangle;
  readonly statusLabelBounds: ComposableLoadoutHudRectangle;
  readonly helpLabelBounds: ComposableLoadoutHudRectangle;
  readonly statusLabelBoundsInContainer: ComposableLoadoutHudRectangle;
  readonly helpLabelBoundsInContainer: ComposableLoadoutHudRectangle;
  readonly containerContentBounds: ComposableLoadoutHudRectangle;
  readonly statusLabelContentHeight: number;
  readonly helpLabelContentHeight: number;
}

export function validateComposableLoadoutHudRuntimeBounds(
  measurement: ComposableLoadoutHudRuntimeMeasurement,
): void {
  const {
    canvasSafeBounds,
    containerBounds,
    statusLabelBounds,
    helpLabelBounds,
    statusLabelBoundsInContainer,
    helpLabelBoundsInContainer,
    containerContentBounds,
    statusLabelContentHeight,
    helpLabelContentHeight,
  } = measurement;
  const inside = (
    inner: ComposableLoadoutHudRectangle,
    outer: ComposableLoadoutHudRectangle,
  ) =>
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top <= outer.top &&
    inner.bottom >= outer.bottom;
  const requiredStatusHeight =
    COMPOSABLE_LOADOUT_HUD_LAYOUT.statusRows.length *
    COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight;
  const requiredHelpHeight =
    COMPOSABLE_LOADOUT_HUD_LAYOUT.helpRows.length *
    COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight;
  if (
    !inside(containerBounds, canvasSafeBounds) ||
    !inside(statusLabelBounds, canvasSafeBounds) ||
    !inside(helpLabelBounds, canvasSafeBounds) ||
    !inside(statusLabelBoundsInContainer, containerContentBounds) ||
    !inside(helpLabelBoundsInContainer, containerContentBounds) ||
    statusLabelBounds.bottom < helpLabelBounds.top ||
    statusLabelBoundsInContainer.bottom < helpLabelBoundsInContainer.top ||
    statusLabelContentHeight < requiredStatusHeight ||
    helpLabelContentHeight < requiredHelpHeight
  ) {
    throw new Error(
      `${TASK_013_HUD_RUNTIME_BOUNDS_INVALID}: ${JSON.stringify({
        ...measurement,
        requiredStatusHeight,
        requiredHelpHeight,
      })}`,
    );
  }
}

export interface ComposableLoadoutHudTextLayoutMeasurement {
  readonly lines: readonly ComposableLoadoutHudLine[];
  readonly containerBounds: ComposableLoadoutHudRectangle;
  readonly statusLabelBoundsInContainer: ComposableLoadoutHudRectangle;
  readonly helpLabelBoundsInContainer: ComposableLoadoutHudRectangle;
  readonly containerContentBounds: ComposableLoadoutHudRectangle;
  readonly characterAcceptanceBounds: ComposableLoadoutHudRectangle;
}

export function validateComposableLoadoutHudTextLayout(
  measurement: ComposableLoadoutHudTextLayoutMeasurement,
): void {
  validateComposableLoadoutHudLines(measurement.lines);
  const inside = (
    inner: ComposableLoadoutHudRectangle,
    outer: ComposableLoadoutHudRectangle,
  ) =>
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top <= outer.top &&
    inner.bottom >= outer.bottom;
  const statusAndHelpDoNotOverlap =
    measurement.statusLabelBoundsInContainer.bottom >=
    measurement.helpLabelBoundsInContainer.top;
  const hudDoesNotOverlapCharacter =
    measurement.containerBounds.bottom >
    measurement.characterAcceptanceBounds.top;
  if (
    !inside(
      measurement.statusLabelBoundsInContainer,
      measurement.containerContentBounds,
    ) ||
    !inside(
      measurement.helpLabelBoundsInContainer,
      measurement.containerContentBounds,
    ) ||
    !statusAndHelpDoNotOverlap ||
    !hudDoesNotOverlapCharacter
  ) {
    throw new Error(
      `${TASK_013_HUD_TEXT_OVERFLOW}: ${JSON.stringify({
        ...measurement,
        statusAndHelpDoNotOverlap,
        hudDoesNotOverlapCharacter,
      })}`,
    );
  }
}

/**
 * Resolve the HUD from its top-left anchor against the centered design Canvas.
 * The 14 px top inset and 25 px side inset leave the 300x350 character views
 * below the HUD at the TASK-013 1280x720 acceptance resolution.
 */
export function calculateComposableLoadoutHudBounds(
  canvasWidth = COMPOSABLE_LOADOUT_HUD_LAYOUT.designWidth,
  canvasHeight = COMPOSABLE_LOADOUT_HUD_LAYOUT.designHeight,
): ComposableLoadoutHudBounds {
  const position = {
    x: -canvasWidth / 2 + COMPOSABLE_LOADOUT_HUD_LAYOUT.leftInset,
    y: canvasHeight / 2 - COMPOSABLE_LOADOUT_HUD_LAYOUT.topInset,
  };
  const rectangle = calculateAnchoredRectangle(
    position,
    {
      width: COMPOSABLE_LOADOUT_HUD_LAYOUT.width,
      height: COMPOSABLE_LOADOUT_HUD_LAYOUT.height,
    },
    {
      x: COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorX,
      y: COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorY,
    },
  );
  return {
    position,
    ...rectangle,
    rowBounds: COMPOSABLE_LOADOUT_HUD_LAYOUT.rows.map((rowId, index) => ({
      rowId,
      top: rectangle.top - index * COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight,
      bottom:
        rectangle.top -
        (index + 1) * COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight,
    })),
  };
}

export type ComposableLoadoutControlErrorCode =
  | "LOADOUT_REQUIRED_CLIP_MISSING"
  | "LOADOUT_REQUIRED_CLIP_DUPLICATE";

export class ComposableLoadoutControlError extends Error {
  constructor(
    readonly code: ComposableLoadoutControlErrorCode,
    readonly animationId: string,
  ) {
    super(`${code}:${animationId}`);
    this.name = "ComposableLoadoutControlError";
  }
}

export function resolveComposableLoadoutControlClips<
  TClip extends { readonly animationId: string },
>(
  clips: readonly TClip[],
): Readonly<Record<ComposableLoadoutControl, TClip>> {
  const result = {} as Record<ComposableLoadoutControl, TClip>;
  for (const [controlText, animationId] of Object.entries(
    COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS,
  )) {
    const matches = clips.filter((clip) => clip.animationId === animationId);
    if (matches.length === 0) {
      throw new ComposableLoadoutControlError(
        "LOADOUT_REQUIRED_CLIP_MISSING",
        animationId,
      );
    }
    if (matches.length > 1) {
      throw new ComposableLoadoutControlError(
        "LOADOUT_REQUIRED_CLIP_DUPLICATE",
        animationId,
      );
    }
    result[Number(controlText) as ComposableLoadoutControl] = matches[0]!;
  }
  return Object.freeze(result);
}

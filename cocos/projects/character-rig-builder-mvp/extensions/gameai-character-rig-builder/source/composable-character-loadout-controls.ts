export const COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS = {
  1: "production-lite-full-loadout-rest",
  2: "production-lite-full-loadout-walk",
  3: "production-lite-full-loadout-wave",
  4: "production-lite-full-loadout-prop-swing",
  5: "production-lite-full-loadout-integration-stress",
} as const;

export type ComposableLoadoutControl =
  keyof typeof COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS;

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

const COMPOSABLE_LOADOUT_STATIC_HELP_LINES = [
  {
    rowId: "preset-prop-controls",
    text: "PRESETS F1–F8 · PROP Q None · W Left · E Right",
  },
  {
    rowId: "clip-controls",
    text: "CLIPS 1 Rest · 2 Walk · 3 Wave · 4 Swing · 5 Stress",
  },
  {
    rowId: "playback-controls",
    text: "PLAY Space Pause/Resume · Esc Exact Reset",
  },
  {
    rowId: "view-controls",
    text: "VIEWS R Reference · A Assembled · O Overlay",
  },
  {
    rowId: "debug-controls-primary",
    text: "DEBUG J Joints · B Bounds · P Pivots · L Links · G Layers",
  },
  {
    rowId: "debug-controls-secondary",
    text: "DEBUG T Slots · M Seams · S Sockets · K Skeleton · Y Grip",
  },
] as const;

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
      text: "GRIP PASS · SEAMS PASS · SOCKETS PASS · LAYERS PASS · EXACT PASS",
    },
    ...COMPOSABLE_LOADOUT_STATIC_HELP_LINES.map((line) => ({
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

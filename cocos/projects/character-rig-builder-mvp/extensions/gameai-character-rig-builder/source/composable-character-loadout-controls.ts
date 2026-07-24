export const COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS = {
  1: "production-lite-full-loadout-rest",
  2: "production-lite-full-loadout-walk",
  3: "production-lite-full-loadout-wave",
  4: "production-lite-full-loadout-prop-swing",
  5: "production-lite-full-loadout-integration-stress",
} as const;

export type ComposableLoadoutControl =
  keyof typeof COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS;

export const COMPOSABLE_LOADOUT_HUD_LAYOUT = {
  designWidth: 1280,
  designHeight: 720,
  width: 1230,
  height: 155,
  anchorX: 0,
  anchorY: 1,
  leftInset: 25,
  topInset: 14,
  lineHeight: 20,
  rows: [
    "task-title",
    "runtime-status",
    "validation-status",
    "shortcuts",
  ],
} as const;

export interface ComposableLoadoutHudBounds {
  readonly position: { readonly x: number; readonly y: number };
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly rowBounds: readonly {
    readonly rowId: (typeof COMPOSABLE_LOADOUT_HUD_LAYOUT.rows)[number];
    readonly top: number;
    readonly bottom: number;
  }[];
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
  const left =
    position.x -
    COMPOSABLE_LOADOUT_HUD_LAYOUT.width *
      COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorX;
  const top =
    position.y +
    COMPOSABLE_LOADOUT_HUD_LAYOUT.height *
      (1 - COMPOSABLE_LOADOUT_HUD_LAYOUT.anchorY);
  return {
    position,
    left,
    right: left + COMPOSABLE_LOADOUT_HUD_LAYOUT.width,
    top,
    bottom: top - COMPOSABLE_LOADOUT_HUD_LAYOUT.height,
    rowBounds: COMPOSABLE_LOADOUT_HUD_LAYOUT.rows.map((rowId, index) => ({
      rowId,
      top: top - index * COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight,
      bottom: top - (index + 1) * COMPOSABLE_LOADOUT_HUD_LAYOUT.lineHeight,
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

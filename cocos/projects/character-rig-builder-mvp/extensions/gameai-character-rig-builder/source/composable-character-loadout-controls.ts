export const COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS = {
  1: "production-lite-full-loadout-rest",
  2: "production-lite-full-loadout-walk",
  3: "production-lite-full-loadout-wave",
  4: "production-lite-full-loadout-prop-swing",
  5: "production-lite-full-loadout-integration-stress",
} as const;

export type ComposableLoadoutControl =
  keyof typeof COMPOSABLE_LOADOUT_CONTROL_CLIP_IDS;

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

// Generated from the tested TASK-012 semantic control resolver. Do not hand-edit.
export const ONE_HANDED_PROP_CONTROL_CLIP_IDS = {
  1: "production-lite-prop-rest",
  2: "production-lite-prop-walk",
  3: "production-lite-prop-swing",
  4: "production-lite-prop-stress",
} as const;

export type OneHandedPropControl =
  keyof typeof ONE_HANDED_PROP_CONTROL_CLIP_IDS;

export type OneHandedPropControlErrorCode =
  | "PROP_DEMO_REQUIRED_CLIP_MISSING"
  | "PROP_DEMO_REQUIRED_CLIP_DUPLICATE";

export class OneHandedPropControlError extends Error {
  constructor(
    readonly code: OneHandedPropControlErrorCode,
    readonly animationId: string,
  ) {
    super(`${code}: ${animationId}`);
    this.name = "OneHandedPropControlError";
  }
}

export function resolveOneHandedPropControlClips<
  TClip extends { readonly animationId: string },
>(
  clips: readonly TClip[],
): Readonly<Record<OneHandedPropControl, TClip>> {
  const resolved = {} as Record<OneHandedPropControl, TClip>;
  for (const [controlText, animationId] of Object.entries(
    ONE_HANDED_PROP_CONTROL_CLIP_IDS,
  )) {
    const matches = clips.filter((clip) => clip.animationId === animationId);
    if (matches.length === 0) {
      throw new OneHandedPropControlError(
        "PROP_DEMO_REQUIRED_CLIP_MISSING",
        animationId,
      );
    }
    if (matches.length > 1) {
      throw new OneHandedPropControlError(
        "PROP_DEMO_REQUIRED_CLIP_DUPLICATE",
        animationId,
      );
    }
    resolved[Number(controlText) as OneHandedPropControl] = matches[0]!;
  }
  return Object.freeze(resolved);
}

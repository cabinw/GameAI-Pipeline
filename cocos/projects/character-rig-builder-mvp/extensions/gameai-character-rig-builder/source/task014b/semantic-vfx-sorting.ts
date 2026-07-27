export type SemanticVfxLayerRole =
  | "behind-character"
  | "character-overlay"
  | "in-front-of-character";

export const SEMANTIC_VFX_SORTING_POLICY = Object.freeze({
  behindCharacter: 5,
  characterMinimum: 10,
  characterMaximum: 39,
  characterOverlay: 50,
  inFrontOfCharacter: 70,
  debug: 100,
  hud: 200,
});

export function semanticVfxSortingOrder(
  layerRole: string | undefined,
): number {
  if (layerRole === "behind-character") {
    return SEMANTIC_VFX_SORTING_POLICY.behindCharacter;
  }
  if (layerRole === "character-overlay") {
    return SEMANTIC_VFX_SORTING_POLICY.characterOverlay;
  }
  if (layerRole === "in-front-of-character") {
    return SEMANTIC_VFX_SORTING_POLICY.inFrontOfCharacter;
  }
  throw new Error(
    `TASK_014B_UNSUPPORTED_LAYER_ROLE: ${String(layerRole)}`,
  );
}

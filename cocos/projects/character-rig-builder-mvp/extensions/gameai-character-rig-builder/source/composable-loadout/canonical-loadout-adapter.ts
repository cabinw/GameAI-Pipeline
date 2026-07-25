import {
  HARNESS_SORTING_POLICY,
  validateHarnessSortingPolicy,
  type HarnessSortingPolicy,
} from "../task013r1/harness-sorting-registry.js";
import {
  HARNESS_SPATIAL_TOLERANCE_PX,
} from "../task013r1/harness-spatial.js";
import {
  PROP_INPUT_REGISTRY,
  validatePropInputRegistry,
  type PropInputBinding,
} from "../task013r6/prop-input-registry.js";
import {
  createPropResourceManifest,
} from "../task013r6/prop-resource-manifest.js";
import {
  validatePropBridgePlan,
  type PropBridgePlan,
  type PropBridgeValidationSnapshot,
} from "../task013r6/prop-bridge-runtime-contract.js";
import {
  PropBridgeState,
  PROP_REQUIRED_CLIP_IDS,
  type PropBridgeStateSnapshot,
} from "../task013r6/prop-state.js";
import type {
  HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest.js";

export const CANONICAL_LOADOUT_ADAPTER_ID =
  "composable-character-loadout-reference-v2";
export const CANONICAL_LOADOUT_ADAPTER_VERSION = "1.0.0";
export const CANONICAL_LOADOUT_SCENE_PATH =
  "assets/composable-character-loadout-reference-v2.scene";

export interface CanonicalLoadoutAdapterDescriptor {
  readonly adapterId: typeof CANONICAL_LOADOUT_ADAPTER_ID;
  readonly adapterVersion: typeof CANONICAL_LOADOUT_ADAPTER_VERSION;
  readonly scenePath: typeof CANONICAL_LOADOUT_SCENE_PATH;
  readonly plan: PropBridgePlan;
  readonly validation: PropBridgeValidationSnapshot;
  readonly resources: readonly HarnessResolvedResource[];
  readonly inputRegistry: readonly PropInputBinding[];
  readonly sortingPolicy: HarnessSortingPolicy;
  readonly semanticClipIds: readonly string[];
  readonly resetDefaults: PropBridgeStateSnapshot;
  readonly spatialTolerancePx: number;
}

export function createCanonicalLoadoutAdapter(
  plan: PropBridgePlan,
): CanonicalLoadoutAdapterDescriptor {
  const validation = validatePropBridgePlan(plan);
  const resources = createPropResourceManifest(plan);
  const inputRegistry = validatePropInputRegistry(PROP_INPUT_REGISTRY);
  const sortingPolicy = validateHarnessSortingPolicy(
    HARNESS_SORTING_POLICY,
  );
  const resetDefaults = new PropBridgeState(
    plan.defaultGarmentStateId,
    plan.defaultPropStateId,
  ).exactReset();
  return Object.freeze({
    adapterId: CANONICAL_LOADOUT_ADAPTER_ID,
    adapterVersion: CANONICAL_LOADOUT_ADAPTER_VERSION,
    scenePath: CANONICAL_LOADOUT_SCENE_PATH,
    plan,
    validation,
    resources,
    inputRegistry,
    sortingPolicy,
    semanticClipIds: PROP_REQUIRED_CLIP_IDS,
    resetDefaults,
    spatialTolerancePx: HARNESS_SPATIAL_TOLERANCE_PX,
  });
}

export {
  HARNESS_SORTING_POLICY as CANONICAL_LOADOUT_SORTING_POLICY,
  HARNESS_SPATIAL_TOLERANCE_PX as CANONICAL_LOADOUT_SPATIAL_TOLERANCE_PX,
  PROP_INPUT_REGISTRY as CANONICAL_LOADOUT_INPUT_REGISTRY,
  PROP_REQUIRED_CLIP_IDS as CANONICAL_LOADOUT_SEMANTIC_CLIP_IDS,
};
export * from "../task013r6/prop-bridge-runtime-contract.js";

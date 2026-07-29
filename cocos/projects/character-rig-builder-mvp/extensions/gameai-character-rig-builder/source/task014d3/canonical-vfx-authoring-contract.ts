import type {
  SemanticCueDescriptor,
  VfxCompileContext,
  VfxResourceDescriptor,
} from "@gameai/vfx-authoring";

import {
  TASK014D2_RESOURCE_REGISTRY,
} from "../task014d2/cocos-vfx-harness-contract.js";

export const TASK014D3_AUTHORING_SOURCE =
  "examples/vfx-cue-authoring/canonical-full-loadout-vfx.json";

export const TASK014D3_SEMANTIC_CUE_DESCRIPTORS:
readonly SemanticCueDescriptor[] = Object.freeze([
  cue("combined-reference", "emit", "one-shot"),
  cue("footstep-dust", "emit", "one-shot"),
  cue("hand-tool-trail", "start-stop", "looping"),
  cue("persistent-aura", "start-stop", "persistent"),
]);

export const TASK014D3_RESOURCE_DESCRIPTORS:
readonly VfxResourceDescriptor[] = Object.freeze(
  TASK014D2_RESOURCE_REGISTRY.map((entry) =>
    Object.freeze({
      resourceId: entry.resourceId,
      recipeKind: entry.recipeKind,
      compatiblePrimitives: Object.freeze([...entry.compatiblePrimitives]),
    })),
);

export const TASK014D3_PARAMETER_OVERRIDES = Object.freeze({
  "footstep-dust": Object.freeze({ intensity: 0.9 }),
  "hand-tool-trail": Object.freeze({ "trail-width": 1.25 }),
  "persistent-aura": Object.freeze({
    tint: Object.freeze({ r: 0.28, g: 0.72, b: 1, a: 1 }),
  }),
});

export const TASK014D3_COMPILE_CONTEXT: VfxCompileContext = Object.freeze({
  semanticCues: TASK014D3_SEMANTIC_CUE_DESCRIPTORS,
  resources: TASK014D3_RESOURCE_DESCRIPTORS,
  parameterOverrides: TASK014D3_PARAMETER_OVERRIDES,
});

function cue(
  cueId: string,
  commandMode: SemanticCueDescriptor["commandMode"],
  lifecycle: SemanticCueDescriptor["lifecycle"],
): SemanticCueDescriptor {
  return Object.freeze({ cueId, commandMode, lifecycle });
}

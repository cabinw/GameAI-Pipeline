// Generated from the tested TASK-014B semantic VFX adapter boundary. Do not hand-edit.
import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
} from "../task013r1/harness-resource-manifest";

export const SEMANTIC_VFX_LOGICAL_RESOURCE_MANIFEST = Object.freeze([
  Object.freeze({
    logicalId: "semantic-vfx-config",
    relativePath: "semantic-vfx-config",
    kind: "json" as const,
  }),
]);

export function resolveSemanticVfxResourceManifest(
  manifest: readonly HarnessLogicalResource[] =
    SEMANTIC_VFX_LOGICAL_RESOURCE_MANIFEST,
) {
  return resolveLogicalResourceManifest(
    manifest,
    "task014b",
    "TASK_014B",
  );
}

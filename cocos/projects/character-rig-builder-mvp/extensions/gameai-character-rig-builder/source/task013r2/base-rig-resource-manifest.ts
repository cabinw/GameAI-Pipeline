import type { BaseRigBridgePlan } from "./base-rig-contract.js";
import { validateBaseRigBridgePlan } from "./base-rig-contract.js";
import {
  resolveLogicalResourceManifest,
  type HarnessLogicalResource,
  type HarnessResolvedResource,
} from "../task013r1/harness-resource-manifest.js";

export function createBaseRigResourceManifest(
  plan: BaseRigBridgePlan,
): readonly HarnessResolvedResource[] {
  validateBaseRigBridgePlan(plan);
  const logical: readonly HarnessLogicalResource[] = plan.parts.map(
    (part) =>
      Object.freeze({
        logicalId: `part-${part.jointId}`,
        relativePath: part.resourcePath,
        kind: "sprite-frame" as const,
      }),
  );
  return resolveLogicalResourceManifest(logical, "", "TASK_013R2");
}

export function resourceLogicalIdForJoint(jointId: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(jointId)) {
    throw new Error(`TASK_013R2_RESOURCE_JOINT_ID_INVALID: ${jointId}`);
  }
  return `part-${jointId}`;
}

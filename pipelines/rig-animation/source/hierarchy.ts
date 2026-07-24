import { composeJointPose } from "./sampler.js";
import type {
  AffineTransform2D,
  AnimationVector2,
  EvaluatedRigPose,
  JointFinalPose,
  RigAnimationSample,
  RigHierarchyDiagnostic,
  RigHierarchyJoint,
} from "./types.js";

function round(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function finitePose(joint: RigHierarchyJoint): boolean {
  const { position, rotationDegrees, scale } = joint.restPose;
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(rotationDegrees) &&
    Number.isFinite(scale.x) &&
    Number.isFinite(scale.y) &&
    scale.x !== 0 &&
    scale.y !== 0
  );
}

function sortDiagnostics(
  diagnostics: RigHierarchyDiagnostic[],
): RigHierarchyDiagnostic[] {
  return diagnostics.sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      (left.jointId ?? "").localeCompare(right.jointId ?? "") ||
      left.message.localeCompare(right.message),
  );
}

export function validateRigHierarchy(
  hierarchy: readonly RigHierarchyJoint[],
): readonly RigHierarchyDiagnostic[] {
  const diagnostics: RigHierarchyDiagnostic[] = [];
  const ids = new Set<string>();
  for (const joint of hierarchy) {
    if (ids.has(joint.jointId)) {
      diagnostics.push({
        code: "DUPLICATE_HIERARCHY_JOINT",
        jointId: joint.jointId,
        message: `Joint ${joint.jointId} occurs more than once.`,
      });
    }
    ids.add(joint.jointId);
    if (!finitePose(joint)) {
      diagnostics.push({
        code: "NON_FINITE_HIERARCHY_TRANSFORM",
        jointId: joint.jointId,
        message: `Joint ${joint.jointId} has a non-finite or zero-scale rest transform.`,
      });
    }
  }

  const roots = hierarchy.filter((joint) => joint.parentId === null);
  if (roots.length !== 1) {
    diagnostics.push({
      code: "INVALID_HIERARCHY_ROOT_COUNT",
      message: `Rig hierarchy requires exactly one root; received ${roots.length}.`,
    });
  }
  for (const joint of hierarchy) {
    if (joint.parentId !== null && !ids.has(joint.parentId)) {
      diagnostics.push({
        code: "UNKNOWN_HIERARCHY_PARENT",
        jointId: joint.jointId,
        message: `Joint ${joint.jointId} references unknown parent ${joint.parentId}.`,
      });
    }
  }

  const parentById = new Map(
    hierarchy.map((joint) => [joint.jointId, joint.parentId] as const),
  );
  const cycleMembers = new Set<string>();
  for (const joint of hierarchy) {
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let current: string | null | undefined = joint.jointId;
    while (current !== null && current !== undefined) {
      const existing = pathIndex.get(current);
      if (existing !== undefined) {
        for (const member of path.slice(existing)) cycleMembers.add(member);
        break;
      }
      pathIndex.set(current, path.length);
      path.push(current);
      current = parentById.get(current);
    }
  }
  for (const jointId of [...cycleMembers].sort()) {
    diagnostics.push({
      code: "HIERARCHY_PARENT_CYCLE",
      jointId,
      message: `Joint ${jointId} belongs to a parent cycle.`,
    });
  }
  return Object.freeze(sortDiagnostics(diagnostics));
}

function localTransform(pose: JointFinalPose): AffineTransform2D {
  const radians = (pose.rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return Object.freeze({
    a: round(cosine * pose.scale.x),
    b: round(sine * pose.scale.x),
    c: round(-sine * pose.scale.y),
    d: round(cosine * pose.scale.y),
    tx: round(pose.position.x),
    ty: round(pose.position.y),
  });
}

export function multiplyAffineTransforms(
  parent: AffineTransform2D,
  local: AffineTransform2D,
): AffineTransform2D {
  return Object.freeze({
    a: round(parent.a * local.a + parent.c * local.b),
    b: round(parent.b * local.a + parent.d * local.b),
    c: round(parent.a * local.c + parent.c * local.d),
    d: round(parent.b * local.c + parent.d * local.d),
    tx: round(parent.a * local.tx + parent.c * local.ty + parent.tx),
    ty: round(parent.b * local.tx + parent.d * local.ty + parent.ty),
  });
}

export function transformPoint(
  transform: AffineTransform2D,
  point: Readonly<AnimationVector2>,
): Readonly<AnimationVector2> {
  return Object.freeze({
    x: round(transform.a * point.x + transform.c * point.y + transform.tx),
    y: round(transform.b * point.x + transform.d * point.y + transform.ty),
  });
}

export function evaluateRigPose(
  hierarchy: readonly RigHierarchyJoint[],
  sample?: RigAnimationSample,
): EvaluatedRigPose {
  const diagnostics = validateRigHierarchy(hierarchy);
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics
        .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
        .join("\n"),
    );
  }

  const byId = new Map(hierarchy.map((joint) => [joint.jointId, joint] as const));
  const children = new Map<string, string[]>();
  for (const joint of hierarchy) {
    if (joint.parentId === null) continue;
    const siblings = children.get(joint.parentId) ?? [];
    siblings.push(joint.jointId);
    children.set(joint.parentId, siblings);
  }
  for (const siblings of children.values()) siblings.sort();

  const root = hierarchy.find((joint) => joint.parentId === null)!;
  const evaluationOrder: string[] = [];
  const mutable: Record<string, EvaluatedRigPose["joints"][string]> = {};
  const visit = (
    jointId: string,
    parentWorld: AffineTransform2D | undefined,
  ): void => {
    const joint = byId.get(jointId)!;
    const localPose = composeJointPose(
      joint.restPose,
      sample?.joints[jointId],
    );
    const local = localTransform(localPose);
    const world =
      parentWorld === undefined
        ? local
        : multiplyAffineTransforms(parentWorld, local);
    evaluationOrder.push(jointId);
    mutable[jointId] = Object.freeze({
      jointId,
      parentId: joint.parentId,
      localPose,
      worldTransform: world,
      worldPivot: Object.freeze({ x: world.tx, y: world.ty }),
    });
    for (const childId of children.get(jointId) ?? []) visit(childId, world);
  };
  visit(root.jointId, undefined);

  return Object.freeze({
    joints: Object.freeze(
      Object.fromEntries(
        Object.entries(mutable).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    ),
    evaluationOrder: Object.freeze(evaluationOrder),
  });
}

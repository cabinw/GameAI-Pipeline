import {
  AssetDiagnosticCode,
  sortDiagnostics,
  type CharacterAssetDiagnostic,
} from "./diagnostics";
import type {
  CanonicalArtProvenance,
  HiddenExtensionDeclaration,
} from "./canonical-art-gate";
import type { CharacterAssetManifest } from "./types";

export interface ArticulationJointSpecification {
  jointId: string;
  partId: string;
  coverPartId: string;
}

export interface ArticulationStressPose {
  poseId: string;
  rotations: Readonly<Record<string, number>>;
}

export interface ArticulationSafetySpecification {
  schemaVersion: "1.0.0";
  rigId: string;
  extensionRadius: number;
  stressPoses: readonly ArticulationStressPose[];
  joints: readonly ArticulationJointSpecification[];
  briefcaseBranch: readonly string[];
}

export interface ArticulationJointObservation {
  jointId: string;
  partId: string;
  coverPartId: string;
  overlapPixelCount: number;
  proximalCoverageRatio: number;
}

export interface ArticulationPoseObservation {
  poseId: string;
  joints: readonly ArticulationJointObservation[];
  briefcaseAttachmentError: number;
}

export interface ArticulationSafetyEvidence {
  poses: readonly ArticulationPoseObservation[];
}

function extensionFor(
  provenance: CanonicalArtProvenance,
  joint: ArticulationJointSpecification,
): HiddenExtensionDeclaration | undefined {
  return provenance.hiddenExtensions.find(
    (entry) =>
      entry.partId === joint.partId &&
      entry.jointId === joint.jointId &&
      entry.coverPartId === joint.coverPartId,
  );
}

export function validateArticulationSafety(
  manifest: CharacterAssetManifest,
  provenance: CanonicalArtProvenance,
  specification: ArticulationSafetySpecification,
  evidence: ArticulationSafetyEvidence,
): readonly CharacterAssetDiagnostic[] {
  const diagnostics: CharacterAssetDiagnostic[] = [];
  const parts = new Map(manifest.parts.map((part) => [part.partId, part]));
  const jointIds = new Set<string>();
  const poseIds = new Set<string>();

  if (
    specification.schemaVersion !== "1.0.0" ||
    !Number.isInteger(specification.extensionRadius) ||
    specification.extensionRadius <= 0 ||
    specification.joints.length === 0 ||
    specification.stressPoses.length !== 2
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
      stage: "articulation",
      path: "articulation-safety.json",
      message: "The articulation-safety contract is invalid or incompatible.",
    });
  }

  for (const pose of specification.stressPoses) {
    if (poseIds.has(pose.poseId)) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "articulation-safety.json",
        message: `Stress pose ${pose.poseId} is duplicated.`,
      });
    }
    poseIds.add(pose.poseId);
    for (const joint of specification.joints) {
      const rotation = pose.rotations[joint.partId];
      if (!Number.isFinite(rotation) || rotation === 0) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
          stage: "articulation",
          path: "articulation-safety.json",
          partId: joint.partId,
          message: `Stress pose ${pose.poseId} must rotate ${joint.partId}.`,
        });
      }
    }
  }
  if (specification.stressPoses.length === 2) {
    const [firstPose, secondPose] = specification.stressPoses;
    for (const joint of specification.joints) {
      const first = firstPose?.rotations[joint.partId];
      const second = secondPose?.rotations[joint.partId];
      if (
        !Number.isFinite(first) ||
        !Number.isFinite(second) ||
        Math.sign(first!) === Math.sign(second!)
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
          stage: "articulation",
          path: "articulation-safety.json",
          partId: joint.partId,
          message: `${joint.jointId} must be stressed in both rotation directions.`,
        });
      }
    }
  }

  for (const joint of specification.joints) {
    const part = parts.get(joint.partId);
    const cover = parts.get(joint.coverPartId);
    if (
      jointIds.has(joint.jointId) ||
      part === undefined ||
      cover === undefined ||
      part.parentId !== cover.partId
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "articulation-safety.json",
        partId: joint.partId,
        message: `Joint ${joint.jointId} has an invalid child/cover relationship.`,
      });
    }
    jointIds.add(joint.jointId);
    if (
      part !== undefined &&
      cover !== undefined &&
      cover.drawOrder <= part.drawOrder
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_DRAW_ORDER_INVALID,
        stage: "articulation",
        path: part.sourceRelativePath,
        partId: part.partId,
        message: `Cover ${cover.partId} must draw above ${part.partId}.`,
      });
    }
    const extension = extensionFor(provenance, joint);
    if (extension === undefined || extension.regions.length === 0) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "asset-provenance.json",
        partId: joint.partId,
        message: `Joint ${joint.jointId} has no declared hidden extension.`,
      });
    }
  }

  for (const pose of specification.stressPoses) {
    const observation = evidence.poses.find(
      (candidate) => candidate.poseId === pose.poseId,
    );
    if (observation === undefined) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: `articulation/stress-${pose.poseId}.png`,
        message: `Stress pose ${pose.poseId} has no rendered evidence.`,
      });
      continue;
    }
    for (const joint of specification.joints) {
      const result = observation.joints.find(
        (candidate) => candidate.jointId === joint.jointId,
      );
      if (result === undefined || result.overlapPixelCount <= 0) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_TRANSPARENT_GAP,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: joint.partId,
          message: `Joint ${joint.jointId} has no child/cover overlap.`,
        });
      }
      if (result === undefined || result.proximalCoverageRatio < 0.85) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_EXPOSED_CUT_EDGE,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: joint.partId,
          message: `Joint ${joint.jointId} exposes its proximal cut edge.`,
          ...(result === undefined
            ? {}
            : {
                details: {
                  proximalCoverageRatio: result.proximalCoverageRatio,
                },
              }),
        });
      }
    }
    if (observation.briefcaseAttachmentError > 0.001) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID,
        stage: "articulation",
        path: `articulation/stress-${pose.poseId}.png`,
        partId: "briefcase",
        message: "The briefcase attachment drifts from the rotating right-hand branch.",
      });
    }
  }

  const expectedBriefcaseBranch = [
    "upper-arm-right",
    "forearm-right",
    "hand-right",
    "briefcase",
  ];
  if (
    specification.briefcaseBranch.join("\u0000") !==
    expectedBriefcaseBranch.join("\u0000")
  ) {
    diagnostics.push({
      code: AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID,
      stage: "articulation",
      path: "articulation-safety.json",
      partId: "briefcase",
      message: "The declared briefcase branch is not the accepted right-hand chain.",
    });
  }
  for (let index = 1; index < expectedBriefcaseBranch.length; index += 1) {
    const part = parts.get(expectedBriefcaseBranch[index]!);
    if (part?.parentId !== expectedBriefcaseBranch[index - 1]) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_BRIEFCASE_BRANCH_INVALID,
        stage: "articulation",
        path: part?.sourceRelativePath ?? "rig-layout.json",
        partId: expectedBriefcaseBranch[index]!,
        message: "The briefcase hierarchy does not inherit the right-hand rotation.",
      });
    }
  }

  return sortDiagnostics(diagnostics);
}

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
  seamIntersectionPixelCount: number;
  intersectionConnectedToChild: boolean;
  intersectionConnectedToCover: boolean;
  corridorTransparentCrossing: boolean;
  branchConnected: boolean;
  longestVisibleCutEdge: number;
}

export interface ArticulationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArticulationPartObservation {
  partId: string;
  renderedAlphaCount: number;
  visibleAlphaCount: number;
  sourceAlphaCount: number;
  renderedBounds: ArticulationBounds | null;
  expectedRenderedBounds: ArticulationBounds | null;
  visibleBounds: ArticulationBounds | null;
  expectedVisibleBounds: ArticulationBounds | null;
  expectedVisibleAlphaCount: number;
  finalVisiblePixelCount: number;
  expectedFinalVisiblePixelCount: number;
  finalVisibleBounds: ArticulationBounds | null;
  expectedFinalVisibleBounds: ArticulationBounds | null;
  finalVisiblePixelHash: string;
  expectedFinalVisiblePixelHash: string;
  occludingParts: readonly ArticulationOccluderObservation[];
  expectedOccludingParts: readonly ArticulationOccluderObservation[];
  transformPreserved: boolean;
  hasRotatedAncestor: boolean;
  withinCanvas: boolean;
}

export interface ArticulationOccluderObservation {
  partId: string;
  pixelCount: number;
}

export interface ArticulationPoseObservation {
  poseId: string;
  joints: readonly ArticulationJointObservation[];
  parts: readonly ArticulationPartObservation[];
  briefcaseAttachmentError: number;
  briefcaseConnected: boolean;
  finalCompositePixelHash: string;
  encodedCompositePixelHash: string;
  finalCompositeMatchesEncoded: boolean;
  ownerCoverageMatchesComposite: boolean;
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
  const expectedPoseIds = new Set([
    "left-arm-positive",
    "left-arm-negative",
    "right-arm-positive",
    "right-arm-negative",
    "left-leg-positive",
    "left-leg-negative",
    "right-leg-positive",
    "right-leg-negative",
    "combined-positive",
    "combined-negative",
  ]);

  if (
    specification.schemaVersion !== "1.0.0" ||
    !Number.isInteger(specification.extensionRadius) ||
    specification.extensionRadius <= 0 ||
    specification.joints.length === 0 ||
    specification.stressPoses.length !== expectedPoseIds.size
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
    if (!expectedPoseIds.has(pose.poseId)) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "articulation-safety.json",
        message: `Stress pose ${pose.poseId} is not a required diagnostic pose.`,
      });
    }
    if (Object.keys(pose.rotations).length === 0) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "articulation-safety.json",
        message: `Stress pose ${pose.poseId} must rotate at least one part.`,
      });
    }
    for (const [partId, rotation] of Object.entries(pose.rotations)) {
      if (!parts.has(partId) || !Number.isFinite(rotation) || rotation === 0) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
          stage: "articulation",
          path: "articulation-safety.json",
          partId,
          message: `Stress pose ${pose.poseId} has an invalid rotation for ${partId}.`,
        });
      }
      const minimum = minimumStressRotation(partId);
      if (minimum !== undefined && Math.abs(rotation) < minimum) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
          stage: "articulation",
          path: "articulation-safety.json",
          partId,
          message: `Stress rotation for ${partId} must be at least ${minimum} degrees.`,
        });
      }
    }
  }
  for (const requiredPoseId of expectedPoseIds) {
    if (!poseIds.has(requiredPoseId)) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_SPEC_INVALID,
        stage: "articulation",
        path: "articulation-safety.json",
        message: `Required stress pose ${requiredPoseId} is missing.`,
      });
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
    const observedPartIds = new Set(observation.parts.map((part) => part.partId));
    if (
      !observation.finalCompositeMatchesEncoded ||
      !observation.ownerCoverageMatchesComposite ||
      observation.finalCompositePixelHash !==
        observation.encodedCompositePixelHash
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH,
        stage: "articulation",
        path: `articulation/stress-${pose.poseId}.png`,
        message:
          "The encoded stress PNG does not match the final draw-ordered owner composite.",
      });
    }
    for (const manifestPart of manifest.parts) {
      const part = observation.parts.find(
        (candidate) => candidate.partId === manifestPart.partId,
      );
      if (
        part === undefined ||
        !observedPartIds.has(manifestPart.partId) ||
        part.renderedAlphaCount <= 0 ||
        part.visibleAlphaCount <= 0
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_PART_MISSING,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: manifestPart.partId,
          message: `Part ${manifestPart.partId} is missing from the stress render.`,
        });
        continue;
      }
      if (
        part.finalVisiblePixelCount <= 0 ||
        part.finalVisibleBounds === null
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_FINAL_PART_INVISIBLE,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: manifestPart.partId,
          message: `Part ${manifestPart.partId} has no pixels in the final composite.`,
        });
      }
      if (
        isProtectedFinalInvariant(manifestPart.partId) &&
        !part.hasRotatedAncestor
      ) {
        if (
          part.finalVisiblePixelCount !==
            part.expectedFinalVisiblePixelCount ||
          !sameBounds(
            part.finalVisibleBounds,
            part.expectedFinalVisibleBounds,
          ) ||
          !sameOccluders(
            part.occludingParts,
            part.expectedOccludingParts,
          )
        ) {
          diagnostics.push({
            code: AssetDiagnosticCode.ARTICULATION_UNEXPECTED_OCCLUSION,
            stage: "articulation",
            path: `articulation/stress-${pose.poseId}.png`,
            partId: manifestPart.partId,
            message: `Unrotated part ${manifestPart.partId} has unexpected final occlusion.`,
            details: {
              finalVisiblePixelCount: part.finalVisiblePixelCount,
              expectedFinalVisiblePixelCount:
                part.expectedFinalVisiblePixelCount,
              occludingParts: part.occludingParts,
            },
          });
        }
        if (
          part.finalVisiblePixelHash !==
          part.expectedFinalVisiblePixelHash
        ) {
          diagnostics.push({
            code: AssetDiagnosticCode.ARTICULATION_FINAL_COMPOSITE_MISMATCH,
            stage: "articulation",
            path: `articulation/stress-${pose.poseId}.png`,
            partId: manifestPart.partId,
            message: `Unrotated part ${manifestPart.partId} changed in the final composite.`,
          });
        }
      }
      if (!part.withinCanvas || part.renderedBounds === null) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_PART_OUT_OF_BOUNDS,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: manifestPart.partId,
          message: `Part ${manifestPart.partId} extends outside the output canvas.`,
        });
      }
      const alphaRatio =
        part.renderedAlphaCount / Math.max(part.sourceAlphaCount, 1);
      if (
        (!part.hasRotatedAncestor &&
          (!part.transformPreserved ||
            part.renderedAlphaCount !== part.sourceAlphaCount ||
            !sameBounds(part.renderedBounds, part.expectedRenderedBounds))) ||
        alphaRatio < 0.85
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_UNEXPECTED_ALPHA_LOSS,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: manifestPart.partId,
          message: `Part ${manifestPart.partId} does not preserve its expected stress-render pixels.`,
          details: {
            renderedAlphaCount: part.renderedAlphaCount,
            sourceAlphaCount: part.sourceAlphaCount,
            visibleAlphaCount: part.visibleAlphaCount,
            expectedVisibleAlphaCount: part.expectedVisibleAlphaCount,
          },
        });
      }
    }
    if (
      observation.parts.length !== manifest.parts.length ||
      observedPartIds.size !== manifest.parts.length
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_PART_MISSING,
        stage: "articulation",
        path: `articulation/stress-${pose.poseId}.png`,
        message: `Stress render contains ${observedPartIds.size} of ${manifest.parts.length} expected parts.`,
      });
    }
    for (const joint of specification.joints) {
      const result = observation.joints.find(
        (candidate) => candidate.jointId === joint.jointId,
      );
      if (
        result === undefined ||
        result.seamIntersectionPixelCount <= 0 ||
        !result.intersectionConnectedToChild ||
        !result.intersectionConnectedToCover ||
        (result.corridorTransparentCrossing &&
          result.seamIntersectionPixelCount < 25)
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_BRANCH_DISCONNECTED,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: joint.partId,
          message: `Joint ${joint.jointId} is disconnected inside its pivot seam corridor.`,
        });
      }
      if (
        result === undefined ||
        !result.branchConnected
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_BRANCH_DISCONNECTED,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: joint.partId,
          message: `The complete branch through ${joint.jointId} is disconnected.`,
        });
      }
      if (
        result === undefined ||
        (result.longestVisibleCutEdge >= 16 &&
          (result.proximalCoverageRatio < 0.5 ||
            result.corridorTransparentCrossing))
      ) {
        diagnostics.push({
          code: AssetDiagnosticCode.ARTICULATION_VISIBLE_CUT_EDGE,
          stage: "articulation",
          path: `articulation/stress-${pose.poseId}.png`,
          partId: joint.partId,
          message: `Joint ${joint.jointId} exposes its proximal cut edge.`,
          ...(result === undefined
            ? {}
            : {
                details: {
                  proximalCoverageRatio: result.proximalCoverageRatio,
                  longestVisibleCutEdge: result.longestVisibleCutEdge,
                },
              }),
        });
      }
    }
    if (
      observation.briefcaseAttachmentError > 0.001 ||
      !observation.briefcaseConnected
    ) {
      diagnostics.push({
        code: AssetDiagnosticCode.ARTICULATION_BRANCH_DISCONNECTED,
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

function sameBounds(
  left: ArticulationBounds | null,
  right: ArticulationBounds | null,
): boolean {
  return (
    left?.x === right?.x &&
    left?.y === right?.y &&
    left?.width === right?.width &&
    left?.height === right?.height
  );
}

function minimumStressRotation(partId: string): number | undefined {
  if (partId.startsWith("upper-arm-") || partId.startsWith("thigh-")) return 8;
  if (partId.startsWith("forearm-") || partId.startsWith("shin-")) return 12;
  if (partId.startsWith("hand-") || partId.startsWith("foot-")) return 6;
  return undefined;
}

function isProtectedFinalInvariant(partId: string): boolean {
  return ["head", "cap", "hair", "sunglasses", "torso"].includes(partId);
}

function sameOccluders(
  left: readonly ArticulationOccluderObservation[],
  right: readonly ArticulationOccluderObservation[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

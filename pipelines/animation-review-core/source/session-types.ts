import type { NormalizedRigAnimation } from "@gameai/rig-animation";

import type {
  AnimationReviewDocument,
  ReviewFindingSource,
  ReviewSeverity,
} from "./types";

export const ANIMATION_REVIEW_SESSION_SCHEMA_VERSION = "1.0.0" as const;
export const ANIMATION_REVIEW_PATCH_SCHEMA_VERSION = "1.0.0" as const;
export const ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION = "1.0.0" as const;
export const ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION = "1.0.0" as const;

export const ANIMATION_REVIEW_SESSION_LIMITS = Object.freeze({
  maxPatches: 256,
  maxHistoryEntries: 128,
  maxAuditEntries: 2_048,
  maxValidationResults: 512,
  maxDiagnoses: 1_000,
  maxParts: 1_000,
  maxSerializedCharacters: 2_000_000,
});

export type AnimationReviewPatchStatus =
  | "AI_PROPOSED"
  | "HUMAN_ACCEPTED"
  | "HUMAN_REJECTED"
  | "PREVIEWED"
  | "APPLIED";

export type AnimationReviewPatchSource = "ai" | "human";

export interface AnimationReviewPivotOffsetOperation {
  readonly kind: "pivot-offset";
  readonly partId: string;
  readonly offset: Readonly<{ x: number; y: number }>;
}

export interface AnimationReviewRotationOffsetOperation {
  readonly kind: "rotation-offset";
  readonly trackIndex: number;
  readonly keyframeIndex: number;
  readonly deltaDegrees: number;
}

export interface AnimationReviewKeyframeTimeOperation {
  readonly kind: "keyframe-time";
  readonly trackIndex: number;
  readonly keyframeIndex: number;
  readonly time: number;
}

export interface AnimationReviewKeyframeValueOperation {
  readonly kind: "keyframe-value";
  readonly trackIndex: number;
  readonly keyframeIndex: number;
  readonly value: number | Readonly<{ x: number; y: number }>;
}

export interface AnimationReviewCurveOperation {
  readonly kind: "curve";
  readonly trackIndex: number;
  readonly keyframeIndex: number;
  readonly interpolation: "linear" | "step";
  readonly easing:
    | "linear"
    | "ease-in-sine"
    | "ease-out-sine"
    | "ease-in-out-sine";
}

export interface AnimationReviewLayerOrderOperation {
  readonly kind: "layer-order";
  readonly partId: string;
  readonly drawOrder: number;
}

export type AnimationReviewPatchOperation =
  | AnimationReviewPivotOffsetOperation
  | AnimationReviewRotationOffsetOperation
  | AnimationReviewKeyframeTimeOperation
  | AnimationReviewKeyframeValueOperation
  | AnimationReviewCurveOperation
  | AnimationReviewLayerOrderOperation;

export interface AnimationReviewPatchDocument {
  readonly schemaVersion: typeof ANIMATION_REVIEW_PATCH_SCHEMA_VERSION;
  readonly patchId: string;
  readonly findingId?: string;
  readonly expectedRevision: number;
  readonly source: AnimationReviewPatchSource;
  readonly status: AnimationReviewPatchStatus;
  readonly operation: AnimationReviewPatchOperation;
  readonly actorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AnimationReviewRuleKind = "automatic" | "human-judgment";
export type AnimationReviewRuleStatus =
  | "unresolved"
  | "waived"
  | "passed"
  | "failed";

export interface AnimationReviewValidationResult {
  readonly schemaVersion: typeof ANIMATION_REVIEW_VALIDATION_SCHEMA_VERSION;
  readonly ruleId: string;
  readonly ruleKind: AnimationReviewRuleKind;
  readonly status: AnimationReviewRuleStatus;
  readonly details: string;
  readonly relatedFindingIds: readonly string[];
  readonly decidedBy?: string;
  readonly decidedAt?: string;
}

export interface AnimationReviewDiagnosis {
  readonly schemaVersion: typeof ANIMATION_REVIEW_DIAGNOSIS_SCHEMA_VERSION;
  readonly diagnosisId: string;
  readonly findingId: string;
  readonly source: ReviewFindingSource;
  readonly severity: ReviewSeverity;
  readonly status: "open" | "resolved";
  readonly summary: string;
  readonly targetIds: readonly string[];
  readonly timeRange?: Readonly<{ start: number; end: number }>;
  readonly ruleId: string;
  readonly providerId: string;
}

export interface AnimationReviewPresentationPart {
  readonly partId: string;
  readonly pivotOffset: Readonly<{ x: number; y: number }>;
  readonly drawOrder: number;
}

export interface AnimationReviewEditableState {
  readonly animation: NormalizedRigAnimation;
  readonly parts: readonly AnimationReviewPresentationPart[];
}

export interface AnimationReviewPreviewState {
  readonly patchId: string;
  readonly state: AnimationReviewEditableState;
}

export interface AnimationReviewHistoryEntry {
  readonly historyId: string;
  readonly patchId: string;
  readonly beforeState: AnimationReviewEditableState;
  readonly afterState: AnimationReviewEditableState;
  readonly beforeReview: AnimationReviewDocument;
  readonly afterReview: AnimationReviewDocument;
  readonly actorId: string;
  readonly appliedAt: string;
}

export type AnimationReviewSessionAuditAction =
  | "session-created"
  | "analysis-ran"
  | "patch-proposed"
  | "patch-decided"
  | "patch-edited"
  | "patch-previewed"
  | "patch-applied"
  | "undo"
  | "redo"
  | "human-rule-decided"
  | "human-finding-created"
  | "human-rule-created"
  | "exact-reset";

export interface AnimationReviewSessionAuditEntry {
  readonly entryId: string;
  readonly action: AnimationReviewSessionAuditAction;
  readonly actorId: string;
  readonly revision: number;
  readonly details: string;
  readonly createdAt: string;
}

export interface AnimationReviewSessionDocument {
  readonly schemaVersion: typeof ANIMATION_REVIEW_SESSION_SCHEMA_VERSION;
  readonly sessionId: string;
  readonly revision: number;
  readonly characterId: string;
  readonly rigId: string;
  readonly activeClipId: string;
  readonly sourceRevision: string;
  readonly sourceState: AnimationReviewEditableState;
  readonly authoritativeState: AnimationReviewEditableState;
  readonly preview: AnimationReviewPreviewState | null;
  readonly patches: readonly AnimationReviewPatchDocument[];
  readonly history: readonly AnimationReviewHistoryEntry[];
  readonly historyCursor: number;
  readonly review: AnimationReviewDocument;
  readonly validation: readonly AnimationReviewValidationResult[];
  readonly diagnoses: readonly AnimationReviewDiagnosis[];
  readonly auditTrail: readonly AnimationReviewSessionAuditEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAnimationReviewSessionInput {
  readonly sessionId: string;
  readonly characterId: string;
  readonly activeClipId: string;
  readonly sourceRevision: string;
  readonly animation: NormalizedRigAnimation;
  readonly rigJointIds: readonly string[];
  readonly parts: readonly {
    readonly partId: string;
    readonly drawOrder: number;
  }[];
  readonly createdAt: string;
  readonly actorId: string;
  readonly initialRevision?: number;
}

export interface AnimationReviewRevisionInput {
  readonly expectedRevision: number;
  readonly actorId: string;
  readonly createdAt: string;
}

export interface AnimationReviewPatchDecisionInput
  extends AnimationReviewRevisionInput {
  readonly patchId: string;
  readonly decision: "accept" | "reject";
}

export interface AnimationReviewPatchEditInput
  extends AnimationReviewRevisionInput {
  readonly patchId: string;
  readonly operation: AnimationReviewPatchOperation;
}

export interface AnimationReviewPatchActionInput
  extends AnimationReviewRevisionInput {
  readonly patchId: string;
}

export interface AnimationReviewHumanRuleDecisionInput
  extends AnimationReviewRevisionInput {
  readonly ruleId: string;
  readonly decision: "passed" | "waived";
}

export interface AnimationReviewHumanFindingInput
  extends AnimationReviewRevisionInput {
  readonly findingId: string;
  readonly summary: string;
  readonly targetIds: readonly string[];
  readonly timeRange?: Readonly<{ start: number; end: number }>;
}

export interface AnimationReviewHumanRuleCreateInput
  extends AnimationReviewRevisionInput {
  readonly ruleId: string;
  readonly details: string;
  readonly relatedFindingIds: readonly string[];
}

export type ParseAnimationReviewSessionResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewSessionDocument;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly import("./types").AnimationReviewDiagnostic[];
    };

export type ParseAnimationReviewPatchResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewPatchDocument;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly import("./types").AnimationReviewDiagnostic[];
    };

export type ParseAnimationReviewValidationResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewValidationResult;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly import("./types").AnimationReviewDiagnostic[];
    };

export type ParseAnimationReviewDiagnosisResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewDiagnosis;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly import("./types").AnimationReviewDiagnostic[];
    };

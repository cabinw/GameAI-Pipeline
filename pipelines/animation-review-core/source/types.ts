import type {
  AffineTransform2D,
  NormalizedRigAnimation,
} from "@gameai/rig-animation";

export const ANIMATION_REVIEW_SCHEMA_VERSION = "1.0.0" as const;
export const ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION = "1.0.0" as const;

export type AnimationReviewStatus =
  | "in-review"
  | "changes-requested"
  | "accepted";
export type ReviewFindingSource =
  | "validator"
  | "assistant"
  | "provider"
  | "human";
export type ReviewSeverity = "info" | "warning" | "error";
export type ReviewFindingStatus = "open" | "accepted" | "rejected" | "resolved";
export type ReviewCategory =
  | "contract"
  | "coverage"
  | "loop"
  | "timing"
  | "velocity"
  | "contact"
  | "hierarchy"
  | "layer"
  | "semantic"
  | "visual";
export type ReviewChecklistStatus = "passed" | "warning" | "failed";
export type ReviewDecisionKind = "accept" | "reject" | "resolve" | "comment";

export interface AnimationReviewSubject {
  readonly characterId: string;
  readonly rigId: string;
  readonly animationId: string;
  readonly sourceRevision: string;
  readonly duration: number;
  readonly loop: boolean;
}

export interface AnimationReviewMetrics {
  readonly duration: number;
  readonly trackCount: number;
  readonly keyframeCount: number;
  readonly animatedJointCount: number;
  readonly untrackedJointCount: number;
  readonly loopContinuityError: number;
  readonly maxAbsoluteRotationDegrees: number;
  readonly maxAngularSpeedDegreesPerSecond: number;
  readonly maxLinearSpeedUnitsPerSecond: number;
}

export interface ReviewFindingTimeRange {
  readonly start: number;
  readonly end: number;
}

export interface ReviewSuggestion {
  readonly summary: string;
  readonly parameterPath: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly proposedValue?: number;
}

export interface AnimationReviewFinding {
  readonly findingId: string;
  readonly code: string;
  readonly source: ReviewFindingSource;
  readonly severity: ReviewSeverity;
  readonly category: ReviewCategory;
  readonly status: ReviewFindingStatus;
  readonly summary: string;
  readonly diagnosis: string;
  readonly targetIds: readonly string[];
  readonly timeRange?: ReviewFindingTimeRange;
  readonly suggestion?: ReviewSuggestion;
  readonly confidence: number;
  readonly providerId: string;
  readonly createdAt: string;
}

export interface AnimationReviewChecklistItem {
  readonly checkId: string;
  readonly label: string;
  readonly status: ReviewChecklistStatus;
  readonly details: string;
  readonly relatedFindingIds: readonly string[];
}

export interface AnimationReviewDecision {
  readonly decisionId: string;
  readonly findingId: string;
  readonly decision: ReviewDecisionKind;
  readonly actorId: string;
  readonly note: string;
  readonly revision: number;
  readonly createdAt: string;
}

export interface AnimationReviewAdjustment {
  readonly adjustmentId: string;
  readonly findingId: string;
  readonly parameterPath: string;
  readonly previousValue: number;
  readonly nextValue: number;
  readonly actorId: string;
  readonly revision: number;
  readonly createdAt: string;
}

export type AnimationReviewAuditAction =
  | "review-created"
  | "analysis-ran"
  | "finding-decided"
  | "adjustment-applied"
  | "review-status-changed"
  | "export-created";

export interface AnimationReviewAuditEntry {
  readonly entryId: string;
  readonly action: AnimationReviewAuditAction;
  readonly actorId: string;
  readonly revision: number;
  readonly details: string;
  readonly createdAt: string;
}

export interface AnimationReviewDocument {
  readonly schemaVersion: typeof ANIMATION_REVIEW_SCHEMA_VERSION;
  readonly reviewId: string;
  readonly revision: number;
  readonly status: AnimationReviewStatus;
  readonly subject: AnimationReviewSubject;
  readonly metrics: AnimationReviewMetrics;
  readonly findings: readonly AnimationReviewFinding[];
  readonly checklist: readonly AnimationReviewChecklistItem[];
  readonly decisions: readonly AnimationReviewDecision[];
  readonly adjustments: readonly AnimationReviewAdjustment[];
  readonly auditTrail: readonly AnimationReviewAuditEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAnimationReviewInput {
  readonly reviewId: string;
  readonly sourceRevision: string;
  readonly characterId: string;
  readonly animation: NormalizedRigAnimation;
  readonly rigJointIds: readonly string[];
  readonly createdAt: string;
  readonly actorId?: string;
}

export interface AnimationReviewAnalysis {
  readonly metrics: AnimationReviewMetrics;
  readonly findings: readonly AnimationReviewFinding[];
  readonly checklist: readonly AnimationReviewChecklistItem[];
}

export type AnimationReviewDiagnosticCode =
  | "REVIEW_JSON_PARSE_ERROR"
  | "REVIEW_SCHEMA_VALIDATION_ERROR"
  | "REVIEW_UNSUPPORTED_SCHEMA_VERSION"
  | "REVIEW_DUPLICATE_FINDING_ID"
  | "REVIEW_DUPLICATE_CHECKLIST_ID"
  | "REVIEW_UNKNOWN_FINDING_REFERENCE"
  | "REVIEW_REVISION_INVALID"
  | "REVIEW_DECISION_TRANSITION_INVALID"
  | "REVIEW_ADJUSTMENT_INVALID"
  | "ADAPTER_JSON_PARSE_ERROR"
  | "ADAPTER_SCHEMA_VALIDATION_ERROR"
  | "ADAPTER_UNSUPPORTED_PROTOCOL_VERSION"
  | "ADAPTER_COMMAND_PAYLOAD_INVALID";

export interface AnimationReviewDiagnostic {
  readonly code: AnimationReviewDiagnosticCode;
  readonly message: string;
  readonly path?: string;
}

export type ParseAnimationReviewResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewDocument;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly AnimationReviewDiagnostic[];
    };

export type AnimationReviewAdapterCommand =
  | "describe"
  | "select-clip"
  | "play"
  | "pause"
  | "seek"
  | "step"
  | "set-rate"
  | "set-loop"
  | "set-overlay"
  | "exact-reset";

export type AnimationReviewOverlay =
  | "skeleton"
  | "pivots"
  | "sockets"
  | "hit-areas"
  | "attachments";

export interface AnimationReviewAdapterPayload {
  readonly clipId?: string;
  readonly time?: number;
  readonly deltaFrames?: number;
  readonly frameRate?: number;
  readonly rate?: number;
  readonly loop?: boolean;
  readonly overlay?: AnimationReviewOverlay;
  readonly enabled?: boolean;
}

export interface AnimationReviewAdapterRequest {
  readonly kind: "request";
  readonly protocolVersion: typeof ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION;
  readonly requestId: string;
  readonly adapterId: string;
  readonly command: AnimationReviewAdapterCommand;
  readonly expectedRevision?: number;
  readonly payload: AnimationReviewAdapterPayload;
}

export interface AnimationReviewAdapterCapability {
  readonly command: AnimationReviewAdapterCommand;
  readonly available: boolean;
  readonly reason?: string;
}

export interface AnimationReviewPlaybackSnapshot {
  readonly status: "playing" | "paused" | "stopped";
  readonly time: number;
  readonly duration: number;
  readonly rate: number;
  readonly loop: boolean;
  readonly clipId: string;
  readonly availableClipIds: readonly string[];
}

export interface AnimationReviewPartSnapshot {
  readonly partId: string;
  readonly parentId: string | null;
  readonly assetUrl: string;
  readonly drawOrder: number;
  readonly width: number;
  readonly height: number;
  readonly anchor: Readonly<{ x: number; y: number }>;
  readonly visualOffset: Readonly<{ x: number; y: number }>;
  readonly worldTransform: AffineTransform2D;
}

export interface AnimationReviewJointSnapshot {
  readonly jointId: string;
  readonly parentId: string | null;
  readonly worldPivot: Readonly<{ x: number; y: number }>;
}

export interface AnimationReviewTimelineKeyframe {
  readonly time: number;
  readonly value: number | Readonly<{ x: number; y: number }>;
}

export interface AnimationReviewTimelineTrack {
  readonly jointId: string;
  readonly property: "position" | "rotation" | "scale";
  readonly keyframes: readonly AnimationReviewTimelineKeyframe[];
}

export interface AnimationReviewAdapterSnapshot {
  readonly adapterId: string;
  readonly adapterRevision: number;
  readonly characterId: string;
  readonly rigId: string;
  readonly playback: AnimationReviewPlaybackSnapshot;
  readonly capabilities: readonly AnimationReviewAdapterCapability[];
  readonly overlays: Readonly<Record<AnimationReviewOverlay, boolean>>;
  readonly parts: readonly AnimationReviewPartSnapshot[];
  readonly joints: readonly AnimationReviewJointSnapshot[];
  readonly timeline: readonly AnimationReviewTimelineTrack[];
  readonly runtimeDiagnostics: Readonly<Record<string, number | string | boolean>>;
}

export type AnimationReviewAdapterResponse =
  | {
      readonly kind: "response";
      readonly protocolVersion: typeof ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION;
      readonly requestId: string;
      readonly adapterId: string;
      readonly ok: true;
      readonly snapshot: AnimationReviewAdapterSnapshot;
    }
  | {
      readonly kind: "response";
      readonly protocolVersion: typeof ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION;
      readonly requestId: string;
      readonly adapterId: string;
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
      };
    };

export type ParseAdapterRequestResult =
  | {
      readonly ok: true;
      readonly value: AnimationReviewAdapterRequest;
      readonly diagnostics: readonly [];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly AnimationReviewDiagnostic[];
    };

export interface ReviewDecisionInput {
  readonly expectedRevision: number;
  readonly decisionId: string;
  readonly findingId: string;
  readonly decision: ReviewDecisionKind;
  readonly actorId: string;
  readonly note: string;
  readonly createdAt: string;
}

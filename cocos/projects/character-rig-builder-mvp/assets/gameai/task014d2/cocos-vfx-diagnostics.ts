// Generated from the tested TASK-014D2 Cocos Render Plan boundary. Do not hand-edit.
export const CocosVfxPlanErrorCode = {
  UNSUPPORTED_PLAN_VERSION: "UNSUPPORTED_COCOS_VFX_PLAN_VERSION",
  INVALID_PLAN: "INVALID_COCOS_VFX_RENDER_PLAN",
  LIFECYCLE_MISMATCH: "COCOS_VFX_LIFECYCLE_MISMATCH",
  UNSUPPORTED_PRIMITIVE: "UNSUPPORTED_COCOS_VFX_PRIMITIVE",
  UNSUPPORTED_RECIPE: "UNSUPPORTED_COCOS_VFX_RECIPE",
  UNSUPPORTED_BLEND: "UNSUPPORTED_COCOS_VFX_BLEND",
  MISSING_RESOURCE: "MISSING_COCOS_VFX_RESOURCE",
  DUPLICATE_RESOURCE: "DUPLICATE_COCOS_VFX_RESOURCE",
  INVALID_RESOURCE_REGISTRY: "INVALID_COCOS_VFX_RESOURCE_REGISTRY",
  BUDGET_EXCEEDED: "COCOS_VFX_PLAN_BUDGET_EXCEEDED",
  SORTING_RANGE_EXCEEDED: "COCOS_VFX_SORTING_RANGE_EXCEEDED",
  INVALID_COMMAND: "INVALID_COCOS_VFX_COMMAND",
  DUPLICATE_INSTANCE: "DUPLICATE_COCOS_VFX_INSTANCE",
  UNKNOWN_INSTANCE: "UNKNOWN_COCOS_VFX_INSTANCE",
  RUNTIME_BUILD_FAILURE: "COCOS_VFX_RUNTIME_BUILD_FAILURE",
  RUNTIME_OWNERSHIP_MISMATCH: "COCOS_VFX_RUNTIME_OWNERSHIP_MISMATCH",
} as const;

export type CocosVfxPlanErrorCode =
  (typeof CocosVfxPlanErrorCode)[keyof typeof CocosVfxPlanErrorCode];

export interface CocosVfxPlanDiagnostic {
  readonly code: CocosVfxPlanErrorCode;
  readonly path: string;
  readonly message: string;
}

export type CocosVfxResult<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly errors: readonly CocosVfxPlanDiagnostic[] };

export class CocosVfxRuntimeError extends Error {
  public constructor(
    public readonly code: CocosVfxPlanErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CocosVfxRuntimeError";
  }
}

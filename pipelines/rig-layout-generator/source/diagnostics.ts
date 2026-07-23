export const RigLayoutDiagnosticCode = {
  ANNOTATION_SCHEMA_INVALID: "ANNOTATION_SCHEMA_INVALID",
  TEMPLATE_SCHEMA_INVALID: "TEMPLATE_SCHEMA_INVALID",
  UNSUPPORTED_GENERATOR_SCHEMA_VERSION: "UNSUPPORTED_GENERATOR_SCHEMA_VERSION",
  TEMPLATE_PART_MISSING: "TEMPLATE_PART_MISSING",
  TEMPLATE_UNKNOWN_PART: "TEMPLATE_UNKNOWN_PART",
  DUPLICATE_ANNOTATION_PART_ID: "DUPLICATE_ANNOTATION_PART_ID",
  INVALID_JOINT_POSITION: "INVALID_JOINT_POSITION",
  JOINT_OUTSIDE_PART_RECT: "JOINT_OUTSIDE_PART_RECT",
  INVALID_CHILD_ATTACHMENT: "INVALID_CHILD_ATTACHMENT",
  CHILD_ATTACHMENT_MISSING: "CHILD_ATTACHMENT_MISSING",
  CHILD_ATTACHMENT_MISMATCH: "CHILD_ATTACHMENT_MISMATCH",
  INVALID_TRIM_METADATA: "INVALID_TRIM_METADATA",
  INVALID_NORMALIZED_TEMPLATE_GEOMETRY: "INVALID_NORMALIZED_TEMPLATE_GEOMETRY",
  SOURCE_RECT_OVERLAP_WARNING: "SOURCE_RECT_OVERLAP_WARNING",
  MISSING_PARENT_JOINT: "MISSING_PARENT_JOINT",
  TEMPLATE_HIERARCHY_ERROR: "TEMPLATE_HIERARCHY_ERROR",
  GENERATED_LAYOUT_INVALID: "GENERATED_LAYOUT_INVALID",
} as const;

export type RigLayoutDiagnosticCode =
  (typeof RigLayoutDiagnosticCode)[keyof typeof RigLayoutDiagnosticCode];

export interface RigLayoutDiagnostic {
  code: RigLayoutDiagnosticCode;
  severity: "error" | "warning";
  path: string;
  message: string;
  partId?: string;
  details?: Readonly<Record<string, unknown>>;
}

export function sortRigLayoutDiagnostics(
  diagnostics: readonly RigLayoutDiagnostic[],
): RigLayoutDiagnostic[] {
  return [...diagnostics].sort((left, right) =>
    [left.severity, left.path, left.partId ?? "", left.code, left.message]
      .join("\u0000")
      .localeCompare(
        [right.severity, right.path, right.partId ?? "", right.code, right.message].join("\u0000"),
      ),
  );
}

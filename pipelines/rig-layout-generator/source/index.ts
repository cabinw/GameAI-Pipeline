export {
  RigLayoutDiagnosticCode,
  sortRigLayoutDiagnostics,
  type RigLayoutDiagnostic,
  type RigLayoutDiagnosticCode as RigLayoutDiagnosticCodeValue,
} from "./diagnostics";
export { generateRigLayout, serializeRigLayout } from "./generator";
export { renderAssembledPreviewSvg } from "./preview";
export {
  parseSkeletonTemplate,
  parseSourceCanvasAnnotation,
  type ParseGeneratorContractResult,
} from "./parser";
export {
  skeletonTemplateSchema,
  sourceCanvasAnnotationSchema,
  type JsonSchema,
} from "./schema-loader";
export { maleNormalV1 } from "./template-loader";
export type {
  AnnotationPartOverrides,
  ChildAttachment,
  GenerateRigLayoutOptions,
  NormalizedCircleShape,
  NormalizedRectShape,
  Point,
  RigLayoutGenerationResult,
  SkeletonTemplate,
  SkeletonTemplateHitArea,
  SkeletonTemplatePart,
  SkeletonTemplateSocket,
  SourceAnnotationPart,
  SourceCanvasAnnotation,
  SourceRect,
  TrimMetadata,
} from "./types";

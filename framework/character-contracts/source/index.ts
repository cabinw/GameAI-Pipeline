export {
  ValidationErrorCode,
  type ContractDocument,
  type ValidationErrorCode as ValidationErrorCodeValue,
  type ValidationIssue,
  type ValidationResult,
} from "./errors";
export { parseCharacterContract, parseCharacterRig, parseRigLayout } from "./parser";
export { parseAttachmentLayout } from "./parser";
export {
  attachmentLayoutSchema,
  characterRigSchema,
  rigLayoutSchema,
  type JsonSchema,
} from "./schema-loader";
export {
  composeAttachmentWorldTransform,
  multiplyAttachmentTransforms,
  resolveAttachmentLayout,
} from "./attachment-resolver";
export {
  SUPPORTED_SCHEMA_RANGE,
  isSupportedSchemaVersion,
  validateCharacterContractSemantics,
  validateCharacterRigSemantics,
  validateAttachmentLayoutCompatibility,
  validateAttachmentLayoutSemantics,
  validateRigLayoutSemantics,
} from "./semantic-validator";
export type {
  AffineTransform2D,
  AnimationTarget,
  AttachmentLayout,
  AttachmentSeam,
  AttachmentSlot,
  AttachmentTransform,
  CoverageRegion,
  CharacterContract,
  CharacterRig,
  CircleHitShape,
  HitShape,
  NormalizedAnchor,
  Rectangle,
  RectHitShape,
  RestPose,
  RigHitArea,
  RigLayout,
  RigPart,
  RigSocket,
  RigAttachment,
  ResolvedAttachment,
  Size,
  Vector2,
  WearableSet,
} from "./types";

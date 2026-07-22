export {
  ValidationErrorCode,
  type ContractDocument,
  type ValidationErrorCode as ValidationErrorCodeValue,
  type ValidationIssue,
  type ValidationResult,
} from "./errors";
export { parseCharacterContract, parseCharacterRig, parseRigLayout } from "./parser";
export { characterRigSchema, rigLayoutSchema, type JsonSchema } from "./schema-loader";
export {
  SUPPORTED_SCHEMA_RANGE,
  isSupportedSchemaVersion,
  validateCharacterContractSemantics,
  validateCharacterRigSemantics,
  validateRigLayoutSemantics,
} from "./semantic-validator";
export type {
  AnimationTarget,
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
  Size,
  Vector2,
} from "./types";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle extends Size, Vector2 {}

export interface NormalizedAnchor extends Vector2 {}

export interface RestPose {
  position: Vector2;
  rotationDegrees: number;
  scale: Vector2;
  opacity: number;
}

export interface RigPart {
  partId: string;
  file: string;
  parentId: string | null;
  originalRect: Rectangle;
  trimOffset: Vector2;
  anchor: NormalizedAnchor;
  restPose: RestPose;
  drawOrder: number;
}

export interface RigSocket {
  socketId: string;
  parentPartId: string;
  position: Vector2;
  rotationDegrees: number;
}

export interface RectHitShape extends Rectangle {
  type: "rect";
}

export interface CircleHitShape extends Vector2 {
  type: "circle";
  radius: number;
}

export type HitShape = RectHitShape | CircleHitShape;

export interface RigHitArea {
  hitAreaId: string;
  parentPartId: string;
  shape: HitShape;
}

export interface RigLayout {
  schemaVersion: string;
  layoutId: string;
  sourceCanvas: Size;
  referenceScale: number;
  drawOrderPolicy: "unique" | "shared";
  visualPlacementMode?: "trimmed-pixels" | "source-canvas-rect";
  parts: RigPart[];
  sockets?: RigSocket[];
  hitAreas?: RigHitArea[];
}

export interface AnimationTarget {
  targetId: string;
  partId: string;
}

export interface CharacterRig {
  schemaVersion: string;
  characterId: string;
  displayName?: string;
  rigLayoutFile: string;
  requiredParts: string[];
  requiredAnimationTargets: string[];
  animationTargets: AnimationTarget[];
}

export interface CharacterContract {
  characterRig: CharacterRig;
  rigLayout: RigLayout;
}

export interface AttachmentTransform {
  position: Vector2;
  rotationDegrees: number;
  scale: Vector2;
}

export interface AttachmentSlot {
  slotId: string;
  parentPartId: string;
  target?: {
    kind: string;
    id: string;
  };
  transform: AttachmentTransform;
  defaultEnabled: boolean;
}

export interface RigAttachment {
  attachmentId: string;
  slotId: string;
  file: string;
  transform: AttachmentTransform;
  anchor: NormalizedAnchor;
  drawOrder: number;
  wearableSetId?: string;
  propStateId?: string;
  attachmentKind?: string;
  gripAnchor?: NormalizedAnchor;
  handOverlayAttachmentId?: string;
  layerRole?: string;
}

export interface WearableSet {
  wearableSetId: string;
  defaultEnabled: boolean;
}

export interface PropState {
  propStateId: string;
  defaultEnabled: boolean;
}

export interface CoverageRegion extends Rectangle {}

export interface AttachmentSeam {
  seamId: string;
  firstItemId: string;
  secondItemId: string;
  firstRegion: CoverageRegion;
  secondRegion: CoverageRegion;
  minimumOverlap: number;
}

export interface AttachmentLayout {
  schemaVersion: string;
  attachmentLayoutId: string;
  rig: {
    layoutId: string;
    schemaVersion: string;
  };
  slots: AttachmentSlot[];
  attachments: RigAttachment[];
  wearableSets?: WearableSet[];
  propStates?: PropState[];
  seams?: AttachmentSeam[];
}

export interface AffineTransform2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface ResolvedAttachment {
  attachmentId: string;
  slotId: string;
  parentPartId: string;
  file: string;
  slotTransform: AttachmentTransform;
  attachmentTransform: AttachmentTransform;
  anchor: NormalizedAnchor;
  drawOrder: number;
  wearableSetId?: string;
  propStateId?: string;
  attachmentKind?: string;
  gripAnchor?: NormalizedAnchor;
  handOverlayAttachmentId?: string;
  layerRole?: string;
  target?: Readonly<{
    kind: string;
    id: string;
  }>;
  enabled: boolean;
}

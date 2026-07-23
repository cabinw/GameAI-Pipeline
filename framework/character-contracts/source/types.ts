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

/**
 * Clean-checkout CI surface for the Cocos APIs imported by project assets.
 *
 * Cocos Creator's generated declarations remain authoritative for Editor
 * development through tsconfig.assets.json. Keep this module intentionally
 * narrow: add a typed member only when a checked-in asset imports or uses it.
 */
declare module "cc" {
  export const _decorator: {
    ccclass(name: string): ClassDecorator;
    executeInEditMode: ClassDecorator;
    property: PropertyDecorator;
  };

  export class Vec3 {
    x: number;
    y: number;
    z: number;

    constructor(x?: number, y?: number, z?: number);
  }

  export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x?: number, y?: number, z?: number, w?: number);

    static fromEuler<Out extends Quat>(
      out: Out,
      x: number,
      y: number,
      z: number,
    ): Out;
    static multiply<Out extends Quat>(
      out: Out,
      left: Readonly<Quat>,
      right: Readonly<Quat>,
    ): Out;
    static normalize<Out extends Quat>(
      out: Out,
      value: Readonly<Quat>,
    ): Out;
  }

  export class Component {
    readonly node: Node;
  }

  export class UIRenderer extends Component {
    color: Color;
  }

  export namespace gfx {
    enum BlendFactor {
      ONE,
      SRC_ALPHA,
      DST_COLOR,
      ONE_MINUS_SRC_ALPHA,
      ONE_MINUS_SRC_COLOR,
    }
  }

  export class Node {
    name: string;
    layer: number;
    active: boolean;
    readonly activeInHierarchy: boolean;
    readonly children: readonly Node[];
    readonly position: Vec3;
    readonly eulerAngles: Vec3;
    readonly scale: Vec3;

    constructor(name?: string);

    setParent(parent: Node | null): void;
    setPosition(x: number, y: number, z?: number): void;
    setRotationFromEuler(x: number, y: number, z: number): void;
    setScale(x: number, y: number, z?: number): void;
    getWorldPosition(out?: Vec3): Vec3;
    getWorldRotation(out?: Quat): Quat;
    getWorldScale(out?: Vec3): Vec3;
    setWorldRotation(rotation: Readonly<Quat>): void;
    addComponent<T extends Component>(component: new () => T): T;
    getComponent<T extends Component>(component: new () => T): T | null;
    getComponents<T extends Component>(component: new () => T): T[];
    removeFromParent(): void;
    destroy(): boolean;
  }

  export class Color {
    constructor(r?: number, g?: number, b?: number, a?: number);
    fromHEX(value: string): this;
  }

  export class Graphics extends UIRenderer {
    strokeColor: Color;
    fillColor: Color;
    lineWidth: number;

    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    bezierCurveTo(
      c1x: number,
      c1y: number,
      c2x: number,
      c2y: number,
      x: number,
      y: number,
    ): void;
    circle(centerX: number, centerY: number, radius: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    clear(): void;
    fill(): void;
    stroke(): void;
  }

  export class Label extends UIRenderer {
    static readonly Overflow: {
      readonly CLAMP: number;
    };
    string: string;
    fontSize: number;
    lineHeight: number;
    horizontalAlign: number;
    verticalAlign: number;
    enableWrapText: boolean;
    overflow: number;
    color: Color;
  }

  export const HorizontalTextAlignment: {
    readonly LEFT: number;
  };

  export const VerticalTextAlignment: {
    readonly TOP: number;
  };

  export class Sorting2D extends Component {
    sortingLayer: number;
    sortingOrder: number;
  }

  export class SpriteFrame {}

  export class Material {
    copy(material: Material, overrides?: unknown): void;
    destroy(): boolean;
  }

  export class JsonAsset {
    readonly json: unknown;
  }

  export class Sprite extends UIRenderer {
    static readonly SizeMode: {
      readonly CUSTOM: number;
    };
    sizeMode: number;
    spriteFrame: SpriteFrame | null;
  }

  export const resources: {
    load<T>(
      path: string,
      type: new () => T,
      callback: (error: Error | null, asset: T | null) => void,
    ): void;
  };

  export class UITransform extends Component {
    readonly anchorPoint: { readonly x: number; readonly y: number };
    readonly contentSize: { readonly width: number; readonly height: number };
    setAnchorPoint(x: number, y: number): void;
    setContentSize(width: number, height: number): void;
    convertToNodeSpaceAR(worldPoint: Vec3, out?: Vec3): Vec3;
    convertToWorldSpaceAR(nodePoint: Vec3, out?: Vec3): Vec3;
  }

  export class UIOpacity extends Component {
    opacity: number;
  }

  export interface EventKeyboard {
    readonly keyCode: number;
  }

  export const Input: {
    readonly EventType: {
      readonly KEY_DOWN: string;
    };
  };

  export const KeyCode: {
    readonly DIGIT_1: number;
    readonly DIGIT_2: number;
    readonly DIGIT_3: number;
    readonly DIGIT_4: number;
    readonly DIGIT_5: number;
    readonly DIGIT_6: number;
    readonly DIGIT_7: number;
    readonly F1: number;
    readonly F2: number;
    readonly F3: number;
    readonly F4: number;
    readonly F5: number;
    readonly F6: number;
    readonly F7: number;
    readonly F8: number;
    readonly ESCAPE: number;
    readonly SPACE: number;
    readonly KEY_R: number;
    readonly KEY_J: number;
    readonly KEY_B: number;
    readonly KEY_A: number;
    readonly KEY_L: number;
    readonly KEY_D: number;
    readonly KEY_E: number;
    readonly KEY_O: number;
    readonly KEY_Q: number;
    readonly KEY_W: number;
    readonly KEY_V: number;
    readonly KEY_C: number;
    readonly KEY_G: number;
    readonly KEY_S: number;
    readonly KEY_K: number;
    readonly KEY_M: number;
    readonly KEY_H: number;
    readonly KEY_P: number;
    readonly KEY_T: number;
    readonly KEY_Y: number;
    readonly KEY_Z: number;
    readonly KEY_X: number;
  };

  export const input: {
    on(
      eventType: string,
      callback: (event: EventKeyboard) => void,
      target?: object,
    ): void;
    off(
      eventType: string,
      callback: (event: EventKeyboard) => void,
      target?: object,
    ): void;
  };

  export const Layers: {
    readonly Enum: {
      readonly UI_2D: number;
    };
  };

  export class Director {
    static readonly EVENT_AFTER_DRAW: string;
  }

  export const director: {
    getScene(): { readonly name: string } | null;
    once(
      eventType: string,
      callback: () => void,
      target?: object,
    ): () => void;
  };
}

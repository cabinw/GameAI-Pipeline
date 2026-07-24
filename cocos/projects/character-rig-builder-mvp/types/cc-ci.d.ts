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

  export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }

  export class Component {
    readonly node: Node;
  }

  export class Node {
    name: string;
    layer: number;
    active: boolean;
    readonly children: readonly Node[];
    readonly position: Vec3;
    readonly eulerAngles: Vec3;
    readonly scale: Vec3;

    constructor(name?: string);

    setParent(parent: Node | null): void;
    setPosition(x: number, y: number, z?: number): void;
    setRotationFromEuler(x: number, y: number, z: number): void;
    setScale(x: number, y: number, z?: number): void;
    addComponent<T extends Component>(component: new () => T): T;
    getComponent<T extends Component>(component: new () => T): T | null;
    destroy(): boolean;
  }

  export class Color {
    fromHEX(value: string): this;
  }

  export class Graphics extends Component {
    strokeColor: Color;
    fillColor: Color;
    lineWidth: number;

    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    circle(centerX: number, centerY: number, radius: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    fill(): void;
    stroke(): void;
  }

  export class Label extends Component {
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
    sortingOrder: number;
  }

  export class SpriteFrame {}

  export class Sprite extends Component {
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
    once(
      eventType: string,
      callback: () => void,
      target?: object,
    ): () => void;
  };
}

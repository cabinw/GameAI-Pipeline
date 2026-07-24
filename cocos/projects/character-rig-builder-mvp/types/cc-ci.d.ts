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
    string: string;
    fontSize: number;
    lineHeight: number;
    color: Color;
  }

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
    readonly KEY_V: number;
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
}

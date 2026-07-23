declare namespace Editor {
  namespace App {
    const version: string;
  }

  namespace Message {
    function request(channel: string, message: string, ...args: unknown[]): Promise<unknown>;
  }

  namespace Panel {
    function define<T>(definition: T): T;
    function open(name: string): Promise<void>;
  }

  namespace Project {
    const path: string;
  }
}

declare module "cc" {
  export class Node {
    static readonly EventType: Readonly<Record<string, string>>;
    readonly uuid: string;
    name: string;
    layer: number;
    parent: Node | null;
    readonly children: Node[];
    constructor(name?: string);
    setParent(parent: Node | null): void;
    setPosition(x: number, y: number, z?: number): void;
    setRotationFromEuler(x: number, y: number, z: number): void;
    setScale(x: number, y: number, z?: number): void;
    addComponent<T>(component: new (...args: never[]) => T): T;
    destroy(): boolean;
  }

  export class Scene extends Node {}

  export class SpriteFrame {}

  export class UITransform {
    setAnchorPoint(x: number, y: number): void;
    setContentSize(width: number, height: number): void;
  }

  export class Sprite {
    static readonly SizeMode: { readonly CUSTOM: number };
    sizeMode: number;
    spriteFrame: SpriteFrame | null;
  }

  export class Sorting2D {
    sortingOrder: number;
  }

  export class UIOpacity {
    opacity: number;
  }

  export const Layers: {
    readonly Enum: {
      readonly UI_2D: number;
    };
  };

  export const director: {
    getScene(): Scene | null;
  };

  export const assetManager: {
    loadAny(
      request: { uuid: string },
      callback: (error: Error | null | undefined, asset: unknown) => void,
    ): void;
  };
}

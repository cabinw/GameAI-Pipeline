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
  interface SceneLike {
    name: string;
    uuid?: string;
  }

  export const director: {
    getScene(): SceneLike | null;
  };
}

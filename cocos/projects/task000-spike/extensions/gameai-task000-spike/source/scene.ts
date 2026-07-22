import { director } from "cc";

import type { SceneResult } from "./message-chain";

const EXTENSION_NAME = "gameai-task000-spike";

export const methods = {
  inspectScene(correlationId: string): SceneResult {
    const scene = director.getScene();
    const result: SceneResult = {
      stage: "scene",
      correlationId,
      sceneName: scene?.name ?? null,
      sceneUuid: scene?.uuid ?? null,
    };
    console.info(`[${EXTENSION_NAME}] Scene Script handled ${correlationId}`);
    return result;
  },
};

export function load(): void {
  console.info(`[${EXTENSION_NAME}] Scene Script loaded`);
}

export function unload(): void {}

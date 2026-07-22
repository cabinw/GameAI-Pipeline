import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  executeMessageChain,
  type SceneResult,
  type SpikeEvidence,
  type SpikeRequest,
} from "./message-chain";

const EXTENSION_NAME = "gameai-task000-spike";

async function requestScene(correlationId: string): Promise<SceneResult> {
  return (await Editor.Message.request("scene", "execute-scene-script", {
    name: EXTENSION_NAME,
    method: "inspectScene",
    args: [correlationId],
  })) as SceneResult;
}

async function writeEvidence(evidence: SpikeEvidence): Promise<void> {
  const evidencePath = join(
    Editor.Project.path,
    "temp",
    "gameai-task000-spike",
    "evidence.json",
  );
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.info(`[${EXTENSION_NAME}] evidence written to ${evidencePath}`);
}

export const methods = {
  async openPanel(): Promise<void> {
    await Editor.Panel.open(EXTENSION_NAME);
  },

  async runSpike(request: SpikeRequest): Promise<SpikeEvidence> {
    return executeMessageChain(request, {
      creatorVersion: Editor.App.version,
      now: () => new Date().toISOString(),
      requestScene,
      writeEvidence,
    });
  },
};

export async function load(): Promise<void> {
  console.info(`[${EXTENSION_NAME}] main process loaded`);
  await Editor.Panel.open(EXTENSION_NAME);
}

export function unload(): void {}

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

interface ExtensionManifest {
  name: string;
  editor: string;
  main: string;
  scene: string;
  dependencies: Readonly<Record<string, string>>;
  contributions: {
    scene: { script: string };
    messages: Readonly<Record<string, { methods: readonly string[] }>>;
  };
}

async function manifest(): Promise<ExtensionManifest> {
  return JSON.parse(
    await readFile(resolve(process.cwd(), "package.json"), "utf8"),
  ) as ExtensionManifest;
}

describe("Character Rig Builder extension manifest", () => {
  it("registers Main, Panel messages, and Scene Script for Creator 3.8.8", async () => {
    const value = await manifest();
    assert.equal(value.name, "gameai-character-rig-builder");
    assert.equal(value.editor, ">=3.8.8 <3.9.0");
    assert.equal(value.main, "./dist/main.js");
    assert.equal(value.scene, "./dist/scene.js");
    assert.equal(value.contributions.scene.script, "./dist/scene.js");
    assert.deepEqual(
      value.contributions.messages["build-character-rig"]?.methods,
      ["buildCharacterRig"],
    );
  });

  it("declares all engine-neutral packages and produces both process entries", async () => {
    const value = await manifest();
    assert.deepEqual(
      Object.keys(value.dependencies).sort(),
      [
      "@gameai/character-asset-intake",
      "@gameai/character-contracts",
      "@gameai/rig-animation",
      "@gameai/rig-layout-generator",
      ],
    );
    await Promise.all([
      access(resolve(process.cwd(), "dist/main.js")),
      access(resolve(process.cwd(), "dist/scene.js")),
      access(resolve(process.cwd(), "dist/panels/default.js")),
    ]);
  });
});

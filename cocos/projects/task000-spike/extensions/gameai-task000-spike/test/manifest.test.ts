import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

interface ExtensionManifest {
  package_version?: number;
  author?: string;
  editor?: string;
  main?: string;
  scene?: string;
  panels?: Record<string, { main?: string }>;
  contributions?: {
    messages?: Record<string, { methods?: string[] }>;
  };
}

const packageRoot = resolve(__dirname, "../..");
const manifest = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
) as ExtensionManifest;

describe("Cocos extension manifest", () => {
  it("declares the Creator 3.8 extension contract", () => {
    assert.equal(manifest.package_version, 2);
    assert.equal(manifest.author, "cabinw");
    assert.equal(manifest.editor, ">=3.8.8 <3.9.0");
    assert.equal(manifest.main, "./dist/main.js");
    assert.equal(manifest.scene, "./dist/scene.js");
    assert.equal(manifest.panels?.default?.main, "dist/panels/default");
    assert.deepEqual(manifest.contributions?.messages?.["run-spike"]?.methods, [
      "runSpike",
    ]);
  });

  it("points at compiled entry files produced by the build", () => {
    assert.equal(existsSync(resolve(packageRoot, "dist/main.js")), true);
    assert.equal(existsSync(resolve(packageRoot, "dist/scene.js")), true);
    assert.equal(existsSync(resolve(packageRoot, "dist/panels/default.js")), true);
  });
});

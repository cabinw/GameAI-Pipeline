import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CI_TYPECHECK_CONFIG,
  EDITOR_TYPECHECK_CONFIG,
  selectTypecheckConfig,
} from "../scripts/run-typecheck.mjs";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const expectedCcImports = [
  "Color",
  "Component",
  "EventKeyboard",
  "Graphics",
  "HorizontalTextAlignment",
  "Input",
  "KeyCode",
  "Label",
  "Layers",
  "Node",
  "Sorting2D",
  "Sprite",
  "SpriteFrame",
  "UIOpacity",
  "UITransform",
  "VerticalTextAlignment",
  "_decorator",
  "input",
  "resources",
];

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTypeScriptFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(entryPath);
  }
  return files;
}

test("selects tracked CI types only for explicit CI verification", () => {
  assert.equal(selectTypecheckConfig({ CI: "true" }), CI_TYPECHECK_CONFIG);
  assert.equal(selectTypecheckConfig({ CI: "false" }), EDITOR_TYPECHECK_CONFIG);
  assert.equal(selectTypecheckConfig({}), EDITOR_TYPECHECK_CONFIG);
});

test("keeps the CI config independent from generated Cocos state", async () => {
  const configPath = path.join(projectRoot, CI_TYPECHECK_CONFIG);
  const configText = await readFile(configPath, "utf8");
  const config = JSON.parse(configText);
  const normalized = configText.replaceAll("\\", "/").toLowerCase();

  assert.equal(config.extends, undefined);
  assert.deepEqual(config.include, ["assets/**/*.ts", "types/cc-ci.d.ts"]);
  assert.equal(config.compilerOptions.strict, true);
  assert.equal(config.compilerOptions.skipLibCheck, false);

  for (const generatedDirectory of [
    "temp/",
    "library/",
    "local/",
    "build/",
    "cache/",
  ]) {
    assert.equal(normalized.includes(generatedDirectory), false);
  }
  assert.doesNotMatch(normalized, /\/(?:users|home|private|var|opt)\//);
});

test("keeps the checked-in cc surface strict and synchronized with asset imports", async () => {
  const declaration = await readFile(
    path.join(projectRoot, "types/cc-ci.d.ts"),
    "utf8",
  );
  const assetFiles = await collectTypeScriptFiles(path.join(projectRoot, "assets"));
  const importedNames = new Set();

  for (const assetFile of assetFiles) {
    const source = await readFile(assetFile, "utf8");
    for (const match of source.matchAll(
      /import\s*\{([\s\S]*?)\}\s*from\s*["']cc["'];/g,
    )) {
      for (const importedName of match[1].split(",")) {
        const name = importedName.trim();
        if (name.length > 0) importedNames.add(name);
      }
    }
  }

  assert.deepEqual([...importedNames].sort(), expectedCcImports);
  assert.doesNotMatch(declaration, /\bany\b/);
  for (const importedName of expectedCcImports) {
    assert.match(
      declaration,
      new RegExp(`export (?:class|interface|const) ${importedName}\\b`),
    );
  }
});

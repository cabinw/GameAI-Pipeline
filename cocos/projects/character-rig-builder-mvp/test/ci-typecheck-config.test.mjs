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
  "Director",
  "EventKeyboard",
  "Graphics",
  "HorizontalTextAlignment",
  "Input",
  "JsonAsset",
  "KeyCode",
    "Label",
    "Layers",
    "Material",
    "Node",
  "Quat",
  "Sorting2D",
  "Sprite",
  "SpriteFrame",
  "UIOpacity",
  "UIRenderer",
  "UITransform",
  "Vec3",
  "VerticalTextAlignment",
  "_decorator",
  "director",
  "gfx",
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
      new RegExp(
        `export (?:class|interface|const|namespace) ${importedName}\\b`,
      ),
    );
  }
});

test("binds the PROGRAM-015 static scene to Creator-owned identities and atlas bytes", async () => {
  const scene = JSON.parse(
    await readFile(
      path.join(projectRoot, "assets/red-cap-production-static-harness.scene"),
      "utf8",
    ),
  );
  const sceneMeta = JSON.parse(
    await readFile(
      path.join(projectRoot, "assets/red-cap-production-static-harness.scene.meta"),
      "utf8",
    ),
  );
  const harnessMeta = JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "assets/gameai/red-cap-production/red-cap-production-static-harness.ts.meta",
      ),
      "utf8",
    ),
  );
  const atlasMeta = JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "assets/resources/red-cap-production-v1/parts-atlas.png.meta",
      ),
      "utf8",
    ),
  );
  const component = scene.find(
    (entry) => entry.__type__ === "e3debvB9LZKXo+fZ+IYgf2r",
  );

  assert.equal(scene[0]._name, "red-cap-production-static-harness");
  assert.equal(sceneMeta.importer, "scene");
  assert.equal(sceneMeta.uuid, "9c390e4f-7af8-4498-bd4e-951f5b95be95");
  assert.equal(harnessMeta.uuid, "e3debbc1-f4b6-4a5e-8f9f-67e21881fdab");
  assert.ok(component);
  assert.deepEqual(component.atlasFrame, {
    __uuid__: "be7c6f0a-24fc-45dc-9068-83d41ec078ca@f9941",
    __expectedType__: "cc.SpriteFrame",
  });
  assert.equal(component.failurePoint, "");
  assert.equal(component.transformStress, false);
  assert.equal(
    scene.some((entry) => /^(CHR_|JNT_|SPR_)/.test(entry._name ?? "")),
    false,
  );
  assert.equal(atlasMeta.importer, "image");
  assert.equal(
    atlasMeta.subMetas.f9941.uuid,
    "be7c6f0a-24fc-45dc-9068-83d41ec078ca@f9941",
  );
  const cocosAtlas = await readFile(
    path.join(
      projectRoot,
      "assets/resources/red-cap-production-v1/parts-atlas.png",
    ),
  );
  const fixtureAtlas = await readFile(
    path.resolve(
      projectRoot,
      "../../../examples/red-cap-production-v1/atlas/parts-atlas.png",
    ),
  );
  assert.deepEqual(cocosAtlas, fixtureAtlas);
});

test("keeps the PROGRAM-015 static lifecycle and fault surface explicit", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "assets/gameai/red-cap-production/red-cap-production-static-harness.ts",
    ),
    "utf8",
  );
  for (const point of [
    "before-resource-completion",
    "after-resource-completion",
    "after-root-publication",
    "after-input-publication",
    "after-target-publication",
    "after-renderer-creation",
    "after-sorting2d-attachment",
    "during-rebuild-detachment",
    "during-dispose-finalization",
  ]) {
    assert.match(source, new RegExp(`"${point}"`));
  }
  for (const signal of [
    "PROGRAM015_STATIC_READY",
    "PROGRAM015_STATIC_BUILD_FAILED",
    "PROGRAM015_STATIC_CLEANUP_ERRORS",
    "PROGRAM015_STATIC_FAULT_SELECTED",
  ]) {
    assert.match(source, new RegExp(signal));
  }
  assert.match(source, /input\.off\(Input\.EventType\.KEY_DOWN/);
  assert.match(source, /this\.runtimeRoot\?\.destroy\(\)/);
  assert.match(source, /this\.lastPrimaryError = ""/);
  assert.match(source, /KeyCode\.KEY_T/);
  assert.match(source, /KeyCode\.KEY_B/);
  assert.match(source, /KeyCode\.KEY_R/);
  assert.match(source, /KeyCode\.KEY_G/);
});

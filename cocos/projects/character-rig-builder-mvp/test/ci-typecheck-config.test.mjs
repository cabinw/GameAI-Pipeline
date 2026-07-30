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

test("binds the PROGRAM-015 motion scene to the Creator atlas and motion component", async () => {
  const scene = JSON.parse(
    await readFile(
      path.join(projectRoot, "assets/red-cap-production-motion-harness.scene"),
      "utf8",
    ),
  );
  const sceneMeta = JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "assets/red-cap-production-motion-harness.scene.meta",
      ),
      "utf8",
    ),
  );
  const harnessMeta = JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "assets/gameai/red-cap-production/red-cap-production-motion-harness.ts.meta",
      ),
      "utf8",
    ),
  );
  const component = scene.find(
    (entry) => entry.__type__ === "150bbm28mVCw4UuJxhamvPz",
  );

  assert.equal(scene[0]._name, "red-cap-production-motion-harness");
  assert.equal(sceneMeta.importer, "scene");
  assert.equal(sceneMeta.uuid, "dbc61d6d-8c76-4225-a312-67c8cbd492f8");
  assert.equal(harnessMeta.importer, "typescript");
  assert.equal(harnessMeta.uuid, "150bb9b6-f265-42c3-852e-27185a9af3f3");
  assert.ok(component);
  assert.deepEqual(component.atlasFrame, {
    __uuid__: "be7c6f0a-24fc-45dc-9068-83d41ec078ca@f9941",
    __expectedType__: "cc.SpriteFrame",
  });
  assert.equal(component.failurePoint, "");
  assert.equal(
    scene.some((entry) => entry.__type__ === "e3debvB9LZKXo+fZ+IYgf2r"),
    false,
  );
  assert.equal(
    scene.some((entry) => /^(CHR_|JNT_|SPR_)/.test(entry._name ?? "")),
    false,
  );
});

test("keeps PROGRAM-015 motion controls, runtime imports, and fault ownership explicit", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "assets/gameai/red-cap-production/red-cap-production-motion-harness.ts",
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
  for (const key of [
    "DIGIT_1",
    "DIGIT_2",
    "DIGIT_3",
    "DIGIT_4",
    "SPACE",
    "KEY_T",
    "KEY_B",
    "KEY_R",
    "KEY_D",
    "KEY_G",
  ]) {
    assert.match(source, new RegExp(`KeyCode\\.${key}`));
  }
  for (const signal of [
    "PROGRAM015_MOTION_READY",
    "PROGRAM015_MOTION_CLIP",
    "PROGRAM015_MOTION_SEMANTIC",
    "PROGRAM015_MOTION_BUILD_FAILED",
    "PROGRAM015_MOTION_CLEANUP_ERRORS",
    "PROGRAM015_MOTION_FAULT_SELECTED",
  ]) {
    assert.match(source, new RegExp(signal));
  }
  assert.match(source, /dist\/runtime-esm\/runtime\.js/);
  assert.doesNotMatch(source, /node:fs|node:path|node:crypto/);
  assert.match(source, /this\.semantic\.dispose\(\)/);
  assert.match(source, /input\.off\(Input\.EventType\.KEY_DOWN/);
});

test("binds the PROGRAM-015 showcase scene to one enabled production component", async () => {
  const scene = JSON.parse(
    await readFile(
      path.join(projectRoot, "assets/red-cap-production-showcase.scene"),
      "utf8",
    ),
  );
  const sceneMeta = JSON.parse(
    await readFile(
      path.join(projectRoot, "assets/red-cap-production-showcase.scene.meta"),
      "utf8",
    ),
  );
  const showcaseMeta = JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "assets/gameai/program015-showcase/program015-production-showcase.ts.meta",
      ),
      "utf8",
    ),
  );
  const legacyMotion = scene.find(
    (entry) => entry.__type__ === "150bbm28mVCw4UuJxhamvPz",
  );
  const showcase = scene.find(
    (entry) => entry.__type__ === "e64a7BRfO9BBL009GoOm9Gf",
  );

  assert.equal(scene[0]._name, "red-cap-production-showcase");
  assert.equal(sceneMeta.importer, "scene");
  assert.equal(sceneMeta.uuid, "07e80c54-7a3f-45cf-876f-349923543a90");
  assert.equal(showcaseMeta.importer, "typescript");
  assert.equal(showcaseMeta.uuid, "e64a7051-7cef-4104-bd34-f46a0e9bd19f");
  assert.ok(legacyMotion);
  assert.equal(legacyMotion._enabled, false);
  assert.ok(showcase);
  assert.equal(showcase._enabled, true);
  assert.equal(
    scene.filter((entry) => entry.__type__ === "e64a7BRfO9BBL009GoOm9Gf").length,
    1,
  );
});

test("keeps PROGRAM-015 showcase resources, controls, and D1/D2 boundary explicit", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "assets/gameai/program015-showcase/program015-production-showcase.ts",
    ),
    "utf8",
  );
  for (const key of [
    "DIGIT_1",
    "DIGIT_2",
    "DIGIT_3",
    "SPACE",
    "KEY_T",
    "KEY_B",
    "KEY_R",
    "KEY_D",
  ]) {
    assert.match(source, new RegExp(`KeyCode\\.${key}`));
  }
  for (const target of [
    "showcase.production-lite.left-foot",
    "showcase.production-lite.body-center",
    "showcase.red-cap.left-grip",
    "showcase.red-cap.right-grip",
    "showcase.red-cap.torso",
  ]) {
    assert.match(source, new RegExp(target.replaceAll(".", "\\.")));
  }
  for (const signal of [
    "PROGRAM015_SHOWCASE_READY",
    "PROGRAM015_SHOWCASE_EXACT_RESET",
  ]) {
    assert.match(source, new RegExp(signal));
  }
  assert.match(source, /compileCocosVfxRenderDescriptors/);
  assert.match(source, /new CocosRenderPlanHost/);
  assert.match(source, /new CocosVfxRuntimeState/);
  assert.match(source, /vfxSoftMaskFrame/);
  assert.doesNotMatch(
    source,
    /spriteFrame:\s*resource\.recipeKind === "textured-sprite"\s*\?\s*redCapFrame/,
  );
  assert.match(source, /input\.off\(Input\.EventType\.KEY_DOWN/);
  assert.match(source, /this\.vfxRuntime\?\.cleanup\(reason\)/);

  for (const file of [
    "training-ground-background.png",
    "production-lite-character.png",
    "red-cap-character.png",
    "vfx-soft-mask.png",
  ]) {
    const meta = JSON.parse(
      await readFile(
        path.join(
          projectRoot,
          "assets/resources/program015-showcase",
          `${file}.meta`,
        ),
        "utf8",
      ),
    );
    assert.equal(meta.importer, "image", file);
    assert.equal(meta.imported, true, file);
    assert.ok(meta.subMetas.f9941, file);
  }
});

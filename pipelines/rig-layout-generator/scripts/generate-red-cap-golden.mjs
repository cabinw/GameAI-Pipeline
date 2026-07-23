import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const require = createRequire(import.meta.url);
const {
  generateRigLayout,
  maleNormalV1,
  renderAssembledPreviewSvg,
  serializeRigLayout,
} = require("../dist/index.js");

async function generateFixture(
  fixtureName,
  layoutOutput,
  previewOutput,
) {
  const fixtureRoot = resolve(repositoryRoot, "examples", fixtureName);
  const annotation = JSON.parse(
    await readFile(resolve(fixtureRoot, "source-annotation.json"), "utf8"),
  );
  const characterRig = JSON.parse(
    await readFile(resolve(fixtureRoot, "character-rig.json"), "utf8"),
  );
  const result = await generateRigLayout({
    annotation,
    template: maleNormalV1,
    characterRig,
    sourceRoot: fixtureRoot,
    rigLayoutPath: layoutOutput,
  });
  if (!result.ok) {
    throw new Error(
      `${fixtureName} golden generation failed: ${JSON.stringify(result.diagnostics, null, 2)}`,
    );
  }
  await writeFile(
    resolve(fixtureRoot, layoutOutput),
    serializeRigLayout(result.rigLayout),
  );
  await writeFile(
    resolve(fixtureRoot, previewOutput),
    renderAssembledPreviewSvg(annotation, result.rigLayout),
  );
}

await generateFixture(
  "red-cap-target",
  "rig-layout.generated.json",
  "assembled-preview.svg",
);
await generateFixture(
  "red-cap-target-remade",
  "rig-layout.json",
  "assembled-preview.svg",
);

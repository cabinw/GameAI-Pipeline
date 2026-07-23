import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target");
const require = createRequire(import.meta.url);
const {
  generateRigLayout,
  maleNormalV1,
  renderAssembledPreviewSvg,
  serializeRigLayout,
} = require("../dist/index.js");

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
  rigLayoutPath: "rig-layout.json",
});
if (!result.ok) {
  throw new Error(`Golden generation failed: ${JSON.stringify(result.diagnostics, null, 2)}`);
}
await writeFile(
  resolve(fixtureRoot, "rig-layout.generated.json"),
  serializeRigLayout(result.rigLayout),
);
await writeFile(
  resolve(fixtureRoot, "assembled-preview.svg"),
  renderAssembledPreviewSvg(annotation, result.rigLayout),
);

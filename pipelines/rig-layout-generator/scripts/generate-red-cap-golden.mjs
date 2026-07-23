import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target");
const require = createRequire(import.meta.url);
const { generateRigLayout, maleNormalV1, serializeRigLayout } = require("../dist/index.js");

const existingLayout = JSON.parse(
  await readFile(resolve(fixtureRoot, "rig-layout.json"), "utf8"),
);
const characterRig = JSON.parse(
  await readFile(resolve(fixtureRoot, "character-rig.json"), "utf8"),
);
const templatePartIds = new Set(maleNormalV1.parts.map((part) => part.partId));

const annotation = {
  schemaVersion: "1.0.0",
  annotationId: "red-cap-target-source-v1",
  characterId: characterRig.characterId,
  layoutId: "red-cap-target-generated-rig",
  sourceCanvas: existingLayout.sourceCanvas,
  overrides: {
    referenceScale: 0.01,
    sourceRectOverlapPolicy: "allow",
  },
  parts: existingLayout.parts.map((part) => {
    const joint = {
      x: part.originalRect.x + part.anchor.x * part.originalRect.width,
      y: part.originalRect.y + part.anchor.y * part.originalRect.height,
    };
    const trimmedRect = {
      x: part.originalRect.x + part.trimOffset.x,
      y: part.originalRect.y + part.trimOffset.y,
      width: part.originalRect.width - part.trimOffset.x,
      height: part.originalRect.height - part.trimOffset.y,
    };
    return {
      partId: part.partId,
      file: part.file,
      sourceRect: part.originalRect,
      trimmedRect,
      joint,
      visualCenter: {
        x: trimmedRect.x + trimmedRect.width / 2,
        y: trimmedRect.y + trimmedRect.height / 2,
      },
      overrides: {
        ...(templatePartIds.has(part.partId)
          ? {}
          : { parentId: part.parentId, drawOrder: part.drawOrder }),
        rotationDegrees: part.restPose.rotationDegrees,
        scale: part.restPose.scale,
        opacity: part.restPose.opacity,
      },
    };
  }),
};

await writeFile(
  resolve(fixtureRoot, "source-annotation.json"),
  `${JSON.stringify(annotation, null, 2)}\n`,
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

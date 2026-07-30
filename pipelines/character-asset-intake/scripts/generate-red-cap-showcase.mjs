import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { compileVfxAuthoring } from "../../vfx-authoring/dist/index.js";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptRoot, "../../..");
const exampleRoot = path.join(repositoryRoot, "examples/red-cap-production-v1");
const resourceRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/program015-showcase",
);
const codeRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/gameai/program015-showcase",
);

const layout = JSON.parse(await readFile(path.join(exampleRoot, "showcase-layout.json"), "utf8"));
const document = JSON.parse(await readFile(path.join(exampleRoot, "showcase-vfx.json"), "utf8"));
const registry = JSON.parse(
  await readFile(path.join(exampleRoot, "showcase-vfx-resource-registry.json"), "utf8"),
);
const sourceBackground = path.join(exampleRoot, layout.background.source);
const styleBoard = path.join(exampleRoot, layout.styleBoard.source);
const productionLite = path.join(
  repositoryRoot,
  "examples/production-lite-character/reference/reference-composite.png",
);
const redCap = path.join(exampleRoot, "reference/reconstructed-neutral.png");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

for (const [file, expected, label] of [
  [sourceBackground, layout.background.sha256, "background"],
  [styleBoard, layout.styleBoard.sha256, "style-board"],
]) {
  const actual = sha256(await readFile(file));
  if (actual !== expected) {
    throw new Error(`PROGRAM015_${label.toUpperCase()}_SHA_MISMATCH:${actual}`);
  }
}

const semanticCues = document.cues.map((cue) => ({
  cueId: cue.cueId,
  commandMode: cue.lifecycle === "one-shot" ? "emit" : "start-stop",
  lifecycle: cue.lifecycle,
}));
const compileResult = compileVfxAuthoring(document, {
  semanticCues,
  resources: registry.map(({ compatibleBlendRoles: _ignored, ...resource }) => resource),
});
if (!compileResult.ok) {
  throw new Error(`PROGRAM015_VFX_COMPILE_FAILED:${JSON.stringify(compileResult.errors)}`);
}

await mkdir(resourceRoot, { recursive: true });
await mkdir(codeRoot, { recursive: true });

const backgroundPath = path.join(resourceRoot, "training-ground-background.png");
const vfxSoftMaskPath = path.join(resourceRoot, "vfx-soft-mask.png");
await sharp(sourceBackground)
  .extract({
    left: layout.background.sourceCrop.x,
    top: layout.background.sourceCrop.y,
    width: layout.background.sourceCrop.width,
    height: layout.background.sourceCrop.height,
  })
  .resize(layout.background.runtimeSize.width, layout.background.runtimeSize.height, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  })
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(backgroundPath);

const softMaskSize = 64;
const softMaskRadius = softMaskSize / 2;
const softMaskPixels = Buffer.alloc(softMaskSize * softMaskSize * 4);
for (let y = 0; y < softMaskSize; y += 1) {
  for (let x = 0; x < softMaskSize; x += 1) {
    const offset = (y * softMaskSize + x) * 4;
    const distance = Math.hypot(
      x + 0.5 - softMaskRadius,
      y + 0.5 - softMaskRadius,
    ) / softMaskRadius;
    const alpha = Math.max(0, Math.min(1, 1 - distance));
    softMaskPixels[offset] = 255;
    softMaskPixels[offset + 1] = 255;
    softMaskPixels[offset + 2] = 255;
    softMaskPixels[offset + 3] = Math.round(alpha * alpha * 255);
  }
}
await sharp(softMaskPixels, {
  raw: {
    width: softMaskSize,
    height: softMaskSize,
    channels: 4,
  },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false })
  .toFile(vfxSoftMaskPath);

async function cropCharacter(source, output, maximum) {
  const image = sharp(source);
  const { data, info } = await image
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer({ resolveWithObject: true });
  const scale = Math.min(maximum.width / info.width, maximum.height / info.height);
  const width = Math.floor(info.width * scale);
  const height = Math.floor(info.height * scale);
  await sharp(data)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(output);
  return { sourceWidth: info.width, sourceHeight: info.height, width, height };
}

const productionBounds = await cropCharacter(
  productionLite,
  path.join(resourceRoot, "production-lite-character.png"),
  layout.characters[0].maximumSilhouette,
);
const redCapBounds = await cropCharacter(
  redCap,
  path.join(resourceRoot, "red-cap-character.png"),
  layout.characters[1].maximumSilhouette,
);

const renderPlanPath = path.join(exampleRoot, "showcase.render-plan.json");
await writeFile(renderPlanPath, compileResult.value.serialized);
const dataSource =
  `// Generated by generate-red-cap-showcase.mjs. Do not hand-edit.\n` +
  `export const PROGRAM015_SHOWCASE_RENDER_PLAN = ${compileResult.value.serialized.trim()} as const;\n` +
  `export const PROGRAM015_SHOWCASE_RESOURCES = ${JSON.stringify(registry)} as const;\n` +
  `export const PROGRAM015_SHOWCASE_LAYOUT = ${JSON.stringify(layout)} as const;\n` +
  `export const PROGRAM015_SHOWCASE_CHARACTER_BOUNDS = ${JSON.stringify({
    productionLite: productionBounds,
    redCap: redCapBounds,
  })} as const;\n`;
await writeFile(path.join(codeRoot, "program015-showcase-data.ts"), dataSource);

const outputs = {};
for (const file of [
  backgroundPath,
  vfxSoftMaskPath,
  path.join(resourceRoot, "production-lite-character.png"),
  path.join(resourceRoot, "red-cap-character.png"),
  renderPlanPath,
]) {
  const relative = path.relative(repositoryRoot, file);
  outputs[relative] = sha256(await readFile(file));
}
const report = {
  status: "passed",
  generator: "generate-red-cap-showcase.mjs",
  backgroundAuthority: {
    source: layout.background.source,
    sourceSha256: layout.background.sha256,
    operation: "locked crop then deterministic 1280x720 resize",
    generatedOrProceduralFallback: false,
  },
  styleBoard: {
    source: layout.styleBoard.source,
    sha256: layout.styleBoard.sha256,
    runtimeAuthority: false,
  },
  vfxPath: {
    authoring: "showcase-vfx.json",
    compiler: "@gameai/vfx-authoring",
    renderPlan: "showcase.render-plan.json",
    existingPrimitivesOnly: true,
    publicRuntimeChanges: false,
    texturedSpriteSource: "deterministic 64x64 procedural soft mask",
  },
  characters: {
    productionLite: productionBounds,
    redCap: redCapBounds,
  },
  newPngResourceCount: 4,
  featureMediaCount: 0,
  outputs,
};
await writeFile(
  path.join(exampleRoot, "showcase-generation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log("PROGRAM015_SHOWCASE_GENERATION_PASS");

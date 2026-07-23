import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditCanonicalArt,
  intakeCharacterAssets,
} from "../dist/index.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const fixtureRoot = resolve(repositoryRoot, "examples/red-cap-target-remade");
const outputRoot = resolve(fixtureRoot, "provenance");
const allowBlocked = process.argv.includes("--allow-blocked");

const intake = await intakeCharacterAssets({ sourceRoot: fixtureRoot });
if (!intake.ok) {
  throw new Error(JSON.stringify(intake.diagnostics, null, 2));
}
const provenance = JSON.parse(
  await readFile(resolve(fixtureRoot, "asset-provenance.json"), "utf8"),
);
const result = await auditCanonicalArt({
  manifest: intake.manifest,
  provenance,
});
if (result.artifacts !== null && result.report !== null) {
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(outputRoot, "flat-composite.png"),
      result.artifacts.flatCompositePng,
    ),
    writeFile(resolve(outputRoot, "diff.png"), result.artifacts.diffPng),
    writeFile(
      resolve(outputRoot, "mismatch-statistics.json"),
      `${JSON.stringify(
        {
          ...result.report,
          canonicalReferencePath: "reference/full_character.png",
          flatCompositePath: "provenance/flat-composite.png",
          diffPath: "provenance/diff.png",
          diagnostics: result.diagnostics,
        },
        null,
        2,
      )}\n`,
    ),
  ]);
}

if (!result.ok && !allowBlocked) {
  console.error(JSON.stringify(result.diagnostics, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      result.report ?? { status: "failed", diagnostics: result.diagnostics },
      null,
      2,
    ),
  );
}

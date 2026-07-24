import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/production-lite-full-loadout",
);
const source = JSON.parse(
  readFileSync(
    path.join(fixtureRoot, "source/full-loadout-source.json"),
    "utf8",
  ),
) as {
  exactRestStateIds: string[];
  requiredSemanticClipIds: string[];
};
const digest = async (file: string) =>
  createHash("sha256").update(await readFile(file)).digest("hex");

test("generates byte-stable full-loadout fixture and Cocos resource mirror", async () => {
  const files = [
    "rig-layout.json",
    "attachment-layout.json",
    "loadout-contract.json",
    "continuous-validation-report.json",
    "reference/authoring-provenance.json",
    "reference/reconstruction-summary.json",
    ...["accessories", "garment", "prop"].map(
      (family) => `families/${family}.attachment-layout.json`,
    ),
    ...["rest", "walk", "wave", "prop-swing", "integration-stress"].map(
      (clip) => `animations/${clip}.json`,
    ),
    ...source.exactRestStateIds.flatMap((stateId) => [
      `reference/${stateId}.png`,
      `reference/${stateId}-reconstructed.png`,
      `reference/${stateId}-diff.png`,
      `reference/${stateId}-report.json`,
      `resolved/${stateId}.json`,
    ]),
  ].sort();
  const before = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        await digest(path.join(fixtureRoot, file)),
      ]),
    ),
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-production-lite-full-loadout.mjs")],
    { cwd: packageRoot },
  );
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/verify-production-lite-full-loadout.mjs")],
    { cwd: packageRoot },
  );
  await execFileAsync(
    process.execPath,
    [
      path.join(
        packageRoot,
        "scripts/generate-production-lite-full-loadout-cocos-metas.mjs",
      ),
    ],
    { cwd: packageRoot },
  );
  for (const file of files) {
    assert.equal(await digest(path.join(fixtureRoot, file)), before[file], file);
    assert.equal(
      await digest(path.join(cocosRoot, file)),
      before[file],
      `Cocos mirror ${file}`,
    );
  }
});

test("all eight authored Rest reports are exact zero-difference", async () => {
  assert.equal(source.exactRestStateIds.length, 8);
  for (const stateId of source.exactRestStateIds) {
    const report = JSON.parse(
      await readFile(
        path.join(fixtureRoot, `reference/${stateId}-report.json`),
        "utf8",
      ),
    );
    assert.deepEqual(
      {
        status: report.status,
        rgba: report.rgbaMismatchPixels,
        alpha: report.alphaMismatchPixels,
        seam: report.seamMismatchPixels,
        bounds: report.boundsExpansionPixels,
      },
      { status: "passed", rgba: 0, alpha: 0, seam: 0, bounds: 0 },
      stateId,
    );
  }
});

test("60 Hz continuous validation covers all semantic clips with zero drift", async () => {
  const report = JSON.parse(
    await readFile(
      path.join(fixtureRoot, "continuous-validation-report.json"),
      "utf8",
    ),
  );
  assert.equal(report.sampleRateHz, 60);
  assert.deepEqual(report.clipIds, source.requiredSemanticClipIds);
  assert.equal(report.totalSampleCount, 605);
  assert.equal(report.maximumGarmentSeamError, 0);
  assert.equal(report.maximumAccessorySocketError, 0);
  assert.equal(report.maximumPropGripError, 0);
  assert.equal(report.maximumLayerOrderViolations, 0);
  assert.equal(report.firstFailure, null);
  assert.equal(report.status, "passed");
});

test("fixture is tracked-input safe and contains no machine-specific or temp state", async () => {
  const entries = (await readdir(fixtureRoot, { recursive: true })).map(String);
  assert.equal(
    entries.some((entry) => /(^|\/)(temp|library|local)(\/|$)/i.test(entry)),
    false,
  );
  const texts = entries
    .filter((entry) => entry.endsWith(".json") || entry.endsWith(".md"))
    .map((entry) => readFileSync(path.join(fixtureRoot, entry), "utf8"))
    .join("\n");
  assert.equal(texts.includes("/Users/"), false);
  assert.equal(texts.includes("\\\\"), false);
  assert.equal(entries.some((entry) => entry.endsWith(".mp4")), false);
});

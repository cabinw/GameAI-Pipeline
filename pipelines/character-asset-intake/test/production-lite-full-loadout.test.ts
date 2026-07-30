import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  chmod,
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import sharp from "sharp";

import {
  assertCompletePng,
  assertNoTemporaryFiles,
  createReadOnlyExamplesSnapshot,
  createStartBarrier,
} from "./generation-isolation";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const { atomicWriteFile } = require(
  path.join(
    repositoryRoot,
    "cocos/projects/character-rig-builder-mvp/extensions/gameai-character-rig-builder/scripts/atomic-write.mjs",
  ),
) as {
  atomicWriteFile(
    target: string,
    data: Buffer,
    options?: {
      beforePublish?: (temporaryFile: string) => Promise<void>;
    },
  ): Promise<void>;
};
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
  exactRestPresets: Array<{ outputId: string; stateId: string }>;
  requiredSemanticClipIds: string[];
};
const generatedLayout = JSON.parse(
  readFileSync(path.join(fixtureRoot, "attachment-layout.json"), "utf8"),
) as { attachments: Array<{ file: string }> };
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
    ...source.exactRestPresets.flatMap(({ outputId: stateId }) => [
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
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "production-lite-full-loadout-generation-"),
  );
  const snapshot = await createReadOnlyExamplesSnapshot(
    repositoryRoot,
    temporaryRoot,
    [
      "production-lite-character",
      "production-lite-full-loadout",
      "production-lite-garment-layering",
      "production-lite-one-handed-prop",
    ],
  );
  const generatedFixtureRoot = path.join(temporaryRoot, "fixture");
  const generatedCocosRoot = path.join(temporaryRoot, "cocos");
  const generatedFiles = [
    ...files,
    ...generatedLayout.attachments.map((attachment) => attachment.file),
  ].sort();
  const recursiveFiles = async (root: string): Promise<string[]> => {
    const entries = await readdir(root, { recursive: true });
    const result: string[] = [];
    for (const entry of entries.map(String)) {
      if ((await stat(path.join(root, entry))).isFile()) result.push(entry);
    }
    return result;
  };
  try {
    const generatorArguments = [
      path.join(
        packageRoot,
        "scripts/generate-production-lite-full-loadout.mjs",
      ),
      "--fixture-output-root",
      generatedFixtureRoot,
      "--cocos-output-root",
      generatedCocosRoot,
      "--input-examples-root",
      snapshot.root,
      "--base-asset-root",
      snapshot.fixture("production-lite-character"),
    ];
    await execFileAsync(process.execPath, generatorArguments, {
      cwd: packageRoot,
    });
    await execFileAsync(
      process.execPath,
      [
        path.join(
          packageRoot,
          "scripts/verify-production-lite-full-loadout.mjs",
        ),
        "--fixture-output-root",
        generatedFixtureRoot,
        "--cocos-output-root",
        generatedCocosRoot,
        "--input-examples-root",
        snapshot.root,
        "--base-asset-root",
        snapshot.fixture("production-lite-character"),
      ],
      { cwd: packageRoot },
    );
    for (const file of files) {
      assert.equal(
        await digest(path.join(generatedFixtureRoot, file)),
        before[file],
        file,
      );
      assert.equal(
        await digest(path.join(generatedCocosRoot, file)),
        before[file],
        `Cocos mirror ${file}`,
      );
      assert.equal(
        await digest(path.join(fixtureRoot, file)),
        before[file],
        `tracked fixture ${file}`,
      );
      assert.equal(
        await digest(path.join(cocosRoot, file)),
        before[file],
        `tracked Cocos mirror ${file}`,
      );
    }
    assert.deepEqual(
      (await recursiveFiles(generatedFixtureRoot)).sort(),
      generatedFiles,
    );
    assert.deepEqual(
      (await recursiveFiles(generatedCocosRoot)).sort(),
      generatedFiles,
    );
    for (const file of generatedFiles.filter((entry) =>
      entry.endsWith(".png"),
    )) {
      await assertCompletePng(path.join(generatedFixtureRoot, file));
      await assertCompletePng(path.join(generatedCocosRoot, file));
    }
    await snapshot.assertUnchanged();
    await assertNoTemporaryFiles(temporaryRoot);
  } finally {
    await snapshot.restoreWritable();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("publishes complete PNGs at synchronized atomic boundaries", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "production-lite-atomic-png-"),
  );
  const target = path.join(temporaryRoot, "part.png");
  const previous = await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-character/parts/hair-back.png",
    ),
  );
  const next = await readFile(
    path.join(
      repositoryRoot,
      "examples/production-lite-character/parts/torso.png",
    ),
  );
  const validPng = async (bytes: Buffer) => {
    assert.ok(bytes.length > 0);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "png");
    assert.ok((metadata.width ?? 0) > 0);
    assert.ok((metadata.height ?? 0) > 0);
  };
  let releasePublication!: () => void;
  const publicationReleased = new Promise<void>((resolve) => {
    releasePublication = resolve;
  });
  let staged!: (file: string) => void;
  const fullyStaged = new Promise<string>((resolve) => {
    staged = resolve;
  });
  try {
    await writeFile(target, previous);
    const publication = atomicWriteFile(target, next, {
      beforePublish: async (temporaryFile: string) => {
        const stagedBytes = await readFile(temporaryFile);
        await validPng(stagedBytes);
        staged(temporaryFile);
        await publicationReleased;
      },
    });
    const temporaryFile = await fullyStaged;
    assert.equal(path.dirname(temporaryFile), temporaryRoot);
    const duringPublication = await readFile(target);
    await validPng(duringPublication);
    assert.deepEqual(duringPublication, previous);
    releasePublication();
    await publication;
    const afterPublication = await readFile(target);
    await validPng(afterPublication);
    assert.deepEqual(afterPublication, next);
    await assert.rejects(
      atomicWriteFile(target, previous, {
        beforePublish: async () => {
          throw new Error("EXPECTED_PUBLICATION_FAILURE");
        },
      }),
      /EXPECTED_PUBLICATION_FAILURE/,
    );
    assert.deepEqual(await readFile(target), next);
    assert.equal(
      (await readdir(temporaryRoot)).some((entry) => entry.endsWith(".tmp")),
      false,
    );
  } finally {
    releasePublication();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("concurrent base generation and full-loadout reading stay byte-closed", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "production-lite-concurrent-generation-"),
  );
  const inputExamplesRoot = path.join(temporaryRoot, "inputs");
  const stableBaseRoot = path.join(
    inputExamplesRoot,
    "production-lite-character",
  );
  const baseFixtureRoot = path.join(temporaryRoot, "base-fixture");
  const baseCocosRoot = path.join(temporaryRoot, "base-cocos");
  const fullFixtureRoot = path.join(temporaryRoot, "full-fixture");
  const fullCocosRoot = path.join(temporaryRoot, "full-cocos");
  const baseGenerator = [
    path.join(packageRoot, "scripts/generate-production-lite-character.mjs"),
    "--source-root",
    stableBaseRoot,
    "--fixture-output-root",
    baseFixtureRoot,
    "--cocos-output-root",
    baseCocosRoot,
  ];
  const fullGenerator = [
    path.join(
      packageRoot,
      "scripts/generate-production-lite-full-loadout.mjs",
    ),
    "--fixture-output-root",
    fullFixtureRoot,
    "--cocos-output-root",
    fullCocosRoot,
    "--base-asset-root",
    stableBaseRoot,
    "--input-examples-root",
    inputExamplesRoot,
  ];
  try {
    for (const fixture of [
      "production-lite-character",
      "production-lite-full-loadout",
      "production-lite-garment-layering",
      "production-lite-one-handed-prop",
    ]) {
      await cp(
        path.join(repositoryRoot, "examples", fixture),
        path.join(inputExamplesRoot, fixture),
        { recursive: true },
      );
    }
    const inputEntries = await readdir(inputExamplesRoot, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of inputEntries.reverse()) {
      await chmod(
        path.join(entry.parentPath, entry.name),
        entry.isDirectory() ? 0o555 : 0o444,
      );
    }
    await chmod(inputExamplesRoot, 0o555);
    const stableInputBefore = await Promise.all(
      (await readdir(path.join(stableBaseRoot, "parts")))
        .sort()
        .map((file) => digest(path.join(stableBaseRoot, "parts", file))),
    );
    await execFileAsync(process.execPath, baseGenerator, { cwd: packageRoot });
    const acceptedBase = await Promise.all(
      (await readdir(path.join(stableBaseRoot, "parts")))
        .sort()
        .map((file) => digest(path.join(stableBaseRoot, "parts", file))),
    );
    const waitForBothGenerators = createStartBarrier(2);
    const runFromBarrier = async (arguments_: string[]) => {
      await waitForBothGenerators();
      return execFileAsync(process.execPath, arguments_, { cwd: packageRoot });
    };
    await Promise.all([
      runFromBarrier(baseGenerator),
      runFromBarrier(fullGenerator),
    ]);
    await execFileAsync(
      process.execPath,
      [
        path.join(
          packageRoot,
          "scripts/verify-production-lite-full-loadout.mjs",
        ),
        "--fixture-output-root",
        fullFixtureRoot,
        "--cocos-output-root",
        fullCocosRoot,
        "--base-asset-root",
        stableBaseRoot,
        "--input-examples-root",
        inputExamplesRoot,
      ],
      { cwd: packageRoot },
    );
    assert.deepEqual(
      await Promise.all(
        (await readdir(path.join(stableBaseRoot, "parts")))
          .sort()
          .map((file) => digest(path.join(stableBaseRoot, "parts", file))),
      ),
      stableInputBefore,
    );
    assert.deepEqual(acceptedBase, stableInputBefore);
    for (const attachment of generatedLayout.attachments) {
      await assertCompletePng(path.join(fullFixtureRoot, attachment.file));
      await assertCompletePng(path.join(fullCocosRoot, attachment.file));
    }
    assert.equal(
      (await readdir(temporaryRoot, { recursive: true })).some((entry) =>
        String(entry).endsWith(".tmp"),
      ),
      false,
    );
  } finally {
    await chmod(inputExamplesRoot, 0o755).catch(() => undefined);
    const cleanupEntries = await readdir(inputExamplesRoot, {
      recursive: true,
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of cleanupEntries) {
      if (entry.isDirectory()) {
        await chmod(path.join(entry.parentPath, entry.name), 0o755);
      }
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("all eight authored Rest reports are exact zero-difference", async () => {
  assert.equal(source.exactRestPresets.length, 8);
  for (const { outputId: stateId } of source.exactRestPresets) {
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

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, chmod, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

async function filesBelow(root: string): Promise<string[]> {
  const entries = await readdir(root, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

export async function digestsBelow(
  root: string,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      (await filesBelow(root)).map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(path.join(root, file)))
          .digest("hex"),
      ]),
    ),
  );
}

async function setTreeModes(
  root: string,
  directoryMode: number,
  fileMode: number,
): Promise<void> {
  const entries = await readdir(root, {
    recursive: true,
    withFileTypes: true,
  });
  for (const entry of entries.filter((candidate) => candidate.isFile())) {
    await chmod(path.join(entry.parentPath, entry.name), fileMode);
  }
  for (const entry of entries
    .filter((candidate) => candidate.isDirectory())
    .reverse()) {
    await chmod(path.join(entry.parentPath, entry.name), directoryMode);
  }
  await chmod(root, directoryMode);
}

export interface ReadOnlyExamplesSnapshot {
  readonly root: string;
  fixture(name: string): string;
  assertUnchanged(): Promise<void>;
  restoreWritable(): Promise<void>;
}

export async function createReadOnlyExamplesSnapshot(
  repositoryRoot: string,
  temporaryRoot: string,
  fixtureNames: readonly string[],
): Promise<ReadOnlyExamplesSnapshot> {
  const root = path.join(temporaryRoot, "input-examples");
  await mkdir(root, { recursive: true });
  for (const fixtureName of fixtureNames) {
    await cp(
      path.join(repositoryRoot, "examples", fixtureName),
      path.join(root, fixtureName),
      { recursive: true },
    );
  }
  const before = await digestsBelow(root);
  await setTreeModes(root, 0o555, 0o444);
  return {
    root,
    fixture: (name) => path.join(root, name),
    assertUnchanged: async () => {
      assert.deepEqual(await digestsBelow(root), before);
    },
    restoreWritable: () => setTreeModes(root, 0o755, 0o644),
  };
}

export async function assertNoTemporaryFiles(root: string): Promise<void> {
  assert.equal(
    (await readdir(root, { recursive: true })).some((entry) =>
      String(entry).endsWith(".tmp"),
    ),
    false,
  );
}

export async function assertCompletePng(file: string): Promise<void> {
  const bytes = await readFile(file);
  assert.ok(bytes.length > 0, file);
  assert.equal(
    bytes.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    file,
  );
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "png", file);
  assert.ok((metadata.width ?? 0) > 0, file);
  assert.ok((metadata.height ?? 0) > 0, file);
}

export function createStartBarrier(participants: number): () => Promise<void> {
  let waiting = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    waiting += 1;
    if (waiting === participants) release();
    await released;
  };
}

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { parseRigLayout } from "@gameai/character-contracts";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const fixtureRoot = path.join(repositoryRoot, "examples/simple-sprite-character");
const cocosRoot = path.join(
  repositoryRoot,
  "cocos/projects/character-rig-builder-mvp/assets/resources/simple-sprite-character",
);
const source = JSON.parse(
  readFileSync(path.join(fixtureRoot, "source/mannequin-source.json"), "utf8"),
) as {
  sourceCanvas: { width: number; height: number };
  parts: Array<{
    partId: string;
    parentId: string | null;
    rect: { x: number; y: number; width: number; height: number };
    pivot: { x: number; y: number };
    radius?: number;
    shape?: { radius: number };
  }>;
};

async function digestTree(root: string): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      source.parts.map(async (part) => {
        const file = path.join(root, `parts/${part.partId}.png`);
        return [
          part.partId,
          createHash("sha256").update(await readFile(file)).digest("hex"),
        ] as const;
      }),
    ),
  );
}

test("checks in deterministic transparent PNGs at authored dimensions", async () => {
  const beforeFixture = await digestTree(fixtureRoot);
  const beforeCocos = await digestTree(cocosRoot);
  await execFileAsync(
    process.execPath,
    [path.join(packageRoot, "scripts/generate-simple-sprite-character.mjs")],
    { cwd: packageRoot },
  );
  assert.deepEqual(await digestTree(fixtureRoot), beforeFixture);
  assert.deepEqual(await digestTree(cocosRoot), beforeCocos);
  assert.deepEqual(beforeCocos, beforeFixture);

  for (const part of source.parts) {
    const file = path.join(fixtureRoot, `parts/${part.partId}.png`);
    const image = sharp(file);
    const metadata = await image.metadata();
    assert.equal(metadata.format, "png", part.partId);
    assert.equal(metadata.width, part.rect.width, part.partId);
    assert.equal(metadata.height, part.rect.height, part.partId);
    assert.equal(metadata.hasAlpha, true, part.partId);
    const { data, info } = await image.ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    let transparent = 0;
    let visible = 0;
    for (let offset = 3; offset < data.length; offset += info.channels) {
      if (data[offset] === 0) transparent += 1;
      else visible += 1;
    }
    assert.ok(transparent > 0, `${part.partId} needs transparent pixels`);
    assert.ok(visible > 0, `${part.partId} needs visible pixels`);
  }
});

test("keeps contract pivots inside visible rounded overlap at every joint", async () => {
  const decoded = new Map<string, { data: Buffer; channels: number }>();
  for (const part of source.parts) {
    const result = await sharp(
      path.join(fixtureRoot, `parts/${part.partId}.png`),
    ).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    decoded.set(part.partId, {
      data: result.data,
      channels: result.info.channels,
    });
  }
  const alphaAtPivot = (part: (typeof source.parts)[number]): number => {
    const decodedPart = decoded.get(part.partId)!;
    const x = Math.round(part.pivot.x - part.rect.x);
    const y = Math.round(part.pivot.y - part.rect.y);
    return decodedPart.data[
      (y * part.rect.width + x) * decodedPart.channels + 3
    ]!;
  };
  for (const part of source.parts) {
    assert.ok(alphaAtPivot(part) > 0, `${part.partId} proximal cap`);
    if (part.parentId === null) continue;
    const parent = source.parts.find(
      (candidate) => candidate.partId === part.parentId,
    )!;
    const parentPoint = {
      ...parent,
      pivot: part.pivot,
    };
    assert.ok(alphaAtPivot(parentPoint) > 0, `${part.parentId} covers ${part.partId}`);
    assert.ok((part.radius ?? part.shape?.radius ?? 0) > 0);
  }
});

test("parses the complete layout and keeps it isolated from complex character art", async () => {
  const layoutText = await readFile(path.join(fixtureRoot, "rig-layout.json"), "utf8");
  const result = parseRigLayout(layoutText);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.parts.length, 15);
  assert.equal(result.value.parts.filter((part) => part.parentId === null).length, 1);
  assert.equal(result.value.parts.find((part) => part.parentId === null)?.partId, "pelvis");
  assert.equal(new Set(result.value.parts.map((part) => part.drawOrder)).size, 15);
  assert.doesNotMatch(
    [
      layoutText,
      await readFile(
        path.join(
          repositoryRoot,
          "pipelines/character-asset-intake/scripts/generate-simple-sprite-character.mjs",
        ),
        "utf8",
      ),
    ].join("\n"),
    /red[ -]?cap|briefcase|sunglasses|jacket|hat/i,
  );
});

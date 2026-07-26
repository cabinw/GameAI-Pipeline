import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertExactFlatFileSet } from "../scripts/generated-output-closure.mjs";

test("generated-output closure rejects stale and missing generated files", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "gameai-generated-closure-"),
  );
  try {
    await writeFile(path.join(root, "expected.ts"), "expected\n");
    await assertExactFlatFileSet(root, ["expected.ts"], {
      include: (file) => file.endsWith(".ts"),
      diagnostic: "TEST_CLOSURE",
    });
    await writeFile(path.join(root, "stale.ts"), "stale\n");
    await assert.rejects(
      () =>
        assertExactFlatFileSet(root, ["expected.ts"], {
          include: (file) => file.endsWith(".ts"),
          diagnostic: "TEST_CLOSURE",
        }),
      /TEST_CLOSURE:.*stale\.ts/u,
    );
    await assert.rejects(
      () =>
        assertExactFlatFileSet(root, ["expected.ts", "missing.ts"], {
          include: (file) => file.endsWith(".ts"),
          diagnostic: "TEST_CLOSURE",
        }),
      /TEST_CLOSURE:.*missing\.ts/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

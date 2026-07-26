import { readdir } from "node:fs/promises";

export async function assertExactFlatFileSet(
  root,
  expectedFiles,
  {
    include = () => true,
    diagnostic = "GENERATED_OUTPUT_CLOSURE_FAILED",
  } = {},
) {
  const expected = [...expectedFiles].filter(include).sort();
  const actual = (await readdir(root)).filter(include).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const expectedSet = new Set(expected);
    const actualSet = new Set(actual);
    throw new Error(
      `${diagnostic}:${JSON.stringify({
        missing: expected.filter((file) => !actualSet.has(file)),
        unexpected: actual.filter((file) => !expectedSet.has(file)),
      })}`,
    );
  }
}

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = path.resolve(packageRoot, "../..");
const outputRoot = path.join(packageRoot, "dist", "schemas");

await mkdir(outputRoot, { recursive: true });
for (const file of [
  "animation-review.schema.json",
  "animation-review-engine-adapter.schema.json",
]) {
  await copyFile(
    path.join(repositoryRoot, "schemas", file),
    path.join(outputRoot, file),
  );
}

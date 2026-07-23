import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const destination = resolve(packageRoot, "dist/schemas");

await mkdir(destination, { recursive: true });
for (const file of [
  "source-canvas-annotation.schema.json",
  "skeleton-template.schema.json",
]) {
  await copyFile(resolve(repositoryRoot, "schemas", file), resolve(destination, file));
}

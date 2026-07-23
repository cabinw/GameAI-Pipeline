import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(packageRoot, "dist/runtime-esm");
await mkdir(outputRoot, { recursive: true });
await writeFile(
  path.join(outputRoot, "package.json"),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  "utf8",
);

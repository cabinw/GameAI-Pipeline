import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaName = "character-semantic-events.schema.json";
const source = path.resolve(packageRoot, "../../schemas", schemaName);
const targetDirectory = path.resolve(packageRoot, "dist/schemas");

await mkdir(targetDirectory, { recursive: true });
await copyFile(source, path.join(targetDirectory, schemaName));

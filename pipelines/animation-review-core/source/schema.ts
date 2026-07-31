import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSchema(file: string): Record<string, unknown> {
  const local = resolve(__dirname, "schemas", file);
  const built = resolve(__dirname, "../../dist/schemas", file);
  return JSON.parse(
    readFileSync(existsSync(local) ? local : built, "utf8"),
  ) as Record<string, unknown>;
}

export const animationReviewSchema = readSchema("animation-review.schema.json");
export const animationReviewEngineAdapterSchema = readSchema(
  "animation-review-engine-adapter.schema.json",
);

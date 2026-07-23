import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type JsonSchema = Readonly<Record<string, unknown>>;

function loadSchema(file: string): JsonSchema {
  for (const directory of [
    resolve(__dirname, "schemas"),
    resolve(__dirname, "../../../schemas"),
    resolve(__dirname, "../../../../schemas"),
  ]) {
    const schemaPath = resolve(directory, file);
    if (existsSync(schemaPath)) {
      return JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
    }
  }
  throw new Error(`Cannot locate canonical schema ${file}.`);
}

export const sourceCanvasAnnotationSchema = loadSchema(
  "source-canvas-annotation.schema.json",
);
export const skeletonTemplateSchema = loadSchema("skeleton-template.schema.json");

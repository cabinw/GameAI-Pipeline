import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type JsonSchema = Readonly<Record<string, unknown>>;

function schemaDirectories(): string[] {
  return [
    resolve(__dirname, "schemas"),
    resolve(__dirname, "../../../schemas"),
    resolve(__dirname, "../../../../schemas"),
  ];
}

export function loadSchema(file: string): JsonSchema {
  for (const directory of schemaDirectories()) {
    const path = resolve(directory, file);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as JsonSchema;
    }
  }

  throw new Error(`Cannot locate canonical schema ${file}.`);
}

export const characterRigSchema = loadSchema("character-rig.schema.json");
export const rigLayoutSchema = loadSchema("rig-layout.schema.json");
export const attachmentLayoutSchema = loadSchema("attachment-layout.schema.json");

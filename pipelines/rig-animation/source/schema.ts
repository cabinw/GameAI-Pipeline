import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const localSchema = resolve(__dirname, "schemas/rig-animation.schema.json");
const builtSchema = resolve(__dirname, "../../dist/schemas/rig-animation.schema.json");
export const rigAnimationSchema = JSON.parse(
  readFileSync(existsSync(localSchema) ? localSchema : builtSchema, "utf8"),
) as Record<string, unknown>;

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SkeletonTemplate } from "./types";

function loadTemplate(file: string): SkeletonTemplate {
  for (const directory of [
    resolve(__dirname, "../templates"),
    resolve(__dirname, "../../templates"),
  ]) {
    const templatePath = resolve(directory, file);
    if (existsSync(templatePath)) {
      return JSON.parse(readFileSync(templatePath, "utf8")) as SkeletonTemplate;
    }
  }
  throw new Error(`Cannot locate skeleton template ${file}.`);
}

export const maleNormalV1 = loadTemplate("male-normal-v1.json");

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EDITOR_TYPECHECK_CONFIG = "tsconfig.assets.json";
export const CI_TYPECHECK_CONFIG = "tsconfig.ci.json";

export function selectTypecheckConfig(environment = process.env) {
  return environment.CI === "true"
    ? CI_TYPECHECK_CONFIG
    : EDITOR_TYPECHECK_CONFIG;
}

function runTypecheck() {
  const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const executable = process.platform === "win32" ? "tsc.cmd" : "tsc";
  const result = spawnSync(
    executable,
    ["-p", selectTypecheckConfig(), "--noEmit"],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runTypecheck();
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = execFileSync(
  "git",
  ["rev-parse", "--show-toplevel"],
  { encoding: "utf8" },
).trim();
const experimentalProbe = "artifacts/experimental/example/input.png";

execFileSync(
  "git",
  ["check-ignore", "--quiet", "--no-index", experimentalProbe],
  { cwd: repositoryRoot },
);

const trackedExperimentalPaths = execFileSync(
  "git",
  ["ls-files", "--", "artifacts/experimental"],
  { cwd: repositoryRoot, encoding: "utf8" },
).trim();
assert.equal(
  trackedExperimentalPaths,
  "",
  "artifacts/experimental must contain no tracked paths",
);

const gitignore = readFileSync(resolve(repositoryRoot, ".gitignore"), "utf8");
assert.match(
  gitignore,
  /^\/artifacts\/experimental\/$/mu,
  "the standard experimental root must be ignored explicitly",
);

const assetPolicy = readFileSync(
  resolve(repositoryRoot, "docs/asset-pipeline.md"),
  "utf8",
);
const agentPolicy = readFileSync(resolve(repositoryRoot, "AGENTS.md"), "utf8");
const policyText = `${assetPolicy}\n${agentPolicy}`;
const normalizedPolicyText = policyText
  .replace(/^>\s?/gmu, "")
  .replace(/\s+/gu, " ");

for (const requiredState of [
  "Local Experimental Asset",
  "Repository Candidate",
  "Accepted Repository Asset",
]) {
  assert.ok(
    policyText.includes(requiredState),
    `missing required asset state: ${requiredState}`,
  );
}

assert.match(policyText, /Promotion begins before Git staging/u);
assert.match(policyText, /Do not upload to GitHub/u);
assert.ok(
  normalizedPolicyText.includes(
    "disposable local-only experimental input, not approved for repository publication or redistribution",
  ),
);
assert.match(
  policyText,
  /must not read, enumerate, hash, (?:log, )?or upload/u,
);

console.log("Local experimental asset policy: PASS");

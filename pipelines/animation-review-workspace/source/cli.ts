import { resolve } from "node:path";

import {
  RedCapFixtureAdapter,
  startAnimationReviewServer,
} from "./index";

function valueAfter(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(__dirname, "../../..");
  const host = valueAfter("--host") ?? "127.0.0.1";
  const portText = valueAfter("--port");
  const port = portText === undefined ? 0 : Number(portText);
  const fixtureRoot = resolve(
    valueAfter("--fixture") ??
      resolve(repositoryRoot, "examples/red-cap-production-v1"),
  );
  const adapter = await RedCapFixtureAdapter.load({ fixtureRoot });
  const running = await startAnimationReviewServer({
    adapter,
    host,
    port,
    uiModulePath: resolve(
      repositoryRoot,
      "pipelines/animation-review-ui/dist/browser-esm/index.js",
    ),
  });
  console.info(`Animation Review Workspace: ${running.url}`);
  console.info("Press Ctrl+C to stop. Source fixture remains read-only.");
  const stop = async (): Promise<void> => {
    await running.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

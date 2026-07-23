# Development Environment

This document records the TASK-000 environment audit performed on 2026-07-23. Values below come from command output rather than inferred compatibility.

## Recorded local versions

| Tool | Command | Recorded output |
| --- | --- | --- |
| Cocos Creator | `PlistBuddy -c 'Print :CFBundleShortVersionString' .../Info.plist` | `3.8.8` |
| Cocos Creator build | `PlistBuddy -c 'Print :CFBundleVersion' .../Info.plist` | `3.8.8` |
| Node.js | `node --version` | `v24.18.0` |
| npm | `npm --version` | `11.16.0` |
| pnpm | `pnpm --version` | `11.9.0` |
| Project TypeScript | `pnpm exec tsc --version` | `Version 5.8.2` |

The recorded executable locations were `/usr/local/bin/node`, `/usr/local/bin/npm`, and the Codex bundled `pnpm` runtime. A global `tsc` was not present before dependency installation; the repository always invokes the pinned workspace compiler.

## Supported repository toolchain

- Recommended Node: exactly `24.18.0`, recorded in `.nvmrc`.
- Supported Node range: `>=24.14.0 <25`, enforced through `package.json` and `.npmrc`.
- Package manager: exactly `pnpm@11.9.0`, recorded in `packageManager`, workspace configuration, and CI.
- TypeScript: exactly `5.8.2`, matching the TypeScript package bundled inside the local Cocos Creator 3.8.8 installation.
- Cocos Creator: exactly `3.8.8` for the spike. The broader 3.8.x baseline remains an architectural compatibility target, but every tested version must be recorded explicitly.

## Install and verification commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm verify
```

`pnpm verify` is the required local and CI gate. It performs a topologically ordered workspace build before repository-wide typechecking, then runs the complete test suite. The build-first order is required on a clean checkout because workspace consumers resolve dependency declarations from generated package `dist` directories. Neither local verification nor CI relies on pre-existing `dist` or `dist-test` output.

CI starts from a checkout with no build output, runs `pnpm install --frozen-lockfile`, and then runs `pnpm verify`. Creator itself is not installed in CI, so editor integration remains a recorded local acceptance check.

## Workspace and Cocos project decision

The repository is a private pnpm workspace during v0.x. Workspace packages may live under `framework/*`, `pipelines/*`, and `cocos/extensions/*`. Reproducible Cocos fixtures live under `cocos/projects/*`, but production game projects do **not** live in this repository: they consume versioned GameAI packages as dependencies.

`cocos/projects/task000-spike` is deliberately an in-repository fixture, not a production game. Its project-local extension is included by the `cocos/projects/*/extensions/*` workspace pattern so that Creator can discover it without copying or symlinking generated output.

## Cocos extension spike

The spike is located at:

```text
cocos/projects/task000-spike/
└── extensions/gameai-task000-spike/
    ├── source/panels/default.ts  # Panel initiates and displays the request
    ├── source/main.ts            # main process forwards to Scene Script
    ├── source/scene.ts           # Scene Script reads the active scene
    └── source/message-chain.ts   # testable correlation/evidence contract
```

Every request uses one `correlationId`. A successful response and evidence file contain the ordered stages `panel`, `main`, and `scene`. The evidence file is generated at `temp/gameai-task000-spike/evidence.json` and is intentionally ignored as a generated artifact.

### Runtime evidence captured

The project was imported and opened with Cocos Creator 3.8.8. Creator generated its project state, and `temp/logs/project.log` recorded:

```text
7-23-2026 03:31:48 - info: [gameai-task000-spike] main process loaded
7-23-2026 03:31:54 - log: [Scene] Cocos Creator v3.8.8
```

This proves project discovery, extension discovery, compiled main-process loading, and Scene process startup. The pure message orchestration test also proves correlation propagation and rejection of mismatched Scene Script responses.

### Explicit UI-automation blocker

The full live Panel → main → Scene Script click could not be captured in this audit session. Another user-owned Cocos Creator 3.8.8 project was already open in a separate process, and the macOS accessibility bridge exposed only that older process even after Dashboard successfully opened `task000-spike` (PID recorded by Creator as `87361`). Closing the unrelated project would exceed TASK-000's repository scope.

The spike therefore auto-opens its panel and auto-runs from `Panel.ready()` on the next extension/project load; it also keeps a manual **Run message spike** button. This is an external automation-targeting blocker, not a missing code path.

To reproduce the remaining acceptance check without another Creator instance:

1. Run `pnpm build`.
2. Open `cocos/projects/task000-spike` with Cocos Creator 3.8.8.
3. The **GameAI TASK-000 Spike** panel opens and runs automatically. If needed, open **Panel → GameAI Pipeline → TASK-000 Message Spike** and click **Run message spike**.
4. Confirm the panel reads `Passed: panel → main → scene`.
5. Confirm `temp/gameai-task000-spike/evidence.json` has `status: "passed"`, Creator `3.8.8`, identical correlation IDs, and all three stages.

No Character Rig Builder production behavior is included in this spike.

# Implementation Plans

Use this file for active multi-file or architectural work. Keep one active plan at a time.

## Completed plan: TASK-000 Repository and Environment Audit

- Status: Complete with explicit external UI-automation blocker
- Completed: 2026-07-23

### Goal

Establish and prove the minimum reproducible development environment required before Character Pipeline implementation begins.

### Scope

- Record exact local toolchain versions and supported project versions.
- Adopt a pnpm workspace with explicit framework, pipeline, Cocos adapter, and Cocos project boundaries.
- Add a minimal Cocos Creator 3.8.8 extension spike that exercises Panel → main process → Scene Script messaging.
- Add deterministic type-check, unit-test, and CI commands.
- Record validation evidence or a reproducible blocker.

### Out of scope

- Production Character Rig Builder code
- Automatic image segmentation
- Binary art assets
- Cloud image-generation integration

### Execution

1. Record the installed and repository-supported toolchain in `docs/environment.md`.
2. Add the root pnpm workspace, lockfile, TypeScript configuration, and ignore rules.
3. Add an in-repository Cocos 3.8.8 spike project whose extension is a workspace package.
4. Unit-test the message orchestration outside Creator.
5. Load the spike project in Creator and capture Panel → main → Scene Script evidence, or document an exact blocker and manual reproduction steps.
6. Add a minimal GitHub Actions workflow and run all local checks.
7. Update architecture assumptions and close TASK-000 only when its acceptance criteria pass.

### Done when

- `docs/environment.md` contains command-backed versions and exact install/test commands.
- `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm test` are deterministic.
- The spike proves Panel → main process → Scene Script on Cocos Creator 3.8.8, or records a reproducible external blocker.
- The repository-versus-consumer decision and dependency direction are explicit.
- No Character Rig Builder production logic is introduced.

### Result

- Exact environment output and commands are recorded in `docs/environment.md`.
- The pnpm workspace, frozen lockfile, Cocos 3.8.8 fixture extension, four tests, and CI workflow are implemented.
- Creator loaded the fixture extension main process and Scene process. The remaining live panel click is explicitly blocked by concurrent-instance accessibility targeting and has exact reproduction steps in `docs/environment.md`.
- ADR-0003 records the external production-game consumer topology.

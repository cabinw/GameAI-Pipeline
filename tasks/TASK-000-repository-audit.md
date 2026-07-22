# TASK-000: Repository and Environment Audit

- Status: Complete with explicit external UI-automation blocker
- Completed: 2026-07-23

## Goal

Record the actual development environment and identify constraints before implementing the Cocos extension.

## Required work

1. Record the exact Cocos Creator version.
2. Record Node.js, npm/pnpm, and TypeScript versions.
3. Document repository package-management and test commands.
4. Confirm whether the Cocos game project will live in this repository or consume it as a dependency.
5. Confirm editor-extension loading and Scene Script messaging with a minimal spike.
6. Update `PLANS.md` with findings and recommended changes.

## Deliverables

- `docs/environment.md`
- A minimal Cocos extension spike or a written blocker report
- Updated architecture assumptions

## Acceptance criteria

- All version fields contain real command output, not guesses.
- The Panel → main process → Scene Script path is proven or explicitly blocked.
- No production Character Rig Builder logic is implemented in this task.

## Completion record

- Exact Cocos Creator, Node.js, npm, pnpm, and TypeScript versions are recorded in `docs/environment.md`.
- The pnpm workspace, frozen lockfile, type-check, unit tests, and CI workflow are implemented.
- ADR-0003 records the package topology and external production-game consumer decision.
- Cocos Creator 3.8.8 loaded the fixture and extension main process; the remaining live panel click is explicitly blocked and reproducible as documented in `docs/environment.md`.
- The spike contains no Character Rig Builder production logic.

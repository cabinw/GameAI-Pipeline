# TASK-003.2: Clean-Checkout Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

## Goal

Make the documented repository verification workflow succeed deterministically from a fresh clone before TASK-004 begins.

## Problem

The root `verify` script currently runs repository-wide typechecking before building workspace packages. Consumers such as `@gameai/character-asset-intake` and `@gameai/rig-layout-generator` resolve dependency types through package `dist` declarations, so a fresh checkout fails when those declarations do not exist.

## Required work

1. Build workspace dependencies before repository-wide typechecking.
2. Do not depend on existing `dist` or `dist-test` directories.
3. Keep workspace builds topologically ordered.
4. Add a clean-checkout regression assertion to GitHub Actions.
5. Run `pnpm install --frozen-lockfile` followed by `pnpm verify` after removing local generated outputs.
6. Confirm all 63 tests pass.

## Acceptance criteria

- The root verification order is build, typecheck, then test.
- A clean checkout contains no workspace `dist` or `dist-test` before dependency installation.
- CI executes `pnpm install --frozen-lockfile` and `pnpm verify`.
- The complete suite reports 63 passing tests.
- Generated TypeScript outputs remain ignored and uncommitted.
- The completed change is committed as `chore: make clean checkout verification reproducible`.

## Out of scope

- Framework, pipeline, schema, or Cocos feature changes.
- Committing generated build output.
- Changing package versions or adding dependencies.

## Result

- Reproduced the original clean-checkout failure before implementation.
- Reordered `pnpm verify` to build workspace dependencies before repository-wide typechecking.
- Added a GitHub Actions clean-output assertion while preserving the exact frozen install and verify commands.
- Deleted local dependencies and all generated TypeScript output, then successfully ran:

  ```bash
  pnpm install --frozen-lockfile
  pnpm verify
  ```

- All 63 tests pass and all regenerated `dist` and `dist-test` directories remain ignored.

# TASK-003: Rig Layout Generator

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

## Goal

Build an engine-neutral package that deterministically generates a valid `rig-layout.json` from source-canvas annotations, a reusable skeleton template, and validated part images.

## Required work

1. Add `pipelines/rig-layout-generator` as a workspace package.
2. Define versioned Source Canvas Annotation and Skeleton Template contracts.
3. Add the reusable `male-normal-v1` template.
4. Generate all Rig Layout geometry, hierarchy, transforms, render order, sockets, and hit areas.
5. Derive anchors only from authored joints in untrimmed rectangles.
6. Derive rest poses from common source-canvas joint coordinates with positive-Y inversion.
7. Define and document stable diagnostics.
8. Validate every successful output with `@gameai/character-contracts` and `@gameai/character-asset-intake`.
9. Add Red Cap Target annotation and generated golden fixtures, invalid fixtures, deterministic tests, documentation, and a coordinate/contract ADR.

## Required diagnostics

- `TEMPLATE_PART_MISSING`
- `TEMPLATE_UNKNOWN_PART`
- `INVALID_JOINT_POSITION`
- `JOINT_OUTSIDE_PART_RECT`
- `INVALID_TRIM_METADATA`
- `SOURCE_RECT_OVERLAP_WARNING`
- `MISSING_PARENT_JOINT`
- `TEMPLATE_HIERARCHY_ERROR`
- `GENERATED_LAYOUT_INVALID`

## Acceptance criteria

- Inputs are machine-validated, versioned, and engine-neutral.
- Repeated generation and serialization are byte-for-byte deterministic.
- Exact tests prove anchor, parent-relative rest-pose, root, socket, hit-area, scale, and Y-inversion formulas.
- Trim metadata is consistent with the annotated untrimmed and trimmed rectangles and the decoded asset dimensions.
- Each required diagnostic has a targeted invalid fixture.
- Warnings are deterministic but do not invalidate an otherwise successful result.
- Successful output passes both downstream packages and includes the validated asset manifest.
- Source documents and images remain unchanged.
- `pnpm verify` passes from the repository root.
- The completed task is committed as `feat: add rig layout generator`.

## Out of scope

- Image segmentation.
- Computer-vision joint detection.
- Cocos Node or Prefab generation.
- Animation playback.
- Source-asset mutation or automatic repair.

## Completion record

- Added versioned canonical schemas and TypeScript types/parsers for Source Canvas Annotation and Skeleton Template inputs.
- Added `male-normal-v1` with the normal male hierarchy, required parts, draw order, sockets, hit areas, and eight animation target mappings.
- Anchors come from authored joints inside untrimmed rectangles; root and child rest poses, sockets, and hit areas use documented common-canvas formulas and positive-Y inversion.
- Successful generation passes Character Contract parsing and in-memory Character Asset Intake, including exact decoded-size versus trim-size checks.
- Red Cap Target has an authored annotation fixture and byte-stable generated golden Rig Layout without replacing the earlier authored layout.
- Nine invalid fixtures cover every required diagnostic, and tests prove deterministic warnings/errors, serialization, visual-center independence, and read-only behavior.
- ADR-0006 records the new contract families, compatibility, pivot authority, and coordinate conversion decision.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 56 total tests.
- No out-of-scope segmentation, computer vision, Cocos generation, playback, mutation, or repair behavior was added.

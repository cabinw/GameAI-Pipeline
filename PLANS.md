# Implementation Plans

Use this file for active multi-file or architectural work. Keep one active plan at a time.

## Completed plan: TASK-002 Character Asset Intake and Validation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral asset-intake package that safely loads a character fixture, validates its Character Rig and Rig Layout contracts, inspects referenced PNG/JPEG/WebP files, and returns a deterministic normalized asset manifest and diagnostics.

### Scope

- Add `@gameai/character-asset-intake` under `pipelines/`.
- Load `character-rig.json`, resolve its Rig Layout, and validate both through `@gameai/character-contracts`.
- Resolve referenced image paths inside a caller-selected source root without following paths outside that root.
- Decode supported image formats and validate format, dimensions, alpha, transparent content bounds, trim geometry, and duplicate references.
- Return a deterministic manifest containing contract versions, safe paths, image facts, hierarchy, transforms, draw order, sockets, and hit areas.
- Add textual and binary fixtures, one targeted invalid fixture per required diagnostic, deterministic unit tests, package documentation, and an accepted image-decoding ADR.

### Out of scope

- Auto cutting or automatic source-asset repair.
- Image generation.
- Cocos nodes, prefabs, scenes, or other engine adapters.
- Animation playback.
- Mutation or rewriting of source assets.

### Execution

1. Record TASK-002 and this active plan before implementation.
2. Select and document a maintained multi-format image decoder in an ADR.
3. Define public manifest, result, option, and stable diagnostic types.
4. Implement safe JSON/image loading, contract validation, image inspection, and deterministic normalization.
5. Add the valid fixture and one targeted invalid fixture per required diagnostic.
6. Test deterministic output, geometry relationships, safety boundaries, and read-only behavior.
7. Document APIs, diagnostics, path model, image rules, and limitations.
8. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- Valid PNG, JPEG, and WebP assets are inspected without Cocos dependencies.
- Every required invalid condition returns its stable diagnostic code.
- Trimmed dimensions satisfy `trimOffset + imageSize <= originalRect`, and `originalRect` remains bounded by `sourceCanvas` through contract validation.
- Manifest ordering and diagnostics are deterministic across repeated runs.
- Source fixtures are unchanged by intake.
- `pnpm verify` passes from the repository root.

### Result

- Added `@gameai/character-asset-intake` with safe real-path containment, contract loading, strict image decoding, geometry validation, stable diagnostics, and a plain deterministic manifest.
- Added generated Red Cap Target PNG assets plus focused PNG, JPEG, WebP, malformed, unsupported, and transparent binary fixtures.
- Added one invalid fixture for each of the ten required asset diagnostic codes and deterministic read-only tests.
- Accepted ADR-0005 selecting sharp 0.35.3 as the package-local multi-format decoder.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 41 total tests.
- No Cocos generation, auto cutting, image generation, animation playback, or source-asset repair was added.

## Completed plan: TASK-001 Character Contract Foundation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Define and validate the complete engine-neutral Character Rig and Rig Layout contracts required by the Character Rig Builder before any production scene-generation code is written.

### Scope

- Add canonical JSON Schemas for Character Rig and Rig Layout.
- Add an engine-neutral `@gameai/character-contracts` workspace package with public TypeScript types.
- Parse JSON, validate schema shape, and enforce cross-document semantic rules with stable error codes.
- Add the Red Cap Target textual golden fixture and targeted invalid fixtures.
- Document schema-version compatibility and contract coordinate conventions.
- Add deterministic unit tests and include the package in the root verification gate.

### Out of scope

- Cocos scene, node, prefab, or asset generation.
- Image segmentation and auto cutting.
- Animation clip formats or runtime animation playback.
- Binary art assets and visual regression output.

### Contract decisions

- `schemas/` is the canonical schema source; package builds copy those schemas into distributable output.
- Character Rig declares identity, its Rig Layout file, required part IDs, required animation target IDs, and target-to-part mappings.
- Rig Layout owns source-canvas geometry, trimmed-part placement, hierarchy, reference scale, draw order, sockets, and hit areas.
- File paths are relative POSIX paths and cannot be absolute or traverse above the specification directory.
- Schema compatibility is explicit SemVer: the current validator supports `>=1.0.0 <1.1.0`; newer minor or major versions fail with a stable error code.

### Execution

1. Create TASK-001 with explicit acceptance criteria.
2. Add both JSON Schemas and public TypeScript types.
3. Implement JSON parsing, schema validation, semantic validation, and stable diagnostics.
4. Add the Red Cap Target valid fixture and one invalid fixture per required semantic failure.
5. Add unit tests for schema synchronization, parsing, version compatibility, and all semantic rules.
6. Document usage, coordinates, limitations, and schema-version compatibility.
7. Run `pnpm verify`, review the complete diff, and commit TASK-001.

### Done when

- Both canonical schemas parse and compile.
- TypeScript public types and JSON Schemas are synchronized by tests.
- Every required invalid condition produces its documented stable error code.
- The Red Cap Target fixture parses and validates without errors.
- `pnpm verify` passes from the repository root.
- No production Cocos scene-generation logic is present.

### Result

- Added canonical Character Rig and Rig Layout JSON Schemas and byte-identical package build copies.
- Added the engine-neutral `@gameai/character-contracts` package with public types, Ajv parsing, semantic validation, deterministic diagnostics, and stable error codes.
- Added the Red Cap Target textual golden fixture and targeted invalid fixtures for every required failure mode.
- Added schema compatibility, coordinate-system, API, limitation, and error-code documentation plus ADR-0004.
- `pnpm verify` passes with 23 Character Contract tests and the 4 existing TASK-000 tests.
- No production Cocos scene-generation logic was added.

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

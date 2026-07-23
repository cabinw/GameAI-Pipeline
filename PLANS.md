# Implementation Plans

Use this file for active multi-file or architectural work. Keep one active plan at a time.

## Completed plan: TASK-003.2 Clean-Checkout Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Make the repository verification gate reproducible from a fresh checkout where no workspace package has prebuilt `dist` or `dist-test` declarations.

### Scope

- Change the root verification order so workspace dependencies build before repository-wide typechecking.
- Preserve topological workspace build ordering through pnpm.
- Make the GitHub Actions verification job explicitly assert that checkout-time build outputs are absent.
- Prove the documented `pnpm install --frozen-lockfile` followed by `pnpm verify` workflow succeeds without pre-existing generated directories.

### Out of scope

- Production pipeline or Cocos behavior.
- Workspace topology changes.
- Committing generated `dist` or `dist-test` output.
- New runtime dependencies.

### Execution

1. Record TASK-003.2 and this active plan before implementation.
2. Reproduce the clean-output failure and confirm the dependency ordering cause.
3. Build workspace dependencies before the repository-wide typecheck in `pnpm verify`.
4. Strengthen CI with a clean-checkout output assertion followed by frozen install and verify.
5. Remove local build outputs, run the exact clean-checkout command sequence, and confirm all 63 tests.
6. Review the diff and commit with the required subject.

### Done when

- `pnpm install --frozen-lockfile` and `pnpm verify` pass with no pre-existing workspace `dist` or `dist-test` directories.
- Workspace consumers resolve dependency declarations created by the preceding topological build.
- CI guards the clean-checkout assumption.
- All 63 tests pass and generated output remains ignored.

### Result

- Reproduced the clean-output failure as `TS2307` errors in `@gameai/character-asset-intake` before `@gameai/character-contracts/dist` existed.
- Changed the root gate to topological build → repository-wide typecheck → complete test suite.
- Added a CI assertion that the checkout contains no `dist` or `dist-test` before frozen installation and verification.
- Removed all local workspace build output and `node_modules`, then ran `pnpm install --frozen-lockfile` followed by `pnpm verify`.
- All 63 tests pass; no generated output or dependency changes are tracked.

## Completed plan: TASK-003.1 Rig Semantics and Red Cap Calibration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Correct Rig Layout semantics so every part pivot is its proximal attachment joint, explicitly represent parent-owned child attachment points, and recalibrate the Red Cap Target into an animation-ready golden fixture with a deterministic assembled preview.

### Scope

- Define `joint` as the part's proximal pivot and add named `childAttachments` as distinct parent-owned source-canvas points.
- Require each non-root part's proximal joint to coincide with its parent's attachment for that child without treating the two records as the same semantic field.
- Recalibrate Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots.
- Reject duplicate annotation `partId` values deterministically.
- Constrain normalized sockets, rectangle hit areas, and circle hit areas to the normalized part bounds.
- Regenerate the Red Cap golden Rig Layout and a deterministic assembled SVG acceptance preview.
- Update ADR-0006, schemas, public types, diagnostics, docs, and tests.

### Out of scope

- Production Cocos Scene, Node, or Prefab generation.
- Computer-vision joint detection or image segmentation.
- Animation playback or automatic animation generation.
- Source-art mutation or repair.

### Execution

1. Record TASK-003.1 and this active plan before implementation.
2. Add explicit named child-attachment data and semantic validation.
3. Add duplicate part-ID and normalized template-geometry validation.
4. Recalibrate Red Cap proximal pivots and parent-owned attachment points.
5. Regenerate the golden layout and assembled preview acceptance artifact.
6. Add exact shoulder, elbow, hip, knee, duplicate-ID, and normalized-geometry tests.
7. Update architecture and user documentation.
8. Run `pnpm verify`, review the diff, and commit the completed task.

### Done when

- Every Red Cap limb anchor is at the documented proximal joint.
- Parent child-attachment records are explicit and match, but do not replace, child proximal pivots.
- Duplicate annotation part IDs and invalid normalized template geometry fail deterministically.
- The generated golden layout and assembled SVG preview are byte-stable.
- `pnpm verify` passes and no production Cocos Scene Builder code exists.

### Result

- Made each annotation `joint` a proximal animation pivot and added distinct named parent-owned `childAttachments`.
- Added Source Annotation 1.1 explicit-attachment semantics with a tested 1.0 compatibility fallback.
- Recalibrated Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots and regenerated the Rig Layout golden.
- Added deterministic diagnostics and tests for duplicate annotation IDs, child-attachment correspondence, and bounded normalized socket/hit-area geometry.
- Added a byte-stable assembled SVG acceptance preview and changed fixture generation to preserve the authored annotation.
- Updated ADR-0006, schemas, public types, schema compatibility docs, package docs, and generator documentation.
- `CI=true pnpm verify` passes with 63 tests.
- No production Cocos Scene Builder behavior was introduced.

## Completed plan: TASK-003 Rig Layout Generator

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral generator that deterministically converts a versioned source-canvas annotation and reusable skeleton template into a valid Rig Layout, then verifies the generated contract and all referenced assets before returning success.

### Scope

- Add canonical Source Canvas Annotation and Skeleton Template JSON Schemas.
- Add `@gameai/rig-layout-generator` under `pipelines/` with parsers, public types, stable diagnostics, deterministic generation, and JSON serialization.
- Add the reusable `male-normal-v1` skeleton template.
- Derive untrimmed geometry, trim offsets, normalized joint anchors, parent-relative rest poses, hierarchy, draw order, sockets, and hit areas.
- Validate generated layouts through both `@gameai/character-contracts` and `@gameai/character-asset-intake`.
- Add a Red Cap Target annotation, generated golden layout, targeted invalid fixtures, deterministic tests, documentation, and an accepted coordinate/contract ADR.

### Out of scope

- Image segmentation or computer-vision joint detection.
- Cocos Nodes, Prefabs, Scenes, or editor generation.
- Animation playback.
- Source-image or source-annotation mutation and automatic repair.

### Coordinate decisions

- Source annotations use top-left origin, positive X right, and positive Y down.
- Every pivot is the authored joint in the untrimmed source rectangle; trimmed image centers and visual centers never determine anchors.
- Child rest position is derived from child and parent joints in the same source canvas, scaled by `referenceScale`, with source Y inverted.
- Root rest position is derived from the source-canvas center using the same conversion.
- Template socket and hit-area geometry is normalized against a parent part's untrimmed rectangle and converted to parent-local reference space.

### Execution

1. Record TASK-003 and this active plan before implementation.
2. Add and document the two canonical input contracts and compatibility rules.
3. Implement parsers, template/annotation semantic checks, formulas, diagnostics, and deterministic generation.
4. Add an in-memory asset-intake validation API and require both downstream validators before success.
5. Add `male-normal-v1`, Red Cap Target annotation/golden output, and one invalid fixture per required diagnostic.
6. Test formulas, pivot semantics, deterministic serialization, downstream validation, and source immutability.
7. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- The Red Cap annotation generates the byte-stable golden Rig Layout.
- All coordinate formulas and Y-axis inversion are documented and tested with exact values.
- Every required diagnostic is stable and covered by a fixture.
- A successful result has passed both Character Contract and Character Asset Intake validation.
- `pnpm verify` passes from the repository root.
- No out-of-scope engine, vision, playback, or repair logic is present.

### Result

- Added canonical Source Canvas Annotation and Skeleton Template schemas plus the engine-neutral `@gameai/rig-layout-generator` package.
- Added `male-normal-v1`, deterministic coordinate conversion/serialization, stable diagnostics, overlap warnings, and downstream validation through both required packages.
- Added the Red Cap Target source annotation and byte-stable generated Rig Layout golden fixture.
- Added nine targeted invalid fixtures and exact tests for anchors, root/child rest poses, Y inversion, sockets, hit areas, trim dimensions, visual-center independence, and source immutability.
- Accepted ADR-0006 for source-space joint authority and versioned generator input contracts.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 56 total tests.
- No image segmentation, vision detection, Cocos generation, animation playback, or source repair was added.

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

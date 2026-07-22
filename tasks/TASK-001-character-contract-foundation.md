# TASK-001: Character Contract Foundation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

## Goal

Define and validate the complete data contracts required by the Character Rig Builder before production scene-generation code begins.

## Required work

1. Add `schemas/character-rig.schema.json`.
2. Add `schemas/rig-layout.schema.json`.
3. Publish matching TypeScript types from an engine-neutral workspace package.
4. Implement JSON parsing, JSON Schema validation, and cross-document semantic validation.
5. Define stable, documented validation error codes.
6. Add the Red Cap Target as a textual golden fixture under `examples/`.
7. Add valid and invalid fixture tests.
8. Document `schemaVersion` compatibility and coordinate conventions.

## Required Rig Layout fields

Every part defines `partId`, `file`, `parentId`, `originalRect`, `trimOffset`, `anchor`, `restPose`, and `drawOrder`. The layout defines `sourceCanvas` and `referenceScale`.

## Required validation

- duplicate part IDs;
- missing required parts;
- unknown parents;
- parent cycles;
- invalid normalized anchors;
- invalid rectangles, including rectangles outside the source canvas;
- duplicate draw order;
- missing animation targets;
- unsupported schema versions.

## Deliverables

- Canonical JSON Schemas under `schemas/`.
- `@gameai/character-contracts` package under `framework/`.
- Red Cap Target fixtures under `examples/red-cap-target/`.
- `docs/character-contracts.md` and `docs/schema-versioning.md`.
- Passing root verification.

## Acceptance criteria

- `pnpm verify` passes from a frozen workspace install.
- The valid Red Cap Target fixture returns a typed value with no diagnostics.
- Each required invalid fixture returns its documented stable error code.
- Schema files reject malformed structural input and semantic validation rejects invalid relationships.
- Schema compatibility behavior is deterministic and documented.
- Generated schemas in package output match the canonical root schemas.
- No production Cocos scene, node, prefab, or asset-generation logic is added.

## Completion record

- Both canonical schemas compile under Ajv draft-07 validation.
- `@gameai/character-contracts` exports types, parsers, semantic validators, schemas, compatibility helpers, and stable error codes.
- The Red Cap Target fixture validates with 18 parts, three sockets, two hit areas, and eight required animation targets.
- Invalid fixtures and tests cover every required validation condition plus unsafe paths, invalid root counts, and duplicate socket, hit-area, and animation-target IDs.
- Canonical and built schema copies are checked byte-for-byte.
- `pnpm verify` passes with 27 total tests.
- No production Cocos generation logic was introduced.

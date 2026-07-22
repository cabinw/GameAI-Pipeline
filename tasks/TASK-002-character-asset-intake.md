# TASK-002: Character Asset Intake and Validation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

## Goal

Build an engine-neutral, read-only asset-intake package that loads and validates a character fixture from disk and returns a deterministic normalized manifest plus stable diagnostics.

## Required work

1. Add `pipelines/character-asset-intake` as a workspace package.
2. Load `character-rig.json`, safely resolve and load its Rig Layout, and validate both with `@gameai/character-contracts`.
3. Safely resolve every referenced image inside the selected source root.
4. Inspect PNG, JPEG, and WebP format, dimensions, alpha, and non-transparent content bounds.
5. Validate actual image dimensions against `originalRect`, `trimOffset`, and `sourceCanvas`.
6. Return a normalized `CharacterAssetManifest` containing identity, versions, paths, image facts, hierarchy, anchors, rest poses, draw order, sockets, and hit areas.
7. Define and document stable diagnostic codes.
8. Add deterministic valid and invalid textual/binary fixtures and tests.
9. Document the package and approve an ADR for the decoding dependency.

## Required diagnostics

- `ASSET_FILE_NOT_FOUND`
- `ASSET_PATH_OUTSIDE_ROOT`
- `UNSUPPORTED_IMAGE_FORMAT`
- `IMAGE_DECODE_ERROR`
- `IMAGE_DIMENSION_MISMATCH`
- `TRIM_RECT_OUT_OF_BOUNDS`
- `IMAGE_HAS_NO_ALPHA`
- `IMAGE_FULLY_TRANSPARENT`
- `IMAGE_EMPTY_CONTENT_BOUNDS`
- `DUPLICATE_ASSET_REFERENCE`

## Acceptance criteria

- The package has no Cocos Creator dependency or production scene-generation behavior.
- Contract parsing and semantic validation are delegated to `@gameai/character-contracts`.
- Path resolution rejects lexical traversal and resolved filesystem targets outside the source root.
- Intake never writes to or rewrites source fixtures.
- PNG, JPEG, and WebP metadata/decoding behavior is covered by deterministic tests.
- Each required diagnostic has a targeted invalid fixture and assertion.
- Repeated intake of the valid fixture produces deeply equal manifests and diagnostics.
- `pnpm verify` passes from the repository root.
- The completed task is committed as `feat: add character asset intake validation`.

## Out of scope

- Auto cutting.
- Image generation.
- Cocos Node or Prefab generation.
- Animation playback.
- Automatic source-asset repair.

## Completion record

- `@gameai/character-asset-intake` loads the Character Rig, resolves its Rig Layout, delegates contract validation, confines all real paths to the selected root, and inspects PNG/JPEG/WebP bytes with sharp 0.35.3.
- The normalized manifest contains identity, schema versions, safe paths, decoded image facts, content bounds, hierarchy, anchors, rest poses, draw order, sockets, and hit areas.
- Actual image dimensions and trim placement are validated against `originalRect`; the contract layer validates `originalRect` against `sourceCanvas`.
- Red Cap Target now includes 18 deterministic alpha PNG assets. Focused binary fixtures cover WebP, JPEG without alpha, malformed data, unsupported decoded format, dimension mismatch, and transparent content.
- Ten invalid fixture descriptors cover every required asset diagnostic; repeated intake and source hashes prove deterministic, read-only behavior.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 41 total tests.
- No out-of-scope generation, engine integration, playback, or repair behavior was added.

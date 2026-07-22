# ADR-0005: Use sharp for character image inspection

- Status: Accepted
- Date: 2026-07-23

## Context

Character asset intake must inspect PNG, JPEG, and WebP dimensions, alpha-channel presence, decoded transparency, and non-transparent pixel bounds. Header-only metadata libraries cannot prove that pixels decode successfully or calculate alpha content bounds. Maintaining separate pure-JavaScript decoders for each format would widen the dependency surface and create inconsistent error behavior.

## Decision

Use `sharp` 0.35.3 as the single image metadata and decoding dependency of `@gameai/character-asset-intake`.

- Decode from an in-memory buffer with strict error handling.
- Use metadata for format, dimensions, and declared alpha-channel presence.
- Decode a raw RGBA buffer to calculate non-transparent content bounds deterministically.
- Accept only PNG, JPEG, and WebP even if the underlying decoder supports additional formats.
- Keep all sharp types and values inside the engine-neutral pipeline package; manifests expose only plain data.
- Never invoke mutating or output-writing sharp operations against source assets.

## Consequences

- One maintained, cross-platform dependency covers all required formats and pixel inspection behavior.
- Prebuilt native binaries increase installation size compared with header-only metadata readers.
- Supported Node/platform combinations must have a sharp prebuild or a compatible native build toolchain.
- Decoder upgrades require fixture verification because metadata and malformed-file diagnostics may change.
- Cocos Creator remains absent from the package dependency graph.

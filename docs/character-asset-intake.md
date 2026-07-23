# Character Asset Intake

TASK-002 adds `@gameai/character-asset-intake`, the read-only `Validate → Normalize` stage between authored Character Contracts and future engine adapters.

## Input and resolution model

`intakeCharacterAssets({ sourceRoot, characterRigFile })` performs these steps in order:

1. Resolve the real filesystem identity of `sourceRoot`.
2. Resolve `characterRigFile` inside that root; the default is `character-rig.json`.
3. Parse the Character Rig with `@gameai/character-contracts`.
4. Resolve `rigLayoutFile` relative to the Character Rig file and validate the combined contract.
5. Resolve every part image relative to the Rig Layout file.
6. Reject both lexical paths and followed filesystem links that leave `sourceRoot`.
7. Inspect all safely resolved images and build a manifest only when no diagnostics remain.

`validateCharacterAssetDocuments({ sourceRoot, characterRig, rigLayout, ...paths })` performs the same contract, safe-path, image, geometry, and manifest validation for already parsed in-memory documents. TASK-003 uses this API to verify a generated Rig Layout without writing it into the source fixture first.

Missing paths and path escapes stop the affected load. Contract diagnostics retain the stable code exported by `@gameai/character-contracts`. All diagnostics are sorted by path, part ID, code, and message.

## Image rules

The package decodes bytes instead of trusting file extensions. PNG, JPEG, and WebP are the only accepted decoded formats. A malformed supported file produces `IMAGE_DECODE_ERROR`; a valid image in another format produces `UNSUPPORTED_IMAGE_FORMAT`.

Character sprites must include an alpha channel. Alpha-bearing images are decoded to raw RGBA and scanned in row-major order. The inclusive union of pixels whose alpha is greater than zero becomes `contentBounds`. A fully transparent image emits both `IMAGE_FULLY_TRANSPARENT` and `IMAGE_EMPTY_CONTENT_BOUNDS`, because the image has no usable visible content or normalized bounds. JPEG metadata and pixels are inspected, but JPEG normally emits `IMAGE_HAS_NO_ALPHA` and therefore cannot produce a valid sprite manifest.

The normalized part also records `hasTransparency` and
`transparentPixelCount`. `hasAlpha` describes whether the decoded format has
an alpha channel; `hasTransparency` proves that at least one decoded pixel is
not fully opaque. This distinction lets real-art intake tests reject
accidentally flattened PNGs without changing the existing alpha-channel
contract.

For each part:

```text
image.width  <= originalRect.width
image.height <= originalRect.height
trimOffset.x + image.width  <= originalRect.width
trimOffset.y + image.height <= originalRect.height
```

An image larger than its untrimmed rectangle emits `IMAGE_DIMENSION_MISMATCH`. An otherwise valid image whose offset placement crosses the rectangle emits `TRIM_RECT_OUT_OF_BOUNDS`. The Character Contract validator separately proves that `originalRect` lies inside `sourceCanvas`, so the checks together establish the full source-canvas relationship.

## Normalized manifest

A successful `CharacterAssetManifest` contains:

- `characterId` and both contract schema versions;
- the real source root plus safe source-relative and resolved contract/image paths;
- source canvas, reference scale, and draw-order policy;
- source-order parts with format, decoded width/height, alpha-channel and
  transparency state, transparent-pixel count, content bounds, hierarchy,
  original rectangle, trim offset, anchor, rest pose, and draw order;
- cloned sockets and hit areas.

Part array order is the authored Rig Layout order. This preserves the specified secondary ordering when `drawOrderPolicy` is `shared`. Repeated reads of unchanged inputs return deeply equal manifests.

## Stable asset diagnostics

| Code | Meaning |
| --- | --- |
| `ASSET_FILE_NOT_FOUND` | A contract or referenced image cannot be resolved/read. |
| `ASSET_PATH_OUTSIDE_ROOT` | A lexical path or followed filesystem link leaves `sourceRoot`. |
| `UNSUPPORTED_IMAGE_FORMAT` | Decoded bytes are not PNG, JPEG, or WebP. |
| `IMAGE_DECODE_ERROR` | Image metadata or pixels cannot be decoded consistently. |
| `IMAGE_DIMENSION_MISMATCH` | Decoded dimensions exceed `originalRect`. |
| `TRIM_RECT_OUT_OF_BOUNDS` | `trimOffset` plus decoded size leaves `originalRect`. |
| `IMAGE_HAS_NO_ALPHA` | The decoded sprite declares no alpha channel. |
| `IMAGE_FULLY_TRANSPARENT` | Every decoded alpha value is zero. |
| `IMAGE_EMPTY_CONTENT_BOUNDS` | No non-transparent content rectangle can be calculated. |
| `DUPLICATE_ASSET_REFERENCE` | More than one part resolves to the same real image path. |

Code strings are public compatibility surface for the package's `0.1.x` line. Messages and details are explanatory and must not be parsed by consumers.

## Limitations

- No source file is written, normalized in place, cut, repaired, or generated.
- SVG, GIF, animated images, color-profile normalization, and orientation rewriting are unsupported.
- No Cocos Node, Sprite, Prefab, Scene, UUID, or import metadata is produced.
- Animation playback and generation begin in later tasks.

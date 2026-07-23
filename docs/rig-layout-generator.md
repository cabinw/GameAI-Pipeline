# Rig Layout Generator

TASK-003 adds `@gameai/rig-layout-generator`, an engine-neutral `Normalize → Generate → Verify` stage. Its inputs are authored data and existing part images; its output is plain Rig Layout JSON plus the validated asset manifest.

## Input contracts

The canonical schemas are:

- `schemas/source-canvas-annotation.schema.json`
- `schemas/skeleton-template.schema.json`

Both require strict SemVer and initially support `>=1.0.0 <1.1.0`. Canonical schemas are copied byte-for-byte into the package build and checked by tests.

### Source Canvas Annotation

An annotation declares identity, `sourceCanvas`, optional generation overrides, and parts. Each part contains:

- `partId` and safe relative image `file`;
- exactly one of `sourceRect` or the equivalent `originalRect`;
- exactly one of absolute-canvas `trimmedRect` or `{ offset, size }` trim metadata;
- an authored `joint` in common source-canvas coordinates;
- optional descriptive `visualCenter`;
- optional parent, draw-order, rotation, scale, and opacity overrides.

`visualCenter` is never a pivot input. Parent and draw-order overrides are required for additional parts not declared in a template when `additionalPartPolicy` is `allow-with-overrides`.

### Skeleton Template

A template declares:

- `templateId`, default `referenceScale`, and draw-order/additional-part policies;
- required part IDs;
- default parent hierarchy and draw order;
- optional sockets and hit areas normalized against untrimmed parent rectangles;
- animation target mappings.

The first template is `male-normal-v1`, exported as `maleNormalV1` and stored under `pipelines/rig-layout-generator/templates/`.

## Coordinate formulas

Source canvas coordinates use top-left origin, positive X right, and positive Y down. Rig reference coordinates use positive X right and positive Y up. Calculated values are rounded to six decimal places and negative zero is normalized to zero.

For an untrimmed rectangle `R`, authored joint `J`, parent joint `P`, canvas size `C`, and reference scale `s`:

```text
anchor.x = (J.x - R.x) / R.width
anchor.y = (J.y - R.y) / R.height

child.position.x = (J.x - P.x) * s
child.position.y = (P.y - J.y) * s

root.position.x = (J.x - C.width / 2) * s
root.position.y = (C.height / 2 - J.y) * s
```

The anchor always uses `originalRect`, never `trimmedRect`, decoded image dimensions, a trimmed-image center, or `visualCenter`. Every child-parent delta uses two joints from the same source canvas; independently cropped coordinate systems are never mixed.

Trim conversion is:

```text
trimOffset.x = trimmedRect.x - originalRect.x
trimOffset.y = trimmedRect.y - originalRect.y
```

The decoded asset must exactly match annotated trim width and height. It must also satisfy the Asset Intake bounds rules.

### Template sockets

For normalized socket point `N` on parent rectangle `R`:

```text
S.x = R.x + N.x * R.width
S.y = R.y + N.y * R.height

socket.x = (S.x - J.x) * s
socket.y = (J.y - S.y) * s
```

### Template hit areas

Normalized rectangle shapes use a top-left normalized position and normalized size. The generated rectangle uses a parent-local lower-left reference-space origin:

```text
left   = R.x + shape.x * R.width
bottom = R.y + (shape.y + shape.height) * R.height

x      = (left - J.x) * s
y      = (J.y - bottom) * s
width  = shape.width * R.width * s
height = shape.height * R.height * s
```

Circle centers use the socket point conversion. Circle radius is `normalizedRadius * min(R.width, R.height) * s`.

## Generation and verification

`generateRigLayout`:

1. parses both input contracts;
2. fails closed on unsupported versions;
3. validates template hierarchy and annotation semantics;
4. emits deterministic overlap warnings when requested;
5. orders template parts by template order and additional parts by `partId`;
6. derives the Rig Layout and stable JSON serialization;
7. parses the output with `@gameai/character-contracts`;
8. checks template animation mappings against the Character Rig;
9. validates the in-memory documents and referenced images with `@gameai/character-asset-intake`;
10. verifies decoded dimensions equal the annotated trimmed size.

The Red Cap fixtures are `examples/red-cap-target/source-annotation.json` and `examples/red-cap-target/rig-layout.generated.json`. The generated file remains separate from the authored `rig-layout.json` used by earlier tasks.

## Stable diagnostics

| Code | Severity | Meaning |
| --- | --- | --- |
| `TEMPLATE_PART_MISSING` | Error | A required template part has no annotation. |
| `TEMPLATE_UNKNOWN_PART` | Error | An annotation part is not defined or completely overridden. |
| `INVALID_JOINT_POSITION` | Error | A joint lies outside `sourceCanvas`. |
| `JOINT_OUTSIDE_PART_RECT` | Error | A joint lies outside its untrimmed part rectangle. |
| `INVALID_TRIM_METADATA` | Error | Trim placement is invalid or decoded dimensions differ. |
| `SOURCE_RECT_OVERLAP_WARNING` | Warning | Two annotated untrimmed rectangles overlap while warning policy is enabled. |
| `MISSING_PARENT_JOINT` | Error | A part cannot derive a parent delta because its parent lacks an annotation. |
| `TEMPLATE_HIERARCHY_ERROR` | Error | Template roots, parents, cycles, or referenced template parts are invalid. |
| `GENERATED_LAYOUT_INVALID` | Error | A downstream Character Contract or Asset Intake check failed. |

Structural input failures additionally use `ANNOTATION_SCHEMA_INVALID` or `TEMPLATE_SCHEMA_INVALID`; unsupported annotation/template minors use `UNSUPPORTED_GENERATOR_SCHEMA_VERSION`. Code strings are public compatibility surface for the package's `0.1.x` line.

## Limitations

- Annotation joints are mandatory; no segmentation or computer-vision detection is performed.
- The package does not generate or mutate source images or annotations.
- No Cocos Node, Sprite, Prefab, Scene, UUID, or import metadata is produced.
- Animation targets are mapped and checked, but animation playback is not implemented.

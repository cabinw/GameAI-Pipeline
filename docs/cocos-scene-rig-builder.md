# Cocos Scene Rig Builder

## Purpose

The Character Rig Builder is the first production editor adapter for the
engine-neutral Character Pipeline. It consumes validated Character Rig data,
the Rig Layout generated from a source annotation and `male-normal-v1`, and
the normalized asset manifest. It does not add animation playback, animation
generation, auto cutting, or production-game integration.

## Validation and mutation boundary

The extension Main Process:

1. Reads `character-rig.json` and the source annotation from a source root
   contained by the Cocos project's `assets` directory.
2. Audits an explicit `source-asset-map.json`: every annotation part must map
   one-to-one to an existing safe import path and unexpected PNGs fail closed.
3. Parses the Character Rig with `@gameai/character-contracts`.
4. Generates the Rig Layout with `@gameai/rig-layout-generator`.
5. Receives the already decoded and validated asset manifest produced through
   `@gameai/character-asset-intake`.
6. Resolves every imported image and SpriteFrame subasset through AssetDB.
7. Creates a deterministic, JSON-serializable scene plan.

Only that scene plan crosses into the Scene Script. Therefore a contract,
layout, image, or AssetDB failure cannot create scene nodes.

## Joint and visual nodes

Each part has exactly two functional nodes:

```text
Joint_<partId>
└── Visual_<partId>
```

The Joint owns the generated parent hierarchy, parent-relative rest position,
rotation, scale, and proximal animation pivot. The Visual owns only the
Sprite, center anchor, decoded trimmed size, opacity, trim compensation, and
global render order.

For an intake manifest part, the original-source joint is recovered from the
normalized anchor:

```text
joint.x = originalRect.x + anchor.x * originalRect.width
joint.y = originalRect.y + anchor.y * originalRect.height
```

Visual placement then follows:

```text
trimmedCenter.x =
  originalRect.x + trimOffset.x + decodedWidth / 2

trimmedCenter.y =
  originalRect.y + trimOffset.y + decodedHeight / 2

visualOffset.x =
  (trimmedCenter.x - joint.x) * referenceScale

visualOffset.y =
  (joint.y - trimmedCenter.y) * referenceScale
```

`UITransform` remains anchored at `(0.5, 0.5)`. Its content size is the decoded
trimmed image size multiplied by `referenceScale`; the untrimmed normalized
anchor is never assigned to the trimmed Sprite.

## Draw order

Parts are ordered by authored `drawOrder`, with `partId` as the deterministic
tie-breaker for templates that allow shared values. Each Visual receives a
unique zero-based `Sorting2D.sortingOrder`. This is a global render-order
policy and remains stable when parts belong to different Joint branches.

## AssetDB and UUIDs

The Main Process maps each safe manifest path to a `db://assets/...` URL and
asks AssetDB for the imported image and SpriteFrame subasset. Only UUIDs
returned by AssetDB enter the scene plan. The extension neither reads `.meta`
files nor generates or guesses UUID values.

The Scene Script preloads all SpriteFrames using their UUIDs before inspecting
or changing the live generated root.

## World-space 2D rendering

Generated Character Rigs are world-space 2D content. `CHR_<characterId>` owns
a `RenderRoot2D`, and every generated descendant—including RigRoot, Joint,
Visual, socket, hit-area, marker, and metadata nodes—uses `UI_3D`.

Before replacement begins, the Scene Script requires an active scene Camera
whose visibility mask contains `UI_3D`. It does not create, move, rotate, or
change the visibility of any camera. The detached generated tree and the
attached replacement are both verified for:

- a generated `RenderRoot2D`;
- Visual ancestry below that render root;
- non-null SpriteFrames and non-zero UITransform sizes;
- one consistent generated layer; and
- a compatible active camera.

The acceptance scene owns its fixture-specific orthographic camera
configuration. The project also includes the `sorting-2d` engine feature so
the saved `Sorting2D` components deserialize in Web Preview.

## Idempotence and failure safety

Generation is limited to `CHR_<characterId>`; for example,
`red-cap-target-remade` becomes `CHR_red_cap_target_remade`. A replacement is
allowed only when the exact root also contains `__GameAI_Generated__`.

- No matching root: attach the new detached tree.
- One marked matching root: detach it, attach the replacement, then destroy the
  old tree.
- Unmarked name collision: fail with `GENERATED_ROOT_CONFLICT`.
- Multiple matching roots: fail with `GENERATED_ROOT_AMBIGUOUS`.
- Attachment failure: restore the previous root.

Unrelated scene roots are counted before and after mutation and must remain
unchanged. Running generation repeatedly replaces one character root rather
than duplicating it.

## Stable diagnostics

The adapter defines stable codes for invalid requests, unsafe source roots,
contract or layout-generation failures, missing AssetDB assets or SpriteFrames,
correlation mismatch, unavailable scenes, unsafe root replacement, SpriteFrame
load failure, missing RenderRoot2D, invalid generated visuals, layer mismatch,
no compatible camera, invalid source-art mappings, missing or ambiguous mapped
parts, unexpected PNGs, and unexpected scene-generation failure. A single
`correlationId` is preserved from Panel through evidence.

# Character Contracts

TASK-001 defines the engine-neutral inputs that a future Character Rig Builder may consume. These contracts describe data only; they do not create Cocos nodes, prefabs, assets, or scenes.

## Contract files

- `schemas/character-rig.schema.json` describes character identity, the Rig Layout reference, required part IDs, and named animation target bindings.
- `schemas/rig-layout.schema.json` describes source geometry, the rigid part hierarchy, rest pose, draw order, sockets, and hit areas.
- `examples/red-cap-target/` is the first textual golden fixture.
- `@gameai/character-contracts` exports matching TypeScript types, parsers, canonical schema objects, semantic validators, and stable diagnostics.

The root `schemas/` directory is the authored source of truth. Package builds copy the files byte-for-byte into `dist/schemas/`; tests reject drift.

## Character Rig

The Character Rig document contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Contract SemVer checked before semantic processing. |
| `characterId` | Stable lower-kebab-case character identity. |
| `displayName` | Optional human-readable label. |
| `rigLayoutFile` | Safe relative POSIX path to the matching Rig Layout JSON. |
| `requiredParts` | Part IDs that the referenced layout must contain. |
| `requiredAnimationTargets` | Named animation channels that must have bindings. |
| `animationTargets` | Mapping from stable animation target IDs to concrete layout part IDs. |

Animation targets decouple future animation data from artwork-specific part naming. A required target without a mapping, or a mapping to a missing part, produces `MISSING_ANIMATION_TARGET`.

## Rig Layout

The Rig Layout document contains `sourceCanvas`, `referenceScale`, an explicit `drawOrderPolicy`, and one or more parts. It may also contain sockets and hit areas.

`visualPlacementMode` is optional in Rig Layout 1.0. `trimmed-pixels` is the
default and places decoded pixels from `trimOffset`. `source-canvas-rect`
declares that each `originalRect` is the calibrated assembled rectangle on the
common canvas; decoded pixels are scaled to that rectangle and `trimOffset`
must be zero so crop placement is not applied twice.

Every part contains all fields required by TASK-001:

| Field | Meaning |
| --- | --- |
| `partId` | Stable lower-kebab-case ID, unique within the layout. |
| `file` | Safe relative POSIX path to a PNG, JPEG, or WebP part image. |
| `parentId` | Parent part ID or `null` for the single hierarchy root. |
| `originalRect` | Untrimmed part bounds in source-canvas pixels. |
| `trimOffset` | Top-left offset of the trimmed image within `originalRect`. |
| `anchor` | Normalized pivot in the untrimmed part, with both axes in `[0, 1]`. |
| `restPose` | Position, rotation, scale, and opacity relative to the parent. |
| `drawOrder` | Integer render order interpreted using `drawOrderPolicy`. |

### Coordinate conventions

- Source image and rectangle values use pixels.
- `sourceCanvas` origin is the top-left; positive source `x` points right and positive source `y` points down.
- `originalRect` must have positive integer dimensions and fit entirely inside `sourceCanvas`.
- `trimOffset` uses the `originalRect` top-left as its origin. Both components are non-negative and must remain inside the original rectangle.
- `anchor` is normalized over the untrimmed `originalRect`: `(0, 0)` is top-left and `(1, 1)` is bottom-right.
- Rest-pose positions and socket positions use reference units with positive `x` right and positive `y` up. Convert a source-pixel distance to reference units by multiplying by `referenceScale` and invert the source Y direction when deriving a rest-pose vector.
- Exact source-canvas reconstruction centers source coordinates, flips Y, and
  applies `referenceScale` exactly once. Joint locals are child/parent
  world-pivot differences; Visual locals are assembled-rectangle-center/world-
  pivot differences.
- `rotationDegrees` is counter-clockwise in reference space.
- Rest-pose scale components are non-zero; negative values intentionally mirror a part.
- Opacity is normalized to `[0, 1]`.

The trimmed image's actual pixel dimensions come from the referenced asset and will be checked by the later asset-validation stage. TASK-001 validates the authored rectangle and offset without reading binary image files.

### Hierarchy and render order

A layout must have exactly one part whose `parentId` is `null`. All other parents must exist, and the directed parent graph must be acyclic.

`drawOrderPolicy: "unique"` rejects duplicate draw-order values. `"shared"` permits equal values for consumers that provide a deterministic secondary ordering. Consumers must preserve source array order as that secondary ordering; they must not depend on object-map iteration.

### Sockets and hit areas

Socket and hit-area IDs are unique within their collections. Each references an existing parent part. Hit areas support reference-space rectangles and circles. They are descriptive inputs only; engine-specific collider creation is outside TASK-001.

## Parser API

```ts
import {
  parseCharacterContract,
  parseCharacterRig,
  parseRigLayout,
} from "@gameai/character-contracts";

const result = parseCharacterContract(characterRigJson, rigLayoutJson);
if (!result.ok) {
  for (const error of result.errors) {
    console.error(error.code, error.document, error.path, error.message);
  }
} else {
  const { characterRig, rigLayout } = result.value;
}
```

Parsers never return partially typed documents. JSON and shape validation must succeed before semantic validation runs. Cross-document validation runs only after both documents are individually valid. Diagnostics are deterministically sorted.

## Stable validation error codes

Error-code string values are public compatibility surface. Messages and `details` may become more descriptive without a schema-major change; consumers should branch on `code`, not message text.

| Code | Meaning |
| --- | --- |
| `JSON_PARSE_ERROR` | Input is not valid JSON. |
| `SCHEMA_VALIDATION_ERROR` | JSON does not satisfy a structural rule without a more specific code. |
| `UNSUPPORTED_SCHEMA_VERSION` | `schemaVersion` is outside the implemented range. |
| `INVALID_FILE_PATH` | A path is absolute, uses backslashes, traverses upward, or has an unsupported extension. |
| `DUPLICATE_PART_ID` | Two or more parts use the same `partId`. |
| `MISSING_REQUIRED_PART` | A Character Rig required part is absent from the layout. |
| `UNKNOWN_PARENT` | A part, socket, or hit area references a missing parent. |
| `INVALID_ROOT_COUNT` | The layout does not contain exactly one root. |
| `PARENT_CYCLE` | The part-parent graph contains a cycle. |
| `INVALID_NORMALIZED_ANCHOR` | An anchor component is outside `[0, 1]`. |
| `INVALID_RECTANGLE` | Source geometry, trim geometry, or a hit shape has invalid bounds. |
| `DUPLICATE_DRAW_ORDER` | A duplicate occurs while `drawOrderPolicy` is `unique`. |
| `DUPLICATE_SOCKET_ID` | Socket IDs are not unique. |
| `DUPLICATE_HIT_AREA_ID` | Hit-area IDs are not unique. |
| `DUPLICATE_ANIMATION_TARGET_ID` | Animation target IDs are not unique. |
| `MISSING_ANIMATION_TARGET` | A required target has no binding or its bound part is missing. |

## Deliberate limitations

- Referenced image and JSON files are not opened or checked for existence in TASK-001.
- Rig animation clips are a separate TASK-005 contract documented in
  `docs/rig-animation.md`; Character Rig retains only stable target bindings.
- No Cocos-specific UUID, `Node`, `Sprite`, prefab, scene, or component data is allowed in these schemas.
- Mesh deformation, IK, Spine, and DragonBones remain outside the MVP contract.

# Data-Driven Rig Animation

TASK-005 adds a versioned, engine-neutral animation contract and a thin Cocos
playback adapter. Animation remains data:

```text
animation preset JSON
→ schema and semantic validation
→ normalized animation
→ pure absolute-time sampling
→ rest-pose composition
→ Joint node transforms
```

## Contract and compatibility

The canonical schema is `schemas/rig-animation.schema.json`.
`@gameai/rig-animation` exports its TypeScript types, parser, semantic
validator, normalizer, pure sampler, and playback clock. The implemented
schema range is:

```text
>=1.0.0 <1.1.0
```

An animation identifies its compatible Rig Layout by stable `rigId` and
`schemaVersion`. Both rig identity and the implemented major/minor version
must match the selected validated layout. Animation targets are stable
`jointId` values; Cocos node UUIDs are neither accepted nor stored.

The 1.0 contract supports position, rotation, and scale tracks. Opacity is
deliberately omitted because it belongs to the calibrated Visual/render
boundary in the current rigid-sprite architecture.

## Coordinates and rest-pose semantics

- Rotation offsets are counter-clockwise degrees in rig reference space.
- Position values are additive parent-space offsets in reference units.
- Rotation values are additive offsets from generated rest rotation.
- Scale values are component-wise multipliers of generated rest scale.
- A missing property track means identity offset: position `(0,0)`, rotation
  `0`, or scale `(1,1)`.

For each absolute sample:

```text
position = rest.position + offset.position
rotation = rest.rotationDegrees + offset.rotationDegrees
scale    = rest.scale × offset.scale
```

The sampler never reads a previous frame. Loop time is canonicalized to
`[0,duration)`, so sampling the exact duration equals time zero. Looped tracks
must start at `0`, end at `duration`, and repeat the same endpoint value.
This prevents drift and visible boundary jumps.

## Hierarchy and world-transform evaluation

TASK-007 adds pure 2D hierarchy evaluation without changing the Rig Animation
contract. A `RigHierarchyJoint` contains only a stable `jointId`, `parentId`,
and local rest pose. `validateRigHierarchy` rejects duplicate joints, unknown
parents, invalid root counts, parent cycles, and non-finite/zero-scale rest
transforms before evaluation.

`evaluateRigPose` composes each sampled rest-relative local pose into a
deterministic affine matrix:

```text
local = translate(position) × rotate(rotationDegrees) × scale(scale)
world = parentWorld × local
```

The joint origin is its proximal pivot. Its `worldPivot` is therefore the
translation column of the evaluated world matrix; rotating the joint keeps
that pivot fixed while moving descendants. Negative scale is preserved in the
matrix so reflected limbs use the same evaluation path. Public matrices,
pivots, and composed poses are rounded to six decimal places, matching clip
sampling determinism.

## Interpolation

Version 1.0 supports `linear` and `step` interpolation plus `linear`,
`ease-in-sine`, `ease-out-sine`, and `ease-in-out-sine` easing. Easing belongs
to the left keyframe's outgoing segment. Normalization sorts tracks by
`jointId` and property and rounds public sampled values to six decimal places.

## Stable diagnostics

The package publishes:

- `ANIMATION_JSON_PARSE_ERROR`
- `ANIMATION_SCHEMA_VALIDATION_ERROR`
- `UNSUPPORTED_ANIMATION_SCHEMA_VERSION`
- `INCOMPATIBLE_ANIMATION_RIG_VERSION`
- `ANIMATION_JOINT_TARGET_MISSING`
- `DUPLICATE_ANIMATION_TRACK`
- `INVALID_ANIMATION_DURATION`
- `KEYFRAME_OUTSIDE_ANIMATION_DURATION`
- `NON_MONOTONIC_KEYFRAME_TIME`
- `NON_FINITE_ANIMATION_VALUE`
- `INVALID_ANIMATION_INTERPOLATION`
- `INVALID_ANIMATION_EASING`
- `MALFORMED_ANIMATION_VECTOR`
- `ANIMATION_LOOP_DISCONTINUITY`

Consumers branch on codes, not human-readable messages.

## Red Cap idle

`examples/red-cap-target-remade/animations/idle-subtle.json` is a two-second
seamless loop. It contains a small torso translation/scale pulse, a
`0.8°` head motion, and sub-degree upper-arm motion. Feet are intentionally
untracked. The briefcase has no independent track and follows the
`briefcase → hand-right → forearm-right → upper-arm-right` hierarchy.

`idle-sampled-evidence.json` records deterministic poses at 0, 0.5, 1, 1.5,
and 2 seconds, loop/rest invariants, and a digest of untouched Visual
calibration inputs.

## Cocos runtime

Builder Main parses and validates the preset against the generated layout,
normalizes it, and resolves the JSON through AssetDB before requesting any
scene mutation. Scene Script receives normalized data only and attaches
`GameAIRigAnimationPlayer` to the generated character root.

The component resolves `Joint_<jointId>`, captures exact local rest transforms,
and exposes `play`, `pause`, `stop`, `reset`, and `seek`. It applies sampled
absolute poses only to Joint nodes. It never changes Visual position,
SpriteFrame, size, opacity, or `Sorting2D`.

Creator imports the dedicated side-effect-free
`dist/runtime-esm/runtime.js` entry. The package's Node entry retains schema
loading, parsing, semantic validation, and Ajv; those Node-only facilities are
never bundled into the scene runtime.

The real Creator acceptance procedure and evidence are recorded in
`docs/acceptance/TASK-005-red-cap-idle.md`.

## Current limitations

- One animation plays at a time; there is no blending, state machine, IK,
  retargeting, or walk cycle.
- TASK-006 adds neutral-hidden shoulder, elbow, wrist, hip, knee, and ankle
  overlaps with fixed bidirectional stress evidence. The TASK-005 idle remains
  unchanged; Walk, Hit, blending, and state-machine behavior are still absent.
- Runtime validation assumes Main supplied normalized, already validated data;
  Scene Script does not duplicate JSON-contract parsing.
- The TASK-007 walk cycle is a minimal in-place articulation reference, not a
  production locomotion system; it adds no root motion, foot locking, IK,
  blending, or state machine.

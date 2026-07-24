# ADR-0012: Contract-Driven Rigid Attachments

- Status: Accepted
- Date: 2026-07-24

## Context

Rigid sprite characters need optional headwear, face accessories, weapons, and
effects without adding item-specific branches to the rig evaluator or hidden
placement constants to an engine scene. Folding optional artwork into Rig
Layout would also force otherwise identical body rigs and animation clips to
be duplicated for every equipment combination.

## Decision

- Add an engine-independent Attachment Layout contract that binds explicitly
  to one compatible Rig Layout identity and version.
- Slots identify a parent part and carry a parent-local transform plus default
  enabled state.
- Attachments identify a slot, safe PNG path, slot-local transform, normalized
  anchor, global draw order, and optional `back` or `front` layer role.
- Slot resolution, state overrides, transform composition, and deterministic
  ordering remain generic core operations.
- The attachment document is optional. A Character Rig and Rig Layout remain
  valid without one.
- Attachment draw order shares the base rig's numeric ordering domain. Engine
  adapters may normalize fractional contract values into stable integer
  renderer priorities while preserving the total order.
- Engine adapters construct slot and attachment nodes from the resolved plan;
  they must not compensate individual artwork with scene constants.

## Consequences

- One accepted body rig and animation set can support multiple independently
  enabled accessory combinations.
- Parent motion, including head translation, rotation, and scale, propagates
  through ordinary transform composition with no second animation runtime.
- Front/back occlusion is inspectable in authored data and stable while
  animated.
- The initial contract models rigid attachments only. Automatic fitting,
  meshes, deformers, IK, facial animation, and cross-engine compilation remain
  future work.

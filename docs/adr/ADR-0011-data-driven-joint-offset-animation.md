# ADR-0011: Data-Driven Joint-Offset Animation

- Status: Accepted
- Date: 2026-07-23

## Context

The generated rigid Sprite rig separates proximal transforms on `Joint_*`
nodes from calibrated render placement on `Visual_*` children. Animation must
preserve that separation, remain engine-neutral until playback, and avoid
frame-to-frame drift.

## Decision

- Add a versioned engine-neutral Rig Animation contract addressed by stable
  `jointId`, never Cocos node or asset UUID.
- Rotation values are counter-clockwise degrees in rig reference space.
- Animation values are offsets from immutable rest pose:
  position and rotation combine additively; scale combines by component-wise
  multiplication.
- Every sample is evaluated directly from normalized keyframes at absolute
  clip time. Runtime code never accumulates prior-frame deltas.
- Loop time is canonicalized into `[0, duration)`. Seamless looping requires
  matching first/last values for every looped track.
- Linear and step interpolation are supported in the MVP. Easing transforms
  the normalized segment fraction before interpolation.
- Engine-neutral parsing, compatibility checks, target validation,
  normalization, and sampling run before Cocos scene mutation.
- Publish a side-effect-free ESM runtime entry in addition to the package's
  CommonJS Node entry. Cocos Creator imports only that runtime entry; schema
  loading, Ajv, filesystem access, and Node-only parser code remain outside
  the engine bundle.
- Cocos playback applies samples only to generated `Joint_*` nodes. Visual
  transform calibration, SpriteFrames, opacity, and draw order are immutable
  animation boundaries.

## Consequences

- The same preset and sampler can drive another engine adapter.
- Playback is deterministic for a given absolute time and independent of
  frame rate.
- Stop/reset can restore exact rest transforms without reconstructing the rig.
- Briefcase motion normally comes from parent-hand hierarchy and needs no
  duplicate animation track.
- The package build emits both Node declarations/validation code and the small
  Creator-compatible ESM sampler without adding a second implementation.
- Blending, state machines, IK, events, and animation-authoring tools remain
  future work.

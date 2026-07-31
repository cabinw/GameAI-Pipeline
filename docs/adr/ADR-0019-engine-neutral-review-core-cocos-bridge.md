# ADR-0019 — Engine-Neutral Review Core with Cocos Bridge

- Status: Accepted
- Date: 2026-07-31

## Context

Animation review needs deterministic analysis and state that AI agents,
humans, local tools, and future engine adapters can share. Cocos Creator must
still be the authority for its live Scene/runtime state. Putting review rules
inside a Cocos component would make the contract unavailable to standalone
tools and future adapters; putting Cocos runtime inference in the core would
break engine neutrality.

## Decision

Create an engine-neutral `@gameai/animation-review-core` package and a
separate versioned Engine Adapter Protocol.

The core owns JSON Schema parsing, stable diagnostics, metrics, findings,
checklist, Review, Session, Patch, Validation and Diagnosis revisions,
assistant-provider validation, six-kind Patch transitions, deterministic
serialization, undo/redo, and exact reset. It operates on portable IDs,
numbers, arrays, records, animation tracks, and 2D affine transforms.

The Cocos bridge lives under the existing Creator extension/runtime boundary.
It validates portable requests, locates an explicitly supported live runtime,
invokes real runtime operations, and returns a portable snapshot. No Cocos
object or identifier crosses the protocol.

Creator Scene Script execution is outside the normal Component lifecycle in
edit mode. The bridge therefore hydrates the accepted SpriteFrame through
AssetDB, calls the runtime's existing public rebuild boundary once when no
runtime root exists, and owns one `WeakMap`-deduplicated editor tick per live
Component. The tick is removed when the Component or Scene becomes inactive.
Loop clocks are normalized only in the returned JSON snapshot; the accepted
runtime and its monotonic playback state remain unchanged.

```text
review core types/state
        ↑
adapter request/response JSON
        ↑
Cocos extension Scene bridge
        ↑
actual supported runtime
```

## Consequences

- The same review document and analyzer can be used from tests, standalone,
  Cocos, and future adapters.
- AI output enters only as `AI_PROPOSED`; a human decision and a matching
  Preview are mandatory before Apply can change Session authority.
- Pivot offset, rotation offset, keyframe time, keyframe value, curve, and
  layer order are closed, executable Patch kinds with bounded targets.
- Cocos continues to own actual engine state and lifecycle.
- Adapter snapshots may differ in optional host diagnostics, but required
  playback/structure/timeline semantics are versioned and portable.
- A live review fails clearly when the supported runtime is absent or
  ambiguous; there is no fixture-name or Scene-name fallback.
- Core changes cannot import `cc`, `Editor`, DOM, Node HTTP, asset paths, or
  engine UUIDs. Cocos changes cannot redefine review metrics or decision
  transitions.
- Published animation and semantic-event schemas stay unchanged.

## Alternatives rejected

- Review logic inside the PROGRAM-015 component: not reusable and hard to
  test independently.
- Editor-only messages without a protocol: unversioned, hard to validate, and
  unusable from standalone.
- A generic protocol that carries arbitrary commands: unsafe and
  nondeterministic. The command set is closed and versioned.

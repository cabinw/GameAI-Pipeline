# TASK-003.1: Rig Semantics and Red Cap Calibration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

## Goal

Correct and prove the animation-pivot semantics of generated rigid-part rigs before any production Cocos Scene Builder is implemented.

## Required work

1. Define every part `joint` as the proximal pivot that attaches it to its parent.
2. Represent parent-owned child attachment points separately from the parent's own proximal joint.
3. Calibrate Red Cap waist, neck, shoulders, elbows, wrists, hips, knees, and ankles.
4. Reject duplicate annotation part IDs.
5. Constrain normalized socket and hit-area geometry to `[0, 1]` part bounds.
6. Prove upper-arm, forearm, thigh, and shin pivots with exact tests.
7. Add or update a deterministic assembled Red Cap preview acceptance artifact.
8. Update ADR-0006, schemas, public types, diagnostics, golden output, and documentation.

## Semantic rules

- `joint` is always the part's proximal animation pivot.
- A parent's `childAttachments` entry has a stable `attachmentId`, `childPartId`, and source-canvas `position`.
- A child attachment and the child's proximal joint must coincide spatially, but remain separate semantic records so future animation data can address the relationship explicitly.
- `visualCenter` remains descriptive and cannot influence pivots.
- Normalized socket points and hit shapes must stay wholly inside the untrimmed part's normalized bounds.

## Acceptance criteria

- Torso pivots at waist, head at neck, upper arms at shoulders, forearms at elbows, hands at wrists, thighs at hips, shins at knees, and feet at ankles.
- Exact tests cover both left and right upper arms, forearms, thighs, and shins.
- Duplicate `partId` values fail with a stable semantic diagnostic.
- Out-of-range sockets, circles, and rectangles fail before generation.
- Red Cap golden Rig Layout and assembled preview regenerate deterministically.
- `pnpm verify` passes from the repository root.
- No production Cocos Scene Builder behavior is introduced.

## Out of scope

- Image segmentation or joint detection.
- Production Cocos Nodes, Prefabs, or Scenes.
- Animation playback or generation.
- Source-asset mutation or automatic repair.

## Result

- Defined `joint` as the proximal animation pivot and added separately addressable parent-owned `childAttachments`.
- Added Source Annotation 1.1 semantics while retaining the documented 1.0 implicit child-joint fallback.
- Recalibrated all Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots and regenerated the golden layout.
- Added deterministic duplicate-ID, child-attachment, and normalized geometry diagnostics and tests.
- Added `examples/red-cap-target/assembled-preview.svg` as a byte-stable visual acceptance artifact.
- Updated ADR-0006, schema-versioning guidance, schemas, types, package docs, and generator docs.
- `CI=true pnpm verify` passes with 63 tests.
- No production Cocos Scene Builder logic was added.

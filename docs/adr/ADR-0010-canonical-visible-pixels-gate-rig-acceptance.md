# ADR-0010: Gate Rig Acceptance on Canonical Visible Pixels

- Status: Accepted
- Date: 2026-07-23

## Context

TASK-004.3 proved that the current parts could be arranged into a coherent
rig, but its side-by-side artifact also proved that the assembled person is
not the canonical reference person. Geometry validation, SpriteFrame
resolution, and subjective similarity cannot establish art provenance.

## Decision

Character art must pass an engine-neutral canonical-art gate before visual rig
acceptance:

- every neutral-pose visible part pixel must originate from the canonical
  transparent full-body PNG;
- AI-redrawn or painted pixels are prohibited in visible rest-pose regions;
- generated pixels are permitted only in explicitly declared part-local
  hidden-extension rectangles;
- every declared hidden extension must be completely covered by a higher
  canonical layer in the neutral flat composite;
- the flat composite uses only `sourceCanvas`, `originalRect`, and the
  provenance document's canonical draw order;
- exact native RGBA membership, flat alpha silhouette, and flat visible RGBA
  diff are machine gates, not visual-review suggestions.

The accepted tolerance is:

- exact alpha silhouette: zero mismatched silhouette pixels;
- per-channel flat-composite delta: at most 2;
- flat visible mismatch ratio: at most 0.1%;
- native part pixels exactly present in the canonical reference: at least
  99.9%, excluding valid declared hidden extensions.

## Consequences

- A rig can be structurally valid and still be blocked from visual acceptance.
- Joint offsets, scaling, rotation, and scene edits cannot cure provenance
  failures.
- Existing invalid art remains available as audit evidence but cannot be
  promoted as canonical.
- Replacing art requires rerunning the flat gate before Cocos acceptance.

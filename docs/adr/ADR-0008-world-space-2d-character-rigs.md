# ADR-0008: World-Space 2D Character Rigs

- Status: Accepted
- Date: 2026-07-23

## Context

TASK-004 generated the correct Joint/Visual hierarchy and Sprite components,
but assigned the nodes to `UI_2D` without placing them below Canvas or
RenderRoot2D. The scene camera did not render that layer, so hierarchy evidence
did not prove visible assembly.

Cocos Creator requires 2D renderable descendants to belong to a RenderRoot2D
collection boundary. World-space 2D content should use a layer such as UI_3D
that an ordinary scene camera can include without converting the character to
screen-space UI.

## Decision

- Generated Character Rigs are world-space 2D content.
- The generated root owns a `RenderRoot2D`; all generated visuals remain its
  descendants.
- Every node inside the generated replacement boundary uses `UI_3D`.
- Scene generation verifies that at least one active scene Camera includes the
  UI_3D mask, but never modifies an unrelated camera.
- Fixture-specific camera configuration belongs to the acceptance scene, not
  to general generation logic.

## Consequences

- The same Joint/Visual hierarchy, pivots, trim offsets, scale, and Sorting2D
  ordering are retained.
- Generated visuals participate in the 2D batch collection while remaining in
  world space.
- Projects must configure at least one compatible camera or generation fails
  before replacing the previous rig.
- Camera ownership and configuration remain outside the generated character
  boundary.

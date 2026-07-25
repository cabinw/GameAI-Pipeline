# TASK-013 Cocos Runtime Integration Postmortem

- Status: Complete
- Date: 2026-07-25
- Frozen feature: `feat/task-013-composable-character-loadout`
- Frozen checkpoint: `5170185fdca666300c4d61488f17e15aa18656be`

## Executive verdict

The engine-neutral TASK-013 work is reliable within its declared boundary.
All eight Rest combinations reconstruct exactly and 605 samples across five
semantic clips report zero garment-seam, accessory-socket, prop-grip, and
global-order error.

The Cocos data adapter is salvageable, but the acceptance runtime needs a
structural recovery rather than another focused patch. The current feature
branch remains a valuable immutable checkpoint for contracts, fixtures,
generated assets, and failure history. The monolithic Full Loadout demo is not
a sound basis for further runtime acceptance.

## Seven-fix timeline

| Commit | Defect | Why static tests missed it | Boundary exposed |
| --- | --- | --- | --- |
| `b8df276` | Synthetic scene/script identities and a removed component `node` reference prevented Creator deserialization. | JSON generation did not exercise Creator scene activation. | Scene serialization and Creator-owned metadata. |
| `428aa325` | A centered HUD inherited the character-root offset and left the Canvas. | Idealized bounds did not observe the live component tree. | Canvas ownership and runtime layout. |
| `cc117a7` | Adding `Label` reset effective `UITransform` state. | Model bounds did not represent post-initialization Cocos state. | Component initialization lifecycle. |
| `2744d57` | One long shortcut row was clipped by the fixed Label. | Character budgets did not measure rendered glyphs. | HUD content allocation and visual measurement. |
| `12c044b` | `@executeInEditMode` invoked runtime resource loading in the Editor lifecycle. | Tracked resource files were valid, but no test exercised Editor loading. | Editor/runtime lifecycle and resource loading. |
| `d6fe9cd` | HUD and dispatcher separately defined K/Y semantics and drifted. | Each table was internally consistent. | Semantic input source of truth. |
| `5170185` | Debug renderers lacked explicit global orders. After sorting was repaired, the skeleton still occupied a separate coordinate space. | Tests checked renderer count, active state, and numeric order, not projected location or pixels. | Sorting is not spatial projection. |

These failures were sequential gates, not independent accidents. Each repair
made the next previously unreachable runtime surface observable.

## Root causes

The integration lacked executable contracts at the boundaries between:

- tracked scene serialization and Creator deserialization;
- Editor component activation and runtime-only setup;
- manifest completion and scene construction;
- semantic input documentation and dispatch;
- production, debug, and HUD sorting domains;
- world-space targets and overlay-local Graphics coordinates; and
- deterministic headless evidence and actual Creator-rendered behavior.

The final demo built a separate skeleton hierarchy at a separate display
offset. Its skeleton segments were fixed local lines rather than projected
parent-child endpoints. Parent-link geometry used authored local rest offsets.
Grip status used attachment-local translation rather than the runtime
world-space socket-to-anchor distance. Renderer-state assertions therefore
could report success without proving spatial correctness.

## Evidence boundary

The existing `evidence/task-013` manifest points to the original
`6e8dab87039ccbe1a842eaf76517825d4568d755` implementation. Its two videos are
accepted deterministic headless reference evidence. They do not prove current
Creator scene loading, lifecycle, resources, HUD, input, Sorting2D, Graphics
coordinates, or visible debug output.

## Recovery decision

Preserve the contracts, resolver, production-lite source descriptions, PNGs,
animations, resolved outputs, exact reconstructions, validation reports,
resource-plan rules, and the generic adapter data translation.

Do not continue repairing the old Full Loadout demo. Establish an isolated
minimal Cocos runtime harness that proves Creator-owned scene identity,
lifecycle separation, manifest loading, semantic input, global sorting,
world-to-overlay-local projection, and runtime spatial assertions. Reconnect
Full Loadout only after those capabilities pass one uninterrupted Creator
acceptance run.

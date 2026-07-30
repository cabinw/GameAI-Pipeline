# Compatibility

This matrix separates implemented and directly verified runtime support from
architecture that remains portable in principle.

| Surface | Status |
| --- | --- |
| Character Semantic Events 1.0 contract/evaluator | Implemented and verified |
| Engine-neutral VFX event contract | Implemented and verified |
| Engine-neutral audio event contract | Implemented and verified; no playback consumer |
| Engine-neutral gameplay event contract | Implemented and verified; no gameplay consumer |
| Canonical 12-state semantic target registry | Implemented and verified |
| Engine-neutral VFX authoring schema/compiler | Implemented and verified |
| Deterministic concrete Render Plan and exact sampler | Implemented and verified |
| Shared Cocos typed primitive/recipe/blend adapter/runtime | Implemented and verified |
| Canonical 12-state data-driven VFX integration | Implemented and verified |
| Red Cap 19-part production character hierarchy | Implemented and verified |
| Red Cap Rest / Idle / Walk / Wave runtime animation | Implemented and verified |
| PROGRAM-015 Creator production vertical slice | Implemented and externally accepted |
| Cocos Creator 3.8.8 VFX runtime on validated macOS environment | Implemented and verified, including lifecycle/fault/visual gates |
| Clean tracked-files-only CI | Verified |
| Windows development environment | Not yet verified |
| Unity runtime adapter | Not implemented |
| Godot runtime adapter | Not implemented |
| Reverse playback and arbitrary seek | Explicitly unsupported |
| Network synchronization | Not implemented |
| Textual data-driven VFX authoring | Implemented and verified |
| Complete VFX authoring/editor UI | Not implemented |
| Production VFX art | Not provided; current effects are procedural/reference |
| Audio playback and gameplay execution | Not implemented |
| AI asset generation and automatic fitting | Not implemented |
| Red Cap production vertical slice | Implemented and verified |
| Two-character, one-scene fighting experiment | Future candidate; not started |
| TASK-014D4 | Not started |

## Interpretation

The engine-neutral contracts, evaluator, deterministic resolvers, semantic
IDs, cue intent, authoring schema, concrete Render Plans, and serializable
resolved outputs are designed to support independent engine adapters. That
architectural boundary does not count as runtime verification for Unity or
Godot. Only Cocos VFX execution is implemented; typed audio and gameplay
events are not runtime execution.

The accepted Cocos runtime consumes compiled plans only. It reuses the exact
engine-neutral sampler and dispatches typed primitives, recipes, and blend
roles without authoring parsing or cue/resource-name behavior. The canonical
integration covers all 12 loadout states, target rebind, rebuild, retry, Exact
Reset, the actual disable/destroy sequence, early partial-build compensation,
and Creator spatial/visual acceptance.

The accepted live runtime baseline is specifically Cocos Creator 3.8.8 in the
recorded macOS environment. CI verifies tracked-file reproducibility without
installing Creator. Windows has neither a verified development toolchain nor
an accepted Creator run.

The production-lite character remains the accepted canonical 12-state
loadout fixture. PROGRAM-015 separately provides an accepted Red Cap
production vertical slice with its own 19-part hierarchy, bounded
Rest/Idle/Walk/Wave animation, semantic targets, shared Cocos VFX runtime, and
Creator showcase. This does not add Red Cap to the canonical V2 loadout
matrix or imply a general automatic-fitting system.

See [Development Environment](environment.md),
[Cocos Scene Rig Builder](cocos-scene-rig-builder.md), and
[v0.5.0 Production Character Vertical Slice
Baseline](releases/v0.5.0-production-character-vertical-slice-baseline.md).

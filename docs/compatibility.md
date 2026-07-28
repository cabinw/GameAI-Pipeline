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
| Cocos Creator 3.8.8 VFX runtime on validated macOS environment | Implemented and verified |
| Clean tracked-files-only CI | Verified |
| Windows development environment | Not yet verified |
| Unity runtime adapter | Not implemented |
| Godot runtime adapter | Not implemented |
| Reverse playback and arbitrary seek | Explicitly unsupported |
| Network synchronization | Not implemented |
| VFX authoring/editor UI | Not implemented |
| Original Red Cap production reconstruction | Deferred |

## Interpretation

The engine-neutral contracts, evaluator, deterministic resolvers, semantic
IDs, cue intent, and serializable resolved outputs are designed to support
independent engine adapters. That architectural boundary does not count as
runtime verification for Unity or Godot. Only Cocos VFX execution is
implemented; typed audio and gameplay events are not runtime execution.

The accepted live runtime baseline is specifically Cocos Creator 3.8.8 in the
recorded macOS environment. CI verifies tracked-file reproducibility without
installing Creator. Windows has neither a verified development toolchain nor
an accepted Creator run.

The production-lite character is the accepted integration fixture. Historical
Red Cap artifacts remain useful for provenance and earlier rig gates, but the
original Red Cap has not been reconstructed through the complete canonical V2
loadout runtime.

See [Development Environment](environment.md),
[Cocos Scene Rig Builder](cocos-scene-rig-builder.md), and
[v0.3.0 Character Semantic Events & VFX
Baseline](releases/v0.3.0-character-semantic-events-vfx-baseline.md).

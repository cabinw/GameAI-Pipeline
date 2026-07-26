# Compatibility

This matrix separates implemented and directly verified runtime support from
architecture that remains portable in principle.

| Surface | Status |
| --- | --- |
| Cocos Creator 3.8.8 on validated macOS environment | Verified |
| Clean tracked-files-only CI | Verified |
| Windows development environment | Not yet verified |
| Unity runtime adapter | Not implemented |
| Godot runtime adapter | Not implemented |
| Original Red Cap production reconstruction | Deferred |

## Interpretation

The engine-neutral contracts, deterministic resolvers, semantic IDs, and
serializable resolved outputs are designed to support independent engine
adapters. That architectural boundary does not count as runtime verification
for Unity or Godot.

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
[v0.2.0 Character Loadout Baseline](releases/v0.2.0-character-loadout-baseline.md).

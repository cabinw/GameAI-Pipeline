# Architecture

## Pipeline contract

Every pipeline implements the same conceptual stages:

```text
Input → Validate → Normalize → Generate → Verify → Output
```

Each stage must expose deterministic inputs and serializable reports.

## Layers

### Specification layer

Versioned JSON or YAML DSL files describe intent. They are the durable source of truth.

### Validation layer

Schemas and semantic validators reject missing assets, invalid hierarchy, incompatible versions, unsafe paths, and unsupported features.

### Generation layer

Generators convert normalized specifications into engine-neutral intermediate data or engine-specific artifacts.

### Integration layer

Engine adapters, beginning with Cocos Creator 3.8.x, materialize generated data into editor nodes, assets, prefabs, and runtime components.

### Verification layer

Automated checks, fixture comparisons, generation reports, and visual review determine whether output is acceptable.

## Dependency rule

Dependencies point inward:

```text
projects → engine adapters → pipelines → framework
```

Framework and pipeline packages must never import project-specific modules.

## Workspace topology

The repository uses a private pnpm workspace. Package dependencies follow this direction:

```text
external production games
          ↓
Cocos adapters and fixture projects
          ↓
       pipelines
          ↓
       framework
```

Production games consume versioned packages from their own repositories. Only reproducible fixtures and integration spikes live under `cocos/projects/`; code under that directory must never be imported by `framework/`, `pipelines/`, or reusable Cocos adapters. See ADR-0003.

## Artifact rule

Generated files must be distinguishable from authored specifications. Regeneration must not silently delete user-authored data.

Generated package output (`dist/`, `dist-test/`) and Cocos state (`library/`, `temp/`, `local/`, `build/`, `profiles/`) are ignored. Authored fixtures, extension sources, schemas, and package manifests remain tracked.

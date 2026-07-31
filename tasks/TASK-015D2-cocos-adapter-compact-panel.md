# TASK-015D2 — Cocos Adapter & Compact Panel

## Status

Planned after TASK-015D1.

## Scope budget

At most 20 changed files and 5,000 changed lines. Zero new Scene or `.meta`
files, binary/media, evidence, accepted asset, schema-version, or lockfile
changes.

## Goal

Expose the active PROGRAM-015 Red Cap motion runtime through Engine Adapter
Protocol 1.0 and add a compact dockable Cocos Creator 3.8.x review Panel that
uses the shared workspace UI interaction model.

## Acceptance criteria

- A typed adapter translates every supported protocol command to actual
  PROGRAM-015 motion runtime operations and translates runtime state into a
  versioned snapshot.
- Panel → Main → Scene/runtime requests preserve protocol version, request ID,
  adapter identity, and error correlation.
- Describe, select clip, play, pause, seek, single-frame step, overlay toggle,
  exact reset, and refresh succeed; unsupported/stale/unavailable commands
  fail without partial runtime mutation.
- The compact Panel exposes connection/runtime status, playback controls,
  timeline position, overlays, structure summary, and structured output using
  the same shared UI module later used by standalone.
- Existing PROGRAM-015 lifecycle, semantic events, rebuild, recovery input,
  renderers, targets, fault surface, Scene bytes, and metadata remain
  behaviorally compatible and duplicate-free.
- Focused extension/project tests, strict CI `cc` type surface, complete
  verification, generated closure, metadata audit, and zero-Scene/media checks
  pass before the D2 commit.

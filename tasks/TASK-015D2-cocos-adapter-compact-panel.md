# TASK-015D2 — Cocos Adapter & Compact Panel

## Status

Complete.

## Scope budget

At most 20 changed files and 5,000 changed lines. Zero new Scene or `.meta`
files, binary/media, evidence, accepted asset, schema-version, or resolved
third-party dependency changes. Mechanical workspace-link lockfile updates
for the shared UI, Cocos project, and extension importers are allowed.

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

## Result

- `@gameai/animation-review-ui` now provides one dependency-free controller,
  DOM renderer, styles, control vocabulary, optimistic runtime revision model,
  and CommonJS/browser-ESM builds for both hosts.
- The compact dockable Panel sends protocol requests through Main validation
  and a correlated Scene Script bridge. The Scene adapter selects exactly one
  matching active runtime and fails closed for missing, ambiguous, invalid, or
  drifting identities.
- The existing PROGRAM-015 motion harness exposes real describe, clip, play,
  pause, seek, frame-step, rate, loop, five-overlay, and exact-reset behavior,
  portable part/joint/timeline snapshots, stale-revision protection, and
  runtime/semantic/lifecycle diagnostics.
- Focused UI tests pass 3/3, extension tests pass 297/297, project tests pass
  9/9, and strict extension/project typechecks pass.
- `CI=true pnpm verify` passes 522/522. D2 changes exactly 20 files and 1,591
  lines, generated closure and metadata audits pass, no Scene/`.meta`/media
  path changes, tracked MP4 remains zero, and protected hashes remain exact.

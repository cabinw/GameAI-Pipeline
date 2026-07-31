# TASK-015D3 — Standalone Workspace MVP

## Status

Planned after TASK-015D2.

## Scope budget

At most 24 changed files and 6,500 changed lines. Zero binary/media/evidence,
Scene, `.meta`, accepted-asset, cloud-service, or large UI-library changes.

## Goal

Add a loopback-only local review service and a usable standalone browser
workspace for the accepted PROGRAM-015 Red Cap character and animations.

## Acceptance criteria

- A documented root command starts the service on `127.0.0.1` with an
  ephemeral or explicit allowed port and one explicitly selected fixture.
- The service exposes bounded JSON endpoints for workspace state, adapter
  commands, review export, and declared fixture assets.
- Path traversal, absolute paths, symlinks outside the fixture root,
  non-loopback binding, oversized bodies, unsupported versions/commands, bad
  content types, and malformed JSON fail closed.
- The standalone UI renders real accepted sprite parts plus Skeleton, pivots,
  sockets, hit areas, timeline tracks/keyframes, playback, seek/step, rate,
  loop, and structured review/checklist panels.
- Source animation and accepted fixture files remain read-only. Workspace
  state is process-local and export is explicit.
- The service and UI require no network, credentials, cloud model, ignored
  experimental asset, Creator cache, or untracked input.
- Endpoint, asset-containment, UI contract, adapter, fixture, export,
  working-copy, tracked-only, and clean-tree checks pass before the D3 commit.

# TASK-015D3 — Standalone Workspace MVP

## Status

Complete.

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

## Usage

From the repository root:

```bash
pnpm review:animation
```

The command builds the shared browser ESM and service, validates the accepted
`examples/red-cap-production-v1` fixture, binds an ephemeral port on
`127.0.0.1`, and prints the local URL. Optional `--port` and `--fixture` values
are forwarded through the workspace package; `--host` accepts loopback only.

## Result

- The process-local fixture adapter parses the accepted Character Rig, Rig
  Layout, and Rest/Idle/Walk/Wave contracts; samples the shared Rig Animation
  evaluator; and returns 19 real PNG part transforms, hierarchy, tracks,
  keyframes, sockets, hit areas, attachment markers, metrics, findings, and
  checklist state.
- The shared standalone UI renders layered sprites, timeline, structure,
  playback/rate/loop/step controls, five overlays, findings/checklist, runtime
  JSON, and explicit download export.
- The Node built-in service binds loopback only, uses a same-origin mutation
  token, 64 KiB request limit, JSON content enforcement, protocol/revision
  validation, declared-asset realpath containment, CSP, and no-store headers.
  It has no upload, directory listing, source-write, remote bind, cloud, or
  ignored experimental path.
- Focused shared UI tests pass 4/4, focused workspace tests pass 5/5, and
  `CI=true pnpm verify` passes 528/528. D3 closes at 21 files and 1,832
  changed lines with zero binary, media, Scene, or `.meta` files; closure and
  protected-value audits remain clean.

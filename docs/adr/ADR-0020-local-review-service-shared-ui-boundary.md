# ADR-0020 — Local Review Service and Shared UI Boundary

- Status: Accepted
- Date: 2026-07-31

## Context

The review workspace needs a full browser surface and a compact Cocos Panel.
The repository's current UI is native TypeScript/DOM and there is no shared
frontend framework. A service is needed to hold revisioned review state,
serve accepted fixture assets, and give AI agents a machine-readable local
interface, but it must not create an externally reachable hosted application
or a new source-mutation path.

## Decision

Use one dependency-free TypeScript UI module with host-specific transports and
one Node 24 built-in HTTP service bound to loopback.

```text
shared UI state/render/actions
        ├── Cocos Panel transport → Editor.Message
        └── browser transport → same-origin loopback HTTP
```

The UI module owns DOM rendering and user intent only. It never reads files,
samples animations, validates findings, or mutates engine/source state.

The local service owns one selected adapter, process-local review state,
bounded JSON endpoints, safe declared asset serving, revision conflict
checks, and explicit exports. There is no remote bind, upload, directory
listing, recursive scan, credential store, source write, or background daemon.

## Why no frontend dependency

The surface needs a preview canvas, forms, lists, timeline marks, and
accessible buttons. Native DOM and Canvas APIs cover this bounded scope and
already work in Cocos panels. Avoiding a new framework also avoids a bundler,
runtime duplication, lockfile expansion, Creator packaging risk, and an
unrelated component-library dependency.

The module is compiled as CommonJS for the Cocos extension and browser ESM for
standalone. Host transports implement the same typed controller interface.

## Security consequences

- Service hosts are limited to `127.0.0.1` and `::1`.
- Mutation requests require same-origin content type and a process token.
- Bodies, URL lengths, and commands have fixed limits.
- Asset access is allowlisted from the selected adapter snapshot and
  real-path contained under the selected accepted fixture root.
- `artifacts/experimental/` remains opaque even when a repository root is
  selected.
- The service returns downloads; it does not overwrite source files.

## Operational consequences

- A tracked-only checkout can run the workspace without Creator.
- Cocos and standalone share interaction and visual structure while retaining
  separate transport and preview authority.
- Browser tests can validate markup/actions without a heavyweight browser
  framework; final visual/Creator acceptance remains human-reviewed.
- Future UI complexity that exceeds this boundary requires a new task and ADR
  before adding a frontend framework.

## Alternatives rejected

- Two independently authored UIs: interaction and terminology would drift.
- Direct browser filesystem access: unsafe, difficult to validate, and not
  available in Cocos Panel.
- Express or a hosted service: no demonstrated need and an unnecessary
  dependency/network surface.
- Source writes from the service: review proposals must remain reversible and
  explicit.

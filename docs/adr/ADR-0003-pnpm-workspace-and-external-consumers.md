# ADR-0003: Use a pnpm workspace with external production-game consumers

- Status: Accepted
- Date: 2026-07-23

## Context

The framework needs engine-neutral packages, Cocos-specific adapters, reproducible fixtures, and a clear answer about whether production games belong in this repository. Cocos also discovers project-local extensions more reliably than extensions copied by an undocumented manual step.

## Decision

Use a private pnpm workspace for framework development and lock Node, pnpm, and TypeScript at the repository root.

- `framework/*` contains engine-neutral foundations.
- `pipelines/*` contains reusable pipeline packages and may depend on framework packages.
- `cocos/extensions/*` contains reusable Cocos adapters and may depend on pipeline and framework packages.
- `cocos/projects/*` contains only reproducible fixtures and integration spikes.
- A fixture-local extension under `cocos/projects/*/extensions/*` may be a workspace package when direct Creator discovery is required.
- Production game projects remain in their own repositories and consume versioned GameAI packages. They are never imported by framework or pipeline packages.

## Consequences

- One lockfile and one CI command provide deterministic repository validation.
- Cocos fixtures can prove editor behavior without turning this repository into a production game monorepo.
- Integration tests requiring Creator remain local until a licensed, reproducible CI runner is approved.
- Publishing strategy and schema-compatibility policy still require later ADRs before the first public package release.

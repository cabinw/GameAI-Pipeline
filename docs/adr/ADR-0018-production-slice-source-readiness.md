# ADR-0018: Fail Closed on Production-Slice Source Readiness

- Status: Accepted for PROGRAM-015
- Date: 2026-07-30

## Context

The repository contains a deterministic Red Cap neutral reconstruction and
bounded articulation evidence. The canonical authority is nevertheless a
flattened composite, hidden joint texture is synthesized deterministically,
asset authorship/license is undocumented, and no production showcase
background/style board is present.

PROGRAM-015 requires production intent, exact pixel ownership, reproducible
motion, and a final two-character framebuffer oracle. Neutral visual parity
alone cannot establish source rights or production motion readiness.

## Decision

Production-slice source readiness is a fail-closed gate before implementation.

- Git history is not asset provenance or a license grant.
- A deterministic generated hidden pixel is not an observed layered source
  pixel.
- Acceptance evidence and procedural color are not substitute scene
  backgrounds.
- Camera coordinates and framebuffer ROIs are not finalized until the
  background/style board is accepted.

The legacy Red Cap artifacts remain valid for their historical neutral and
bounded-stress claims. They are not promoted to the PROGRAM-015 production
surface.

## Consequences

The original legacy source correctly stopped PROGRAM-015. The replacement
`red-cap-production-v1` pack now supplies SHA-bound project-owner rights,
traceable master/parts/supplement authority and a qualified background/style
board. Its machine-readable authority map rejects ambiguous or duplicate
components instead of silently choosing them.

Phase 0 passes without changing public schemas or runtimes and without
relaxing a visual threshold. TASK-015A may proceed.

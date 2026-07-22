# ADR-0002: Use rigid Sprite node rigs for Character Pipeline MVP

- Status: Accepted
- Date: 2026-07-23

## Context

The initial games use small 2D casual characters with simple movements, many NPC variants, and a strong requirement for Codex-driven automation.

## Decision

Represent each body part as an independent Sprite node connected through a Transform hierarchy. Drive position, rotation, scale, opacity, and active state through data-driven animation.

Mesh deformation, IK, and third-party skeletal runtimes are outside the MVP core.

## Consequences

- Rig construction, animation, sockets, and hit areas are scriptable with Cocos and TypeScript.
- Source art must include overlap at joints and explicit anchors/rest-pose data.
- Complex deformation may require a later optional adapter, not changes to the core schema.

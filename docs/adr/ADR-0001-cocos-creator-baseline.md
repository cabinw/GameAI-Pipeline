# ADR-0001: Use Cocos Creator 3.8.x as the first engine baseline

- Status: Accepted
- Date: 2026-07-23

## Context

The initial product uses Cocos Creator, and the first deliverable is an editor-integrated 2D Character Rig Builder.

## Decision

Target Cocos Creator 3.8.x and TypeScript for the first engine adapter. Keep specification, validation, and normalized pipeline data engine-neutral wherever practical.

## Consequences

- The first editor extension and runtime components may rely on Cocos 3.8.x APIs.
- Engine-specific types cannot cross into framework schemas.
- Supporting another engine requires a separate adapter rather than conditionals throughout the core.

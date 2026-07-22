# ADR-0004: Version character contracts with explicit SemVer ranges

- Status: Accepted
- Date: 2026-07-23

## Context

Character Rig and Rig Layout documents are durable authored inputs. Silent interpretation of a newer schema by an older generator could create incorrect rigs, while exact-version-only validation would make compatible patch releases unnecessarily brittle. Validation diagnostics are also consumed by tools and need stable machine identities.

## Decision

Require strict `MAJOR.MINOR.PATCH` `schemaVersion` values and explicit supported ranges in validators.

- The TASK-001 implementation accepts `>=1.0.0 <1.1.0`.
- Patch releases do not change accepted shape or field meaning.
- Minor releases are additive but require explicit validator support.
- Major releases may be breaking and require migration guidance.
- Unsupported versions fail closed with `UNSUPPORTED_SCHEMA_VERSION`.
- Validation error-code strings are stable public API within a schema major line; consumers must not parse human messages.
- Root schemas are canonical and are copied byte-for-byte into the distributable package.

## Consequences

- Older validators cannot silently discard newer contract intent.
- A new minor requires coordinated schema, type, validator, fixture, and documentation changes.
- Patch-number differences remain interoperable inside an implemented minor line.
- Future migrations have an explicit version dispatch point.

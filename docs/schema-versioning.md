# Schema-Version Compatibility

Character contracts use a required `schemaVersion` field with strict `MAJOR.MINOR.PATCH` syntax. File names remain stable; `$id` identifies the schema family and initial shape.

## Current support

The TASK-001 validator implements:

```text
>=1.0.0 <1.1.0
```

All `1.0.x` documents share the same machine-readable shape and semantics. A syntactically valid version outside this range produces `UNSUPPORTED_SCHEMA_VERSION` before cross-document validation.

## Version meaning

- **MAJOR** changes when an existing valid document may need editing, a field changes meaning or units, or a public validation error code is removed or repurposed.
- **MINOR** changes for additive optional fields or additive enum capabilities. A validator must explicitly implement a newer minor before accepting it; older validators fail closed instead of silently ignoring new intent.
- **PATCH** changes for clarifications, typo fixes, or validator corrections that do not change the accepted document shape. Validators accept all patch values within an implemented major/minor line.

Schema compatibility is directional. A newer validator should continue reading documents from supported earlier minor versions and normalize them internally if needed. An older validator is not assumed to understand a newer minor version even when the JSON happens to satisfy its older schema.

## Evolution rules

1. Never infer compatibility from the `$schema` draft URI or file name; use `schemaVersion`.
2. Do not mutate an authored document's `schemaVersion` during parsing.
3. Add a migration function and fixture whenever a supported older minor requires normalization.
4. Keep canonical root schemas and package copies byte-identical.
5. Add valid and invalid fixtures for every newly supported version.
6. Preserve error-code meanings for the entire schema major line.
7. Reject unsupported versions with `UNSUPPORTED_SCHEMA_VERSION`; do not downgrade to a generic shape error.

## Publishing a new version

Before accepting a new minor or major:

1. approve an ADR describing compatibility and migration impact;
2. add a versioned schema `$id` and update the documented supported range;
3. update TypeScript types, parser dispatch, semantic validation, fixtures, and tests together;
4. prove older supported fixtures still validate or provide explicit migrations;
5. publish schema and package changes atomically.

See ADR-0004 for the decision rationale.

# TASK-013R7 Draft-PR Retention Report

## Canonical production files

- `assets/composable-character-loadout-reference-v2.scene` and its
  Creator-owned metadata.
- `source/composable-loadout/canonical-loadout-adapter.ts`, its generated
  Creator mirror, and the canonical Scene component.
- The engine-neutral production-lite full-loadout source contract, generated
  layouts, resolved states, animations, references, and validation reports.

## Accepted regression fixtures

TASK-013R1 through TASK-013R6 Scenes, runtime modules, fixtures, and tests are
retained unchanged where possible as accepted boundary regressions. They are
not canonical production entry points.

## Deterministic generated mirrors

The production-lite resource mirrors, generated R6 plan/runtime boundary
modules, canonical adapter mirror, and reference/reconstruction outputs remain
tracked because clean tracked-files-only verification regenerates and compares
them deterministically.

## Superseded legacy and provenance

The original TASK-013 monolithic Scene, component, generator, and generated
data remain historical/provenance material. Their generator is isolated behind
`legacy:verify-task013-provenance` and is not run by the normal build. The
canonical Scene and facade neither import nor select that Scene/component.

## Byte-identical duplicated resources

The accepted recovery fixtures and canonical resource mirror intentionally
contain byte-identical copies of some base, garment, accessory, and prop PNGs
and JSON contracts. They are retained to keep each historical acceptance
fixture tracked-file complete.

## Safe future cleanup candidates

- Deduplicate immutable PNG/JSON mirrors through a content-addressed generated
  resource cache.
- Archive R1-R5 Creator Scenes after a separately authorized migration of
  their regression assertions to a smaller fixture suite.
- Move the original TASK-013 monolith and its generated mirrors to a dedicated
  provenance package.

No candidate is deleted or moved by this remediation.

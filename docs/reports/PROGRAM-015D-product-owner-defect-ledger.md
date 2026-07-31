# PROGRAM-015D Product Owner Defect Ledger

## Ledger status

Product Owner Acceptance is PENDING. No product-owner finding has been
recorded yet. Round 1 is waiting for the project owner's complete UI and
information-architecture feedback.

Only owner-authored feedback may create a `PO-UAT-*` entry. Codex records the
feedback without silently strengthening, weakening, splitting, or closing the
owner's decision. IDs are stable and monotonically assigned beginning with
`PO-UAT-001`.

## Required fields

| Field | Meaning |
| --- | --- |
| ID | Stable `PO-UAT-NNN` identifier |
| Acceptance Round | Round in which the owner reported the issue |
| Area | Product surface or workflow |
| Expected | Owner's expected behavior |
| Actual | Observed behavior |
| Severity | BLOCKER, MAJOR, MINOR, or SUGGESTION |
| Product Owner Comment | Owner's words or faithful attributed summary |
| Screenshot/local evidence | Local-only reference below the approved ignored root |
| Decision | One allowed ledger state |
| Implementation commit | Append-only remediation commit, when applicable |
| Retest result | Automated and owner-retest evidence kept distinct |
| Product Owner closure | Explicit owner closure statement or blank |

## Decision states

- `OPEN`
- `ACCEPTED_FOR_FIX`
- `FIXED_PENDING_RETEST`
- `CLOSED_BY_PRODUCT_OWNER`
- `DEFERRED_BY_PRODUCT_OWNER`
- `REJECTED_BY_PRODUCT_OWNER`

Codex must never assign `CLOSED_BY_PRODUCT_OWNER`. Deferred and rejected states
also require an explicit owner decision.

## Findings

No findings yet. Do not add placeholder `PO-UAT` IDs because issued IDs are
stable acceptance records.

When feedback arrives, add one row per accepted ledger item using this shape:

| ID | Acceptance Round | Area | Expected | Actual | Severity | Product Owner Comment | Screenshot/local evidence | Decision | Implementation commit | Retest result | Product Owner closure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Round rules

1. Collect the complete round before proposing or implementing fixes.
2. Classify each item as BLOCKER, MAJOR, MINOR, or SUGGESTION.
3. Present one consolidated remediation scope.
4. Add regression coverage for behavioral defects.
5. Record append-only implementation commits and automated results.
6. Leave fixed items `FIXED_PENDING_RETEST` until the project owner retests.
7. Do not begin the next round while any current-round BLOCKER or MAJOR lacks
   explicit owner closure or deferral.

## Evidence boundary

Every screenshot, recording, Session, and export referenced by this ledger
must remain ignored, untracked, local-only, and below:

`artifacts/experimental/program-015d-product-owner-acceptance/`

The ledger may record a relative local evidence name, but no evidence payload
may be staged, pushed, attached to a PR, or published in a Tag or Release.

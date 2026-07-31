# TASK-015D4 — AI + Human Review Loop

## Status

Planned after TASK-015D3.

## Scope budget

At most 18 changed files and 4,500 changed lines. Zero cloud API, credentials,
paid dependency, binary/media/evidence, Scene, `.meta`, source overwrite, tag,
or Release changes.

## Goal

Complete the structured Generate → Analyze → Human Adjust → Validate →
Contract Output loop with a deterministic built-in assistant and an open,
versioned provider boundary for future AI agents.

## Acceptance criteria

- The assistant returns structured findings with location, diagnosis,
  suggestion, constrained parameter range, confidence, and stable provenance.
- Provider output is validated through the same fail-closed contract and
  cannot directly mutate animation or review state.
- Human accept, reject, resolve, comment, and constrained quick-edit actions
  require an expected revision and create immutable decisions/audit entries.
- An accepted quick edit creates a new in-memory animation revision, preserves
  the original clip byte-for-byte, and automatically reruns metrics,
  findings, and checklist validation.
- Stale revisions, unaccepted AI proposals, unknown targets/keyframes,
  non-finite/out-of-range values, invalid transitions, and duplicate decisions
  fail without partial mutation.
- Export contains the review contract, original subject binding, current
  proposed animation, metrics, findings, checklist, decisions, adjustments,
  audit trail, and deterministic manifest hashes—without requiring video.
- End-to-end tests prove an AI finding → human decision → adjustment →
  revalidation → export round trip and source immutability.
- All focused/full/frozen/closure/scope/media/protected-ref checks pass. The
  exact four commits are pushed and one Draft PR is created, then work stops at
  the single external code, UI, and Creator review.

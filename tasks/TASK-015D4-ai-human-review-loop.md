# TASK-015D4 — AI + Human Review Loop

## Status

Complete on `feat/task-015d-animation-review-workspace`; final Draft PR
external review remains pending.

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

## Implementation

- Provider protocol `1.0.0` accepts only bounded, concrete scalar-keyframe
  proposals with subject/revision identity, location, diagnosis, suggested
  value/range, confidence, and matching provider provenance. Validation alone
  is read-only; proposal ingestion is a separate revisioned operation.
- The deterministic local assistant identifies numeric loop-boundary drift
  and pronounced rotation poses. Stable IDs and original track/keyframe
  indices make each suggestion directly reviewable and repeatable.
- Human accept/reject/resolve/comment transitions and quick edits require the
  current review revision. Only an accepted assistant/provider finding can
  edit its exact declared scalar path inside its declared range.
- Quick edits clone the normalized animation in memory, retain the exact
  original source text, rerun deterministic metrics/findings/checklist, and
  append immutable decision, adjustment, and audit history.
- The loopback service owns per-clip process state and protected assistant,
  provider, decision, and adjustment routes. The shared standalone UI exposes
  the complete loop; provider agents can use the same versioned local route.
- Export contains source/adapter/review bindings, the complete review
  document, exact original animation, current proposed animation, and SHA-256
  hashes for review/original/proposal content. Repeated exports of unchanged
  state are byte-equivalent as JSON values and require no media.

## Verification

- Core tests: 9/9 PASS.
- Shared UI tests: 6/6 PASS.
- Standalone workspace/service tests: 7/7 PASS.
- `CI=true pnpm verify`: 534/534 PASS.
- Frozen install plus `CI=true pnpm verify` from an isolated export of the
  exact staged tracked-only tree: 534/534 PASS.
- D4 closes at exactly 18 text files and 2,120 changed lines, within the
  18-file/4,500-line gate and with zero new dependency, binary, media, Scene,
  or `.meta` file.
- Focused tests cover malformed provider output, stale revisions, unaccepted
  and out-of-range edits, invalid decision transitions, duplicate IDs,
  source immutability, automatic reanalysis, service round trip, and
  deterministic export.
- Protected refs and final publication evidence are recorded in PROGRAM-015D
  acceptance at the commit and Draft PR gates.

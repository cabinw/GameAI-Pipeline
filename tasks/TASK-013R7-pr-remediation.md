# TASK-013R7: Draft PR Pre-Merge Remediation

## Objective

Remediate Draft PR #9 before review readiness without changing the accepted
canonical V2 visual design, controls, loadout membership, animation behavior,
resource count, or reset defaults.

## Required changes

1. Gate semantic input on complete runtime readiness and leave zero active
   handlers after loading failure, rebuild transition, disable, or destroy.
2. Make the tracked engine-neutral full-loadout contract the sole authority
   for the complete 12-state garment/accessory/prop matrix; derive the
   R6-compatible Cocos representation from resolver output.
3. Reject duplicate merged slot, wearable-set, prop-state, seam, group, and
   state identifiers plus unknown state/group/member references and
   incompatible rigs with stable diagnostics before `Map` construction.
4. Measure expected accessory socket and actual attachment anchor from
   independent world-space paths, cover perturbed failure, count duplicate
   primary and hand-overlay nodes, and document AABB seam measurement.
5. Standardize the canonical adapter ID as
   `composable-character-loadout-reference-v2`; isolate legacy monolith
   generation behind an explicit provenance command and document canonical
   entry points.
6. Enforce exact generator output closure, transitive provenance,
   deterministic tracked-only generation, and CI post-verify clean-tree
   checks.
7. Publish a retention report classifying production, recovery-regression,
   generated, legacy/provenance, duplicated-resource, and future-cleanup
   surfaces without deleting them.

## Acceptance

- Working-copy `CI=true pnpm verify`.
- Tracked-files-only `pnpm install --frozen-lockfile` and
  `CI=true pnpm verify`.
- Exact generated-output-set and stale-output rejection tests.
- `git diff --exit-code` and empty `git status --porcelain` after final
  verification.
- Creator 3.8.8 clean open, Scene switch/reopen, clean consoles, 35/35
  resources, all 12 states, no/left/right prop, Rest/Wave/Prop Swing/
  Integration Stress, Pause/Resume, Exact Reset, two rebuilds, and every
  spatial/duplicate/sorting/role/finite/viewport guard.
- Replacement live Cocos Web Preview evidence from the final feature SHA,
  H.264 High 1280x720 30 fps yuv420p, SHA-256, complete local decode,
  temporary `evidence/task-013r7-pr-remediation` publication, byte-identical
  re-download, and complete uploaded-copy decode.

## Safety

- Append commits only to
  `recovery/task-013r7-full-loadout-release-candidate`.
- Keep PR #9 Draft; do not mark Ready or merge.
- Do not rewrite or delete protected/recovery history, accepted harnesses, the
  historical monolith, or prior evidence documentation.
- Do not track MP4 files on the feature branch.
- Do not start TASK-014.

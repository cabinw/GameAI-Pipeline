# PROGRAM-015D Animation Review Workspace Acceptance

## Status

In progress. D1–D4 acceptance is accumulated append-only in this document.
Final external code, standalone UI, compact Cocos Panel, and Creator runtime
review is intentionally deferred to the Draft PR.

## Baseline

- Exact `main` and `origin/main`:
  `8e12a07619ec1bfc9c47590b862f91fbf2edf669`.
- Branch: `feat/task-015d-animation-review-workspace`.
- `v0.5.0` annotated tag object:
  `ee030924b6728f5f7b6ff9afc1339a58047adca3`.
- `v0.5.0^{}`:
  `8e12a07619ec1bfc9c47590b862f91fbf2edf669`.
- GitHub Release ID: `362672704`.
- Rights SHA-256:
  `335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4`.
- Provenance SHA-256:
  `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.
- Local protected policy backup:
  `a910e0ca44fd5f77fb12e575208eb9b05323a009`.
- Local protected Sharp fix:
  `96eaa1c329f18011497cc2b34b76a7faf91c3b92`.
- Baseline `CI=true pnpm verify`: 508/508 PASS.
- Baseline tracked MP4: 0.

The complete Phase 0 ref, Release, and worktree inventory is recorded in
[`tasks/PROGRAM-015D-animation-review-workspace.md`](../../tasks/PROGRAM-015D-animation-review-workspace.md).

## Acceptance model

Visual review complements but does not replace contract, service, protocol,
revision, security, and tracked-only tests. Automated checks complement but do
not replace final Cocos Creator lifecycle and UI review.

The program stops only once, after the exact four commits are pushed and the
Draft PR is created, for the following combined external gate:

1. engine-neutral core and service code review;
2. standalone workspace visual/usability review;
3. compact Cocos Panel review;
4. Creator 3.8.x runtime control/snapshot/lifecycle review.

No earlier D1/D2/D3 checkpoint requests external acceptance.

## D1 — Review Contracts & Core — PASS

- Canonical Review Document 1.0 and Engine Adapter Protocol 1.0 schemas are
  byte-identical to the copies built into `@gameai/animation-review-core`.
- Seven focused tests cover every published parser diagnostic, valid and
  invalid textual fixtures, metrics/findings/checklist determinism, immutable
  source inputs, canonical serialization, optimistic revisions, decision
  transitions, and command-specific adapter validation.
- `CI=true pnpm --filter @gameai/animation-review-core test`: 7/7 PASS.
- `CI=true pnpm verify`: 515/515 PASS.
- D1 changes 34 files and 3,661 lines within the recorded 36-file/7,500-line
  commit gate. The lockfile adds only one workspace importer and resolves no
  new dependency version.
- D1 modifies no Cocos runtime, Scene, `.meta`, accepted asset, generated
  mirror, binary, media, tag, Release, worktree, or protected ref. Tracked MP4
  remains zero, and the rights/provenance hashes remain exact.

## D2 — Cocos Adapter & Compact Panel

Pending implementation.

Required evidence:

- exact request correlation and supported command matrix;
- real PROGRAM-015 runtime snapshot/control boundary;
- compact shared-UI Panel registration;
- no Scene or metadata mutation;
- existing lifecycle/input/runtime regression pass;
- focused and full verification.

## D3 — Standalone Workspace MVP

Pending implementation.

Required evidence:

- loopback-only service;
- bounded/path-contained API and asset serving;
- accepted Red Cap sprite preview, structure, timeline, controls, and export;
- tracked-only/no-network/no-experimental dependency;
- endpoint, UI contract, focused, and full verification.

## D4 — AI + Human Review Loop

Pending implementation.

Required evidence:

- validated provider proposals and deterministic local assistant;
- explicit human accept/reject/resolve/comment;
- constrained edit with expected revision;
- automatic reanalysis and source immutability;
- deterministic review/proposed-animation export;
- end-to-end review loop;
- exact four-commit history, final full/frozen/closure/scope audits, push,
  Draft PR, and pending external gate.

## Publication boundaries

The feature branch and Draft PR must contain zero MP4 or other evidence media.
No existing tag, Release, backup/recovery/archive ref, worktree, rights byte,
provenance byte, accepted source asset, or accepted Scene may change.

PROGRAM-015D does not authorize a merge, `v0.6.0`, Tag, Release, TASK-014D4,
or TASK-016.

# PROGRAM-015D — Animation Review Workspace

## Status

TASK-015D1–D4 implementation complete on
`feat/task-015d-animation-review-workspace`; final verification, push, Draft
PR, and the single external review gate remain.

TASK-015D1 through TASK-015D4 are executed continuously on this branch as four
append-only commits. TASK-014D4 and TASK-016 remain not started.

## Objective

Build a local-first AI + Human Animation Review Workspace that turns animation
inspection, diagnosis, proposed edits, human decisions, revisions, validation,
and final review into reproducible data. Subsequent character, animation, and
VFX work must be able to inspect a structured review session without requiring
repeated recordings or unstructured chat reconstruction.

## Phase 0 baseline

Audit date: 2026-07-31, Asia/Shanghai.

| Check | Recorded value | Result |
| --- | --- | --- |
| `main` | `8e12a07619ec1bfc9c47590b862f91fbf2edf669` | PASS |
| `origin/main` | `8e12a07619ec1bfc9c47590b862f91fbf2edf669` | PASS |
| main worktree | clean, no merge/rebase/cherry-pick | PASS |
| annotated `v0.5.0` tag object | `ee030924b6728f5f7b6ff9afc1339a58047adca3` | PASS |
| `v0.5.0^{}` | `8e12a07619ec1bfc9c47590b862f91fbf2edf669` | PASS |
| `v0.5.0` GitHub Release | ID `362672704`, prerelease, zero assets | PASS |
| PROGRAM/TASK start state | TASK-015D, TASK-014D4, TASK-016 absent/unstarted | PASS |
| experimental root | ignored and untracked through `.git/info/exclude` | PASS |
| tracked MP4 | `0` | PASS |
| rights SHA-256 | `335cef8824d574c4999492ae32201c79eb76683a78c342e1ae23696a85cc45f4` | PASS |
| provenance SHA-256 | `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758` | PASS |
| local policy backup | `a910e0ca44fd5f77fb12e575208eb9b05323a009` | PASS |
| local Sharp fix | `96eaa1c329f18011497cc2b34b76a7faf91c3b92` | PASS |
| baseline verification | Node `24.18.0`, pnpm `11.9.0`, 508/508 | PASS |

The four existing annotated tags are `v0.2.0`, `v0.3.0`, `v0.4.0`, and
`v0.5.0`. The four existing GitHub Releases are prereleases:

| Tag | Tag object | Peeled commit | Release ID |
| --- | --- | --- | --- |
| `v0.2.0` | `e51960faa43205f1eb75730cd66943b4700dffb3` | recorded historical target | `359926454` |
| `v0.3.0` | `4cfc8461b098455d401251463332240adf408e4b` | recorded historical target | `360795078` |
| `v0.4.0` | `cdd3035c78ff8c062f7df795df9095515fd57ba6` | recorded historical target | `361906821` |
| `v0.5.0` | `ee030924b6728f5f7b6ff9afc1339a58047adca3` | `8e12a07619ec1bfc9c47590b862f91fbf2edf669` | `362672704` |

No tag or Release may be modified by PROGRAM-015D.

## Protected refs

The Phase 0 audit recorded these local backup/recovery/archive refs and keeps
all of them immutable:

| Ref | Commit |
| --- | --- |
| `archive/old-task-007-cross-engine` | `ed0923b466e457da7ce9932e0daf6644aa29df39` |
| `backup/policy-local-experimental-before-sharp-regression-fix` | `a910e0ca44fd5f77fb12e575208eb9b05323a009` |
| `backup/program-015-before-live-evidence-remediation` | `0cca4b20bb302e4e80c4b46aa8df541cb4f0a7f6` |
| `backup/program-015-before-sharp-race-fix` | `99cba19245b767d7bfdeff40355638cf8921a328` |
| `backup/task-014a-before-infrastructure-sync` | `d708aa79d283dfafc9f44e1e0136034e3ff1161a` |
| `backup/task-014b-before-task-014a1-sync` | `8ecd954704664603aa9655e06565a592f6a54b7c` |
| `recovery/task-013r1-minimal-cocos-harness` | `f03e6ea07d2b261f9ec521a31e1677bc10282b5a` |
| `recovery/task-013r2-base-rig-bridge` | `726859ebec11d6a09ecab5984fe1352fd62fd93a` |
| `recovery/task-013r3-single-attachment-bridge` | `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c` |
| `recovery/task-013r4-head-accessory-layering` | `90a8bf3acf8712f3c4923d25e7b9e50359f47a2b` |
| `recovery/task-013r5-garment-layering` | `1f87032bf45e806c9db6360c9a7837c97baa93b2` |
| `recovery/task-013r6-one-handed-prop-integration` | `5d708cb676c626244218e82a9e2fd9343aa5f736` |
| `recovery/task-013r7-full-loadout-release-candidate` | `5316b2475fe9e94b35b4906168b44fa12ee9649d` |

## Worktree inventory

All non-current worktrees were clean at Phase 0. The worktrees and states were:

- `/Users/wukaibing/Codex/GameAI-Pipline`: switched from the protected policy
  backup to the PROGRAM-015D branch; only the task plan and the pre-existing
  untracked review-editor design seed were present when work began.
- `/private/tmp/task014a1-persistent-lifecycle-coalescing`: clean `main`.
- `/private/tmp/ci-ffmpeg-fix.fvMtsh`,
  `/private/tmp/gameai-local-experimental-policy-final`,
  `/private/tmp/gameai-sharp-regression-fix`,
  `/private/tmp/gameai-v030-docs`, `/private/tmp/gameai-v050-release`,
  `/private/tmp/sharp-race-fix.H0UpCB`, and
  `/private/tmp/task013r1-creator-class-identity`: clean retained branch
  worktrees; several upstream branches are intentionally gone.
- `/private/tmp/program015-evidence.DxFUvc`,
  `/private/tmp/program015-external-review.RLGSzZ`,
  `/private/tmp/program015-final-review-evidence.WrVtAg`, and
  `/private/tmp/program015-final-review-feature.zbgy9d`: clean detached
  retained PROGRAM-015 review worktrees.

PROGRAM-015D does not modify, prune, remove, or repoint any retained worktree.

## Architecture audit

### Repository and UI

- The repository is an eleven-project pnpm workspace using Node 24, pnpm 11,
  TypeScript 5.8, CommonJS package builds, strict typechecking, and Node's test
  runner.
- Existing editor UI is dependency-free native TypeScript/DOM in
  `source/panels/default.ts`, with Cocos theme variables and
  `Editor.Message.request`. There is no reusable React/Vue/Svelte component
  stack to preserve.
- The accepted extension flow is Panel → Main validation/AssetDB → correlated
  Scene Script mutation. PROGRAM-015D reuses the message boundary but keeps
  review commands separate from rig generation.

### Contracts and runtime reuse

- Character Rig, Rig Layout, Attachment Layout, Rig Animation, Character
  Semantic Events, VFX Authoring, and concrete Cocos Render Plan boundaries
  are already versioned and engine neutral.
- Rig Animation supplies normalized tracks, deterministic absolute sampling,
  drift-free playback, rest-pose composition, and pure hierarchy evaluation.
- PROGRAM-015 provides the accepted Red Cap 19-part layout, Rest/Idle/Walk/Wave
  clips, semantic events, production atlas, motion harness, showcase runtime,
  D1 render plans, and D2 Cocos renderer host.
- TASK-014D1/D2/D3 provide fail-closed authoring compilation, exact time
  sampling, typed concrete descriptors, shared runtime ownership, cleanup,
  sorting, spatial diagnostics, and canonical loadout integration. Review
  consumes their public state; it does not fork renderer/time/lifecycle logic.

### CI, generated output, and metadata

- CI asserts no tracked build output, installs FFmpeg, performs a frozen
  install, runs `pnpm verify`, and requires a clean generated-output diff.
- Cocos CI typechecking uses only tracked `assets/**/*.ts` and
  `types/cc-ci.d.ts`. Every new `cc` import must be added to the strict tracked
  declaration and synchronized import test.
- Creator-owned Scenes and `.meta` UUIDs are globally audited. PROGRAM-015D
  adds no Scene and manufactures no Creator UUID.
- Existing generated runtime mirrors are exact-source checked. Review code is
  host-neutral source, so no D1 generated mirror is introduced. Any later
  mirror must join exact file-set closure and metadata tests.

## Architecture

```text
Shared Workspace UI
        ↓
Animation Review Core
        ↓
Local Review Service
        ↓
Versioned Engine Adapter Protocol
        ↓
Cocos Scene Adapter / Runtime
```

The shared UI owns presentation and user intent, not engine state. The core
owns validation, deterministic analysis, revisions, decisions, adjustments,
and export. The service owns loopback transport, bounded persistence for the
process lifetime, and safe asset access. The adapter protocol owns correlated
commands and snapshots. Cocos owns engine state, Scene lookup, playback,
overlays, and actual runtime diagnostics.

## Deliverables

- [TASK-015D1](TASK-015D1-review-contracts-core.md)
- [TASK-015D2](TASK-015D2-cocos-adapter-compact-panel.md)
- [TASK-015D3](TASK-015D3-standalone-workspace-mvp.md)
- [TASK-015D4](TASK-015D4-ai-human-review-loop.md)
- [RFC-0016](../docs/rfc/RFC-0016-animation-review-workspace.md)
- [ADR-0019](../docs/adr/ADR-0019-engine-neutral-review-core-cocos-bridge.md)
- [ADR-0020](../docs/adr/ADR-0020-local-review-service-shared-ui-boundary.md)
- [Program acceptance](../docs/acceptance/PROGRAM-015D-animation-review-workspace.md)

## Program acceptance criteria

1. D1–D4 close on one branch as exactly four append-only commits.
2. The review and adapter contracts are versioned, schema-backed, deterministic,
   engine neutral, and fail closed with stable diagnostics.
3. Cocos compact Panel and standalone browser use the same TypeScript UI model.
4. The standalone preview renders accepted Red Cap parts and exposes structure,
   timeline, playback, seek/step, overlays, findings, checklist, decisions,
   edits, revalidation, and export.
5. Cocos commands operate on the existing PROGRAM-015 motion runtime through a
   correlated Panel → Main → Scene bridge without Scene mutation or duplicate
   ownership.
6. AI proposals never apply without a human decision; every change creates an
   immutable revision and audit entry and leaves source clips untouched.
7. Loopback/path/body/version/revision security checks, focused tests, full
   working-copy and tracked-only verification, generated/metadata closure,
   scope/media/protected-ref audits, and Draft PR CI pass.
8. One Draft PR remains unmerged for the single external code/UI/Creator
   review. `v0.6.0`, Tag, Release, TASK-014D4, and TASK-016 remain untouched.

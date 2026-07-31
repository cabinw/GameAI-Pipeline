# PROGRAM-015D Product Owner Acceptance

## Current status

`integrated-pending-product-owner-acceptance`.

| Gate | State |
| --- | --- |
| Implementation | MERGED |
| Automated verification | PASS |
| Creator technical verification | PASS |
| Product Owner Acceptance | PENDING |
| Overall product acceptance | INCOMPLETE |

PR #27 integrated the implementation into `main` at
`4b7a8db34ed00a3d6ef99720c15eeafb96ed702e`. That merge and its technical
checks do not constitute Product Owner Acceptance. The project owner has not
yet completed the formal hands-on editor review.

Only the project owner may change Product Owner Acceptance to PASS. Codex must
not infer that decision from successful startup, screenshots, tests, Creator
operation, or its own visual judgment.

## Authority and release gate

The only valid final-pass instruction is an explicit project-owner statement:

> PROGRAM-015D Product Owner Acceptance通过，所有Blocker和Major问题已解决，其余延期项已经确认，可以完成最终验收封口。

Until that statement is received:

- overall product acceptance remains INCOMPLETE;
- the acceptance PR remains Draft and unmerged;
- `v0.6.0` and TASK-016 remain blocked;
- Codex cannot use `CLOSED_BY_PRODUCT_OWNER`;
- TASK-015E, TASK-016, and TASK-014D4 remain unstarted.

Even after the statement is received, merging the acceptance PR requires a
separate explicit authorization.

## Protected implementation baseline

The following implemented behavior must remain present but still requires
hands-on owner acceptance:

1. The character Preview uses an independent green-screen background.
2. Play and Pause are one Playback Toggle: STOPPED/PAUSED enters PLAYING and
   shows Pause; PLAYING enters PAUSED and shows Play.
3. High-frequency `currentTime` refresh is independent from the Playback
   Button lifecycle, so refresh cannot rebuild the button, duplicate listeners,
   or discard a click.

Standalone and Compact Panel share one Session, revision, command, and
playback authority. AI proposes diagnoses and Patches; a human owns Preview,
adjustment, acceptance, Apply, and human-judgment decisions.

## Acceptance rounds

### Round 1 — UI and information architecture

State: PENDING PROJECT OWNER FINDINGS.

The owner reviews:

- overall layout, Preview size, green screen, Timeline placement/readability;
- clip selection, AI diagnosis, Patch editing, Validation Checklist;
- History, Export, labels/icons, typography, color, spacing, hierarchy;
- scrolling, resizing, Compact Panel density, direct versus advanced actions;
- whether the product follows animation-editor intuition.

Startup alone does not pass Round 1. Codex collects the complete round before
recording or changing anything, then proposes one consolidated remediation
scope. All BLOCKER and MAJOR findings require owner closure before Round 2.

### Round 2 — Interaction and workflow

State: NOT STARTED; blocked by Round 1.

The owner must exercise character/clip selection, Playback Toggle, seek,
frame-step, AI diagnosis, Timeline navigation, accept/reject, Patch editing,
Preview, Apply, reanalysis, Undo/Redo, human judgment, resolution, persistence,
export, and Compact/Standalone synchronization.

### Round 3 — Real production task

State: NOT STARTED; blocked by Round 2.

The owner evaluates whether the editor honestly and efficiently supports the
known Red Cap Wave segmentation/layering defects and Walk pose/gait defects.
The editor must distinguish technical checks from visual judgment, identify
clip/time/part/rule, classify patchable versus source-asset work, avoid false
rotation/curve repairs, persist human FAIL decisions, and never auto-pass a
human-judgment rule.

### Final regression

State: NOT STARTED; blocked by owner closure of all prior BLOCKER and MAJOR
findings.

The owner repeats the complete Standalone, Compact Panel, Creator, Session,
rebuild, reconnect, Exact Reset, export, and historical-defect workflow.
Automated regression remains supporting evidence only.

## Known Red Cap facts retained for Round 3

Wave currently has body-arm residue, duplicate limbs, shoulder/elbow/wrist
seams, insufficient hidden connection pixels, incorrect occlusion, and cuts.
Walk currently has support-balance, Contact/Down/Passing/Up pose, knee/arm
swing, gait symmetry, and loop-continuity problems. These content defects are
not repaired in PROGRAM-015D and must not be mislabeled as visual PASS.

## Evidence boundary

All screenshots, recordings, Sessions, and exports for this acceptance stay
ignored, untracked, and local-only under:

`artifacts/experimental/program-015d-product-owner-acceptance/`

They must never enter Git, a PR, an evidence branch, a Tag, or a Release.

## Feedback workflow

Each round follows one sequence:

complete feedback collection → stable ledger IDs → consolidated scope →
focused remediation → automated regression → owner retest → owner closure.

Acceptance rounds have no fixed upper limit. A new BLOCKER or MAJOR keeps the
program in the current or an added round until the owner resolves it.

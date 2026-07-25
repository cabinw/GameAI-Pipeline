# TASK-013R7: Recovered Full-Loadout Release Candidate

## Objective

Consolidate the externally accepted TASK-013R1-R6 recovery chain behind one
canonical Cocos adapter entry point and one Creator-owned canonical Scene.
This task proves release-candidate identity and exact parity; it adds no
attachment family or runtime capability.

## Baseline and safety

- Branch from accepted R6 commit
  `5d708cb676c626244218e82a9e2fd9343aa5f736`.
- Do not advance or rewrite accepted R1-R6 branches, `main`, frozen TASK-013,
  `evidence/task-013`, or the protected archive.
- Keep the accepted R6 Scene unchanged for live parity testing.
- Keep the original TASK-013 Full Loadout Scene and runtime files unchanged.
- Do not create a PR or merge a recovery branch.

## Canonical boundary

- Add one fixture-neutral canonical adapter facade that wraps or re-exports
  the accepted R6 implementation boundary.
- The canonical adapter consumes the engine-neutral resolved rig, animation,
  attachment, garment, prop, socket, grip, semantic state, and sorting data.
- Do not duplicate pivots, hierarchy, attachment membership, transforms,
  resource paths, state IDs, animation IDs, input mappings, ordering, reset
  defaults, or tolerance values.
- The accepted R6 plan and canonical plan must remain structurally equal.
- Unknown resources, states, slots, parents, roles, or clips continue to fail
  closed without fallback.

## Required parity

Automated canonical/R6 parity must cover:

- all 12 garment/accessory/prop state IDs and resolved membership;
- no-prop, left-hand prop, and right-hand prop semantics;
- the complete frozen resource manifest;
- semantic action IDs, displayed keys, Cocos KeyCodes, HUD labels, and typed
  handler intents;
- production/debug/HUD global sorting policy and resolved orders;
- Rest, Wave, Prop Swing, and Integration Stress semantic clip IDs;
- Exact Reset defaults; and
- the `0.5 px` runtime spatial tolerance.

## Creator-owned Scene

Create and save
`assets/composable-character-loadout-reference-v2.scene` through Cocos
Creator 3.8.8. Creator owns the Scene UUID, script UUID, imported metadata,
and serialized component class ID. Repository scripts may validate those
identities but may not synthesize or replace them.

The canonical Scene contains one canonical adapter component and may reuse
the accepted R6 runtime implementation through inheritance or composition.
It must not contain or invoke the superseded monolithic TASK-013 component.

## Creator one-pass gate

In one uninterrupted run:

1. clean import/open the canonical Scene;
2. switch to another valid Scene and reopen the canonical Scene;
3. confirm a second lifecycle initialization;
4. require zero relevant Creator and Preview Console warnings/errors;
5. require terminal manifest PASS;
6. exercise all 12 states and no/left/right prop selection;
7. run Rest, Wave, Prop Swing, and Integration Stress;
8. exercise Pause/Resume;
9. enable spatial debug and transform stress;
10. require every measured error at `<= 0.5 px`;
11. perform two lifecycle rebuilds;
12. after each rebuild, switch garment, accessories, and prop states and
    require zero duplicate nodes, listeners, or resource requests;
13. perform Exact Reset and hold authored Rest, STOPPED, 0.00, documented
    defaults, transform stress OFF, and Debug OFF; then
14. open accepted R6 and smoke-test default, left prop, right prop,
    Integration Stress, and Exact Reset.

Any canonical failure or canonical/R6 live difference is a hard stop. Do not
patch after beginning the live gate, record misleading evidence, create a PR,
or start another task.

## Automated validation

Run:

```text
CI=true pnpm verify
pnpm install --frozen-lockfile
CI=true pnpm verify
```

Tracked-files-only validation must include deterministic generation,
canonical/R6 parity, Scene/meta identity, one canonical component, manifest
integrity, and zero tracked MP4 files.

## Evidence

Only after every automated and live gate passes:

- commit and push the R7 branch;
- record one continuous real Creator 3.8.8 Web Preview video of the canonical
  Scene covering all states, clips, diagnostics, transform stress, two
  rebuilds, post-rebuild switching, Exact Reset, and final clean state;
- encode H.264 High, 1280x720, 30 fps, yuv420p;
- fully decode and record size, duration, frame count, and SHA-256;
- publish temporarily on `evidence/task-013r7` with exact feature SHA,
  canonical Scene path, parity result, lifecycle start/final counters,
  spatial maxima, and media metadata; and
- re-download and verify identical bytes, hash, frame count, metadata, and
  complete decode.

Stop for external visual review without a PR.

## Non-goals

No new attachment family, schema or resolver change, broad R1-R6 rewrite,
old monolithic runtime repair, Red Cap reconstruction, IK, physics, blending,
root motion, VFX, Unity/Godot adapter implementation, TASK-014, PR, or merge.

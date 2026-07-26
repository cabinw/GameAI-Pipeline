# TASK-013R6: Generic One-Handed Prop Integration

## Objective

Extend the accepted TASK-013R1-R5 recovered Cocos runtime adapter with one
generic, engine-neutral one-handed prop capability. Use the existing TASK-012
fixture to prove authored left-hand, right-hand, and no-prop states without
copying the frozen monolithic TASK-013 runtime or introducing item-specific
shared behavior.

## Baseline and safety

- Branch from accepted R5 commit
  `1f87032bf45e806c9db6360c9a7837c97baa93b2`.
- Do not modify accepted R1-R5 branches, `main`, frozen TASK-013,
  `evidence/task-013`, or the protected archive.
- Do not modify or delete the old Full Loadout demo.
- Do not create a PR or merge a recovery branch.

## Required state model

Resolve the deterministic cross-product of:

- garment: disabled or enabled;
- accessories: disabled or enabled; and
- prop: no prop, left-hand prop, or right-hand prop.

The resulting 12 states must have stable semantic IDs and exact membership.
No-prop states contain zero prop nodes. Left/right states contain exactly one
active prop resolved from authored contract data.

## Engine-neutral source

- Reuse the published TASK-012 prop contract, hand sockets, grip anchors,
  authored local transforms, prop states, sorting/layer roles, assets, and
  semantic clips.
- Reuse TASK-011 garment and TASK-010 accessory data already bridged by R5.
- Do not infer side, resource, transform, slot, clip, or role from filenames,
  display names, or array indices.
- Do not implicitly mirror authored transforms.
- Reject unknown states, hand sockets, slots, attachments, parents,
  resources, roles, and clips without fallback.

## Adapter architecture

- Create one independent Creator-owned R6 Scene and metadata identity.
- Reuse the accepted lifecycle state machine, generation token, terminal
  manifest coordinator, semantic input registry, global sorting registry,
  Base Rig Bridge, generic attachment collection, garment seam measurement,
  DebugOverlayRoot, world-to-overlay-local projector, and runtime assertions.
- Extend those boundaries through small fixture-neutral modules instead of a
  monolithic component.
- Gate all runtime construction on complete manifest success.
- Teardown and rebuild must remove generated nodes, listeners, requests, and
  stale generation callbacks before creating a new runtime.

## Runtime behavior

Registry-owned semantic actions must provide:

- garment OFF/ON;
- accessories OFF/ON;
- no prop, left prop, and right prop;
- Rest, Wave, Prop Swing, and Integration Stress;
- Pause/Resume;
- Exact Reset;
- Debug ON/OFF;
- Transform Stress; and
- Lifecycle Rebuild.

HUD help, displayed keys, Cocos key codes, typed handlers, and dispatch must
derive from the same registry.

Exact Reset restores authored Rest, STOPPED, time 0.00, documented default
garment/accessory/prop states, transform stress OFF, Debug OFF, no residual
debug geometry, and no duplicate runtime nodes.

## Spatial and sorting acceptance

Measure current Creator runtime world positions. The active prop grip error is
the world-space distance between the declared active hand socket and the
active prop grip anchor.

- joint marker error: `<= 0.5 px`;
- Skeleton endpoint error: `<= 0.5 px`;
- accessory socket-to-anchor error: `<= 0.5 px`;
- garment seam error: `<= 0.5 px`;
- prop socket-to-grip error: `<= 0.5 px`;
- non-finite coordinates: 0;
- unknown sockets/slots/states: 0;
- duplicate prop/garment/accessory nodes: 0;
- duplicate input handlers/resource requests: 0;
- sorting/front-back role violations: 0;
- debug geometry outside the viewport: 0.

Prop ordering relative to garment back/front layers, torso/body, arm/hand,
head accessories, debug, and HUD must come from generic contract roles and
the accepted global sorting registry.

## Animation acceptance

- Rest reconstructs the authored pose.
- Wave preserves all active relationships.
- Prop Swing visibly exercises the selected hand, forearm/upper-arm chain,
  prop orientation, and grip lock.
- Integration Stress exercises garment seams, accessory sockets, and prop
  grip simultaneously.
- Prop Swing and Integration Stress are continuously validated at 60 Hz.

## Automated validation

Add deterministic tests for:

- all 12 cross-product states;
- left/right/no-prop resolution;
- reordered input stability;
- unknown prop state and hand socket rejection;
- duplicate prop rejection;
- stable manifest and one request per resource;
- semantic control registry;
- global sorting and front/back roles;
- actual world-space grip measurement;
- 60 Hz Prop Swing and Integration Stress validation;
- lifecycle rebuild and Exact Reset;
- generated resource reproducibility;
- Creator Scene/meta integrity; and
- tracked-files-only frozen verification.

Required commands:

```text
CI=true pnpm verify
pnpm install --frozen-lockfile
CI=true pnpm verify
```

## Creator 3.8.8 one-pass gate

In one uninterrupted final run:

1. clean import/open the R6 Scene;
2. switch to another valid Scene and reopen R6;
3. confirm a second initialization;
4. require zero relevant Creator and Preview Console warnings/errors;
5. require terminal manifest PASS;
6. exercise all 12 states;
7. visually verify no/left/right prop;
8. run Rest, Wave, Prop Swing, and Integration Stress;
9. exercise Pause/Resume;
10. enable all required spatial debug overlays;
11. apply translation, scale, rotation, and nested-transform stress;
12. confirm every measured error is within tolerance;
13. perform Lifecycle Rebuild;
14. after rebuild, switch prop OFF/left/right/OFF, garment OFF/ON, and
    accessories OFF/ON;
15. confirm one character and no duplicate response or node; and
16. perform Exact Reset and hold the final Debug-OFF state for two seconds.

If any live lifecycle, resource, control, HUD, visual, sorting, projection,
grip, seam, duplicate, or Reset defect appears, stop immediately without
patching, committing, recording evidence, or starting another task.

## Evidence

Only after every gate passes:

- commit and push the R6 feature branch;
- record one continuous real Creator 3.8.8 Web Preview video covering the
  required states, clips, diagnostics, stress, rebuild, post-rebuild
  switching, Reset, and final clean state;
- encode H.264 High, 1280x720, 30 fps, yuv420p;
- record duration, frames, size, and SHA-256 and fully decode locally;
- publish temporarily on `evidence/task-013r6` with exact feature SHA and
  `captureSource`;
- re-download and verify identical SHA-256, metadata, frame count, and full
  decode; and
- stop for external visual review without a PR.

## Non-goals

No two-handed props, inverse grip solving, IK, prop physics, collision,
combat, mesh deformation, cloth physics, automatic garment fitting,
animation blending, root motion, Unity/Godot adapters, Windows support,
original Red Cap reconstruction, old Full Loadout migration, TASK-013R7, or
TASK-014.

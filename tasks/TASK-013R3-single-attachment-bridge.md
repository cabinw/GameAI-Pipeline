# TASK-013R3: Single Attachment Bridge

## Objective

Connect exactly one resolved engine-neutral rigid attachment to the accepted
TASK-013R2 production-lite Base Rig Bridge. Prove that an attachment can be
resolved, loaded, mounted, animated, toggled, measured, rebuilt, and reset
through the accepted runtime boundaries without reconnecting the old
monolithic TASK-013 Full Loadout demo.

The production-lite sunglasses are acceptance data. Core adapter behavior must
remain generic.

## Baseline and safety

- Branch: `recovery/task-013r3-single-attachment-bridge`
- Accepted R2 baseline:
  `726859ebec11d6a09ecab5984fe1352fd62fd93a`
- Accepted R1:
  `f03e6ea07d2b261f9ec521a31e1677bc10282b5a`
- Frozen TASK-013:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`:
  `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence:
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive:
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

Do not modify or delete the old Full Loadout scene, production assets,
engine-neutral schemas/resolvers, frozen branches, or accepted R1/R2
boundaries.

## Required runtime

Create a separate Creator 3.8.8-owned scene that loads and displays:

- the accepted 17-part production-lite Base Rig;
- one head attachment slot resolved from the existing Attachment Layout;
- one resolved sunglasses attachment;
- Base-only and Base-plus-attachment states;
- semantic attachment enable/disable control;
- Rest, Wave, and Integration Stress;
- Pause/Resume and exact Reset;
- root translation, scale, and rotation stress;
- lifecycle rebuild;
- joints and live parent-child skeleton;
- socket and attachment-anchor markers;
- numerical socket-to-anchor error; and
- registry-derived HUD and controls.

Exact Reset restores authored Rest, time zero, `STOPPED`, the documented
default attachment-enabled state, transform stress, and Debug OFF.

## Adapter architecture

- Parse and validate the existing engine-neutral Attachment Layout.
- Resolve attachment state through `resolveAttachmentLayout`.
- Build a deterministic generic bridge plan from the resolved attachment,
  compatible base rig, and decoded asset dimensions.
- Parent the runtime slot by declared parent-part identity, never by display
  name search.
- Represent the slot transform and attachment transform as ordinary runtime
  nodes below that parent.
- Use the declared attachment anchor for Sprite placement.
- Extend the logical resource manifest with the resolved attachment resource.
- Map attachment draw order through the accepted global sorting registry.
- Measure actual runtime slot/socket and attachment-anchor world positions.
- Project both markers through the accepted world-to-overlay-local projector.
- Fail clearly for unknown slots, attachments, parents, resources, clips, and
  semantic actions.

No core or runtime module may branch on fixture names such as sunglasses,
glasses, face, or head.

## Spatial acceptance

In Rest, Wave, and Integration Stress, including root transform stress:

- projected joint-marker error `<= 0.5 px`;
- skeleton endpoint-to-joint error `<= 0.5 px`;
- socket-to-anchor world error `<= 0.5 px`;
- non-finite positions: 0;
- unknown slots: 0;
- duplicate attachment nodes: 0;
- production/debug/HUD sorting violations: 0; and
- debug geometry outside the character region: 0.

The socket and anchor observations must be read from their current runtime
world transforms. No fixed Canvas compensation, character-specific offset, or
fixture-specific placement correction is permitted.

## Automated acceptance

- deterministic single-attachment plan from the existing resolver output;
- Base-only and Base-plus-attachment state resolution;
- unknown slot/attachment/parent/resource failures;
- deterministic complete resource manifest with one request per logical ID;
- semantic input registry as the sole HUD/dispatcher definition;
- exact Reset and default attachment state;
- generic global sorting validation;
- socket/anchor and hierarchy spatial validation;
- lifecycle and duplicate-listener/attachment coverage;
- generated runtime mirrors;
- Creator scene/script/resource metadata integrity;
- working-copy `CI=true pnpm verify`; and
- tracked-files-only frozen install and `CI=true pnpm verify`.

Source-string assertions are secondary safeguards only.

## Creator acceptance

In one uninterrupted Creator 3.8.8 run:

1. clean open;
2. switch to another accepted scene and reopen R3;
3. second lifecycle initialization;
4. Creator and Preview Consoles clean;
5. terminal manifest PASS for all base and attachment resources;
6. Base-only shows no attachment;
7. enabled state shows exactly one attachment;
8. Rest, Wave, and Integration Stress retain attachment alignment;
9. Pause freezes and Resume continues;
10. translation, scale, and rotation preserve debug alignment;
11. disable removes the attachment and re-enable creates no duplicate;
12. lifecycle rebuild leaves one character and at most one attachment;
13. exact Reset returns to stopped time-zero Rest with the default attachment
    enabled and Debug OFF; and
14. Debug OFF removes all debug geometry.

## Evidence

After the complete gate and both verification modes pass:

- commit and push the R3 branch;
- record `task-013r3-single-attachment-bridge.mp4` from Creator 3.8.8
  Web Preview;
- require H.264 High, 1280 x 720, 30 fps, `yuv420p`, SHA-256, and
  full decode;
- publish temporarily on `evidence/task-013r3`;
- re-download and verify identical SHA-256 and complete decode; and
- stop for external visual review.

## Non-goals

No cap, front/back attachment layering, multiple simultaneous attachments,
garment, sleeves, cuffs, seams, prop, grip, comparison view, eight loadout
presets, old Full Loadout scene work, Red Cap, Unity, Godot, VFX, TASK-013R4,
TASK-014, PR, or merge.

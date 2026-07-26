# TASK-013R4: Head Accessory Layering Bridge

## Objective

Extend the accepted TASK-013R3 generic rigid-attachment runtime from one
resolved attachment to a deterministic collection of simultaneously active
head attachments. Prove generic front/back layer roles with the existing
production-lite cap and sunglasses fixtures without reconnecting the old
monolithic TASK-013 Full Loadout demo.

The cap and sunglasses are acceptance data. Core adapter behavior must remain
generic.

## Baseline and safety

- Branch: `recovery/task-013r4-head-accessory-layering`
- Accepted R3 baseline:
  `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c`
- Accepted R2:
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
engine-neutral schemas/resolvers, frozen branches, or accepted R1-R3
boundaries.

## Required states

1. Base only
2. Cap only
3. Sunglasses only
4. Cap plus sunglasses

Each state must have a stable semantic ID, deterministic active attachment
IDs, a registry-derived control and HUD label, and an exact expected active
attachment-part count.

## Required runtime

Create a separate Creator 3.8.8-owned scene that loads and displays:

- the accepted 17-part production-lite Base Rig;
- the existing headwear and eyewear slots;
- the cap back and cap front attachment parts;
- the sunglasses attachment;
- all four required enabled states;
- generic front/back layer roles and deterministic sorting;
- Rest, Wave, and Integration Stress;
- Pause/Resume and exact Reset;
- root translation, scale, and rotation stress;
- lifecycle rebuild;
- joints and live parent-child Skeleton;
- per-attachment socket and anchor markers;
- numerical maximum socket-to-anchor error; and
- registry-derived HUD, controls, attachment counts, duplicate counts, and
  sorting diagnostics.

Exact Reset restores authored Rest, time zero, `STOPPED`, the documented
default head-accessory state, transform stress, no duplicate nodes, and Debug
OFF.

## Adapter architecture

- Parse and validate the existing engine-neutral Attachment Layout.
- Resolve each required state through `resolveAttachmentLayout`.
- Build one deterministic generic bridge plan containing an ordered collection
  of resolved attachments.
- Key runtime attachment identity by declared attachment ID and slot ID.
- Parent every runtime slot by declared base part identity, never by display
  name or resource filename search.
- Apply generic slot, attachment, anchor, transform, enabled state, resource,
  layer role, and draw-order fields.
- Resolve production sorting through the accepted global sorting registry.
- Measure every active runtime socket and attachment anchor using current world
  transforms and project markers through `DebugOverlayRoot` local space.
- Reject unknown slots, roles, attachments, parents, resources, semantic
  states, and clips without fallback.

No core or runtime module may branch on fixture names such as cap,
sunglasses, glasses, face, headwear, or eyewear.

## Spatial and layer acceptance

In every state and in Rest, Wave, and Integration Stress, including root
transform stress:

- projected joint-marker error `<= 0.5 px`;
- Skeleton endpoint-to-joint error `<= 0.5 px`;
- every active socket-to-anchor world error `<= 0.5 px`;
- non-finite positions: 0;
- unknown slots: 0;
- duplicate active attachment IDs/nodes: 0;
- production/debug/HUD sorting violations: 0;
- front/back role violations: 0; and
- debug geometry outside the character region: 0.

No fixed Canvas compensation, character-specific offset, fixture-specific
placement correction, or hard-coded sorting number is permitted.

## Automated acceptance

- deterministic resolution for all four states;
- exact active attachment IDs and counts per state;
- duplicate attachment-ID and prohibited slot-collision rejection;
- deterministic complete resource manifest with one request per logical ID;
- stable generic front/back role and total-order validation;
- semantic input registry as the sole HUD/dispatcher definition;
- exact Reset and documented default accessory state;
- per-attachment socket/anchor and hierarchy spatial validation;
- lifecycle and duplicate-listener/request/node coverage;
- generated runtime mirrors;
- Creator Scene/script/resource metadata integrity;
- working-copy `CI=true pnpm verify`; and
- tracked-files-only frozen install and `CI=true pnpm verify`.

Source-string assertions are secondary safeguards only.

## Creator acceptance

In one uninterrupted Creator 3.8.8 run:

1. clean import/open;
2. switch to another accepted scene and reopen R4;
3. second lifecycle initialization;
4. Creator and Preview Consoles clean;
5. terminal manifest PASS for every base and attachment resource;
6. Base-only contains no cap or sunglasses;
7. Cap-only contains the complete correctly layered cap set;
8. Sunglasses-only contains exactly one sunglasses attachment;
9. combined state contains exactly the declared cap parts and sunglasses;
10. repeated switching removes inactive visuals and creates no duplicates;
11. Wave and Integration Stress retain attachment alignment and layer order;
12. Pause freezes and Resume continues;
13. translation, scale, and rotation preserve debug alignment;
14. lifecycle rebuild leaves one character and the expected attachments;
15. post-rebuild state switching remains exact and duplicate-free;
16. exact Reset returns to stopped time-zero Rest with the default state and
    Debug OFF; and
17. Debug OFF removes all debug geometry.

## Evidence

Only after the complete gate and both verification modes pass:

- commit and push the R4 branch;
- record `task-013r4-head-accessory-layering.mp4` from Creator 3.8.8 Web
  Preview using a checklist prepared before capture;
- visibly include all four states, repeated switching, per-state counts,
  duplicate and ordering diagnostics, markers, Wave, Integration Stress,
  Pause/Resume, transform stress, lifecycle rebuild counters, post-rebuild
  switching, exact Reset, and at least two seconds of final Debug OFF;
- require H.264 High, 1280 x 720, 30 fps, `yuv420p`, SHA-256, and complete
  decode;
- publish temporarily on `evidence/task-013r4` with per-media uploaded-copy
  verification;
- re-download and verify identical SHA-256, metadata, and full decode; and
- stop for external visual review.

## Non-goals

No garment, sleeves, cuffs, seams, prop, grip, automatic fitting, comparison
view, Full Loadout preset, old Full Loadout scene work, Red Cap, Unity, Godot,
VFX, R5, TASK-014, PR, or merge.

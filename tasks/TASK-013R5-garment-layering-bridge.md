# TASK-013R5: Multi-Part Garment Layering Bridge

## Objective

Extend the accepted TASK-013R1-R4 minimal Cocos runtime adapter from the
production-lite Base Rig and generic head accessories to one resolved generic
multi-part wearable set. Reuse the accepted TASK-011 garment contract and
deterministic assets without reconnecting the old monolithic Full Loadout
demo.

The production-lite casual jacket is acceptance data. Shared runtime modules
must understand only generic attachment, slot, wearable-set, seam, transform,
resource, role, and ordering semantics.

## Baseline and safety

- Branch: `recovery/task-013r5-garment-layering`
- Accepted R4 baseline:
  `90a8bf3acf8712f3c4923d25e7b9e50359f47a2b`
- Accepted R3:
  `47ce5c74113a7f9321a47abc55a5c0ea7a0d3c8c`
- Frozen TASK-013:
  `5170185fdca666300c4d61488f17e15aa18656be`
- Protected `main`:
  `317fd451c6a808cd41788e7ce8e0916701992642`
- Protected evidence:
  `32a4074a3b488ca5a13ebcf9908f0f0ff24085b9`
- Protected archive:
  `ed0923b466e457da7ce9932e0daf6644aa29df39`

Do not merge recovery work into `main`, modify the old Full Loadout scene,
add props, start TASK-014, or change frozen/protected references.

## Required states

1. Base only
2. Garment only
3. Accessories only
4. Garment plus accessories

Each state has a stable semantic ID, deterministic wearable and attachment
membership, registry-derived input/HUD text, and exact expected garment and
accessory part counts.

## Adapter architecture

- Parse the existing TASK-011 Attachment Layout and resolve every required
  state with the published engine-neutral resolver.
- Consume declared slots, wearable-set membership, seams, attachment
  transforms, anchors, resources, roles, and global draw order.
- Extend the accepted R4 attachment collection generically; do not add
  garment-part or jacket-specific branches.
- Reuse the accepted lifecycle, terminal resource coordinator, semantic input
  registry, global sorting registry, Base Rig Bridge,
  world-to-overlay-local projector, spatial assertions, and Creator-owned
  Scene boundary.
- Begin character construction only after the complete frozen manifest
  succeeds. Unknown resources, slots, parents, roles, wearable sets, states,
  actions, and clips fail without fallback.
- Measure seams, accessory socket/anchor alignment, joints, and Skeleton
  endpoints from current Creator runtime world transforms.

## Runtime acceptance

- Manifest requests every base, garment, and accessory resource exactly once.
- Garment and accessory counts match every state.
- No duplicate attachment, garment, input-handler, or resource-request
  identity exists.
- Authored front/back roles and global sorting remain deterministic in Rest,
  Wave, Integration Stress, and transform stress.
- Maximum garment seam error, accessory socket-to-anchor error, joint-marker
  error, and Skeleton endpoint error are each `<= 0.5 px`.
- Unknown slots, non-finite coordinates, sorting/front-back violations, and
  debug geometry outside the character/viewport region are zero.
- Exact Reset restores authored Rest, stopped time zero, documented default
  garment/accessory state, transform stress OFF, Debug OFF, and no residual
  debug geometry.

## Automated acceptance

- deterministic state resolution under reordered declarations;
- exact garment/accessory membership and counts for all four states;
- duplicate, unknown, invalid-role, invalid-order, invalid-seam, and
  incomplete-resource failure coverage;
- semantic input registry as the sole dispatcher and HUD definition;
- deterministic resource manifest and one request per logical ID;
- seam and accessory spatial validation using runtime observations;
- exact Reset, lifecycle, and duplicate-listener/request/node coverage;
- generated runtime mirror reproducibility;
- Creator Scene/script/resource metadata integrity;
- working-copy `CI=true pnpm verify`; and
- tracked-files-only frozen install plus `CI=true pnpm verify`.

Source-string assertions are secondary safeguards, never the primary runtime
oracle.

## Creator one-pass gate

In one uninterrupted Creator 3.8.8 run:

1. clean import/open R5;
2. switch to another valid accepted Scene and reopen R5;
3. perform a second lifecycle initialization;
4. keep Creator and Preview Consoles free of relevant warnings/errors;
5. require terminal manifest PASS before construction;
6. exercise every state and control once;
7. inspect difficult Wave and Integration Stress poses with garment seams and
   accessory sockets visible;
8. exercise Pause/Resume and transform stress;
9. perform Lifecycle Rebuild;
10. after rebuild switch garment OFF/ON and accessories OFF/ON;
11. exact Reset to authored Rest, stopped time zero, default state,
    transform stress OFF, and Debug OFF; and
12. hold the final clean state visibly.

If any lifecycle, resource, HUD, control, sorting, projection, seam, visual,
or duplicate-state gate fails, stop immediately without patching or recording
evidence.

## Evidence

Only after all automated and live gates pass:

- commit and push the R5 branch;
- record one continuous real Creator Web Preview video covering every state,
  Rest/Stress seams, accessory sockets, Wave, Integration Stress,
  Pause/Resume, transform stress, rebuild, post-rebuild switching, exact
  Reset, and final Debug OFF;
- encode H.264 High, 1280 x 720, 30 fps, `yuv420p`;
- verify SHA-256 and complete local decode;
- publish temporarily on `evidence/task-013r5`;
- download the uploaded copy and verify SHA identity, metadata, and complete
  decode; and
- stop for external visual review without a PR, R6, or TASK-014.

## Non-goals

No props, grip handling, IK, cloth physics, mesh deformation, automatic
garment fitting, root motion, animation blending, Unity/Godot adapter,
Windows-specific work, original Red Cap reconstruction, Full Loadout
monolithic migration, TASK-014, PR, or merge.

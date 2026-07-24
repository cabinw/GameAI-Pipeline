# Implementation Plans

Use this file for active multi-file or architectural work. Keep one active plan at a time.

## Completed plan: TASK-008 Simple Sprite Character Bridge

- Status: Complete
- Started: 2026-07-24
- Completed: 2026-07-24
- Baseline: `e2428149de39cb18288f4696796fafd835e82483`
- Branch: `feat/task-008-simple-sprite-character`

### Goal

Prove that repository-owned transparent PNG body parts can use the TASK-007
engine-independent hierarchy, proximal-pivot, local-to-world transform, and
animation system without per-part Cocos corrections before complex Red Cap
character work resumes.

### Scope

- Add a deterministic 15-part simple mannequin fixture: pelvis/root, torso,
  head, paired upper arms, lower arms, hands, thighs, shins, and feet.
- Generate flat-color transparent PNG sprites with rounded joint ends and
  intentional overlap at every articulated connection from a checked-in,
  deterministic generator.
- Describe assembly only through Rig Layout contract fields: stable part and
  parent IDs, file, source canvas, original rectangle, trim offset, anchor,
  local rest pose, draw order, and reference scale.
- Reuse TASK-007 hierarchy validation/evaluation, pivot semantics,
  deterministic sampling, and the rest/idle, arm-wave, and walk-cycle clip
  behavior.
- Add a dedicated Cocos Creator 3.8.x verification scene using real
  SpriteFrames, with sprite and skeleton/debug views, joint, bounds, pivot,
  and parent-link overlays, complete playback controls, and visible clip
  state/time.
- Add contract, PNG, transform parity, mirror, overlap, reset, isolation, and
  clean-checkout regression tests plus working-copy and tracked-only CI runs.
- Record an ignored dynamic MP4 showing Rest → Wave → Pause/Resume → Walk ×3
  → Reset → debug toggles, and document exact preview instructions.

### Out of scope

- Red Cap reconstruction or assumptions, arbitrary image auto-cutting, IK,
  mesh deformation, Unity/Godot adapters, cross-engine compilation, combat,
  Windows Editor support, production artwork, paid dependencies, cloud AI
  APIs, or acceptance-video commits.

### Execution

1. Record this plan and the TASK-008 specification from clean `main`; preserve
   `archive/old-task-007-cross-engine` at
   `ed0923b466e457da7ce9932e0daf6644aa29df39`.
2. Define the engine-neutral mannequin layout and three compatible data clips,
   then implement deterministic PNG generation and byte-stable regeneration.
3. Build a thin sprite bridge and Cocos fixture scene that consume validated
   contract data unchanged and apply sampled transforms only to Joint nodes.
4. Test image properties, hierarchy/IDs, anchors/pivots, ordering, sprite to
   skeleton parity, mirrored semantics, animated overlap, exact reset, Red Cap
   isolation, and tracked clean-CI configuration.
5. Run `CI=true pnpm verify` in the working copy and from a tracked-files-only
   archive checkout.
6. Open the dedicated scene in Cocos Creator 3.8.x, exercise every control,
   record and review the required ignored MP4, and write the acceptance report.
7. Review the scoped diff, commit, push the feature branch, and stop for
   manual visual review without creating a pull request.

### Done when

- All 15 transparent PNG parts exist, have the authored dimensions and alpha,
  regenerate byte-identically, and visibly overlap at every declared joint
  throughout the intended animation ranges.
- The complete character is assembled from the published contract fields with
  no per-part correction constants in Cocos scene code.
- Sprite transforms equal evaluator skeleton transforms at deterministic
  samples; anatomical mirror semantics, unique draw order, and exact rest
  reset pass automated tests.
- The Cocos scene exposes sprite/skeleton views, all requested debug overlays,
  Rest/Arm Wave/Walk, pause/resume, reset, and clip/state/time display.
- Both required `CI=true pnpm verify` runs pass from clean inputs.
- The dynamic acceptance MP4 exists outside Git, the branch is committed and
  pushed, exact scene/preview instructions are documented, and work stops
  before PR creation for manual visual review.

### Result

- Added a deterministic 15-part transparent-PNG mannequin, its checked-in
  generator, engine-neutral Rig Layout/Character Rig, and three compatible
  animation clips.
- Added a contract-derived Cocos SpriteFrame adapter and dedicated scene with
  synchronized sprite/skeleton views, complete debug overlays, playback
  controls, exact reset, and clip/state/time HUD.
- Verified deterministic PNG generation, hierarchy, anchors/pivots, draw
  order, transform parity, mirrored limbs, animated joint overlap, pause,
  exact reset, complex-art isolation, and clean-checkout-safe Cocos types.
- `CI=true pnpm verify` passes all 151 tests in both the working copy and a
  tracked-files-only archive checkout.
- Reviewed the ignored 21.82-second dynamic MP4 covering Rest, Wave,
  Pause/Resume, Walk for more than three loops, Reset, and all debug toggles.
- No PR was created; the branch stops for manual visual review.

## Completed plan: TASK-007 Minimal Stickman Articulation Reference

- Status: Complete
- Started: 2026-07-24
- Completed: 2026-07-24

### Goal

Prove the reusable rigid-rig hierarchy, proximal pivots, exact rest pose,
local-to-world transform evaluation, mirrored-limb semantics, and deterministic
animation playback with deliberately simple stickman geometry before returning
to complex segmented character art.

### Scope

- Add a 16-part engine-neutral stickman fixture with stable IDs, one explicit
  root, parent relationships, proximal pivots, local rest transforms, and
  unique draw order.
- Reuse the published Rig Layout and Rig Animation 1.0 contracts rather than
  adding a character-specific schema.
- Add pure hierarchy validation and 2D local-to-world evaluation to
  `@gameai/rig-animation`, including rotation, non-uniform scale, and mirrored
  scale semantics.
- Add data-only rest/idle, arm-wave, and walk-cycle articulation clips and
  deterministic sampled evidence.
- Add a thin Cocos Creator 3.8.x demonstration adapter that creates only
  generated primitive graphics, applies sampled local poses to the Joint
  hierarchy, displays clip/playback state, and optionally displays joint
  markers.
- Add a dedicated Cocos verification scene and capture real Scene/Game
  evidence for all three clips.

### Out of scope

- Red Cap reconstruction or assumptions, automatic cutting, production art,
  Unity or Godot adapters, a cross-engine compiler, IK, mesh deformation,
  combat logic, blending, or an animation state machine.

### Execution

1. Record the replacement TASK-007 specification and this plan from clean
   `main` at `daa90d4858ab99e80429d77d4f615493f0fcb8cd`.
2. Create `feat/task-007-stickman-reference` without modifying, merging,
   deleting, or pushing `archive/old-task-007-cross-engine`.
3. Add the engine-neutral fixture, three clips, hierarchy validator, affine
   transform evaluator, deterministic evidence generator, and focused tests.
4. Add the Cocos primitive-shape adapter, runtime clip controls/status/debug
   overlay, and verification scene without adding another engine adapter.
5. Run `pnpm verify`, open the scene in Cocos Creator 3.8.8, inspect rest,
   wave, and walk playback plus pivots/mirroring, and capture evidence.
6. Complete the acceptance report, review the scoped diff, and commit locally
   without pushing until visual review passes.

### Done when

- The exact rest sample reproduces every authored local and world transform.
- Parent rotation visibly and numerically moves descendants around the
  intended shoulder, elbow, hip, and knee pivots.
- Left/right arms and legs obey explicit, tested mirrored semantics.
- Rest/idle, arm-wave, and walk-cycle clips validate and sample
  deterministically without any Red Cap data.
- The dedicated Cocos scene visibly shows the primitive stickman, current clip
  and playback state, and joint markers.
- Real Creator evidence and a written visual inspection record are committed.
- `pnpm verify` passes and the completed task is committed only on
  `feat/task-007-stickman-reference`; publication waits for visual acceptance.

### Result

- Added the engine-neutral 16-part primitive fixture, three versioned clips,
  deterministic evidence, hierarchy validation, and affine local-to-world
  evaluation without adding a schema or Red Cap-specific assumption.
- Added a Cocos Creator-only primitive adapter, generated runtime data,
  dedicated verification scene, clip controls/HUD, and optional joint markers.
- Verified exact rest restoration, descendant inheritance, shoulder/elbow/
  hip/knee pivots, mirrored limbs, and all three clips in Creator 3.8.8 and
  its Web Game Preview; captured five visual evidence images.
- Manual dynamic visual acceptance passed from the 24.9-second Web Preview
  recording: parent/child propagation, shoulder/elbow/hip/knee/ankle pivots,
  loop stability, pause/resume, exact rest reset, marker toggling, and mirrored
  semantics were all accepted.
- The pause evidence occurs at walk-cycle `TIME 0.00s` rather than an
  interpolated mid-cycle pose. This is a documented non-blocking evidence
  limitation.
- `CI=true pnpm verify` passes all 136 tests.
  `archive/old-task-007-cross-engine` remains untouched.

## Completed plan: TASK-006.2 Unmasked Rig Render Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Reject masked or pre-flattened articulation evidence, validate the final
draw-ordered composite rather than pre-composite masks, restore meaningful
joint ranges, and prove the real 19-part hierarchy in Cocos Creator 3.8.8.

### Scope

- Preserve the four rejected TASK-006.1 stress PNGs as invalid regression
  fixtures.
- Remove every `AcceptanceComposite_*` node, generated flattened acceptance
  image, overlay meta, and overlay-generation function.
- Record final-owner counts, bounds, occluders, and hashes after draw-order
  compositing, with strict invariant checks for unrotated head/accessory and
  torso parts.
- Add stable final-invisible, unexpected-occlusion, and final-composite
  mismatch diagnostics.
- Prove rotated right-arm and right-leg branches cannot transform, clip,
  occlude, or erase unrelated sibling parts.
- Restore at least ±8-degree shoulders/hips, ±12-degree elbows/knees, and
  ±6-degree wrists/ankles.
- Regenerate unmasked Cocos scenes and capture hierarchy, Scene, Game Preview,
  and individual-Visual-disable evidence in Creator 3.8.8.

### Out of scope

- TASK-007, Walk, Hit, blending, state machines, IK, mesh deformation, or any
  claim that the rig is Walk-ready without passing the requested ranges.

### Execution

1. Record TASK-006.1 rejection and freeze the four current broken outputs.
2. Remove flattened overlay generation, assets, metas, and scene nodes; add
   structural scene rejection tests.
3. Build final-owner and encoded-composite evidence with invariant hashes and
   occluder diagnostics.
4. Restore minimum stress amplitudes and repair renderer, draw order, or art
   until the complete character remains visible.
5. Open only the segmented hierarchy in Cocos Creator 3.8.8, expand it, and
   prove an individual `Visual_*` toggle changes the acceptance view.
6. Run `CI=true pnpm verify`, review the complete diff, commit as
   `fix: verify unmasked articulated rig rendering`, and push.

### Done when

- All four TASK-006.1 PNGs fail as regression fixtures.
- No acceptance scene contains or renders a flattened full-character overlay.
- Final-owner evidence preserves every unrelated invariant part and matches
  the encoded PNG.
- Minimum target rotations pass without missing parts, cracks, cropped parts,
  or transparent overwrite.
- Neutral visible RGBA differences remain exactly zero.
- Real Cocos evidence shows only the 19-part Joint/Visual hierarchy and full
  CI passes.

## Rejected plan: TASK-006.1 Fix Articulation Visual Acceptance

- Status: Rejected by TASK-006.2
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Replace the rejected TASK-006 visual gate with part-preserving, locally strict
seam and branch validation, child-textured overlap generation, independently
diagnosable stress poses, and real Cocos Creator 3.8.8 evidence.

### Scope

- Preserve the committed broken positive/negative renders as regression
  fixtures that must fail.
- Record per-part source and rendered alpha counts, bounds, transforms,
  clipping, and preservation status for every stress pose.
- Add stable missing-part, out-of-bounds, alpha-loss, disconnected-branch, and
  visible-cut-edge diagnostics.
- Replace parent-texture painting with deterministic nearest-valid child
  texture while retaining parent-defined neutral coverage.
- Replace the 60-pixel overlap search with pivot-local seam connectivity,
  corridor, boundary, and complete-branch checks.
- Render independent positive/negative arm and leg branches before combined
  positive/negative evidence.
- Regenerate Cocos rest and combined stress scenes, open them in Creator 3.8.8,
  and capture required Scene and Game Preview evidence.

### Out of scope

- TASK-007, Walk, Hit, blending, state machines, IK, mesh deformation, or any
  relaxation of the zero-difference neutral invariant.

### Execution

1. Record the TASK-006 rejection and preserve existing dirty Creator-import
   metadata/scene changes without overwriting them.
2. Freeze the rejected PNGs as invalid regression fixtures and prove the new
   validator rejects them.
3. Add per-part render accounting and stable preservation diagnostics.
4. Implement child-textured overlap generation and strict local seam/branch
   topology checks.
5. Generate eight independent branch poses and two combined poses, then
   inspect all evidence visually.
6. Regenerate Cocos scenes, validate in Creator 3.8.8, and capture five real
   engine screenshots.
7. Run `CI=true pnpm verify`, review the full diff, commit as
   `fix: validate articulation stress output visually`, and push.

### Done when

- Broken TASK-006 evidence fails regression checks.
- All new branch and combined poses preserve 19/19 parts and pass strict local
  seam and branch checks.
- No forbidden visual defect remains in generated or real-engine evidence.
- Neutral visible RGBA differences remain exactly zero.
- Creator evidence is committed and full CI passes.

## Completed plan: TASK-006 Articulation-Safe Joint Overlaps

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Extend the accepted Red Cap Remade rigid sprites with deterministic,
neutral-hidden joint overlap art, then prove representative positive and
negative rotations remain connected before adding broader animation behavior.

### Scope

- Add a versioned articulation-safety specification for both shoulders,
  elbows, wrists, hips, knees, and ankles.
- Generate extension pixels deterministically inside declared part-local
  regions while retaining canonical pixels byte-for-byte.
- Strengthen the canonical gate so every noncanonical pixel must be declared,
  neutral-covered, and covered by a strictly higher draw-order part.
- Add a pure stress-pose renderer and stable diagnostics for transparent gaps,
  exposed proximal cut edges, invalid draw order, and the right-hand briefcase
  branch.
- Produce positive/negative stress PNGs, neutral pixel-diff evidence, and
  machine-readable reports.
- Synchronize the engine-neutral fixture into the Cocos AssetDB mirror and add
  rest, positive-stress, and negative-stress acceptance scenes.

### Out of scope

- Walk, Hit, animation blending, state machines, IK, mesh deformation,
  retargeting, or changes to the accepted neutral silhouette and visible RGBA
  pixels.

### Execution

1. Record TASK-006 and its exact invariants before implementation.
2. Define joint coverage, rotation amplitudes, extension ownership, and
   covering draw-order relationships as deterministic fixture data.
3. Generate only neutral-covered extension pixels, preserving all existing
   canonical pixels, then run the canonical gate.
4. Render and validate both stress directions, including the complete
   `upper-arm-right → forearm-right → hand-right → briefcase` branch.
5. Generate Cocos acceptance scenes from the accepted rig with fixed rest and
   stress rotations and autoplay disabled.
6. Add invalid fixtures and synchronization tests, refresh evidence and docs,
   then run `CI=true pnpm verify`.
7. Review the complete diff, commit as
   `feat: add articulation-safe joint overlaps`, and push.

### Done when

- Neutral flat-composite and canonical reference differ by exactly zero pixels.
- All twelve articulation seams have declared, generated, and fully covered
  overlap pixels with correct draw order.
- Both stress directions pass gap, cut-edge, order, and briefcase-branch
  checks.
- Cocos rest and stress scenes consume the synchronized extended sprites.
- Full CI verification passes and no out-of-scope animation feature appears in
  the diff.

### Result

- Added a versioned articulation-safety fixture covering both shoulders,
  elbows, wrists, hips, knees, and ankles, with every joint stressed in both
  rotation directions.
- Generated 25,331 parent-colored extension pixels into separate generated
  sources and declared their exact run regions in the canonical provenance
  input.
- Preserved the accepted neutral pose with zero visible-pixel differences,
  zero silhouette mismatch, and zero generated pixels visible at rest.
- Added pure validation and stable gap, cut-edge, draw-order, specification,
  and briefcase-branch diagnostics.
- Both stress renders pass all 12 seams; minimum proximal coverage is
  `0.960938` and briefcase attachment error is zero.
- Added deterministic rest, positive-stress, and negative-stress Cocos scenes
  with updated transforms/sizes and autoplay disabled.
- Repeated generation is deterministic. `CI=true pnpm verify` passes all 122
  tests.

## Completed plan: TASK-005 Data-Driven Rig Animation MVP

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Add a reusable, engine-neutral rig-animation contract and deterministic
sampler, then autoplay one subtle, seamless idle preset on the accepted
Red Cap Remade Joint hierarchy in Cocos Creator 3.8.8.

### Scope

- Add canonical `rig-animation.schema.json`, TypeScript types, parser,
  semantic validator, stable diagnostics, normalizer, pure sampler, and
  drift-free playback state under `@gameai/rig-animation`.
- Use stable `jointId` targets and degree-based rotation offsets; reject Cocos
  UUIDs and Visual-node targets in animation data.
- Define the Red Cap Remade idle entirely as JSON data with subtle torso,
  head, and arm offsets while feet remain untracked and planted.
- Extend Builder Main validation so preset parsing, rig compatibility, target
  resolution, and AssetDB JSON resolution finish before scene mutation.
- Add a reusable Cocos `RigAnimationPlayer` project component that applies
  absolute rest-pose-relative samples to `Joint_*` nodes only and restores the
  exact rest pose on stop/reset.
- Configure the acceptance scene to autoplay and capture rest, intermediate,
  loop-end, hierarchy, Game Preview, and machine-readable sampling evidence.

### Out of scope

- Art recalibration, SpriteFrame replacement, Visual offsets, draw-order
  changes, hidden-extension art, IK, blending, state machines, walk cycles, or
  production gameplay.

### Execution

1. Record TASK-005 and the accepted coordinate/runtime decision before
   implementation.
2. Build the engine-neutral schema/package with invalid fixtures and
   deterministic tests.
3. Add and validate the Red Cap idle preset against stable rig joint IDs.
4. Add the thin Cocos runtime component and extend the existing validation →
   AssetDB → Scene Script boundary without duplicating contract parsing in the
   Scene Script.
5. Add runtime and integration tests for rest-pose-relative transforms,
   loop continuity, frame-rate independence, no drift, reset, Joint-only
   targets, unchanged Visual offsets, and inherited briefcase motion.
6. Run frozen install and full verification, then use Creator 3.8.8 for
   autoplay acceptance and timestamped evidence.
7. Review the complete diff, commit as
   `feat: add data-driven rig idle animation`, and push.

### Done when

- The idle JSON validates and normalizes through the engine-neutral package.
- Sampling is deterministic, loop-seamless, frame-rate independent, and never
  accumulates deltas.
- Only Joint nodes change; Visual calibration and feet remain exact.
- Stop/reset restores byte-equivalent rest transform data.
- Creator Scene and Game Preview show subtle autoplay with no detached joints,
  foot sliding, drift, loop jump, warnings, or errors.
- `CI=true pnpm verify` passes from a frozen installation.

### Result

- Added the 1.0 Rig Animation schema and `@gameai/rig-animation` package with
  stable diagnostics, parser, semantic validation, normalization, pure
  sampling, and drift-free playback state.
- Added a two-second data-only Red Cap idle that animates five Joint tracks,
  keeps feet untracked, and inherits briefcase motion from the right hand.
- Extended the editor boundary so Main validates animation/rig compatibility
  and resolves the preset through AssetDB before Scene Script mutation.
- Added `GameAIRigAnimationPlayer`, which applies absolute rest-relative
  samples to Joint nodes and supports play, pause, stop, reset, seek, and loop.
- Completed a real Creator 3.8.8 autoplay run with correlation
  `task005-1784804936809`, Scene hierarchy evidence, three live Game Preview
  frames, and exact machine-readable samples at 0, 0.5, 1, 1.5, and 2 seconds.
- Frozen install and `CI=true pnpm verify` passed with 119 tests.
- Minor flattened-source overlap artifacts remain recorded as non-blocking;
  no art calibration was performed.

## Completed plan: TASK-004.5 Canonical Part Remake

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Replace all 19 rejected Red Cap Remade sprites with deterministic, direct
pixel extractions from the canonical transparent full-body reference and pass
the TASK-004.4 provenance gate without generated visible pixels.

### Scope

- Add a reproducible canonical segmentation specification and extraction
  command.
- Assign every canonical nontransparent pixel to exactly one semantic part.
- Preserve original canonical RGBA values and source-canvas coordinates
  without resizing, repainting, or AI generation.
- Regenerate the 19 canonical part PNGs, source mapping, annotations, layout,
  Cocos AssetDB import mirror, and provenance evidence.
- Add deterministic tests for exact pixel ownership, nonempty required parts,
  output hashes, and a passing flat composite.

### Out of scope

- Painted hidden joint extensions, inpainting, generative art, animation, or
  further Cocos scene calibration.
- Changes to Character Rig Builder behavior, hierarchy, camera, or scene
  transforms.

### Execution

1. Record TASK-004.5 and this plan before implementation.
2. Define explicit source-canvas ownership polygons for all 19 canonical
   semantic parts, with deterministic priority and complete pixel coverage.
3. Extract tight lossless PNG cutouts, update source metadata, and regenerate
   the engine-neutral layout.
4. Run the TASK-004.4 gate and require zero silhouette mismatch and visible
   pixel mismatch within its accepted tolerance.
5. Synchronize only the existing Cocos asset mirror and verify all SpriteFrame
   inputs remain resolvable.
6. Run frozen installation and `CI=true pnpm verify`, document exact results,
   and review the complete diff.

### Done when

- All 19 parts are direct canonical-pixel cutouts and nonempty.
- Every canonical visible pixel has exactly one declared part owner.
- `flat-composite.png` reproduces the canonical alpha silhouette exactly and
  passes the pixel-diff threshold.
- The canonical art gate returns success rather than a blocked result.
- No builder or scene-generation implementation changes.

### Result

- Added deterministic semantic pixel-ownership input and a reusable extraction
  command.
- Remade all 19 source/import sprites from exact canonical pixels and assigned
  all 162,968 visible pixels exactly once.
- Regenerated annotation geometry, Rig Layout, neutral reconstruction, Cocos
  import mirror, extraction hashes, ownership preview, flat composite, and
  diff evidence.
- The unchanged canonical gate passes with 0 silhouette mismatches, 0 visible
  RGBA mismatches, and 100% exact canonical-pixel provenance for every part.
- No Character Rig Builder or scene-generation behavior changed.
- Flattened-source limitation remains: occluded joint interiors need a future
  declared hidden-extension art task before animation.
- Re-ran the real Creator 3.8.8 Character Rig Builder and saved correlation
  `task004-1784799620716`; it safely replaced the single generated root with
  the canonical 19-part scene rig and reported zero warnings/errors.

## Completed plan: TASK-004.4 Canonical Art Asset Gate

- Status: `BLOCKED_BY_INVALID_ART_ASSETS`
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Prove pixel provenance and flat-composite equivalence against the canonical
full-body reference before any rig hierarchy or Cocos scene generation is
allowed to claim visual acceptance.

### Scope

- Require the canonical transparent full-body PNG and fail closed when it is
  absent.
- Audit every current Red Cap Remade part against the canonical reference,
  including face/headwear, clothing, limbs, hands, shoes, and briefcase.
- Add an engine-neutral provenance manifest with explicit hidden-extension
  regions; no visible generated or painted rest-pose pixels are allowed.
- Composite parts only from `sourceCanvas`, `originalRect`, and canonical draw
  order, then export `flat-composite.png`, `diff.png`, and deterministic
  mismatch statistics.
- Add stable provenance and flat-composite diagnostic codes and automated
  invalid cases.
- Report whether the current pack is salvageable and list every asset that must
  be remade.

### Out of scope

- Joint, anchor, scale, rotation, rest-pose, or draw-order calibration.
- Cocos Scene Script, hierarchy, camera, or Sprite changes.
- Animation, deformation, source-art repair, or AI redraw.

### Execution

1. Record TASK-004.4 and this active plan before implementation.
2. Locate and strictly decode the canonical transparent reference; fail if it
   is missing or unusable.
3. Add provenance contract, pure audit/composite/diff logic, stable
   diagnostics, and deterministic tests.
4. Run the gate against all current parts and publish its flat composite,
   diff, statistics, and per-part mismatch report.
5. Update documentation and mark the task
   `BLOCKED_BY_INVALID_ART_ASSETS` if any visible part lacks canonical pixel
   provenance.
6. Run `CI=true pnpm verify`, review the complete diff, and report results.

### Done when

- The gate objectively distinguishes direct canonical pixels from visually
  similar replacement art.
- Only declared, neutral-pose-covered hidden extensions may be ignored.
- Alpha silhouette and visible RGBA tolerances are documented and enforced.
- Every mismatched current part is named.
- No rig-builder or Cocos scene-generation behavior changes.

### Result

- Added an engine-neutral, fail-closed provenance gate that composites only
  from the declared source canvas, original rectangles, and draw order.
- Added accepted ADR-0010, the provenance declaration, five stable diagnostics,
  deterministic valid/invalid tests, an audit command, and PNG/JSON evidence.
- The canonical 326×892 transparent reference exists and is usable.
- The current pack is rejected: all 19 parts fail provenance, visible pixel
  mismatch is 84.125104%, and alpha silhouette mismatch is 21.5165%.
- The task is intentionally closed as `BLOCKED_BY_INVALID_ART_ASSETS`; all 19
  visible part sprites must be remade from direct canonical cutouts before rig
  acceptance can resume.

## Completed plan: TASK-004.3 Exact Rest-Pose Reconstruction

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Reconstruct the Red Cap Remade neutral composite exactly from common
source-canvas geometry, then prove that expressing the same placement as
separate Joint and Visual transforms does not move any sprite.

### Scope

- Treat `reference/full_character.png` as the visual source of truth.
- Audit and document source-canvas, `originalRect`, `trimOffset`, anatomical
  left/right, Y-axis, units, and one-time scaling semantics.
- Add stable source-canvas consistency diagnostics.
- Add a deterministic neutral-composite reconstruction command and reference
  comparison artifact.
- Derive every Joint world pivot, parent-relative child Joint transform, and
  Visual local offset from the same source-canvas coordinates.
- Store all visual calibration in the remade annotation and generated layout;
  add no scene-local corrective offsets.
- Retain validation-before-mutation, AssetDB UUID resolution, global Sorting2D,
  RenderRoot2D/UI_3D, compatible-camera checks, and safe idempotent replacement.
- Re-run Cocos Creator 3.8.8 Scene and Game Preview acceptance.

### Out of scope

- Animation playback, animation generation, deformation, IK, or source-art
  repainting.
- Manual hierarchy assembly or dragging generated nodes.
- Arbitrary per-part scene offsets.

### Execution

1. Record TASK-004.3 before implementation and compare the rejected render
   against the complete 326×892 reference composite.
2. Add pure source/reference coordinate helpers, diagnostics, reconstruction
   output, and deterministic tests.
3. Calibrate annotation rectangles and joints against the full composite,
   regenerate the layout, and prove reconstruction equivalence.
4. Update the scene plan to carry explicit joint-world and visual-world
   evidence while emitting parent-relative Joint transforms and local Visual
   offsets with `referenceScale` applied once.
5. Synchronize the Cocos fixture, rebuild twice in the real editor, and capture
   Scene, Game Preview, hierarchy, and reference-comparison evidence.
6. Run `CI=true pnpm verify`, complete task records, commit, and push.

### Done when

- Neutral source-canvas composition closely matches the supplied complete
  reference before hierarchy is involved.
- Joint/Visual conversion preserves every reconstructed sprite center.
- Shoulders, elbows, wrists, hips, knees, ankles, hat, glasses, and briefcase
  are connected in Scene and Game Preview.
- Left/right tests use anatomical—not viewer—semantics.
- Two editor runs retain exactly one safe generated character root.
- The complete verification gate passes.

### Result

- Added `source-canvas-rect` as an explicit, backward-compatible placement mode
  and documented the decision in accepted ADR-0009.
- Recalibrated all 19 Red Cap Remade assembled rectangles, proximal pivots,
  child attachments, and draw order from the complete 326×892 reference.
- Added deterministic neutral reconstruction and side-by-side output with an
  enforced `0.8` alpha-silhouette IoU threshold; accepted IoU is `0.800928`.
- Updated scene plan 1.2 so exact-mode Joint and Visual transforms share one
  source-canvas derivation with a single Y flip and scale application.
- Added stable metadata diagnostics and automated coverage for hierarchy/world
  equivalence, visual offsets, anatomical sides, and exact scaling.
- Ran the real Creator 3.8.8 builder twice. The final correlation-linked result
  safely replaced one generated root and verified 19/19 SpriteFrames and
  non-zero sizes, RenderRoot2D/UI_3D, camera visibility, and Sorting2D.
- Captured Scene, expanded Joint/Visual hierarchy, Game Preview, and
  engine-neutral reference-comparison evidence with no warnings or errors.
- `CI=true pnpm verify` passes all 101 tests.

## Completed plan: TASK-004.2 Red Cap Remade Asset Integration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Integrate the supplied transparent Red Cap Remade art as a separate,
reproducible Character Rig fixture and prove the generated real-art rig in
Cocos Creator 3.8.8 Scene view and Game Preview without weakening the
TASK-004/004.1 validation and replacement boundaries.

### Scope

- Audit every supplied PNG by strict decode, alpha, and non-transparent bounds.
- Define an explicit, fail-closed filename-to-canonical-part mapping.
- Keep `examples/red-cap-target-remade` as the canonical engine-neutral source
  and maintain only the Cocos AssetDB-required import mirror under
  `assets/gameai/red-cap-target-remade`.
- Replace the incompatible supplied draft document with repository-versioned
  Character Rig and Source Annotation contracts.
- Generate, never hand-author, the remade Rig Layout from calibrated common
  source-canvas joints and actual image geometry.
- Extend the existing builder UI and tests for fixture selection, real manifest
  completeness, AssetDB SpriteFrame resolution, and stable missing/ambiguous
  art diagnostics.
- Generate the remade root twice in the real editor, retain UI_3D,
  RenderRoot2D, Sorting2D, camera compatibility, and safe replacement, then
  capture Scene and Game Preview evidence.

### Out of scope

- Animation playback or generation.
- Computer-vision joint inference, automatic cutting, or source-art repair.
- Manual final hierarchy assembly or hand-authored Cocos UUIDs.
- Deleting or replacing the deterministic colored-rectangle fixture.

### Execution

1. Record TASK-004.2 and this active plan before implementation.
2. Decode and inventory the supplied art, compare duplicate locations, inspect
   the assembled reference, and publish the explicit canonical mapping.
3. Add fail-closed art discovery, audit diagnostics, and deterministic tests.
4. Author the remade Character Rig and Source Annotation from actual geometry,
   regenerate Rig Layout through `@gameai/rig-layout-generator`, and validate
   through asset intake.
5. Synchronize the required Cocos import mirror and let AssetDB author all
   metadata and UUIDs.
6. Extend the builder fixture selection and generate the remade rig twice in
   the acceptance scene.
7. Capture real Scene and Game Preview evidence, document calibration limits,
   and update task results.
8. Remove ignored build state, run frozen installation and
   `CI=true pnpm verify`, review scope, commit, and push.

### Done when

- Every mapped real part is readable, transparent, non-empty, and represented
  exactly once in the validated manifest.
- Missing, duplicate, or ambiguous source art fails with a stable diagnostic.
- The generated layout is byte-stable and derived from the remade annotation.
- Every generated Visual resolves the intended SpriteFrame through AssetDB.
- Two real-editor runs leave exactly one marked remade character root and do
  not alter unrelated scene roots or cameras.
- Scene and Game Preview show the complete remade character with reasonable
  connected proportions, no colored placeholders, and no console errors.
- Frozen installation and the full CI verification gate pass.

### Result

- Preserved the supplied 19-part art in a canonical fixture and added an
  explicit mapping plus deterministic import-safe crops; the placeholder
  fixture remains intact.
- Added a calibrated 19-part contract/annotation and generator-produced layout,
  then validated its complete manifest, transparency, content bounds, and
  one-to-one AssetDB SpriteFrame resolution.
- Added stable fail-closed source-art diagnostics and tests for missing and
  ambiguous mappings, real manifest completeness, mirror integrity, layout
  validity, and idempotent replacement.
- Ran Cocos Creator 3.8.8 twice. The final run replaced the single marked root,
  verified 19 SpriteFrames below RenderRoot2D on UI_3D, preserved four unrelated
  roots and camera state, and produced Scene/Game evidence with zero console
  counters.
- Passed frozen installation and the complete 91-test
  `CI=true pnpm verify` gate.

## Completed plan: TASK-004.1 Cocos Visible Rig Acceptance

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Make the generated Red Cap rig visibly render as world-space 2D content in
Cocos Creator 3.8.8 and upgrade acceptance from hierarchy proof to visual
assembly proof.

### Scope

- Add a generated RenderRoot2D boundary and move all generated nodes to UI_3D.
- Add pre-commit Scene Script verification for render-root ancestry,
  SpriteFrames, non-zero sizes, consistent layers, and compatible cameras.
- Add a stable missing-camera diagnostic without mutating unrelated cameras.
- Configure only the acceptance fixture camera for orthographic UI_3D
  visibility.
- Extend deterministic tests, documentation, saved scene, and real editor
  evidence.

### Out of scope

- Automatic changes to unrelated project cameras.
- Animation, production runtime integration, or contract changes.
- Changes to existing Joint/Visual transforms or draw order.

### Execution

1. Record TASK-004.1, this plan, and the world-space 2D decision.
2. Add render-layer and render-root information to the deterministic scene
   plan.
3. Build and verify a RenderRoot2D-backed detached character tree.
4. Add camera-mask policy tests and failure diagnostics.
5. Update the acceptance camera without placing it inside the generated
   replacement boundary.
6. Run the real editor twice and replace evidence with visible Scene and
   Game/Preview captures where practical.
7. Clean ignored state, run frozen installation and `pnpm verify`, document the
   result, and commit with the required subject.

### Done when

- Red Cap is visibly assembled in the saved acceptance scene and capture.
- Every generated Sprite is below RenderRoot2D with a non-null SpriteFrame,
  non-zero size, and UI_3D layer.
- A compatible active camera is proven without generator-owned camera changes.
- Duplicate generation remains safe and idempotent.
- Clean-checkout verification passes.

### Result

- Added a generated RenderRoot2D boundary and assigned every generated node
  to UI_3D while retaining the complete Joint/Visual hierarchy, transforms,
  pivots, and global Sorting2D order.
- Added atomic preflight and post-attachment verification for render-root
  ancestry, SpriteFrames, non-zero sizes, layer consistency, compatible
  cameras, and unchanged camera state.
- Added the stable `NO_CAMERA_CAN_RENDER_GENERATED_LAYER` diagnostic and
  deterministic camera-mask tests.
- Calibrated the fixture-owned Main Camera to an orthographic 2D view and
  included `sorting-2d` in the acceptance project's runtime engine modules.
- Ran Cocos Creator 3.8.8 generation twice. The second run safely replaced the
  marked root; Scene and Web Preview visibly rendered all 18 parts with zero
  console errors.
- Removed dependencies and all build outputs, then passed
  `pnpm install --frozen-lockfile` and the complete 84-test `pnpm verify`.

## Completed plan: TASK-004 Cocos Scene Rig Builder MVP

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build the first production Cocos Creator 3.8.8 Panel → Main → validated scene
plan → Scene Script pipeline and assemble the Red Cap Target as an idempotent,
animation-ready rigid-sprite scene rig.

### Scope

- Add a dedicated project-local Character Rig Builder editor extension.
- Reuse all three engine-neutral Character Pipeline packages before scene
  mutation.
- Resolve SpriteFrame UUIDs through AssetDB and pass a deterministic pure-data
  scene plan across the process boundary.
- Build proximal `Joint_<partId>` hierarchy nodes with center-anchored,
  trim-compensated `Visual_<partId>` Sprite children.
- Apply a deterministic global render order across hierarchy branches.
- Replace only the exact marker-guarded generated character root.
- Preserve one correlation ID through the UI, validation, mutation, and
  acceptance evidence.
- Add deterministic automated tests and Red Cap Target Cocos acceptance
  evidence.

### Out of scope

- Animation playback or generation.
- Auto cutting or computer-vision joint detection.
- Production-game integration.
- Mutation of unrelated scene nodes or source assets.

### Execution

1. Record TASK-004, this active plan, and the scene-boundary ADR before
   implementation.
2. Implement and test deterministic scene-plan generation and replacement
   policy independently of Cocos objects.
3. Implement the Panel, Main Process validation/generation/AssetDB flow, and
   Scene Script mutation.
4. Add the Cocos fixture project, Red Cap Target assets, documentation, and
   stable diagnostics.
5. Run the real Cocos Creator 3.8.8 acceptance procedure and capture evidence.
6. Remove generated build state, run frozen installation and `pnpm verify`, and
   review the final diff.
7. Complete the task records and commit with the required subject.

### Done when

- Validation failure cannot create scene nodes.
- Every part has the required Joint/Visual structure, proximal hierarchy,
  correct trim compensation, scale, and global draw order.
- Repeated generation is idempotent and unrelated scene nodes remain intact.
- Red Cap Target acceptance evidence is correlation-linked across all stages.
- A clean repository state passes frozen installation and `pnpm verify`.

### Result

- Added a dedicated Cocos Creator 3.8.8 extension with the required
  Panel → Main → engine-neutral validation/generation → AssetDB → Scene Script
  boundary.
- Added deterministic scene-plan generation, center-anchored trim
  compensation, proximal Joint/Visual hierarchy, global Sorting2D order, and
  stable diagnostics.
- Added exact-root marker protection, duplicate-run replacement, and atomic
  rollback on replacement verification failure.
- Ran the Red Cap Target in the real editor twice. The first run created 18
  Joint/Visual pairs and the second replaced the same root; all four unrelated
  scene roots remained.
- Saved the imported fixture, AssetDB-authored metadata, acceptance scene,
  correlation-linked JSON evidence, and hierarchy screenshot.
- Cleaned all ignored outputs and dependencies, ran frozen installation, and
  passed the complete 81-test `pnpm verify` gate (63 prior plus 18 new).

## Completed plan: TASK-003.2 Clean-Checkout Verification

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Make the repository verification gate reproducible from a fresh checkout where no workspace package has prebuilt `dist` or `dist-test` declarations.

### Scope

- Change the root verification order so workspace dependencies build before repository-wide typechecking.
- Preserve topological workspace build ordering through pnpm.
- Make the GitHub Actions verification job explicitly assert that checkout-time build outputs are absent.
- Prove the documented `pnpm install --frozen-lockfile` followed by `pnpm verify` workflow succeeds without pre-existing generated directories.

### Out of scope

- Production pipeline or Cocos behavior.
- Workspace topology changes.
- Committing generated `dist` or `dist-test` output.
- New runtime dependencies.

### Execution

1. Record TASK-003.2 and this active plan before implementation.
2. Reproduce the clean-output failure and confirm the dependency ordering cause.
3. Build workspace dependencies before the repository-wide typecheck in `pnpm verify`.
4. Strengthen CI with a clean-checkout output assertion followed by frozen install and verify.
5. Remove local build outputs, run the exact clean-checkout command sequence, and confirm all 63 tests.
6. Review the diff and commit with the required subject.

### Done when

- `pnpm install --frozen-lockfile` and `pnpm verify` pass with no pre-existing workspace `dist` or `dist-test` directories.
- Workspace consumers resolve dependency declarations created by the preceding topological build.
- CI guards the clean-checkout assumption.
- All 63 tests pass and generated output remains ignored.

### Result

- Reproduced the clean-output failure as `TS2307` errors in `@gameai/character-asset-intake` before `@gameai/character-contracts/dist` existed.
- Changed the root gate to topological build → repository-wide typecheck → complete test suite.
- Added a CI assertion that the checkout contains no `dist` or `dist-test` before frozen installation and verification.
- Removed all local workspace build output and `node_modules`, then ran `pnpm install --frozen-lockfile` followed by `pnpm verify`.
- All 63 tests pass; no generated output or dependency changes are tracked.

## Completed plan: TASK-003.1 Rig Semantics and Red Cap Calibration

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Correct Rig Layout semantics so every part pivot is its proximal attachment joint, explicitly represent parent-owned child attachment points, and recalibrate the Red Cap Target into an animation-ready golden fixture with a deterministic assembled preview.

### Scope

- Define `joint` as the part's proximal pivot and add named `childAttachments` as distinct parent-owned source-canvas points.
- Require each non-root part's proximal joint to coincide with its parent's attachment for that child without treating the two records as the same semantic field.
- Recalibrate Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots.
- Reject duplicate annotation `partId` values deterministically.
- Constrain normalized sockets, rectangle hit areas, and circle hit areas to the normalized part bounds.
- Regenerate the Red Cap golden Rig Layout and a deterministic assembled SVG acceptance preview.
- Update ADR-0006, schemas, public types, diagnostics, docs, and tests.

### Out of scope

- Production Cocos Scene, Node, or Prefab generation.
- Computer-vision joint detection or image segmentation.
- Animation playback or automatic animation generation.
- Source-art mutation or repair.

### Execution

1. Record TASK-003.1 and this active plan before implementation.
2. Add explicit named child-attachment data and semantic validation.
3. Add duplicate part-ID and normalized template-geometry validation.
4. Recalibrate Red Cap proximal pivots and parent-owned attachment points.
5. Regenerate the golden layout and assembled preview acceptance artifact.
6. Add exact shoulder, elbow, hip, knee, duplicate-ID, and normalized-geometry tests.
7. Update architecture and user documentation.
8. Run `pnpm verify`, review the diff, and commit the completed task.

### Done when

- Every Red Cap limb anchor is at the documented proximal joint.
- Parent child-attachment records are explicit and match, but do not replace, child proximal pivots.
- Duplicate annotation part IDs and invalid normalized template geometry fail deterministically.
- The generated golden layout and assembled SVG preview are byte-stable.
- `pnpm verify` passes and no production Cocos Scene Builder code exists.

### Result

- Made each annotation `joint` a proximal animation pivot and added distinct named parent-owned `childAttachments`.
- Added Source Annotation 1.1 explicit-attachment semantics with a tested 1.0 compatibility fallback.
- Recalibrated Red Cap waist, neck, shoulder, elbow, wrist, hip, knee, and ankle pivots and regenerated the Rig Layout golden.
- Added deterministic diagnostics and tests for duplicate annotation IDs, child-attachment correspondence, and bounded normalized socket/hit-area geometry.
- Added a byte-stable assembled SVG acceptance preview and changed fixture generation to preserve the authored annotation.
- Updated ADR-0006, schemas, public types, schema compatibility docs, package docs, and generator documentation.
- `CI=true pnpm verify` passes with 63 tests.
- No production Cocos Scene Builder behavior was introduced.

## Completed plan: TASK-003 Rig Layout Generator

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral generator that deterministically converts a versioned source-canvas annotation and reusable skeleton template into a valid Rig Layout, then verifies the generated contract and all referenced assets before returning success.

### Scope

- Add canonical Source Canvas Annotation and Skeleton Template JSON Schemas.
- Add `@gameai/rig-layout-generator` under `pipelines/` with parsers, public types, stable diagnostics, deterministic generation, and JSON serialization.
- Add the reusable `male-normal-v1` skeleton template.
- Derive untrimmed geometry, trim offsets, normalized joint anchors, parent-relative rest poses, hierarchy, draw order, sockets, and hit areas.
- Validate generated layouts through both `@gameai/character-contracts` and `@gameai/character-asset-intake`.
- Add a Red Cap Target annotation, generated golden layout, targeted invalid fixtures, deterministic tests, documentation, and an accepted coordinate/contract ADR.

### Out of scope

- Image segmentation or computer-vision joint detection.
- Cocos Nodes, Prefabs, Scenes, or editor generation.
- Animation playback.
- Source-image or source-annotation mutation and automatic repair.

### Coordinate decisions

- Source annotations use top-left origin, positive X right, and positive Y down.
- Every pivot is the authored joint in the untrimmed source rectangle; trimmed image centers and visual centers never determine anchors.
- Child rest position is derived from child and parent joints in the same source canvas, scaled by `referenceScale`, with source Y inverted.
- Root rest position is derived from the source-canvas center using the same conversion.
- Template socket and hit-area geometry is normalized against a parent part's untrimmed rectangle and converted to parent-local reference space.

### Execution

1. Record TASK-003 and this active plan before implementation.
2. Add and document the two canonical input contracts and compatibility rules.
3. Implement parsers, template/annotation semantic checks, formulas, diagnostics, and deterministic generation.
4. Add an in-memory asset-intake validation API and require both downstream validators before success.
5. Add `male-normal-v1`, Red Cap Target annotation/golden output, and one invalid fixture per required diagnostic.
6. Test formulas, pivot semantics, deterministic serialization, downstream validation, and source immutability.
7. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- The Red Cap annotation generates the byte-stable golden Rig Layout.
- All coordinate formulas and Y-axis inversion are documented and tested with exact values.
- Every required diagnostic is stable and covered by a fixture.
- A successful result has passed both Character Contract and Character Asset Intake validation.
- `pnpm verify` passes from the repository root.
- No out-of-scope engine, vision, playback, or repair logic is present.

### Result

- Added canonical Source Canvas Annotation and Skeleton Template schemas plus the engine-neutral `@gameai/rig-layout-generator` package.
- Added `male-normal-v1`, deterministic coordinate conversion/serialization, stable diagnostics, overlap warnings, and downstream validation through both required packages.
- Added the Red Cap Target source annotation and byte-stable generated Rig Layout golden fixture.
- Added nine targeted invalid fixtures and exact tests for anchors, root/child rest poses, Y inversion, sockets, hit areas, trim dimensions, visual-center independence, and source immutability.
- Accepted ADR-0006 for source-space joint authority and versioned generator input contracts.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 56 total tests.
- No image segmentation, vision detection, Cocos generation, animation playback, or source repair was added.

## Completed plan: TASK-002 Character Asset Intake and Validation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Build an engine-neutral asset-intake package that safely loads a character fixture, validates its Character Rig and Rig Layout contracts, inspects referenced PNG/JPEG/WebP files, and returns a deterministic normalized asset manifest and diagnostics.

### Scope

- Add `@gameai/character-asset-intake` under `pipelines/`.
- Load `character-rig.json`, resolve its Rig Layout, and validate both through `@gameai/character-contracts`.
- Resolve referenced image paths inside a caller-selected source root without following paths outside that root.
- Decode supported image formats and validate format, dimensions, alpha, transparent content bounds, trim geometry, and duplicate references.
- Return a deterministic manifest containing contract versions, safe paths, image facts, hierarchy, transforms, draw order, sockets, and hit areas.
- Add textual and binary fixtures, one targeted invalid fixture per required diagnostic, deterministic unit tests, package documentation, and an accepted image-decoding ADR.

### Out of scope

- Auto cutting or automatic source-asset repair.
- Image generation.
- Cocos nodes, prefabs, scenes, or other engine adapters.
- Animation playback.
- Mutation or rewriting of source assets.

### Execution

1. Record TASK-002 and this active plan before implementation.
2. Select and document a maintained multi-format image decoder in an ADR.
3. Define public manifest, result, option, and stable diagnostic types.
4. Implement safe JSON/image loading, contract validation, image inspection, and deterministic normalization.
5. Add the valid fixture and one targeted invalid fixture per required diagnostic.
6. Test deterministic output, geometry relationships, safety boundaries, and read-only behavior.
7. Document APIs, diagnostics, path model, image rules, and limitations.
8. Run `pnpm verify`, review the complete diff, and commit with the required subject.

### Done when

- Valid PNG, JPEG, and WebP assets are inspected without Cocos dependencies.
- Every required invalid condition returns its stable diagnostic code.
- Trimmed dimensions satisfy `trimOffset + imageSize <= originalRect`, and `originalRect` remains bounded by `sourceCanvas` through contract validation.
- Manifest ordering and diagnostics are deterministic across repeated runs.
- Source fixtures are unchanged by intake.
- `pnpm verify` passes from the repository root.

### Result

- Added `@gameai/character-asset-intake` with safe real-path containment, contract loading, strict image decoding, geometry validation, stable diagnostics, and a plain deterministic manifest.
- Added generated Red Cap Target PNG assets plus focused PNG, JPEG, WebP, malformed, unsupported, and transparent binary fixtures.
- Added one invalid fixture for each of the ten required asset diagnostic codes and deterministic read-only tests.
- Accepted ADR-0005 selecting sharp 0.35.3 as the package-local multi-format decoder.
- `pnpm install --frozen-lockfile` and `pnpm verify` pass with 41 total tests.
- No Cocos generation, auto cutting, image generation, animation playback, or source-asset repair was added.

## Completed plan: TASK-001 Character Contract Foundation

- Status: Complete
- Started: 2026-07-23
- Completed: 2026-07-23

### Goal

Define and validate the complete engine-neutral Character Rig and Rig Layout contracts required by the Character Rig Builder before any production scene-generation code is written.

### Scope

- Add canonical JSON Schemas for Character Rig and Rig Layout.
- Add an engine-neutral `@gameai/character-contracts` workspace package with public TypeScript types.
- Parse JSON, validate schema shape, and enforce cross-document semantic rules with stable error codes.
- Add the Red Cap Target textual golden fixture and targeted invalid fixtures.
- Document schema-version compatibility and contract coordinate conventions.
- Add deterministic unit tests and include the package in the root verification gate.

### Out of scope

- Cocos scene, node, prefab, or asset generation.
- Image segmentation and auto cutting.
- Animation clip formats or runtime animation playback.
- Binary art assets and visual regression output.

### Contract decisions

- `schemas/` is the canonical schema source; package builds copy those schemas into distributable output.
- Character Rig declares identity, its Rig Layout file, required part IDs, required animation target IDs, and target-to-part mappings.
- Rig Layout owns source-canvas geometry, trimmed-part placement, hierarchy, reference scale, draw order, sockets, and hit areas.
- File paths are relative POSIX paths and cannot be absolute or traverse above the specification directory.
- Schema compatibility is explicit SemVer: the current validator supports `>=1.0.0 <1.1.0`; newer minor or major versions fail with a stable error code.

### Execution

1. Create TASK-001 with explicit acceptance criteria.
2. Add both JSON Schemas and public TypeScript types.
3. Implement JSON parsing, schema validation, semantic validation, and stable diagnostics.
4. Add the Red Cap Target valid fixture and one invalid fixture per required semantic failure.
5. Add unit tests for schema synchronization, parsing, version compatibility, and all semantic rules.
6. Document usage, coordinates, limitations, and schema-version compatibility.
7. Run `pnpm verify`, review the complete diff, and commit TASK-001.

### Done when

- Both canonical schemas parse and compile.
- TypeScript public types and JSON Schemas are synchronized by tests.
- Every required invalid condition produces its documented stable error code.
- The Red Cap Target fixture parses and validates without errors.
- `pnpm verify` passes from the repository root.
- No production Cocos scene-generation logic is present.

### Result

- Added canonical Character Rig and Rig Layout JSON Schemas and byte-identical package build copies.
- Added the engine-neutral `@gameai/character-contracts` package with public types, Ajv parsing, semantic validation, deterministic diagnostics, and stable error codes.
- Added the Red Cap Target textual golden fixture and targeted invalid fixtures for every required failure mode.
- Added schema compatibility, coordinate-system, API, limitation, and error-code documentation plus ADR-0004.
- `pnpm verify` passes with 23 Character Contract tests and the 4 existing TASK-000 tests.
- No production Cocos scene-generation logic was added.

## Completed plan: TASK-000 Repository and Environment Audit

- Status: Complete with explicit external UI-automation blocker
- Completed: 2026-07-23

### Goal

Establish and prove the minimum reproducible development environment required before Character Pipeline implementation begins.

### Scope

- Record exact local toolchain versions and supported project versions.
- Adopt a pnpm workspace with explicit framework, pipeline, Cocos adapter, and Cocos project boundaries.
- Add a minimal Cocos Creator 3.8.8 extension spike that exercises Panel → main process → Scene Script messaging.
- Add deterministic type-check, unit-test, and CI commands.
- Record validation evidence or a reproducible blocker.

### Out of scope

- Production Character Rig Builder code
- Automatic image segmentation
- Binary art assets
- Cloud image-generation integration

### Execution

1. Record the installed and repository-supported toolchain in `docs/environment.md`.
2. Add the root pnpm workspace, lockfile, TypeScript configuration, and ignore rules.
3. Add an in-repository Cocos 3.8.8 spike project whose extension is a workspace package.
4. Unit-test the message orchestration outside Creator.
5. Load the spike project in Creator and capture Panel → main → Scene Script evidence, or document an exact blocker and manual reproduction steps.
6. Add a minimal GitHub Actions workflow and run all local checks.
7. Update architecture assumptions and close TASK-000 only when its acceptance criteria pass.

### Done when

- `docs/environment.md` contains command-backed versions and exact install/test commands.
- `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm test` are deterministic.
- The spike proves Panel → main process → Scene Script on Cocos Creator 3.8.8, or records a reproducible external blocker.
- The repository-versus-consumer decision and dependency direction are explicit.
- No Character Rig Builder production logic is introduced.

### Result

- Exact environment output and commands are recorded in `docs/environment.md`.
- The pnpm workspace, frozen lockfile, Cocos 3.8.8 fixture extension, four tests, and CI workflow are implemented.
- Creator loaded the fixture extension main process and Scene process. The remaining live panel click is explicitly blocked by concurrent-instance accessibility targeting and has exact reproduction steps in `docs/environment.md`.
- ADR-0003 records the external production-game consumer topology.

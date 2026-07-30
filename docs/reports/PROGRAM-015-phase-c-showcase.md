# PROGRAM-015 Phase C Showcase Report

## Decision

TASK-015C implementation was accepted on 2026-07-30. Its first evidence
publication subsequently failed external review because the animation was
synthesized from a flat composite and the framebuffer counts were not derived
from the published MP4. Replacement Creator Web Preview evidence passed
external code/runtime/Creator/visual/spatial/control review, and PR #22
integrated PROGRAM-015 at
`555f0b8e34affff0942ea0785dec5ce041440ae2`. The Creator-owned
`red-cap-production-showcase.scene` presents production-lite and Red Cap on
the licensed training-ground background with deterministic scene-specific
Dust, Trail, and Aura compiled through the existing D1 authoring and D2
runtime path. The historical failed payload remains preserved as failed
evidence and does not override the accepted replacement.

## Deterministic source and resource closure

- The generator verifies the locked background and style-board SHA-256 values
  before writing outputs.
- The licensed 1664×936 background crop is deterministically resized to
  1280×720.
- The accepted production-lite and Red Cap neutral composites are trimmed and
  resized to 212×480 and 274×500.
- A deterministic 64×64 procedural soft mask is the only textured VFX utility
  resource. It prevents character art from being used as a particle or glow
  texture.
- The output contains exactly four new PNG resources, one Creator-owned
  Scene/`.meta` pair, and no feature media.
- The generation report binds every generated PNG and Render Plan to its
  SHA-256 digest.
- No D1/D2 public source, primitive, blend behavior, or runtime contract was
  changed.

## Layout and ownership

- Viewport: 1280×720 with a 64 px safe inset.
- production-lite: center x 380, foot y 646, 212×480 runtime silhouette.
- Red Cap: center x 900, foot y 646, 274×500 runtime silhouette.
- Locked maximum silhouette boxes are separated by 190 px, exceeding the
  required 48 px minimum.
- Both locked maximum silhouette boxes remain inside the safe area.
- Target namespaces are disjoint:
  `showcase.production-lite.*` and `showcase.red-cap.*`.
- Background, character, VFX, debug, and HUD sorting bands remain
  non-overlapping.

## Superseded Creator and framebuffer record

Creator 3.8.8 imported all four resources and generated their image and
sprite-frame metadata. The scene was opened after a Creator restart and
previewed at 1280×720.

The counts below are retained only as the historical local record. External
review found that they were not computed from the final published MP4, so
they do not establish framebuffer acceptance:

| Gate | Required | Observed | Result |
| --- | ---: | ---: | --- |
| Dust | 120 | 376 | PASS |
| Trail | 160 | 4,077 | PASS |
| Aura | 240 | 16,492 | PASS |
| Resume active ROI | 80 | 40,125 | PASS |
| Paused frame stability | 0 changed pixels | 0 | PASS |

Creator interaction also passed:

- automatic Dust → Trail → Aura sequence and final hold;
- Pause/Resume;
- Transform Stress and debug projection;
- two consecutive deterministic rebuilds;
- manual Dust, Trail, and Aura after rebuild;
- Exact Reset to no active or stale renderer;
- clean reopen/restart with both characters and the licensed background
  visible; and
- zero relevant Preview warnings or errors.

The old evidence payload is preserved byte-for-byte and classified
`failed-external-review-synthetic-animation-and-non-media-derived-metrics`.

## Replacement evidence method

The remediated runtime builds Red Cap from the accepted 19-part atlas and
applies Rest/Idle/Walk/Wave per-joint transforms through the existing rig
playback. Semantic sockets and VFX targets are children of the actual joint
nodes. The visible HUD and diagnostics bind the exact feature SHA,
Scene/runtime ID, evidence session ID, 1280×720 viewport, Creator 3.8.8
version, animation state/time, lifecycle counters, VFX ownership, and cleanup
state.

The replacement analyzer accepts only the final MP4. FFmpeg decodes the exact
configured frames to RGB24 bytes; the analyzer records the video SHA, FFmpeg
version, frame number and timestamp, frame hash, half-open ROI, channel
threshold, changed-pixel result, and threshold decision. Dust, Trail, Aura,
Pause, and Resume measurements are therefore reproducible from the downloaded
media rather than a prepared mask, static PNG triptych, fixed count, or flat
animation surrogate.

## Validation

The automated suite covers:

- layout safe-area and separation closure;
- target namespace and VFX resource closure;
- generated output hashes and PNG dimensions;
- Scene/meta and component UUID identity;
- exactly one enabled showcase component with the inherited motion component
  disabled;
- all four Creator-imported PNG sprite-frame metas;
- published controls and cleanup calls; and
- reuse of the existing D1 compiler and D2 host/runtime without public
  modifications.

No MP4 or other evidence media is tracked on the feature branch.

## Replacement acceptance result

The accepted Phase B replacement records two independent rebuild inputs and
the lifecycle transition `1/0/0 → 2/1/1 → 3/2/2`, followed by working Rest,
Idle, jointed Walk, joint-following Wave, Pause, Resume, Exact Reset, and a
five-second clean hold. Root/input remain `1/1`, while
duplicate/leak/stale/cleanup counts remain zero.

The accepted downloaded Phase C MP4 reproduces Dust `7,645`, Trail `4,454`,
Aura `25,072`, Pause `0`, and Resume `25,612` changed pixels from decoded
RGB24 frames. The analyzer reproduced byte-identical output twice, and a
controlled frame perturbation changed the derived result. Creator and Preview
application warnings/errors relevant to the session were zero. Accepted
media remained outside the feature and `main`.

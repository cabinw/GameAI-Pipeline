# Red Cap Production Source Pack v1

This pack was generated as new project input for `PROGRAM-015`, replacing the
old flat Red Cap reconstruction source.

## Contents

- `red-cap-character-master.png`: transparent neutral character master.
- `red-cap-parts-sheet.png`: transparent primary exploded-parts source.
- `red-cap-joint-parts-supplement.png`: transparent joint and overlap source.
- `training-ground-background.png`: two-character showcase background.
- `style-board.png`: palette, materials, character, and environment reference.
- `provenance.json`: file fingerprints and generation provenance.
- `rights-assertion.md`: required project-owner rights confirmation.

## Important acceptance boundary

Image generation does not guarantee that every sprite is mechanically suitable
for rigging. Before implementation, Codex must map every visible source region
to a declared part, verify left/right identity, and reject any missing or
ambiguous connector rather than inventing pixels.

The primary parts sheet and joint supplement are complementary inputs. Neither
may silently override the character master. Differences must be listed in the
Phase 0 source-readiness report and resolved by an explicit authority rule.

No PSD or native vector layers are included. The PNGs are canonical raster
sources.

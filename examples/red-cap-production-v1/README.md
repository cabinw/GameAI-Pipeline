# Red Cap Production v1

This is the approved PROGRAM-015 production source fixture.

- `source/` contains the byte-identical project-owner-reviewed source pack.
- `source-authority-map.json` makes the character master the sole final
  visible-pixel authority, limits the parts sheet to identification,
  structure, boundary checks, and manual audit, and restricts the joint
  supplement to declared hidden connector pixels.
- `showcase-layout.json` locks the 1280×720 background derivative, camera
  composition, sorting bands, safe area, and framebuffer ROIs before runtime
  implementation.
- Generated parts, references, reports, animation samples, and Cocos mirrors
  are outputs and must be recreated by tracked generators.

The ZIP and ignored intake/quarantine directories are not source fixtures and
must never be committed.

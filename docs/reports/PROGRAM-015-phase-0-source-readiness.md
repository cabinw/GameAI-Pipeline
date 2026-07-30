# PROGRAM-015 Phase 0 Source-Readiness Report

- Audit date: 2026-07-30
- Baseline: `68444551b9b160a2455a97a2d8bf611aea608c6e`
- Phase 0 specification checkpoint:
  `21580cf407bc69d9cb95176eb77d8ed9ce89fc4a`
- Result: `PASS`

## Approved production fingerprint

| Input | SHA-256 | Dimensions/mode | Result |
| --- | --- | --- | --- |
| `red-cap-character-master.png` | `7a4cf6a690aa6532a51c209d839d7d71b28396e40e021973c0f35fb0f828f3a1` | 1254×1254 RGBA | PASS |
| `red-cap-parts-sheet.png` | `83bae1e794339b453a316eb4a9540968a1c7ec4e1bc5d7c3b50a43c76c709e79` | 1254×1254 RGBA | PASS |
| `red-cap-joint-parts-supplement.png` | `7f22200a57992b66257e32670b0c5eacfd0f9a47073a758d74efb63b38bed96e` | 1536×1024 RGBA | PASS |
| `training-ground-background.png` | `9f985dfad9218fd88f915a861aa5fbb016a5de1e138c5f2000e2fd5a45fb7b58` | 1672×941 RGB | PASS |
| `style-board.png` | `9f4c4fd1a6a176fa72ffd54e0509435de972051e8e930f24366722935f43ca5e` | 1672×941 RGB | PASS |

All five PNGs decode completely. RGBA inputs have transparent corners,
nonempty visible bounds and no detected green chroma-key residue. The master
has 282,476 visible pixels, 276,682 opaque pixels, 5,794 partial-alpha pixels,
alpha coverage 0.17963315 and visible bounds `(309,44)–(941,1195)`.

## Rights and provenance

- Generation source: OpenAI ImageGen in ChatGPT.
- Human requester/project owner: KB / cabinw.
- Rights-review status: `confirmed-by-project-owner`.
- Commercial use, modification and redistribution: `true`.
- Public repository inclusion is explicitly confirmed in the review note.
- Project-owner assertion checks all five required confirmations.
- Confirmation date: 2026-07-29.
- Assertion-bound provenance SHA:
  `55d350c9e44a38c8bef6d3f6b0eb0654caa1bb846c491dd7c547c71e3a862758`.

The tracked `provenance.json`, governed image hashes and assertion binding
match the reviewed ignored intake bytes exactly. Codex did not alter or infer
any authorization field.

## Readiness matrix

| Gate | Evidence | Result |
| --- | --- | --- |
| Decode/dimensions/mode | complete PNG decode and recorded metadata | PASS |
| Alpha/corners/bounds | RGBA sources have transparent corners and nonempty bounds | PASS |
| Chroma-key residue | zero dominant-green visible pixels in all RGBA inputs | PASS |
| Rights/provenance | SHA-bound project-owner confirmation | PASS |
| Part taxonomy | 19 locked production parts | PASS |
| Source authority | master visible authority plus declared hidden candidates | PASS |
| Left/right identity | character-relative and viewer-relative identity recorded | PASS |
| Joint coverage | shoulder/elbow/wrist/hip/knee/ankle source regions mapped | PASS |
| Duplicate authority | resolved in favor of master visible pixels | PASS |
| Ambiguous connector | rejected from accepted mapping | PASS |
| Background/style | rights-bound source and style board decode | PASS |
| 16:9 derivative | centered 1664×936 crop, exact 10/13 scale | PASS |
| Camera/safe area/ROIs | locked before implementation | PASS |
| Intake isolation | ignored intake; no staged/untracked candidate | PASS |

## Source authority

The locked 19-part taxonomy is:

`pelvis`, `torso`, `head`, `hair`, `cap`, `bandana`, `pouch`,
`upper-arm-left`, `upper-arm-right`, `forearm-left`, `forearm-right`,
`hand-left`, `hand-right`, `thigh-left`, `thigh-right`, `shin-left`,
`shin-right`, `foot-left`, and `foot-right`.

`examples/red-cap-production-v1/source-authority-map.json` records every part
ID, parent, pivot candidate, draw order, character-relative side, source
rectangle, visible region, hidden-overlap region, conflict, resolution,
confidence and rejection reason.

The character master is the sole final visible-pixel authority. The parts
sheet is used only for part identification, structural mapping, boundary
checks, and manual audit; it cannot supply final visible pixels. The joint
supplement may supply only declared hidden shoulder, elbow, wrist, hip, knee,
and ankle connector coverage. Integrated sleeves, combined hand/forearm and
combined pelvis candidates are explicitly resolved. An ambiguous generic
connector and duplicate supplement pelvis are rejected. No nearest-pixel
copying, generative completion, mirroring, repainting or Creator compensation
is authorized.

## Background and framebuffer authority

`examples/red-cap-production-v1/showcase-layout.json` locks:

- source crop `(4,2,1664,936)`;
- exact 10/13 scale to 1280×720;
- ground contact line `y=646`;
- production-lite center `x=380`;
- Red Cap center `x=900`;
- 64-pixel safe inset;
- disjoint sorting bands; and
- silhouette, face/cap/hair, limbs, ground, Dust, Trail, Aura, safe-area and
  final-beauty framebuffer ROIs.

The central ground is unobstructed, the foreground does not cover either
locked silhouette, and the background leaves sufficient Dust, Trail and Aura
space.

## Promotion boundary

The approved source files were copied byte-for-byte into
`examples/red-cap-production-v1/source/`. The ZIP, ignored intake, chroma-key
intermediates, caches and quarantine files are not promoted. Runtime
derivatives must be generated deterministically, and Creator UUIDs remain
Creator-owned.

Phase 0A rights/integrity, Phase 0B visual/source authority and Phase 0C
background/style readiness pass. TASK-015A may begin.

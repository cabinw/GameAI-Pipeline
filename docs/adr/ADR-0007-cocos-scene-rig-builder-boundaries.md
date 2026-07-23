# ADR-0007: Cocos Scene Rig Builder Boundaries

- Status: Accepted
- Date: 2026-07-23

## Context

The Character Pipeline now has engine-neutral contracts, image intake, and
deterministic rig-layout generation. The first Cocos Creator mutation pipeline
must preserve those validation guarantees while translating trimmed sprites,
proximal pivots, hierarchy, and authored draw order into engine objects.

Cocos scene mutation runs in the Scene Script process, while filesystem access,
contract validation, layout generation, and AssetDB queries belong outside that
mutation boundary. The scene graph also needs a draw-order mechanism that is
global across different hierarchy branches.

## Decision

The Cocos Scene Rig Builder will:

1. Validate the Character Rig, generate the Rig Layout, and validate referenced
   assets in the extension Main Process by reusing the engine-neutral packages.
2. Resolve imported images and their SpriteFrame subassets through Cocos
   AssetDB, then construct a deterministic JSON-serializable scene plan.
3. Pass only that validated plan to the Scene Script.
4. Represent every part as a transform-bearing `Joint_<partId>` with a
   center-anchored, render-only `Visual_<partId>` child.
5. Place the Visual child from the decoded trimmed-image center relative to the
   authored proximal joint. The original untrimmed anchor is never assigned
   directly to the trimmed Sprite.
6. Assign a unique deterministic `Sorting2D.sortingOrder` to every Visual node
   so ordering is global across separate joint branches.
7. Load every SpriteFrame before mutating the live scene, build a detached
   replacement tree, and replace only the exact generated character root
   guarded by an internal marker.
8. Carry one `correlationId` through Panel, Main, Scene Script, diagnostics, and
   acceptance evidence.

## Consequences

- Contract parsing, image decoding, and semantic validation remain independent
  of Cocos runtime objects.
- Scene operations are deterministic, narrowly scoped, and idempotent.
- Joint transforms are suitable for future animation because visual trim
  compensation does not alter animation pivots.
- Global draw order does not depend on sibling relationships.
- Cocos AssetDB remains the authority for UUIDs; the pipeline does not invent
  `.meta` UUIDs.
- A scene-plan schema becomes an internal extension contract and must remain
  serializable across editor process boundaries.

# RFC-0016 — Animation Review Workspace

- Status: Accepted for PROGRAM-015D implementation
- Date: 2026-07-31
- Owners: GameAI Pipeline

## Summary

GameAI Pipeline needs a durable review surface between deterministic animation
generation and downstream acceptance. The surface must let an AI agent and a
human reviewer inspect the same character, clip, frame, structure, metrics,
findings, proposals, decisions, edits, and validation history without making a
recording the primary problem-description format.

PROGRAM-015D introduces a local-first Animation Review Workspace:

```text
Shared Workspace UI
        ↓
Animation Review Core
        ↓
Local Review Service
        ↓
Versioned Engine Adapter Protocol
        ↓
Cocos Scene Adapter / Runtime
```

## Motivation

The accepted pipeline already has deterministic animation sampling, semantic
events, Cocos runtime diagnostics, VFX render plans, exact reset, and strong
Creator lifecycle acceptance. Review still requires a person or agent to
reconstruct the relevant clip, time, node, symptom, and suggested change from
recordings and chat. That loses machine-readable context and makes the same
problem expensive to locate twice.

The workspace turns review into a revisioned document. Video remains optional
visual evidence for final external acceptance; it is no longer required to
communicate every intermediate issue.

## Requirements

### Shared review subject

A session binds:

- character, rig, clip, and source revision identity;
- current playback status/time/rate/loop;
- parts, hierarchy, pivots, sockets, hit areas, overlays, and draw order;
- tracks and keyframes;
- deterministic metrics and validation results;
- findings from validators, a local assistant, an external provider, or a
  human;
- decisions, adjustments, revisions, and audit history.

### Preview and timeline

Both hosts expose play, pause, exact seek, frame step, rate, loop, clip
selection, overlays, structure, and keyframes. Standalone renders accepted
sprite assets. The compact Cocos Panel controls and observes the actual active
runtime rather than inventing a second playback source.

### AI and human authority

AI output is a proposal. It must include a stable finding identity, location,
diagnosis, suggestion, allowed range, confidence, and provider provenance.
The output is schema validated and cannot mutate source or session state.

A human explicitly accepts or rejects a proposal. Only accepted proposals can
be applied through a constrained quick edit. Manual human edits are also
allowed. Every mutation requires the expected revision, creates a new
in-memory revision, records before/after values and actor identity, and
triggers deterministic revalidation.

### Export

Export is a self-contained JSON bundle with:

- review document;
- original source binding and current proposed animation;
- metrics and checklist;
- findings, decisions, adjustments, and audit history;
- adapter/session identity and deterministic manifest hashes.

Export does not require GIF, MP4, screenshot, or local Creator cache.

## Contracts

### Animation Review Document 1.0

The document uses SemVer `1.0.0`. Its stable public concepts are:

- subject;
- metrics;
- finding;
- checklist item;
- decision;
- adjustment;
- audit entry;
- review status and revision.

New optional fields may be added within the 1.x line only after compatibility
tests. Unknown major/minor versions fail closed until implemented.

### Engine Adapter Protocol 1.0

Requests and responses are plain JSON with:

- `protocolVersion`;
- correlated `requestId`;
- explicit `adapterId`;
- a closed command discriminant;
- command-specific payload;
- either a complete snapshot or a stable failure.

Commands are `describe`, `select-clip`, `play`, `pause`, `seek`, `step`,
`set-rate`, `set-loop`, `set-overlay`, and `exact-reset`. An adapter may
declare a command unavailable, but it cannot silently reinterpret it.

Snapshots expose portable 2D affine transforms and logical asset URLs. They
contain no Cocos `Node`, UUID, component, material, engine API, or object
reference.

## Components

### Animation Review Core

The engine-neutral core owns:

- schema parsing and stable diagnostics;
- deterministic metrics and baseline findings;
- review creation and deterministic serialization;
- revision, decision, and adjustment state transitions;
- provider-output validation;
- adapter request/response validation.

It imports no Cocos or browser API.

### Local Review Service

The service owns:

- loopback HTTP transport;
- one selected fixture/adapter;
- bounded request parsing and revision conflict handling;
- safe declared asset serving;
- process-lifetime workspace state;
- explicit export responses.

It binds only to `127.0.0.1` or `::1`. It has no remote server mode,
authentication credential store, file-upload surface, directory browser, or
source overwrite endpoint.

### Shared Workspace UI

One dependency-free TypeScript module owns layout, status, controls, preview,
structure, timeline, findings, checklist, decisions, quick edit, and export.
Host adapters provide transport:

- Cocos Panel transport uses `Editor.Message.request`;
- standalone transport uses same-origin `fetch`.

The UI contains no review rule or engine mutation logic.

### Cocos adapter/runtime

The Cocos boundary:

- finds the supported active runtime explicitly;
- validates the protocol request before action;
- invokes real playback/overlay/reset operations;
- snapshots the runtime and portable preview state;
- fails on absent/ambiguous runtime or stale request;
- preserves existing lifecycle, input, renderer, and Scene ownership.

## Security and data boundaries

- The service never reads, enumerates, hashes, logs, or serves
  `artifacts/experimental/`.
- A selected fixture root is resolved once. Assets must be declared, regular
  files, below the real fixture root, and a supported safe type.
- Request bodies have a fixed byte ceiling and JSON content type.
- State mutations require an expected revision and same-origin mutation token.
- Logs use review/session IDs and stable diagnostics, not private file names,
  absolute paths, asset hashes, or request bodies.
- Source animation documents and accepted assets are read-only.

## Rejected alternatives

### Recordings plus chat as the main review format

Recordings do not preserve target IDs, keyframe values, validation inputs,
decisions, or exact revision history. They remain useful only for final visual
acceptance.

### A Creator-only editor

That makes AI automation, clean tracked-only verification, and headless review
dependent on editor availability and prevents the same workflow from serving
future engine adapters.

### A standalone editor that reimplements playback

Forking animation semantics risks disagreement with accepted runtime behavior.
Standalone uses the same engine-neutral sampler through an adapter; Cocos uses
its real runtime.

### A large frontend framework

The repository has no existing shared frontend framework and the required UI
is bounded. Adding a framework, bundler, and component library would enlarge
the lockfile and extension/runtime surface without solving a demonstrated
problem.

### Direct cloud-model integration

Core policy prohibits unapproved cloud AI dependencies. A versioned provider
boundary plus deterministic local assistant gives AI agents a structured
interface without credentials, vendor coupling, or nondeterministic CI.

## Compatibility and non-goals

PROGRAM-015D does not change published Rig Animation, Character Semantic
Events, VFX Authoring, Character/Rig Layout, or Attachment schemas. It does
not implement a complete keyframe editor, IK, animation blending, mesh
deformation, automatic animation repair, arbitrary file editing, multiplayer
review, hosted service, Unity/Godot adapter, or production evidence recorder.

TASK-014D4 and TASK-016 remain separate, unstarted tasks.

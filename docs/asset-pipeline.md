# Asset States and Publication Pipeline

This policy separates disposable local experiments from assets that are
eligible for repository publication. It applies prospectively and does not
revoke or reinterpret accepted assets, historical evidence, or existing
rights/provenance records.

The three states are intentionally exclusive:

```text
Local Experimental Asset
→ Repository Candidate
→ Accepted Repository Asset
```

Promotion is explicit. Local use does not silently advance an asset or any
direct derivative to the next state.

## 1. Local Experimental Asset

A Local Experimental Asset is:

> disposable local-only experimental input, not approved for repository
> publication or redistribution

Use this state for exploration, prototypes, temporary visual validation, and
material that the project owner may choose to destroy after the experiment.
The only standard directory is:

```text
artifacts/experimental/<experiment-id>/
```

The complete experiment remains below that root, including:

- source images, audio, video, archives, and temporary generated assets;
- local Creator projects, Scenes, imports, caches, and runtime inputs;
- animation, VFX, screenshots, recordings, and framebuffer captures;
- analysis JSON, extracted frames, logs, and other direct evidence.

### Local permissions and limits

Local Experimental Assets may be used directly for local Creator, runtime,
animation, VFX, screenshot, recording, and framebuffer-analysis work.
Repository-level rights assertion or provenance publication is not required
for this purely local activity. Codex must not block a purely local experiment
only because those repository publication records are absent.

This local exception is not a legal conclusion. It does not mean copyright can
be ignored, does not grant or imply authorization, and does not establish
repository ownership, commercial-use permission, modification permission, or
redistribution permission. Applicable law, platform terms, organizational
rules, and project-owner instructions still apply.

“Do not upload to GitHub” is the core boundary:

- do not stage, commit, push, or add the material to Git;
- do not upload it to an evidence branch;
- do not attach it to a pull request;
- do not include it in a Tag, Release, CI artifact, or remote cache;
- do not use it as a required remote PR-check input.

Inputs and all direct derivatives stay ignored and untracked. The project
owner may explicitly authorize their deletion after the experiment. Agents
must not delete existing local experimental material without that explicit
authorization.

### Automation and privacy boundary

Automated tests and CI must treat `artifacts/experimental/` as opaque. They
must not read, enumerate, hash, inspect, archive, upload, or derive fixture
inventories from its contents. Policy checks may evaluate the literal path
string, `.gitignore`, and Git's tracked index without creating or examining
anything inside the ignored directory.

Public logs must not expose an experimental asset's filename, content hash,
absolute path, embedded metadata, personal information, credentials, or other
private content. A failure should report the policy rule or generic
experiment identifier, not local asset details.

## 2. Repository Candidate

Promotion begins before Git staging. When an experiment, source asset, or
directly derived image, audio, video, fixture, Scene, generated result, or
evidence is being prepared for tracking, pushing, review, or publication, it
becomes a Repository Candidate.

The candidate remains ignored and local-only until the promotion gate passes:

1. Record source identity, license or permission basis, allowed modification,
   commercial-use boundary, redistribution boundary, and required attribution.
2. Audit credentials, personal or private data, unsafe content, embedded
   metadata, and other prohibited publication material.
3. Establish an authoritative source and deterministic or documented
   generation closure for every tracked derivative.
4. Prove that tracked code, fixtures, generators, manifests, and Scenes do not
   require the ignored candidate or an absolute local path.
5. Run binary/media, generated-output, changed-file, and changed-line budget
   review.
6. Select the intended tracked destination outside
   `artifacts/experimental/`; the ignored directory itself is never promoted
   in place.

Before the gate passes, no tracked code, Scene, fixture, generator, manifest,
test, or CI workflow may form a required dependency on the candidate. A
tracked interface may instead use a public, programmatic, synthetic, or
already accepted placeholder.

## 3. Accepted Repository Asset

Only an Accepted Repository Asset may enter Git. Acceptance requires:

- documented source, license or authorization, modification rights, and
  redistribution boundary;
- no credentials, private data, prohibited content, or disallowed metadata;
- complete and reviewable provenance and generated-output closure;
- a clean tracked-files-only checkout that independently installs, generates,
  tests, and verifies without any ignored local experimental input;
- passed binary/media, publication, and scope-budget audits.

Acceptance applies only to the reviewed bytes and declared derivatives. It
does not automatically approve unrelated files from the same experiment.

## Code, Creator, evidence, and CI boundary

Code developed during a local experiment may be proposed independently, but
it must use tracked interfaces or accepted fixtures and pass in a clean
checkout where `artifacts/experimental/` does not exist. Local experiment
names, hashes, absolute paths, or private details must not be embedded in
tracked code or public diagnostics.

A local Creator Scene, runtime capture, screenshot, video, fixture, generated
asset, or analysis that directly depends on Local Experimental Assets remains
local-only too. If any such derivative is prepared for tracking or
publication, both it and the required source closure enter Repository
Candidate review.

CI and remote PR checks use public, programmatic, synthetic, or already
accepted fixtures. Local experimental recordings may support a developer's
local judgment but cannot be a mandatory input to remote checks.

## Relationship to accepted assets

This policy does not retroactively change accepted assets or their publication
records. In particular, PROGRAM-015 source authority, rights assertions,
provenance, generated assets, runtime acceptance, and historical evidence
retain their existing status and bytes.

Local Experimental Asset Mode was integrated through PR #25. The v0.5.0
Production Character Vertical Slice Baseline applies this policy
prospectively: ignored local experiments remain outside the release, while
PROGRAM-015 remains an Accepted Repository Asset set governed by its existing
project-owner-reviewed rights/provenance and deterministic closure.

Implementation and acceptance criteria for this policy are recorded in
[`tasks/POLICY-local-experimental-asset-mode.md`](../tasks/POLICY-local-experimental-asset-mode.md).

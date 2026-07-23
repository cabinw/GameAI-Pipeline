# ADR-0006: Derive generated rigs from untrimmed source-space joints

- Status: Accepted
- Date: 2026-07-23

## Context

Rig Layout generation needs a durable input contract and an unambiguous coordinate conversion. Trimmed image centers change whenever transparent pixels are removed, so using them as pivots would make a rig unstable across harmless art-export changes. Parent-relative transforms also become inconsistent if they are derived from independently cropped images.

## Decision

Add versioned Source Canvas Annotation and Skeleton Template contracts, initially supporting `>=1.0.0 <1.1.0`, and derive every generated transform from authored joint positions in one common source canvas.

- Source coordinates use top-left origin, positive X right, and positive Y down.
- A part anchor is its source joint normalized inside the untrimmed `originalRect`.
- A child rest position is the child-joint delta from its parent joint, multiplied by `referenceScale`, with Y inverted.
- A root rest position is the root-joint delta from the source-canvas center using the same scale and Y inversion.
- `visualCenter` is descriptive only and never influences pivots or transforms.
- Trim metadata locates decoded trimmed pixels inside the untrimmed rectangle; it does not redefine the joint.
- Template sockets and hit areas use normalized untrimmed-part coordinates and are converted into parent-local reference space.
- Generated output must pass both Character Contract and Character Asset Intake validation before success.

## Consequences

- Re-trimming an image without changing its source rectangle or joint does not move its pivot or rest pose.
- All hierarchy transforms are reproducible from plain source annotations without engine APIs or image analysis.
- Annotation authors or upstream tools must provide joints; the generator does not infer them with computer vision.
- The two new contract families follow the same fail-closed minor-version policy as Character Contracts.
- Changing these coordinate meanings requires a contract-major version and migration guidance.

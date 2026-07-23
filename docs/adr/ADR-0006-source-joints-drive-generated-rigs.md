# ADR-0006: Derive generated rigs from untrimmed source-space joints

- Status: Accepted
- Date: 2026-07-23
- Amended: 2026-07-23 by TASK-003.1

## Context

Rig Layout generation needs a durable input contract and an unambiguous coordinate conversion. Trimmed image centers change whenever transparent pixels are removed, so using them as pivots would make a rig unstable across harmless art-export changes. Parent-relative transforms also become inconsistent if they are derived from independently cropped images.

## Decision

Add versioned Source Canvas Annotation and Skeleton Template contracts and derive every generated transform from authored joint and attachment positions in one common source canvas.

- Source coordinates use top-left origin, positive X right, and positive Y down.
- A part `joint` is always its proximal animation pivot: waist, neck, shoulder, elbow, wrist, hip, knee, or ankle as applicable.
- A part anchor is its proximal source joint normalized inside the untrimmed `originalRect`.
- Source Annotation 1.1 adds parent-owned named `childAttachments`. Each record identifies one direct child and a source-canvas position that must coincide with the child's proximal joint.
- The parent proximal `joint` and its distal child attachments are separate semantic records. One joint is never overloaded to represent both ends of a part.
- A child rest position is the delta from its parent's proximal joint to the parent's named attachment for that child, multiplied by `referenceScale`, with Y inverted.
- Source Annotation 1.0 remains readable by treating the child's proximal joint as the attachment position. Newly authored annotations use 1.1 and explicit attachments.
- A root rest position is the root-joint delta from the source-canvas center using the same scale and Y inversion.
- `visualCenter` is descriptive only and never influences pivots or transforms.
- Trim metadata locates decoded trimmed pixels inside the untrimmed rectangle; it does not redefine the joint.
- Template sockets and hit areas use normalized untrimmed-part coordinates and are converted into parent-local reference space.
- Generated output must pass both Character Contract and Character Asset Intake validation before success.

## Consequences

- Re-trimming an image without changing its source rectangle or joint does not move its pivot or rest pose.
- All hierarchy transforms are reproducible from plain source annotations without engine APIs or image analysis.
- Annotation authors or upstream tools must provide proximal joints and, for 1.1 documents, named child attachments; the generator does not infer them with computer vision.
- Future animation generation can address named parent-to-child connections without reinterpreting a part's proximal pivot as a distal joint.
- The two new contract families follow the same fail-closed minor-version policy as Character Contracts.
- Changing these coordinate meanings requires a contract-major version and migration guidance.

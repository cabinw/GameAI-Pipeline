import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { buildCocosOneHandedPropPlan } from "../source/one-handed-prop-adapter";

const repositoryRoot = path.resolve(__dirname, "../../../../../../../");
const baseRoot = path.join(repositoryRoot, "examples/production-lite-character");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const json = (root: string, file: string) =>
  JSON.parse(readFileSync(path.join(root, file), "utf8"));

test("builds a generic Cocos plan entirely from neutral prop contracts", async () => {
  const rig = json(fixtureRoot, "rig-layout.json");
  const attachments = json(fixtureRoot, "attachment-layout.json");
  const clips = ["prop-rest", "prop-walk", "prop-swing", "prop-stress"].map(
    (name) => json(fixtureRoot, `animations/${name}.json`),
  );
  const baseDimensions = Object.fromEntries(
    await Promise.all(
      rig.parts.map(async (part: { partId: string; file: string }) => {
        const metadata = await sharp(path.join(baseRoot, part.file)).metadata();
        return [part.partId, { width: metadata.width!, height: metadata.height! }];
      }),
    ),
  );
  const attachmentDimensions = Object.fromEntries(
    await Promise.all(
      attachments.attachments.map(
        async (attachment: { attachmentId: string; file: string }) => {
          const metadata = await sharp(
            path.join(fixtureRoot, attachment.file),
          ).metadata();
          return [
            attachment.attachmentId,
            { width: metadata.width!, height: metadata.height! },
          ];
        },
      ),
    ),
  );
  const plan = buildCocosOneHandedPropPlan(
    rig,
    attachments,
    clips,
    baseDimensions,
    attachmentDimensions,
  );
  assert.equal(plan.planVersion, "1.0.0");
  assert.deepEqual(
    plan.sockets.map((socket) => socket.socketId),
    ["hand-left-grip", "hand-right-grip"],
  );
  assert.deepEqual(
    plan.propStates.map((state) => state.propStateId),
    ["left-hand-prop", "right-hand-prop"],
  );
  assert.equal(plan.attachments.length, 4);
  assert.equal(plan.base.clips.length, 4);
  assert.equal(
    plan.attachments
      .filter((attachment) => attachment.attachmentKind === "prop")
      .every(
        (attachment) =>
          attachment.gripAnchor !== undefined &&
          attachment.handOverlayAttachmentId !== undefined &&
          attachment.target?.kind === "socket",
      ),
    true,
  );
  const combined = [
    ...plan.base.parts.map((part) => part.sortingOrder),
    ...plan.attachments.map((attachment) => attachment.sortingOrder),
  ];
  assert.equal(new Set(combined).size, combined.length);
});

test("acceptance runtime documents every requested mode and debug control", () => {
  const runtime = readFileSync(
    path.join(
      repositoryRoot,
      "cocos/projects/character-rig-builder-mvp/assets/gameai/one-handed-prop/one-handed-prop-demo.ts",
    ),
    "utf8",
  );
  for (const required of [
    "AuthoredReferenceView",
    "AssembledCharacterView",
    "ReferenceAssembledOverlay",
    "Socket_",
    "Grip_",
    "Bounds_",
    "ParentLink_",
    "layerLabel",
    "SkeletonDebugView",
    "Space Pause/Resume",
    "R Exact Reset",
    "Z No Prop",
    "X Left Hand",
    "C Right Hand",
  ]) {
    assert.equal(runtime.includes(required), true, required);
  }
});

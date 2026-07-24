import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  ValidationErrorCode,
  parseAttachmentLayout,
  resolveAttachmentLayout,
  type ValidationResult,
} from "../source";

const repositoryRoot = resolve(__dirname, "../../../..");
const fixtureRoot = resolve(
  repositoryRoot,
  "examples/production-lite-one-handed-prop",
);
const rig = JSON.parse(readFileSync(resolve(fixtureRoot, "rig-layout.json"), "utf8"));
const valid = JSON.parse(
  readFileSync(resolve(fixtureRoot, "attachment-layout.json"), "utf8"),
);
const codes = (result: ValidationResult<unknown>) =>
  result.ok ? [] : result.errors.map((error) => error.code);

test("parses generic one-handed prop targets and resolves immutable prop state", () => {
  const parsed = parseAttachmentLayout(JSON.stringify(valid), rig);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const before = JSON.stringify(parsed.value);
  const left = resolveAttachmentLayout(
    parsed.value,
    {},
    {},
    { "left-hand-prop": true, "right-hand-prop": false },
  );
  assert.deepEqual(
    left.filter((item) => item.enabled).map((item) => item.attachmentId),
    ["toolbox-left", "hand-overlay-left"],
  );
  assert.equal(JSON.stringify(parsed.value), before);
  assert.deepEqual(
    parsed.value.slots.map((slot) => slot.target?.id),
    ["hand-left-grip", "hand-right-grip"],
  );
});

test("returns stable diagnostics for every required invalid prop mutation", () => {
  const cases: Array<{
    code: (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];
    mutate: (fixture: any, targetRig: any) => void;
  }> = [
    {
      code: ValidationErrorCode.UNKNOWN_ATTACHMENT_SOCKET,
      mutate: (fixture) => {
        fixture.slots[0].target.id = "missing-socket";
      },
    },
    {
      code: ValidationErrorCode.MISSING_GRIP_ANCHOR,
      mutate: (fixture) => {
        delete fixture.attachments[0].gripAnchor;
      },
    },
    {
      code: ValidationErrorCode.INVALID_ATTACHMENT_TRANSFORM,
      mutate: (fixture) => {
        fixture.attachments[0].transform.scale.x = 0;
      },
    },
    {
      code: ValidationErrorCode.DUPLICATE_ATTACHMENT_ID,
      mutate: (fixture) => {
        fixture.attachments[1].attachmentId = fixture.attachments[0].attachmentId;
      },
    },
    {
      code: ValidationErrorCode.UNSUPPORTED_ATTACHMENT_TARGET,
      mutate: (fixture) => {
        fixture.slots[0].target.kind = "engine-node";
      },
    },
    {
      code: ValidationErrorCode.INVALID_ATTACHMENT_LAYER_ROLE,
      mutate: (fixture) => {
        fixture.attachments[0].layerRole = "cocos-sorting-layer";
      },
    },
    {
      code: ValidationErrorCode.MISSING_HAND_OVERLAY_PART,
      mutate: (fixture) => {
        fixture.attachments[0].handOverlayAttachmentId = "missing-overlay";
      },
    },
    {
      code: ValidationErrorCode.UNKNOWN_ATTACHMENT_TARGET_PART,
      mutate: (fixture) => {
        fixture.slots[0].target = { kind: "part", id: "missing-hand" };
      },
    },
    {
      code: ValidationErrorCode.UNSUPPORTED_SCHEMA_VERSION,
      mutate: (fixture) => {
        fixture.schemaVersion = "2.0.0";
      },
    },
  ];
  for (const { code, mutate } of cases) {
    const fixture = structuredClone(valid);
    const targetRig = structuredClone(rig);
    mutate(fixture, targetRig);
    assert.equal(
      codes(parseAttachmentLayout(JSON.stringify(fixture), targetRig)).includes(code),
      true,
      code,
    );
  }
});

test("rejects overlay slots whose target part is absent", () => {
  const fixture = structuredClone(valid);
  fixture.slots[0].target = { kind: "part", id: "missing-overlay-target" };
  const result = parseAttachmentLayout(JSON.stringify(fixture), rig);
  assert.equal(
    codes(result).includes(ValidationErrorCode.UNKNOWN_ATTACHMENT_TARGET_PART),
    true,
  );
});

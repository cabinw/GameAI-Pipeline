import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  ValidationErrorCode,
  attachmentLayoutSchema,
  characterRigSchema,
  composeAttachmentWorldTransform,
  isSupportedSchemaVersion,
  parseAttachmentLayout,
  parseCharacterContract,
  parseCharacterRig,
  parseRigLayout,
  rigLayoutSchema,
  resolveAttachmentLayout,
  type ValidationErrorCodeValue,
  type ValidationResult,
} from "../source";

const repositoryRoot = resolve(__dirname, "../../../..");

function readRepositoryFile(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function readFixtureMap(path: string): Record<string, unknown> {
  return JSON.parse(readRepositoryFile(path)) as Record<string, unknown>;
}

function errorCodes(result: ValidationResult<unknown>): ValidationErrorCodeValue[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

const validCharacterRigText = readRepositoryFile("examples/red-cap-target/character-rig.json");
const validRigLayoutText = readRepositoryFile("examples/red-cap-target/rig-layout.json");
const stickmanCharacterRigText = readRepositoryFile(
  "examples/stickman-reference/character-rig.json",
);
const stickmanRigLayoutText = readRepositoryFile(
  "examples/stickman-reference/rig-layout.json",
);
const invalidRigLayouts = readFixtureMap(
  "framework/character-contracts/test/fixtures/invalid-rig-layouts.json",
);
const invalidCharacterRigs = readFixtureMap(
  "framework/character-contracts/test/fixtures/invalid-character-rigs.json",
);
const productionLiteRigLayoutText = readRepositoryFile(
  "examples/production-lite-character/rig-layout.json",
);
const validAttachmentLayoutText = readRepositoryFile(
  "examples/production-lite-head-accessories/attachment-layout.json",
);
const validGarmentLayoutText = readRepositoryFile(
  "examples/production-lite-garment-layering/attachment-layout.json",
);

describe("Attachment Layout contract", () => {
  it("parses generic slots and resolves deterministic default/override state", () => {
    const rigLayout = parseRigLayout(productionLiteRigLayoutText);
    assert.equal(rigLayout.ok, true);
    if (!rigLayout.ok) return;
    const parsed = parseAttachmentLayout(validAttachmentLayoutText, rigLayout.value);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(
      parsed.value.slots.map((slot) => slot.slotId),
      ["headwear", "face-accessory"],
    );
    const defaults = resolveAttachmentLayout(parsed.value);
    assert.equal(defaults.every((attachment) => attachment.enabled), true);
    const overridden = resolveAttachmentLayout(parsed.value, {
      headwear: false,
      "face-accessory": true,
    });
    assert.deepEqual(
      overridden.map((attachment) => [
        attachment.attachmentId,
        attachment.enabled,
      ]),
      [
        ["cap-back", false],
        ["sunglasses", true],
        ["cap-front", false],
      ],
    );
  });

  it("rejects duplicate slots, attachment IDs, slots, order, and unknown parents", () => {
    const rigLayout = JSON.parse(productionLiteRigLayoutText);
    const fixture = JSON.parse(validAttachmentLayoutText);
    fixture.slots.push(structuredClone(fixture.slots[0]));
    fixture.attachments.push(structuredClone(fixture.attachments[0]));
    fixture.attachments[1].slotId = "unknown-slot";
    fixture.attachments[2].drawOrder = fixture.attachments[0].drawOrder;
    fixture.slots[1].parentPartId = "unknown-head";
    const result = parseAttachmentLayout(JSON.stringify(fixture), rigLayout);
    const codes = errorCodes(result);
    for (const code of [
      ValidationErrorCode.DUPLICATE_ATTACHMENT_SLOT_ID,
      ValidationErrorCode.DUPLICATE_ATTACHMENT_ID,
      ValidationErrorCode.UNKNOWN_ATTACHMENT_SLOT,
      ValidationErrorCode.DUPLICATE_ATTACHMENT_DRAW_ORDER,
      ValidationErrorCode.UNKNOWN_PARENT,
    ]) {
      assert.equal(codes.includes(code), true, code);
    }
  });

  it("rejects incompatible rigs, unsafe files, anchors, and transforms", () => {
    const rigLayout = JSON.parse(productionLiteRigLayoutText);
    const incompatible = JSON.parse(validAttachmentLayoutText);
    incompatible.rig.layoutId = "other-layout";
    assert.equal(
      errorCodes(
        parseAttachmentLayout(JSON.stringify(incompatible), rigLayout),
      ).includes(ValidationErrorCode.INCOMPATIBLE_ATTACHMENT_RIG),
      true,
    );
    for (const [mutate, code] of [
      [
        (fixture: any) => {
          fixture.attachments[0].file = "../cap.png";
        },
        ValidationErrorCode.INVALID_FILE_PATH,
      ],
      [
        (fixture: any) => {
          fixture.attachments[1].anchor.x = 2;
        },
        ValidationErrorCode.INVALID_NORMALIZED_ANCHOR,
      ],
      [
        (fixture: any) => {
          fixture.attachments[2].transform.scale.x = 0;
        },
        ValidationErrorCode.INVALID_ATTACHMENT_TRANSFORM,
      ],
    ] as const) {
      const fixture = JSON.parse(validAttachmentLayoutText);
      mutate(fixture);
      assert.equal(
        errorCodes(
          parseAttachmentLayout(JSON.stringify(fixture), rigLayout),
        ).includes(code),
        true,
        code,
      );
    }
  });

  it("composes parent, slot, and attachment transforms without engine values", () => {
    assert.deepEqual(
      composeAttachmentWorldTransform(
        { a: 0, b: 1, c: -1, d: 0, tx: 10, ty: 20 },
        {
          position: { x: 0, y: 5 },
          rotationDegrees: 0,
          scale: { x: 1, y: 1 },
        },
        {
          position: { x: 2, y: 0 },
          rotationDegrees: 0,
          scale: { x: 1, y: 1 },
        },
      ),
      { a: 0, b: 1, c: -1, d: 0, tx: 5, ty: 22 },
    );
  });

  it("parses wearable sets, grouped state, and authored seam constraints", () => {
    const rigLayout = parseRigLayout(productionLiteRigLayoutText);
    assert.equal(rigLayout.ok, true);
    if (!rigLayout.ok) return;
    const parsed = parseAttachmentLayout(validGarmentLayoutText, rigLayout.value);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(
      parsed.value.wearableSets?.map((set) => set.wearableSetId),
      ["casual-jacket"],
    );
    assert.equal(parsed.value.seams?.length, 10);
    const enabled = resolveAttachmentLayout(parsed.value, {}, {
      "casual-jacket": true,
    });
    const disabled = resolveAttachmentLayout(parsed.value, {}, {
      "casual-jacket": false,
    });
    assert.equal(
      enabled.filter((item) => item.wearableSetId === "casual-jacket").every(
        (item) => item.enabled,
      ),
      true,
    );
    assert.equal(
      disabled.filter((item) => item.wearableSetId === "casual-jacket").every(
        (item) => !item.enabled,
      ),
      true,
    );
    assert.equal(
      disabled.find((item) => item.attachmentId === "cap-front")?.enabled,
      true,
    );
  });

  it("rejects duplicate and unknown wearable sets and seam items", () => {
    const rigLayout = JSON.parse(productionLiteRigLayoutText);
    const fixture = JSON.parse(validGarmentLayoutText);
    fixture.wearableSets.push(structuredClone(fixture.wearableSets[0]));
    fixture.attachments[0].wearableSetId = "unknown-wearable";
    fixture.seams.push(structuredClone(fixture.seams[0]));
    fixture.seams[0].firstItemId = "missing-garment-part";
    const codes = errorCodes(
      parseAttachmentLayout(JSON.stringify(fixture), rigLayout),
    );
    for (const code of [
      ValidationErrorCode.DUPLICATE_WEARABLE_SET_ID,
      ValidationErrorCode.UNKNOWN_WEARABLE_SET,
      ValidationErrorCode.DUPLICATE_ATTACHMENT_SEAM_ID,
      ValidationErrorCode.UNKNOWN_ATTACHMENT_SEAM_ITEM,
    ]) {
      assert.equal(codes.includes(code), true, code);
    }
  });
});

describe("Red Cap Target character contract", () => {
  it("parses the complete textual fixture into typed contracts", () => {
    const result = parseCharacterContract(validCharacterRigText, validRigLayoutText);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.characterRig.characterId, "red-cap-target");
      assert.equal(result.value.rigLayout.parts.length, 18);
      assert.equal(result.value.rigLayout.sockets?.length, 3);
      assert.equal(result.value.rigLayout.hitAreas?.length, 2);
    }
  });

  it("returns a stable JSON parse error", () => {
    const result = parseCharacterRig("{ not-json }");
    assert.deepEqual(errorCodes(result), [ValidationErrorCode.JSON_PARSE_ERROR]);
  });

  it("returns a generic schema code for malformed document shape", () => {
    const result = parseCharacterRig('{"schemaVersion":"1.0.0"}');
    assert.equal(errorCodes(result).includes(ValidationErrorCode.SCHEMA_VALIDATION_ERROR), true);
  });
});

describe("minimal stickman reference contract", () => {
  it("validates all 16 stable parts, one root, pivots, rest transforms, and draw order", () => {
    const result = parseCharacterContract(
      stickmanCharacterRigText,
      stickmanRigLayoutText,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.characterRig.characterId, "stickman-reference");
    assert.equal(result.value.rigLayout.parts.length, 16);
    assert.deepEqual(
      result.value.rigLayout.parts.filter((part) => part.parentId === null).map(
        (part) => part.partId,
      ),
      ["root"],
    );
    assert.equal(
      new Set(result.value.rigLayout.parts.map((part) => part.drawOrder)).size,
      16,
    );
    assert.ok(
      result.value.rigLayout.parts.every(
        (part) =>
          Number.isFinite(part.anchor.x) &&
          Number.isFinite(part.anchor.y) &&
          Number.isFinite(part.restPose.position.x) &&
          Number.isFinite(part.restPose.position.y) &&
          Number.isFinite(part.restPose.rotationDegrees),
      ),
    );
  });
});

describe("Rig Layout semantic fixtures", () => {
  const cases: Array<[string, ValidationErrorCodeValue]> = [
    ["duplicatePartIds", ValidationErrorCode.DUPLICATE_PART_ID],
    ["unknownParent", ValidationErrorCode.UNKNOWN_PARENT],
    ["parentCycle", ValidationErrorCode.PARENT_CYCLE],
    ["invalidAnchor", ValidationErrorCode.INVALID_NORMALIZED_ANCHOR],
    ["invalidRectangle", ValidationErrorCode.INVALID_RECTANGLE],
    ["duplicateDrawOrder", ValidationErrorCode.DUPLICATE_DRAW_ORDER],
    ["unsupportedVersion", ValidationErrorCode.UNSUPPORTED_SCHEMA_VERSION],
    ["unsafeFilePath", ValidationErrorCode.INVALID_FILE_PATH],
  ];

  for (const [fixtureName, expectedCode] of cases) {
    it(`detects ${fixtureName} as ${expectedCode}`, () => {
      const result = parseRigLayout(JSON.stringify(invalidRigLayouts[fixtureName]));
      assert.equal(errorCodes(result).includes(expectedCode), true);
    });
  }

  it("permits duplicate draw order when the policy is shared", () => {
    const fixture = structuredClone(invalidRigLayouts.duplicateDrawOrder) as {
      drawOrderPolicy: string;
    };
    fixture.drawOrderPolicy = "shared";
    const result = parseRigLayout(JSON.stringify(fixture));
    assert.equal(result.ok, true);
  });

  it("detects duplicate socket and hit-area IDs", () => {
    const fixture = JSON.parse(validRigLayoutText) as {
      sockets: unknown[];
      hitAreas: unknown[];
    };
    fixture.sockets.push(structuredClone(fixture.sockets[0]));
    fixture.hitAreas.push(structuredClone(fixture.hitAreas[0]));
    const result = parseRigLayout(JSON.stringify(fixture));
    assert.equal(errorCodes(result).includes(ValidationErrorCode.DUPLICATE_SOCKET_ID), true);
    assert.equal(errorCodes(result).includes(ValidationErrorCode.DUPLICATE_HIT_AREA_ID), true);
  });

  it("detects a layout without exactly one hierarchy root", () => {
    const fixture = JSON.parse(validRigLayoutText) as {
      parts: Array<{ partId: string; parentId: string | null }>;
    };
    const torso = fixture.parts.find((part) => part.partId === "torso");
    assert.ok(torso);
    torso.parentId = null;
    const result = parseRigLayout(JSON.stringify(fixture));
    assert.equal(errorCodes(result).includes(ValidationErrorCode.INVALID_ROOT_COUNT), true);
  });
});

describe("cross-document semantic fixtures", () => {
  it("detects missing required parts", () => {
    const result = parseCharacterContract(
      JSON.stringify(invalidCharacterRigs.missingRequiredPart),
      validRigLayoutText,
    );
    assert.equal(errorCodes(result).includes(ValidationErrorCode.MISSING_REQUIRED_PART), true);
  });

  it("detects missing required animation target bindings", () => {
    const result = parseCharacterContract(
      JSON.stringify(invalidCharacterRigs.missingAnimationTarget),
      validRigLayoutText,
    );
    assert.equal(
      errorCodes(result).includes(ValidationErrorCode.MISSING_ANIMATION_TARGET),
      true,
    );
  });

  it("detects animation targets bound to missing layout parts", () => {
    const result = parseCharacterContract(
      JSON.stringify(invalidCharacterRigs.animationTargetMissingPart),
      validRigLayoutText,
    );
    assert.equal(
      errorCodes(result).includes(ValidationErrorCode.MISSING_ANIMATION_TARGET),
      true,
    );
  });

  it("detects unsupported Character Rig versions", () => {
    const result = parseCharacterRig(JSON.stringify(invalidCharacterRigs.unsupportedVersion));
    assert.deepEqual(errorCodes(result), [ValidationErrorCode.UNSUPPORTED_SCHEMA_VERSION]);
  });

  it("detects duplicate animation target IDs", () => {
    const fixture = JSON.parse(validCharacterRigText) as {
      animationTargets: Array<{ targetId: string; partId: string }>;
    };
    const target = fixture.animationTargets[0];
    assert.ok(target);
    fixture.animationTargets.push(structuredClone(target));
    const result = parseCharacterRig(JSON.stringify(fixture));
    assert.equal(
      errorCodes(result).includes(ValidationErrorCode.DUPLICATE_ANIMATION_TARGET_ID),
      true,
    );
  });
});

describe("schema compatibility", () => {
  it("accepts patches in the implemented 1.0 line and rejects newer minors", () => {
    assert.equal(isSupportedSchemaVersion("1.0.0"), true);
    assert.equal(isSupportedSchemaVersion("1.0.99"), true);
    assert.equal(isSupportedSchemaVersion("1.1.0"), false);
    assert.equal(isSupportedSchemaVersion("2.0.0"), false);
  });

  it("keeps canonical schemas and package build copies byte-identical", () => {
    for (const file of [
      "attachment-layout.schema.json",
      "character-rig.schema.json",
      "rig-layout.schema.json",
    ]) {
      const canonical = readRepositoryFile(`schemas/${file}`);
      const built = readRepositoryFile(`framework/character-contracts/dist/schemas/${file}`);
      assert.equal(built, canonical);
    }
  });

  it("exports both canonical schema identifiers", () => {
    assert.equal(
      attachmentLayoutSchema.$id,
      "https://gameai-pipeline.dev/schemas/attachment-layout/v1.0.0",
    );
    assert.equal(
      characterRigSchema.$id,
      "https://gameai-pipeline.dev/schemas/character-rig/v1.0.0",
    );
    assert.equal(
      rigLayoutSchema.$id,
      "https://gameai-pipeline.dev/schemas/rig-layout/v1.0.0",
    );
  });

  it("keeps the public error-code values stable", () => {
    assert.deepEqual(Object.values(ValidationErrorCode).sort(), [
      "DUPLICATE_ANIMATION_TARGET_ID",
      "DUPLICATE_ATTACHMENT_DRAW_ORDER",
      "DUPLICATE_ATTACHMENT_ID",
      "DUPLICATE_ATTACHMENT_SEAM_ID",
      "DUPLICATE_ATTACHMENT_SLOT_ID",
      "DUPLICATE_DRAW_ORDER",
      "DUPLICATE_HIT_AREA_ID",
      "DUPLICATE_PART_ID",
      "DUPLICATE_PROP_STATE_ID",
      "DUPLICATE_SOCKET_ID",
      "DUPLICATE_WEARABLE_SET_ID",
      "INCOMPATIBLE_ATTACHMENT_RIG",
      "INVALID_ATTACHMENT_LAYER_ROLE",
      "INVALID_ATTACHMENT_TRANSFORM",
      "INVALID_FILE_PATH",
      "INVALID_NORMALIZED_ANCHOR",
      "INVALID_RECTANGLE",
      "INVALID_ROOT_COUNT",
      "JSON_PARSE_ERROR",
      "MISSING_ANIMATION_TARGET",
      "MISSING_GRIP_ANCHOR",
      "MISSING_HAND_OVERLAY_PART",
      "MISSING_REQUIRED_PART",
      "PARENT_CYCLE",
      "SCHEMA_VALIDATION_ERROR",
      "UNKNOWN_ATTACHMENT_SEAM_ITEM",
      "UNKNOWN_ATTACHMENT_SLOT",
      "UNKNOWN_ATTACHMENT_SOCKET",
      "UNKNOWN_ATTACHMENT_TARGET_PART",
      "UNKNOWN_PARENT",
      "UNKNOWN_PROP_STATE",
      "UNKNOWN_WEARABLE_SET",
      "UNSUPPORTED_ATTACHMENT_TARGET",
      "UNSUPPORTED_SCHEMA_VERSION",
    ]);
  });
});

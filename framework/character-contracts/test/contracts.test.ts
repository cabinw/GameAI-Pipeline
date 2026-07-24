import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import {
  ValidationErrorCode,
  characterRigSchema,
  isSupportedSchemaVersion,
  parseCharacterContract,
  parseCharacterRig,
  parseRigLayout,
  rigLayoutSchema,
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
    for (const file of ["character-rig.schema.json", "rig-layout.schema.json"]) {
      const canonical = readRepositoryFile(`schemas/${file}`);
      const built = readRepositoryFile(`framework/character-contracts/dist/schemas/${file}`);
      assert.equal(built, canonical);
    }
  });

  it("exports both canonical schema identifiers", () => {
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
      "DUPLICATE_DRAW_ORDER",
      "DUPLICATE_HIT_AREA_ID",
      "DUPLICATE_PART_ID",
      "DUPLICATE_SOCKET_ID",
      "INVALID_FILE_PATH",
      "INVALID_NORMALIZED_ANCHOR",
      "INVALID_RECTANGLE",
      "INVALID_ROOT_COUNT",
      "JSON_PARSE_ERROR",
      "MISSING_ANIMATION_TARGET",
      "MISSING_REQUIRED_PART",
      "PARENT_CYCLE",
      "SCHEMA_VALIDATION_ERROR",
      "UNKNOWN_PARENT",
      "UNSUPPORTED_SCHEMA_VERSION",
    ]);
  });
});

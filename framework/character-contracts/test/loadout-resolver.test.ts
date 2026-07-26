import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CharacterLoadoutError,
  measureAttachmentSocketToAnchorError,
  resolveCharacterLoadout,
  validateSemanticClipIds,
  type AttachmentLayout,
  type CharacterLoadoutContract,
  type RigLayout,
} from "../source";

const repositoryRoot = path.resolve(__dirname, "../../../..");
const fixtureRoot = path.join(
  repositoryRoot,
  "examples/production-lite-full-loadout",
);
const readJson = (file: string) =>
  JSON.parse(readFileSync(path.join(fixtureRoot, file), "utf8"));
const rigLayout = readJson("rig-layout.json") as RigLayout;
const serialized = readJson("loadout-contract.json") as {
  schemaVersion: string;
  loadoutId: string;
  rig: { layoutId: string; schemaVersion: string };
  families: Array<{ familyId: string; attachmentLayoutFile: string }>;
  states: CharacterLoadoutContract["states"];
  exclusiveGroups: NonNullable<CharacterLoadoutContract["exclusiveGroups"]>;
  requiredSemanticClipIds: string[];
};
const contract: CharacterLoadoutContract = {
  ...serialized,
  families: serialized.families.map((family) => ({
    familyId: family.familyId,
    attachmentLayout: readJson(family.attachmentLayoutFile) as AttachmentLayout,
  })),
};
const requiredPresetIds = [
  "base-only-with-no-prop",
  "accessories-only-with-no-prop",
  "garment-only-with-no-prop",
  "base-only-with-left-hand-prop",
  "garment-and-accessories-with-no-prop",
  "garment-only-with-left-hand-prop",
  "accessories-only-with-left-hand-prop",
  "garment-and-accessories-with-left-hand-prop",
] as const;

function expectCode(
  code: CharacterLoadoutError["code"],
  action: () => unknown,
): void {
  assert.throws(action, (error) => {
    assert.equal(error instanceof CharacterLoadoutError, true);
    assert.equal((error as CharacterLoadoutError).code, code);
    return true;
  });
}

test("resolves all eight required loadout presets through one generic path", () => {
  for (const stateId of requiredPresetIds) {
    const result = resolveCharacterLoadout(rigLayout, contract, stateId);
    assert.equal(result.stateId, stateId);
    assert.deepEqual(
      result.globalLayers.map((layer) => layer.drawOrder),
      [...result.globalLayers.map((layer) => layer.drawOrder)].sort(
        (left, right) => left - right,
      ),
    );
  }
  assert.equal(
    resolveCharacterLoadout(rigLayout, contract, "base-only-with-no-prop").enabledAttachments
      .length,
    0,
  );
  assert.equal(
    resolveCharacterLoadout(rigLayout, contract, "garment-and-accessories-with-left-hand-prop")
      .enabledAttachments.length,
    16,
  );
});

test("engine-neutral contract is the complete unique 4-by-3 canonical state matrix", () => {
  assert.equal(contract.states.length, 12);
  assert.equal(
    new Set(contract.states.map((state) => state.stateId)).size,
    12,
  );
  const expected = [
    "base-only",
    "garment-only",
    "accessories-only",
    "garment-and-accessories",
  ].flatMap((familyState) =>
    ["no-prop", "left-hand-prop", "right-hand-prop"].map(
      (propState) => `${familyState}-with-${propState}`,
    ),
  );
  assert.deepEqual(
    contract.states.map((state) => state.stateId).sort(),
    expected.sort(),
  );
});

test("supports no-prop, left-hand, and right-hand full-loadout states", () => {
  const ids = (stateId: string) =>
    resolveCharacterLoadout(rigLayout, contract, stateId).enabledAttachments.map(
      (attachment) => attachment.attachmentId,
    );
  assert.equal(ids("garment-and-accessories-with-no-prop").some((id) => id.includes("toolbox")), false);
  assert.deepEqual(
    ids("garment-and-accessories-with-left-hand-prop").filter((id) => id.startsWith("toolbox")),
    ["toolbox-left"],
  );
  assert.deepEqual(
    ids("garment-and-accessories-with-right-hand-prop").filter((id) => id.startsWith("toolbox")),
    ["toolbox-right"],
  );
});

test("resolution ignores family, state, slot, attachment, set, and prop declaration order", () => {
  const reordered = structuredClone(contract) as CharacterLoadoutContract;
  (reordered as any).families.reverse();
  (reordered as any).states.reverse();
  for (const family of reordered.families as any[]) {
    family.attachmentLayout.slots.reverse();
    family.attachmentLayout.attachments.reverse();
    family.attachmentLayout.wearableSets?.reverse();
    family.attachmentLayout.propStates?.reverse();
  }
  const expected = resolveCharacterLoadout(rigLayout, contract, "garment-and-accessories-with-left-hand-prop");
  const actual = resolveCharacterLoadout(rigLayout, reordered, "garment-and-accessories-with-left-hand-prop");
  assert.deepEqual(actual, expected);
});

test("reports stable cross-family, state, dependency, exclusivity, and order errors", () => {
  const duplicate = structuredClone(contract) as any;
  duplicate.families[1].attachmentLayout.attachments[0].attachmentId =
    duplicate.families[0].attachmentLayout.attachments[0].attachmentId;
  expectCode("DUPLICATE_ATTACHMENT_ID_ACROSS_FAMILIES", () =>
    resolveCharacterLoadout(rigLayout, duplicate, "garment-and-accessories-with-left-hand-prop"),
  );

  const unknownFamily = structuredClone(contract) as any;
  unknownFamily.states.find((state: any) => state.stateId === "base-only-with-no-prop")
    .enabledFamilyIds = ["missing"];
  expectCode("UNKNOWN_LOADOUT_FAMILY", () =>
    resolveCharacterLoadout(rigLayout, unknownFamily, "base-only-with-no-prop"),
  );

  const cycle = structuredClone(contract) as any;
  cycle.states[0].requires = [cycle.states[1].stateId];
  cycle.states[1].requires = [cycle.states[0].stateId];
  expectCode("CYCLIC_STATE_DEPENDENCY", () =>
    resolveCharacterLoadout(rigLayout, cycle, cycle.states[0].stateId),
  );

  const contradiction = structuredClone(contract) as any;
  contradiction.states[0].requires = [contradiction.states[1].stateId];
  contradiction.states[0].excludes = [contradiction.states[1].stateId];
  expectCode("CONTRADICTORY_STATE_DEPENDENCY", () =>
    resolveCharacterLoadout(rigLayout, contradiction, contradiction.states[0].stateId),
  );

  const exclusive = structuredClone(contract) as any;
  exclusive.exclusiveGroups.push({
    groupId: "head-conflict",
    attachmentIds: ["cap-front", "sunglasses"],
    maximumEnabled: 1,
  });
  expectCode("CONFLICTING_EXCLUSIVE_SLOT_OCCUPANTS", () =>
    resolveCharacterLoadout(rigLayout, exclusive, "accessories-only-with-no-prop"),
  );

  const missing = structuredClone(contract) as any;
  missing.states.find((state: any) => state.stateId === "base-only-with-no-prop")
    .requiredAttachmentIds = ["cap-front"];
  expectCode("LOADOUT_STATE_ATTACHMENT_MISSING", () =>
    resolveCharacterLoadout(rigLayout, missing, "base-only-with-no-prop"),
  );

  const order = structuredClone(contract) as any;
  order.families[1].attachmentLayout.attachments[0].drawOrder =
    order.families[0].attachmentLayout.attachments[0].drawOrder;
  expectCode("INVALID_GLOBAL_DRAW_ORDER", () =>
    resolveCharacterLoadout(rigLayout, order, "garment-and-accessories-with-left-hand-prop"),
  );
});

test("rejects duplicate merged semantic IDs before constructing lookup maps", () => {
  const cases = [
    {
      code: "DUPLICATE_ATTACHMENT_SLOT_ID_ACROSS_FAMILIES",
      mutate(value: any) {
        value.families[1].attachmentLayout.slots[0].slotId =
          value.families[0].attachmentLayout.slots[0].slotId;
      },
    },
    {
      code: "DUPLICATE_WEARABLE_SET_ID_ACROSS_FAMILIES",
      mutate(value: any) {
        value.families[2].attachmentLayout.wearableSets = [
          structuredClone(value.families[1].attachmentLayout.wearableSets[0]),
        ];
      },
    },
    {
      code: "DUPLICATE_PROP_STATE_ID_ACROSS_FAMILIES",
      mutate(value: any) {
        value.families[1].attachmentLayout.propStates = [
          structuredClone(value.families[2].attachmentLayout.propStates[0]),
        ];
      },
    },
    {
      code: "DUPLICATE_ATTACHMENT_SEAM_ID_ACROSS_FAMILIES",
      mutate(value: any) {
        value.families[0].attachmentLayout.seams = [
          structuredClone(value.families[1].attachmentLayout.seams[0]),
        ];
      },
    },
  ] as const;
  for (const fixture of cases) {
    const invalid = structuredClone(contract) as any;
    fixture.mutate(invalid);
    expectCode(fixture.code, () =>
      resolveCharacterLoadout(rigLayout, invalid, "garment-and-accessories-with-left-hand-prop"),
    );
  }
});

test("rejects unknown prop, slot, set, and exclusive-group references", () => {
  const unknownProp = structuredClone(contract) as any;
  unknownProp.states.find((state: any) => state.stateId === "garment-and-accessories-with-left-hand-prop")
    .propStateId = "missing-prop-state";
  expectCode("UNKNOWN_LOADOUT_PROP_STATE", () =>
    resolveCharacterLoadout(rigLayout, unknownProp, "garment-and-accessories-with-left-hand-prop"),
  );

  const unknownSlot = structuredClone(contract) as any;
  unknownSlot.families[0].attachmentLayout.attachments[0].slotId =
    "missing-slot";
  expectCode("UNKNOWN_ATTACHMENT_SLOT_MEMBER", () =>
    resolveCharacterLoadout(rigLayout, unknownSlot, "garment-and-accessories-with-left-hand-prop"),
  );

  const unknownSet = structuredClone(contract) as any;
  unknownSet.families[1].attachmentLayout.attachments[0].wearableSetId =
    "missing-set";
  expectCode("UNKNOWN_WEARABLE_SET_MEMBER", () =>
    resolveCharacterLoadout(rigLayout, unknownSet, "garment-and-accessories-with-left-hand-prop"),
  );

  const unknownExclusiveMember = structuredClone(contract) as any;
  unknownExclusiveMember.exclusiveGroups[0].attachmentIds.push("missing");
  expectCode("UNKNOWN_EXCLUSIVE_GROUP_MEMBER", () =>
    resolveCharacterLoadout(
      rigLayout,
      unknownExclusiveMember,
      "garment-and-accessories-with-left-hand-prop",
    ),
  );
});

test("rejects invalid, duplicate, and conflicting exclusive groups", () => {
  const invalid = structuredClone(contract) as any;
  invalid.exclusiveGroups[0].maximumEnabled = -1;
  expectCode("INVALID_EXCLUSIVE_GROUP_DECLARATION", () =>
    resolveCharacterLoadout(rigLayout, invalid, "base-only-with-no-prop"),
  );

  const duplicate = structuredClone(contract) as any;
  duplicate.exclusiveGroups[1].groupId =
    duplicate.exclusiveGroups[0].groupId;
  expectCode("DUPLICATE_EXCLUSIVE_GROUP_ID", () =>
    resolveCharacterLoadout(rigLayout, duplicate, "base-only-with-no-prop"),
  );

  const conflicting = structuredClone(contract) as any;
  conflicting.exclusiveGroups.push({
    groupId: "second-prop-owner",
    attachmentIds: ["toolbox-left"],
    maximumEnabled: 1,
  });
  expectCode("CONFLICTING_EXCLUSIVE_GROUP_DECLARATION", () =>
    resolveCharacterLoadout(rigLayout, conflicting, "base-only-with-no-prop"),
  );
});

test("rejects incompatible rig references at contract and family boundaries", () => {
  const contractRig = structuredClone(contract) as any;
  contractRig.rig.layoutId = "other-rig";
  expectCode("INCOMPATIBLE_LOADOUT_RIG", () =>
    resolveCharacterLoadout(
      rigLayout,
      contractRig,
      "base-only-with-no-prop",
    ),
  );

  const familyRig = structuredClone(contract) as any;
  familyRig.families[0].attachmentLayout.rig.layoutId = "other-rig";
  expectCode("INCOMPATIBLE_LOADOUT_RIG", () =>
    resolveCharacterLoadout(
      rigLayout,
      familyRig,
      "base-only-with-no-prop",
    ),
  );
});

test("semantic animation validation is explicit and array-order independent", () => {
  const clips = serialized.requiredSemanticClipIds
    .map((animationId) => ({ animationId }))
    .reverse();
  assert.doesNotThrow(() =>
    validateSemanticClipIds(serialized.requiredSemanticClipIds, clips),
  );
  expectCode("MISSING_SEMANTIC_ANIMATION_ID", () =>
    validateSemanticClipIds(serialized.requiredSemanticClipIds, clips.slice(1)),
  );
  expectCode("DUPLICATE_SEMANTIC_ANIMATION_ID", () =>
    validateSemanticClipIds(serialized.requiredSemanticClipIds, [...clips, clips[0]!]),
  );
});

test("accessory socket validation compares independent slot and anchor transforms", () => {
  const resolved = resolveCharacterLoadout(
    rigLayout,
    contract,
    "accessories-only-with-no-prop",
  );
  const accessory = resolved.enabledAttachments.find(
    (attachment) => attachment.attachmentId === "sunglasses",
  )!;
  const parentWorld = Object.freeze({
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    tx: 12,
    ty: -8,
  });
  assert.equal(
    measureAttachmentSocketToAnchorError(parentWorld, accessory),
    0,
  );
  const perturbed = {
    ...accessory,
    attachmentTransform: {
      ...accessory.attachmentTransform,
      position: {
        ...accessory.attachmentTransform.position,
        x: accessory.attachmentTransform.position.x + 3,
      },
    },
  };
  assert.equal(
    measureAttachmentSocketToAnchorError(parentWorld, perturbed),
    3,
  );
});

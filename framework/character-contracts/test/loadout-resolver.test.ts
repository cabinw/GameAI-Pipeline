import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CharacterLoadoutError,
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
  "base-only",
  "accessories-only",
  "garment-only",
  "prop-only",
  "garment-accessories",
  "garment-prop",
  "accessories-prop",
  "full-loadout",
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
    resolveCharacterLoadout(rigLayout, contract, "base-only").enabledAttachments
      .length,
    0,
  );
  assert.equal(
    resolveCharacterLoadout(rigLayout, contract, "full-loadout")
      .enabledAttachments.length,
    16,
  );
});

test("supports no-prop, left-hand, and right-hand full-loadout states", () => {
  const ids = (stateId: string) =>
    resolveCharacterLoadout(rigLayout, contract, stateId).enabledAttachments.map(
      (attachment) => attachment.attachmentId,
    );
  assert.equal(ids("full-loadout-no-prop").some((id) => id.includes("toolbox")), false);
  assert.deepEqual(
    ids("full-loadout-left").filter((id) => id.startsWith("toolbox")),
    ["toolbox-left"],
  );
  assert.deepEqual(
    ids("full-loadout-right").filter((id) => id.startsWith("toolbox")),
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
  const expected = resolveCharacterLoadout(rigLayout, contract, "full-loadout");
  const actual = resolveCharacterLoadout(rigLayout, reordered, "full-loadout");
  assert.deepEqual(actual, expected);
});

test("reports stable cross-family, state, dependency, exclusivity, and order errors", () => {
  const duplicate = structuredClone(contract) as any;
  duplicate.families[1].attachmentLayout.attachments[0].attachmentId =
    duplicate.families[0].attachmentLayout.attachments[0].attachmentId;
  expectCode("DUPLICATE_ATTACHMENT_ID_ACROSS_FAMILIES", () =>
    resolveCharacterLoadout(rigLayout, duplicate, "full-loadout"),
  );

  const unknownFamily = structuredClone(contract) as any;
  unknownFamily.states.find((state: any) => state.stateId === "base-only")
    .enabledFamilyIds = ["missing"];
  expectCode("UNKNOWN_LOADOUT_FAMILY", () =>
    resolveCharacterLoadout(rigLayout, unknownFamily, "base-only"),
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
    resolveCharacterLoadout(rigLayout, exclusive, "accessories-only"),
  );

  const missing = structuredClone(contract) as any;
  missing.states.find((state: any) => state.stateId === "base-only")
    .requiredAttachmentIds = ["cap-front"];
  expectCode("LOADOUT_STATE_ATTACHMENT_MISSING", () =>
    resolveCharacterLoadout(rigLayout, missing, "base-only"),
  );

  const order = structuredClone(contract) as any;
  order.families[1].attachmentLayout.attachments[0].drawOrder =
    order.families[0].attachmentLayout.attachments[0].drawOrder;
  expectCode("INVALID_GLOBAL_DRAW_ORDER", () =>
    resolveCharacterLoadout(rigLayout, order, "full-loadout"),
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

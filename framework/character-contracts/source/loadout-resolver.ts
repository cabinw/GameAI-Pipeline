import { resolveAttachmentLayout } from "./attachment-resolver";
import { isSupportedSchemaVersion } from "./semantic-validator";
import type {
  AttachmentLayout,
  AttachmentSeam,
  AttachmentSlot,
  PropState,
  ResolvedAttachment,
  RigLayout,
  WearableSet,
} from "./types";

export type CharacterLoadoutErrorCode =
  | "UNSUPPORTED_LOADOUT_SCHEMA_VERSION"
  | "DUPLICATE_ATTACHMENT_FAMILY_ID"
  | "DUPLICATE_ATTACHMENT_ID_ACROSS_FAMILIES"
  | "DUPLICATE_LOADOUT_STATE_ID"
  | "UNKNOWN_LOADOUT_STATE"
  | "UNKNOWN_LOADOUT_FAMILY"
  | "UNKNOWN_LOADOUT_DEPENDENCY"
  | "CYCLIC_STATE_DEPENDENCY"
  | "CONTRADICTORY_STATE_DEPENDENCY"
  | "CONFLICTING_EXCLUSIVE_SLOT_OCCUPANTS"
  | "LOADOUT_STATE_ATTACHMENT_MISSING"
  | "INVALID_GLOBAL_DRAW_ORDER"
  | "MISSING_SEMANTIC_ANIMATION_ID"
  | "DUPLICATE_SEMANTIC_ANIMATION_ID"
  | "INCOMPATIBLE_LOADOUT_RIG";

export class CharacterLoadoutError extends Error {
  constructor(
    readonly code: CharacterLoadoutErrorCode,
    readonly subjectId: string,
  ) {
    super(`${code}:${subjectId}`);
    this.name = "CharacterLoadoutError";
  }
}

export interface CharacterLoadoutFamily {
  readonly familyId: string;
  readonly attachmentLayout: AttachmentLayout;
}

export interface CharacterLoadoutState {
  readonly stateId: string;
  readonly enabledFamilyIds: readonly string[];
  readonly propStateId?: string;
  readonly requires?: readonly string[];
  readonly excludes?: readonly string[];
  readonly requiredAttachmentIds?: readonly string[];
}

export interface ExclusiveAttachmentGroup {
  readonly groupId: string;
  readonly attachmentIds: readonly string[];
  readonly maximumEnabled: number;
}

export interface CharacterLoadoutContract {
  readonly schemaVersion: string;
  readonly loadoutId: string;
  readonly rig: Readonly<{ layoutId: string; schemaVersion: string }>;
  readonly families: readonly CharacterLoadoutFamily[];
  readonly states: readonly CharacterLoadoutState[];
  readonly exclusiveGroups?: readonly ExclusiveAttachmentGroup[];
  readonly requiredSemanticClipIds: readonly string[];
}

export interface ResolvedCharacterLayer {
  readonly itemId: string;
  readonly itemKind: "body" | "attachment";
  readonly drawOrder: number;
  readonly layerRole: string;
}

export interface ResolvedCharacterLoadout {
  readonly schemaVersion: string;
  readonly loadoutId: string;
  readonly stateId: string;
  readonly resolvedStateIds: readonly string[];
  readonly attachments: readonly ResolvedAttachment[];
  readonly enabledAttachments: readonly ResolvedAttachment[];
  readonly globalLayers: readonly ResolvedCharacterLayer[];
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) result.add(value);
    seen.add(value);
  }
  return [...result].sort();
}

function sortById<T>(values: readonly T[], id: (value: T) => string): T[] {
  return [...values].sort((left, right) => id(left).localeCompare(id(right)));
}

function resolveStateClosure(
  states: ReadonlyMap<string, CharacterLoadoutState>,
  stateId: string,
): readonly CharacterLoadoutState[] {
  const resolved: CharacterLoadoutState[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (currentId: string): void => {
    const current = states.get(currentId);
    if (current === undefined) {
      throw new CharacterLoadoutError("UNKNOWN_LOADOUT_DEPENDENCY", currentId);
    }
    if (visiting.has(currentId)) {
      throw new CharacterLoadoutError("CYCLIC_STATE_DEPENDENCY", currentId);
    }
    if (visited.has(currentId)) return;
    visiting.add(currentId);
    for (const dependency of [...(current.requires ?? [])].sort()) {
      visit(dependency);
    }
    visiting.delete(currentId);
    visited.add(currentId);
    resolved.push(current);
  };
  visit(stateId);
  const ids = new Set(resolved.map((state) => state.stateId));
  for (const state of resolved) {
    for (const excluded of state.excludes ?? []) {
      if (ids.has(excluded)) {
        throw new CharacterLoadoutError(
          "CONTRADICTORY_STATE_DEPENDENCY",
          `${state.stateId}:${excluded}`,
        );
      }
    }
  }
  return Object.freeze(resolved);
}

function mergeLayouts(
  contract: CharacterLoadoutContract,
): Readonly<{
  layout: AttachmentLayout;
  familyByAttachmentId: ReadonlyMap<string, string>;
}> {
  const familyIds = contract.families.map((family) => family.familyId);
  const duplicateFamilyId = duplicates(familyIds)[0];
  if (duplicateFamilyId !== undefined) {
    throw new CharacterLoadoutError(
      "DUPLICATE_ATTACHMENT_FAMILY_ID",
      duplicateFamilyId,
    );
  }
  const allAttachmentIds = contract.families.flatMap((family) =>
    family.attachmentLayout.attachments.map(
      (attachment) => attachment.attachmentId,
    ),
  );
  const duplicateAttachmentId = duplicates(allAttachmentIds)[0];
  if (duplicateAttachmentId !== undefined) {
    throw new CharacterLoadoutError(
      "DUPLICATE_ATTACHMENT_ID_ACROSS_FAMILIES",
      duplicateAttachmentId,
    );
  }
  const familyByAttachmentId = new Map<string, string>();
  const slots: AttachmentSlot[] = [];
  const attachments = [];
  const wearableSets: WearableSet[] = [];
  const propStates: PropState[] = [];
  const seams: AttachmentSeam[] = [];
  for (const family of sortById(contract.families, (item) => item.familyId)) {
    const layout = family.attachmentLayout;
    if (
      layout.rig.layoutId !== contract.rig.layoutId ||
      layout.rig.schemaVersion !== contract.rig.schemaVersion
    ) {
      throw new CharacterLoadoutError(
        "INCOMPATIBLE_LOADOUT_RIG",
        family.familyId,
      );
    }
    slots.push(...layout.slots);
    wearableSets.push(...(layout.wearableSets ?? []));
    propStates.push(...(layout.propStates ?? []));
    seams.push(...(layout.seams ?? []));
    for (const attachment of layout.attachments) {
      attachments.push(attachment);
      familyByAttachmentId.set(attachment.attachmentId, family.familyId);
    }
  }
  const duplicateDrawOrder = duplicates(
    attachments.map((attachment) => String(attachment.drawOrder)),
  )[0];
  if (
    duplicateDrawOrder !== undefined ||
    attachments.some((attachment) => !Number.isFinite(attachment.drawOrder))
  ) {
    throw new CharacterLoadoutError(
      "INVALID_GLOBAL_DRAW_ORDER",
      duplicateDrawOrder ?? "non-finite",
    );
  }
  return Object.freeze({
    layout: Object.freeze({
      schemaVersion: "1.0.0",
      attachmentLayoutId: contract.loadoutId,
      rig: Object.freeze({ ...contract.rig }),
      slots: sortById(slots, (slot) => slot.slotId),
      attachments: [...attachments].sort(
        (left, right) =>
          left.drawOrder - right.drawOrder ||
          left.attachmentId.localeCompare(right.attachmentId),
      ),
      ...(wearableSets.length === 0
        ? {}
        : {
            wearableSets: sortById(wearableSets, (set) => set.wearableSetId),
          }),
      ...(propStates.length === 0
        ? {}
        : {
            propStates: sortById(propStates, (state) => state.propStateId),
          }),
      ...(seams.length === 0
        ? {}
        : { seams: sortById(seams, (seam) => seam.seamId) }),
    }),
    familyByAttachmentId,
  });
}

export function validateSemanticClipIds(
  requiredIds: readonly string[],
  clips: readonly Readonly<{ animationId: string }>[],
): void {
  for (const requiredId of [...requiredIds].sort()) {
    const count = clips.filter((clip) => clip.animationId === requiredId).length;
    if (count === 0) {
      throw new CharacterLoadoutError(
        "MISSING_SEMANTIC_ANIMATION_ID",
        requiredId,
      );
    }
    if (count > 1) {
      throw new CharacterLoadoutError(
        "DUPLICATE_SEMANTIC_ANIMATION_ID",
        requiredId,
      );
    }
  }
}

export function resolveCharacterLoadout(
  rigLayout: RigLayout,
  contract: CharacterLoadoutContract,
  stateId: string,
): ResolvedCharacterLoadout {
  if (!isSupportedSchemaVersion(contract.schemaVersion)) {
    throw new CharacterLoadoutError(
      "UNSUPPORTED_LOADOUT_SCHEMA_VERSION",
      contract.schemaVersion,
    );
  }
  if (
    rigLayout.layoutId !== contract.rig.layoutId ||
    rigLayout.schemaVersion !== contract.rig.schemaVersion
  ) {
    throw new CharacterLoadoutError("INCOMPATIBLE_LOADOUT_RIG", rigLayout.layoutId);
  }
  const duplicateStateId = duplicates(
    contract.states.map((state) => state.stateId),
  )[0];
  if (duplicateStateId !== undefined) {
    throw new CharacterLoadoutError("DUPLICATE_LOADOUT_STATE_ID", duplicateStateId);
  }
  const stateMap = new Map(
    contract.states.map((state) => [state.stateId, state] as const),
  );
  if (!stateMap.has(stateId)) {
    throw new CharacterLoadoutError("UNKNOWN_LOADOUT_STATE", stateId);
  }
  const stateClosure = resolveStateClosure(stateMap, stateId);
  const familyIds = new Set(contract.families.map((family) => family.familyId));
  const enabledFamilyIds = new Set<string>();
  let propStateId: string | undefined;
  const requiredAttachmentIds = new Set<string>();
  for (const state of stateClosure) {
    for (const familyId of [...state.enabledFamilyIds].sort()) {
      if (!familyIds.has(familyId)) {
        throw new CharacterLoadoutError("UNKNOWN_LOADOUT_FAMILY", familyId);
      }
      enabledFamilyIds.add(familyId);
    }
    if (state.propStateId !== undefined) {
      if (propStateId !== undefined && propStateId !== state.propStateId) {
        throw new CharacterLoadoutError(
          "CONTRADICTORY_STATE_DEPENDENCY",
          `${propStateId}:${state.propStateId}`,
        );
      }
      propStateId = state.propStateId;
    }
    for (const attachmentId of state.requiredAttachmentIds ?? []) {
      requiredAttachmentIds.add(attachmentId);
    }
  }
  const merged = mergeLayouts(contract);
  const propStateOverrides = Object.fromEntries(
    (merged.layout.propStates ?? []).map((state) => [
      state.propStateId,
      state.propStateId === propStateId,
    ]),
  );
  const attachments = resolveAttachmentLayout(
    merged.layout,
    {},
    {},
    propStateOverrides,
  ).map((attachment) =>
    Object.freeze({
      ...attachment,
      enabled:
        attachment.enabled &&
        enabledFamilyIds.has(
          merged.familyByAttachmentId.get(attachment.attachmentId)!,
        ),
    }),
  );
  const enabledAttachments = attachments.filter((attachment) => attachment.enabled);
  const enabledIds = new Set(
    enabledAttachments.map((attachment) => attachment.attachmentId),
  );
  for (const attachmentId of [...requiredAttachmentIds].sort()) {
    if (!enabledIds.has(attachmentId)) {
      throw new CharacterLoadoutError(
        "LOADOUT_STATE_ATTACHMENT_MISSING",
        attachmentId,
      );
    }
  }
  for (const group of contract.exclusiveGroups ?? []) {
    const occupants = group.attachmentIds.filter((id) => enabledIds.has(id));
    if (occupants.length > group.maximumEnabled) {
      throw new CharacterLoadoutError(
        "CONFLICTING_EXCLUSIVE_SLOT_OCCUPANTS",
        group.groupId,
      );
    }
  }
  const globalLayers: ResolvedCharacterLayer[] = [
    ...rigLayout.parts.map((part) =>
      Object.freeze({
        itemId: part.partId,
        itemKind: "body" as const,
        drawOrder: part.drawOrder,
        layerRole: "body",
      }),
    ),
    ...enabledAttachments.map((attachment) =>
      Object.freeze({
        itemId: attachment.attachmentId,
        itemKind: "attachment" as const,
        drawOrder: attachment.drawOrder,
        layerRole: attachment.layerRole ?? "middle",
      }),
    ),
  ].sort(
    (left, right) =>
      left.drawOrder - right.drawOrder || left.itemId.localeCompare(right.itemId),
  );
  for (let index = 1; index < globalLayers.length; index += 1) {
    if (globalLayers[index - 1]!.drawOrder === globalLayers[index]!.drawOrder) {
      throw new CharacterLoadoutError(
        "INVALID_GLOBAL_DRAW_ORDER",
        String(globalLayers[index]!.drawOrder),
      );
    }
  }
  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    loadoutId: contract.loadoutId,
    stateId,
    resolvedStateIds: Object.freeze(
      stateClosure.map((state) => state.stateId).sort(),
    ),
    attachments: Object.freeze(attachments),
    enabledAttachments: Object.freeze(enabledAttachments),
    globalLayers: Object.freeze(globalLayers),
  });
}

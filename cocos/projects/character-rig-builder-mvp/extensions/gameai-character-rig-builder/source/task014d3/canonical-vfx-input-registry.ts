import type { PropStateId } from "../task013r6/prop-bridge-runtime-contract.js";
import {
  TASK014C_INPUT_REGISTRY,
} from "../task014c/canonical-semantic-vfx-input-registry.js";
import type {
  Task014D3SemanticTrackId,
} from "./canonical-vfx-semantic-contract.js";

export type Task014D3InputAction =
  | Readonly<{
      kind: "select-track";
      trackId: Task014D3SemanticTrackId;
      clipId: string;
    }>
  | Readonly<{ kind: "toggle-playback" }>
  | Readonly<{ kind: "exact-reset" }>
  | Readonly<{ kind: "toggle-transform-stress" }>
  | Readonly<{ kind: "rebuild-runtime" }>
  | Readonly<{ kind: "toggle-garment" }>
  | Readonly<{ kind: "toggle-accessories" }>
  | Readonly<{ kind: "select-prop-state"; propStateId: PropStateId }>
  | Readonly<{ kind: "toggle-vfx-debug" }>
  | Readonly<{ kind: "toggle-target-debug" }>;

export interface Task014D3InputBinding {
  readonly actionId: string;
  readonly displayedKey: string;
  readonly cocosKeyCode: string;
  readonly hudLabel: string;
  readonly hudGroup: "clips" | "runtime" | "loadout" | "debug";
  readonly action: Task014D3InputAction;
}

const inherited = TASK014C_INPUT_REGISTRY.map((entry) =>
  Object.freeze({
    ...entry,
    action: entry.action as Task014D3InputAction,
  }));

export const TASK014D3_INPUT_REGISTRY:
readonly Task014D3InputBinding[] = Object.freeze([
  ...inherited,
  Object.freeze({
    actionId: "track.combined",
    displayedKey: "7",
    cocosKeyCode: "DIGIT_7",
    hudLabel: "Combined 4-layer",
    hudGroup: "clips" as const,
    action: Object.freeze({
      kind: "select-track" as const,
      trackId: "canonical-combined-events" as const,
      clipId: "production-lite-full-loadout-integration-stress",
    }),
  }),
]);

export function validateTask014D3InputRegistry(
  registry: readonly Task014D3InputBinding[] = TASK014D3_INPUT_REGISTRY,
): readonly Task014D3InputBinding[] {
  const ids = new Set<string>();
  const keys = new Set<string>();
  const cocosKeys = new Set<string>();
  for (const entry of registry) {
    if (
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(entry.actionId) ||
      entry.displayedKey.length === 0 ||
      entry.hudLabel.length === 0 ||
      ids.has(entry.actionId) ||
      keys.has(entry.displayedKey) ||
      cocosKeys.has(entry.cocosKeyCode)
    ) {
      throw new Error(`TASK_014D3_INPUT_REGISTRY_INVALID:${entry.actionId}`);
    }
    ids.add(entry.actionId);
    keys.add(entry.displayedKey);
    cocosKeys.add(entry.cocosKeyCode);
  }
  for (const required of [
    "canonical-rest-events",
    "canonical-walk-events",
    "canonical-wave-events",
    "canonical-prop-swing-events",
    "canonical-integration-stress-events",
    "canonical-aura-events",
    "canonical-combined-events",
  ] as const) {
    if (!registry.some((entry) =>
      entry.action.kind === "select-track" &&
      entry.action.trackId === required)) {
      throw new Error(`TASK_014D3_INPUT_TRACK_MISSING:${required}`);
    }
  }
  return registry;
}

export function formatTask014D3InputHelpLines(
  registry: readonly Task014D3InputBinding[] = TASK014D3_INPUT_REGISTRY,
): readonly string[] {
  validateTask014D3InputRegistry(registry);
  return Object.freeze(
    (["clips", "runtime", "loadout", "debug"] as const).map((group) =>
      registry
        .filter((entry) => entry.hudGroup === group)
        .map((entry) => `${entry.displayedKey} ${entry.hudLabel}`)
        .join(" · "),
    ),
  );
}

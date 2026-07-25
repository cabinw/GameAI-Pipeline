// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.
export type HarnessSortingRole =
  | "production-root"
  | "production-child"
  | "production-attachment"
  | "debug-geometry"
  | "debug-label"
  | "hud";

export interface HarnessSortingPolicy {
  readonly production: Readonly<{ minimum: number; maximum: number }>;
  readonly debug: Readonly<{ minimum: number; maximum: number }>;
  readonly hud: Readonly<{ minimum: number; maximum: number }>;
  readonly orderByRole: Readonly<Record<HarnessSortingRole, number>>;
}

export const HARNESS_SORTING_POLICY: HarnessSortingPolicy = Object.freeze({
  production: Object.freeze({ minimum: 10, maximum: 99 }),
  debug: Object.freeze({ minimum: 100, maximum: 199 }),
  hud: Object.freeze({ minimum: 200, maximum: 209 }),
  orderByRole: Object.freeze({
    "production-root": 10,
    "production-child": 11,
    "production-attachment": 12,
    "debug-geometry": 100,
    "debug-label": 101,
    hud: 200,
  }),
});

export function validateHarnessSortingPolicy(
  policy: HarnessSortingPolicy = HARNESS_SORTING_POLICY,
): HarnessSortingPolicy {
  const ranges = [policy.production, policy.debug, policy.hud];
  if (
    ranges.some(
      (range) =>
        !Number.isInteger(range.minimum) ||
        !Number.isInteger(range.maximum) ||
        range.minimum > range.maximum ||
        range.minimum < -32768 ||
        range.maximum > 32767,
    ) ||
    policy.production.maximum >= policy.debug.minimum ||
    policy.debug.maximum >= policy.hud.minimum
  ) {
    throw new Error("TASK_013R1_SORTING_POLICY_INVALID");
  }
  for (const [role, order] of Object.entries(policy.orderByRole)) {
    const range = role.startsWith("production")
      ? policy.production
      : role.startsWith("debug")
        ? policy.debug
        : policy.hud;
    if (order < range.minimum || order > range.maximum) {
      throw new Error(`TASK_013R1_SORTING_ROLE_INVALID: ${role}=${order}`);
    }
  }
  return policy;
}

export function harnessSortingOrder(
  role: HarnessSortingRole,
  policy: HarnessSortingPolicy = HARNESS_SORTING_POLICY,
): number {
  validateHarnessSortingPolicy(policy);
  const order = policy.orderByRole[role];
  if (order === undefined) {
    throw new Error(`TASK_013R1_SORTING_ROLE_UNKNOWN: ${String(role)}`);
  }
  return order;
}

export function harnessProductionSortingOrder(
  drawOrder: number,
  policy: HarnessSortingPolicy = HARNESS_SORTING_POLICY,
): number {
  validateHarnessSortingPolicy(policy);
  if (!Number.isInteger(drawOrder) || drawOrder < 0) {
    throw new Error(
      `TASK_013R1_PRODUCTION_DRAW_ORDER_INVALID: ${drawOrder}`,
    );
  }
  const order = policy.production.minimum + drawOrder;
  if (order > policy.production.maximum) {
    throw new Error(
      `TASK_013R1_PRODUCTION_DRAW_ORDER_OUT_OF_RANGE: ${drawOrder}`,
    );
  }
  return order;
}

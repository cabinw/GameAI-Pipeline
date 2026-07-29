import {
  Task014D2CleanupCoordinator,
  type Task014D2CleanupError,
  type Task014D2CleanupReport,
} from "../task014d2/cocos-vfx-cleanup-coordinator.js";

export type Task014D3ComponentCleanupStepId =
  | "semantic-evaluator"
  | "vfx-runtime"
  | "vfx-host"
  | "input-handler"
  | "generated-root-detach"
  | "overlay-root-detach"
  | "generated-root-destroy"
  | "overlay-root-destroy"
  | "references-clear"
  | "parent-lifecycle";

export interface Task014D3ComponentCleanupOperations {
  readonly semanticEvaluator: () => void;
  readonly vfxRuntime: () => void;
  readonly vfxHost: () => void;
  readonly inputHandler: () => void;
  readonly generatedRootDetach: () => void;
  readonly overlayRootDetach: () => void;
  readonly generatedRootDestroy: () => void;
  readonly overlayRootDestroy: () => void;
  readonly referencesClear: () => void;
  readonly parentLifecycle: () => void;
}

export interface Task014D3CleanupSweep {
  readonly first: Task014D2CleanupReport;
  readonly final: Task014D2CleanupReport;
  readonly firstCleanupErrors: readonly Task014D2CleanupError[];
  readonly primaryErrorIdentityPreserved: boolean;
  readonly complete: boolean;
}

const COMPONENT_STEPS = Object.freeze([
  ["semantic-evaluator", 10, "runtime", "semanticEvaluator"],
  ["vfx-runtime", 20, "runtime", "vfxRuntime"],
  ["vfx-host", 30, "host", "vfxHost"],
  ["input-handler", 40, "input", "inputHandler"],
  ["generated-root-detach", 50, "root", "generatedRootDetach"],
  ["overlay-root-detach", 60, "root", "overlayRootDetach"],
  ["generated-root-destroy", 70, "root", "generatedRootDestroy"],
  ["overlay-root-destroy", 80, "root", "overlayRootDestroy"],
  ["references-clear", 90, "references", "referencesClear"],
  ["parent-lifecycle", 100, "generation", "parentLifecycle"],
] as const);

/**
 * Real D3 component cleanup boundary. It uses the accepted D2 coordinator
 * directly: every step runs even when an earlier step fails, completed steps
 * are exactly-once, and failed steps retain compensation ownership.
 */
export class Task014D3ComponentTransaction {
  private readonly coordinator = new Task014D2CleanupCoordinator();
  private readonly retainedCleanupErrors: Task014D2CleanupError[] = [];

  public constructor(operations: Task014D3ComponentCleanupOperations) {
    for (const [id, order, ownerKind, operation] of COMPONENT_STEPS) {
      this.coordinator.own({
        id,
        order,
        ownerKind,
        run: operations[operation],
      });
    }
  }

  public cleanup(
    primaryError: unknown = null,
    compensate = true,
  ): Task014D3CleanupSweep {
    const first = this.coordinator.cleanup(primaryError);
    for (const cleanupError of first.cleanupErrors) {
      if (
        !this.retainedCleanupErrors.some((entry) =>
          entry.stepId === cleanupError.stepId &&
          entry.attempt === cleanupError.attempt
        )
      ) {
        this.retainedCleanupErrors.push(cleanupError);
      }
    }
    const final = compensate && !this.coordinator.complete
      ? this.coordinator.cleanup()
      : first;
    for (const cleanupError of final.cleanupErrors) {
      if (
        !this.retainedCleanupErrors.some((entry) =>
          entry.stepId === cleanupError.stepId &&
          entry.attempt === cleanupError.attempt
        )
      ) {
        this.retainedCleanupErrors.push(cleanupError);
      }
    }
    return Object.freeze({
      first,
      final,
      firstCleanupErrors: Object.freeze([...this.retainedCleanupErrors]),
      primaryErrorIdentityPreserved:
        primaryError === null || final.primaryError === primaryError,
      complete: this.coordinator.complete,
    });
  }

  public report(): Task014D2CleanupReport {
    return this.coordinator.report();
  }

  public get complete(): boolean {
    return this.coordinator.complete;
  }
}

export interface Task014D3VfxCleanupOperations {
  readonly semanticStop: () => void;
  readonly runtimeCleanup: () => void;
  readonly hostCleanup: () => void;
}

export function runTask014D3VfxCleanupTransaction(
  operations: Task014D3VfxCleanupOperations,
  primaryError: unknown = null,
): Task014D3CleanupSweep {
  const coordinator = new Task014D2CleanupCoordinator();
  coordinator.own({
    id: "semantic-stop",
    order: 10,
    ownerKind: "runtime",
    run: operations.semanticStop,
  });
  coordinator.own({
    id: "runtime-cleanup",
    order: 20,
    ownerKind: "runtime",
    run: operations.runtimeCleanup,
  });
  coordinator.own({
    id: "host-cleanup",
    order: 30,
    ownerKind: "host",
    run: operations.hostCleanup,
  });
  const first = coordinator.cleanup(primaryError);
  const final = coordinator.complete ? first : coordinator.cleanup();
  return Object.freeze({
    first,
    final,
    firstCleanupErrors: Object.freeze([
      ...first.cleanupErrors,
      ...final.cleanupErrors.filter((entry) =>
        !first.cleanupErrors.some((firstEntry) =>
          firstEntry.stepId === entry.stepId &&
          firstEntry.attempt === entry.attempt
        )
      ),
    ]),
    primaryErrorIdentityPreserved:
      primaryError === null || final.primaryError === primaryError,
    complete: coordinator.complete,
  });
}

export const TASK014D3_COMPONENT_CLEANUP_STEP_IDS = Object.freeze(
  COMPONENT_STEPS.map(([id]) => id),
);

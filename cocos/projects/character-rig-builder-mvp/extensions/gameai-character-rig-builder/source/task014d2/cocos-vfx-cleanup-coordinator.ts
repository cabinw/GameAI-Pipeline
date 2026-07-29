export interface Task014D2CleanupOperation {
  readonly id: string;
  readonly order: number;
  readonly ownerKind?:
    | "generation"
    | "runtime"
    | "input"
    | "host"
    | "owner"
    | "material"
    | "node"
    | "root"
    | "references";
  readonly run: () => void;
}

export interface Task014D2CleanupError {
  readonly stepId: string;
  readonly message: string;
  readonly attempt: number;
}

export interface Task014D2CleanupReport {
  readonly primaryError: unknown | null;
  readonly primaryErrorMessage: string | null;
  /** @deprecated Use primaryErrorMessage. Retained for manifest compatibility. */
  readonly firstError: string | null;
  readonly cleanupErrors: readonly Task014D2CleanupError[];
  readonly completedStepIds: readonly string[];
  readonly pendingStepIds: readonly string[];
  readonly pendingOwnerCounts: Readonly<Record<string, number>>;
  readonly attemptsByStepId: Readonly<Record<string, number>>;
}

export interface Task014D2FaultCounts {
  readonly root: number;
  readonly input: number;
  readonly owner: number;
  readonly material: number;
  readonly node: number;
}

export interface Task014D2FaultCaseArtifact {
  readonly caseId: string;
  readonly injectedOperation: string;
  readonly primaryError: string;
  readonly primaryErrorIdentityPreserved: boolean;
  readonly orderedCleanupErrors: readonly string[];
  readonly pendingCleanupSteps: readonly string[];
  readonly failureCounts: Task014D2FaultCounts;
  readonly destroyCounts: Readonly<Record<string, number>>;
  readonly terminalState: "FAILED";
  readonly compensationResult: "CLEAN";
  readonly compensationCounts: Task014D2FaultCounts;
  readonly retryResult: "READY";
  readonly finalCounts: Task014D2FaultCounts;
}

/**
 * Production fault boundary used by the Creator component and direct tests.
 * Callers inject real ownership operations; the same coordinator that owns
 * normal component/host cleanup executes failure and compensation sweeps.
 */
export function executeTask014D2FaultCase(options: Readonly<{
  caseId: string;
  injectedOperation: string;
  primaryError: Error;
  coordinator: Task014D2CleanupCoordinator;
  measure: () => Task014D2FaultCounts;
  destroyCounts: () => Readonly<Record<string, number>>;
  retry: () => Task014D2FaultCounts;
}>): Task014D2FaultCaseArtifact {
  const first = options.coordinator.cleanup(options.primaryError);
  const failureCounts = options.measure();
  const primaryIdentityPreserved =
    first.primaryError === options.primaryError;
  const orderedCleanupErrors = first.cleanupErrors.map(
    (entry) => `${entry.stepId}:${entry.message}`,
  );
  const pendingCleanupSteps = [...first.pendingStepIds];
  const compensated = options.coordinator.cleanup();
  if (!options.coordinator.complete) {
    throw new Error(
      `TASK_014D2_FAULT_COMPENSATION_INCOMPLETE:${options.caseId}:${
        compensated.pendingStepIds.join("|")
      }`,
    );
  }
  const compensationCounts = options.measure();
  const finalCounts = options.retry();
  return {
    caseId: options.caseId,
    injectedOperation: options.injectedOperation,
    primaryError: options.primaryError.message,
    primaryErrorIdentityPreserved: primaryIdentityPreserved,
    orderedCleanupErrors,
    pendingCleanupSteps,
    failureCounts,
    destroyCounts: options.destroyCounts(),
    terminalState: "FAILED",
    compensationResult: "CLEAN",
    compensationCounts,
    retryResult: "READY",
    finalCounts,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Stateful all-steps cleanup transaction used by both the Creator component
 * lifecycle and renderer ownership. Successful steps are exactly-once;
 * failed steps retain ownership and can be compensated by a later sweep.
 */
export class Task014D2CleanupCoordinator {
  private readonly operations = new Map<
    string,
    Task014D2CleanupOperation & {
      complete: boolean;
      attempts: number;
      lastError: string | null;
    }
  >();
  private primaryError: unknown | null = null;
  private cleanupStarted = false;

  public own(operation: Task014D2CleanupOperation): void {
    if (this.operations.has(operation.id)) {
      throw new Error(`TASK_014D2_DUPLICATE_CLEANUP_OWNER:${operation.id}`);
    }
    this.operations.set(operation.id, {
      ...operation,
      complete: false,
      attempts: 0,
      lastError: null,
    });
  }

  public cleanup(error: unknown = null): Task014D2CleanupReport {
    this.cleanupStarted = true;
    if (error !== null && error !== undefined && this.primaryError === null) {
      this.primaryError = error;
    }
    const ordered = [...this.operations.values()].sort(
      (left, right) => left.order - right.order ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    for (const operation of ordered) {
      if (operation.complete) continue;
      operation.attempts += 1;
      try {
        operation.run();
        operation.complete = true;
        operation.lastError = null;
      } catch (cleanupError) {
        operation.lastError = errorMessage(cleanupError);
      }
    }
    return this.report();
  }

  public report(): Task014D2CleanupReport {
    const ordered = [...this.operations.values()].sort(
      (left, right) => left.order - right.order ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    const pending = this.cleanupStarted
      ? ordered.filter((operation) => !operation.complete)
      : [];
    const pendingOwnerCounts: Record<string, number> = {};
    const attemptsByStepId: Record<string, number> = {};
    for (const operation of ordered) {
      attemptsByStepId[operation.id] = operation.attempts;
    }
    for (const operation of pending) {
      const kind = operation.ownerKind ?? "unspecified";
      pendingOwnerCounts[kind] = (pendingOwnerCounts[kind] ?? 0) + 1;
    }
    const primaryErrorMessage = this.primaryError === null
      ? null
      : errorMessage(this.primaryError);
    return {
      primaryError: this.primaryError,
      primaryErrorMessage,
      firstError: primaryErrorMessage,
      cleanupErrors: pending
        .filter((operation) => operation.lastError !== null)
        .map((operation) => ({
          stepId: operation.id,
          message: operation.lastError as string,
          attempt: operation.attempts,
        })),
      completedStepIds: ordered
        .filter((operation) => operation.complete)
        .map((operation) => operation.id),
      pendingStepIds: pending.map((operation) => operation.id),
      pendingOwnerCounts,
      attemptsByStepId,
    };
  }

  public get complete(): boolean {
    return [...this.operations.values()].every((operation) =>
      operation.complete);
  }
}

export interface Task014D2CleanupOperation {
  readonly id: string;
  readonly order: number;
  readonly run: () => void;
}

export interface Task014D2CleanupError {
  readonly stepId: string;
  readonly message: string;
}

export interface Task014D2CleanupReport {
  readonly firstError: string | null;
  readonly cleanupErrors: readonly Task014D2CleanupError[];
  readonly completedStepIds: readonly string[];
  readonly pendingStepIds: readonly string[];
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
    Task014D2CleanupOperation & { complete: boolean }
  >();
  private firstError: string | null = null;
  private readonly cleanupErrors: Task014D2CleanupError[] = [];

  public own(operation: Task014D2CleanupOperation): void {
    if (this.operations.has(operation.id)) {
      throw new Error(`TASK_014D2_DUPLICATE_CLEANUP_OWNER:${operation.id}`);
    }
    this.operations.set(operation.id, { ...operation, complete: false });
  }

  public cleanup(error: unknown = null): Task014D2CleanupReport {
    if (error !== null && error !== undefined && this.firstError === null) {
      this.firstError = errorMessage(error);
    }
    const ordered = [...this.operations.values()].sort(
      (left, right) => left.order - right.order ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    for (const operation of ordered) {
      if (operation.complete) continue;
      try {
        operation.run();
        operation.complete = true;
      } catch (cleanupError) {
        this.cleanupErrors.push({
          stepId: operation.id,
          message: errorMessage(cleanupError),
        });
      }
    }
    return this.report();
  }

  public report(): Task014D2CleanupReport {
    const ordered = [...this.operations.values()].sort(
      (left, right) => left.order - right.order ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    return {
      firstError: this.firstError,
      cleanupErrors: [...this.cleanupErrors],
      completedStepIds: ordered
        .filter((operation) => operation.complete)
        .map((operation) => operation.id),
      pendingStepIds: ordered
        .filter((operation) => !operation.complete)
        .map((operation) => operation.id),
    };
  }

  public get complete(): boolean {
    return [...this.operations.values()].every((operation) =>
      operation.complete);
  }
}

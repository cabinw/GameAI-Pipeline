// Generated from the tested TASK-013R1 adapter boundary. Do not hand-edit.
export interface HarnessLogicalResource {
  readonly logicalId: string;
  readonly relativePath: string;
  readonly kind: "json" | "sprite-frame";
}

export interface HarnessResolvedResource extends HarnessLogicalResource {
  readonly cocosPath: string;
}

export const HARNESS_LOGICAL_RESOURCE_MANIFEST = Object.freeze([
  Object.freeze({
    logicalId: "harness-config",
    relativePath: "harness-config",
    kind: "json" as const,
  }),
]);

export function resolveHarnessResourceManifest(
  manifest: readonly HarnessLogicalResource[] =
    HARNESS_LOGICAL_RESOURCE_MANIFEST,
): readonly HarnessResolvedResource[] {
  return resolveLogicalResourceManifest(manifest, "task013r1", "TASK_013R1");
}

export function resolveLogicalResourceManifest(
  manifest: readonly HarnessLogicalResource[],
  rootPath: string,
  diagnosticPrefix: string,
): readonly HarnessResolvedResource[] {
  if (
    !/^[A-Z0-9_]+$/u.test(diagnosticPrefix) ||
    (rootPath.length > 0 &&
      !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/u.test(rootPath))
  ) {
    throw new Error(`${diagnosticPrefix}_RESOURCE_MANIFEST_INVALID: root`);
  }
  const logicalIds = new Set<string>();
  const paths = new Set<string>();
  const resolved = manifest
    .map((entry) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.logicalId)) {
        throw new Error(
          `${diagnosticPrefix}_RESOURCE_MANIFEST_INVALID: logicalId ${entry.logicalId}`,
        );
      }
      if (!/^[A-Za-z0-9]+(?:[/-][A-Za-z0-9]+)*$/u.test(entry.relativePath)) {
        throw new Error(
          `${diagnosticPrefix}_RESOURCE_MANIFEST_INVALID: relativePath ${entry.relativePath}`,
        );
      }
      if (logicalIds.has(entry.logicalId)) {
        throw new Error(
          `${diagnosticPrefix}_RESOURCE_MANIFEST_DUPLICATE_ID: ${entry.logicalId}`,
        );
      }
      const cocosPath =
        rootPath.length === 0
          ? entry.relativePath
          : `${rootPath}/${entry.relativePath}`;
      if (paths.has(cocosPath)) {
        throw new Error(
          `${diagnosticPrefix}_RESOURCE_MANIFEST_DUPLICATE_PATH: ${cocosPath}`,
        );
      }
      logicalIds.add(entry.logicalId);
      paths.add(cocosPath);
      return Object.freeze({ ...entry, cocosPath });
    })
    .sort((left, right) => left.logicalId.localeCompare(right.logicalId));
  return Object.freeze(resolved);
}

export type HarnessResourceTerminalState =
  | "pending"
  | "passed"
  | "failed";

export interface HarnessResourceSnapshot {
  readonly expected: number;
  readonly requested: number;
  readonly loaded: number;
  readonly failed: number;
  readonly duplicateRequests: number;
  readonly terminal: HarnessResourceTerminalState;
}

export class HarnessResourceCoordinator {
  private readonly expectedIds: ReadonlySet<string>;
  private readonly requested = new Set<string>();
  private readonly completed = new Set<string>();
  private loaded = 0;
  private failed = 0;
  private duplicateRequests = 0;

  constructor(manifest: readonly HarnessResolvedResource[]) {
    this.expectedIds = new Set(manifest.map((entry) => entry.logicalId));
    if (this.expectedIds.size !== manifest.length || manifest.length === 0) {
      throw new Error("TASK_013R1_RESOURCE_MANIFEST_INVALID: expected IDs");
    }
  }

  request(logicalId: string): void {
    this.requireExpected(logicalId);
    if (this.requested.has(logicalId)) {
      this.duplicateRequests += 1;
      throw new Error(`TASK_013R1_RESOURCE_DUPLICATE_REQUEST: ${logicalId}`);
    }
    this.requested.add(logicalId);
  }

  succeed(logicalId: string): void {
    this.complete(logicalId);
    this.loaded += 1;
  }

  reject(logicalId: string): void {
    this.complete(logicalId);
    this.failed += 1;
  }

  snapshot(): HarnessResourceSnapshot {
    const terminal =
      this.completed.size !== this.expectedIds.size
        ? "pending"
        : this.failed === 0 &&
            this.loaded === this.expectedIds.size &&
            this.requested.size === this.expectedIds.size
          ? "passed"
          : "failed";
    return Object.freeze({
      expected: this.expectedIds.size,
      requested: this.requested.size,
      loaded: this.loaded,
      failed: this.failed,
      duplicateRequests: this.duplicateRequests,
      terminal,
    });
  }

  private complete(logicalId: string): void {
    this.requireExpected(logicalId);
    if (!this.requested.has(logicalId)) {
      throw new Error(`TASK_013R1_RESOURCE_UNREQUESTED_RESULT: ${logicalId}`);
    }
    if (this.completed.has(logicalId)) {
      throw new Error(`TASK_013R1_RESOURCE_DUPLICATE_RESULT: ${logicalId}`);
    }
    this.completed.add(logicalId);
  }

  private requireExpected(logicalId: string): void {
    if (!this.expectedIds.has(logicalId)) {
      throw new Error(`TASK_013R1_RESOURCE_UNKNOWN_ID: ${logicalId}`);
    }
  }
}

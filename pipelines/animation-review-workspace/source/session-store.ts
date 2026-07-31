import { randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

import {
  parseAnimationReviewSession,
  serializeAnimationReviewSession,
  type AnimationReviewSessionDocument,
} from "@gameai/animation-review-core";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function storeError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

function inside(root: string, candidate: string): boolean {
  const local = relative(root, candidate);
  return (
    local === "" ||
    (local !== ".." && !local.startsWith(`..${sep}`) && !isAbsolute(local))
  );
}

function safeId(value: string, label: string): string {
  if (!ID_PATTERN.test(value)) {
    throw storeError(
      "WORKSPACE_STORE_ID_INVALID",
      `${label} must be a stable identifier without path separators.`,
    );
  }
  return value;
}

async function assertRegularOrMissing(path: string): Promise<void> {
  try {
    const value = await lstat(path);
    if (!value.isFile() || value.isSymbolicLink()) {
      throw storeError(
        "WORKSPACE_STORE_TARGET_UNSAFE",
        `Store target ${basename(path)} is not a regular file.`,
      );
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

async function syncDirectory(path: string): Promise<void> {
  const directory = await open(path, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

export interface AnimationReviewSessionStoreOptions {
  readonly sessionRoot: string;
  readonly exportRoot: string;
}

/**
 * A loopback-service-owned, bounded store. Session and export filenames are
 * derived only from validated IDs; atomic replacement never follows an
 * existing symlink and interrupted temporary files are recoverable garbage.
 */
export class AnimationReviewSessionStore {
  readonly #requestedSessionRoot: string;
  readonly #requestedExportRoot: string;
  #sessionRoot: string | null = null;
  #exportRoot: string | null = null;

  constructor(options: AnimationReviewSessionStoreOptions) {
    this.#requestedSessionRoot = resolve(options.sessionRoot);
    this.#requestedExportRoot = resolve(options.exportRoot);
  }

  async initialize(): Promise<void> {
    await mkdir(this.#requestedSessionRoot, { recursive: true, mode: 0o700 });
    await mkdir(this.#requestedExportRoot, { recursive: true, mode: 0o700 });
    this.#sessionRoot = await realpath(this.#requestedSessionRoot);
    this.#exportRoot = await realpath(this.#requestedExportRoot);
    await this.#cleanupTemporaryFiles(this.#sessionRoot);
    await this.#cleanupTemporaryFiles(this.#exportRoot);
  }

  async loadAll(): Promise<readonly AnimationReviewSessionDocument[]> {
    const root = this.#requireSessionRoot();
    const names = (await readdir(root))
      .filter((name) => name.endsWith(".session.json"))
      .sort();
    const sessions: AnimationReviewSessionDocument[] = [];
    for (const name of names) {
      if (name.includes("/") || name.includes("\\")) continue;
      const path = resolve(root, name);
      if (!inside(root, path)) continue;
      await assertRegularOrMissing(path);
      const parsed = parseAnimationReviewSession(await readFile(path, "utf8"));
      if (!parsed.ok) {
        throw storeError(
          "WORKSPACE_STORED_SESSION_INVALID",
          `${name}: ${parsed.diagnostics[0]?.code ?? "SESSION_INVALID"}.`,
        );
      }
      sessions.push(parsed.value);
    }
    return sessions;
  }

  async save(session: AnimationReviewSessionDocument): Promise<string> {
    const root = this.#requireSessionRoot();
    const id = safeId(session.sessionId, "sessionId");
    const target = resolve(root, `${id}.session.json`);
    if (!inside(root, target)) {
      throw storeError(
        "WORKSPACE_STORE_TARGET_UNSAFE",
        "Session target escaped the configured root.",
      );
    }
    await assertRegularOrMissing(target);
    await this.#atomicWrite(root, target, serializeAnimationReviewSession(session));
    return target;
  }

  async saveAll(
    sessions: readonly AnimationReviewSessionDocument[],
  ): Promise<void> {
    for (const session of [...sessions].sort((left, right) =>
      left.sessionId.localeCompare(right.sessionId),
    )) {
      await this.save(session);
    }
  }

  async writeExport(exportId: string, value: unknown): Promise<string> {
    const root = this.#requireExportRoot();
    const id = safeId(exportId, "exportId");
    const target = resolve(root, `${id}.json`);
    if (!inside(root, target)) {
      throw storeError(
        "WORKSPACE_EXPORT_TARGET_UNSAFE",
        "Export target escaped the configured root.",
      );
    }
    await assertRegularOrMissing(target);
    const text = `${JSON.stringify(value, null, 2)}\n`;
    await this.#atomicWrite(root, target, text);
    return target;
  }

  #requireSessionRoot(): string {
    if (this.#sessionRoot === null) {
      throw storeError(
        "WORKSPACE_STORE_NOT_INITIALIZED",
        "Session store must be initialized before use.",
      );
    }
    return this.#sessionRoot;
  }

  #requireExportRoot(): string {
    if (this.#exportRoot === null) {
      throw storeError(
        "WORKSPACE_STORE_NOT_INITIALIZED",
        "Export store must be initialized before use.",
      );
    }
    return this.#exportRoot;
  }

  async #atomicWrite(root: string, target: string, text: string): Promise<void> {
    let temporary = "";
    for (let attempt = 0; attempt < 4; attempt += 1) {
      temporary = resolve(
        root,
        `.${basename(target)}.${randomBytes(8).toString("hex")}.tmp`,
      );
      if (!inside(root, temporary)) {
        throw storeError(
          "WORKSPACE_STORE_TARGET_UNSAFE",
          "Temporary target escaped the configured root.",
        );
      }
      try {
        await writeFile(temporary, text, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        break;
      } catch (error) {
        if (
          attempt < 3 &&
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "EEXIST"
        ) {
          continue;
        }
        throw error;
      }
    }
    try {
      const file = await open(temporary, "r");
      try {
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, target);
      await syncDirectory(root);
    } catch (error) {
      try {
        await unlink(temporary);
      } catch {
        // Cleanup is best-effort; a future atomic write never trusts temp files.
      }
      throw error;
    }
  }

  async #cleanupTemporaryFiles(root: string): Promise<void> {
    for (const name of await readdir(root)) {
      if (!/^\..+\.[a-f0-9]{16}\.tmp$/.test(name)) continue;
      const path = resolve(root, name);
      if (!inside(root, path)) continue;
      const value = await lstat(path);
      if (value.isFile() && !value.isSymbolicLink()) await unlink(path);
    }
  }
}

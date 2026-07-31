import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname } from "node:path";

import {
  ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
  ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION,
  validateAnimationReviewAdapterRequest,
  type AnimationReviewAdapterResponse,
  type AnimationReviewHumanRuleDecisionInput,
  type AnimationReviewHumanFindingInput,
  type AnimationReviewHumanRuleCreateInput,
  type AnimationReviewPatchActionInput,
  type AnimationReviewPatchDecisionInput,
  type AnimationReviewPatchDocument,
  type AnimationReviewPatchEditInput,
  type AnimationReviewPatchOperation,
  type AnimationReviewRevisionInput,
  type ReviewDecisionInput,
} from "@gameai/animation-review-core";

import {
  RedCapFixtureAdapter,
  resolveDeclaredAsset,
} from "./fixture-adapter";
import { AnimationReviewSessionStore } from "./session-store";
import {
  standaloneBrowserModule,
  standaloneWorkspaceHtml,
} from "./standalone";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_URL_LENGTH = 2048;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export interface AnimationReviewServerOptions {
  readonly adapter: RedCapFixtureAdapter;
  readonly uiModulePath: string;
  readonly host?: string;
  readonly port?: number;
  readonly mutationToken?: string;
  readonly sessionStore: AnimationReviewSessionStore;
}

export interface RunningAnimationReviewServer {
  readonly host: string;
  readonly port: number;
  readonly url: string;
  readonly mutationToken: string;
  close(): Promise<void>;
}

function json(
  response: ServerResponse,
  status: number,
  value: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): void {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    ...extraHeaders,
  });
  response.end(body);
}

function failure(
  request: unknown,
  code: string,
  message: string,
): AnimationReviewAdapterResponse {
  const value =
    typeof request === "object" && request !== null
      ? (request as Record<string, unknown>)
      : {};
  return {
    kind: "response",
    protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
    requestId:
      typeof value.requestId === "string" ? value.requestId : "invalid-request",
    adapterId:
      typeof value.adapterId === "string"
        ? value.adapterId
        : "standalone-red-cap-production-v1",
    ok: false,
    responseType: "error",
    error: { code, message },
  };
}

function errorFields(error: unknown): { code: string; message: string } {
  const directCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;
  const diagnosticCode =
    typeof error === "object" &&
    error !== null &&
    "diagnostics" in error &&
    Array.isArray((error as { diagnostics?: unknown }).diagnostics) &&
    typeof (error as { diagnostics: Array<{ code?: unknown }> }).diagnostics[0]
      ?.code === "string"
      ? (error as { diagnostics: Array<{ code: string }> }).diagnostics[0]!.code
      : undefined;
  return {
    code: directCode ?? diagnosticCode ?? "WORKSPACE_REQUEST_FAILED",
    message: error instanceof Error ? error.message : String(error),
  };
}

function actionError(message: string): never {
  throw Object.assign(new Error(message), {
    code: "WORKSPACE_REVIEW_ACTION_INVALID",
    status: 400,
  });
}

function actionRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    return actionError("Review action body has an invalid shape.");
  }
  return value as Record<string, unknown>;
}

function actionId(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length > 160 ||
    !ID_PATTERN.test(value)
  ) {
    return actionError(`${field} must be a stable identifier.`);
  }
  return value;
}

function actionTime(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return actionError("createdAt must be a bounded timestamp.");
  }
  return value;
}

function actionRevision(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    return actionError("expectedRevision must be a non-negative integer.");
  }
  return value as number;
}

function assistantInput(value: unknown): {
  expectedRevision: number;
  actorId: string;
  createdAt: string;
} {
  const object = actionRecord(value, [
    "expectedRevision",
    "actorId",
    "createdAt",
  ]);
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function patchActionInput(value: unknown): AnimationReviewPatchActionInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "patchId",
    "actorId",
    "createdAt",
  ]);
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    patchId: actionId(object.patchId, "patchId"),
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function revisionInput(value: unknown): AnimationReviewRevisionInput {
  return assistantInput(value);
}

function patchDecisionInput(value: unknown): AnimationReviewPatchDecisionInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "patchId",
    "decision",
    "actorId",
    "createdAt",
  ]);
  if (
    object.decision !== "accept" && object.decision !== "reject"
  ) {
    return actionError("Patch decision is not supported.");
  }
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    patchId: actionId(object.patchId, "patchId"),
    decision: object.decision,
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function patchOperation(value: unknown): AnimationReviewPatchOperation {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    JSON.stringify(value).length > 8_192
  ) {
    return actionError("Patch operation must be a bounded object.");
  }
  const kind = (value as { kind?: unknown }).kind;
  if (
    kind !== "pivot-offset" &&
    kind !== "rotation-offset" &&
    kind !== "keyframe-time" &&
    kind !== "keyframe-value" &&
    kind !== "curve" &&
    kind !== "layer-order"
  ) {
    return actionError("Patch operation kind is not supported.");
  }
  return value as AnimationReviewPatchOperation;
}

function patchEditInput(value: unknown): AnimationReviewPatchEditInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "patchId",
    "operation",
    "actorId",
    "createdAt",
  ]);
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    patchId: actionId(object.patchId, "patchId"),
    operation: patchOperation(object.operation),
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function humanRuleInput(value: unknown): AnimationReviewHumanRuleDecisionInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "ruleId",
    "decision",
    "actorId",
    "createdAt",
  ]);
  if (object.decision !== "passed" && object.decision !== "waived") {
    return actionError("Human rule decision is not supported.");
  }
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    ruleId: actionId(object.ruleId, "ruleId"),
    decision: object.decision,
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function idArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > 100) {
    return actionError(`${field} must be a bounded identifier array.`);
  }
  return value.map((item) => actionId(item, field));
}

function humanFindingInput(value: unknown): AnimationReviewHumanFindingInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "findingId",
    "summary",
    "targetIds",
    "timeRange",
    "actorId",
    "createdAt",
  ]);
  if (typeof object.summary !== "string" || object.summary.length > 500) {
    return actionError("Human Finding summary must be a bounded string.");
  }
  let timeRange: { start: number; end: number } | undefined;
  if (object.timeRange !== undefined) {
    const range = actionRecord(object.timeRange, ["start", "end"]);
    if (
      typeof range.start !== "number" ||
      typeof range.end !== "number" ||
      !Number.isFinite(range.start) ||
      !Number.isFinite(range.end)
    ) {
      return actionError("Human Finding timeRange is invalid.");
    }
    timeRange = { start: range.start, end: range.end };
  }
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    findingId: actionId(object.findingId, "findingId"),
    summary: object.summary,
    targetIds: idArray(object.targetIds ?? [], "targetIds"),
    ...(timeRange === undefined ? {} : { timeRange }),
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function humanRuleCreateInput(value: unknown): AnimationReviewHumanRuleCreateInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "ruleId",
    "details",
    "relatedFindingIds",
    "actorId",
    "createdAt",
  ]);
  if (typeof object.details !== "string" || object.details.length > 2_000) {
    return actionError("Human Rule details must be a bounded string.");
  }
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    ruleId: actionId(object.ruleId, "ruleId"),
    details: object.details,
    relatedFindingIds: idArray(
      object.relatedFindingIds ?? [],
      "relatedFindingIds",
    ),
    actorId: actionId(object.actorId, "actorId"),
    createdAt: actionTime(object.createdAt),
  };
}

function findingDecisionInput(value: unknown): ReviewDecisionInput {
  const object = actionRecord(value, [
    "expectedRevision",
    "decisionId",
    "findingId",
    "decision",
    "actorId",
    "note",
    "createdAt",
  ]);
  if (object.decision !== "resolve" && object.decision !== "comment") {
    return actionError("Only resolve and comment finding decisions are supported after reanalysis.");
  }
  if (typeof object.note !== "string" || object.note.length > 2_000) {
    return actionError("note must be a bounded string.");
  }
  return {
    expectedRevision: actionRevision(object.expectedRevision),
    decisionId: actionId(object.decisionId, "decisionId"),
    findingId: actionId(object.findingId, "findingId"),
    decision: object.decision,
    actorId: actionId(object.actorId, "actorId"),
    note: object.note,
    createdAt: actionTime(object.createdAt),
  };
}

function patchProposalInput(value: unknown): AnimationReviewPatchDocument {
  const object = actionRecord(value, ["patch"]);
  if (!("patch" in object)) return actionError("Patch proposal is required.");
  return object.patch as AnimationReviewPatchDocument;
}

async function body(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"]?.split(";")[0]?.trim();
  if (contentType !== "application/json") {
    throw Object.assign(new Error("Mutation body must use application/json."), {
      code: "WORKSPACE_CONTENT_TYPE_INVALID",
      status: 415,
    });
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error("Mutation body exceeds 64 KiB."), {
        code: "WORKSPACE_BODY_TOO_LARGE",
        status: 413,
      });
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw Object.assign(new Error("Mutation body is not valid JSON."), {
      code: "WORKSPACE_JSON_INVALID",
      status: 400,
    });
  }
}

function sendText(
  response: ServerResponse,
  type: string,
  value: string | Buffer,
): void {
  response.writeHead(200, {
    "content-type": type,
    "content-length": Buffer.byteLength(value),
    "cache-control": "no-store",
  });
  response.end(value);
}

function originAllowed(request: IncomingMessage, host: string, port: number): boolean {
  const origin = request.headers.origin;
  const urlHost = host === "::1" ? "[::1]" : host;
  return origin === undefined || origin === `http://${urlHost}:${port}`;
}

export async function startAnimationReviewServer(
  options: AnimationReviewServerOptions,
): Promise<RunningAnimationReviewServer> {
  await options.sessionStore.initialize();
  const restoredSessions = await options.sessionStore.loadAll();
  if (restoredSessions.length > 0) {
    options.adapter.restoreSessions(restoredSessions);
  }
  await options.sessionStore.saveAll(options.adapter.sessionDocuments());
  const host = options.host ?? "127.0.0.1";
  if (!LOOPBACK_HOSTS.has(host)) {
    throw Object.assign(new Error(`Host ${host} is not loopback.`), {
      code: "WORKSPACE_NON_LOOPBACK_BIND_FORBIDDEN",
    });
  }
  const requestedPort = options.port ?? 0;
  if (
    !Number.isInteger(requestedPort) ||
    requestedPort < 0 ||
    requestedPort > 65535
  ) {
    throw new Error("Port must be an integer from 0 through 65535.");
  }
  const mutationToken =
    options.mutationToken ?? randomBytes(24).toString("base64url");
  const uiModule = await readFile(options.uiModulePath, "utf8");
  let actualPort = 0;
  const processedRequests = new Map<
    string,
    { readonly fingerprint: string; readonly status: number; readonly response: AnimationReviewAdapterResponse }
  >();

  const persist = async (): Promise<void> => {
    await options.sessionStore.saveAll(options.adapter.sessionDocuments());
  };

  const server = createServer(async (request, response) => {
    const securityHeaders = {
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
    };
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.setHeader(name, value);
    }
    try {
      const requestUrl = request.url ?? "/";
      if (requestUrl.length > MAX_URL_LENGTH) {
        json(response, 414, {
          error: {
            code: "WORKSPACE_URL_TOO_LONG",
            message: "Request URL exceeds 2048 bytes.",
          },
        });
        return;
      }
      const url = new URL(requestUrl, `http://${host}:${actualPort}`);
      if (request.method === "GET" && url.pathname === "/") {
        sendText(
          response,
          "text/html; charset=utf-8",
          standaloneWorkspaceHtml(),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/app.js") {
        sendText(
          response,
          "text/javascript; charset=utf-8",
          standaloneBrowserModule(),
        );
        return;
      }
      if (request.method === "GET" && url.pathname === "/ui/index.js") {
        sendText(response, "text/javascript; charset=utf-8", uiModule);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/bootstrap") {
        json(response, 200, {
          protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
          providerProtocolVersion:
            ANIMATION_REVIEW_PROVIDER_PROTOCOL_VERSION,
          adapterId: options.adapter.adapterId,
          mutationToken,
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/workspace") {
        json(response, 200, {
          snapshot: options.adapter.snapshot(),
          session: options.adapter.sessionDocument(),
          sessions: options.adapter.sessionDocuments().map((session) => ({
            sessionId: session.sessionId,
            activeClipId: session.activeClipId,
            revision: session.revision,
            updatedAt: session.updatedAt,
          })),
          review: options.adapter.reviewDocument(),
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/export") {
        json(
          response,
          200,
          options.adapter.exportBundle(),
          {
            "content-disposition":
              'attachment; filename="animation-review-export.json"',
          },
        );
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/export") {
        if (
          request.headers["x-animation-review-token"] !== mutationToken ||
          !originAllowed(request, host, actualPort)
        ) {
          json(response, 403, {
            error: {
              code: "WORKSPACE_MUTATION_FORBIDDEN",
              message: "Mutation token or same-origin check failed.",
            },
          });
          return;
        }
        const bundle = options.adapter.exportBundle();
        const path = await options.sessionStore.writeExport(
          `${options.adapter.sessionDocument().sessionId}-r${options.adapter.sessionDocument().revision}`,
          bundle,
        );
        json(response, 200, { path, bundle });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/session/save") {
        if (
          request.headers["x-animation-review-token"] !== mutationToken ||
          !originAllowed(request, host, actualPort)
        ) {
          json(response, 403, {
            error: {
              code: "WORKSPACE_MUTATION_FORBIDDEN",
              message: "Mutation token or same-origin check failed.",
            },
          });
          return;
        }
        actionRecord(await body(request), []);
        await persist();
        json(response, 200, { session: options.adapter.sessionDocument() });
        return;
      }
      const reviewAction =
        request.method === "POST" &&
        url.pathname.startsWith("/api/review/")
          ? url.pathname.slice("/api/review/".length)
          : null;
      if (
        reviewAction === "assistant" ||
        reviewAction === "patch-propose" ||
        reviewAction === "patch-decision" ||
        reviewAction === "patch-edit" ||
        reviewAction === "patch-preview" ||
        reviewAction === "patch-apply" ||
        reviewAction === "undo" ||
        reviewAction === "redo" ||
        reviewAction === "human-rule" ||
        reviewAction === "human-finding-create" ||
        reviewAction === "human-rule-create" ||
        reviewAction === "finding-decision" ||
        reviewAction === "exact-reset"
      ) {
        if (
          request.headers["x-animation-review-token"] !== mutationToken ||
          !originAllowed(request, host, actualPort)
        ) {
          json(response, 403, {
            error: {
              code: "WORKSPACE_MUTATION_FORBIDDEN",
              message: "Mutation token or same-origin check failed.",
            },
          });
          return;
        }
        const value = await body(request);
        const result = (() => {
          switch (reviewAction) {
            case "assistant":
              return options.adapter.runAssistant(assistantInput(value));
            case "patch-propose":
              return options.adapter.proposePatch(patchProposalInput(value));
            case "patch-decision":
              return options.adapter.decidePatch(patchDecisionInput(value));
            case "patch-edit":
              return options.adapter.editPatch(patchEditInput(value));
            case "patch-preview":
              return options.adapter.previewPatch(patchActionInput(value));
            case "patch-apply":
              return options.adapter.applyPatch(patchActionInput(value));
            case "undo":
              return options.adapter.undo(revisionInput(value));
            case "redo":
              return options.adapter.redo(revisionInput(value));
            case "human-rule":
              return options.adapter.decideHumanRule(humanRuleInput(value));
            case "human-finding-create":
              return options.adapter.createHumanFinding(humanFindingInput(value));
            case "human-rule-create":
              return options.adapter.createHumanRule(humanRuleCreateInput(value));
            case "finding-decision":
              return options.adapter.resolveFinding(findingDecisionInput(value));
            case "exact-reset":
              return options.adapter.resetSession(revisionInput(value));
          }
        })();
        await persist();
        json(response, 200, result);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/adapter") {
        if (
          request.headers["x-animation-review-token"] !== mutationToken ||
          !originAllowed(request, host, actualPort)
        ) {
          json(response, 403, {
            error: {
              code: "WORKSPACE_MUTATION_FORBIDDEN",
              message: "Mutation token or same-origin check failed.",
            },
          });
          return;
        }
        const value = await body(request);
        const parsed = validateAnimationReviewAdapterRequest(value);
        if (!parsed.ok) {
          const diagnostic = parsed.diagnostics[0];
          json(
            response,
            400,
            failure(
              value,
              diagnostic?.code ?? "ADAPTER_SCHEMA_VALIDATION_ERROR",
              diagnostic?.message ?? "Adapter request is invalid.",
            ),
          );
          return;
        }
        const fingerprint = JSON.stringify(parsed.value);
        const prior = processedRequests.get(parsed.value.requestId);
        if (prior !== undefined) {
          if (prior.fingerprint !== fingerprint) {
            json(
              response,
              409,
              failure(
                parsed.value,
                "WORKSPACE_DUPLICATE_REQUEST_ID",
                "A requestId cannot be reused with different content.",
              ),
            );
          } else {
            json(response, prior.status, prior.response);
          }
          return;
        }
        try {
          const snapshot = options.adapter.execute(parsed.value);
          await persist();
          const success: AnimationReviewAdapterResponse =
            parsed.value.command === "observe-playback"
              ? {
                  kind: "response",
                  protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
                  requestId: parsed.value.requestId,
                  adapterId: parsed.value.adapterId,
                  ok: true,
                  responseType: "playback",
                  adapterRevision: snapshot.adapterRevision,
                  playback: snapshot.playback,
                  runtimeDiagnostics: snapshot.runtimeDiagnostics,
                }
              : {
                  kind: "response",
                  protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
                  requestId: parsed.value.requestId,
                  adapterId: parsed.value.adapterId,
                  ok: true,
                  responseType: "snapshot",
                  snapshot,
                };
          if (processedRequests.size >= 1_024) {
            const oldest = processedRequests.keys().next().value as string | undefined;
            if (oldest !== undefined) processedRequests.delete(oldest);
          }
          processedRequests.set(parsed.value.requestId, {
            fingerprint,
            status: 200,
            response: success,
          });
          json(response, 200, success);
        } catch (error) {
          const fields = errorFields(error);
          const failed = failure(parsed.value, fields.code, fields.message);
          processedRequests.set(parsed.value.requestId, {
            fingerprint,
            status: 409,
            response: failed,
          });
          json(response, 409, failed);
        }
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
        let local: string;
        try {
          local = url.pathname
            .slice("/assets/".length)
            .split("/")
            .map((segment) => decodeURIComponent(segment))
            .join("/");
        } catch {
          throw Object.assign(new Error("Asset URL encoding is invalid."), {
            code: "WORKSPACE_ASSET_URL_INVALID",
          });
        }
        const path = await resolveDeclaredAsset(
          options.adapter.fixtureRoot,
          options.adapter.declaredAssets,
          local,
        );
        const type =
          extname(path).toLowerCase() === ".png"
            ? "image/png"
            : "application/octet-stream";
        sendText(response, type, await readFile(path));
        return;
      }
      json(response, 404, {
        error: {
          code: "WORKSPACE_ROUTE_NOT_FOUND",
          message: "Route not found.",
        },
      });
    } catch (error) {
      const fields = errorFields(error);
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : fields.code.startsWith("WORKSPACE_ASSET_")
            ? 404
            : fields.code.startsWith("REVIEW_") ||
                fields.code.startsWith("PROVIDER_") ||
                fields.code.startsWith("SESSION_") ||
                fields.code.startsWith("PATCH_") ||
                fields.code.startsWith("VALIDATION_")
              ? 409
            : 400;
      json(response, status, { error: fields });
    }
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, host, () => resolvePromise());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    throw new Error("Review service did not expose a TCP address.");
  }
  actualPort = address.port;
  const urlHost = host === "::1" ? "[::1]" : host;
  return {
    host,
    port: actualPort,
    url: `http://${urlHost}:${actualPort}`,
    mutationToken,
    close: () =>
      new Promise<void>((resolvePromise, reject) => {
        server.close((error) =>
          error === undefined ? resolvePromise() : reject(error),
        );
      }),
  };
}

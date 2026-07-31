import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname } from "node:path";

import {
  ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
  validateAnimationReviewAdapterRequest,
  type AnimationReviewAdapterResponse,
} from "@gameai/animation-review-core";

import {
  RedCapFixtureAdapter,
  resolveDeclaredAsset,
} from "./fixture-adapter";
import {
  standaloneBrowserModule,
  standaloneWorkspaceHtml,
} from "./standalone";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_URL_LENGTH = 2048;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);

export interface AnimationReviewServerOptions {
  readonly adapter: RedCapFixtureAdapter;
  readonly uiModulePath: string;
  readonly host?: string;
  readonly port?: number;
  readonly mutationToken?: string;
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
    error: { code, message },
  };
}

function errorFields(error: unknown): { code: string; message: string } {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "WORKSPACE_REQUEST_FAILED";
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
  };
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
          adapterId: options.adapter.adapterId,
          mutationToken,
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/workspace") {
        json(response, 200, {
          snapshot: options.adapter.snapshot(),
          review: options.adapter.reviewDocument(),
        });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/export") {
        const snapshot = options.adapter.snapshot();
        json(
          response,
          200,
          {
            exportVersion: "1.0.0",
            source: {
              fixtureId: "red-cap-production-v1",
              sourceRevision: options.adapter.sourceRevision,
              sourceReadOnly: true,
            },
            snapshot,
            review: options.adapter.reviewDocument(),
            originalAnimation: JSON.parse(
              options.adapter.originalAnimationText(),
            ) as unknown,
          },
          {
            "content-disposition":
              'attachment; filename="animation-review-export.json"',
          },
        );
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
        try {
          const snapshot = options.adapter.execute(parsed.value);
          json(response, 200, {
            kind: "response",
            protocolVersion: ANIMATION_REVIEW_ADAPTER_PROTOCOL_VERSION,
            requestId: parsed.value.requestId,
            adapterId: parsed.value.adapterId,
            ok: true,
            snapshot,
          } satisfies AnimationReviewAdapterResponse);
        } catch (error) {
          const fields = errorFields(error);
          json(
            response,
            409,
            failure(parsed.value, fields.code, fields.message),
          );
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

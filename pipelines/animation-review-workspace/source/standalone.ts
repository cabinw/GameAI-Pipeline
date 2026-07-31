export function standaloneWorkspaceHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>GameAI Animation Review Workspace</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #0c1016; }
    body { max-width: 1180px; margin: 0 auto; }
    #workspace { min-height: 100vh; }
    #fatal { padding: 24px; color: #ff9b9d; font: 14px system-ui; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main id="workspace"></main>
  <pre id="fatal" hidden></pre>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
}

export function standaloneBrowserModule(): string {
  return `import { mountAnimationReviewWorkspace } from "/ui/index.js";

const root = document.querySelector("#workspace");
const fatal = document.querySelector("#fatal");

try {
  async function readBootstrap() {
    const response = await fetch("/api/bootstrap", {
      headers: { "accept": "application/json" },
    });
    if (!response.ok) throw new Error("Workspace bootstrap failed.");
    return response.json();
  }
  let bootstrap = await readBootstrap();
  async function post(path, value) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-animation-review-token": bootstrap.mutationToken,
        },
        body: JSON.stringify(value),
      });
      if (response.status === 403 && attempt === 0) {
        bootstrap = await readBootstrap();
        continue;
      }
      return response;
    }
    throw new Error("Workspace mutation retry was exhausted.");
  }
  mountAnimationReviewWorkspace(root, {
    adapterId: bootstrap.adapterId,
    transport: {
      async request(request) {
        const response = await post("/api/adapter", request);
        return response.json();
      },
      async readWorkspace() {
        const response = await fetch("/api/workspace", {
          headers: { "accept": "application/json" },
        });
        if (!response.ok) throw new Error("Review state request failed.");
        return response.json();
      },
      async exportReview() {
        const response = await fetch("/api/export", {
          headers: { "accept": "application/json" },
        });
        if (!response.ok) throw new Error("Review export failed.");
        return response.json();
      },
      async saveSession() {
        const response = await post("/api/session/save", {});
        if (!response.ok) throw new Error("Session save failed.");
        return response.json();
      },
      async reviewAction(action, payload) {
        const response = await post("/api/review/" + action, payload);
        const value = await response.json();
        if (!response.ok) {
          throw new Error(value.error?.code + ": " + value.error?.message);
        }
        return value;
      },
    },
  });
} catch (error) {
  root.hidden = true;
  fatal.hidden = false;
  fatal.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
}`;
}

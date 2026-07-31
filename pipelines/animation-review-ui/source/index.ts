import type {
  AnimationReviewAdapterCommand,
  AnimationReviewAdapterPayload,
  AnimationReviewAdapterRequest,
  AnimationReviewAdapterResponse,
  AnimationReviewAdapterSnapshot,
  AnimationReviewDocument,
  AnimationReviewOverlay,
  AnimationReviewOverlayPrimitive,
  AnimationReviewPatchOperation,
  AnimationReviewSessionDocument,
} from "@gameai/animation-review-core";

export const ANIMATION_REVIEW_UI_PROTOCOL_VERSION = "1.0.0" as const;

export type AnimationReviewUiAction =
  | "assistant"
  | "patch-propose"
  | "patch-decision"
  | "patch-edit"
  | "patch-preview"
  | "patch-apply"
  | "undo"
  | "redo"
  | "human-rule"
  | "human-finding-create"
  | "human-rule-create"
  | "finding-decision"
  | "exact-reset";

export interface AnimationReviewActionResponse {
  readonly snapshot: AnimationReviewAdapterSnapshot;
  readonly session: AnimationReviewSessionDocument;
  readonly review: AnimationReviewDocument;
}

export interface AnimationReviewWorkspaceDocument {
  readonly snapshot: AnimationReviewAdapterSnapshot;
  readonly session: AnimationReviewSessionDocument;
  readonly sessions: readonly {
    readonly sessionId: string;
    readonly activeClipId: string;
    readonly revision: number;
    readonly updatedAt: string;
  }[];
  readonly review: AnimationReviewDocument;
}

export interface AnimationReviewTransport {
  request(
    request: AnimationReviewAdapterRequest,
  ): Promise<AnimationReviewAdapterResponse>;
  readWorkspace?(): Promise<AnimationReviewWorkspaceDocument | null>;
  exportReview?(): Promise<unknown>;
  saveSession?(): Promise<unknown>;
  openStandalone?(): Promise<void> | void;
  reviewAction?(
    action: AnimationReviewUiAction,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<AnimationReviewActionResponse>;
}

export interface AnimationReviewWorkspaceState {
  readonly connection: "connecting" | "connected" | "failed";
  readonly busy: boolean;
  readonly snapshot: AnimationReviewAdapterSnapshot | null;
  readonly session: AnimationReviewSessionDocument | null;
  readonly sessions: AnimationReviewWorkspaceDocument["sessions"];
  readonly review: AnimationReviewDocument | null;
  readonly error: string | null;
}

export interface AnimationReviewWorkspaceOptions {
  readonly adapterId: string;
  readonly transport: AnimationReviewTransport;
  readonly nextRequestId?: () => string;
  readonly nextMutationId?: () => string;
  readonly now?: () => string;
  readonly actorId?: string;
  readonly preserveAdapterSnapshotOnReviewAction?: boolean;
}

export interface AnimationReviewMountOptions
  extends AnimationReviewWorkspaceOptions {
  readonly compact?: boolean;
  readonly synchronizeInitialClip?: boolean;
}

type StateListener = (state: AnimationReviewWorkspaceState) => void;

function defaultRequestId(): string {
  return `review-ui-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultMutationId(): string {
  return `review-mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isMutation(command: AnimationReviewAdapterCommand): boolean {
  return command !== "describe" && command !== "observe-playback";
}

export class AnimationReviewWorkspaceController {
  readonly #adapterId: string;
  readonly #transport: AnimationReviewTransport;
  readonly #nextRequestId: () => string;
  readonly #nextMutationId: () => string;
  readonly #now: () => string;
  readonly #actorId: string;
  readonly #preserveAdapterSnapshotOnReviewAction: boolean;
  readonly #listeners = new Set<StateListener>();
  #state: AnimationReviewWorkspaceState = Object.freeze({
    connection: "connecting",
    busy: false,
    snapshot: null,
    session: null,
    sessions: [],
    review: null,
    error: null,
  });

  constructor(options: AnimationReviewWorkspaceOptions) {
    this.#adapterId = options.adapterId;
    this.#transport = options.transport;
    this.#nextRequestId = options.nextRequestId ?? defaultRequestId;
    this.#nextMutationId = options.nextMutationId ?? defaultMutationId;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#actorId = options.actorId ?? "local-human-reviewer";
    this.#preserveAdapterSnapshotOnReviewAction =
      options.preserveAdapterSnapshotOnReviewAction ?? false;
  }

  get state(): AnimationReviewWorkspaceState {
    return this.#state;
  }

  subscribe(listener: StateListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  async refresh(): Promise<AnimationReviewWorkspaceState> {
    return this.dispatch("describe", {});
  }

  async observePlayback(): Promise<AnimationReviewWorkspaceState> {
    return this.dispatch("observe-playback", {});
  }

  async synchronizeSessionClip(): Promise<AnimationReviewWorkspaceState> {
    const clipId = this.#state.session?.activeClipId;
    const playback = this.#state.snapshot?.playback;
    if (
      this.#state.connection !== "connected" ||
      clipId === undefined ||
      playback === undefined ||
      playback.clipId === clipId ||
      !playback.availableClipIds.includes(clipId)
    ) {
      return this.#state;
    }
    await this.dispatch("select-clip", { clipId });
    return playback.status === "stopped"
      ? this.dispatch("seek", { time: 0 })
      : this.#state;
  }

  async dispatch(
    command: AnimationReviewAdapterCommand,
    payload: AnimationReviewAdapterPayload,
  ): Promise<AnimationReviewWorkspaceState> {
    const requestId = this.#nextRequestId();
    const expectedRevision =
      isMutation(command) && this.#state.snapshot !== null
        ? this.#state.snapshot.adapterRevision
        : undefined;
    const request: AnimationReviewAdapterRequest = {
      kind: "request",
      protocolVersion: ANIMATION_REVIEW_UI_PROTOCOL_VERSION,
      requestId,
      adapterId: this.#adapterId,
      command,
      payload,
      ...(expectedRevision === undefined ? {} : { expectedRevision }),
    };
    const lightweight = command === "observe-playback";
    if (!lightweight) {
      this.#setState({ ...this.#state, busy: true, error: null });
    }
    try {
      const response = await this.#transport.request(request);
      if (
        response.requestId !== requestId ||
        response.adapterId !== this.#adapterId
      ) {
        throw new Error("Adapter response correlation failed.");
      }
      if (!response.ok) {
        throw new Error(`${response.error.code}: ${response.error.message}`);
      }
      const snapshot =
        response.responseType === "snapshot"
          ? response.snapshot
          : this.#state.snapshot === null
            ? null
            : {
                ...this.#state.snapshot,
                adapterRevision: response.adapterRevision,
                playback: response.playback,
                runtimeDiagnostics: response.runtimeDiagnostics,
              };
      if (snapshot === null) {
        throw new Error("Playback observation arrived before a full Snapshot.");
      }
      const workspace = lightweight
        ? null
        : ((await this.#transport.readWorkspace?.()) ?? null);
      this.#setState({
        connection: "connected",
        busy: false,
        snapshot,
        session: workspace?.session ?? this.#state.session,
        sessions: workspace?.sessions ?? this.#state.sessions,
        review: workspace?.review ?? this.#state.review,
        error: null,
      });
    } catch (error) {
      this.#setState({
        ...this.#state,
        connection: "failed",
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this.#state;
  }

  async runAssistant(): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("assistant", {});
  }

  async decidePatch(
    patchId: string,
    decision: "accept" | "reject",
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("patch-decision", {
      patchId,
      decision,
    });
  }

  async editPatch(
    patchId: string,
    operation: AnimationReviewPatchOperation,
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("patch-edit", { patchId, operation });
  }

  async previewPatch(patchId: string): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("patch-preview", { patchId });
  }

  async applyPatch(patchId: string): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("patch-apply", { patchId });
  }

  async undo(): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("undo", {});
  }

  async redo(): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("redo", {});
  }

  async exactReset(): Promise<AnimationReviewWorkspaceState> {
    await this.dispatch("exact-reset", {});
    return this.#dispatchReviewAction("exact-reset", {});
  }

  async decideHumanRule(
    ruleId: string,
    decision: "passed" | "waived",
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("human-rule", { ruleId, decision });
  }

  async createHumanFinding(
    summary: string,
    targetIds: readonly string[],
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("human-finding-create", {
      findingId: `human-finding-${this.#nextMutationId()}`,
      summary,
      targetIds,
    });
  }

  async createHumanRule(
    details: string,
    relatedFindingIds: readonly string[],
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("human-rule-create", {
      ruleId: `human-rule-${this.#nextMutationId()}`,
      details,
      relatedFindingIds,
    });
  }

  async decideFinding(
    findingId: string,
    decision: "resolve" | "comment",
    note: string,
  ): Promise<AnimationReviewWorkspaceState> {
    return this.#dispatchReviewAction("finding-decision", {
      decisionId: `decision-${this.#nextMutationId()}`,
      findingId,
      decision,
      note,
    });
  }

  async reloadSession(): Promise<AnimationReviewWorkspaceState> {
    return this.refresh();
  }

  async saveSession(): Promise<AnimationReviewWorkspaceState> {
    if (this.#transport.saveSession === undefined) return this.#state;
    this.#setState({ ...this.#state, busy: true, error: null });
    try {
      await this.#transport.saveSession();
      this.#setState({ ...this.#state, busy: false, connection: "connected" });
    } catch (error) {
      this.#setState({
        ...this.#state,
        busy: false,
        connection: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this.#state;
  }

  async #dispatchReviewAction(
    action: AnimationReviewUiAction,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<AnimationReviewWorkspaceState> {
    const session = this.#state.session;
    if (session === null || this.#transport.reviewAction === undefined) {
      this.#setState({
        ...this.#state,
        connection: "failed",
        error: "Review mutation transport is unavailable.",
      });
      return this.#state;
    }
    this.#setState({ ...this.#state, busy: true, error: null });
    try {
      const result = await this.#transport.reviewAction(action, {
        expectedRevision: session.revision,
        actorId: this.#actorId,
        createdAt: this.#now(),
        ...payload,
      });
      this.#setState({
        connection: "connected",
        busy: false,
        snapshot: this.#preserveAdapterSnapshotOnReviewAction
          ? this.#state.snapshot
          : result.snapshot,
        session: result.session,
        sessions: this.#state.sessions.map((item) =>
          item.sessionId === result.session.sessionId
            ? {
                sessionId: result.session.sessionId,
                activeClipId: result.session.activeClipId,
                revision: result.session.revision,
                updatedAt: result.session.updatedAt,
              }
            : item,
        ),
        review: result.review,
        error: null,
      });
    } catch (error) {
      this.#setState({
        ...this.#state,
        connection: "failed",
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return this.#state;
  }

  #setState(state: AnimationReviewWorkspaceState): void {
    this.#state = Object.freeze(state);
    for (const listener of this.#listeners) listener(this.#state);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fixed(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function selected(value: string, current: string): string {
  return value === current ? " selected" : "";
}

function checked(value: boolean): string {
  return value ? " checked" : "";
}

function renderOverlayPrimitive(
  primitive: AnimationReviewOverlayPrimitive,
): string {
  const common = `data-overlay-shape="${primitive.overlay}" aria-label="${escapeHtml(primitive.label)}"`;
  const x = primitive.x;
  const y = -primitive.y;
  switch (primitive.shape) {
    case "point":
      return `<circle ${common} cx="${x}" cy="${y}" r="${primitive.radius ?? 3}"></circle>`;
    case "line":
      return `<line ${common} x1="${x}" y1="${y}" x2="${primitive.x2 ?? x}" y2="${-(primitive.y2 ?? primitive.y)}"></line>`;
    case "rect":
      return `<rect ${common} x="${x}" y="${-(primitive.y + (primitive.height ?? 0))}" width="${primitive.width ?? 0}" height="${primitive.height ?? 0}"></rect>`;
    case "circle":
      return `<circle ${common} cx="${x}" cy="${y}" r="${primitive.radius ?? 0}"></circle>`;
  }
}

function renderPreview(
  snapshot: AnimationReviewAdapterSnapshot,
  session: AnimationReviewSessionDocument | null,
): string {
  const sprites = [...snapshot.parts]
    .sort((left, right) => left.drawOrder - right.drawOrder)
    .map((part) => {
      const transform = part.worldTransform;
      return `<img
        src="${escapeHtml(part.assetUrl)}"
        alt="${escapeHtml(part.partId)}"
        title="${escapeHtml(part.partId)}"
        style="width:${part.width}px;height:${part.height}px;z-index:${part.drawOrder};margin-left:${-part.width / 2}px;margin-top:${-part.height / 2}px;transform:matrix(${transform.a},${-transform.b},${-transform.c},${transform.d},${transform.tx},${-transform.ty})"
      >`;
    })
    .join("");
  const primitives = (snapshot.overlayPrimitives ?? [])
    .filter((primitive) => snapshot.overlays[primitive.overlay])
    .map(renderOverlayPrimitive)
    .join("");
  return `
    <section class="arw__card arw__preview-card" aria-label="Animation preview">
      <div class="arw__preview" data-preview-clip="${escapeHtml(snapshot.playback.clipId)}">
        <span class="arw__preview-mode">${session?.preview === null || session === null ? "Before · authoritative" : `After · Preview ${escapeHtml(session.preview.patchId)}`}</span>
        <div class="arw__sprite-stage">${sprites}</div>
        <svg viewBox="-300 -300 600 600" role="img" aria-label="Review overlays">${primitives}</svg>
      </div>
    </section>
  `;
}

function renderTimeline(snapshot: AnimationReviewAdapterSnapshot): string {
  const duration = Math.max(snapshot.playback.duration, 0.001);
  const rows = snapshot.timeline
    .map((track) => {
      const keys = track.keyframes
        .map(
          (keyframe) =>
            `<i title="${fixed(keyframe.time)}s" style="left:${Math.min(100, Math.max(0, (keyframe.time / duration) * 100))}%"></i>`,
        )
        .join("");
      return `<li><code>${escapeHtml(track.jointId)}.${track.property}</code><span>${keys}</span></li>`;
    })
    .join("");
  return `
    <section class="arw__card arw__tracks" aria-label="Animation timeline tracks">
      <h3>Timeline <span>${snapshot.timeline.length} tracks</span></h3>
      <ul>${rows}</ul>
    </section>
  `;
}

function renderReview(
  state: AnimationReviewWorkspaceState,
  compact: boolean,
): string {
  const session = state.session;
  const review = state.review;
  if (review === null || session === null) {
    return `<section class="arw__card"><h3>Session</h3><p>No structured Session loaded. Playback remains read-only until the local review service reconnects.</p></section>`;
  }
  const disabled =
    state.busy || state.connection !== "connected" ? " disabled" : "";
  const patches = session.patches
    .map((patch) => {
      const operation = escapeHtml(JSON.stringify(patch.operation, null, 2));
      const decision =
        patch.status === "AI_PROPOSED"
          ? `<button type="button" data-patch-decision="accept"${disabled}>Accept</button><button type="button" data-patch-decision="reject"${disabled}>Reject</button>`
          : "";
      const editable =
        patch.status === "HUMAN_ACCEPTED" || patch.status === "PREVIEWED";
      const workflow = editable
        ? `<textarea data-patch-operation rows="${compact ? 3 : 6}"${state.busy ? " disabled" : ""}>${operation}</textarea>
           <button type="button" data-patch-edit${disabled}>Save edit</button>
           <button type="button" data-patch-preview${disabled}>Preview</button>
           ${patch.status === "PREVIEWED" ? `<button type="button" data-patch-apply${disabled}>Apply + reanalyze</button>` : ""}`
        : `<pre>${operation}</pre>`;
      return `<li data-patch-id="${escapeHtml(patch.patchId)}" data-patch-status="${patch.status}">
        <strong>${escapeHtml(patch.operation.kind)} · ${escapeHtml(patch.patchId)}</strong>
        <span>${escapeHtml(patch.status)} · ${escapeHtml(patch.source)} · base r${patch.expectedRevision}</span>
        <div class="arw__finding-actions">${decision}</div>
        ${workflow}
      </li>`;
    })
    .join("");
  const validation = session.validation
    .map((rule) => {
      const humanActions =
        rule.ruleKind === "human-judgment" && rule.status === "unresolved"
          ? `<button type="button" data-human-rule="passed"${disabled}>Pass</button><button type="button" data-human-rule="waived"${disabled}>Waive</button>`
          : "";
      return `<li data-rule-id="${escapeHtml(rule.ruleId)}" data-check="${rule.status}">
        <strong>${escapeHtml(rule.ruleId)}</strong><span>${escapeHtml(rule.ruleKind)} · ${escapeHtml(rule.status)}</span>
        <p>${escapeHtml(rule.details)}</p><div class="arw__finding-actions">${humanActions}</div>
      </li>`;
    })
    .join("");
  const findings = review.findings
    .map((finding) => {
      const decisions =
        finding.status === "accepted" || finding.status === "open"
          ? `<button type="button" data-review-decision="resolve"${disabled}>Resolve</button>`
          : "";
      return `<li data-severity="${finding.severity}" data-finding-id="${escapeHtml(finding.findingId)}">
        <strong>${escapeHtml(finding.summary)}</strong>
        <span>${escapeHtml(finding.code)} · ${escapeHtml(finding.source)} · ${escapeHtml(finding.status)} · confidence ${fixed(finding.confidence)}</span>
        <p>${escapeHtml(finding.diagnosis)}</p>
        <p class="arw__location">${escapeHtml(finding.targetIds.join(", "))}${finding.timeRange === undefined ? "" : ` · ${fixed(finding.timeRange.start)}–${fixed(finding.timeRange.end)}s`} · ${escapeHtml(finding.providerId)}</p>
        <div class="arw__finding-actions">
          ${decisions}
          <input type="text" data-review-note maxlength="2000" placeholder="Human review note"${disabled}>
          <button type="button" data-review-decision="comment"${disabled}>Comment</button>
        </div>
      </li>`;
    })
    .join("");
  const checklist = review.checklist
    .map(
      (item) =>
        `<li data-check="${item.status}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.status)}</span><p>${escapeHtml(item.details)}</p></li>`,
    )
    .join("");
  const history = [...review.decisions]
    .reverse()
    .slice(0, 8)
    .map(
      (decision) =>
        `<li><strong>${escapeHtml(decision.decision)} · ${escapeHtml(decision.findingId)}</strong><span>r${decision.revision} · ${escapeHtml(decision.actorId)}</span><p>${escapeHtml(decision.note || "No note.")}</p></li>`,
    )
    .join("");
  return `
    <section class="arw__card arw__review-toolbar">
      <div><h3>Session authority</h3><p>${escapeHtml(session.sessionId)} · Session r${session.revision} · ${session.preview === null ? "authoritative view" : `previewing ${escapeHtml(session.preview.patchId)}`}</p></div>
      <button type="button" data-review-assistant${disabled}>Run local AI assistant</button>
    </section>
    ${compact ? "" : `<section class="arw__card arw__human-authoring">
      <h3>Human-authored review data</h3>
      <div><input type="text" data-human-finding-summary maxlength="500" placeholder="New finding summary"${disabled}><input type="text" data-human-finding-targets maxlength="500" placeholder="target IDs, comma separated"${disabled}><button type="button" data-create-human-finding${disabled}>Create Finding</button></div>
      <div><input type="text" data-human-rule-details maxlength="2000" placeholder="New human-judgment rule"${disabled}><input type="text" data-human-rule-findings maxlength="500" placeholder="finding IDs, comma separated"${disabled}><button type="button" data-create-human-rule${disabled}>Create Rule</button></div>
    </section>`}
    <div class="arw__review-grid">
      <section class="arw__card"><h3>Patches <span>${session.patches.length}</span></h3><ul class="arw__review-list">${patches || "<li>No proposals yet.</li>"}</ul></section>
      <section class="arw__card"><h3>Validation <span>${session.validation.length}</span></h3><ul class="arw__review-list">${validation}</ul></section>
      ${compact ? "" : `
      <section class="arw__card"><h3>Findings <span>${review.findings.length}</span></h3><ul class="arw__review-list">${findings || "<li>No open findings.</li>"}</ul></section>
      <section class="arw__card"><h3>Checklist <span>${review.checklist.length}</span></h3><ul class="arw__review-list">${checklist}</ul></section>
      <section class="arw__card"><h3>Human decisions <span>${review.decisions.length}</span></h3><ul class="arw__review-list">${history || "<li>No decisions yet.</li>"}</ul></section>
      <section class="arw__card"><h3>Revision history</h3><p>Review r${review.revision} · history ${session.historyCursor}/${session.history.length} · ${session.auditTrail.length} Session audit entries</p></section>`}
    </div>
  `;
}

const OVERLAYS: readonly AnimationReviewOverlay[] = [
  "skeleton",
  "pivots",
  "sockets",
  "hit-areas",
  "attachments",
];

function optionsHeaderActions(
  compact: boolean,
  state: AnimationReviewWorkspaceState,
): string {
  const disabled =
    state.busy || state.session === null || state.connection !== "connected"
      ? " disabled"
      : "";
  if (compact) {
    return `<button type="button" data-open-standalone>Open Standalone</button><button type="button" data-save-session${disabled}>Save</button>`;
  }
  const canUndo =
    state.session !== null && state.session.historyCursor > 0 ? "" : " disabled";
  const canRedo =
    state.session !== null &&
    state.session.historyCursor < state.session.history.length
      ? ""
      : " disabled";
  const historyBlocked = state.busy || state.connection !== "connected";
  return `<button type="button" data-save-session${disabled}>Save Session</button>
    <button type="button" data-load-session${state.busy ? " disabled" : ""}>Reload Session</button>
    <button type="button" data-undo${historyBlocked ? " disabled" : canUndo}>Undo</button>
    <button type="button" data-redo${historyBlocked ? " disabled" : canRedo}>Redo</button>
    <button type="button" data-export${state.busy || state.connection !== "connected" ? " disabled" : ""}>Export JSON</button>`;
}

export function renderAnimationReviewWorkspaceMarkup(
  state: AnimationReviewWorkspaceState,
  compact = false,
): string {
  const snapshot = state.snapshot;
  const disabled =
    state.busy || snapshot === null || state.connection !== "connected"
      ? " disabled"
      : "";
  const status =
    state.error ??
    (snapshot === null
      ? "Connecting to animation runtime…"
      : `${snapshot.characterId} · ${snapshot.playback.clipId} · adapter r${snapshot.adapterRevision}${state.session === null ? " · Session unavailable" : ` · Session r${state.session.revision}`}`);
  if (snapshot === null) {
    return `
      <div class="arw ${compact ? "arw--compact" : ""}">
        <header><h2>Animation Review</h2><span data-connection="${state.connection}">${escapeHtml(status)}</span></header>
        <button type="button" data-command="describe"${state.busy ? " disabled" : ""}>Retry connection</button>
      </div>
    `;
  }

  const playback = snapshot.playback;
  const clips = playback.availableClipIds
    .map(
      (clipId) =>
        `<option value="${escapeHtml(clipId)}"${selected(clipId, playback.clipId)}>${escapeHtml(clipId)}</option>`,
    )
    .join("");
  const sessions = state.sessions
    .map(
      (item) =>
        `<option value="${escapeHtml(item.activeClipId)}"${selected(item.activeClipId, playback.clipId)}>${escapeHtml(item.sessionId)} · r${item.revision}</option>`,
    )
    .join("");
  const overlayControls = OVERLAYS.map(
    (overlay) => `
      <label class="arw__toggle">
        <input type="checkbox" data-overlay="${overlay}"${checked(snapshot.overlays[overlay])}${disabled}>
        ${escapeHtml(overlay)}
      </label>`,
  ).join("");
  const hierarchy = snapshot.parts
    .map(
      (part) =>
        `<li><code>${escapeHtml(part.partId)}</code><span>${escapeHtml(part.parentId ?? "root")}</span></li>`,
    )
    .join("");
  const output = escapeHtml(
    JSON.stringify(
      {
        adapterId: snapshot.adapterId,
        adapterRevision: snapshot.adapterRevision,
        playback: snapshot.playback,
        runtimeDiagnostics: snapshot.runtimeDiagnostics,
      },
      null,
      2,
    ),
  );

  return `
    <div class="arw ${compact ? "arw--compact" : ""}">
      <header>
        <div><p class="arw__eyebrow">AI + Human workspace</p><h2>Animation Review</h2></div>
        <div class="arw__header-actions">
          ${optionsHeaderActions(compact, state)}
          <button type="button" data-command="describe"${state.busy ? " disabled" : ""}>Refresh</button>
        </div>
      </header>
      <p class="arw__status" data-connection="${state.connection}">${escapeHtml(status)}</p>
      <section class="arw__card" aria-label="Playback controls">
        <label>Session<select data-session${sessions.length === 0 ? " disabled" : disabled}>${sessions || `<option>${escapeHtml(state.session?.sessionId ?? "unavailable")}</option>`}</select></label>
        <p>Character <code>${escapeHtml(snapshot.characterId)}</code> · Rig <code>${escapeHtml(snapshot.rigId)}</code></p>
        <label>Clip<select data-clip${disabled}>${clips}</select></label>
        <div class="arw__transport">
          <button type="button" data-command="play"${disabled}>Play</button>
          <button type="button" data-command="pause"${disabled}>Pause</button>
          <button type="button" data-step="-1"${disabled}>−1f</button>
          <button type="button" data-step="1"${disabled}>+1f</button>
          <button type="button" data-session-reset${state.session === null ? " disabled" : disabled}>Exact reset</button>
        </div>
        <label class="arw__timeline">
          <span>Time ${fixed(playback.time)} / ${fixed(playback.duration)}</span>
          <input type="range" min="0" max="${playback.duration}" step="0.001" value="${Math.min(playback.time, playback.duration)}" data-seek${disabled}>
        </label>
        <div class="arw__settings">
          <label>Rate
            <select data-rate${disabled}>
              ${[0.25, 0.5, 1, 1.5, 2].map((rate) => `<option value="${rate}"${selected(String(rate), String(playback.rate))}>${rate}×</option>`).join("")}
            </select>
          </label>
          <label class="arw__toggle"><input type="checkbox" data-loop${checked(playback.loop)}${disabled}> loop</label>
          <span class="arw__badge">${playback.status}</span>
        </div>
      </section>
      <section class="arw__card" aria-label="Runtime overlays">
        <h3>Overlays</h3><div class="arw__overlays">${overlayControls}</div>
      </section>
      ${compact ? "" : renderPreview(snapshot, state.session)}
      ${compact ? "" : renderTimeline(snapshot)}
      <section class="arw__card arw__structure" aria-label="Character structure">
        <h3>Structure <span>${snapshot.parts.length} parts · ${snapshot.joints.length} joints · ${snapshot.timeline.length} tracks</span></h3>
        <ul>${hierarchy}</ul>
      </section>
      ${renderReview(state, compact)}
      <details class="arw__card"><summary>Structured runtime snapshot</summary><pre>${output}</pre></details>
    </div>
  `;
}

export const animationReviewWorkspaceStyles = `
  :host, .arw { color: var(--color-normal-contrast, #e8edf5); font: 13px/1.45 Inter, system-ui, sans-serif; }
  .arw { display: grid; gap: 10px; padding: 14px; background: var(--color-normal-fill-emphasis, #171b22); }
  .arw header, .arw__header-actions, .arw__transport, .arw__settings, .arw__overlays { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .arw header { justify-content: space-between; }
  .arw h2, .arw h3, .arw p { margin: 0; }
  .arw h2 { font-size: 18px; }
  .arw h3 { margin-bottom: 8px; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
  .arw h3 span { color: #8e99aa; font-weight: 400; text-transform: none; }
  .arw__eyebrow { color: #73a8ff; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
  .arw__status { padding: 7px 9px; border-left: 3px solid #4a88e8; background: #202733; }
  .arw__status[data-connection="failed"] { border-color: #ee6b6e; }
  .arw__card { padding: 10px; border: 1px solid var(--color-normal-border, #343b47); border-radius: 6px; background: #1d222b; }
  .arw label { display: grid; gap: 4px; }
  .arw select, .arw input, .arw button, .arw textarea { color: inherit; background: #272e3a; border: 1px solid #434d5d; border-radius: 4px; padding: 5px 7px; }
  .arw textarea { width: 100%; box-sizing: border-box; resize: vertical; font: 11px/1.35 ui-monospace, monospace; }
  .arw button { cursor: pointer; }
  .arw button:disabled, .arw input:disabled, .arw select:disabled { cursor: wait; opacity: .55; }
  .arw__transport { flex-wrap: wrap; margin: 9px 0; }
  .arw__timeline input { width: 100%; padding: 0; }
  .arw__settings { justify-content: space-between; flex-wrap: wrap; }
  .arw__toggle { display: flex !important; align-items: center; gap: 5px !important; }
  .arw__toggle input { margin: 0; }
  .arw__overlays { flex-wrap: wrap; }
  .arw__badge { padding: 3px 7px; border-radius: 999px; background: #32415a; }
  .arw__structure ul { max-height: 150px; overflow: auto; margin: 0; padding: 0; list-style: none; }
  .arw__structure li { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #2d3440; }
  .arw__structure li span { color: #8e99aa; }
  .arw__preview-card { padding: 0; overflow: hidden; }
  .arw__preview { position: relative; min-height: 500px; overflow: hidden; background: radial-gradient(circle at 50% 44%, #2a3546 0, #151a22 58%, #0c1016 100%); }
  .arw__preview-mode { position: absolute; z-index: 1200; top: 10px; left: 10px; padding: 4px 8px; border-radius: 999px; color: #dce9ff; background: #203659; }
  .arw__preview::after { content: ""; position: absolute; inset: 50% 0 auto; border-top: 1px solid #334055; opacity: .5; }
  .arw__sprite-stage, .arw__preview svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .arw__sprite-stage img { position: absolute; left: 50%; top: 50%; transform-origin: center; object-fit: contain; pointer-events: none; }
  .arw__preview svg { z-index: 1000; fill: none; stroke: #65d9ff; stroke-width: 2; vector-effect: non-scaling-stroke; pointer-events: none; }
  .arw__preview [data-overlay-shape="pivots"] { stroke: #ffd166; fill: #ffd166; }
  .arw__preview [data-overlay-shape="sockets"] { stroke: #e879f9; }
  .arw__preview [data-overlay-shape="hit-areas"] { stroke: #fb7185; }
  .arw__preview [data-overlay-shape="attachments"] { stroke: #a7f3d0; }
  .arw__tracks ul, .arw__review-list { margin: 0; padding: 0; list-style: none; }
  .arw__tracks li { display: grid; grid-template-columns: minmax(120px, 28%) 1fr; gap: 8px; align-items: center; min-height: 22px; }
  .arw__tracks li > span { position: relative; height: 6px; border-radius: 3px; background: #303949; }
  .arw__tracks i { position: absolute; top: -2px; width: 3px; height: 10px; border-radius: 2px; background: #7cb6ff; }
  .arw__review-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .arw__review-list { display: grid; gap: 7px; }
  .arw__review-list li { padding: 8px; border-left: 3px solid #667085; background: #242b36; }
  .arw__review-list li[data-severity="error"], .arw__review-list li[data-check="failed"] { border-color: #ee6b6e; }
  .arw__review-list li[data-severity="warning"], .arw__review-list li[data-check="warning"] { border-color: #e9b949; }
  .arw__review-list li strong, .arw__review-list li span { display: block; }
  .arw__review-list li span { color: #8e99aa; font-size: 11px; }
  .arw__review-list li p { margin-top: 4px; color: #c8d0dc; }
  .arw__review-toolbar, .arw__finding-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .arw__human-authoring > div { display: grid; grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr) auto; gap: 8px; margin-top: 7px; }
  .arw__finding-actions { margin-top: 8px; justify-content: flex-start; flex-wrap: wrap; }
  .arw__finding-actions input { min-width: 180px; flex: 1; }
  .arw__proposal { display: grid; gap: 5px; margin-top: 8px; padding: 8px; border: 1px solid #3b4758; border-radius: 4px; background: #1b2029; }
  .arw__proposal label { grid-template-columns: auto minmax(80px, 1fr); align-items: center; }
  .arw__location { color: #8e99aa !important; font-size: 11px; }
  .arw pre { max-height: 180px; overflow: auto; white-space: pre-wrap; user-select: text; }
  .arw--compact .arw__structure ul { max-height: 100px; }
  .arw--compact { min-width: 340px; }
  .arw--compact .arw__review-grid { grid-template-columns: 1fr; }
  .arw--compact .arw__review-list { max-height: 240px; overflow: auto; }
  @media (max-width: 720px) { .arw__review-grid { grid-template-columns: 1fr; } .arw__human-authoring > div { grid-template-columns: 1fr; } }
`;

function numberValue(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return null;
  }
  const value = Number(target.value);
  return Number.isFinite(value) ? value : null;
}

export function mountAnimationReviewWorkspace(
  root: HTMLElement,
  options: AnimationReviewMountOptions,
): () => void {
  const controller = new AnimationReviewWorkspaceController(options);
  const style = document.createElement("style");
  style.textContent = animationReviewWorkspaceStyles;
  root.before(style);

  const bind = (): void => {
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-command]",
    )) {
      button.addEventListener("click", () => {
        const command = button.dataset.command as AnimationReviewAdapterCommand;
        void controller.dispatch(command, {});
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-step]",
    )) {
      button.addEventListener("click", () => {
        void controller.dispatch("step", {
          deltaFrames: Number(button.dataset.step),
          frameRate: 60,
        });
      });
    }
    root.querySelector<HTMLSelectElement>("[data-clip]")?.addEventListener(
      "change",
      (event) => {
        const target = event.currentTarget as HTMLSelectElement;
        void controller.dispatch("select-clip", { clipId: target.value });
      },
    );
    root.querySelector<HTMLSelectElement>("[data-session]")?.addEventListener(
      "change",
      (event) => {
        const target = event.currentTarget as HTMLSelectElement;
        void controller.dispatch("select-clip", { clipId: target.value });
      },
    );
    root.querySelector<HTMLInputElement>("[data-seek]")?.addEventListener(
      "change",
      (event) => {
        const time = numberValue(event.currentTarget);
        if (time !== null) void controller.dispatch("seek", { time });
      },
    );
    root.querySelector<HTMLSelectElement>("[data-rate]")?.addEventListener(
      "change",
      (event) => {
        const rate = numberValue(event.currentTarget);
        if (rate !== null) void controller.dispatch("set-rate", { rate });
      },
    );
    root.querySelector<HTMLInputElement>("[data-loop]")?.addEventListener(
      "change",
      (event) => {
        const target = event.currentTarget as HTMLInputElement;
        void controller.dispatch("set-loop", { loop: target.checked });
      },
    );
    for (const input of root.querySelectorAll<HTMLInputElement>(
      "input[data-overlay]",
    )) {
      input.addEventListener("change", () => {
        void controller.dispatch("set-overlay", {
          overlay: input.dataset.overlay as AnimationReviewOverlay,
          enabled: input.checked,
        });
      });
    }
    root.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener(
      "click",
      async () => {
        if (options.transport.exportReview === undefined) return;
        const value = await options.transport.exportReview();
        const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "animation-review-export.json";
        link.click();
        URL.revokeObjectURL(url);
      },
    );
    root.querySelector<HTMLButtonElement>("[data-save-session]")?.addEventListener(
      "click",
      () => void controller.saveSession(),
    );
    root.querySelector<HTMLButtonElement>("[data-load-session]")?.addEventListener(
      "click",
      () => void controller.reloadSession(),
    );
    root.querySelector<HTMLButtonElement>("[data-open-standalone]")?.addEventListener(
      "click",
      () => void options.transport.openStandalone?.(),
    );
    root.querySelector<HTMLButtonElement>("[data-undo]")?.addEventListener(
      "click",
      () => void controller.undo(),
    );
    root.querySelector<HTMLButtonElement>("[data-redo]")?.addEventListener(
      "click",
      () => void controller.redo(),
    );
    root.querySelector<HTMLButtonElement>("[data-session-reset]")?.addEventListener(
      "click",
      () => void controller.exactReset(),
    );
    root
      .querySelector<HTMLButtonElement>("[data-review-assistant]")
      ?.addEventListener("click", () => {
        void controller.runAssistant();
      });
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-review-decision]",
    )) {
      button.addEventListener("click", () => {
        const finding = button.closest<HTMLElement>("[data-finding-id]");
        const findingId = finding?.dataset.findingId;
        const decision = button.dataset.reviewDecision as
          | "resolve"
          | "comment";
        const note =
          finding?.querySelector<HTMLInputElement>("[data-review-note]")
            ?.value ?? "";
        if (findingId !== undefined) {
          void controller.decideFinding(findingId, decision, note);
        }
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-patch-decision]",
    )) {
      button.addEventListener("click", () => {
        const patchId = button.closest<HTMLElement>("[data-patch-id]")?.dataset.patchId;
        const decision = button.dataset.patchDecision as "accept" | "reject";
        if (patchId !== undefined) {
          void controller.decidePatch(patchId, decision);
        }
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-patch-edit]",
    )) {
      button.addEventListener("click", () => {
        const item = button.closest<HTMLElement>("[data-patch-id]");
        const patchId = item?.dataset.patchId;
        const text = item?.querySelector<HTMLTextAreaElement>("[data-patch-operation]")?.value;
        if (patchId === undefined || text === undefined) return;
        try {
          void controller.editPatch(
            patchId,
            JSON.parse(text) as AnimationReviewPatchOperation,
          );
        } catch {
          // The controller keeps service validation authoritative; malformed
          // local JSON is left in place for the human to correct.
        }
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-patch-preview]",
    )) {
      button.addEventListener("click", () => {
        const patchId = button.closest<HTMLElement>("[data-patch-id]")?.dataset.patchId;
        if (patchId !== undefined) void controller.previewPatch(patchId);
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-patch-apply]",
    )) {
      button.addEventListener("click", () => {
        const patchId = button.closest<HTMLElement>("[data-patch-id]")?.dataset.patchId;
        if (patchId !== undefined) void controller.applyPatch(patchId);
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "button[data-human-rule]",
    )) {
      button.addEventListener("click", () => {
        const ruleId = button.closest<HTMLElement>("[data-rule-id]")?.dataset.ruleId;
        const decision = button.dataset.humanRule as "passed" | "waived";
        if (ruleId !== undefined) void controller.decideHumanRule(ruleId, decision);
      });
    }
    root.querySelector<HTMLButtonElement>("[data-create-human-finding]")?.addEventListener(
      "click",
      () => {
        const summary = root.querySelector<HTMLInputElement>("[data-human-finding-summary]")?.value.trim() ?? "";
        const targets = (root.querySelector<HTMLInputElement>("[data-human-finding-targets]")?.value ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        if (summary.length > 0) void controller.createHumanFinding(summary, targets);
      },
    );
    root.querySelector<HTMLButtonElement>("[data-create-human-rule]")?.addEventListener(
      "click",
      () => {
        const details = root.querySelector<HTMLInputElement>("[data-human-rule-details]")?.value.trim() ?? "";
        const findings = (root.querySelector<HTMLInputElement>("[data-human-rule-findings]")?.value ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        if (details.length > 0) void controller.createHumanRule(details, findings);
      },
    );
  };

  let synchronizingClip = false;
  const unsubscribe = controller.subscribe((state) => {
    root.innerHTML = renderAnimationReviewWorkspaceMarkup(
      state,
      options.compact ?? false,
    );
    bind();
    const sessionClipId = state.session?.activeClipId;
    if (
      options.synchronizeInitialClip === true &&
      !synchronizingClip &&
      state.connection === "connected" &&
      sessionClipId !== undefined &&
      state.snapshot?.playback.clipId !== sessionClipId &&
      state.snapshot?.playback.availableClipIds.includes(sessionClipId) === true
    ) {
      synchronizingClip = true;
      void controller.synchronizeSessionClip().finally(() => {
        synchronizingClip = false;
      });
    }
  });
  const polling = setInterval(() => {
    if (
      !controller.state.busy &&
      controller.state.snapshot?.playback.status === "playing"
    ) {
      void controller.observePlayback();
    }
  }, 250);
  void controller.refresh();
  return () => {
    clearInterval(polling);
    unsubscribe();
    style.remove();
    root.replaceChildren();
  };
}
